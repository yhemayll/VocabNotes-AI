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

    const stream = await ai.models.generateContentStream({
      model: "gemini-flash-latest",
      contents: prompt,
      config: { temperature: 0, maxOutputTokens: 512 },
    });

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
