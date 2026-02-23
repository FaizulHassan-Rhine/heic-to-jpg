export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, "");

    const results = {
      phone: cleaned,
      valid: false,
      riskLevel: "Unknown",
      checks: {},
      recommendations: [],
      timestamp: new Date().toISOString(),
    };

    // 1. Format Validation
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    const isValidFormat = e164Regex.test(cleaned) || /^\d{10,15}$/.test(cleaned);

    results.checks.format = {
      valid: isValidFormat,
      format: isValidFormat ? (cleaned.startsWith("+") ? "E.164" : "National") : "Invalid",
    };

    if (!isValidFormat) {
      results.recommendations.push("Phone number format is invalid. Use international format (e.g., +1234567890)");
      return res.status(200).json({
        success: true,
        ...results,
      });
    }

    results.valid = true;

    // 2. Basic Country Detection
    let countryCode = null;
    if (cleaned.startsWith("+")) {
      // Extract country code (1-3 digits)
      const match = cleaned.match(/^\+(\d{1,3})/);
      if (match) {
        countryCode = match[1];
      }
    }

    results.checks.country = {
      countryCode,
      detected: countryCode !== null,
    };

    // 3. Number Type Detection (Basic)
    // This is a simplified check - real implementation would use a phone validation API
    const numberLength = cleaned.replace(/^\+/, "").length;
    let lineType = "Unknown";
    
    if (numberLength >= 10 && numberLength <= 15) {
      // Most mobile numbers are 10-11 digits
      if (numberLength === 10 || numberLength === 11) {
        lineType = "Mobile/Landline";
      } else {
        lineType = "Possible VOIP";
      }
    }

    results.checks.lineType = {
      type: lineType,
      length: numberLength,
    };

    // 4. Risk Assessment (Basic)
    let riskScore = 50; // Neutral

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /^\+1(555|800|900)/, // Test numbers, toll-free, premium
      /(\d)\1{6,}/, // Repeated digits
    ];

    let isSuspicious = false;
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(cleaned)) {
        isSuspicious = true;
        riskScore -= 20;
        break;
      }
    }

    if (lineType === "Possible VOIP") {
      riskScore -= 10;
      results.recommendations.push("This may be a VOIP number - verify carefully");
    }

    // Determine risk level
    if (riskScore >= 60) {
      results.riskLevel = "Safe";
    } else if (riskScore >= 40) {
      results.riskLevel = "Suspicious";
    } else {
      results.riskLevel = "High Risk";
    }

    // Additional recommendations
    if (isSuspicious) {
      results.recommendations.push("Phone number shows suspicious patterns");
    }
    if (!countryCode) {
      results.recommendations.push("Use international format (+country code) for better validation");
    }

    return res.status(200).json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Phone validator error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

