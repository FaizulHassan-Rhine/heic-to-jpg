import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { firebaseUid, email, displayName, photoURL, provider } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({ error: "Firebase UID and email are required" });
    }

    await connectDB();

    // Upsert user - create if not exists, update if exists
    const user = await User.findOneAndUpdate(
      { firebaseUid },
      {
        $set: {
          email,
          displayName: displayName || "",
          photoURL: photoURL || "",
          provider: provider || "email",
          lastActive: new Date(),
        },
        $setOnInsert: {
          firebaseUid,
          totalConversions: 0,
          totalCompressions: 0,
          totalToolsUsed: 0,
          toolUsage: {},
          isActive: true,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: user.provider,
        totalConversions: user.totalConversions,
        totalCompressions: user.totalCompressions,
        totalToolsUsed: user.totalToolsUsed,
        toolUsage: user.toolUsage,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
      },
    });
  } catch (error) {
    console.error("Sync user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
