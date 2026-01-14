import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import courseRoutes from "./routes/courseRoutes.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running");
});

app.use("/api/courses", courseRoutes);

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

