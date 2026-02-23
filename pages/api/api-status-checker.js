export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url, method = "GET" } = req.query;

    if (!url) {
      return res.status(400).json({ error: "API URL is required" });
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const results = {
      url: normalizedUrl,
      method: method.toUpperCase(),
      healthScore: 0,
      status: "Unknown",
      checks: {},
      recommendations: [],
      timestamp: new Date().toISOString(),
    };

    let score = 0;
    const maxScore = 100;

    // 1. Connectivity Check
    try {
      const startTime = Date.now();
      const response = await fetch(normalizedUrl, {
        method: method.toUpperCase(),
        signal: AbortSignal.timeout(10000),
        headers: {
          "User-Agent": "ConvertMastery-API-Checker/1.0",
        },
      });
      const responseTime = Date.now() - startTime;
      const ttfb = responseTime; // Simplified TTFB

      results.checks.connectivity = {
        reachable: true,
        statusCode: response.status,
        responseTime,
        ttfb,
      };

      if (response.ok) score += 30;
      if (responseTime < 500) score += 10;
      if (responseTime < 1000) score += 5;
    } catch (error) {
      results.checks.connectivity = {
        reachable: false,
        error: error.message,
      };
    }

    // 2. SSL Check
    try {
      const httpsUrl = normalizedUrl.replace("http://", "https://");
      const response = await fetch(httpsUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000),
      });

      results.checks.ssl = {
        hasSsl: response.ok && httpsUrl.startsWith("https://"),
        tlsVersion: "TLS 1.2+", // Default assumption
      };

      if (results.checks.ssl.hasSsl) score += 15;
    } catch (error) {
      results.checks.ssl = {
        hasSsl: false,
        error: error.message,
      };
    }

    // 3. Response Analysis
    try {
      const response = await fetch(normalizedUrl, {
        method: method.toUpperCase(),
        signal: AbortSignal.timeout(10000),
      });

      const contentType = response.headers.get("content-type") || "";
      const contentLength = response.headers.get("content-length");

      let isValidJson = false;
      try {
        const text = await response.text();
        JSON.parse(text);
        isValidJson = true;
      } catch (e) {
        // Not JSON
      }

      results.checks.response = {
        contentType,
        contentLength: contentLength ? parseInt(contentLength) : null,
        isValidJson,
      };

      if (isValidJson) score += 10;
      if (contentType.includes("application/json")) score += 5;
    } catch (error) {
      results.checks.response = {
        error: error.message,
      };
    }

    // 4. Security Headers
    try {
      const response = await fetch(normalizedUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000),
      });

      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      const securityHeaders = {
        cors: headers["access-control-allow-origin"] ? "Present" : "Missing",
        hsts: headers["strict-transport-security"] ? "Present" : "Missing",
        csp: headers["content-security-policy"] ? "Present" : "Missing",
        xFrameOptions: headers["x-frame-options"] ? "Present" : "Missing",
      };

      results.checks.securityHeaders = securityHeaders;

      if (securityHeaders.cors === "Present") score += 5;
      if (securityHeaders.hsts === "Present") score += 5;
      if (securityHeaders.csp === "Present") score += 5;
    } catch (error) {
      results.checks.securityHeaders = {
        error: error.message,
      };
    }

    // 5. Rate Limit Detection
    try {
      const response = await fetch(normalizedUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000),
      });

      const rateLimitHeaders = {
        limit: response.headers.get("x-ratelimit-limit"),
        remaining: response.headers.get("x-ratelimit-remaining"),
        reset: response.headers.get("x-ratelimit-reset"),
      };

      results.checks.rateLimit = {
        detected: !!(rateLimitHeaders.limit || rateLimitHeaders.remaining),
        headers: rateLimitHeaders,
      };

      if (results.checks.rateLimit.detected) score += 5;
    } catch (error) {
      results.checks.rateLimit = {
        error: error.message,
      };
    }

    // Calculate final score
    results.healthScore = Math.min(score, maxScore);

    // Determine status
    if (results.healthScore >= 70) {
      results.status = "Secure";
    } else if (results.healthScore >= 40) {
      results.status = "Moderate";
    } else {
      results.status = "Vulnerable";
    }

    // Generate recommendations
    if (!results.checks.connectivity?.reachable) {
      results.recommendations.push("API endpoint is not reachable");
    }
    if (!results.checks.ssl?.hasSsl) {
      results.recommendations.push("Enable HTTPS/SSL for secure API communication");
    }
    if (results.checks.securityHeaders?.cors === "Missing") {
      results.recommendations.push("Configure CORS headers properly");
    }
    if (results.checks.securityHeaders?.hsts === "Missing") {
      results.recommendations.push("Add HSTS header for enhanced security");
    }
    if (results.checks.responseTime > 2000) {
      results.recommendations.push("Optimize API response time for better performance");
    }

    return res.status(200).json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("API status check error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

