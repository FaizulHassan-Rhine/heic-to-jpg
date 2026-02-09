import Busboy from "busboy";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let fileBuffer = null;
  let fileName = "";

  const busboy = Busboy({ headers: req.headers });

  return new Promise((resolve) => {
    busboy.on("file", (fieldname, file, info) => {
      fileName = info.filename || "";
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
        if (ext !== "pdf") {
          res.status(400).json({ error: "Only PDF files are supported" });
          return resolve();
        }

        // Use pdfjs-dist for reliable PDF text extraction
        const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

        const data = new Uint8Array(fileBuffer);
        const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
        const pdfDoc = await loadingTask.promise;

        const numPages = pdfDoc.numPages;
        let fullText = "";

        // Extract text from each page
        for (let i = 1; i <= numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => item.str)
            .join(" ");
          fullText += pageText + "\n\n";
        }

        fullText = fullText.trim();

        // Get metadata
        const metadata = await pdfDoc.getMetadata().catch(() => ({}));
        const pdfInfo = metadata?.info || {};

        // Build structured HTML
        const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim());
        let html = `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #333;">`;

        if (pdfInfo.Title) {
          html += `<h1 style="font-size: 20pt; font-weight: bold; margin-bottom: 12px;">${escapeHtml(pdfInfo.Title)}</h1>`;
        }

        for (const para of paragraphs) {
          const trimmed = para.trim();
          if (
            trimmed.length < 100 &&
            trimmed === trimmed.toUpperCase() &&
            trimmed.length > 2
          ) {
            html += `<h2 style="font-size: 14pt; font-weight: bold; margin: 16px 0 8px 0;">${escapeHtml(trimmed)}</h2>`;
          } else {
            html += `<p style="margin: 8px 0;">${escapeHtml(trimmed).replace(/\n/g, "<br/>")}</p>`;
          }
        }

        html += `</div>`;

        pdfDoc.destroy();

        res.status(200).json({
          text: fullText,
          html,
          numPages,
          title: pdfInfo.Title || "",
          author: pdfInfo.Author || "",
        });
        return resolve();
      } catch (error) {
        console.error("PDF parse error:", error);
        res
          .status(500)
          .json({ error: "Failed to parse PDF: " + error.message });
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
