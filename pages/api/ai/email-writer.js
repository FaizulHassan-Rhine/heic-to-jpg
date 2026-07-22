import {
  groqChat,
  validateTextInput,
  checkAndConsumeRateLimit,
  getClientIp,
  applyRateLimitHeaders,
  handleAiError,
} from "../../../lib/ai/apiHelpers";
const TONES = {
  professional: "Professional and polite.",
  friendly: "Warm and friendly but still clear.",
  formal: "Formal and concise.",
  casual: "Casual and approachable.",
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

    const intent = validateTextInput(req.body?.intent || req.body?.purpose, {
      max: 2000,
      label: "Email purpose",
    });
    const bulletsRaw = typeof req.body?.bullets === "string" ? req.body.bullets.trim() : "";
    if (bulletsRaw.length > 4000) {
      return res.status(400).json({ error: "Key points are too long.", code: "VALIDATION" });
    }

    const toneKey = String(req.body?.tone || "professional").toLowerCase();
    const toneInstruction = TONES[toneKey] || TONES.professional;

    const raw = await groqChat({
      system: `You write short emails. Reply ONLY with valid JSON of the form {"subject":"...","body":"..."} with no markdown fences. Tone: ${toneInstruction} Keep body under 220 words unless the user asks for longer.`,
      user: `Purpose: ${intent}\n\nKey points:\n${bulletsRaw || "(none — invent reasonable polite content from the purpose)"}\n\nReturn JSON with subject and body.`,
      temperature: 0.5,
      maxTokens: 1200,
    });

    let subject = "";
    let body = "";
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      subject = String(parsed.subject || "").trim();
      body = String(parsed.body || "").trim();
    } catch {
      // Fallback: treat whole response as body
      body = raw;
      subject = "Follow-up";
    }

    if (!body) {
      return res.status(502).json({ error: "Could not generate email. Try again.", code: "EMPTY_RESPONSE" });
    }

    return res.status(200).json({
      subject,
      body,
      remaining: quota.remaining,
      limit: quota.limit,
    });
  } catch (err) {
    return handleAiError(res, err);
  }
}
