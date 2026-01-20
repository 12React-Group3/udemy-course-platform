// routes/courseRoutes.js
import express from "express";
import {
  getAllCourses,
  createCourse,
  presignVideoUpload,
  getCourseVideoUrl,
  getCourseByCourseId,
} from "../controllers/courseController.js";

const router = express.Router();

router.get("/", getAllCourses);
router.post("/", createCourse);
router.post("/presign-video", presignVideoUpload);
router.get("/:courseId/video-url", getCourseVideoUrl);
router.get("/:courseId", getCourseByCourseId);

export default router;
