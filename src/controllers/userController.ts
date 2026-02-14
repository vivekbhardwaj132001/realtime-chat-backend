import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { User } from "../models/user";

// Get Profile
export const getProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.params.id || req.user.userId;
        const user = await User.findById(userId).select("-passwordHash").populate("followers following blockedUsers", "username fullName avatar");

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching profile" });
    }
};

// Update Profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const { fullName, bio, gender, country, avatar } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { fullName, bio, gender, country, avatar },
            { new: true, runValidators: true }
        ).select("-passwordHash");

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error updating profile" });
    }
};

// Follow User
export const followUser = async (req: AuthRequest, res: Response) => {
    try {
        const currentUserId = req.user.userId;
        const targetUserId = req.params.id;

        if (currentUserId === targetUserId) {
            res.status(400).json({ message: "Cannot follow yourself" });
            return
        }

        const targetUser = await User.findById(targetUserId);
        const currentUser = await User.findById(currentUserId);

        if (!targetUser || !currentUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        if (!currentUser.following.includes(targetUserId as any)) {
            currentUser.following.push(targetUserId as any);
            await currentUser.save();

            targetUser.followers.push(currentUserId as any);
            await targetUser.save();
        }

        res.json({ message: "Followed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error following user" });
    }
};


// Unfollow User
export const unfollowUser = async (req: AuthRequest, res: Response) => {
    try {
        const currentUserId = req.user.userId;
        const targetUserId = req.params.id;

        const targetUser = await User.findById(targetUserId);
        const currentUser = await User.findById(currentUserId);

        if (!targetUser || !currentUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
        await currentUser.save();

        targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId);
        await targetUser.save();

        res.json({ message: "Unfollowed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error unfollowing user" });
    }
};
