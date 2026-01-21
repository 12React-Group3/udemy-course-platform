// udemy-backend/middleware/courseOwner.js
import { CourseDB } from "../models/index.js";

/**
 * Ensure the current user can manage the course.
 * - admin: can manage any course
 * - tutor: can manage only their own course
 *
 * Notes:
 * - Your current Course model in main does NOT store instructorId yet.
 *   So this middleware supports BOTH:
 *   1) instructorId match (future state)
 *   2) fallback: instructor name match (temporary compatibility)
 */
export async function requireCourseOwnerOrAdmin(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const courseId = req.params.courseId || req.body?.courseId;
        if (!courseId) {
            return res.status(400).json({ success: false, message: "courseId is required" });
        }

        const course = await CourseDB.findByCourseId(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        // Admin can manage anything
        if (req.user.role === "admin") {
            req.course = course;
            return next();
        }

        // Tutor: prefer instructorId check (once we add it)
        if (req.user.role === "tutor") {
            const hasInstructorId = course.instructorId && req.user.id && course.instructorId === req.user.id;
            const fallbackNameMatch = course.instructor && req.user.userName && course.instructor === req.user.userName;

            if (hasInstructorId || fallbackNameMatch) {
                req.course = course;
                return next();
            }
        }

        return res.status(403).json({
            success: false,
            message: "Forbidden: you do not have permission to manage this course",
        });
    } catch (err) {
        console.error("requireCourseOwnerOrAdmin error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
}
