import Busboy from "busboy";
import mammoth from "mammoth";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let fileBuffer = null;
  let fileName = "";
  let fileType = "";

  const busboy = Busboy({ headers: req.headers });

  return new Promise((resolve) => {
    busboy.on("file", (fieldname, file, info) => {
      fileName = info.filename || "";
      fileType = info.mimeType || "";
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("finish", async () => {
      try {
        if (!fileBuffer) {
          res.status(400).json({ error: "No file uploaded" });
          return resolve();
        }

        const ext = fileName.toLowerCase().split(".").pop();

        if (ext === "txt" || ext === "text") {
          // Plain text file
          const text = fileBuffer.toString("utf-8");
          const html = `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(text)}</div>`;
          res.status(200).json({ html, text, type: "txt" });
          return resolve();
        }

        if (ext === "docx" || ext === "doc") {
          // DOCX file - use mammoth
          const result = await mammoth.convertToHtml({ buffer: fileBuffer });
          const html = result.value;
          const messages = result.messages;

          // Also get plain text
          const textResult = await mammoth.extractRawText({ buffer: fileBuffer });
          const text = textResult.value;

          res.status(200).json({
            html: wrapHtml(html),
            text,
            type: "docx",
            messages: messages.map((m) => m.message),
          });
          return resolve();
        }

        res.status(400).json({ error: "Unsupported file type. Please upload .txt or .docx files." });
        return resolve();
      } catch (error) {
        console.error("Document parse error:", error);
        res.status(500).json({ error: "Failed to parse document: " + error.message });
        return resolve();
      }
    });

    req.pipe(busboy);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function wrapHtml(html) {
  return `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #333; max-width: 100%;">
    <style>
      .docx-content h1 { font-size: 24pt; font-weight: bold; margin: 16px 0 8px 0; }
      .docx-content h2 { font-size: 20pt; font-weight: bold; margin: 14px 0 6px 0; }
      .docx-content h3 { font-size: 16pt; font-weight: bold; margin: 12px 0 4px 0; }
      .docx-content p { margin: 8px 0; }
      .docx-content ul, .docx-content ol { margin: 8px 0; padding-left: 24px; }
      .docx-content li { margin: 4px 0; }
      .docx-content table { border-collapse: collapse; width: 100%; margin: 12px 0; }
      .docx-content td, .docx-content th { border: 1px solid #ccc; padding: 8px; text-align: left; }
      .docx-content th { background-color: #f5f5f5; font-weight: bold; }
      .docx-content strong { font-weight: bold; }
      .docx-content em { font-style: italic; }
    </style>
    <div class="docx-content">${html}</div>
  </div>`;
}

