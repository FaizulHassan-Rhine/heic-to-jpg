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
            languageSelection: settings.features?.extractText?.languageSelection ?? false,
            exportFormat: settings.features?.extractText?.exportFormat ?? false,
          },
          videoConvert: {
            mp4Format: settings.features?.videoConvert?.mp4Format ?? true,
            webmFormat: settings.features?.videoConvert?.webmFormat ?? false,
            aviFormat: settings.features?.videoConvert?.aviFormat ?? true,
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
          fileToZip: {
            highCompression: settings.features?.fileToZip?.highCompression ?? true,
            preserveStructure: settings.features?.fileToZip?.preserveStructure ?? true,
            advancedOptions: settings.features?.fileToZip?.advancedOptions ?? false,
          },
          pdfUnlockProtect: {
            unlock: settings.features?.pdfUnlockProtect?.unlock ?? true,
            protect: settings.features?.pdfUnlockProtect?.protect ?? true,
            changePassword: settings.features?.pdfUnlockProtect?.changePassword ?? true,
            ownerPassword: settings.features?.pdfUnlockProtect?.ownerPassword ?? false,
            advancedPermissions: settings.features?.pdfUnlockProtect?.advancedPermissions ?? false,
          },
          passwordGenerator: {
            customLength: settings.features?.passwordGenerator?.customLength ?? true,
            characterTypes: settings.features?.passwordGenerator?.characterTypes ?? true,
            securityOptions: settings.features?.passwordGenerator?.securityOptions ?? true,
          },
          passwordStrengthChecker: {
            basicCheck: settings.features?.passwordStrengthChecker?.basicCheck ?? true,
            detailedAnalysis: settings.features?.passwordStrengthChecker?.detailedAnalysis ?? true,
            crackTimeEstimate: settings.features?.passwordStrengthChecker?.crackTimeEstimate ?? true,
          },
          ipLookup: {
            basicInfo: settings.features?.ipLookup?.basicInfo ?? true,
            detailedInfo: settings.features?.ipLookup?.detailedInfo ?? true,
            myIpLookup: settings.features?.ipLookup?.myIpLookup ?? true,
          },
          whoisChecker: {
            basicInfo: settings.features?.whoisChecker?.basicInfo ?? true,
            detailedInfo: settings.features?.whoisChecker?.detailedInfo ?? true,
            rawData: settings.features?.whoisChecker?.rawData ?? true,
          },
          metadataRemover: {
            exifRemoval: settings.features?.metadataRemover?.exifRemoval ?? true,
            gpsRemoval: settings.features?.metadataRemover?.gpsRemoval ?? true,
            batchRemoval: settings.features?.metadataRemover?.batchRemoval ?? false,
          },
          fakeEmailGenerator: {
            basicGeneration: settings.features?.fakeEmailGenerator?.basicGeneration ?? true,
            customDomain: settings.features?.fakeEmailGenerator?.customDomain ?? true,
            emailHistory: settings.features?.fakeEmailGenerator?.emailHistory ?? true,
          },
          websiteSecurityScore: {
            basicCheck: settings.features?.websiteSecurityScore?.basicCheck ?? true,
            sslAnalysis: settings.features?.websiteSecurityScore?.sslAnalysis ?? true,
            securityHeaders: settings.features?.websiteSecurityScore?.securityHeaders ?? true,
            blacklistCheck: settings.features?.websiteSecurityScore?.blacklistCheck ?? false,
          },
          emailReputationChecker: {
            basicCheck: settings.features?.emailReputationChecker?.basicCheck ?? true,
            domainAnalysis: settings.features?.emailReputationChecker?.domainAnalysis ?? true,
            breachCheck: settings.features?.emailReputationChecker?.breachCheck ?? false,
          },
          phoneValidator: {
            formatValidation: settings.features?.phoneValidator?.formatValidation ?? true,
            carrierInfo: settings.features?.phoneValidator?.carrierInfo ?? true,
            spamCheck: settings.features?.phoneValidator?.spamCheck ?? false,
          },
          dataBreachChecker: {
            emailCheck: settings.features?.dataBreachChecker?.emailCheck ?? true,
            domainCheck: settings.features?.dataBreachChecker?.domainCheck ?? true,
            detailedReport: settings.features?.dataBreachChecker?.detailedReport ?? false,
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
    console.error("Get settings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

