import jwt from 'jsonwebtoken';
import { UserDB } from '../models/dynamodb.js';


const protect = async (req, res, next) => {
    let token;

    // check if token exists in headers

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await UserDB.findById(decoded.id);

            if (!user) {
                return res.status(401).json({ success: false, error: 'User not found', statusCode: 401 });
            }

            // Set user without password
            req.user = {
                id: user._id,
                userName: user.userName,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage,
            };

            next();
        } catch (error) {
            console.error("Auth middleware error:", error.message);
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({ success: false, error: "Token expired", statusCode: 401 });
            }
            if (error.name === "JsonWebTokenError") {
                return res.status(401).json({ success: false, error: "Invalid token", statusCode: 401 });
            }


            return res.status(401).json({ success: false, error: 'Not authorized, token failed', statusCode: 401 });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Not authorized, no token', statusCode: 401 });
    }
};

export default protect;