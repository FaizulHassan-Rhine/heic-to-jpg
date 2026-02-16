import connectDB from "../../../../lib/mongodb";
import Order from "../../../../models/Order";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Get order details
    try {
      const { id, firebaseUid } = req.query;

      if (!id || !firebaseUid) {
        return res.status(400).json({ error: "Order ID and Firebase UID are required" });
      }

      await connectDB();

      const order = await Order.findOne({ _id: id, firebaseUid }).lean();

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Debug logging
      console.log("Order retrieved - files count:", order.files?.length || 0);
      if (order.files && order.files.length > 0) {
        const firstFile = order.files[0];
        console.log("Order retrieved - First file sample:", {
          inputName: firstFile.inputName,
          outputName: firstFile.outputName,
          hasInputThumbnail: !!firstFile.inputThumbnail,
          hasOutputThumbnail: !!firstFile.outputThumbnail,
          hasOutputFileData: !!firstFile.outputFileData,
          inputThumbnailLength: firstFile.inputThumbnail?.length || 0,
          outputThumbnailLength: firstFile.outputThumbnail?.length || 0,
          outputFileDataLength: firstFile.outputFileData?.length || 0,
        });
      }

      // Convert _id to string and format files
      // Exclude outputFileData from the response (it's large and served via download API)
      const formattedOrder = {
        ...order,
        _id: order._id.toString(),
        files: (order.files || []).map(file => ({
          ...file,
          // Keep a flag indicating whether file data exists (for download button)
          hasOutputFileData: !!file.outputFileData,
          // Remove the actual file data from the view response (too large)
          outputFileData: undefined,
        })),
      };

      return res.status(200).json({ success: true, order: formattedOrder });
    } catch (error) {
      console.error("Error fetching order:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  } else if (req.method === "DELETE") {
    // Delete order
    try {
      const { id, firebaseUid } = req.query;

      if (!id || !firebaseUid) {
        return res.status(400).json({ error: "Order ID and Firebase UID are required" });
      }

      await connectDB();

      const order = await Order.findOneAndDelete({ _id: id, firebaseUid });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      return res.status(200).json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
      console.error("Error deleting order:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
