import Busboy from "busboy";
import convert from "heic-convert";
import sharp from "sharp";
import connectDB from "../../lib/mongodb";
import Settings from "../../models/Settings";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let fileBuffer = null;
  let format = "jpg";
  let quality = 85;
  let preserveMetadata = false;
  let rotation = 0;
  let resizeEnabled = false;
  let resizeWidth = 1920;
  let resizeHeight = 1080;
  let resizeMode = "fit";
  let preserveTransparency = true;
  let progressiveJpeg = false;
  let watermarkEnabled = false;
  let watermarkText = "";
  let watermarkPosition = "bottom-right";

  const busboy = Busboy({ headers: req.headers });

  return new Promise((resolve) => {
    busboy.on("file", (name, file) => {
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    let inputType = "heic";

    busboy.on("field", (name, value) => {
      if (name === "format") format = value.toLowerCase().trim();
      if (name === "inputType") inputType = value;
      if (name === "quality") quality = parseInt(value) || 85;
      if (name === "preserveMetadata") preserveMetadata = value === "true";
      if (name === "rotation") rotation = parseInt(value) || 0;
      if (name === "resizeEnabled") resizeEnabled = value === "true";
      if (name === "resizeWidth") resizeWidth = parseInt(value) || 1920;
      if (name === "resizeHeight") resizeHeight = parseInt(value) || 1080;
      if (name === "resizeMode") resizeMode = value;
      if (name === "preserveTransparency") preserveTransparency = value === "true";
      if (name === "progressiveJpeg") progressiveJpeg = value === "true";
      if (name === "watermarkEnabled") watermarkEnabled = value === "true";
      if (name === "watermarkText") watermarkText = value;
      if (name === "watermarkPosition") watermarkPosition = value;
    });

    busboy.on("finish", async () => {
      try {
        if (!fileBuffer) {
          res.status(400).json({ error: "No file received" });
          return resolve();
        }


        // Check file size using dynamic settings from MongoDB
        await connectDB();
        const settings = await Settings.getSettings();
        
        // Get max size directly from database - no fallbacks
        if (!settings || !settings.imageMaxSize) {
          res.status(500).json({ error: "Upload limits not configured in database. Please contact administrator." });
          return resolve();
        }
        
        // Use Vercel's hard limit as absolute max, but prefer database setting
        const isVercel = process.env.VERCEL === '1';
        const vercelMaxSize = 4.5 * 1024 * 1024; // 4.5MB Vercel limit
        const dbMaxSize = settings.imageMaxSize; // From database
        const maxSize = isVercel ? Math.min(vercelMaxSize, dbMaxSize) : dbMaxSize;
        
        if (fileBuffer.length > maxSize) {
          res.status(413).json({ 
            error: `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB. Your file is ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB.` 
          });
          return resolve();
        }

        let inputBuffer;
        let outputBuffer;

        // STEP 1 — Convert input to a format Sharp can handle
        if (inputType === "heic") {
          // HEIC → PNG first
          inputBuffer = await convert({
            buffer: fileBuffer,
            format: "PNG",
          });
        } else if (inputType === "jpg" || inputType === "png" || inputType === "webp") {
          // JPG, PNG, and WebP can be used directly with Sharp
          inputBuffer = fileBuffer;
        } else {
          res.status(400).json({ error: "Unsupported input format" });
          return resolve();
        }

        // STEP 2 — Build Sharp pipeline
        let sharpInstance = sharp(inputBuffer);

        // Apply rotation
        if (rotation !== 0) {
          sharpInstance = sharpInstance.rotate(rotation);
        }

        // Apply resize if enabled
        if (resizeEnabled) {
          if (resizeMode === "fit") {
            sharpInstance = sharpInstance.resize(resizeWidth, resizeHeight, {
              fit: 'inside',
              withoutEnlargement: true
            });
          } else if (resizeMode === "fill") {
            sharpInstance = sharpInstance.resize(resizeWidth, resizeHeight, {
              fit: 'cover',
              position: 'center'
            });
          } else if (resizeMode === "exact") {
            sharpInstance = sharpInstance.resize(resizeWidth, resizeHeight, {
              fit: 'fill'
            });
          }
        }

        // Apply watermark if enabled
        if (watermarkEnabled && watermarkText) {
          const metadata = await sharpInstance.metadata();
          const width = metadata.width;
          const height = metadata.height;
          
          // Calculate watermark position
          let x = 0;
          let y = 0;
          const fontSize = Math.min(width, height) / 20; // Responsive font size
          const padding = Math.min(width, height) / 50;
          
          if (watermarkPosition.includes("right")) {
            x = width - (watermarkText.length * fontSize * 0.6) - padding;
          } else if (watermarkPosition.includes("left")) {
            x = padding;
          } else {
            x = (width - (watermarkText.length * fontSize * 0.6)) / 2;
          }
          
          if (watermarkPosition.includes("bottom")) {
            y = height - padding;
          } else if (watermarkPosition.includes("top")) {
            y = padding + fontSize;
          } else {
            y = height / 2;
          }
          
          // Create SVG watermark
          const svgWatermark = `
            <svg width="${width}" height="${height}">
              <text
                x="${x}"
                y="${y}"
                font-family="Arial, sans-serif"
                font-size="${fontSize}"
                fill="rgba(0,0,0,0.3)"
                font-weight="bold"
              >${watermarkText}</text>
            </svg>
          `;
          
          const watermarkBuffer = Buffer.from(svgWatermark);
          sharpInstance = sharpInstance.composite([
            { input: watermarkBuffer, blend: 'over' }
          ]);
        }

        // Metadata handling - Sharp preserves by default, so we only need to handle if we want to strip
        // For now, we'll let Sharp handle it naturally (preserves by default)

        // Convert to output format with options
        if (format === "jpg" || format === "jpeg") {
          const jpegOptions = {
            quality: quality,
            progressive: progressiveJpeg,
            mozjpeg: true
          };
          outputBuffer = await sharpInstance
            .flatten({ background: "#fff" })
            .jpeg(jpegOptions)
            .toBuffer();
        } else if (format === "webp") {
          outputBuffer = await sharpInstance
            .flatten({ background: "#fff" })
            .webp({ quality: quality })
            .toBuffer();
        } else if (format === "png") {
          const pngOptions = {
            compressionLevel: 9,
            adaptiveFiltering: true
          };
          if (preserveTransparency) {
            // Keep alpha channel
            outputBuffer = await sharpInstance
              .png(pngOptions)
              .toBuffer();
          } else {
            // Remove transparency
            outputBuffer = await sharpInstance
              .flatten({ background: "#fff" })
              .png(pngOptions)
              .toBuffer();
          }
        } else {
          res.status(400).json({ error: "Unsupported output format" });
          return resolve();
        }

        // Strip metadata if not preserving
        if (!preserveMetadata && format !== "png") {
          // Metadata is already handled in format conversion above
          // Sharp by default preserves metadata unless explicitly removed
        }

        // Set extension for frontend - format is already normalized
        let ext = "jpg"; // default fallback
        if (format === "webp") {
          ext = "webp";
        } else if (format === "png") {
          ext = "png";
        } else if (format === "jpg" || format === "jpeg") {
          ext = "jpg";
        }

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("X-Output-Extension", ext);
        res.setHeader("Access-Control-Expose-Headers", "X-Output-Extension");
        res.send(outputBuffer);

        resolve();
      } catch (err) {
        console.error("Conversion error:", err);
        console.error("Error details:", {
          message: err.message,
          stack: err.stack,
          name: err.name,
        });
        res.status(500).json({ 
          error: "Conversion failed",
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
        resolve();
      }
    });

    req.pipe(busboy);
  });
}
