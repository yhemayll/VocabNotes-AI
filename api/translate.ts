// api/translate.ts — Vercel serverless function (Node runtime, web-standard handlers)
import { GoogleGenAI } from "@google/genai";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const { text, sourceLang = "auto", targetLang } = await req.json();
    if (!text || !targetLang) {
      return json(400, { error: "Missing text or target language" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing in environment variables");
      return json(500, { error: "Server configuration error: API key missing" });
    }

    const ai = new GoogleGenAI({ apiKey });

    const from = sourceLang === "auto" ? "the detected source language" : sourceLang;
    const prompt =
      `You are a precise translator. Translate the text below from ${from} to ${targetLang}. ` +
      `Return ONLY the translation — no explanations, no quotes.\n\n${text}`;

    // Try several models: if one is overloaded (503), rate-limited (429) or
    // unavailable (404), fall through to the next instead of failing.
    const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
    let stream: AsyncGenerator<{ text?: string }> | null = null;
    let lastErr: any = null;
    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2 && !stream; attempt++) {
        try {
          stream = await ai.models.generateContentStream({
            model,
            contents: prompt,
            config: { temperature: 0, maxOutputTokens: 512 },
          });
        } catch (err: any) {
          lastErr = err;
          const status = err?.status ?? err?.code;
          console.warn(`Model ${model} failed (attempt ${attempt + 1}):`, status, err?.message?.slice(0, 200));
          if (![429, 500, 503, 404].includes(Number(status))) throw err;
          if (attempt === 0 && status !== 404) await new Promise((r) => setTimeout(r, 600));
          if (status === 404) break;
        }
      }
      if (stream) break;
    }
    if (!stream) throw lastErr ?? new Error("All models unavailable");

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const piece = chunk.text ?? "";
            if (piece) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: piece })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Gemini proxy error:", error?.message, error?.stack);
    return json(500, { error: "Translation failed: " + (error?.message || "Unknown error") });
  }
}
