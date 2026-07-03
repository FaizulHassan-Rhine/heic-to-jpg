/**
 * Mail.tm / Mail.gw client — callable from browser (CORS *) or server.
 * On Vercel, outbound requests to mail.tm are often blocked; the fake-email
 * page calls these functions directly from the browser in production.
 */

const API_ENDPOINTS = ["https://api.mail.tm", "https://api.mail.gw"];

export async function apiCall(path, options = {}) {
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

      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const errorText = await response.text();
        let errorMsg;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg =
            errorJson["hydra:description"] ||
            errorJson.message ||
            errorJson.detail ||
            errorText;
        } catch {
          errorMsg = errorText.substring(0, 300);
        }
        throw new Error(`API ${response.status}: ${errorMsg}`);
      }

      lastError = new Error(`HTTP ${response.status} from ${endpoint}`);
    } catch (error) {
      lastError = error;
      if (error.message?.startsWith("API 4")) {
        throw error;
      }
      continue;
    }
  }

  throw lastError || new Error("All API endpoints failed");
}

export async function getTempEmailDomains() {
  const data = await apiCall("/domains");
  const members = data["hydra:member"] || (Array.isArray(data) ? data : []);
  return members
    .filter((d) => d.domain && d.isActive !== false)
    .map((d) => d.domain);
}

export async function createTempEmailAccount(address, password) {
  let accountData;
  try {
    accountData = await apiCall("/accounts", {
      method: "POST",
      body: JSON.stringify({ address, password }),
    });
  } catch (error) {
    if (!error.message?.includes("422") && !error.message?.includes("already")) {
      throw error;
    }
  }

  const tokenData = await apiCall("/token", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  });

  return {
    success: true,
    email: accountData?.address || address,
    id: accountData?.id || tokenData.id || "",
    token: tokenData.token,
  };
}

export async function getTempEmailMessages(token) {
  let accountInfo;
  try {
    accountInfo = await apiCall("/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Invalid or expired token. Please generate a new email.");
  }

  const data = await apiCall("/messages?page=1", {
    headers: { Authorization: `Bearer ${token}` },
  });

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

  return {
    success: true,
    messages,
    count: data["hydra:totalItems"] || data.totalItems || messages.length,
    accountEmail: accountInfo?.address,
  };
}

export async function readTempEmailMessage(token, messageId) {
  const msg = await apiCall(`/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let htmlBody = "";
  if (Array.isArray(msg.html)) {
    htmlBody = msg.html.join("");
  } else if (typeof msg.html === "string") {
    htmlBody = msg.html;
  }

  return {
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
  };
}
