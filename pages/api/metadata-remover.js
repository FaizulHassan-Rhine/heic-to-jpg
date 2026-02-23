import sharp from "sharp";
import connectDB from "../../lib/mongodb";
import Order from "../../models/Order";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const Busboy = require("busboy");
  const busboy = Busboy({ headers: req.headers });

  let fileBuffer = null;
  let fileName = "image.jpg";

  return new Promise((resolve) => {
    busboy.on("file", (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      fileName = filename || "image.jpg";
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

        // Remove metadata using sharp - strip all metadata
        const cleanedImage = await sharp(fileBuffer)
          .rotate() // Auto-rotate based on EXIF before stripping
          .withMetadata({}) // Remove all metadata
          .toBuffer();

        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Content-Disposition", `attachment; filename="cleaned_${fileName}"`);
        res.status(200).send(cleanedImage);

        // Track usage
        const firebaseUid = req.headers["x-firebase-uid"];
        if (firebaseUid && firebaseUid !== "anonymous") {
          try {
            await connectDB();
            const order = new Order({
              firebaseUid,
              userEmail: req.headers["x-user-email"] || null,
              isAnonymous: false,
              toolName: "Metadata Remover",
              toolPath: "/metadata-remover",
              toolType: "image",
              fileCount: 1,
              status: "completed",
              files: [
                {
                  inputName: fileName,
                  inputSize: fileBuffer.length,
                  inputFormat: "image",
                  outputName: `cleaned_${fileName}`,
                  outputSize: cleanedImage.length,
                  outputFormat: "image",
                },
              ],
            });
            await order.save();
          } catch (error) {
            console.error("Error tracking usage:", error);
          }
        }
      } catch (error) {
        console.error("Metadata removal error:", error);
        if (!res.headersSent) {
          res.status(500).json({
            error: "Internal server error",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
          });
        }
      }
      resolve();
    });

    req.pipe(busboy);
  });
}

