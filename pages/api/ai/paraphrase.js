import {
  groqChat,
  validateTextInput,
  checkAndConsumeRateLimit,
  getClientIp,
  applyRateLimitHeaders,
  handleAiError,
} from "../../../lib/ai/apiHelpers";

const TONES = {
  standard: "Rewrite clearly while keeping the original meaning and roughly the same length.",
  formal: "Rewrite in a formal, professional tone suitable for business or academic writing.",
  simple: "Rewrite in simpler words that a general audience can understand easily.",
  creative: "Rewrite with more vivid, engaging language while keeping the core meaning.",
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

    const text = validateTextInput(req.body?.text);
    const toneKey = String(req.body?.tone || "standard").toLowerCase();
    const toneInstruction = TONES[toneKey] || TONES.standard;

    const result = await groqChat({
      system:
        "You are a careful paraphrasing assistant. Output only the rewritten text with no preamble, labels, or quotation marks around the whole answer.",
      user: `${toneInstruction}\n\nText:\n${text}`,
      temperature: 0.5,
      maxTokens: 2048,
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
