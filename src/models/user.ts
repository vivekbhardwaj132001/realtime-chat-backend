import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username?: string;
  email?: string;
  passwordHash?: string;
  fullName?: string;
  bio?: string;
  gender?: string;
  country?: string;
  avatar?: string;
  phone: string;
  dateOfBirth?: Date;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  blockedUsers: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    const UserSchema: Schema = new Schema(
      {
        username: { type: String, unique: true, trim: true, sparse: true }, // Optional, sparse
        email: { type: String, unique: true, lowercase: true, trim: true, sparse: true }, // Optional, sparse
        passwordHash: { type: String }, // Optional
        fullName: { type: String }, // Optional
        bio: { type: String, default: "" },
        phone: { type: String, required: true, unique: true }, // REQUIRED
        dateOfBirth: { type: Date },
        gender: { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
        country: { type: String, default: "" },
        avatar: { type: String, default: "" }, // URL to image
        followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
        following: [{ type: Schema.Types.ObjectId, ref: "User" }],
        blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
      { timestamps: true }
    );

    export const User = mongoose.model<IUser>("User", UserSchema);
