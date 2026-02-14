import { Request, Response } from "express";
import { User } from "../models/user";
import mongoose from "mongoose";

export const followUser = async (req: Request, res: Response) => {
    try {
        const { currentUserId, targetUserId } = req.body;

        if (currentUserId === targetUserId) {
            res.status(400).json({ message: "You cannot follow yourself" });
            return;
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        if (currentUser.following.includes(new mongoose.Types.ObjectId(targetUserId))) {
            res.status(400).json({ message: "You are already following this user" });
            return;
        }

        currentUser.following.push(new mongoose.Types.ObjectId(targetUserId));
        targetUser.followers.push(new mongoose.Types.ObjectId(currentUserId));

        await currentUser.save();
        await targetUser.save();

        res.json({ message: "Followed successfully" });
    } catch (error) {
        console.error("Follow Error:", error);
        res.status(500).json({ message: "Error following user" });
    }
};

export const unfollowUser = async (req: Request, res: Response) => {
    try {
        const { currentUserId, targetUserId } = req.body;

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
        targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId);

        await currentUser.save();
        await targetUser.save();

        res.json({ message: "Unfollowed successfully" });
    } catch (error) {
        console.error("Unfollow Error:", error);
        res.status(500).json({ message: "Error unfollowing user" });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).populate("followers", "username avatar").populate("following", "username avatar");

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        // Return public profile data
        res.json({
            id: user._id,
            username: user.username,
            fullName: user.fullName,
            bio: user.bio,
            avatar: user.avatar,
            gender: user.gender,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            followers: user.followers, // Optional: limit this if list is huge
            following: user.following
        });
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: "Error fetching profile" });
    }
};
