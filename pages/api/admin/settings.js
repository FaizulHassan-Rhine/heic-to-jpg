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
      // Get settings - use lean() to get plain object directly
      let settings = await Settings.findOne().lean();
      if (!settings) {
        // Create default settings if none exist
        const newSettings = new Settings({});
        await newSettings.save();
        settings = newSettings.toObject ? newSettings.toObject() : newSettings;
      }
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

      console.log("Received settings update:", {
        imageMaxSize,
        imageMaxFiles,
        documentMaxSize,
        documentMaxFiles,
        pdfMaxSize,
        pdfMaxFiles,
      });

      // Get or create settings
      let settings = await Settings.findOne();
      if (!settings) {
        settings = new Settings({});
      }
      // Migration uses findOneAndUpdate({ _id }) — document must be persisted first
      if (!settings._id) {
        await settings.save();
      }

      // Store file limit updates to apply AFTER migration (if migration happens, it reloads settings)
      const fileLimitUpdates = {};

      const safeNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      // Collect file limit field updates
      if (imageMaxSize !== undefined && imageMaxSize !== null) {
        const n = safeNum(imageMaxSize);
        if (n !== null) fileLimitUpdates.imageMaxSize = n;
      }
      if (imageMaxFiles !== undefined && imageMaxFiles !== null) {
        const n = safeNum(imageMaxFiles);
        if (n !== null) fileLimitUpdates.imageMaxFiles = Math.round(n);
      }
      if (documentMaxSize !== undefined && documentMaxSize !== null) {
        const n = safeNum(documentMaxSize);
        if (n !== null) fileLimitUpdates.documentMaxSize = n;
      }
      if (documentMaxFiles !== undefined && documentMaxFiles !== null) {
        const n = safeNum(documentMaxFiles);
        if (n !== null) fileLimitUpdates.documentMaxFiles = Math.round(n);
      }
      if (pdfMaxSize !== undefined && pdfMaxSize !== null) {
        const n = safeNum(pdfMaxSize);
        if (n !== null) fileLimitUpdates.pdfMaxSize = n;
      }
      if (pdfMaxFiles !== undefined && pdfMaxFiles !== null) {
        const n = safeNum(pdfMaxFiles);
        if (n !== null) fileLimitUpdates.pdfMaxFiles = Math.round(n);
      }
      if (videoMaxSize !== undefined && videoMaxSize !== null) {
        const n = safeNum(videoMaxSize);
        if (n !== null) fileLimitUpdates.videoMaxSize = n;
      }
      if (videoMaxFiles !== undefined && videoMaxFiles !== null) {
        const n = safeNum(videoMaxFiles);
        if (n !== null) fileLimitUpdates.videoMaxFiles = Math.round(n);
      }
      if (audioMaxSize !== undefined && audioMaxSize !== null) {
        const n = safeNum(audioMaxSize);
        if (n !== null) fileLimitUpdates.audioMaxSize = n;
      }
      if (audioMaxFiles !== undefined && audioMaxFiles !== null) {
        const n = safeNum(audioMaxFiles);
        if (n !== null) fileLimitUpdates.audioMaxFiles = Math.round(n);
      }
      if (generalMaxSize !== undefined && generalMaxSize !== null) {
        const n = safeNum(generalMaxSize);
        if (n !== null) fileLimitUpdates.generalMaxSize = n;
      }
      if (generalMaxFiles !== undefined && generalMaxFiles !== null) {
        const n = safeNum(generalMaxFiles);
        if (n !== null) fileLimitUpdates.generalMaxFiles = Math.round(n);
      }

      // Update feature flags if provided - Deep merge all features dynamically
      if (features !== undefined && features !== null) {
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
          
          // IMPORTANT: Re-apply file limit updates after migration reload
          // Migration reloads settings from DB, which resets any changes we made
          Object.keys(fileLimitUpdates).forEach(key => {
            settings[key] = fileLimitUpdates[key];
            settings.markModified(key);
          });
        }
        
        // Deep merge function for nested objects
        const isPlainObject = (val) => {
          if (val === null || typeof val !== "object" || Array.isArray(val)) return false;
          const proto = Object.getPrototypeOf(val);
          return proto === Object.prototype || proto === null;
        };
        const deepMerge = (target, source) => {
          if (!source || typeof source !== "object") return;
          for (const key in source) {
            if (source[key] !== undefined && source[key] !== null) {
              // If source value is a plain object, recursively merge
              if (isPlainObject(source[key])) {
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

      // Always apply file/batch limits with $set so nested features edits
      // cannot leave document/pdf/video/audio/general limits unsaved.
      if (Object.keys(fileLimitUpdates).length > 0) {
        Object.keys(fileLimitUpdates).forEach((key) => {
          settings[key] = fileLimitUpdates[key];
          settings.markModified(key);
        });
        console.log(
          "Applying file limits:",
          Object.fromEntries(
            Object.entries(fileLimitUpdates).map(([k, v]) => [
              k,
              k.includes("Size") ? `${v} bytes (${v / (1024 * 1024)} MB)` : v,
            ])
          )
        );
      }

      await settings.save();

      // Belt-and-suspenders: force-persist limits via $set in case document.save
      // skipped any top-level path while merging features.
      if (Object.keys(fileLimitUpdates).length > 0) {
        settings = await Settings.findOneAndUpdate(
          { _id: settings._id },
          { $set: fileLimitUpdates },
          { new: true }
        );
      }

      console.log("Settings saved. imageMaxSize in DB:", settings.imageMaxSize, "bytes =", settings.imageMaxSize / (1024 * 1024), "MB");
      console.log("document/pdf/video/audio/general sizes (MB):", {
        document: settings.documentMaxSize / (1024 * 1024),
        pdf: settings.pdfMaxSize / (1024 * 1024),
        video: settings.videoMaxSize / (1024 * 1024),
        audio: settings.audioMaxSize / (1024 * 1024),
        general: settings.generalMaxSize / (1024 * 1024),
      });

      // Convert Mongoose document to plain object for JSON serialization
      const settingsObj = settings.toObject ? settings.toObject() : JSON.parse(JSON.stringify(settings));
      
      return res.status(200).json({ success: true, settings: settingsObj });
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

