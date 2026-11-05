// api/translate.ts — Vercel serverless function (Node runtime, web-standard handlers)
import { GoogleGenAI } from "@google/genai";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

// Fast, cheap models first. If one is overloaded / rate-limited / missing,
// or takes too long, move on to the next.
const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];
const PER_MODEL_TIMEOUT_MS = 12000;

async function translate(text: string, sourceLang: string, targetLang: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("Server configuration error: API key missing"), { status: 500 });

  const ai = new GoogleGenAI({ apiKey });
  const from = !sourceLang || sourceLang === "auto" ? "the detected source language" : sourceLang;
  const prompt =
    `You are a precise translator. Translate the text below from ${from} to ${targetLang}. ` +
    `Return ONLY the translation — no explanations, no quotes.\n\n${text}`;

  let lastErr: any = null;
  for (const model of MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS);
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0,
          maxOutputTokens: 2048,
          // Translation doesn't need "thinking"; it only adds delay and can eat the output budget.
          ...(model.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          abortSignal: controller.signal,
        },
      });
      const out = (res.text ?? "").trim();
      if (out) {
        console.log(`Translated with ${model}`);
        return out;
      }
      lastErr = new Error(`Empty response from ${model}`);
      console.warn(lastErr.message);
    } catch (err: any) {
      lastErr = err;
      console.warn(`Model ${model} failed:`, err?.status ?? err?.name, String(err?.message ?? "").slice(0, 200));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("All models unavailable");
}

// Same event-stream shape the app already reads: one chunk, then [DONE].
function sse(translation: string) {
  return new Response(
    `data: ${JSON.stringify({ chunk: translation })}\n\ndata: [DONE]\n\n`,
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// Quick browser test: /api/translate?text=hello&target=German
export async function GET(req: Request) {
  const url = new URL(req.url);
  const text = url.searchParams.get("text");
  const target = url.searchParams.get("target");
  if (!text || !target) return json(405, { error: "Use POST, or GET ?text=...&target=..." });
  try {
    return json(200, { translation: await translate(text, url.searchParams.get("source") ?? "auto", target) });
  } catch (err: any) {
    return json(502, { error: "Translation failed: " + (err?.message || "Unknown error") });
  }
}

export async function POST(req: Request) {
  try {
    const { text, sourceLang = "auto", targetLang } = await req.json();
    if (!text || !targetLang) return json(400, { error: "Missing text or target language" });
    return sse(await translate(text, sourceLang, targetLang));
  } catch (err: any) {
    console.error("Gemini proxy error:", err?.message);
    return json(502, { error: "Translation failed: " + (err?.message || "Unknown error") });
  }
}
