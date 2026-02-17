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

    const { page = 1, limit = 50, search = "", toolType = "", status = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query - include both logged-in and anonymous users
    let query = {};
    if (search) {
      query.$or = [
        { userEmail: { $regex: search, $options: "i" } },
        { toolName: { $regex: search, $options: "i" } },
        { firebaseUid: { $regex: search, $options: "i" } },
        { sessionId: { $regex: search, $options: "i" } }, // Include sessionId for anonymous users
      ];
    }
    // Don't filter by userEmail or firebaseUid - show all orders (logged-in and anonymous)
    if (toolType) {
      query.toolType = toolType;
    }
    if (status) {
      query.status = status;
    }

    // Get total count
    const totalOrders = await Order.countDocuments(query);

    // Get orders with pagination (include both logged-in and anonymous)
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`Admin orders query:`, JSON.stringify(query));
    console.log(`Admin orders found: ${orders.length} out of ${totalOrders} total`);

    // Format orders
    const formattedOrders = orders.map((order) => ({
      id: order._id.toString(),
      firebaseUid: order.firebaseUid,
      userEmail: order.userEmail,
      sessionId: order.sessionId,
      isAnonymous: order.isAnonymous || false,
      toolName: order.toolName,
      toolPath: order.toolPath,
      toolType: order.toolType,
      fileCount: order.fileCount,
      status: order.status,
      createdAt: order.createdAt,
      metadata: order.metadata || {},
      files: (order.files || []).map(file => ({
        inputName: file.inputName,
        outputName: file.outputName,
        inputSize: file.inputSize,
        outputSize: file.outputSize,
        inputFormat: file.inputFormat,
        outputFormat: file.outputFormat,
        inputThumbnail: file.inputThumbnail,
        outputThumbnail: file.outputThumbnail,
        hasOutputFileData: !!file.outputFileData,
        // Include outputFileData for admin (they need to see/download files)
        outputFileData: file.outputFileData,
      })),
    }));

    return res.status(200).json({
      success: true,
      orders: formattedOrders,
      pagination: {
        total: totalOrders,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
