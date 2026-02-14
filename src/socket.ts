
import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { Message } from "./models/message";
import { User } from "./models/user";

export const initializeSocket = (httpServer: HttpServer) => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    // Queue for random matching: { socketId, userId, gender, preference }
    let matchQueue: {
        socketId: string,
        userId: string,
        gender: string, // 'Male', 'Female'
        preference: string // 'Male', 'Female', 'All'
    }[] = [];

    // Track active matches: socketId -> partnerSocketId
    const activeMatches = new Map<string, string>();

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        // Join a personal room (e.g. user ID)
        socket.on("join_user", (userId) => {
            socket.join(userId);
            console.log(`User mapped: ${userId} -> Socket: ${socket.id}`);
        });

        // Send a message
        socket.on("send_message", async (data) => {
            // data -> { senderId, receiverId, message, type }
            try {
                const { senderId, receiverId, message, type } = data;

                // Save to DB
                const newMessage = new Message({
                    senderId,
                    receiverId,
                    message,
                    type: type || 'text'
                });
                await newMessage.save();

                // Emit to receiver
                io.to(receiverId).emit("received_message", newMessage);

                console.log(`Message saved from ${senderId} to ${receiverId}`);

            } catch (error) {
                console.error("Error saving message:", error);
            }
        });

        // Typing Indicators
        socket.on("typing", (data) => {
            const { receiverId, isTyping } = data;
            io.to(receiverId).emit("typing_status", { senderId: data.senderId, isTyping });
        });

        // --- Random Match Logic ---
        socket.on("find_match", async (data) => {
            // data: { userId, gender, preference }
            const { userId, gender, preference } = data;
            console.log(`User ${userId} (${gender}) looking for match with (${preference})...`);

            // 0. Verify REAL USER from Database
            let userGender = gender || 'Unknown';
            try {
                const userExists = await User.findById(userId);
                if (!userExists) {
                    console.log(`❌ Match request rejected: User ${userId} not found in DB`);
                    socket.emit("error", { message: "Authentication failed: User not found" });
                    return;
                }
                // Use DB gender if available/trustworthy, else fallback to client provided
                if (userExists.gender) userGender = userExists.gender;

            } catch (err) {
                console.error("Error validating user for match:", err);
                return;
            }

            // 1. Remove from queue if already there (to avoid duplicates)
            matchQueue = matchQueue.filter(u => u.socketId !== socket.id);

            // 2. Try to find a partner
            // Filter criteria:
            // - Queue User's Gender matches My Preference (OR My Pref is 'All')
            // - My Gender matches Queue User's Preference (OR Queue User's Pref is 'All')

            const matchIndex = matchQueue.findIndex(queuedUser => {
                const isMyPrefMatch = (preference === 'All' || preference === 'Both') || (preference === queuedUser.gender);
                const isTheirPrefMatch = (queuedUser.preference === 'All' || queuedUser.preference === 'Both') || (queuedUser.preference === userGender);

                return isMyPrefMatch && isTheirPrefMatch && queuedUser.userId !== userId;
            });

            if (matchIndex !== -1) {
                // Partner Found!
                const partner = matchQueue.splice(matchIndex, 1)[0]; // Remove partner from queue

                const partnerSocketId = partner.socketId;
                const partnerUserId = partner.userId;

                console.log(`MATCH FOUND: ${userId} (${userGender}) <-> ${partnerUserId} (${partner.gender})`);

                // Store match mapping
                activeMatches.set(socket.id, partnerSocketId);
                activeMatches.set(partnerSocketId, socket.id);

                // Notify YOU
                io.to(socket.id).emit("match_found", {
                    partnerId: partnerUserId,
                    partnerSocketId: partnerSocketId,
                    initiator: true
                });

                // Notify PARTNER
                io.to(partnerSocketId).emit("match_found", {
                    partnerId: userId,
                    partnerSocketId: socket.id,
                    initiator: false
                });

            } else {
                // No one waiting, add self to queue
                console.log(`User ${userId} added to queue. waiting...`);
                matchQueue.push({
                    socketId: socket.id,
                    userId,
                    gender: userGender,
                    preference: preference || 'All'
                });
            }
        });

        // --- Video Call Signaling ---
        socket.on("video_offer", (data) => {
            io.to(data.targetId).emit("video_offer", data);
        });

        socket.on("video_answer", (data) => {
            io.to(data.targetId).emit("video_answer", data);
        });

        socket.on("ice_candidate", (data) => {
            io.to(data.targetId).emit("ice_candidate", data);
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);

            // 1. Remove from Queue
            matchQueue = matchQueue.filter(u => u.socketId !== socket.id);

            // 2. Notify any active partner
            if (activeMatches.has(socket.id)) {
                const partnerSocketId = activeMatches.get(socket.id);
                if (partnerSocketId) {
                    io.to(partnerSocketId).emit("partner_disconnected");
                    activeMatches.delete(partnerSocketId);
                }
                activeMatches.delete(socket.id);
            }
        });
    });

    return io;
};
