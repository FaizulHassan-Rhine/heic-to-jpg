import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
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

    // Get total users
    const totalUsers = await User.countDocuments({});

    // Get active users (last active in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: thirtyDaysAgo },
    });

    // Get users by provider
    const googleUsers = await User.countDocuments({ provider: "google" });
    const emailUsers = await User.countDocuments({ provider: "email" });

    // Get total conversions and compressions
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalConversions: { $sum: "$totalConversions" },
          totalCompressions: { $sum: "$totalCompressions" },
          totalToolsUsed: { $sum: "$totalToolsUsed" },
        },
      },
    ]);

    // Get tool usage breakdown
    const toolUsage = await User.aggregate([
      {
        $group: {
          _id: null,
          imageConverter: { $sum: "$toolUsage.imageConverter" },
          imageCompressor: { $sum: "$toolUsage.imageCompressor" },
          videoConverter: { $sum: "$toolUsage.videoConverter" },
          videoCompressor: { $sum: "$toolUsage.videoCompressor" },
          videoTrimmer: { $sum: "$toolUsage.videoTrimmer" },
          docToPdf: { $sum: "$toolUsage.docToPdf" },
          pdfToDoc: { $sum: "$toolUsage.pdfToDoc" },
          mergePdf: { $sum: "$toolUsage.mergePdf" },
          compressPdf: { $sum: "$toolUsage.compressPdf" },
          scanner: { $sum: "$toolUsage.scanner" },
          extractText: { $sum: "$toolUsage.extractText" },
          imageToPdf: { $sum: "$toolUsage.imageToPdf" },
          audioConverter: { $sum: "$toolUsage.audioConverter" },
          textToSpeech: { $sum: "$toolUsage.textToSpeech" },
          speechToText: { $sum: "$toolUsage.speechToText" },
          qrBarcode: { $sum: "$toolUsage.qrBarcode" },
          urlShortener: { $sum: "$toolUsage.urlShortener" },
        },
      },
    ]);

    // Get new users in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersLastWeek = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Get order statistics
    const totalOrders = await Order.countDocuments({});
    const ordersLast24Hours = await Order.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const ordersLast7Days = await Order.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });
    const ordersByType = await Order.aggregate([
      {
        $group: {
          _id: "$toolType",
          count: { $sum: 1 },
        },
      },
    ]);
    const conversionOrders = ordersByType.find((o) => o._id === "conversion")?.count || 0;
    const compressionOrders = ordersByType.find((o) => o._id === "compression")?.count || 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        newUsersLastWeek,
        googleUsers,
        emailUsers,
        totalConversions: stats[0]?.totalConversions || 0,
        totalCompressions: stats[0]?.totalCompressions || 0,
        totalToolsUsed: stats[0]?.totalToolsUsed || 0,
        toolUsage: toolUsage[0] || {},
        // Order statistics
        totalOrders,
        ordersLast24Hours,
        ordersLast7Days,
        conversionOrders,
        compressionOrders,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
