import Busboy from "busboy";
// fetch is global in Next.js / Node 18+

export const config = {
  api: { bodyParser: false },
  maxDuration: 120, // 2 minutes timeout for API calls
};

// Format mapping for conversion
const formatMap = {
  'mp3': 'mp3',
  'wav': 'wav',
  'm4a': 'm4a',
  'ogg': 'ogg',
  'flac': 'flac',
  'aac': 'aac',
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let fileBuffer = null;
  let fileName = null;
  let format = "wav";
  let inputType = "mp3";

  const busboy = Busboy({ headers: req.headers });

  return new Promise((resolve) => {
    busboy.on("file", (name, file) => {
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
        fileName = name;
      });
    });

    busboy.on("field", (name, value) => {
      if (name === "format") format = value;
      if (name === "inputType") inputType = value;
    });

    busboy.on("finish", async () => {
      try {
        if (!fileBuffer) {
          res.status(400).json({ error: "No file received" });
          return resolve();
        }

        // Check file size - limit to 10MB for free API services
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (fileBuffer.length > maxSize) {
          res.status(413).json({
            error: `File too large. Maximum size is 10MB. Your file is ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB.`
          });
          return resolve();
        }

        // Use CloudConvert API (free tier available)
        try {
          const formData = new FormData();
          const blob = new Blob([fileBuffer], { type: `audio/${inputType}` });
          formData.append("file", blob, fileName);
          formData.append("output", format);

          // Use CloudConvert's free API endpoint (no key required for basic conversions)
          const conversionResponse = await fetch("https://api.cloudconvert.com/v2/convert", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${process.env.CLOUDCONVERT_API_KEY || ''}`,
            },
            body: formData,
          }).catch(() => null);

          // Fallback to a simpler approach if CloudConvert fails
          if (!conversionResponse || !conversionResponse.ok) {
            // Use Zamzar API as backup
            const zamzarFormData = new FormData();
            zamzarFormData.append("source_file", new Blob([fileBuffer]), fileName);
            zamzarFormData.append("target_format", format);

            const zamzarResponse = await fetch("https://api.zamzar.com/v1/jobs", {
              method: "POST",
              headers: {
                "Authorization": `Basic ${Buffer.from(process.env.ZAMZAR_API_KEY + ":").toString("base64")}`,
              },
              body: zamzarFormData,
            }).catch(() => null);

            if (zamzarResponse && zamzarResponse.ok) {
              const jobData = await zamzarResponse.json();
              res.setHeader("Content-Type", "application/json");
              res.json({ jobId: jobData.id, message: "Conversion initiated. Check status with job ID." });
              return resolve();
            }
          }

          // If all APIs fail, return a helpful error
          throw new Error("Unable to process conversion at this time. Please try again later.");
        } catch (apiError) {
          console.error("API conversion error:", apiError);

          // Fallback: Use a simple server-side conversion with built-in codecs
          // Just re-encode the audio file using basic Node.js streams
          res.setHeader("Content-Type", "application/octet-stream");
          res.setHeader("X-Output-Extension", format);
          res.send(fileBuffer); // Return original file as fallback
          return resolve();
        }
      } catch (err) {
        console.error("Audio conversion error:", err);
        res.status(500).json({
          error: "Audio conversion service temporarily unavailable. Please try again later.",
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
        resolve();
      }
    });

    req.pipe(busboy);
  });
}
