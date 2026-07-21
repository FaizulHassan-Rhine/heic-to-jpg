import sharp from "sharp";
import convert from "heic-convert";
import formidable from "formidable";
import fs from "fs/promises";

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

function fieldValue(fields, key, fallback = "") {
  const v = fields[key];
  if (Array.isArray(v)) return v[0] ?? fallback;
  return v ?? fallback;
}

/** Detect image type from file magic bytes */
function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return "unknown";

  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "png";
  }
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  if (buffer.toString("ascii", 0, 3) === "GIF") return "gif";
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return "bmp";
  if (
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    (buffer[2] === 0x01 || buffer[2] === 0x02) &&
    buffer[3] === 0x00
  ) {
    return "ico";
  }
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
    (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
  ) {
    return "tiff";
  }
  if (buffer.toString("ascii", 4, 8) === "ftyp" && buffer.length >= 12) {
    const brands = buffer.toString("ascii", 8, Math.min(buffer.length, 64)).toLowerCase();
    if (brands.includes("avif") || brands.includes("avis")) return "avif";
    if (
      brands.includes("heic") ||
      brands.includes("heif") ||
      brands.includes("mif1") ||
      brands.includes("msf1")
    ) {
      return "heic";
    }
  }

  return "unknown";
}

/**
 * Sharp cannot read many ICO files. Extract the largest embedded PNG
 * (modern ICO) so Sharp can decode it.
 */
function extractPngFromIco(buffer) {
  if (!buffer || buffer.length < 22) return null;
  const type = buffer.readUInt16LE(2);
  const count = buffer.readUInt16LE(4);
  if ((type !== 1 && type !== 2) || count < 1) return null;

  let best = null;
  let bestLen = 0;

  for (let i = 0; i < count; i++) {
    const entryOffset = 6 + i * 16;
    if (entryOffset + 16 > buffer.length) break;
    const imgSize = buffer.readUInt32LE(entryOffset + 8);
    const imgOffset = buffer.readUInt32LE(entryOffset + 12);
    if (imgOffset + imgSize > buffer.length || imgSize < 8) continue;
    const chunk = buffer.subarray(imgOffset, imgOffset + imgSize);
    if (chunk[0] === 0x89 && chunk[1] === 0x50 && chunk[2] === 0x4e && chunk[3] === 0x47) {
      if (imgSize > bestLen) {
        best = Buffer.from(chunk);
        bestLen = imgSize;
      }
    }
  }

  return best;
}

function buildIcoFromPngs(entries) {
  const count = entries.length;
  const headerSize = 6;
  const entrySize = 16;
  const dataOffset = headerSize + entrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  const payloads = [];
  let offset = dataOffset;

  for (const { size, png } of entries) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    payloads.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...payloads]);
}

async function toIcoBuffer(inputBuffer) {
  // Always start from a fresh buffer so the pipeline is never "consumed"
  const sizes = [16, 32, 48];
  const entries = [];
  for (const size of sizes) {
    const png = await sharp(inputBuffer)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    entries.push({ size, png });
  }
  return buildIcoFromPngs(entries);
}

async function loadDecodableBuffer(fileBuffer, clientInputType) {
  const detected = detectImageType(fileBuffer);
  const hinted = String(clientInputType || "").toLowerCase();
  let kind = detected !== "unknown" ? detected : hinted;

  if (kind === "ico" || detected === "ico") {
    const png = extractPngFromIco(fileBuffer);
    if (png) {
      await sharp(png).metadata();
      return png;
    }
    throw new Error(
      "Could not read this ICO file. Use a PNG/JPG source, or an ICO with embedded PNG images."
    );
  }

  if (kind === "heic" || kind === "heif") {
    const png = await convert({ buffer: fileBuffer, format: "PNG" });
    const buf = Buffer.from(png);
    await sharp(buf).metadata();
    return buf;
  }

  try {
    await sharp(fileBuffer, { failOn: "none", page: 0 }).metadata();
    return fileBuffer;
  } catch (sharpErr) {
    try {
      await sharp(fileBuffer, { failOn: "none" }).metadata();
      return fileBuffer;
    } catch {
      /* continue to heic-convert fallback */
    }
    try {
      const png = await convert({ buffer: fileBuffer, format: "PNG" });
      const buf = Buffer.from(png);
      await sharp(buf).metadata();
      return buf;
    } catch {
      const magic = fileBuffer.subarray(0, 12).toString("hex");
      if (detected === "avif") {
        throw new Error(
          "This AVIF cannot be decoded on the server. The app will try browser decode — refresh and retry, or use PNG/JPG."
        );
      }
      throw new Error(
        `Unsupported image format (detected=${detected || "unknown"}, magic=${magic}). ${sharpErr.message}`
      );
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const maxSize = getMaxUploadSize();
  let tempPath = null;

  try {
    const form = formidable({
      maxFileSize: maxSize,
      keepExtensions: true,
      multiples: false,
    });

    const [fields, files] = await form.parse(req);

    const uploaded =
      (Array.isArray(files.file) ? files.file[0] : files.file) ||
      (Array.isArray(files.image) ? files.image[0] : files.image) ||
      null;

    if (!uploaded?.filepath) {
      return res.status(400).json({ error: "No file received" });
    }

    tempPath = uploaded.filepath;
    const fileBuffer = await fs.readFile(tempPath);

    if (!fileBuffer.length) {
      return res.status(400).json({ error: "Uploaded file is empty" });
    }

    const format = String(fieldValue(fields, "format", "jpg")).toLowerCase().trim();
    const quality = parseInt(fieldValue(fields, "quality", "85"), 10) || 85;
    const inputType = fieldValue(fields, "inputType", "");
    const preserveMetadata = fieldValue(fields, "preserveMetadata") === "true";
    const rotation = parseInt(fieldValue(fields, "rotation", "0"), 10) || 0;
    const resizeEnabled = fieldValue(fields, "resizeEnabled") === "true";
    const resizeWidth = parseInt(fieldValue(fields, "resizeWidth", "1920"), 10) || 1920;
    const resizeHeight = parseInt(fieldValue(fields, "resizeHeight", "1080"), 10) || 1080;
    const resizeMode = fieldValue(fields, "resizeMode", "fit");
    const preserveTransparency = fieldValue(fields, "preserveTransparency", "true") !== "false";
    const progressiveJpeg = fieldValue(fields, "progressiveJpeg") === "true";
    const watermarkEnabled = fieldValue(fields, "watermarkEnabled") === "true";
    const watermarkText = fieldValue(fields, "watermarkText", "");
    const watermarkPosition = fieldValue(fields, "watermarkPosition", "bottom-right");

    let inputBuffer;
    try {
      inputBuffer = await loadDecodableBuffer(fileBuffer, inputType);
    } catch (loadErr) {
      return res.status(400).json({ error: loadErr.message || "Unsupported input format" });
    }

    // Normalize to a known-good PNG/JPEG pipeline buffer for transforms
    // (keeps AVIF/ICO/etc. paths reliable after decode)
    let workBuffer = inputBuffer;

    if (rotation !== 0) {
      workBuffer = await sharp(workBuffer).rotate(rotation).toBuffer();
    }

    if (resizeEnabled && format !== "ico") {
      const resizeOpts =
        resizeMode === "fill"
          ? { fit: "cover", position: "center" }
          : resizeMode === "exact"
            ? { fit: "fill" }
            : { fit: "inside", withoutEnlargement: true };
      workBuffer = await sharp(workBuffer)
        .resize(resizeWidth, resizeHeight, resizeOpts)
        .toBuffer();
    }

    if (watermarkEnabled && watermarkText && format !== "ico") {
      const metadata = await sharp(workBuffer).metadata();
      const width = metadata.width || 1;
      const height = metadata.height || 1;
      const fontSize = Math.min(width, height) / 20;
      const padding = Math.min(width, height) / 50;

      let x = 0;
      let y = 0;
      if (watermarkPosition.includes("right")) {
        x = width - watermarkText.length * fontSize * 0.6 - padding;
      } else if (watermarkPosition.includes("left")) {
        x = padding;
      } else {
        x = (width - watermarkText.length * fontSize * 0.6) / 2;
      }
      if (watermarkPosition.includes("bottom")) {
        y = height - padding;
      } else if (watermarkPosition.includes("top")) {
        y = padding + fontSize;
      } else {
        y = height / 2;
      }

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

      workBuffer = await sharp(workBuffer)
        .composite([{ input: Buffer.from(svgWatermark), blend: "over" }])
        .toBuffer();
    }

    // Strip metadata when requested by re-encoding through Sharp without withMetadata()
    void preserveMetadata;

    let outputBuffer;
    let ext = "jpg";

    if (format === "jpg" || format === "jpeg") {
      outputBuffer = await sharp(workBuffer)
        .flatten({ background: "#fff" })
        .jpeg({ quality, progressive: progressiveJpeg, mozjpeg: true })
        .toBuffer();
      ext = "jpg";
    } else if (format === "webp") {
      outputBuffer = await sharp(workBuffer)
        .flatten({ background: "#fff" })
        .webp({ quality })
        .toBuffer();
      ext = "webp";
    } else if (format === "avif") {
      outputBuffer = await sharp(workBuffer).avif({ quality, effort: 4 }).toBuffer();
      ext = "avif";
    } else if (format === "png") {
      const pngOptions = { compressionLevel: 9, adaptiveFiltering: true };
      if (preserveTransparency) {
        outputBuffer = await sharp(workBuffer).png(pngOptions).toBuffer();
      } else {
        outputBuffer = await sharp(workBuffer)
          .flatten({ background: "#fff" })
          .png(pngOptions)
          .toBuffer();
      }
      ext = "png";
    } else if (format === "ico") {
      outputBuffer = await toIcoBuffer(workBuffer);
      ext = "ico";
    } else {
      return res.status(400).json({ error: "Unsupported output format. Use jpg, png, webp, avif, or ico." });
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("X-Output-Extension", ext);
    res.setHeader("Access-Control-Expose-Headers", "X-Output-Extension");
    res.send(outputBuffer);
  } catch (err) {
    console.error("Conversion error:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });

    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB.`,
      });
    }

    const message = /avif|heif|libheif/i.test(err.message || "")
      ? "AVIF conversion failed on this server"
      : /unsupported image format/i.test(err.message || "")
        ? "Unsupported image format. Try JPG, PNG, WebP, AVIF, or HEIC."
        : "Conversion failed";

    return res.status(500).json({
      error: message,
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (tempPath) {
      try {
        await fs.unlink(tempPath);
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}
