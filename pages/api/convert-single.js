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

    busboy.on("field", (name, value) => {
      if (name === "format") format = value;
    });

    busboy.on("finish", async () => {
      try {
        if (!fileBuffer) {
          res.status(400).json({ error: "No file received" });
          return resolve();
        }

        // STEP 1 — HEIC → PNG
        const pngBuffer = await convert({
          buffer: fileBuffer,
          format: "PNG",
        });

        let outputBuffer;

        // STEP 2 — PNG → JPG / WebP based on format

        if (format === "jpg-high") {
          outputBuffer = await sharp(pngBuffer)
            .flatten({ background: "#fff" })
            .jpeg({ quality: 95 })
            .toBuffer();
        }

        else if (format === "jpg-balanced") {
          outputBuffer = await sharp(pngBuffer)
            .flatten({ background: "#fff" })
            .jpeg({ quality: 80 })
            .toBuffer();
        }

        else if (format === "webp-high") {
          outputBuffer = await sharp(pngBuffer)
            .flatten({ background: "#fff" })
            .webp({ quality: 90 })
            .toBuffer();
        }

        else if (format === "webp-balanced") {
          outputBuffer = await sharp(pngBuffer)
            .flatten({ background: "#fff" })
            .webp({ quality: 80 })
            .toBuffer();
        }

        // Set extension for frontend
        const ext = format.includes("jpg") ? "jpg" : "webp";

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
