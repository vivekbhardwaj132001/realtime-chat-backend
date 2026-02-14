
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

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/realtime_chat_db";
console.log("MONGO_URI USED:", MONGO_URI);

// Connect to MongoDB
mongoose
    .connect(MONGO_URI)
    .then(() => console.log(`✅ MongoDB connected to: ${MONGO_URI}`))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/upload", uploadRoutes);

// Serve Uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Basic route
app.get("/", (req, res) => {
    res.send("Realtime Chat Backend is Running");
});

const httpServer = createServer(app);
const io = initializeSocket(httpServer);

// Use existing PORT variable

// Listen on 0.0.0.0 (All interfaces) to avoid specific IP binding locks
const server = httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Server running on Port ${PORT}`);
    console.log(`👉 Server is accessible at your VPS IP address`);
    console.log(`==================================================\n`);
});

server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use! Please stop other running servers.`);
        process.exit(1);
    } else {
        console.error(e);
    }
});
