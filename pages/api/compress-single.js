import Busboy from "busboy";
import convert from "heic-convert";
import sharp from "sharp";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let fileBuffer = null;
  let compressionType = "percentage";
  let compressionValue = 80;
  let pixelWidth = 1920;
  let pixelHeight = 1080;

  const busboy = Busboy({ headers: req.headers });

  return new Promise((resolve) => {
    busboy.on("file", (name, file) => {
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("field", (name, value) => {
      if (name === "compressionType") compressionType = value;
      if (name === "compressionValue") compressionValue = parseFloat(value);
      if (name === "pixelWidth") pixelWidth = parseInt(value);
      if (name === "pixelHeight") pixelHeight = parseInt(value);
    });

    busboy.on("finish", async () => {
      try {
        if (!fileBuffer) {
          res.status(400).json({ error: "No file received" });
          return resolve();
        }

        // Check file size
        // Local development: 20MB limit
        // Vercel: 4.5MB limit (Vercel's hard limit)
        const isVercel = process.env.VERCEL === '1';
        const maxSize = isVercel ? 4.5 * 1024 * 1024 : 20 * 1024 * 1024; // 4.5MB on Vercel, 20MB locally
        if (fileBuffer.length > maxSize) {
          res.status(413).json({ 
            error: `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB. Your file is ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB.` 
          });
          return resolve();
        }

        // Detect if it's HEIC and convert to PNG first
        let inputBuffer;
        
        // Try to use Sharp first (works for JPG, PNG, WebP)
        try {
          const testMetadata = await sharp(fileBuffer).metadata();
          // If Sharp can read it, use directly
          inputBuffer = fileBuffer;
        } catch (sharpError) {
          // If Sharp can't read it, try HEIC conversion
          try {
            inputBuffer = await convert({
              buffer: fileBuffer,
              format: "PNG",
            });
          } catch (heicError) {
            console.error("Format detection error:", { sharpError: sharpError.message, heicError: heicError.message });
            res.status(400).json({ 
              error: "Unsupported image format. Please use HEIC, JPG, PNG, or WebP.",
              details: process.env.NODE_ENV === 'development' ? `Sharp error: ${sharpError.message}, HEIC error: ${heicError.message}` : undefined
            });
            return resolve();
          }
        }

        let sharpInstance = sharp(inputBuffer);
        const metadata = await sharpInstance.metadata();

        // Apply compression based on type
        if (compressionType === "percentage") {
          // Resize by percentage
          const newWidth = Math.round(metadata.width * (compressionValue / 100));
          const newHeight = Math.round(metadata.height * (compressionValue / 100));
          sharpInstance = sharpInstance.resize(newWidth, newHeight, {
            fit: "inside",
            withoutEnlargement: true,
          });
        } else if (compressionType === "ratio") {
          // Resize by ratio (compressionValue is the ratio, e.g., 0.5 for 50%)
          const newWidth = Math.round(metadata.width * compressionValue);
          const newHeight = Math.round(metadata.height * compressionValue);
          sharpInstance = sharpInstance.resize(newWidth, newHeight, {
            fit: "inside",
            withoutEnlargement: true,
          });
        } else if (compressionType === "pixel") {
          // Resize to specific pixel dimensions
          sharpInstance = sharpInstance.resize(pixelWidth, pixelHeight, {
            fit: "inside",
            withoutEnlargement: true,
          });
        }

        // Determine output format based on input
        let outputBuffer;
        const format = metadata.format;

        if (format === "jpeg" || format === "jpg") {
          outputBuffer = await sharpInstance.jpeg({ quality: 85 }).toBuffer();
        } else if (format === "png") {
          outputBuffer = await sharpInstance.png({ compressionLevel: 9 }).toBuffer();
        } else if (format === "webp") {
          outputBuffer = await sharpInstance.webp({ quality: 85 }).toBuffer();
        } else {
          // Default to JPEG
          outputBuffer = await sharpInstance.jpeg({ quality: 85 }).toBuffer();
        }

        // Set extension for frontend
        let ext = "jpg";
        if (format === "png") ext = "png";
        else if (format === "webp") ext = "webp";
        else ext = "jpg";

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("X-Output-Extension", ext);
        res.send(outputBuffer);

        resolve();
      } catch (err) {
        console.error("Compression error:", err);
        console.error("Error details:", {
          message: err.message,
          stack: err.stack,
          name: err.name,
        });
        res.status(500).json({ 
          error: "Compression failed",
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
        resolve();
      }
    });

    req.pipe(busboy);
  });
}

