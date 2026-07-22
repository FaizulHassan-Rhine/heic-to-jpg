import { groqChat, validateTextInput, getGroqApiKey } from "./groqClient";
import { checkAndConsumeRateLimit, getClientIp } from "./rateLimit";

function applyRateLimitHeaders(res, info) {
  res.setHeader("X-RateLimit-Limit", String(info.limit));
  res.setHeader("X-RateLimit-Remaining", String(info.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.floor(info.resetAt / 1000)));
}

function handleAiError(res, err) {
  const status = err.status || 500;
  return res.status(status).json({
    error: err.message || "Something went wrong.",
    code: err.code || "ERROR",
  });
}

export { applyRateLimitHeaders, handleAiError, groqChat, validateTextInput, getGroqApiKey, checkAndConsumeRateLimit, getClientIp };
