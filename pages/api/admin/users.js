import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
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

    const { page = 1, limit = 50, search = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: "i" } },
          { displayName: { $regex: search, $options: "i" } },
          { firebaseUid: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Get total count
    const totalUsers = await User.countDocuments(query);

    // Get users with pagination
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v")
      .lean();

    // Format users for response
    const formattedUsers = users.map((user) => ({
      id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName || "N/A",
      photoURL: user.photoURL || "",
      provider: user.provider,
      totalConversions: user.totalConversions || 0,
      totalCompressions: user.totalCompressions || 0,
      totalToolsUsed: user.totalToolsUsed || 0,
      toolUsage: user.toolUsage || {},
      createdAt: user.createdAt,
      lastActive: user.lastActive,
      isActive: user.isActive !== false,
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
