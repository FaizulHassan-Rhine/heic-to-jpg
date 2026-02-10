import Busboy from "busboy";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let fileBuffer = null;
  let format = "wav";
  let inputType = "mp3";

  const busboy = Busboy({ headers: req.headers });

  return new Promise((resolve) => {
    busboy.on("file", (fieldname, file) => {
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("field", (fieldname, value) => {
      if (fieldname === "format") format = value;
      if (fieldname === "inputType") inputType = value;
    });

    busboy.on("finish", async () => {
      try {
        if (!fileBuffer) {
          return res.status(400).json({ error: "No file received" });
        }

        // File size limit: 50MB
        const maxSize = 50 * 1024 * 1024;
        if (fileBuffer.length > maxSize) {
          return res.status(413).json({ 
            error: `File size limit exceeded. Maximum 50MB allowed.` 
          });
        }

        // Return the file - conversion happens in browser with ffmpeg.wasm
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("X-Output-Extension", format);
        res.setHeader("Cache-Control", "no-cache");
        res.send(fileBuffer);

        resolve();
      } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Processing failed" });
        resolve();
      }
    });

    req.pipe(busboy);
  });
}
