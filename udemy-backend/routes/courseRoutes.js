// routes/courseRoutes.js
import express from "express";
import {
  getAllCourses,
  createCourse,
  presignVideoUpload,
  presignThumbnailUpload,
  getCourseVideoUrl,
  getCourseThumbnailUrl,
  getCourseByCourseId,
  subscribeCourse,
  unsubscribeCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";
import protect from "../middleware/auth.js";
import { tutorOrAdmin, learnerOnly } from "../middleware/authorize.js";

const router = express.Router();

// Public browsing (or keep public for now)
router.get("/", getAllCourses);

// Create + uploads: tutor/admin only
router.post("/", protect, tutorOrAdmin, createCourse);
router.post("/presign-video", protect, tutorOrAdmin, presignVideoUpload);
router.post("/presign-thumbnail", protect, tutorOrAdmin, presignThumbnailUpload);
router.get("/:courseId/thumbnail-url", getCourseThumbnailUrl);

// Course read
router.get("/:courseId/video-url", getCourseVideoUrl);
router.get("/:courseId", getCourseByCourseId);

// Subscribe/unsubscribe: learner only (single definition!)

// Update/delete: tutor(owner) or admin (controller also checks ownership)
router.put("/:courseId", protect, tutorOrAdmin, updateCourse);
router.delete("/:courseId", protect, tutorOrAdmin, deleteCourse);

router.post("/:courseId/subscribe", protect, learnerOnly, subscribeCourse);
router.post("/:courseId/unsubscribe", protect, learnerOnly, unsubscribeCourse);

export default router;
