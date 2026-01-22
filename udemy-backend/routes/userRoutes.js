import express from 'express';
import {
  getAllUsers,
  deleteUser,
  updateUserRole,
  getMyStudents,
} from '../controllers/userController.js';
import protect from '../middleware/auth.js';
import { adminOnly, tutorOnly } from '../middleware/authorize.js';

const router = express.Router();

// Admin routes
router.get('/', protect, adminOnly, getAllUsers);
router.delete('/:userId', protect, adminOnly, deleteUser);
router.put('/:userId/role', protect, adminOnly, updateUserRole);

// Tutor routes
router.get('/my-students', protect, tutorOnly, getMyStudents);

export default router;
