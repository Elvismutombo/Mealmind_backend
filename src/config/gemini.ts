import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const maxAttempts = 3;

const getStatusCode = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  return typeof error.status === "number" ? error.status : undefined;
};

const generateText = async (
  prompt: string,
  options: { responseMimeType?: string; temperature: number },
): Promise<string> => {
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
          ...(options.responseMimeType
            ? { responseMimeType: options.responseMimeType }
            : {}),
          temperature: options.temperature,
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

export const generateRecipeText = (prompt: string): Promise<string> =>
  generateText(prompt, {
    responseMimeType: "application/json",
    temperature: 0.7,
  });

export const translateTextsToFrench = async (
  texts: string[],
): Promise<string[]> => {
  if (texts.length === 0) return [];

  const response = await generateText(
    `Translate each recipe instruction into French. Preserve meaning, quantities, temperatures, and step order. Return only JSON in the form {"translations":["..."]}, with exactly one translation per input and in the same order. Inputs: ${JSON.stringify(texts)}`,
    {
      responseMimeType: "application/json",
      temperature: 0,
    },
  );
  let payload: unknown;
  try {
    payload = JSON.parse(response);
  } catch {
    throw new Error("GEMINI_INVALID_TRANSLATION_RESPONSE");
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("translations" in payload) ||
    !Array.isArray(payload.translations) ||
    payload.translations.length !== texts.length ||
    payload.translations.some(
      (translation) =>
        typeof translation !== "string" || translation.trim().length === 0,
    )
  ) {
    throw new Error("GEMINI_INVALID_TRANSLATION_RESPONSE");
  }

  return payload.translations.map((translation: string) => translation.trim());
};
