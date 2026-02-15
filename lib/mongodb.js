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
    throw new Error("Please define the MONGODB_URI environment variable in Vercel");
  }

  // If connection exists, return it
  if (cached.conn) {
    return cached.conn;
  }

  // If no promise, create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Add timeout settings for serverless environment
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("MongoDB connected successfully");
      return mongoose;
    }).catch((err) => {
      console.error("MongoDB connection error:", err);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("MongoDB connection failed:", e.message);
    throw e;
  }

  return cached.conn;
}

export default connectDB;
