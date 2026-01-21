// routes/taskRoutes.js
// Mounted at: /api/courses/:courseId/tasks

import express from "express";
import { authorize } from "../middleware/authorize.js";
import { requireCourseOwnerOrAdmin } from "../middleware/courseOwner.js";

import {
    listCourseTasks,
    createTask,
    updateTask,
    setTaskPublishState,
    setTaskLockState,
    getTaskOverview,
    getTaskForTaking,
    startTaskAttempt,
    saveTaskProgress,
    submitTaskAttempt,
} from "../controllers/taskController.js";

const router = express.Router({ mergeParams: true });

// -----------------------------
// Learner-facing (login required)
// -----------------------------
router.get("/", listCourseTasks);
router.get("/:taskId/overview", getTaskOverview);
router.get("/:taskId/take", getTaskForTaking);

router.post("/:taskId/start", startTaskAttempt);
router.post("/:taskId/save", saveTaskProgress);
router.post("/:taskId/submit", submitTaskAttempt);

// -----------------------------
// Tutor/Admin management
// -----------------------------
router.post("/", authorize("tutor", "admin"), requireCourseOwnerOrAdmin, createTask);

router.patch("/:taskId", authorize("tutor", "admin"), requireCourseOwnerOrAdmin, updateTask);

router.patch("/:taskId/publish", authorize("tutor", "admin"), requireCourseOwnerOrAdmin, setTaskPublishState);

router.patch("/:taskId/lock", authorize("tutor", "admin"), requireCourseOwnerOrAdmin, setTaskLockState);

export default router;
