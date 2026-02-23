/**
 * Temporary Email API proxy using Mail.tm / Mail.gw
 *
 * These services provide free REST APIs specifically designed
 * for programmatic temporary email creation and inbox access.
 *
 * Flow:
 * 1. GET  /domains  → List available domains
 * 2. POST /accounts → Create an account (email + password)
 * 3. POST /token    → Get JWT for inbox access
 * 4. GET  /messages → List inbox messages (auth required)
 * 5. GET  /messages/{id} → Read specific message (auth required)
 *
 * We try api.mail.tm first, then api.mail.gw as fallback.
 */

const API_ENDPOINTS = [
  "https://api.mail.tm",
  "https://api.mail.gw",
];

/**
 * Makes a fetch request to mail.tm/mail.gw with automatic fallback
 */
async function apiCall(path, options = {}) {
  let lastError;

  for (const endpoint of API_ENDPOINTS) {
    try {
      const url = `${endpoint}${path}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeout);

      if (response.ok) {
        return await response.json();
      }

      // For client errors (4xx), throw immediately — don't try fallback
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const errorText = await response.text();
        let errorMsg;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson["hydra:description"] || errorJson.message || errorJson.detail || errorText;
        } catch {
          errorMsg = errorText.substring(0, 300);
        }
        throw new Error(`API ${response.status}: ${errorMsg}`);
      }

      lastError = new Error(`HTTP ${response.status} from ${endpoint}`);
    } catch (error) {
      lastError = error;
      // Don't try other endpoints for client errors
      if (error.message.startsWith("API 4")) {
        throw error;
      }
      continue;
    }
  }

  throw lastError || new Error("All API endpoints failed");
}

export default async function handler(req, res) {
  // Allow both GET and POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const action = req.query.action;

  try {
    switch (action) {
      // ─── Get available domains ───────────────────────────────
      case "getDomains": {
        const data = await apiCall("/domains");
        const members = data["hydra:member"] || (Array.isArray(data) ? data : []);
        const domains = members
          .filter((d) => d.domain && d.isActive !== false)
          .map((d) => d.domain);

        return res.status(200).json({ success: true, domains });
      }

      // ─── Create email account ────────────────────────────────
      case "createAccount": {
        const address = req.body?.address || req.query.address;
        const password = req.body?.password || req.query.password;

        if (!address || !password) {
          return res.status(400).json({ error: "address and password are required" });
        }

        // Step 1: Create the account
        let accountData;
        try {
          accountData = await apiCall("/accounts", {
            method: "POST",
            body: JSON.stringify({ address, password }),
          });
        } catch (error) {
          // If account already exists (422), still try to get a token
          if (error.message.includes("422") || error.message.includes("already")) {
            console.log("Account may already exist, trying token...");
          } else {
            throw error;
          }
        }

        // Step 2: Get authentication token
        const tokenData = await apiCall("/token", {
          method: "POST",
          body: JSON.stringify({ address, password }),
        });

        return res.status(200).json({
          success: true,
          email: accountData?.address || address,
          id: accountData?.id || tokenData.id || "",
          token: tokenData.token,
        });
      }

      // ─── Get inbox messages ──────────────────────────────────
      case "getMessages": {
        const token = req.query.token;
        if (!token) {
          return res.status(400).json({ error: "token is required" });
        }

        try {
          // First verify the token is valid by getting account info
          let accountInfo;
          try {
            accountInfo = await apiCall("/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch (error) {
            console.error("Token validation failed:", error.message);
            return res.status(401).json({
              success: false,
              error: "Invalid or expired token. Please generate a new email.",
            });
          }

          // Now fetch messages
          const data = await apiCall("/messages?page=1", {
            headers: { Authorization: `Bearer ${token}` },
          });

          // Log the raw response for debugging
          if (process.env.NODE_ENV === "development") {
            console.log("Mail.tm getMessages response:", JSON.stringify(data, null, 2));
            console.log("Account email:", accountInfo?.address);
          }

          // Handle different response formats
          let messagesArray = [];
          if (data["hydra:member"] && Array.isArray(data["hydra:member"])) {
            messagesArray = data["hydra:member"];
          } else if (Array.isArray(data)) {
            messagesArray = data;
          } else if (data.messages && Array.isArray(data.messages)) {
            messagesArray = data.messages;
          }

          const messages = messagesArray.map((msg) => ({
            id: msg.id,
            from: msg.from?.address || msg.from || "Unknown",
            fromName: msg.from?.name || "",
            subject: msg.subject || "(No Subject)",
            date: msg.createdAt || msg.date,
            intro: msg.intro || msg.preview || "",
            seen: msg.seen !== undefined ? msg.seen : false,
            hasAttachments: msg.hasAttachments || false,
            size: msg.size || 0,
          }));

          if (process.env.NODE_ENV === "development") {
            console.log(`Parsed ${messages.length} messages from Mail.tm for ${accountInfo?.address}`);
          }

          return res.status(200).json({
            success: true,
            messages,
            count: data["hydra:totalItems"] || data.totalItems || messages.length,
            accountEmail: accountInfo?.address, // Include account email for verification
          });
        } catch (error) {
          console.error("getMessages error:", error.message);
          return res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch messages",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
          });
        }
      }

      // ─── Read a specific message ─────────────────────────────
      case "readMessage": {
        const { token, messageId } = req.query;
        if (!token || !messageId) {
          return res.status(400).json({ error: "token and messageId are required" });
        }

        const msg = await apiCall(`/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Handle html field (can be array or string)
        let htmlBody = "";
        if (Array.isArray(msg.html)) {
          htmlBody = msg.html.join("");
        } else if (typeof msg.html === "string") {
          htmlBody = msg.html;
        }

        return res.status(200).json({
          success: true,
          id: msg.id,
          from: msg.from?.address || "Unknown",
          fromName: msg.from?.name || "",
          subject: msg.subject || "(No Subject)",
          date: msg.createdAt,
          htmlBody,
          textBody: msg.text || msg.intro || "",
          attachments: (msg.attachments || []).map((att) => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
          })),
        });
      }

      // ─── Delete account ──────────────────────────────────────
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

    const statusCode = error.message.startsWith("API 4") ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message.startsWith("API 4")
        ? error.message
        : "Email service temporarily unavailable. Please try again.",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
