// api/translate.ts
import { GoogleGenerativeAI } from "@google/genai";

export const config = {
  runtime: "nodejs", // or "edge" if you want even faster cold starts
};

// CORS headers – needed for Safari/iOS
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
  // Always add CORS
  const headers = { ...CORS_HEADERS };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { text, sourceLang, targetLang } = body;

    if (!text || !targetLang) {
      return new Response(
        JSON.stringify({ error: "Missing text or target language" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured on server" }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest", // fastest available in 2026
      generationConfig: {
        temperature: 0.0,           // deterministic, faster, no creativity
        maxOutputTokens: 256,       // reasonable limit for translation
        topP: 0.95,
      },
    });

    const prompt = `Translate the following text from ${sourceLang || "auto"} to ${targetLang}. Return only the translation, nothing else:\n\n"${text}"`;

    const stream = await model.generateContentStream(prompt);

    // Stream the response back to the client (progressive output)
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream.stream) {
            const textChunk = chunk.text();
            if (textChunk) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ chunk: textChunk })}\n\n`)
              );
            }
          }
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
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
    console.error("Gemini proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Translation failed: " + (error.message || "Unknown error") }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
}
