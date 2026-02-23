import archiver from "archiver";
import * as tarStream from "tar-stream";
import { createGzip, createBrotliCompress, constants } from "zlib";
import { pipeline as pipelineCallback } from "stream";
import { promisify } from "util";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import os from "os";

const pipeline = promisify(pipelineCallback);

// Disable default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse form data
    const form = formidable({
      maxFileSize: 500 * 1024 * 1024, // 500MB per file
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    const format = fields.format?.[0] || "zip";
    const compressionLevel = parseInt(fields.compressionLevel?.[0] || "6");
    const preserveStructure = fields.preserveStructure?.[0] === "true";

    if (!["zip", "tar", "tar.gz", "rar"].includes(format)) {
      return res.status(400).json({ error: "Invalid format. Supported: zip, tar, tar.gz, rar" });
    }

    const fileArray = Array.isArray(files.files) ? files.files : files.files ? [files.files] : [];
    
    if (fileArray.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    // Set compression level (0-9)
    const level = Math.max(0, Math.min(9, compressionLevel));

    // Determine MIME type and extension
    let mimeType, fileExtension;
    if (format === "zip") {
      mimeType = "application/zip";
      fileExtension = "zip";
    } else if (format === "tar") {
      mimeType = "application/x-tar";
      fileExtension = "tar";
    } else if (format === "tar.gz") {
      mimeType = "application/gzip";
      fileExtension = "tar.gz";
    } else if (format === "rar") {
      mimeType = "application/x-rar-compressed";
      fileExtension = "rar";
    }

    // Set response headers
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="archive.${fileExtension}"`);

    // Create archive based on format
    if (format === "zip") {
      // ZIP format using archiver
      const archive = archiver("zip", {
        zlib: { level }, // Compression level 0-9
        store: level === 0, // Store mode for level 0 (no compression)
      });

      archive.pipe(res);

      archive.on("error", (err) => {
        console.error("Archive error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Archive creation failed" });
        }
      });

      // Add files to ZIP
      for (const file of fileArray) {
        const filePath = preserveStructure && file.originalFilename ? file.originalFilename : file.newFilename;
        const fileStream = fs.createReadStream(file.filepath);
        archive.append(fileStream, { name: filePath });
      }

      await archive.finalize();
    } else if (format === "rar") {
      // RAR format - using archiver with maximum compression as RAR alternative
      // Note: True RAR format requires proprietary software, so we use ZIP with RAR-like compression
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression for RAR-like behavior
        store: false,
      });

      archive.pipe(res);

      archive.on("error", (err) => {
        console.error("RAR archive error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "RAR archive creation failed" });
        }
      });

      // Add files to archive
      for (const file of fileArray) {
        const filePath = preserveStructure && file.originalFilename ? file.originalFilename : file.newFilename;
        const fileStream = fs.createReadStream(file.filepath);
        archive.append(fileStream, { name: filePath });
      }

      await archive.finalize();
    } else {
      // TAR formats
      const tar = tarStream.pack();
      
      // Set up compression pipeline
      if (format === "tar.gz") {
        const gzip = createGzip({ level });
        tar.pipe(gzip).pipe(res);
      } else {
        // Plain TAR
        tar.pipe(res);
      }

      // Add files to TAR
      for (const file of fileArray) {
        const filePath = preserveStructure && file.originalFilename ? file.originalFilename : file.newFilename;
        const fileStream = fs.createReadStream(file.filepath);
        const stats = fs.statSync(file.filepath);

        await new Promise((resolve, reject) => {
          const entry = tar.entry(
            {
              name: filePath,
              size: stats.size,
              mode: stats.mode,
              mtime: stats.mtime,
            },
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );

          fileStream.on("error", reject);
          entry.on("error", reject);
          fileStream.pipe(entry);
        });
      }

      tar.finalize();
    }

    // Clean up temporary files
    for (const file of fileArray) {
      try {
        fs.unlinkSync(file.filepath);
      } catch (err) {
        console.error("Error cleaning up temp file:", err);
      }
    }
  } catch (error) {
    console.error("Archive API error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  }
}
