// ... existing imports
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user";

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_change_me";

// Mock OTP for now
export const sendOtp = async (req: Request, res: Response) => {
    try {
        console.log("sendOtp body:", req.body);
        const phone = req.body.phone || req.body.phoneNumber;

        if (!phone) {
            res.status(400).json({ message: "Phone number required" });
            return;
        }

        // ALWAYS succeed for now with dummy OTP
        console.log(`[DUMMY OTP] Sending 123456 to ${phone}`);

        // Return the dummy OTP in the response for easier debugging/autofill if needed
        res.json({
            message: "OTP sent successfully",
            success: true,
            otp: "123456" // Explicitly returning it can help frontend dev
        });
    } catch (error) {
        console.error("Error in sendOtp:", error);
        res.status(500).json({ message: "Error sending OTP", error: String(error) });
    }
};

export const verifyOtp = async (req: Request, res: Response) => {
    try {
        console.log("verifyOtp called. Body:", req.body);
        const { otp } = req.body;
        const phone = req.body.phone || req.body.phoneNumber;

        if (!phone) {
            console.log("verifyOtp: Phone missing");
            res.status(400).json({ message: "Phone number required" });
            return;
        }

        console.log(`verifyOtp: Verifying ${otp} for ${phone}`);

        if (String(otp).trim() !== "123456") {
            console.log("verifyOtp: Invalid OTP");
            res.status(400).json({ message: "Invalid OTP" });
            return;
        }

        console.log("verifyOtp: Finding user...");
        const user = await User.findOne({ phone });
        console.log("verifyOtp: User found?", user ? "Yes" : "No");

        if (user) {
            try {
                console.log("verifyOtp: Signing token...");
                const token = jwt.sign(
                    { userId: user._id, username: user.username },
                    JWT_SECRET,
                    { expiresIn: "7d" }
                );
                console.log("verifyOtp: Token signed");

                res.json({
                    token,
                    isNewUser: false,
                    user: {
                        id: user._id,
                        username: user.username,
                        fullName: user.fullName,
                        email: user.email,
                        avatar: user.avatar,
                        phone: user.phone,
                        gender: user.gender,
                        dateOfBirth: user.dateOfBirth
                    }
                });
            } catch (jwtError) {
                console.error("verifyOtp: JWT Error", jwtError);
                throw jwtError;
            }
        } else {
            console.log("verifyOtp: New user flow");
            res.json({
                isNewUser: true,
                message: "User not found, please register",
                phone
            });
        }
    } catch (error) {
        console.error("Critical Error verifiesOtp:", error);
        res.status(500).json({
            message: "Error verifying OTP",
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password, fullName, gender, country, phone, bio, avatar, dateOfBirth } = req.body;

        // Check existing
        const existingUser = await User.findOne({ $or: [{ email }, { username }, { phone }] });
        if (existingUser) {
            res.status(400).json({ message: "User with this email, username or phone already exists" });
            return;
        }

        // Hash password (even if phone auth, having a password is good fallback, or generate random)
        // Passing salt rounds (10) directly to hash function to avoid type issues
        const passwordHash = await bcrypt.hash(password || "dummy_password_for_phone_user", 10);

        const newUser = new User({
            username,
            email: email || `${phone}@placeholder.com`, // Fallback if email not collected
            passwordHash,
            fullName,
            gender: gender ? gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase() : "",
            country,
            phone,
            bio: bio || "",
            avatar: avatar || "",
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
        });

        await newUser.save();

        // Generate token immediately for seamless flow
        const token = jwt.sign(
            { userId: newUser._id, username: newUser.username },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({ message: "User registered successfully", token, user: newUser });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: "Server error during registration" });
    }
};

export const login = async (req: Request, res: Response) => {
    // ... existing email/pass login logic if needed ...
    // keeping it for fallback
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user });
    } catch (e) {
        res.status(500).json({ message: "Login error" });
    }
};
