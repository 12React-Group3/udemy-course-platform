import express from 'express';
import { body } from 'express-validator';
import { login } from '../controllers/authController.js';



const router = express.Router();

const loginValidation = [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
]


// publich routes
router.post("/login",loginValidation,login);