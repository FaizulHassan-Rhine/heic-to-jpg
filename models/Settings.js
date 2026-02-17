import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    // Image file limits
    imageMaxSize: {
      type: Number,
      default: 20 * 1024 * 1024, // 20MB in bytes
    },
    imageMaxFiles: {
      type: Number,
      default: 50, // Users can upload 50 images at once
    },
    
    // Document file limits
    documentMaxSize: {
      type: Number,
      default: 20 * 1024 * 1024, // 20MB in bytes
    },
    documentMaxFiles: {
      type: Number,
      default: 10,
    },
    
    // PDF file limits
    pdfMaxSize: {
      type: Number,
      default: 20 * 1024 * 1024, // 20MB in bytes
    },
    pdfMaxFiles: {
      type: Number,
      default: 10,
    },
    
    // Video file limits
    videoMaxSize: {
      type: Number,
      default: 100 * 1024 * 1024, // 100MB in bytes
    },
    videoMaxFiles: {
      type: Number,
      default: 5,
    },
    
    // Audio file limits
    audioMaxSize: {
      type: Number,
      default: 50 * 1024 * 1024, // 50MB in bytes
    },
    audioMaxFiles: {
      type: Number,
      default: 10,
    },
    
    // General file limits
    generalMaxSize: {
      type: Number,
      default: 20 * 1024 * 1024, // 20MB in bytes
    },
    generalMaxFiles: {
      type: Number,
      default: 10,
    },
    
    // Feature Flags - Control which features require sign-in
    // true = free, false = requires sign-in
    features: {
      // Image Converter features
      imageConverter: {
        socialPreset: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Image Compress features
      imageCompress: {
        webpFormat: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        targetFileSize: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Video Convert features
      videoConvert: {
        webmFormat: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Add more tools/features as needed
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
SettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

if (process.env.NODE_ENV === 'development' && mongoose.models.Settings) {
  delete mongoose.models.Settings;
}

export default mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

