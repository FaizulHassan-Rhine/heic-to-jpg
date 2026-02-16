import connectDB from "../../../../../lib/mongodb";
import Order from "../../../../../models/Order";

// Server-side utility functions
function base64ToBuffer(base64) {
  return Buffer.from(base64, 'base64');
}

function getMimeTypeFromExtension(ext) {
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
  };
  return mimeTypes[ext?.toLowerCase()] || 'application/octet-stream';
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, firebaseUid, fileIndex = 0 } = req.query;

    if (!id || !firebaseUid) {
      return res.status(400).json({ error: "Order ID and Firebase UID are required" });
    }

    await connectDB();

    const order = await Order.findOne({ _id: id, firebaseUid }).lean();

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.files || order.files.length === 0) {
      return res.status(404).json({ error: "No files found in this order" });
    }

    const fileIndexNum = parseInt(fileIndex);
    const file = order.files[fileIndexNum];

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (!file.outputFileData) {
      return res.status(404).json({ 
        error: "File data not available. This order was created before file storage was implemented." 
      });
    }

    // Convert base64 back to buffer
    // Handle both pure base64 and data URL format
    let base64Data = file.outputFileData;
    if (base64Data.includes(',')) {
      // If it's a data URL, extract just the base64 part
      base64Data = base64Data.split(',')[1];
    }
    
    const mimeType = getMimeTypeFromExtension(file.outputFormat);
    const buffer = base64ToBuffer(base64Data);

    // Set headers for file download
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.outputName}"`);
    res.setHeader("Content-Length", buffer.length);

    // Send file
    res.send(buffer);
  } catch (error) {
    console.error("Error downloading file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

