/**
 * Task Routes
 *
 * GET    /api/tasks                    - Get all tasks (role-based)
 * GET    /api/tasks/my-submissions     - Get current user's submissions
 * GET    /api/tasks/course/:courseId   - Get tasks for a course
 * GET    /api/tasks/:taskId            - Get task by ID with questions
 * POST   /api/tasks                    - Create task with questions (tutor only)
 * PUT    /api/tasks/:taskId            - Update task (tutor only)
 * DELETE /api/tasks/:taskId            - Delete task (tutor only)
 *
 * POST   /api/tasks/:taskId/questions              - Add question to task
 * PUT    /api/tasks/:taskId/questions/:questionId  - Update question
 * DELETE /api/tasks/:taskId/questions/:questionId  - Delete question
 *
 * POST   /api/tasks/:taskId/submit     - Submit task answers (learner)
 * GET    /api/tasks/:taskId/records    - Get task submissions (tutor)
 */

import express from 'express';
import {
  getAllTasks,
  getTasksByCourse,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  submitTask,
  getTaskRecords,
  getMySubmissions,
} from '../controllers/taskController.js';
import protect from '../middleware/auth.js';
import { tutorOrAdmin } from '../middleware/authorize.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Task routes
router.get('/', getAllTasks);
router.get('/my-submissions', getMySubmissions);
router.get('/course/:courseId', getTasksByCourse);
router.get('/:taskId', getTaskById);

// Tutor-only routes for task management
router.post('/', tutorOrAdmin, createTask);
router.put('/:taskId', tutorOrAdmin, updateTask);
router.delete('/:taskId', tutorOrAdmin, deleteTask);

// Question management (tutor only)
router.post('/:taskId/questions', tutorOrAdmin, addQuestion);
router.put('/:taskId/questions/:questionId', tutorOrAdmin, updateQuestion);
router.delete('/:taskId/questions/:questionId', tutorOrAdmin, deleteQuestion);

// Submission routes
router.post('/:taskId/submit', submitTask);
router.get('/:taskId/records', tutorOrAdmin, getTaskRecords);

export default router;
