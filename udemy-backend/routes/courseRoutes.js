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

const router = express.Router();

router.get("/", getAllCourses);
router.post("/", createCourse);
router.post("/presign-video", presignVideoUpload);
router.get("/:courseId/video-url", getCourseVideoUrl);
router.get("/:courseId", getCourseByCourseId);
router.post("/:courseId/subscribe", protect, subscribeCourse);
router.post("/:courseId/unsubscribe", protect, unsubscribeCourse);
router.put("/:courseId", protect, updateCourse);
router.delete("/:courseId", protect, deleteCourse);

export default router;
