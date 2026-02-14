import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
import Order from "../../../models/Order";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get Firebase UID from query (client will pass it)
    const { firebaseUid, page = 1, limit = 20 } = req.query;

    if (!firebaseUid) {
      return res.status(400).json({ error: "Firebase UID is required" });
    }

    await connectDB();

    // Find user
    const user = await User.findOne({ firebaseUid }).lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get individual orders with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalOrders = await Order.countDocuments({ firebaseUid });
    
    const orders = await Order.find({ firebaseUid })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Format orders
    const formattedOrders = orders.map((order) => ({
      id: order._id.toString(),
      toolName: order.toolName,
      toolPath: order.toolPath,
      toolType: order.toolType,
      fileCount: order.fileCount,
      status: order.status,
      createdAt: order.createdAt,
      metadata: order.metadata || {},
      files: order.files || [],
    }));

    return res.status(200).json({
      success: true,
      orders: formattedOrders,
      summary: {
        totalOrders: totalOrders,
        totalConversions: user.totalConversions || 0,
        totalCompressions: user.totalCompressions || 0,
        totalToolsUsed: user.totalToolsUsed || 0,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalOrders,
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
