import express from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import { getHistory } from "../controllers/messageController";

const router = express.Router();

router.get("/history", authenticateUser as any, getHistory);

export default router;
