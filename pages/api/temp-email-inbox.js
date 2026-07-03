/**
 * Temporary Email API proxy using Mail.tm / Mail.gw
 *
 * Note: mail.tm often blocks cloud host IPs (e.g. Vercel). The fake-email
 * page calls lib/tempEmailApi.js directly from the browser in production.
 */

import {
  getTempEmailDomains,
  createTempEmailAccount,
  getTempEmailMessages,
  readTempEmailMessage,
  apiCall,
} from "../../lib/tempEmailApi";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const action = req.query.action;

  try {
    switch (action) {
      case "getDomains": {
        const domains = await getTempEmailDomains();
        return res.status(200).json({ success: true, domains });
      }

      case "createAccount": {
        const address = req.body?.address || req.query.address;
        const password = req.body?.password || req.query.password;

        if (!address || !password) {
          return res.status(400).json({ error: "address and password are required" });
        }

        const result = await createTempEmailAccount(address, password);
        return res.status(200).json(result);
      }

      case "getMessages": {
        const token = req.query.token;
        if (!token) {
          return res.status(400).json({ error: "token is required" });
        }

        try {
          const result = await getTempEmailMessages(token);
          return res.status(200).json(result);
        } catch (error) {
          console.error("getMessages error:", error.message);
          const isAuth = error.message.includes("Invalid or expired token");
          return res.status(isAuth ? 401 : 500).json({
            success: false,
            error: error.message || "Failed to fetch messages",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
          });
        }
      }

      case "readMessage": {
        const { token, messageId } = req.query;
        if (!token || !messageId) {
          return res.status(400).json({ error: "token and messageId are required" });
        }

        const result = await readTempEmailMessage(token, messageId);
        return res.status(200).json(result);
      }

      case "deleteAccount": {
        const { token, accountId } = req.query;
        if (!token || !accountId) {
          return res.status(400).json({ error: "token and accountId are required" });
        }

        await apiCall(`/accounts/${accountId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({
          error: "Unknown action. Use: getDomains, createAccount, getMessages, readMessage",
        });
    }
  } catch (error) {
    console.error(`Temp email API error (${action}):`, error.message);

    const statusCode = error.message?.startsWith("API 4") ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message?.startsWith("API 4")
        ? error.message
        : "Email service temporarily unavailable. Please try again.",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
