import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const maxAttempts = 3;

const getStatusCode = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  return typeof error.status === "number" ? error.status : undefined;
};

export const generateRecipeText = async (prompt: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("GEMINI_NOT_CONFIGURED");
  }

  const ai = new GoogleGenAI({ apiKey });
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      if (!response.text) {
        throw new Error("GEMINI_EMPTY_RESPONSE");
      }

      return response.text;
    } catch (error) {
      const status = getStatusCode(error);
      if (status === 503 && attempt < maxAttempts) {
        console.warn(
          `Gemini text generation returned HTTP 503; retrying (${attempt}/${maxAttempts - 1})`,
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
        continue;
      }

      if (status === 503 || status === 429) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `Gemini text generation failed with HTTP ${status}:`,
          detail.replaceAll(apiKey, "[redacted]"),
        );
        throw new Error(
          status === 503
            ? "GEMINI_TEMPORARILY_UNAVAILABLE"
            : "GEMINI_RATE_LIMITED",
        );
      }

      throw error;
    }
  }

  throw new Error("GEMINI_TEMPORARILY_UNAVAILABLE");
};
