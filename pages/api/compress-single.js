import Busboy from "busboy";
import convert from "heic-convert";
import sharp from "sharp";

export const config = {
  api: { bodyParser: false },
};

/** Hardcoded limits — no MongoDB required for processing */
const DEFAULT_IMAGE_MAX_SIZE = 20 * 1024 * 1024; // 20MB
const VERCEL_MAX_SIZE = 4.5 * 1024 * 1024;

function getMaxUploadSize() {
  const isVercel = process.env.VERCEL === "1";
  return isVercel ? Math.min(VERCEL_MAX_SIZE, DEFAULT_IMAGE_MAX_SIZE) : DEFAULT_IMAGE_MAX_SIZE;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let fileBuffer = null;
  let compressionType = "percentage";
  let compressionValue = 80;
  let pixelWidth = 1920;
  let pixelHeight = 1080;
  let quality = 85;
  let progressiveJpeg = false;
  let optimizePalette = true;
  let stripMetadata = false;
  let losslessCompression = false;
  let targetFileSize = "";
  let convertFormat = false;
  let targetFormat = "jpg";
  let smartCrop = false;

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
      if (name === "quality") quality = parseInt(value) || 85;
      if (name === "progressiveJpeg") progressiveJpeg = value === "true";
      if (name === "optimizePalette") optimizePalette = value === "true";
      if (name === "stripMetadata") stripMetadata = value === "true";
      if (name === "losslessCompression") losslessCompression = value === "true";
      if (name === "targetFileSize") targetFileSize = value;
      if (name === "convertFormat") convertFormat = value === "true";
      if (name === "targetFormat") targetFormat = value;
      if (name === "smartCrop") smartCrop = value === "true";
    });

    busboy.on("finish", async () => {
      try {
        if (!fileBuffer) {
          res.status(400).json({ error: "No file received" });
          return resolve();
        }

        // Check file size (hardcoded limits — no MongoDB)
        const maxSize = getMaxUploadSize();
        
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
        let metadata = await sharpInstance.metadata();

        // Apply smart crop (auto-remove whitespace) - do this first
        if (smartCrop) {
          try {
            // Use Sharp's trim() to auto-remove whitespace
            const trimmedResult = await sharpInstance.trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
            // Update sharpInstance and metadata if trim was successful
            if (trimmedResult.info.width < metadata.width || trimmedResult.info.height < metadata.height) {
              sharpInstance = sharp(trimmedResult.data);
              // Get fresh metadata after trim
              metadata = await sharpInstance.metadata();
            }
          } catch (trimError) {
            // If trim fails, continue without smart crop
            console.log("Smart crop (trim) not available, continuing without it:", trimError.message);
          }
        }

        // Apply compression based on type
        // Default to percentage if compressionType is not set
        if (!compressionType || compressionType === "percentage") {
          // Resize by percentage
          const compressionPercent = compressionValue || 80; // Default to 80%
          const newWidth = Math.round(metadata.width * (compressionPercent / 100));
          const newHeight = Math.round(metadata.height * (compressionPercent / 100));
          if (newWidth > 0 && newHeight > 0 && (newWidth < metadata.width || newHeight < metadata.height)) {
            sharpInstance = sharpInstance.resize(newWidth, newHeight, {
              fit: "inside",
              withoutEnlargement: true,
            });
          }
        } else if (compressionType === "ratio") {
          // Resize by ratio (compressionValue is sent as 0-100, so divide by 100)
          const ratio = (compressionValue || 80) / 100;
          const newWidth = Math.round(metadata.width * ratio);
          const newHeight = Math.round(metadata.height * ratio);
          if (newWidth > 0 && newHeight > 0 && (newWidth < metadata.width || newHeight < metadata.height)) {
            sharpInstance = sharpInstance.resize(newWidth, newHeight, {
              fit: "inside",
              withoutEnlargement: true,
            });
          }
        } else if (compressionType === "pixel") {
          // Resize to specific pixel dimensions
          const targetW = pixelWidth || metadata.width;
          const targetH = pixelHeight || metadata.height;
          if (targetW > 0 && targetH > 0 && (targetW < metadata.width || targetH < metadata.height)) {
            sharpInstance = sharpInstance.resize(targetW, targetH, {
              fit: "inside",
              withoutEnlargement: true,
            });
          }
        }

        // Determine output format
        let outputFormat = metadata.format;
        if (convertFormat) {
          outputFormat = targetFormat === "jpg" ? "jpeg" : targetFormat;
        }

        // Initialize outputBuffer
        let outputBuffer = null;

        // Handle target file size if specified
        if (targetFileSize && targetFileSize.trim() !== "") {
          try {
            // Parse target size (e.g., "500KB" or "2MB")
            const sizeStr = targetFileSize.trim().toUpperCase();
            let targetBytes = 0;
            if (sizeStr.endsWith("KB")) {
              targetBytes = parseFloat(sizeStr) * 1024;
            } else if (sizeStr.endsWith("MB")) {
              targetBytes = parseFloat(sizeStr) * 1024 * 1024;
            } else {
              targetBytes = parseFloat(sizeStr) * 1024; // Default to KB
            }

            if (targetBytes > 0) {
              // Binary search for quality that achieves target size
              let minQuality = 1;
              let maxQuality = 100;
              let bestQuality = quality;
              let bestBuffer = null;

              for (let i = 0; i < 10; i++) { // Max 10 iterations
                const testQuality = Math.round((minQuality + maxQuality) / 2);
                let testBuffer;
                
                try {
                  if (outputFormat === "jpeg" || outputFormat === "jpg") {
                    testBuffer = await sharpInstance.clone()
                      .flatten({ background: "#fff" })
                      .jpeg({ quality: testQuality, progressive: progressiveJpeg })
                      .toBuffer();
                  } else if (outputFormat === "png") {
                    if (losslessCompression) {
                      testBuffer = await sharpInstance.clone()
                        .png({ compressionLevel: 9, palette: optimizePalette })
                        .toBuffer();
                    } else {
                      testBuffer = await sharpInstance.clone()
                        .flatten({ background: "#fff" })
                        .jpeg({ quality: testQuality })
                        .toBuffer();
                    }
                  } else if (outputFormat === "webp") {
                    testBuffer = await sharpInstance.clone()
                      .flatten({ background: "#fff" })
                      .webp({ quality: testQuality })
                      .toBuffer();
                  } else {
                    testBuffer = await sharpInstance.clone()
                      .flatten({ background: "#fff" })
                      .jpeg({ quality: testQuality })
                      .toBuffer();
                  }

                  if (testBuffer.length <= targetBytes) {
                    bestQuality = testQuality;
                    bestBuffer = testBuffer;
                    minQuality = testQuality;
                  } else {
                    maxQuality = testQuality;
                  }

                  if (Math.abs(testBuffer.length - targetBytes) < targetBytes * 0.05) {
                    break; // Within 5% of target
                  }
                } catch (testError) {
                  console.error("Target size test error:", testError);
                  break; // Break on error
                }
              }

              if (bestBuffer) {
                outputBuffer = bestBuffer;
              } else {
                // Fall back to regular compression
                quality = bestQuality;
              }
            }
          } catch (targetSizeError) {
            console.error("Target file size parsing error:", targetSizeError);
            // Continue with regular compression
          }
        }

        // Regular compression if target size not achieved or not specified
        // Ensure outputBuffer is always set
        if (!outputBuffer) {
          try {
            if (outputFormat === "jpeg" || outputFormat === "jpg") {
              const jpegOptions = { quality: quality };
              if (progressiveJpeg) jpegOptions.progressive = true;
              if (stripMetadata) jpegOptions.force = true;
              outputBuffer = await sharpInstance
                .flatten({ background: "#fff" })
                .jpeg(jpegOptions)
                .toBuffer();
            } else if (outputFormat === "png") {
              // Compress as PNG - use high compression level and optional palette optimization
              const pngOptions = {
                compressionLevel: 9,
                adaptiveFiltering: true,
              };
              if (optimizePalette) {
                pngOptions.palette = true;
              }
              if (losslessCompression) {
                outputBuffer = await sharpInstance
                  .png(pngOptions)
                  .toBuffer();
              } else {
                // Lossy PNG: reduce colors with palette quantization
                pngOptions.colours = Math.max(2, Math.round(256 * (quality / 100)));
                pngOptions.palette = true;
                outputBuffer = await sharpInstance
                  .png(pngOptions)
                  .toBuffer();
              }
            } else if (outputFormat === "webp") {
              outputBuffer = await sharpInstance
                .flatten({ background: "#fff" })
                .webp({ quality: quality })
                .toBuffer();
            } else {
              // Default to JPEG
              outputBuffer = await sharpInstance
                .flatten({ background: "#fff" })
                .jpeg({ quality: quality })
                .toBuffer();
            }
          } catch (compressionError) {
            console.error("Compression error:", compressionError);
            res.status(500).json({ 
              error: "Compression failed",
              details: process.env.NODE_ENV === 'development' ? compressionError.message : undefined
            });
            return resolve();
          }
        }

        // Final check - ensure outputBuffer exists
        if (!outputBuffer || outputBuffer.length === 0) {
          res.status(500).json({ 
            error: "Compression failed",
            details: "No output buffer generated"
          });
          return resolve();
        }

        // Metadata stripping - Sharp preserves metadata by default
        // To strip, we would need to use a different approach, but for now we'll preserve it
        // The stripMetadata flag is passed but Sharp's default behavior preserves metadata

        // Set extension for frontend based on output format
        let ext = "jpg";
        if (outputFormat === "png") ext = "png";
        else if (outputFormat === "webp") ext = "webp";
        else ext = "jpg";

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("X-Output-Extension", ext);
        res.setHeader("Access-Control-Expose-Headers", "X-Output-Extension");
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

