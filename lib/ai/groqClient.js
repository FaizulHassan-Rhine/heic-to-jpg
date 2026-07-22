import { MAX_INPUT_CHARS as DEFAULT_MAX } from "./constants";

/** Groq chat completions client (server-only). */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export { MAX_INPUT_CHARS } from "./constants";
export const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

export function getGroqApiKey() {
  return process.env.GROQ_API_KEY || "";
}

/**
 * @param {{ system: string, user: string, temperature?: number, maxTokens?: number }} opts
 * @returns {Promise<string>}
 */
export async function groqChat({ system, user, temperature = 0.4, maxTokens = 2048 }) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    const err = new Error("AI is not configured. Set GROQ_API_KEY on the server.");
    err.code = "NO_API_KEY";
    err.status = 503;
    throw err;
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `Groq request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status >= 500 ? 502 : res.status;
    err.code = "GROQ_ERROR";
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    const err = new Error("Empty response from AI. Try again.");
    err.status = 502;
    err.code = "EMPTY_RESPONSE";
    throw err;
  }

  return text;
}

export function validateTextInput(text, { max = DEFAULT_MAX, label = "Text" } = {}) {
  if (typeof text !== "string" || !text.trim()) {
    const err = new Error(`${label} is required.`);
    err.status = 400;
    err.code = "VALIDATION";
    throw err;
  }
  if (text.length > max) {
    const err = new Error(`${label} is too long (max ${max.toLocaleString()} characters).`);
    err.status = 400;
    err.code = "VALIDATION";
    throw err;
  }
  return text.trim();
}
