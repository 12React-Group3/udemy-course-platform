import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import courseRoutes from "./routes/courseRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { connectDB } from "./config/db.js";
import uploadRoutes from "./routes/uploadRoutes.js";

console.log("ENV CHECK:", process.env.AWS_REGION, process.env.S3_BUCKET);

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running");
});

app.use("/api/courses", courseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/uploads", uploadRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    console.log("➡️ starting server...");
    console.log("PORT =", process.env.PORT);
    console.log("MONGO_URI exists =", Boolean(process.env.MONGO_URI));

    await connectDB(process.env.MONGO_URI);

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:");
    console.error(err); // print full error
    process.exit(1);
  }
}

start();

