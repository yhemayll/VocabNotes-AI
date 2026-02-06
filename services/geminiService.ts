
import { GoogleGenAI } from "@google/genai";

export class TranslationService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following text strictly from ${from} to ${to}. Return ONLY the translated string, no extra commentary or quotes: "${text}"`,
        config: {
          temperature: 0.1,
          topP: 0.95,
        }
      });

      return response.text?.trim() || "Translation failed";
    } catch (error) {
      console.error("Translation error:", error);
      return "Translation error";
    }
  }
}

export const translationService = new TranslationService();
