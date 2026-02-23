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
      // File to ZIP features
      fileToZip: {
        highCompression: {
          type: Boolean,
          default: true, // Free by default (compression level 9)
        },
        preserveStructure: {
          type: Boolean,
          default: true, // Free by default
        },
        advancedOptions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // PDF Unlock/Protect features
      pdfUnlockProtect: {
        unlock: {
          type: Boolean,
          default: true, // Free by default
        },
        protect: {
          type: Boolean,
          default: true, // Free by default
        },
        changePassword: {
          type: Boolean,
          default: true, // Free by default
        },
        ownerPassword: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
        advancedPermissions: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Password Generator features
      passwordGenerator: {
        customLength: {
          type: Boolean,
          default: true, // Free by default
        },
        characterTypes: {
          type: Boolean,
          default: true, // Free by default
        },
        securityOptions: {
          type: Boolean,
          default: true, // Free by default
        },
      },
      // Password Strength Checker features
      passwordStrengthChecker: {
        basicCheck: {
          type: Boolean,
          default: true, // Free by default
        },
        detailedAnalysis: {
          type: Boolean,
          default: true, // Free by default
        },
        crackTimeEstimate: {
          type: Boolean,
          default: true, // Free by default
        },
      },
      // IP Address Lookup features
      ipLookup: {
        basicInfo: {
          type: Boolean,
          default: true, // Free by default
        },
        detailedInfo: {
          type: Boolean,
          default: true, // Free by default
        },
        myIpLookup: {
          type: Boolean,
          default: true, // Free by default
        },
      },
      // Whois Checker features
      whoisChecker: {
        basicInfo: {
          type: Boolean,
          default: true, // Free by default
        },
        detailedInfo: {
          type: Boolean,
          default: true, // Free by default
        },
        rawData: {
          type: Boolean,
          default: true, // Free by default
        },
      },
      // Metadata Remover features
      metadataRemover: {
        exifRemoval: {
          type: Boolean,
          default: true, // Free by default
        },
        gpsRemoval: {
          type: Boolean,
          default: true, // Free by default
        },
        batchRemoval: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Fake Email Generator features
      fakeEmailGenerator: {
        basicGeneration: {
          type: Boolean,
          default: true, // Free by default
        },
        customDomain: {
          type: Boolean,
          default: true, // Free by default
        },
        emailHistory: {
          type: Boolean,
          default: true, // Free by default
        },
      },
      // Website Security Score features
      websiteSecurityScore: {
        basicCheck: {
          type: Boolean,
          default: true, // Free by default
        },
        sslAnalysis: {
          type: Boolean,
          default: true, // Free by default
        },
        securityHeaders: {
          type: Boolean,
          default: true, // Free by default
        },
        blacklistCheck: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Email Reputation Checker features
      emailReputationChecker: {
        basicCheck: {
          type: Boolean,
          default: true, // Free by default
        },
        domainAnalysis: {
          type: Boolean,
          default: true, // Free by default
        },
        breachCheck: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Phone Validator features
      phoneValidator: {
        formatValidation: {
          type: Boolean,
          default: true, // Free by default
        },
        carrierInfo: {
          type: Boolean,
          default: true, // Free by default
        },
        spamCheck: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // Data Breach Checker features
      dataBreachChecker: {
        emailCheck: {
          type: Boolean,
          default: true, // Free by default
        },
        domainCheck: {
          type: Boolean,
          default: true, // Free by default
        },
        detailedReport: {
          type: Boolean,
          default: false, // Requires sign-in by default
        },
      },
      // API Status Checker features
      apiStatusChecker: {
        connectivityCheck: {
          type: Boolean,
          default: true, // Free by default
        },
        securityAnalysis: {
          type: Boolean,
          default: true, // Free by default
        },
        performanceMetrics: {
          type: Boolean,
          default: true, // Free by default
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

