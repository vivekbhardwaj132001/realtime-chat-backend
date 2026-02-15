import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { Message } from "../models/message";
import { User } from "../models/user";

// Get Chat History
export const getHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;

        // 1. Find all messages where user is sender or receiver
        const messages = await Message.find({
            $or: [{ senderId: userId }, { receiverId: userId }]
        }).sort({ createdAt: -1 }); // Newest first

        // 2. Group by peer (conversation)
        const conversationsMap = new Map<string, any>();

        for (const msg of messages) {
            const peerId = msg.senderId === userId ? msg.receiverId : msg.senderId;

            if (!conversationsMap.has(peerId)) {
                conversationsMap.set(peerId, {
                    peerId,
                    lastMessage: msg.message,
                    time: msg.createdAt,
                    unreadCount: (msg.receiverId === userId && !msg.read) ? 1 : 0
                });
            } else {
                // Update unread count if applicable
                if (msg.receiverId === userId && !msg.read) {
                    conversationsMap.get(peerId).unreadCount++;
                }
            }
        }

        // 3. Fetch Peer Details (Name, Avatar)
        const peerIds = Array.from(conversationsMap.keys());
        const peers = await User.find({ _id: { $in: peerIds } }).select("fullName avatar");

        const history = peerIds.map(peerId => {
            const conversation = conversationsMap.get(peerId);
            const peer = peers.find(p => p._id.toString() === peerId);
            return {
                ...conversation,
                peerName: peer ? peer.fullName : "Unknown",
                peerAvatar: peer ? peer.avatar : "",
            };
        });

        res.json(history);

    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ message: "Error fetching history" });
    }
};
