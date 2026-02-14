import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
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
OrderSchema.index({ toolPath: 1, createdAt: -1 });

// Prevent model recompilation in development
export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
