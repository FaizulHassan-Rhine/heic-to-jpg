export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { ip } = req.query;
    
    // If IP is provided in query, use it
    if (ip) {
      // Validate IP format
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(ip.trim())) {
        return res.status(400).json({ error: "Invalid IP address format" });
      }
      
      return await lookupIp(ip.trim(), res);
    }

    // If no IP provided, use ip-api.com to get the server's IP and details
    // This is useful for "Lookup My IP" functionality
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const autoDetectResponse = await fetch("http://ip-api.com/json/", {
        headers: {
          "User-Agent": "ConvertMastery-IP-Lookup/1.0",
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!autoDetectResponse.ok) {
        throw new Error(`ip-api.com returned ${autoDetectResponse.status}`);
      }
      
      const autoDetectData = await autoDetectResponse.json();
      
      if (autoDetectData.status === "success" && autoDetectData.query) {
        // Return the data directly from ip-api.com
        return res.status(200).json({
          ip: autoDetectData.query,
          city: autoDetectData.city || null,
          region: autoDetectData.regionName || null,
          country: autoDetectData.country || null,
          countryCode: autoDetectData.countryCode || null,
          postal: autoDetectData.zip || null,
          lat: autoDetectData.lat || null,
          lon: autoDetectData.lon || null,
          timezone: autoDetectData.timezone || null,
          isp: autoDetectData.isp || null,
          org: autoDetectData.org || null,
        });
      } else {
        throw new Error(autoDetectData.message || "Failed to detect IP address");
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return res.status(500).json({
          error: "IP detection request timed out. Please try again or provide an IP address.",
        });
      }
      
      console.error("Auto-detect IP failed:", error.message);
      
      // Try to get IP from headers as fallback
      const forwardedFor = req.headers["x-forwarded-for"];
      const realIp = req.headers["x-real-ip"];
      const cfIp = req.headers["cf-connecting-ip"];
      
      const headerIp = forwardedFor?.split(",")[0]?.trim() || realIp || cfIp;
      
      if (headerIp) {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (ipRegex.test(headerIp)) {
          return await lookupIp(headerIp, res);
        }
      }
      
      return res.status(400).json({ 
        error: "Could not detect IP address. Please provide an IP address in the query parameter (e.g., ?ip=8.8.8.8).",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  } catch (error) {
    console.error("IP lookup error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

async function lookupIp(ipToLookup, res) {
  if (!ipToLookup || typeof ipToLookup !== "string") {
    throw new Error("Invalid IP address provided");
  }

  // Use ipapi.co for IP lookup (free tier: 1000 requests/day)
  // Fallback to ip-api.com if needed
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`https://ipapi.co/${ipToLookup}/json/`, {
      headers: {
        "User-Agent": "ConvertMastery-IP-Lookup/1.0",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`ipapi.co returned ${response.status}`);
    }
    
    const data = await response.json();

    if (data.error) {
      throw new Error(data.reason || "IP lookup failed");
    }

    return res.status(200).json({
      ip: data.ip || ipToLookup,
      city: data.city || null,
      region: data.region || null,
      country: data.country_name || null,
      countryCode: data.country_code || null,
      postal: data.postal || null,
      lat: data.latitude || null,
      lon: data.longitude || null,
      timezone: data.timezone || null,
      isp: data.org || null,
      org: data.org || null,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("ipapi.co request timed out, trying fallback");
    } else {
      console.log("ipapi.co failed, trying fallback:", error.message);
    }
    
    // Fallback to ip-api.com
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const fallbackResponse = await fetch(`http://ip-api.com/json/${ipToLookup}`, {
        headers: {
          "User-Agent": "ConvertMastery-IP-Lookup/1.0",
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!fallbackResponse.ok) {
        throw new Error(`ip-api.com returned ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();

      if (fallbackData.status === "fail") {
        throw new Error(fallbackData.message || "IP lookup failed");
      }

      return res.status(200).json({
        ip: fallbackData.query || ipToLookup,
        city: fallbackData.city || null,
        region: fallbackData.regionName || null,
        country: fallbackData.country || null,
        countryCode: fallbackData.countryCode || null,
        postal: fallbackData.zip || null,
        lat: fallbackData.lat || null,
        lon: fallbackData.lon || null,
        timezone: fallbackData.timezone || null,
        isp: fallbackData.isp || null,
        org: fallbackData.org || null,
      });
    } catch (fallbackError) {
      console.error("Both IP lookup services failed:", fallbackError.message);
      throw new Error(`IP lookup failed: ${fallbackError.message}`);
    }
  }
}

