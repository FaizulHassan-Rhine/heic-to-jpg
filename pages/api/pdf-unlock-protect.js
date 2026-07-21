import Busboy from "busboy";
import { PDFDocument } from "pdf-lib";
import { encryptPDF } from "../../lib/pdf-encrypt";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let fileBuffer = null;
  let fileName = "document.pdf";
  let mode = "unlock";
  let currentPassword = "";
  let newPassword = "";
  let ownerPassword = "";
  let permissions = {};

  const busboy = Busboy({ headers: req.headers });

  return new Promise((resolve) => {
    busboy.on("file", (name, file, info) => {
      const { filename } = info;
      if (filename) fileName = filename;
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("field", (name, value) => {
      if (name === "mode") mode = value;
      if (name === "currentPassword") currentPassword = value;
      if (name === "newPassword") newPassword = value;
      if (name === "ownerPassword") ownerPassword = value;
      if (name === "permissions") {
        try {
          permissions = JSON.parse(value);
        } catch (e) {
          permissions = {};
        }
      }
    });

    busboy.on("finish", async () => {
      try {
        if (!fileBuffer) {
          res.status(400).json({ error: "No file uploaded" });
          return resolve();
        }

        // Load PDF with pdf-lib
        let pdfDoc;
        if (mode === "unlock" || mode === "change") {
          try {
            pdfDoc = await PDFDocument.load(fileBuffer, {
              ignoreEncryption: true,
              password: currentPassword || undefined,
            });
          } catch (error) {
            // Try loading with ignoreEncryption for password-protected PDFs
            try {
              pdfDoc = await PDFDocument.load(fileBuffer, {
                ignoreEncryption: true,
              });
            } catch (innerError) {
              if (
                innerError.message?.includes("password") ||
                innerError.message?.includes("encrypted")
              ) {
                res
                  .status(400)
                  .json({ error: "Incorrect password or unsupported encryption" });
                return resolve();
              }
              throw innerError;
            }
          }
        } else {
          try {
            pdfDoc = await PDFDocument.load(fileBuffer, {
              ignoreEncryption: true,
            });
          } catch (error) {
            res.status(400).json({
              error: "Failed to load PDF. The file may be corrupted.",
            });
            return resolve();
          }
        }

        // Create a new clean PDF by copying all pages
        const newPdf = await PDFDocument.create();
        const pages = await newPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach((page) => newPdf.addPage(page));

        // Save the PDF without encryption first (clean copy)
        // useObjectStreams: false ensures traditional xref table for our encryptor
        const unencryptedBytes = await newPdf.save({
          useObjectStreams: false,
        });

        let pdfBytes;
        const suffix =
          mode === "unlock"
            ? "_unlocked"
            : mode === "protect"
            ? "_protected"
            : "_changed";

        if (mode === "protect" || mode === "change") {
          // Encrypt using pure JavaScript implementation
          try {
            const userPwd = newPassword || "";
            const ownerPwd = ownerPassword || newPassword || "";

            pdfBytes = encryptPDF(Buffer.from(unencryptedBytes), {
              userPassword: userPwd,
              ownerPassword: ownerPwd,
              permissions: {
                printing:
                  permissions.printing && permissions.printing !== "none",
                modifying: !!permissions.modifying,
                copying: !!permissions.copying,
                annotating: !!permissions.annotating,
                fillingForms: !!permissions.fillingForms,
                contentAccessibility: !!permissions.contentAccessibility,
                assembling: !!permissions.assembling,
              },
            });
          } catch (encryptError) {
            console.error("PDF encryption error:", encryptError);
            res.status(500).json({
              error: "Failed to encrypt PDF",
              details:
                process.env.NODE_ENV === "development"
                  ? encryptError.message
                  : undefined,
            });
            return resolve();
          }
        } else {
          // Unlock mode - save without encryption
          pdfBytes = Buffer.from(unencryptedBytes);
        }

        // Set response headers
        res.setHeader("Content-Type", "application/pdf");
        const outputName = fileName.replace(/\.pdf$/i, "") + suffix + ".pdf";
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${outputName}"`
        );

        // Send PDF
        res.status(200).send(pdfBytes);
      } catch (error) {
        console.error("PDF unlock/protect error:", error);
        if (!res.headersSent) {
          res.status(500).json({
            error: "Internal server error",
            details:
              process.env.NODE_ENV === "development"
                ? error.message
                : undefined,
          });
        }
      }
      resolve();
    });

    req.pipe(busboy);
  });
}
