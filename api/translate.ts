import { GoogleGenerativeAI } from "@google/genai";

export const config = {
  runtime: "nodejs",  // Uses the latest supported Node.js (20.x or 22.x)
};

// Handle CORS preflight (OPTIONS) requests from Safari/iOS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",  // Or replace * with your exact domain later for security
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",  // Cache preflight for 24h
    },
  });
}

export default async function handler(req: Request) {
  // Add CORS to all responses
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  try {
    const { text, sourceLang, targetLang } = await req.json();

    if (!text || !targetLang) {
      return new Response(JSON.stringify({ error: "Missing text or target language" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Translate the following text from ${sourceLang || "auto"} to ${targetLang}: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translation = response.text();

    return new Response(JSON.stringify({ translation }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Translation failed: " + (error.message || "Unknown error") }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
}
