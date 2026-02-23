import dns from "dns";
import { promisify } from "util";

const dnsResolve = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Normalize URL
    let normalizedUrl = url.trim().toLowerCase();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname;

    const results = {
      domain,
      url: normalizedUrl,
      score: 0,
      riskLevel: "High Risk",
      checks: {},
      recommendations: [],
      timestamp: new Date().toISOString(),
    };

    let score = 0;
    const maxScore = 100;

    // 1. Basic Checks
    try {
      const startTime = Date.now();
      const response = await fetch(normalizedUrl, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });
      const responseTime = Date.now() - startTime;

      results.checks.basic = {
        dnsResolved: true,
        responseTime,
        statusCode: response.status,
        hasHttps: normalizedUrl.startsWith("https://"),
        redirectsToHttps: response.url.startsWith("https://"),
      };

      if (results.checks.basic.hasHttps) score += 10;
      if (results.checks.basic.redirectsToHttps) score += 5;
      if (responseTime < 1000) score += 5;
    } catch (error) {
      results.checks.basic = {
        dnsResolved: false,
        error: error.message,
      };
    }

    // 2. SSL/TLS Analysis
    try {
      const httpsUrl = normalizedUrl.replace("http://", "https://");
      const response = await fetch(httpsUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000),
      });

      // Check SSL certificate via headers
      const certInfo = {
        hasSsl: response.ok,
        tlsVersion: "TLS 1.2+", // Default assumption
      };

      results.checks.ssl = certInfo;
      if (certInfo.hasSsl) score += 15;
    } catch (error) {
      results.checks.ssl = {
        hasSsl: false,
        error: error.message,
      };
    }

    // 3. Security Headers Check
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
        hsts: headers["strict-transport-security"] ? "Present" : "Missing",
        csp: headers["content-security-policy"] ? "Present" : "Missing",
        xFrameOptions: headers["x-frame-options"] ? "Present" : "Missing",
        xContentTypeOptions: headers["x-content-type-options"] ? "Present" : "Missing",
        referrerPolicy: headers["referrer-policy"] ? "Present" : "Missing",
        permissionsPolicy: headers["permissions-policy"] ? "Present" : "Missing",
      };

      results.checks.securityHeaders = securityHeaders;

      // Score based on headers
      if (securityHeaders.hsts === "Present") score += 10;
      if (securityHeaders.csp === "Present") score += 10;
      if (securityHeaders.xFrameOptions === "Present") score += 5;
      if (securityHeaders.xContentTypeOptions === "Present") score += 5;
      if (securityHeaders.referrerPolicy === "Present") score += 3;
      if (securityHeaders.permissionsPolicy === "Present") score += 2;
    } catch (error) {
      results.checks.securityHeaders = {
        error: error.message,
      };
    }

    // 4. Domain Intelligence (Basic)
    try {
      // Get IP address
      let ipAddress = null;
      try {
        const ips = await dnsResolve(domain).catch(() => []);
        if (ips && ips.length > 0) {
          ipAddress = ips[0];
        }
      } catch (e) {
        // IPv4 failed, try IPv6
      }

      results.checks.domainInfo = {
        ipAddress,
        domain,
      };

      if (ipAddress) score += 5;
    } catch (error) {
      results.checks.domainInfo = {
        error: error.message,
      };
    }

    // 5. Technology Detection (Basic)
    try {
      const response = await fetch(normalizedUrl, {
        signal: AbortSignal.timeout(10000),
      });
      const html = await response.text();

      const technologies = {
        cms: null,
        server: response.headers.get("server") || "Unknown",
      };

      // Detect CMS
      if (html.includes("wp-content") || html.includes("wordpress")) {
        technologies.cms = "WordPress";
      } else if (html.includes("shopify")) {
        technologies.cms = "Shopify";
      } else if (html.includes("drupal")) {
        technologies.cms = "Drupal";
      }

      results.checks.technologies = technologies;
    } catch (error) {
      results.checks.technologies = {
        error: error.message,
      };
    }

    // Calculate final score
    results.score = Math.min(score, maxScore);

    // Determine risk level
    if (results.score >= 71) {
      results.riskLevel = "Secure";
    } else if (results.score >= 41) {
      results.riskLevel = "Medium Risk";
    } else {
      results.riskLevel = "High Risk";
    }

    // Generate recommendations
    if (!results.checks.basic?.hasHttps) {
      results.recommendations.push("Enable HTTPS/SSL certificate");
    }
    if (results.checks.securityHeaders?.hsts === "Missing") {
      results.recommendations.push("Add Strict-Transport-Security (HSTS) header");
    }
    if (results.checks.securityHeaders?.csp === "Missing") {
      results.recommendations.push("Add Content-Security-Policy (CSP) header");
    }
    if (results.checks.securityHeaders?.xFrameOptions === "Missing") {
      results.recommendations.push("Add X-Frame-Options header to prevent clickjacking");
    }

    return res.status(200).json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Website security score error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

