// routes/courseRoutes.js
import express from "express";
import {
  getAllCourses,
  createCourse,
  presignVideoUpload,
  getCourseVideoUrl,
  getCourseByCourseId,
  subscribeCourse,
  unsubscribeCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";
import protect from "../middleware/auth.js";
import { tutorOrAdmin, learnerOnly  } from "../middleware/authorize.js";

const router = express.Router();

router.get("/", getAllCourses);
router.post("/", protect, tutorOrAdmin, createCourse);
router.post("/presign-video", protect, tutorOrAdmin, presignVideoUpload);

router.get("/:courseId/video-url", getCourseVideoUrl);
router.get("/:courseId", getCourseByCourseId);

router.post("/:courseId/subscribe", protect, subscribeCourse);
router.post("/:courseId/unsubscribe", protect, unsubscribeCourse);

router.put("/:courseId", protect, tutorOrAdmin, updateCourse);
router.delete("/:courseId", protect, tutorOrAdmin, deleteCourse);

router.post("/:courseId/subscribe", protect, learnerOnly, subscribeCourse);
router.post("/:courseId/unsubscribe", protect, learnerOnly, unsubscribeCourse);

export default router;
