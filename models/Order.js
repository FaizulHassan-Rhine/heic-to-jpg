import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: false, // Changed to false for anonymous users
      index: true,
      default: null,
    },
    userEmail: {
      type: String,
      required: false, // Changed to false for anonymous users
      index: true,
      default: null,
    },
    // Session ID for anonymous users
    sessionId: {
      type: String,
      index: true,
      default: null,
    },
    // IP address for tracking anonymous users
    ipAddress: {
      type: String,
      default: null,
    },
    // Flag to identify anonymous orders
    isAnonymous: {
      type: Boolean,
      default: false,
      index: true,
    },
    toolName: {
      type: String,
      required: true,
    },
    toolPath: {
      type: String,
      required: true,
    },
    toolType: {
      type: String,
      enum: ["conversion", "compression"],
      required: true,
    },
    fileCount: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ["completed", "failed", "processing"],
      default: "completed",
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // File information
    files: {
      type: [
        {
          inputName: String,
          inputSize: Number,
          outputName: String,
          outputSize: Number,
          inputFormat: String,
          outputFormat: String,
          inputThumbnail: String,
          outputThumbnail: String,
          outputFileData: String, // Base64 encoded output file (for downloads)
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for faster queries
OrderSchema.index({ firebaseUid: 1, createdAt: -1 });
OrderSchema.index({ userEmail: 1, createdAt: -1 });
OrderSchema.index({ sessionId: 1, createdAt: -1 }); // New index for anonymous users
OrderSchema.index({ isAnonymous: 1, createdAt: -1 }); // New index for filtering
OrderSchema.index({ toolPath: 1, createdAt: -1 });

// In development, delete cached model to pick up schema changes
if (process.env.NODE_ENV === 'development' && mongoose.models.Order) {
  delete mongoose.models.Order;
}

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
