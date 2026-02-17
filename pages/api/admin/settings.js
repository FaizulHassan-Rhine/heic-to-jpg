import connectDB from "../../../lib/mongodb";
import Settings from "../../../models/Settings";
import { parse } from "cookie";

export default async function handler(req, res) {
  // Check admin authentication
  const cookies = parse(req.headers.cookie || "");
  const adminAuth = cookies.adminAuth;
  if (adminAuth !== "true") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await connectDB();

    if (req.method === "GET") {
      // Get settings
      const settings = await Settings.getSettings();
      return res.status(200).json({ success: true, settings });
    } else if (req.method === "PUT") {
      // Update settings
      const {
        imageMaxSize,
        imageMaxFiles,
        documentMaxSize,
        documentMaxFiles,
        pdfMaxSize,
        pdfMaxFiles,
        videoMaxSize,
        videoMaxFiles,
        audioMaxSize,
        audioMaxFiles,
        generalMaxSize,
        generalMaxFiles,
        features, // Feature flags object
      } = req.body;

      // Get or create settings
      let settings = await Settings.findOne();
      if (!settings) {
        settings = new Settings({});
      }

      // Update file limit fields if provided
      if (imageMaxSize !== undefined) settings.imageMaxSize = imageMaxSize;
      if (imageMaxFiles !== undefined) settings.imageMaxFiles = imageMaxFiles;
      if (documentMaxSize !== undefined) settings.documentMaxSize = documentMaxSize;
      if (documentMaxFiles !== undefined) settings.documentMaxFiles = documentMaxFiles;
      if (pdfMaxSize !== undefined) settings.pdfMaxSize = pdfMaxSize;
      if (pdfMaxFiles !== undefined) settings.pdfMaxFiles = pdfMaxFiles;
      if (videoMaxSize !== undefined) settings.videoMaxSize = videoMaxSize;
      if (videoMaxFiles !== undefined) settings.videoMaxFiles = videoMaxFiles;
      if (audioMaxSize !== undefined) settings.audioMaxSize = audioMaxSize;
      if (audioMaxFiles !== undefined) settings.audioMaxFiles = audioMaxFiles;
      if (generalMaxSize !== undefined) settings.generalMaxSize = generalMaxSize;
      if (generalMaxFiles !== undefined) settings.generalMaxFiles = generalMaxFiles;

      // Update feature flags if provided
      if (features !== undefined) {
        if (!settings.features) {
          settings.features = {};
        }
        // Merge feature flags (deep merge for nested objects)
        if (features.imageConverter) {
          if (!settings.features.imageConverter) {
            settings.features.imageConverter = {};
          }
          if (features.imageConverter.socialPreset !== undefined) {
            settings.features.imageConverter.socialPreset = features.imageConverter.socialPreset;
          }
          if (features.imageConverter.advancedOptions !== undefined) {
            settings.features.imageConverter.advancedOptions = features.imageConverter.advancedOptions;
          }
        }
        if (features.imageCompress) {
          if (!settings.features.imageCompress) {
            settings.features.imageCompress = {};
          }
          if (features.imageCompress.webpFormat !== undefined) {
            settings.features.imageCompress.webpFormat = features.imageCompress.webpFormat;
          }
          if (features.imageCompress.targetFileSize !== undefined) {
            settings.features.imageCompress.targetFileSize = features.imageCompress.targetFileSize;
          }
          if (features.imageCompress.advancedOptions !== undefined) {
            settings.features.imageCompress.advancedOptions = features.imageCompress.advancedOptions;
          }
        }
        if (features.videoConvert) {
          if (!settings.features.videoConvert) {
            settings.features.videoConvert = {};
          }
          if (features.videoConvert.webmFormat !== undefined) {
            settings.features.videoConvert.webmFormat = features.videoConvert.webmFormat;
          }
        }
      }

      await settings.save();

      return res.status(200).json({ success: true, settings });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Settings API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

