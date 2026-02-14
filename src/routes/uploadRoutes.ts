import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        const uploadPath = path.join(__dirname, "../../uploads");
        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req: any, file: any, cb: any) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Only images are allowed!"));
    }
});

// Upload endpoint
router.post("/", upload.single("image"), (req: Request, res: Response) => {
    try {
        if (!(req as any).file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        // Construct URL
        const protocol = req.protocol;
        const host = req.get("host"); // e.g., 192.168.1.40:5001
        const imageUrl = `${protocol}://${host}/uploads/${(req as any).file.filename}`;

        res.json({
            message: "Image uploaded successfully",
            imageUrl
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Image upload failed" });
    }
});

export default router;
