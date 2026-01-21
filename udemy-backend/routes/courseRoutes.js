// routes/courseRoutes.js
import express from "express";
import {
  getAllCourses,
  createCourse,
  presignVideoUpload,
  getCourseVideoUrl,
  getCourseByCourseId,
} from "../controllers/courseController.js";

import protect from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import taskRoutes from "./taskRoutes.js";

const router = express.Router();

router.get("/", getAllCourses);

// Tutor/Admin only
router.post("/", protect, authorize("tutor", "admin"), createCourse);

// Tutor/Admin only for presign upload
router.post("/presign-video", protect, authorize("tutor", "admin"), presignVideoUpload);

// Playback requires login
router.get("/:courseId/video-url", protect, getCourseVideoUrl);

// Tasks nested under courseId
router.use("/:courseId/tasks", protect, taskRoutes);

router.get("/:courseId", getCourseByCourseId);

export default router;
