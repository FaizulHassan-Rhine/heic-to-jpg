export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({ error: "Domain name is required" });
    }

    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: "Invalid domain name" });
    }

    // Try multiple free Whois/RDAP APIs with fallbacks
    const apis = [
      // API 1: RDAP via rdap.org (official ICANN protocol, free, no API key)
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(`https://rdap.org/domain/${domain}`, {
            signal: controller.signal,
            headers: { Accept: "application/rdap+json, application/json" },
          });
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error(`RDAP HTTP ${response.status}`);
          const data = await response.json();

          // Parse RDAP response
          const nameServers = [];
          if (data.nameservers && Array.isArray(data.nameservers)) {
            data.nameservers.forEach((ns) => {
              if (ns.ldhName) nameServers.push(ns.ldhName);
            });
          }

          const statusList = Array.isArray(data.status) ? data.status : [];

          // Extract dates from events
          let createdDate = null;
          let expiryDate = null;
          let updatedDate = null;
          if (data.events && Array.isArray(data.events)) {
            data.events.forEach((event) => {
              if (event.eventAction === "registration") {
                createdDate = event.eventDate;
              } else if (event.eventAction === "expiration") {
                expiryDate = event.eventDate;
              } else if (event.eventAction === "last changed" || event.eventAction === "last update of RDAP database") {
                if (!updatedDate) updatedDate = event.eventDate;
              }
            });
          }

          // Extract registrar from entities
          let registrar = null;
          if (data.entities && Array.isArray(data.entities)) {
            for (const entity of data.entities) {
              if (entity.roles && entity.roles.includes("registrar")) {
                if (entity.vcardArray && entity.vcardArray[1]) {
                  const fnEntry = entity.vcardArray[1].find(
                    (v) => v[0] === "fn"
                  );
                  if (fnEntry) registrar = fnEntry[3];
                }
                if (!registrar && entity.publicIds) {
                  registrar = entity.publicIds
                    .map((p) => `${p.type}: ${p.identifier}`)
                    .join(", ");
                }
                if (!registrar) {
                  registrar = entity.handle || null;
                }
              }
            }
          }

          // Format dates nicely
          const formatDate = (dateStr) => {
            if (!dateStr) return null;
            try {
              return new Date(dateStr).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            } catch {
              return dateStr;
            }
          };

          return {
            domain: data.ldhName || domain,
            registrar,
            createdDate: formatDate(createdDate),
            expiryDate: formatDate(expiryDate),
            updatedDate: formatDate(updatedDate),
            nameServers,
            status: statusList,
            raw: JSON.stringify(data, null, 2),
            source: "RDAP (Official ICANN Protocol)",
          };
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      },

      // API 2: who-dat.as93.net (free Whois API, no key required)
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(
            `https://who-dat.as93.net/${domain}`,
            {
              signal: controller.signal,
              headers: { Accept: "application/json" },
            }
          );
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error(`who-dat HTTP ${response.status}`);
          const data = await response.json();

          const formatDate = (dateStr) => {
            if (!dateStr) return null;
            try {
              return new Date(dateStr).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            } catch {
              return dateStr;
            }
          };

          return {
            domain: data.domain_name || data.domain || domain,
            registrar: data.registrar || null,
            createdDate: formatDate(data.creation_date || data.created),
            expiryDate: formatDate(
              data.expiration_date ||
                data.registry_expiry_date ||
                data.expires
            ),
            updatedDate: formatDate(data.updated_date || data.updated),
            nameServers: Array.isArray(data.name_servers)
              ? data.name_servers
              : [],
            status: Array.isArray(data.status)
              ? data.status
              : data.status
              ? [data.status]
              : [],
            raw: typeof data.raw === "string" ? data.raw : JSON.stringify(data, null, 2),
            source: "who-dat WHOIS API",
          };
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      },

      // API 3: DNS fallback - at least confirms domain exists and shows basic info
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
          // DNS resolution via Google DNS-over-HTTPS
          const [aResponse, nsResponse] = await Promise.all([
            fetch(`https://dns.google/resolve?name=${domain}&type=A`, {
              signal: controller.signal,
            }),
            fetch(`https://dns.google/resolve?name=${domain}&type=NS`, {
              signal: controller.signal,
            }),
          ]);
          clearTimeout(timeoutId);

          if (!aResponse.ok) throw new Error("DNS lookup failed");
          const aData = await aResponse.json();
          const nsData = nsResponse.ok ? await nsResponse.json() : null;

          if (
            (!aData.Answer || aData.Answer.length === 0) &&
            (!nsData?.Answer || nsData.Answer.length === 0)
          ) {
            throw new Error("Domain not found in DNS");
          }

          const nameServers = nsData?.Answer
            ? nsData.Answer.filter((r) => r.type === 2).map((r) =>
                r.data.replace(/\.$/, "")
              )
            : [];

          const ipAddresses = aData.Answer
            ? aData.Answer.filter((r) => r.type === 1).map((r) => r.data)
            : [];

          return {
            domain,
            registrar: null,
            createdDate: null,
            expiryDate: null,
            updatedDate: null,
            nameServers,
            status: ["active"],
            raw: [
              `Domain: ${domain}`,
              `Status: Active (DNS resolved)`,
              ipAddresses.length
                ? `IP Addresses: ${ipAddresses.join(", ")}`
                : null,
              nameServers.length
                ? `Name Servers: ${nameServers.join(", ")}`
                : null,
              ``,
              `Note: Full Whois registration data is currently unavailable.`,
              `Only basic DNS information is shown. Try again later for full Whois data.`,
            ]
              .filter(Boolean)
              .join("\n"),
            source: "Google DNS (Limited Info)",
          };
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      },
    ];

    // Try each API in sequence
    const errors = [];
    for (let i = 0; i < apis.length; i++) {
      try {
        const result = await apis[i]();
        return res.status(200).json(result);
      } catch (error) {
        console.log(
          `Whois API ${i + 1} attempt failed:`,
          error.message
        );
        errors.push(error.message);
        continue;
      }
    }

    // If all APIs fail, return a helpful error
    return res.status(500).json({
      error:
        "Failed to lookup domain information. All lookup services are currently unavailable. Please try again later.",
      details:
        process.env.NODE_ENV === "development"
          ? `Errors: ${errors.join(" | ")}`
          : undefined,
    });
  } catch (error) {
    console.error("Whois checker error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}
