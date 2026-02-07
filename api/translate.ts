import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { text, sourceLang, targetLang } = await req.json();

    if (!text || !targetLang) {
      return new Response(JSON.stringify({ error: "Missing text or target language" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // or "gemini-1.5-pro" if you have access

    const prompt = `Translate the following text from ${sourceLang || "auto"} to ${targetLang}: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translation = response.text();

    return new Response(JSON.stringify({ translation }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Translation failed: " + (error.message || "Unknown error") }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const config = {
  runtime: "nodejs18.x", // or "edge" if you prefer faster but less Node features
};
