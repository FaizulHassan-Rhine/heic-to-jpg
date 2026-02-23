export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const [localPart, domain] = email.split("@");

    const results = {
      email,
      domain,
      trustScore: 0,
      riskLevel: "Low",
      checks: {},
      recommendations: [],
      timestamp: new Date().toISOString(),
    };

    let score = 50; // Start with neutral score

    // 1. Email Format Validation
    results.checks.format = {
      valid: true,
    };
    score += 10;

    // 2. Domain Analysis (Basic)
    try {
      // Check if domain exists via DNS
      const dns = require("dns");
      const { promisify } = require("util");
      const resolveMx = promisify(dns.resolveMx);

      try {
        const mxRecords = await resolveMx(domain);
        results.checks.domain = {
          exists: true,
          hasMxRecords: mxRecords && mxRecords.length > 0,
        };
        if (results.checks.domain.hasMxRecords) score += 10;
      } catch (error) {
        results.checks.domain = {
          exists: false,
          error: "Domain not found or no MX records",
        };
        score -= 20;
      }
    } catch (error) {
      results.checks.domain = {
        error: error.message,
      };
    }

    // 3. Disposable Email Detection (Basic)
    const disposableDomains = [
      "tempmail.com", "guerrillamail.com", "10minutemail.com", "mailinator.com",
      "throwaway.email", "temp-mail.org", "getnada.com", "mohmal.com",
    ];
    const isDisposable = disposableDomains.some((d) => domain.toLowerCase().includes(d));
    results.checks.disposable = {
      isDisposable,
    };
    if (isDisposable) {
      score -= 30;
      results.recommendations.push("This appears to be a disposable/temporary email address");
    }

    // 4. Domain Age Check (Basic - using WHOIS)
    try {
      const whoisResponse = await fetch(`https://rdap.org/domain/${domain}`);
      if (whoisResponse.ok) {
        const whoisData = await whoisResponse.json();
        const events = whoisData.events || [];
        const registrationDate = events.find((e) => e.eventAction === "registration")?.eventDate;
        
        if (registrationDate) {
          const regDate = new Date(registrationDate);
          const ageInDays = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24));
          results.checks.domainAge = {
            ageInDays,
            registrationDate,
          };
          if (ageInDays > 365) score += 10;
          if (ageInDays < 30) score -= 10;
        }
      }
    } catch (error) {
      // WHOIS check failed, continue
    }

    // Calculate final score
    results.trustScore = Math.max(0, Math.min(100, score));

    // Determine risk level
    if (results.trustScore >= 70) {
      results.riskLevel = "Low";
    } else if (results.trustScore >= 40) {
      results.riskLevel = "Medium";
    } else {
      results.riskLevel = "High";
    }

    // Additional recommendations
    if (results.trustScore < 50) {
      results.recommendations.push("Consider using a more reputable email provider");
    }
    if (!results.checks.domain?.hasMxRecords) {
      results.recommendations.push("Domain email configuration may be incomplete");
    }

    return res.status(200).json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Email reputation check error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

