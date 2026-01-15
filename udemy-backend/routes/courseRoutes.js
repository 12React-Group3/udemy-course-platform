import { Router } from "express";
import {
  createCourse,
  getCourseByCourseId,
  getAllCourses
} from "../controllers/courseController.js";

const router = Router();

// Get all courses
router.get("/", getAllCourses);

// Create course (for testing)
router.post("/", createCourse);

// CoursePage API
router.get("/:courseId", getCourseByCourseId);

export default router;
