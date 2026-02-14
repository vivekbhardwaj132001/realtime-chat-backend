import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

// ================= SEND OTP =================
export const sendOtp = async (req: Request, res: Response) => {
    try {
        const phone = req.body.phone || req.body.phoneNumber;

        if (!phone) {
            return res.status(400).json({ message: "Phone number required" });
        }

        // Normalize phone (remove +91)
        const normalizedPhone = phone.replace("+91", "").trim();

        console.log(`[OTP] Sending 123456 to ${normalizedPhone}`);

        // Check user
        let user = await User.findOne({ phone: normalizedPhone });

        if (!user) {
            // Create temporary user
            user = new User({
                phone: normalizedPhone,
            });
            await user.save();
        }

        return res.status(200).json({
            message: "OTP sent successfully",
            otp: "123456", // dummy
        });

    } catch (error) {
        console.error("sendOtp error:", error);
        return res.status(500).json({ message: "Error sending OTP" });
    }
};

// ================= VERIFY OTP =================
export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const phone = req.body.phone || req.body.phoneNumber;
        const otp = req.body.otp;

        if (!phone || !otp) {
            return res.status(400).json({ message: "Phone and OTP required" });
        }

        // Normalize phone
        const normalizedPhone = phone.replace("+91", "").trim();

        console.log(`Verifying OTP for ${normalizedPhone}`);

        // Always accept dummy OTP
        if (String(otp).trim() !== "123456") {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Find user
        let user = await User.findOne({ phone: normalizedPhone });

        if (!user) {
            // create if not exists (important fix)
            user = new User({
                phone: normalizedPhone,
            });
            await user.save();
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "OTP verified",
            token,
            isNewUser: !user.username, // if no profile
            user
        });

    } catch (error) {
        console.error("VERIFY OTP ERROR:", error);
        return res.status(500).json({
            message: "Error verifying OTP",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// ================= REGISTER =================
export const register = async (req: Request, res: Response) => {
    try {
        const {
            username,
            fullName,
            gender,
            country,
            phone,
            bio,
            avatar
        } = req.body;

        if (!phone) {
            return res.status(400).json({ message: "Phone required" });
        }

        const normalizedPhone = phone.replace("+91", "").trim();

        let user = await User.findOne({ phone: normalizedPhone });

        if (!user) {
            return res.status(404).json({ message: "User not found. Verify OTP first." });
        }

        // Update profile
        user.username = username;
        user.fullName = fullName;
        user.gender = gender;
        user.country = country;
        user.bio = bio;
        user.avatar = avatar;

        await user.save();

        const token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Registration complete",
            token,
            user
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
        return res.status(500).json({
            message: "Error during registration"
        });
    }
};

// ================= LOGIN (OPTIONAL) =================
export const login = async (req: Request, res: Response) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: "Phone required" });
        }

        const normalizedPhone = phone.replace("+91", "").trim();

        const user = await User.findOne({ phone: normalizedPhone });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({ token, user });

    } catch (error) {
        return res.status(500).json({ message: "Login error" });
    }
};
