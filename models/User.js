import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: "",
    },
    photoURL: {
      type: String,
      default: "",
    },
    provider: {
      type: String,
      enum: ["email", "google"],
      default: "email",
    },
    // Usage tracking
    totalConversions: {
      type: Number,
      default: 0,
    },
    totalCompressions: {
      type: Number,
      default: 0,
    },
    totalToolsUsed: {
      type: Number,
      default: 0,
    },
    // Tool usage breakdown
    toolUsage: {
      imageConverter: { type: Number, default: 0 },
      imageCompressor: { type: Number, default: 0 },
      videoConverter: { type: Number, default: 0 },
      videoCompressor: { type: Number, default: 0 },
      videoTrimmer: { type: Number, default: 0 },
      docToPdf: { type: Number, default: 0 },
      pdfToDoc: { type: Number, default: 0 },
      mergePdf: { type: Number, default: 0 },
      compressPdf: { type: Number, default: 0 },
      scanner: { type: Number, default: 0 },
      extractText: { type: Number, default: 0 },
      imageToPdf: { type: Number, default: 0 },
      audioConverter: { type: Number, default: 0 },
      textToSpeech: { type: Number, default: 0 },
      speechToText: { type: Number, default: 0 },
      qrBarcode: { type: Number, default: 0 },
      urlShortener: { type: Number, default: 0 },
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Prevent model recompilation in development
export default mongoose.models.User || mongoose.model("User", UserSchema);
