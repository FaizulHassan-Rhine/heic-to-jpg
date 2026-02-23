import connectDB from "../../../lib/mongodb";
import Order from "../../../models/Order";
import { parse } from "cookie";

export default async function handler(req, res) {
  // Check admin authentication
  const cookies = parse(req.headers.cookie || "");
  const adminAuth = cookies.adminAuth;
  if (adminAuth !== "true") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();

    const { page = 1, limit = 10, search = "", toolType = "", status = "" } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Build match stage for aggregation
    let matchStage = {};
    if (search) {
      matchStage.$or = [
        { userEmail: { $regex: search, $options: "i" } },
        { toolName: { $regex: search, $options: "i" } },
        { firebaseUid: { $regex: search, $options: "i" } },
        { sessionId: { $regex: search, $options: "i" } },
      ];
    }
    if (toolType) {
      matchStage.toolType = toolType;
    }
    if (status) {
      matchStage.status = status;
    }

    // Get total count
    const totalOrders = await Order.countDocuments(matchStage);

    // Use aggregation pipeline with $project to exclude large fields BEFORE sorting
    // This prevents the 32MB sort memory limit error on MongoDB Atlas
    const orders = await Order.aggregate([
      { $match: matchStage },
      {
        $project: {
          firebaseUid: 1,
          userEmail: 1,
          sessionId: 1,
          isAnonymous: 1,
          toolName: 1,
          toolPath: 1,
          toolType: 1,
          fileCount: 1,
          status: 1,
          createdAt: 1,
          metadata: 1,
          // For files, only include small metadata fields - NOT the large base64 data
          files: {
            $map: {
              input: { $ifNull: ["$files", []] },
              as: "file",
              in: {
                inputName: "$$file.inputName",
                outputName: "$$file.outputName",
                inputSize: "$$file.inputSize",
                outputSize: "$$file.outputSize",
                inputFormat: "$$file.inputFormat",
                outputFormat: "$$file.outputFormat",
              },
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ]).allowDiskUse(true);

    // Format orders for response
    const formattedOrders = (orders || []).map((order) => ({
      id: order._id?.toString() || "unknown",
      firebaseUid: order.firebaseUid || null,
      userEmail: order.userEmail || null,
      sessionId: order.sessionId || null,
      isAnonymous: Boolean(order.isAnonymous),
      toolName: order.toolName || "Unknown",
      toolPath: order.toolPath || "",
      toolType: order.toolType || "unknown",
      fileCount: order.fileCount || 0,
      status: order.status || "pending",
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
      metadata: order.metadata || {},
      files: (order.files || []).map((file) => ({
        inputName: file.inputName || "",
        outputName: file.outputName || "",
        inputSize: file.inputSize || 0,
        outputSize: file.outputSize || 0,
        inputFormat: file.inputFormat || "",
        outputFormat: file.outputFormat || "",
      })),
    }));

    return res.status(200).json({
      success: true,
      orders: formattedOrders,
      pagination: {
        total: totalOrders,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalOrders / limitNum),
      },
    });
  } catch (error) {
    console.error("Get orders error:", error.message);
    return res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
