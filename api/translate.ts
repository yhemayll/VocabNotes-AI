export const config = {
  runtime: "nodejs", // or "edge" if you prefer
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export default async function handler(req: Request) {
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

    // Public LibreTranslate instance (fast & free)
    const LIBRE_URL = "https://libretranslate.com/translate"; // or "https://translate.argosopentech.com/translate"

    const response = await fetch(LIBRE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: sourceLang !== "auto" ? sourceLang.toLowerCase().slice(0, 2) : "auto",
        target: targetLang.toLowerCase().slice(0, 2),
        format: "text",
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "LibreTranslate error");
    }

    const data = await response.json();
    const translated = data.translatedText || text;

    return new Response(JSON.stringify({ translation: translated }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("LibreTranslate error:", error);
    return new Response(JSON.stringify({ error: "Translation failed: " + (error.message || "Unknown") }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
}
