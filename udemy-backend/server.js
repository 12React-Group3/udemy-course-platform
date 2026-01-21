// Load environment variables FIRST (before any other imports)
import 'dotenv/config';

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import courseRoutes from "./routes/courseRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
// DynamoDB client is initialized after dotenv/config
import "./config/dynamodb.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running - DynamoDB");
});

app.use("/api/courses", courseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    console.log("➡️ Starting server...");
    console.log("PORT =", process.env.PORT || 5000);
    console.log("AWS_REGION =", process.env.AWS_REGION);
    console.log("DYNAMODB_TABLE =", process.env.DYNAMODB_TABLE_NAME);

    // Check required DynamoDB environment variables
    const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'DYNAMODB_TABLE_NAME', "AWS_S3_BUCKET_NAME"];
    const missing = requiredEnvVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Using DynamoDB table: ${process.env.DYNAMODB_TABLE_NAME}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:");
    console.error(err);
    process.exit(1);
  }
}

start();

