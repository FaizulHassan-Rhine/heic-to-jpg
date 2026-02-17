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

      // Update feature flags if provided - Deep merge all features dynamically
      if (features !== undefined) {
        if (!settings.features) {
          settings.features = {};
        }
        
        // Helper function to check if advancedOptions needs migration
        const needsMigration = (toolFeatures) => {
          return toolFeatures && typeof toolFeatures.advancedOptions === 'boolean';
        };
        
        // Check which tools need migration (have boolean advancedOptions)
        const toolsToMigrate = [];
        Object.keys(settings.features || {}).forEach(toolId => {
          if (needsMigration(settings.features[toolId])) {
            toolsToMigrate.push(toolId);
          }
        });
        
        // If we need to migrate, use $unset to remove old boolean fields first
        if (toolsToMigrate.length > 0) {
          const unsetFields = {};
          toolsToMigrate.forEach(toolId => {
            unsetFields[`features.${toolId}.advancedOptions`] = "";
          });
          
          // Use findOneAndUpdate with $unset to remove old boolean fields
          await Settings.findOneAndUpdate(
            { _id: settings._id },
            { $unset: unsetFields },
            { new: true }
          );
          
          // Reload settings after migration
          settings = await Settings.findById(settings._id);
          if (!settings.features) {
            settings.features = {};
          }
          
          // Initialize advancedOptions as objects for migrated tools
          toolsToMigrate.forEach(toolId => {
            if (!settings.features[toolId]) {
              settings.features[toolId] = {};
            }
            settings.features[toolId].advancedOptions = {};
          });
        }
        
        // Deep merge function for nested objects
        const deepMerge = (target, source) => {
          for (const key in source) {
            if (source[key] !== undefined && source[key] !== null) {
              // If source value is an object (and not array/null), recursively merge
              if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key].constructor === Object) {
                // Special handling for advancedOptions - ensure it's an object
                if (key === 'advancedOptions') {
                  // If target has advancedOptions as boolean, convert to object
                  if (typeof target[key] === 'boolean') {
                    target[key] = {};
                  }
                  // If target doesn't have advancedOptions, initialize as object
                  if (!target[key]) {
                    target[key] = {};
                  }
                } else {
                  // For other keys, initialize if needed
                  if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
                    target[key] = {};
                  }
                }
                // Recursively merge
                deepMerge(target[key], source[key]);
              } else {
                // Otherwise, directly assign (for primitives)
                target[key] = source[key];
              }
            }
          }
        };
        
        // Deep merge all features
        deepMerge(settings.features, features);
        
        // Mark features as modified so Mongoose saves nested object changes
        settings.markModified('features');
      }

      await settings.save();

      return res.status(200).json({ success: true, settings });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Settings API error:", error);
    console.error("Error details:", error.message, error.stack);
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

