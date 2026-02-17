import connectDB from "../../../../../lib/mongodb";
import Order from "../../../../../models/Order";
import { parse } from "cookie";

export default async function handler(req, res) {
  // Check admin authentication
  const cookies = parse(req.headers.cookie || "");
  const adminAuth = cookies.adminAuth;
  if (adminAuth !== "true") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();

    const { id } = req.query;
    const { fileIndex } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    if (fileIndex === undefined || fileIndex === null) {
      return res.status(400).json({ error: "File index is required" });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.files || order.files.length === 0) {
      return res.status(404).json({ error: "No files found in this order" });
    }

    const fileIndexNum = parseInt(fileIndex);
    if (fileIndexNum < 0 || fileIndexNum >= order.files.length) {
      return res.status(400).json({ error: "Invalid file index" });
    }

    // Remove the file from the array
    order.files.splice(fileIndexNum, 1);

    // Update file count
    order.fileCount = order.files.length;

    // If no files left, you might want to delete the order or mark it as empty
    if (order.files.length === 0) {
      // Option 1: Delete the entire order
      await Order.findByIdAndDelete(id);
      return res.status(200).json({ 
        success: true, 
        message: "File deleted. Order removed as it has no files remaining.",
        orderDeleted: true
      });
    }

    // Save the updated order
    await order.save();

    return res.status(200).json({ 
      success: true, 
      message: "File deleted successfully",
      remainingFiles: order.files.length
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

