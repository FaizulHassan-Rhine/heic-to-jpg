import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined. Please set it in Vercel environment variables.");
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // If no URI, throw a clear error
  if (!MONGODB_URI) {
    const error = new Error("MONGODB_URI environment variable is not defined");
    error.code = "MONGODB_URI_MISSING";
    throw error;
  }

  // If connection exists and is ready, return it
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection exists but is not ready, reset it
  if (cached.conn && mongoose.connection.readyState !== 1) {
    cached.conn = null;
    cached.promise = null;
  }

  // If no promise, create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Add timeout settings for serverless environment
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      // Retry settings
      retryWrites: true,
      retryReads: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("MongoDB connected successfully");
      return mongoose;
    }).catch((err) => {
      console.error("MongoDB connection error:", err.message);
      cached.promise = null;
      cached.conn = null;
      // Create a more descriptive error
      const error = new Error(
        process.env.NODE_ENV === 'development' 
          ? `MongoDB connection failed: ${err.message}` 
          : "Database connection failed. Please try again later."
      );
      error.code = "MONGODB_CONNECTION_FAILED";
      error.originalError = err;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    console.error("MongoDB connection failed:", e.message);
    throw e;
  }

  return cached.conn;
}

export default connectDB;
