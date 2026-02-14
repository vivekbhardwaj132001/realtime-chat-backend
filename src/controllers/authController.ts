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

        console.log(`Verifying OTP for ${normalizedPhone}`);

        if (String(otp).trim() !== "123456") {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // 1. Find or Create User (Minimal)
        let user = await User.findOne({ phone: normalizedPhone });
        let isNewUser = false;

        if (!user) {
            // Create new user with ONLY phone
            user = new User({ phone: normalizedPhone });
            await user.save();
            isNewUser = true;
            console.log(`Created new user: ${user._id}`);
        } else {
            // Check if profile is complete (username/fullName required)
            if (!user.fullName || !user.username) {
                isNewUser = true;
            }
        }

        // 2. Generate Token
        const token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // 3. Return Response
        return res.status(200).json({
            message: "OTP verified",
            token,
            isNewUser,
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

// ================= REGISTER (UPDATE PROFILE) =================
export const register = async (req: Request, res: Response) => {
    try {
        const {
            phone,
            fullName,
            username,
            gender,
            country,
            bio,
            avatar,
            email
        } = req.body;

        if (!phone) {
            return res.status(400).json({ message: "Phone required" });
        }

        // Validate Required Fields
        if (!fullName || !username || !gender || !country) {
            return res.status(400).json({ message: "Missing required fields: fullName, username, gender, country" });
        }

        const normalizedPhone = phone.replace("+91", "").trim();
        const user = await User.findOne({ phone: normalizedPhone });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check Uniqueness (username, email)
        const existingUsername = await User.findOne({ username, _id: { $ne: user._id } });
        if (existingUsername) return res.status(400).json({ message: "Username taken" });

        if (email) {
            const existingEmail = await User.findOne({ email, _id: { $ne: user._id } });
            if (existingEmail) return res.status(400).json({ message: "Email taken" });
        }

        // Update Profile
        user.fullName = fullName;
        user.username = username;
        user.gender = gender;
        user.country = country;
        if (email) user.email = email;
        if (bio) user.bio = bio;
        if (avatar) user.avatar = avatar;

        await user.save();

        // Re-issue token (optional, but good practice)
        const token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Registration successful",
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
