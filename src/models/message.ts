
import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    senderId: string;
    receiverId: string;
    message: string;
    type: 'text' | 'image' | 'video' | 'audio';
    read: boolean;
    createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        senderId: { type: String, required: true },
        receiverId: { type: String, required: true },
        message: { type: String, required: true },
        type: { type: String, enum: ['text', 'image', 'video', 'audio'], default: 'text' },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const Message = mongoose.model<IMessage>('Message', messageSchema);
