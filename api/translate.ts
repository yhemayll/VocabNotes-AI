// api/translate.ts
import { GenerativeAI } from "@google/genai";

export const config = {
  runtime: "nodejs", // or "edge" — "nodejs" is safer for this SDK right now
};

// CORS headers (required for Safari/iOS and cross-origin fetches)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export default async function handler(req: Request) {
  const headers = { ...CORS_HEADERS };

  // Handle preflight (OPTIONS) requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { text, sourceLang = "auto", targetLang } = body;

    if (!text || !targetLang) {
      return new Response(
        JSON.stringify({ error: "Missing text or target language" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing in environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error: API key missing" }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    console.log(`Translating "${text}" from ${sourceLang} to ${targetLang}`);

    const genAI = new GenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest", // fastest & most reliable in 2026
      generationConfig: {
        temperature: 0.0,           // no randomness — fast & deterministic
        maxOutputTokens: 256,
        topP: 0.95,
      },
    });

    // Stronger prompt to prevent empty / refused responses
    const prompt = `You are a precise translator. Translate ONLY the following text from ${sourceLang} to ${targetLang}. Return ONLY the translated text — nothing else, no explanations, no quotes, no comments:\n\n"${text}"`;

    const stream = await model.generateContentStream(prompt);

    // Create streaming response (text appears progressively in the app)
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream.stream) {
            const textChunk = chunk.text?.() || "";
            if (textChunk) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ chunk: textChunk })}\n\n`)
              );
            }
          }
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Gemini proxy error:", error.message, error.stack);
    return new Response(
      JSON.stringify({ error: "Translation failed: " + (error.message || "Unknown error") }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
}
