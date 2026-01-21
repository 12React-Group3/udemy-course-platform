import jwt from 'jsonwebtoken';
import { UserDB } from '../models/index.js';



// generate JWT token
export const generateToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
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

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                userName: user.userName,
                email: user.email,
                role: user.role,
                enrolledCourses: user.enrolledCourses || [],
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

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    userName: user.userName,
                    email: user.email,
                    role: user.role,
                    profileImage: user.profileImage || null,
                    enrolledCourses: user.enrolledCourses || [],
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
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
        const { userName, email, profileImage } = req.body;

        const updates = {};
        if (userName) updates.userName = userName;
        if (email) updates.email = email;
        if (profileImage) updates.profileImage = profileImage;

        const user = await UserDB.updateProfile(req.user.id, updates);

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                userName: user.userName,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage || null,
            },
            message: 'Profile updated successfully',
        });
    } catch (error) {
        next(error);
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
