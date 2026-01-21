import jwt from 'jsonwebtoken';
import { UserDB } from '../models/index.js';
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET_NAME } from "../config/s3.js";
import path from "path";



// generate JWT token
export const generateToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

async function attachAvatarUrl(user) {
    if (!user || !S3_BUCKET_NAME) return user;

    const key = user.profileImageKey;
    if (!key) return user;

    try {
        const cmd = new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
            ResponseContentType: "image/*",
        });
        const signedUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 60 * 60 }); // 1 hour
        return {
            ...user,
            profileImage: signedUrl,
            profileImageKey: key,
        };
    } catch (err) {
        console.error("attachAvatarUrl error for", key, err);
        return user;
    }
}

// @desc    register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
    try {
        const { userName, email, password, role } = req.body;


        // check if user already exists
        const existingUser = await UserDB.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'User already exists with this email', statusCode: 400 });
        }

        // create new user (password is hashed in UserDB.create)
        const user = await UserDB.create({
            userName,
            email,
            password,
            role
        });



        const token= generateToken(user._id, user.role);

        res.status(201).json({
            success: true,
            data: {
                user:{
                    id: user._id,
                    userName: user.userName,
                    email: user.email,
                    role: user.role,
                    profileImage: user.profileImage || null,
                    profileImageKey: user.profileImageKey || null,
                    enrolledCourses: user.enrolledCourses || [],
                },
                token
            },
            message: 'User registered successfully',

        });
    } catch (error) {
        next(error);
    }
};



// @desc    login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // validate input
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email and password', statusCode: 400 });
        }

        // check for user existence
        const user = await UserDB.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password', statusCode: 401 });
        }

        // check if password matches
        const isMatch = await UserDB.matchPassword(user, password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid email or password', statusCode: 401 });
        }

        // then user exists and password matches, generate token
        const token = generateToken(user._id, user.role);

        const hydrated = await attachAvatarUrl(user);

        res.status(200).json({
            success: true,
            user: {
                id: hydrated._id,
                userName: hydrated.userName,
                email: hydrated.email,
                role: hydrated.role,
                profileImage: hydrated.profileImage || null,
                profileImageKey: hydrated.profileImageKey || null,
                enrolledCourses: hydrated.enrolledCourses || [],
                createdAt: hydrated.createdAt,
                updatedAt: hydrated.updatedAt,
            },
            token,
            message: 'User logged in successfully',
        });
    } catch (error) {
        next(error);
    }
};





// @desc    get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res, next) => {
    try {
        const user = await UserDB.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found', statusCode: 404 });
        }

        const hydrated = await attachAvatarUrl(user);

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: hydrated._id,
                    userName: hydrated.userName,
                    email: hydrated.email,
                    role: hydrated.role,
                    profileImage: hydrated.profileImage || null,
                    profileImageKey: hydrated.profileImageKey || null,
                    enrolledCourses: hydrated.enrolledCourses || [],
                    createdAt: hydrated.createdAt,
                    updatedAt: hydrated.updatedAt,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};


// @desc    update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
    try {
        const { userName, email, profileImage, profileImageKey } = req.body;

        const updates = {};
        if (userName) updates.userName = userName;
        if (email) updates.email = email;
        if (profileImage) updates.profileImage = profileImage;
        if (profileImageKey) updates.profileImageKey = profileImageKey;

        const user = await UserDB.updateProfile(req.user.id, updates);

        const hydrated = await attachAvatarUrl(user);

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: hydrated._id,
                    userName: hydrated.userName,
                    email: hydrated.email,
                    role: hydrated.role,
                    profileImage: hydrated.profileImage || null,
                    profileImageKey: hydrated.profileImageKey || null,
                    enrolledCourses: hydrated.enrolledCourses || [],
                    createdAt: hydrated.createdAt,
                    updatedAt: hydrated.updatedAt,
                },
            },
            message: 'Profile updated successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/avatar
 * multipart/form-data { avatar: file }
 * Uploads avatar via backend to S3, updates user profileImageKey/profileImage, and returns hydrated user.
 */
export const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!S3_BUCKET_NAME) {
            return res.status(500).json({ success: false, message: "S3 bucket is not configured" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Avatar file is required" });
        }

        const file = req.file;
        const ext = path.extname(file.originalname) || "";
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9._-]/g, "");
        const safeBase = base || "avatar";
        const key = `avatars/${userId}/${Date.now()}-${safeBase}${ext}`;

        const putCmd = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
            ContentType: file.mimetype || "image/jpeg",
            Body: file.buffer,
        });

        await s3Client.send(putCmd);

        const publicUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        const updated = await UserDB.updateProfile(userId, { profileImageKey: key, profileImage: publicUrl });
        const hydrated = await attachAvatarUrl(updated);

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: hydrated._id,
                    userName: hydrated.userName,
                    email: hydrated.email,
                    role: hydrated.role,
                    profileImage: hydrated.profileImage || null,
                    profileImageKey: hydrated.profileImageKey || null,
                    enrolledCourses: hydrated.enrolledCourses || [],
                    createdAt: hydrated.createdAt,
                    updatedAt: hydrated.updatedAt,
                },
            },
            message: "Avatar updated",
        });
    } catch (err) {
        console.error("uploadAvatar error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
};


// @desc    change the user password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Please provide current and new password', statusCode: 400 });
        }

        const user = await UserDB.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found', statusCode: 404 });
        }

        // check current password matches
        const isMatch = await UserDB.matchPassword(user, currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect', statusCode: 401 });
        }

        // update to new password (hashed in updateProfile)
        await UserDB.updateProfile(req.user.id, { password: newPassword });

        res.status(200).json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        next(error);
    }
};
