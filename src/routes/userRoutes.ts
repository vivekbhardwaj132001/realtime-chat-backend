import { Router } from "express";
import { getProfile, updateProfile, followUser, unfollowUser, getFollowers, getFollowing } from "../controllers/userController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Public route to view a profile? Or protected? Assuming protected for now as per requirement "User must register first"
router.get("/profile", authenticateToken, getProfile);
router.get("/profile/:id", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.post("/follow/:id", authenticateToken, followUser);
router.post("/unfollow/:id", authenticateToken, unfollowUser);
router.get("/followers", authenticateToken, getFollowers);
router.get("/following", authenticateToken, getFollowing);

export default router;
