// controllers/courseController.js
import { CourseDB, UserDB } from "../models/index.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET_NAME } from "../config/s3.js";

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

/**
 * POST /api/courses/presign-video
 * Body: { courseId, fileName, contentType }
 */
export async function presignVideoUpload(req, res) {
  try {
    const { courseId, fileName, contentType } = req.body || {};

    if (!courseId || !fileName || !contentType) {
      return res.status(400).json({
        success: false,
        message: "courseId, fileName, contentType are required",
      });
    }

    if (contentType !== "video/mp4") {
      return res.status(400).json({
        success: false,
        message: "Only video/mp4 is allowed",
      });
    }

    if (!S3_BUCKET_NAME) {
      return res.status(500).json({
        success: false,
        message: "S3 bucket is not configured",
      });
    }

    const safeCourseId = String(courseId).replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `courses/${safeCourseId}/${Date.now()}-${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: "video/mp4",
    });

    const uploadUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 60 * 5 });
    const fileUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return res.status(200).json({
      success: true,
      data: { uploadUrl, fileUrl, key },
    });
  } catch (err) {
    console.error("presignVideoUpload error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
}

/**
 * GET /api/courses
 */
export async function getAllCourses(req, res) {
  try {
    const courses = await CourseDB.findAll();
    return res.status(200).json({ success: true, data: courses });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/courses
 */
export async function createCourse(req, res) {
  try {
    const { courseId, title, description, instructor, courseTag, videoURL, videoKey } = req.body || {};

    if (!courseId || !title) {
      return res.status(400).json({
        success: false,
        message: "courseId and title are required",
      });
    }

    // Backward-compatible default: if auth middleware ran, prefer req.user
    const actor = req.user || null;
    const actorRole = (actor?.role || "").toLowerCase();

    // Tutors can only create courses under their own instructor name
    const effectiveInstructor =
      actorRole === "tutor"
        ? actor.userName
        : (instructor || actor?.userName);

    if (!effectiveInstructor) {
      return res.status(400).json({
        success: false,
        message: "instructor is required",
      });
    }

    const existing = await CourseDB.findByCourseId(courseId);
    if (existing) {
      return res.status(409).json({ success: false, message: "Course already exists" });
    }

    const course = await CourseDB.create({
      courseId,
      title,
      description: description || "",
      videoURL: videoURL || "",
      videoKey: videoKey || "",
      instructor: effectiveInstructor,
      courseTag: courseTag || "",
      students: [],
      isHidden: false, // default visible
    });

    return res.status(201).json({ success: true, data: course });
  } catch (err) {
    console.error("createCourse error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

/**
 * GET /api/courses/:courseId
 */
export async function getCourseByCourseId(req, res) {
  try {
    const { courseId } = req.params;
    const course = await CourseDB.findByCourseId(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    return res.status(200).json({ success: true, data: course });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/courses/:courseId/video-url
 */
export async function getCourseVideoUrl(req, res) {
  try {
    const { courseId } = req.params;

    const course = await CourseDB.findByCourseId(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (!course.videoKey) {
      return res.status(400).json({ success: false, message: "No videoKey on course" });
    }

    const cmd = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: course.videoKey,
    });

    const signedUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 60 * 5 });
    return res.status(200).json({ success: true, data: { signedUrl } });
  } catch (err) {
    console.error("getCourseVideoUrl error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

/**
 * POST /api/courses/:courseId/subscribe
 */
export async function subscribeCourse(req, res) {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;
    const role = (req.user?.role || "").toLowerCase();

    if (role !== "learner") {
      return res.status(403).json({ success: false, message: "Only learners can subscribe" });
    }

    const user = await UserDB.findById(userId);
    const course = await CourseDB.findByCourseId(courseId);

    if (!user || !course) {
      return res.status(404).json({ success: false, message: "User or course not found" });
    }

    // 1) update user.enrolledCourses
    const enrolled = new Set(user.enrolledCourses || []);
    enrolled.add(courseId);

    // 2) update course.students
    const students = new Set(course.students || []);
    students.add(userId);

    const [updatedUser, updatedCourse] = await Promise.all([
      UserDB.updateProfile(userId, { enrolledCourses: Array.from(enrolled) }),
      CourseDB.update(courseId, { students: Array.from(students) }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(updatedUser),
        course: updatedCourse,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

/**
 * POST /api/courses/:courseId/unsubscribe
 */
export async function unsubscribeCourse(req, res) {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;
    const role = (req.user?.role || "").toLowerCase();

    if (role !== "learner") {
      return res.status(403).json({ success: false, message: "Only learners can unsubscribe" });
    }

    const user = await UserDB.findById(userId);
    const course = await CourseDB.findByCourseId(courseId);

    if (!user || !course) {
      return res.status(404).json({ success: false, message: "User or course not found" });
    }

    // 1) update user.enrolledCourses
    const enrolled = new Set(user.enrolledCourses || []);
    enrolled.delete(courseId);

    // 2) update course.students
    const students = new Set(course.students || []);
    students.delete(userId);

    const [updatedUser, updatedCourse] = await Promise.all([
      UserDB.updateProfile(userId, { enrolledCourses: Array.from(enrolled) }),
      CourseDB.update(courseId, { students: Array.from(students) }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(updatedUser),
        course: updatedCourse,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

/**
 * PUT /api/courses/:courseId
 */
export async function updateCourse(req, res) {
  try {
    const { courseId } = req.params;

    const {
      title,
      description,
      videoURL,
      videoKey,
      courseTag,
      instructor,
      students,
      isHidden,
    } = req.body || {};

    // Load course first (also used for ownership checks)
    const course = await CourseDB.findByCourseId(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const actor = req.user || null;
    const role = (actor?.role || "").toLowerCase();

    // Authorization: admin can manage all; tutor can manage own courses
    const isOwnerTutor =
      role === "tutor" &&
      actor?.userName &&
      course?.instructor &&
      String(course.instructor).toLowerCase() === String(actor.userName).toLowerCase();

    if (!(role === "admin" || isOwnerTutor)) {
      return res.status(403).json({ success: false, message: "Not allowed to update this course" });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (videoURL !== undefined) updates.videoURL = videoURL;
    if (videoKey !== undefined) updates.videoKey = videoKey;
    if (courseTag !== undefined) updates.courseTag = courseTag;

    // isHidden toggle: allow tutor(owner) and admin
    if (isHidden !== undefined) updates.isHidden = isHidden === true;

    // Only admin can change these sensitive fields (kept for backward compatibility)
    if (role === "admin") {
      if (instructor !== undefined) updates.instructor = instructor;
      if (students !== undefined) updates.students = students;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    const updated = await CourseDB.update(courseId, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("updateCourse error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

/**
 * DELETE /api/courses/:courseId
 */
export async function deleteCourse(req, res) {
  try {
    const { courseId } = req.params;

    const course = await CourseDB.findByCourseId(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const actor = req.user || null;
    const role = (actor?.role || "").toLowerCase();

    const isOwnerTutor =
      role === "tutor" &&
      actor?.userName &&
      course?.instructor &&
      String(course.instructor).toLowerCase() === String(actor.userName).toLowerCase();

    if (!(role === "admin" || isOwnerTutor)) {
      return res.status(403).json({ success: false, message: "Not allowed to delete this course" });
    }

    const removed = await CourseDB.remove(courseId);
    if (!removed) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    return res.status(200).json({ success: true, data: removed });
  } catch (err) {
    console.error("deleteCourse error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}
