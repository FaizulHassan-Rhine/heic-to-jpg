import {
  groqChat,
  validateTextInput,
  checkAndConsumeRateLimit,
  getClientIp,
  applyRateLimitHeaders,
  handleAiError,
} from "../../../lib/ai/apiHelpers";

const LENGTHS = {
  short: "Write a short summary in 2–3 sentences.",
  medium: "Write a clear summary in one short paragraph (about 5–8 sentences).",
  long: "Write a detailed summary covering the main points in a few short paragraphs.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const ip = getClientIp(req);
    const quota = checkAndConsumeRateLimit(ip);
    applyRateLimitHeaders(res, quota);

    if (!quota.allowed) {
      return res.status(429).json({
        error: "Daily free AI limit reached. Try again tomorrow.",
        code: "RATE_LIMIT",
        remaining: 0,
        limit: quota.limit,
      });
    }

    const text = validateTextInput(req.body?.text, { label: "Text to summarize" });
    const lengthKey = String(req.body?.length || "medium").toLowerCase();
    const lengthInstruction = LENGTHS[lengthKey] || LENGTHS.medium;

    const result = await groqChat({
      system:
        "You are a precise summarization assistant. Capture key facts and claims. Output only the summary — no title or preamble.",
      user: `${lengthInstruction}\n\nContent:\n${text}`,
      temperature: 0.3,
      maxTokens: 1500,
    });

    return res.status(200).json({
      result,
      remaining: quota.remaining,
      limit: quota.limit,
    });
  } catch (err) {
    return handleAiError(res, err);
  }
}
