import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) throw new Error("MONGO_URI is missing");

  mongoose.set("strictQuery", true);

  // Print connection events
  mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
  mongoose.connection.on("error", (err) => console.error("❌ MongoDB error:", err.message));
  mongoose.connection.on("disconnected", () => console.log("⚠️ MongoDB disconnected"));

  // Force it to fail fast instead of hanging
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000, // 8s
    connectTimeoutMS: 8000
  });
}
