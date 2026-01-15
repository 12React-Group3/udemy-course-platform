import Course from "../models/Course.js";

/**
 * POST /api/courses
 * Create a course
 */
export async function createCourse(req, res) {
  try {
    const {
      courseId,
      title,
      description,
      videoURL,
      instructor,
      courseTag
    } = req.body;

    if (!courseId || !title || !instructor) {
      return res.status(400).json({
        success: false,
        message: "courseId, title, and instructor are required"
      });
    }

    const existing = await Course.findOne({ courseId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Course already exists"
      });
    }

    const course = await Course.create({
      courseId,
      title,
      description,
      videoURL,
      instructor,
      courseTag,
      students: []
    });

    return res.status(201).json({
      success: true,
      data: course
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}

/**
 * GET /api/courses/:courseId
 * CoursePage fetch
 */
export async function getCourseByCourseId(req, res) {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({ courseId }).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: course
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Invalid request"
    });
  }
}

/**
 * GET /api/courses
 * Get all courses (for dashboard / list page)
 */
export async function getAllCourses(req, res) {
  try {
    const courses = await Course.find().lean();

    return res.status(200).json({
      success: true,
      data: courses
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}
