import connectDB from "../../lib/mongodb";
import Settings from "../../models/Settings";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Disable all caching to ensure fresh settings on live site
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    await connectDB();
    const settings = await Settings.getSettings();
    
    // Return settings in a format that's easy to use on the frontend
    return res.status(200).json({
      success: true,
      settings: {
        image: {
          maxSize: settings.imageMaxSize,
          maxFiles: settings.imageMaxFiles,
        },
        document: {
          maxSize: settings.documentMaxSize,
          maxFiles: settings.documentMaxFiles,
        },
        pdf: {
          maxSize: settings.pdfMaxSize,
          maxFiles: settings.pdfMaxFiles,
        },
        video: {
          maxSize: settings.videoMaxSize,
          maxFiles: settings.videoMaxFiles,
        },
        audio: {
          maxSize: settings.audioMaxSize,
          maxFiles: settings.audioMaxFiles,
        },
        general: {
          maxSize: settings.generalMaxSize,
          maxFiles: settings.generalMaxFiles,
        },
        // Feature flags - true = free, false = requires sign-in
        features: settings.features || {
          imageConverter: {
            socialPreset: false,
            advancedOptions: false,
          },
          imageCompress: {
            webpFormat: false,
            targetFileSize: false,
            advancedOptions: false,
          },
          videoConvert: {
            webmFormat: false,
          },
        },
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

