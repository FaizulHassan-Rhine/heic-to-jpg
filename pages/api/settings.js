import connectDB from "../../lib/mongodb";
import Settings from "../../models/Settings";

/** Used when MongoDB is not configured — tools work fully with these defaults */
const DEFAULT_SETTINGS_RESPONSE = {
  success: true,
  fromDefaults: true,
  settings: {
    image: { maxSize: 20 * 1024 * 1024, maxFiles: 20 },
    document: { maxSize: 20 * 1024 * 1024, maxFiles: 10 },
    pdf: { maxSize: 20 * 1024 * 1024, maxFiles: 10 },
    video: { maxSize: 100 * 1024 * 1024, maxFiles: 5 },
    audio: { maxSize: 50 * 1024 * 1024, maxFiles: 10 },
    general: { maxSize: 20 * 1024 * 1024, maxFiles: 10 },
    features: {
      imageConverter: {
        webPreset: true,
        printPreset: true,
        socialPreset: true,
        jpgFormat: true,
        pngFormat: true,
        webpFormat: true,
        qualitySlider: true,
        preserveTransparency: true,
        advancedOptions: {
          resize: true,
          preserveMetadata: true,
          watermark: true,
          customNames: true,
          showPreview: true,
        },
      },
      imageCompress: {
        resizeMode: true,
        compressionPreset: true,
        qualitySlider: true,
        targetFileSize: true,
        convertFormat: true,
        jpgFormat: true,
        pngFormat: true,
        webpFormat: true,
        smartCrop: true,
        advancedOptions: {
          progressiveJpeg: true,
          optimizePalette: true,
          stripMetadata: true,
          losslessCompression: true,
        },
      },
      imageToPdf: { advancedOptions: true },
      extractText: { proOCR: true, languageSelection: true, exportFormat: true },
      videoConvert: { webmFormat: true },
      videoCompress: { advancedOptions: true },
      videoTrim: { advancedOptions: true },
      docToPdf: { batchConversion: true, advancedOptions: true },
      pdfToDoc: { advancedOptions: true },
      mergePdf: { advancedOptions: true },
      compressPdf: { advancedOptions: true },
      scanner: { advancedOptions: true },
      audioConvert: { highQuality: true, advancedOptions: true },
      textToSpeech: { advancedOptions: true },
      speechToText: { longAudio: true, advancedOptions: true },
      qrBarcode: { customDesign: true, batchGeneration: true },
      urlShortener: { advancedOptions: true },
      phoneValidator: { formatValidation: true },
      apiStatusChecker: {
        connectivityCheck: true,
        securityAnalysis: true,
        performanceMetrics: true,
      },
    },
  },
};

function noCache(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  noCache(res);

  // No MongoDB configured — tools don't need it; return defaults quietly
  if (!process.env.MONGODB_URI) {
    return res.status(200).json(DEFAULT_SETTINGS_RESPONSE);
  }

  try {
    await connectDB();
    const settings = await Settings.getSettings();

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
        features: {
          imageConverter: {
            webPreset: settings.features?.imageConverter?.webPreset ?? true,
            printPreset: settings.features?.imageConverter?.printPreset ?? true,
            socialPreset: settings.features?.imageConverter?.socialPreset ?? false,
            jpgFormat: settings.features?.imageConverter?.jpgFormat ?? true,
            pngFormat: settings.features?.imageConverter?.pngFormat ?? true,
            webpFormat: settings.features?.imageConverter?.webpFormat ?? true,
            qualitySlider: settings.features?.imageConverter?.qualitySlider ?? true,
            preserveTransparency: settings.features?.imageConverter?.preserveTransparency ?? true,
            advancedOptions: {
              resize: settings.features?.imageConverter?.advancedOptions?.resize ?? false,
              preserveMetadata: settings.features?.imageConverter?.advancedOptions?.preserveMetadata ?? false,
              watermark: settings.features?.imageConverter?.advancedOptions?.watermark ?? false,
              customNames: settings.features?.imageConverter?.advancedOptions?.customNames ?? false,
              showPreview: settings.features?.imageConverter?.advancedOptions?.showPreview ?? false,
            },
          },
          imageCompress: {
            resizeMode: settings.features?.imageCompress?.resizeMode ?? true,
            compressionPreset: settings.features?.imageCompress?.compressionPreset ?? true,
            qualitySlider: settings.features?.imageCompress?.qualitySlider ?? true,
            targetFileSize: settings.features?.imageCompress?.targetFileSize ?? false,
            convertFormat: settings.features?.imageCompress?.convertFormat ?? true,
            jpgFormat: settings.features?.imageCompress?.jpgFormat ?? true,
            pngFormat: settings.features?.imageCompress?.pngFormat ?? true,
            webpFormat: settings.features?.imageCompress?.webpFormat ?? false,
            smartCrop: settings.features?.imageCompress?.smartCrop ?? true,
            advancedOptions: {
              progressiveJpeg: settings.features?.imageCompress?.advancedOptions?.progressiveJpeg ?? false,
              optimizePalette: settings.features?.imageCompress?.advancedOptions?.optimizePalette ?? false,
              stripMetadata: settings.features?.imageCompress?.advancedOptions?.stripMetadata ?? false,
              losslessCompression: settings.features?.imageCompress?.advancedOptions?.losslessCompression ?? false,
            },
          },
          imageToPdf: {
            advancedOptions: settings.features?.imageToPdf?.advancedOptions ?? false,
          },
          extractText: {
            proOCR: settings.features?.extractText?.proOCR ?? false,
            languageSelection: settings.features?.extractText?.languageSelection ?? true,
            exportFormat: settings.features?.extractText?.exportFormat ?? true,
          },
          videoConvert: {
            webmFormat: settings.features?.videoConvert?.webmFormat ?? false,
          },
          videoCompress: {
            advancedOptions: settings.features?.videoCompress?.advancedOptions ?? false,
          },
          videoTrim: {
            advancedOptions: settings.features?.videoTrim?.advancedOptions ?? false,
          },
          docToPdf: {
            batchConversion: settings.features?.docToPdf?.batchConversion ?? false,
            advancedOptions: settings.features?.docToPdf?.advancedOptions ?? false,
          },
          pdfToDoc: {
            advancedOptions: settings.features?.pdfToDoc?.advancedOptions ?? false,
          },
          mergePdf: {
            advancedOptions: settings.features?.mergePdf?.advancedOptions ?? false,
          },
          compressPdf: {
            advancedOptions: settings.features?.compressPdf?.advancedOptions ?? false,
          },
          scanner: {
            advancedOptions: settings.features?.scanner?.advancedOptions ?? false,
          },
          audioConvert: {
            highQuality: settings.features?.audioConvert?.highQuality ?? false,
            advancedOptions: settings.features?.audioConvert?.advancedOptions ?? false,
          },
          textToSpeech: {
            advancedOptions: settings.features?.textToSpeech?.advancedOptions ?? false,
          },
          speechToText: {
            longAudio: settings.features?.speechToText?.longAudio ?? false,
            advancedOptions: settings.features?.speechToText?.advancedOptions ?? false,
          },
          qrBarcode: {
            customDesign: settings.features?.qrBarcode?.customDesign ?? false,
            batchGeneration: settings.features?.qrBarcode?.batchGeneration ?? false,
          },
          urlShortener: {
            advancedOptions: settings.features?.urlShortener?.advancedOptions ?? false,
          },
          phoneValidator: {
            formatValidation: settings.features?.phoneValidator?.formatValidation ?? true,
          },
          apiStatusChecker: {
            connectivityCheck: settings.features?.apiStatusChecker?.connectivityCheck ?? true,
            securityAnalysis: settings.features?.apiStatusChecker?.securityAnalysis ?? true,
            performanceMetrics: settings.features?.apiStatusChecker?.performanceMetrics ?? true,
          },
        },
      },
    });
  } catch (error) {
    // DB optional for public tools — fall back quietly
    if (error?.code !== "MONGODB_URI_MISSING" && error?.code !== "MONGODB_CONNECTION_FAILED") {
      console.warn("Settings: using defaults (database unavailable)");
    }
    return res.status(200).json(DEFAULT_SETTINGS_RESPONSE);
  }
}
