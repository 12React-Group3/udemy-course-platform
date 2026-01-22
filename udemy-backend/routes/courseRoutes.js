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

// Public browsing
router.get("/", getAllCourses);

// Create course (tutor/admin only)
router.post("/", protect, createCourse);

// Presign URLs for upload
router.post("/presign-video", protect, presignVideoUpload);
router.post("/presign-thumbnail", protect, presignThumbnailUpload);

// Course by courseUid (unique identifier)
router.get("/:courseUid", getCourseByCourseId);
router.get("/:courseUid/video-url", getCourseVideoUrl);
router.get("/:courseUid/thumbnail-url", getCourseThumbnailUrl);

// Update/delete: tutor(owner) or admin
router.put("/:courseUid", protect, tutorOrAdmin, updateCourse);
router.delete("/:courseUid", protect, tutorOrAdmin, deleteCourse);

// Subscribe/unsubscribe: learner only
router.post("/:courseUid/subscribe", protect, learnerOnly, subscribeCourse);
router.post("/:courseUid/unsubscribe", protect, learnerOnly, unsubscribeCourse);

export default router;
