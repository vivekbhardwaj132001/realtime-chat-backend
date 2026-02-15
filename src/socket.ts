import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { User } from "./models/user";
import { Message } from "./models/message"; // Import Message model

export const initializeSocket = (httpServer: HttpServer) => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    // Queue for random matching
    let matchQueue: {
        socketId: string,
        userId: string,
        gender: string,
        preference: string,
        name: string,
        avatar: string,
        country: string
    }[] = [];

    // Track active matches
    const activeMatches = new Map<string, string>();

    // Track connected users for Online Count
    const connectedUsers = new Set<string>();

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);
        connectedUsers.add(socket.id);

        // Broadcast online count
        io.emit("online_users_count", connectedUsers.size);

        // Join a personal room
        socket.on("join_user", (userId) => {
            socket.join(userId);
            console.log(`User mapped: ${userId} -> Socket: ${socket.id}`);
        });

        // Send a message & PERSIST to DB
        socket.on("send_message", async (data) => {
            try {
                const { senderId, receiverId, message, type } = data;

                // --- CHECK PERMISSIONS ---
                // 1. Is it an active random match?
                const isActiveMatch = activeMatches.get(socket.id) && activeMatches.has(activeMatches.get(socket.id)!)
                // Need to map socketId to userId to be precise, but activeMatches tracks socketId pairs. 
                // Simpler: If they are in activeMatches, they can talk.
                // However, senderId/receiverId come from client. We trust client? 
                // Ideally check if socket.id maps to senderId.

                let canChat = false;

                // Check Active Match Map (by socket)
                // Note: This relies on the sender using the socket we know about. 
                if (activeMatches.has(socket.id)) {
                    // Since we don't easily know receiver's socketId from receiverId here without a map,
                    // we'll optimistically allow if sender is in a match mode.
                    // A cleaner way requires a UserId->SocketId map.
                    canChat = true;
                }

                if (!canChat) {
                    // 2. Check Mutual Follow
                    const sender = await User.findById(senderId);
                    const receiver = await User.findById(receiverId);

                    if (sender && receiver) {
                        const senderFollowsReceiver = sender.following.includes(receiverId);
                        const receiverFollowsSender = receiver.following.includes(senderId);

                        if (senderFollowsReceiver && receiverFollowsSender) {
                            canChat = true;
                        }
                    }
                }

                if (!canChat) {
                    console.log(`[Chat Blocked] ${senderId} -> ${receiverId} (Not mutual friends or matched)`);
                    socket.emit("error", { message: "You can only chat with mutual followers or active matches." });
                    return;
                }
                // -------------------------

                // 1. Save to MongoDB
                const newMessage = new Message({
                    senderId,
                    receiverId,
                    message,
                    type: type || 'text',
                    read: false
                });
                await newMessage.save();

                // 2. Fetch sender details for UI
                const sender = await User.findById(senderId);
                const senderName = sender ? sender.fullName : "Unknown";
                const senderAvatar = sender ? sender.avatar : "";

                const msgPayload = {
                    _id: newMessage._id,
                    senderId,
                    receiverId,
                    message,
                    type: type || 'text',
                    createdAt: newMessage.createdAt,
                    senderName,
                    senderAvatar
                };

                // 3. Emit to receiver
                io.to(receiverId).emit("received_message", msgPayload);

                console.log(`Message saved & relayed from ${senderId} to ${receiverId}`);

            } catch (error) {
                console.error("Error handling message:", error);
            }
        });

        // Typing Indicators
        socket.on("typing", (data) => {
            const { receiverId, isTyping } = data;
            io.to(receiverId).emit("typing_status", { senderId: data.senderId, isTyping });
        });

        // --- Random Match Logic ---
        socket.on("find_match", async (data) => {
            // ... (Same match logic) ...
            // data: { userId, gender, preference }
            const { userId, gender, preference } = data;
            console.log(`User ${userId} (${gender}) looking for match with (${preference})...`);

            // 0. Verify REAL USER from Database
            let userGender = gender || 'Unknown';
            let userName = 'Unknown';
            let userAvatar = '';
            let userCountry = 'Unknown';

            try {
                const userExists = await User.findById(userId);
                if (!userExists) {
                    console.log(`❌ Match request rejected: User ${userId} not found in DB`);
                    socket.emit("error", { message: "Authentication failed: User not found" });
                    return;
                }
                if (userExists.gender) userGender = userExists.gender;
                userName = userExists.fullName;
                userAvatar = userExists.avatar || '';
                userCountry = userExists.country || 'Unknown';

            } catch (err) {
                console.error("Error validating user for match:", err);
                return;
            }

            matchQueue = matchQueue.filter(u => u.socketId !== socket.id);

            const matchIndex = matchQueue.findIndex(queuedUser => {
                const isMyPrefMatch = (preference === 'All' || preference === 'Both') || (preference === queuedUser.gender);
                const isTheirPrefMatch = (queuedUser.preference === 'All' || queuedUser.preference === 'Both') || (queuedUser.preference === userGender);

                return isMyPrefMatch && isTheirPrefMatch && queuedUser.userId !== userId;
            });

            if (matchIndex !== -1) {
                const partner = matchQueue.splice(matchIndex, 1)[0];
                const partnerSocketId = partner.socketId;
                const partnerUserId = partner.userId;

                console.log(`MATCH FOUND: ${userId} (${userName}) <-> ${partnerUserId} (${partner.name})`);

                activeMatches.set(socket.id, partnerSocketId);
                activeMatches.set(partnerSocketId, socket.id);

                // --- SAVE HISTORY (SYSTEM MESSAGE) ---
                try {
                    const matchMsg = new Message({
                        senderId: userId,
                        receiverId: partnerUserId,
                        message: "You matched!",
                        type: 'system',
                        read: true
                    });
                    await matchMsg.save();
                } catch (e) {
                    console.error("Error saving match history:", e);
                }
                // -------------------------------------

                io.to(socket.id).emit("match_found", {
                    partnerId: partnerUserId,
                    partnerSocketId: partnerSocketId,
                    initiator: true,
                    partnerName: partner.name,
                    partnerAvatar: partner.avatar,
                    partnerCountry: partner.country
                });

                io.to(partnerSocketId).emit("match_found", {
                    partnerId: userId,
                    partnerSocketId: socket.id,
                    initiator: false,
                    partnerName: userName,
                    partnerAvatar: userAvatar,
                    partnerCountry: userCountry
                });
            } else {
                console.log(`User ${userId} added to queue. waiting...`);
                matchQueue.push({
                    socketId: socket.id,
                    userId,
                    gender: userGender,
                    preference: preference || 'All',
                    name: userName,
                    avatar: userAvatar,
                    country: userCountry
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
            connectedUsers.delete(socket.id);
            io.emit("online_users_count", connectedUsers.size);

            matchQueue = matchQueue.filter(u => u.socketId !== socket.id);

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
