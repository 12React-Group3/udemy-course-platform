import express from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { login, register, getProfile, updateProfile, changePassword } from '../controllers/authController.js';
import protect from '../middleware/auth.js';


const router = express.Router();

// disk storage for avatars to avoid large JSON payloads
const avatarDir = path.join(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(avatarDir, { recursive: true });

const storage = multer.diskStorage({
    destination: avatarDir,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext);
        const safeBase = base.replace(/[^a-zA-Z0-9_-]/g, '');
        cb(null, `${safeBase || 'avatar'}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});


const loginValidation = [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
]

const registerValidation=[
    body('userName').trim().isLength({min:3}).withMessage('Username must be at least 3 characters long'),
    body('email').isEmail().withMessage('Please provide a valid email address'),
    body('password').isLength({min:6}).withMessage('Password must be at least 6 characters long'),
    body('role').isIn(['admin','learner']).withMessage('Role must be either admin or learner')
];

// public routes
router.post("/login",loginValidation,login);
router.post("/register",upload.single('avatar'),registerValidation,register);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
export default router;