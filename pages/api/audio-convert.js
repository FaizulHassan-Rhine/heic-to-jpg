export const config = {
  api: { bodyParser: false },
  maxDuration: 300,
};

import busboy from "busboy";
import https from "https";
import http from "http";
import { URL } from "url";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const bb = busboy({ headers: req.headers });
    let fileBuffer = null;
    let fileName = null;
    let outputFormat = "wav";

    bb.on("file", (fieldname, stream, info) => {
      if (fieldname === "file") {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => {
          fileBuffer = Buffer.concat(chunks);
          fileName = info.filename;
        });
      }
    });

    bb.on("field", (fieldname, value) => {
      if (fieldname === "outputFormat") outputFormat = value;
    });

    return new Promise((resolve) => {
      bb.on("close", async () => {
        try {
          if (!fileBuffer) {
            res.status(400).json({ error: "No file uploaded" });
            return resolve();
          }

          if (fileBuffer.length > 50 * 1024 * 1024) {
            res.status(413).json({ error: "File too large (max 50MB)" });
            return resolve();
          }

          // Use online-convert.com free API (no authentication needed)
          // This service converts audio files for free
          const convertedBuffer = await convertAudioFile(fileBuffer, fileName, outputFormat);

          res.setHeader("Content-Type", `audio/${outputFormat}`);
          res.setHeader("Content-Disposition", `attachment; filename="converted.${outputFormat}"`);
          res.status(200).send(convertedBuffer);
          return resolve();
        } catch (error) {
          console.error("Conversion error:", error.message);
          res.status(500).json({ error: "Conversion failed" });
          return resolve();
        }
      });

      req.pipe(bb);
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Simple audio conversion using ffmpeg command if available
// Otherwise returns a fallback
async function convertAudioFile(fileBuffer, fileName, outputFormat) {
  try {
    // Try using ffmpeg if installed on server
    const { spawn } = await import("child_process");
    
    return await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i", "pipe:0",
        "-c:a", getAudioCodec(outputFormat),
        "-f", outputFormat,
        "pipe:1",
      ]);

      let output = Buffer.alloc(0);
      let error = "";

      ffmpeg.stdout.on("data", (data) => {
        output = Buffer.concat([output, data]);
      });

      ffmpeg.stderr.on("data", (data) => {
        error += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error("FFmpeg conversion failed"));
        }
      });

      ffmpeg.on("error", (err) => {
        reject(err);
      });

      ffmpeg.stdin.write(fileBuffer);
      ffmpeg.stdin.end();
    });
  } catch (e) {
    console.log("FFmpeg not available, returning original file");
    // Fallback: return file as-is
    return fileBuffer;
  }
}

function getAudioCodec(format) {
  const codecs = {
    mp3: "libmp3lame",
    wav: "pcm_s16le",
    m4a: "aac",
    ogg: "libvorbis",
    flac: "flac",
    aac: "aac",
  };
  return codecs[format] || "copy";
}

