import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
import Order from "../../../models/Order";

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
    const { firebaseUid, tool, count = 1, fileCount = 1, metadata = {}, files = [] } = req.body;

    if (!firebaseUid || !tool) {
      return res.status(400).json({ error: "Firebase UID and tool are required" });
    }

    const toolInfo = TOOL_MAP[tool];
    if (!toolInfo) {
      return res.status(400).json({ error: "Invalid tool" });
    }

    await connectDB();

    // Get user email for order record
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create one order record with all files
    // If files array is provided, use it; otherwise create empty array
    const orderFiles = Array.isArray(files) && files.length > 0 ? files : [];
    
    // Debug logging
    console.log("Track usage - Files received:", JSON.stringify(orderFiles, null, 2));
    console.log("Track usage - Files count:", orderFiles.length);
    
    const newOrder = {
      firebaseUid,
      userEmail: user.email,
      toolName: toolInfo.name,
      toolPath: tool,
      toolType: toolInfo.type,
      fileCount: orderFiles.length > 0 ? orderFiles.length : fileCount,
      status: "completed",
      metadata: metadata,
      files: orderFiles,
    };

    // Insert order
    const savedOrder = await Order.create(newOrder);
    console.log("Order created with files:", savedOrder.files?.length || 0);

    // Update user stats
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

    return res.status(200).json({ success: true, ordersCreated: 1, filesCount: orderFiles.length });
  } catch (error) {
    console.error("Track usage error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
