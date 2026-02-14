import { Router } from "express";
import { followUser, unfollowUser, getProfile } from "../controllers/socialController";

const router = Router();

router.post("/follow", followUser);
router.post("/unfollow", unfollowUser);
router.get("/profile/:userId", getProfile);

export default router;
