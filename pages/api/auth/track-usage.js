import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
import Order from "../../../models/Order";

// Increase body size limit to handle base64 file data (default 1MB is too small)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

// Maps tool page paths to toolUsage field names and tool names
const TOOL_MAP = {
  "/convert": { field: "imageConverter", name: "Image Converter", type: "conversion" },
  "/compress": { field: "imageCompressor", name: "Image Compressor", type: "compression" },
  "/video-convert": { field: "videoConverter", name: "Video Converter", type: "conversion" },
  "/video-compress": { field: "videoCompressor", name: "Video Compressor", type: "compression" },
  "/video-trim": { field: "videoTrimmer", name: "Video Trimmer", type: "conversion" },
  "/doc-to-pdf": { field: "docToPdf", name: "Doc to PDF", type: "conversion" },
  "/pdf-to-doc": { field: "pdfToDoc", name: "PDF to DOCX/TXT", type: "conversion" },
  "/merge-pdf": { field: "mergePdf", name: "Merge PDF", type: "conversion" },
  "/compress-pdf": { field: "compressPdf", name: "Compress PDF", type: "compression" },
  "/scanner": { field: "scanner", name: "Document Scanner", type: "conversion" },
  "/extract-text": { field: "extractText", name: "Extract Text (OCR)", type: "conversion" },
  "/image-to-pdf": { field: "imageToPdf", name: "Image to PDF", type: "conversion" },
  "/audio-convert": { field: "audioConverter", name: "Audio Converter", type: "conversion" },
  "/text-to-speech": { field: "textToSpeech", name: "Text to Speech", type: "conversion" },
  "/speech-to-text": { field: "speechToText", name: "Speech to Text", type: "conversion" },
  "/qr-barcode": { field: "qrBarcode", name: "QR & Barcode", type: "conversion" },
  "/url-shortener": { field: "urlShortener", name: "URL Shortener", type: "conversion" },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { firebaseUid, tool, count = 1, fileCount = 1, metadata = {}, files = [], sessionId } = req.body;
    
    // Get IP address for anonymous tracking
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || 
                      req.headers['x-real-ip'] || 
                      req.connection?.remoteAddress || 
                      null;

    if (!tool) {
      return res.status(400).json({ error: "Tool is required" });
    }

    const toolInfo = TOOL_MAP[tool];
    if (!toolInfo) {
      return res.status(400).json({ error: "Invalid tool" });
    }

    await connectDB();

    let userEmail = null;
    let userId = null;
    let isAnonymous = false;

    // If user is logged in, get their info
    if (firebaseUid) {
      const user = await User.findOne({ firebaseUid });
      if (user) {
        userEmail = user.email;
        userId = firebaseUid;
        isAnonymous = false;
      } else {
        // Firebase UID provided but user not found in DB - treat as anonymous
        isAnonymous = true;
        userId = sessionId ? `session_${sessionId}` : `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        userEmail = sessionId ? `anonymous_${sessionId}@guest.com` : "anonymous@guest.com";
      }
    } else {
      // Anonymous user - use session ID or generate temp ID
      isAnonymous = true;
      if (sessionId) {
        userId = `session_${sessionId}`;
        userEmail = `anonymous_${sessionId}@guest.com`;
      } else {
        userId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        userEmail = "anonymous@guest.com";
      }
    }

    // Create one order record with all files
    // If files array is provided, use it; otherwise create empty array
    const orderFiles = Array.isArray(files) && files.length > 0 ? files : [];
    
    // Debug logging
    console.log("Track usage - Files count:", orderFiles.length);
    if (orderFiles.length > 0) {
      const firstFile = orderFiles[0];
      console.log("Track usage - First file details:", {
        inputName: firstFile.inputName,
        outputName: firstFile.outputName,
        inputSize: firstFile.inputSize,
        outputSize: firstFile.outputSize,
        hasInputThumbnail: !!firstFile.inputThumbnail,
        hasOutputThumbnail: !!firstFile.outputThumbnail,
        hasOutputFileData: !!firstFile.outputFileData,
        inputThumbnailLength: firstFile.inputThumbnail?.length || 0,
        outputThumbnailLength: firstFile.outputThumbnail?.length || 0,
        outputFileDataLength: firstFile.outputFileData?.length || 0,
      });
    }
    
    const newOrder = {
      firebaseUid: userId,
      userEmail: userEmail,
      sessionId: sessionId || null,
      ipAddress: ipAddress,
      isAnonymous: isAnonymous,
      toolName: toolInfo.name,
      toolPath: tool,
      toolType: toolInfo.type,
      fileCount: orderFiles.length > 0 ? orderFiles.length : fileCount,
      status: "completed",
      metadata: {
        ...metadata,
        isAnonymous: isAnonymous,
        sessionId: sessionId || null,
      },
      files: orderFiles,
    };

    // Insert order
    try {
      const savedOrder = await Order.create(newOrder);
      console.log("✅ Order created successfully - ID:", savedOrder._id);
      console.log("✅ Order created - isAnonymous:", isAnonymous);
      console.log("✅ Order created - userId:", userId);
      console.log("✅ Order created - userEmail:", userEmail);
      console.log("✅ Order created - sessionId:", sessionId);
      console.log("✅ Order created - files count:", savedOrder.files?.length || 0);
      if (savedOrder.files && savedOrder.files.length > 0) {
        const f = savedOrder.files[0];
        console.log("✅ Order created - First file saved:", {
          inputName: f.inputName,
          outputName: f.outputName,
          hasInputThumbnail: !!f.inputThumbnail,
          hasOutputThumbnail: !!f.outputThumbnail,
          hasOutputFileData: !!f.outputFileData,
          inputThumbnailLength: f.inputThumbnail?.length || 0,
          outputThumbnailLength: f.outputThumbnail?.length || 0,
          outputFileDataLength: f.outputFileData?.length || 0,
        });
      }
    } catch (orderError) {
      console.error("❌ Error creating order:", orderError);
      // If it's a validation error, log the details
      if (orderError.name === 'ValidationError') {
        console.error("Validation errors:", orderError.errors);
      }
      throw orderError; // Re-throw to be caught by outer try-catch
    }

    // Update user stats only if user is logged in
    if (!isAnonymous && firebaseUid) {
      const updateFields = {
        $inc: {
          [`toolUsage.${toolInfo.field}`]: count,
          totalToolsUsed: count,
        },
        $set: {
          lastActive: new Date(),
        },
      };

      // Also increment specific counters based on tool type
      if (toolInfo.type === "conversion") {
        updateFields.$inc.totalConversions = count;
      } else if (toolInfo.type === "compression") {
        updateFields.$inc.totalCompressions = count;
      }

      await User.findOneAndUpdate({ firebaseUid }, updateFields, { new: true });
    }

    return res.status(200).json({ success: true, ordersCreated: 1, filesCount: orderFiles.length });
  } catch (error) {
    console.error("Track usage error:", error.message);
    
    // Handle MongoDB connection errors
    if (error.code === "MONGODB_URI_MISSING" || error.code === "MONGODB_CONNECTION_FAILED") {
      return res.status(503).json({ 
        error: "Database unavailable",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
