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

      // Store file limit updates to apply AFTER migration (if migration happens, it reloads settings)
      const fileLimitUpdates = {};

      // Collect file limit field updates
      if (imageMaxSize !== undefined && imageMaxSize !== null) {
        fileLimitUpdates.imageMaxSize = Number(imageMaxSize);
      }
      if (imageMaxFiles !== undefined && imageMaxFiles !== null) {
        fileLimitUpdates.imageMaxFiles = Number(imageMaxFiles);
      }
      if (documentMaxSize !== undefined && documentMaxSize !== null) {
        fileLimitUpdates.documentMaxSize = Number(documentMaxSize);
      }
      if (documentMaxFiles !== undefined && documentMaxFiles !== null) {
        fileLimitUpdates.documentMaxFiles = Number(documentMaxFiles);
      }
      if (pdfMaxSize !== undefined && pdfMaxSize !== null) {
        fileLimitUpdates.pdfMaxSize = Number(pdfMaxSize);
      }
      if (pdfMaxFiles !== undefined && pdfMaxFiles !== null) {
        fileLimitUpdates.pdfMaxFiles = Number(pdfMaxFiles);
      }
      if (videoMaxSize !== undefined && videoMaxSize !== null) {
        fileLimitUpdates.videoMaxSize = Number(videoMaxSize);
      }
      if (videoMaxFiles !== undefined && videoMaxFiles !== null) {
        fileLimitUpdates.videoMaxFiles = Number(videoMaxFiles);
      }
      if (audioMaxSize !== undefined && audioMaxSize !== null) {
        fileLimitUpdates.audioMaxSize = Number(audioMaxSize);
      }
      if (audioMaxFiles !== undefined && audioMaxFiles !== null) {
        fileLimitUpdates.audioMaxFiles = Number(audioMaxFiles);
      }
      if (generalMaxSize !== undefined && generalMaxSize !== null) {
        fileLimitUpdates.generalMaxSize = Number(generalMaxSize);
      }
      if (generalMaxFiles !== undefined && generalMaxFiles !== null) {
        fileLimitUpdates.generalMaxFiles = Number(generalMaxFiles);
      }

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
          
          // IMPORTANT: Re-apply file limit updates after migration reload
          // Migration reloads settings from DB, which resets any changes we made
          Object.keys(fileLimitUpdates).forEach(key => {
            settings[key] = fileLimitUpdates[key];
            settings.markModified(key);
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

      // Apply file limit updates (if migration didn't happen, apply them now)
      // If migration happened, they were already applied above
      if (Object.keys(fileLimitUpdates).length > 0 && !features) {
        Object.keys(fileLimitUpdates).forEach(key => {
          const oldValue = settings[key];
          settings[key] = fileLimitUpdates[key];
          settings.markModified(key);
          if (key === 'imageMaxSize') {
            console.log(`Updating ${key}: ${oldValue} bytes (${oldValue / (1024 * 1024)} MB) -> ${fileLimitUpdates[key]} bytes (${fileLimitUpdates[key] / (1024 * 1024)} MB)`);
          }
        });
      } else if (Object.keys(fileLimitUpdates).length > 0 && features) {
        // If features were updated, file limits were already applied after migration
        // Just log the imageMaxSize update
        if (fileLimitUpdates.imageMaxSize) {
          console.log(`Updating imageMaxSize: ${settings.imageMaxSize} bytes (${settings.imageMaxSize / (1024 * 1024)} MB) -> ${fileLimitUpdates.imageMaxSize} bytes (${fileLimitUpdates.imageMaxSize / (1024 * 1024)} MB)`);
        }
      }

      await settings.save();
      console.log("Settings saved. imageMaxSize in DB:", settings.imageMaxSize, "bytes =", settings.imageMaxSize / (1024 * 1024), "MB");

      // Convert Mongoose document to plain object for JSON serialization
      const settingsObj = settings.toObject ? settings.toObject() : JSON.parse(JSON.stringify(settings));
      console.log("Returning settings. imageMaxSize:", settingsObj.imageMaxSize, "bytes =", settingsObj.imageMaxSize / (1024 * 1024), "MB");
      
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

