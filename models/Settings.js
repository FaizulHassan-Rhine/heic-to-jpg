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
        webPreset: {
          type: Boolean,
          default: true, // Free by default
        },
        printPreset: {
          type: Boolean,
          default: true, // Free by default
        },
        socialPreset: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        jpgFormat: {
          type: Boolean,
          default: true, // Free by default
        },
        pngFormat: {
          type: Boolean,
          default: true, // Free by default
        },
        webpFormat: {
          type: Boolean,
          default: true, // Free by default
        },
        qualitySlider: {
          type: Boolean,
          default: true, // Free by default
        },
        preserveTransparency: {
          type: Boolean,
          default: true, // Free by default
        },
        advancedOptions: {
          resize: {
            type: Boolean,
            default: false, // Requires sign-in by default
          },
          preserveMetadata: {
            type: Boolean,
            default: false, // Requires sign-in by default
          },
          watermark: {
            type: Boolean,
            default: false, // Requires sign-in by default
          },
          customNames: {
            type: Boolean,
            default: false, // Requires sign-in by default
          },
          showPreview: {
            type: Boolean,
            default: false, // Requires sign-in by default
          },
        },
      },
      // Image Compress features
      imageCompress: {
        resizeMode: {
          type: Boolean,
          default: true, // Free by default
        },
        compressionPreset: {
          type: Boolean,
          default: true, // Free by default
        },
        qualitySlider: {
          type: Boolean,
          default: true, // Free by default
        },
        targetFileSize: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        convertFormat: {
          type: Boolean,
          default: true, // Free by default
        },
        jpgFormat: {
          type: Boolean,
          default: true, // Free by default
        },
        pngFormat: {
          type: Boolean,
          default: true, // Free by default
        },
        webpFormat: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        smartCrop: {
          type: Boolean,
          default: true, // Free by default
        },
        advancedOptions: {
          progressiveJpeg: {
            type: Boolean,
            default: false, // Requires sign-in by default
          },
          optimizePalette: {
            type: Boolean,
            default: false, // Requires sign-in by default
          },
          stripMetadata: {
            type: Boolean,
            default: false, // Requires sign-in by default
          },
          losslessCompression: {
            type: Boolean,
            default: false, // Requires sign-in by default
          },
        },
      },
      // Video Convert features
      videoConvert: {
        mp4Format: {
          type: Boolean,
          default: true, // Free by default
        },
        webmFormat: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        aviFormat: {
          type: Boolean,
          default: true, // Free by default
        },
      },
      // Video Compress features
      videoCompress: {
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Document to PDF features
      docToPdf: {
        batchConversion: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // PDF to Document features
      pdfToDoc: {
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Audio Convert features
      audioConvert: {
        highQuality: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // QR & Barcode features
      qrBarcode: {
        customDesign: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        batchGeneration: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Speech to Text features
      speechToText: {
        longAudio: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Image to PDF features
      imageToPdf: {
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Extract Text (OCR) features
      extractText: {
        proOCR: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        languageSelection: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        exportFormat: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Video Trim features
      videoTrim: {
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Merge PDF features
      mergePdf: {
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Compress PDF features
      compressPdf: {
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Document Scanner features
      scanner: {
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Text to Speech features
      textToSpeech: {
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // URL Shortener features
      urlShortener: {
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
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

