import { Request, Response } from "express";
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

        const normalizedPhone = phone.replace("+91", "").trim();

        console.log(`[OTP] Sending 123456 to ${normalizedPhone}`);

        // Create user if not exists
        let user = await User.findOne({ phone: normalizedPhone });

        if (!user) {
            user = new User({
                phone: normalizedPhone,
            });
            await user.save();
        }

        return res.status(200).json({
            message: "OTP sent successfully",
            otp: "123456", // dummy OTP
        });

    } catch (error) {
        console.error("SEND OTP ERROR:", error);
        return res.status(500).json({
            message: "Error sending OTP",
            error: error instanceof Error ? error.message : String(error)
        });
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

        const normalizedPhone = phone.replace("+91", "").trim();

        console.log(`VERIFY OTP: ${normalizedPhone} | OTP: ${otp}`);

        // Dummy OTP check
        if (String(otp).trim() !== "123456") {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Find user
        let user = await User.findOne({ phone: normalizedPhone });

        // If not exists → create
        if (!user) {
            console.log("Creating new user...");
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
            isNewUser: !user.fullName, // Check fullName to decide if registration needed
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
        user.bio = bio || "";
        user.avatar = avatar || "";

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
            message: "Error during registration",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};


// ================= LOGIN =================
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

        return res.status(200).json({
            message: "Login success",
            token,
            user
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        return res.status(500).json({
            message: "Login error",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
