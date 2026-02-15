import express from "express";
import { createServer } from "http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { initializeSocket } from "./socket";
import authRoutes from "./routes/authRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import socialRoutes from "./routes/socialRoutes";
import path from "path";
import userRoutes from "./routes/userRoutes";
import messageRoutes from "./routes/messageRoutes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ PORT
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;

// ❌ REMOVE fallback (IMPORTANT)
const MONGO_URI = process.env.MONGO_URI as string;

// ✅ Check if MONGO_URI exists
if (!MONGO_URI) {
    console.error("❌ MONGO_URI is missing in .env");
    process.exit(1);
}

console.log("🔥 USING MONGO_URI:", MONGO_URI);

// ✅ Connect to MongoDB
mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB connected successfully"))
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/messages", messageRoutes); // Register Message Routes
app.use("/api/upload", uploadRoutes);

// Serve Uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Test route
app.get("/", (req, res) => {
    res.send("Realtime Chat Backend is Running 🚀");
});

const httpServer = createServer(app);
initializeSocket(httpServer);

// Start server
const server = httpServer.listen(PORT, "0.0.0.0", () => {
    console.log("\n=======================================");
    console.log(`🚀 Server running on PORT ${PORT}`);
    console.log("=======================================\n");
});

// Error handling
server.on("error", (e: any) => {
    if (e.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} already in use`);
        process.exit(1);
    } else {
        console.error(e);
    }
});
