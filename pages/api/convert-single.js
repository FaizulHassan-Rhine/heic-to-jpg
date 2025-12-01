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
  let format = "jpg-high"; // default

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
      if (name === "format") format = value;
      if (name === "inputType") inputType = value;
    });

    busboy.on("finish", async () => {
      try {
        if (!fileBuffer) {
          res.status(400).json({ error: "No file received" });
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

        // STEP 2 — Convert to output format
        if (format === "jpg-high") {
          outputBuffer = await sharp(inputBuffer)
            .flatten({ background: "#fff" })
            .jpeg({ quality: 95 })
            .toBuffer();
        } else if (format === "jpg-balanced") {
          outputBuffer = await sharp(inputBuffer)
            .flatten({ background: "#fff" })
            .jpeg({ quality: 80 })
            .toBuffer();
        } else if (format === "webp-high") {
          outputBuffer = await sharp(inputBuffer)
            .flatten({ background: "#fff" })
            .webp({ quality: 90 })
            .toBuffer();
        } else if (format === "webp-balanced") {
          outputBuffer = await sharp(inputBuffer)
            .flatten({ background: "#fff" })
            .webp({ quality: 80 })
            .toBuffer();
        } else if (format === "png") {
          // PNG output (lossless)
          outputBuffer = await sharp(inputBuffer)
            .png()
            .toBuffer();
        } else {
          res.status(400).json({ error: "Unsupported output format" });
          return resolve();
        }

        // Set extension for frontend
        let ext = "jpg";
        if (format.includes("webp")) ext = "webp";
        else if (format === "png") ext = "png";
        else if (format.includes("jpg")) ext = "jpg";

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("X-Output-Extension", ext);
        res.send(outputBuffer);

        resolve();
      } catch (err) {
        console.error("Conversion error:", err);
        res.status(500).json({ error: "Conversion failed" });
        resolve();
      }
    });

    req.pipe(busboy);
  });
}
