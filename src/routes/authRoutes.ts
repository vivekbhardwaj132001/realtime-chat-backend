import { Router } from "express";
import { register, login, sendOtp, verifyOtp, getMe } from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/me", authenticateToken, getMe);

export default router;
