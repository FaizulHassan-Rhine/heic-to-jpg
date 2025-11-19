import formidable from "formidable";
import fs from "fs/promises";
import sharp from "sharp";
import JSZip from "jszip";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const form = new formidable.IncomingForm({ multiples: true, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload error" });

    const inputFiles = Array.isArray(files.files) ? files.files : [files.files];
    const zip = new JSZip();

    for (const file of inputFiles) {
      const buffer = await fs.readFile(file.filepath);
      const output = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
      const filename = file.originalFilename.replace(/\.(heic|HEIC)$/, ".jpg");

      zip.file(filename, output);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=converted.zip");
    res.send(zipBuffer);
  });
}
