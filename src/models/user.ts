import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email?: string;
  passwordHash: string;
  fullName: string;
  bio?: string;
  gender?: string;
  country?: string;
  avatar?: string;
  interests: string[];
  phone?: string;
  dateOfBirth?: Date;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  blockedUsers: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true, sparse: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true },
    bio: { type: String, default: "" },
    phone: { type: String, unique: true, sparse: true }, // Sparse allows null/unique to coexist if needed, but we aim for required for phone users
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
    country: { type: String, default: "" },
    avatar: { type: String, default: "" }, // URL to image
    interests: [{ type: String }],
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
