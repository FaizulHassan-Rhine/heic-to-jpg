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

        // Detect if it's HEIC and convert to PNG first
        let inputBuffer;
        try {
          // Try to convert as HEIC first
          inputBuffer = await convert({
            buffer: fileBuffer,
            format: "PNG",
          });
        } catch (err) {
          // If not HEIC, use directly
          inputBuffer = fileBuffer;
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
        res.status(500).json({ error: "Compression failed" });
        resolve();
      }
    });

    req.pipe(busboy);
  });
}

