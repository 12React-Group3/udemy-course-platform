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

function getS3FileUrl(key) {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  return `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
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
    const fileUrl = getS3FileUrl(key);

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
 * POST /api/courses/presign-thumbnail
 * Body: { courseId, fileName, contentType }  contentType: image/jpeg or image/png
 */
export async function presignThumbnailUpload(req, res) {
  try {
    const { courseId, fileName, contentType } = req.body || {};

    const course = await CourseDB.findByCourseKey(courseId);
    const course = await CourseDB.findByCourseKey(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const allowed = new Set(["image/jpeg", "image/png"]);
    if (!allowed.has(contentType)) {
      return res.status(400).json({
        success: false,
        message: "Only image/jpeg or image/png is allowed",
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

    // stable folder per course, unique per upload
    const key = `courses/${safeCourseId}/thumbnail-${Date.now()}-${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 60 * 5 });
    const fileUrl = getS3FileUrl(key);

    return res.status(200).json({
      success: true,
      data: { uploadUrl, fileUrl, key },
    });
  } catch (err) {
    console.error("presignThumbnailUpload error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
}

/**
 * GET /api/courses/:courseId/thumbnail-url
 * Returns a signed URL to view thumbnail from private S3
 */
export async function getCourseThumbnailUrl(req, res) {
  try {
    const { courseId } = req.params;

    const course = await CourseDB.findByCourseId(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (!course.thumbnailKey) {
      return res.status(400).json({ success: false, message: "No thumbnailKey on course" });
export async function createCourse(req, res) {
  try {
    const { courseId, title, description, instructor, courseTag, videoURL, videoKey } = req.body || {};

    if (!courseId || !title || !instructor) {
      return res.status(400).json({
        success: false,
        message: "courseId, title, and instructor are required",
      });
    }

    // Get instructorId from authenticated user
    const instructorId = req.user?.id || "";

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
      instructor,
      instructorId,
      courseTag: courseTag || "",
      students: [],
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

    const course = await CourseDB.findByCourseKey(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const cmd = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: course.thumbnailKey,
    });

    const signedUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 60 * 5 });
    return res.status(200).json({ success: true, data: { signedUrl } });
  } catch (err) {
    console.error("getCourseThumbnailUrl error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
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
    const {
      courseId, 
      title, 
      description, 
      instructor, 
      courseTag, 
      videoURL, 
      videoKey, 
      thumbnailUrl, 
      thumbnailKey
    } = req.body || {};

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
      actorRole === "tutor" ? actor.userName : instructor || actor?.userName;

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
      thumbnailUrl: thumbnailUrl || "",
      thumbnailKey: thumbnailKey || "",

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

    const enrolled = new Set(user.enrolledCourses || []);
    enrolled.add(courseId);

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

    const enrolled = new Set(user.enrolledCourses || []);
    enrolled.delete(courseId);

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
      thumbnailUrl,
      thumbnailKey,
    } = req.body || {};

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
      return res.status(403).json({ success: false, message: "Not allowed to update this course" });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (videoURL !== undefined) updates.videoURL = videoURL;
    if (videoKey !== undefined) updates.videoKey = videoKey;
    if (courseTag !== undefined) updates.courseTag = courseTag;
    if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl;
    if (thumbnailKey !== undefined) updates.thumbnailKey = thumbnailKey;

    if (isHidden !== undefined) updates.isHidden = isHidden === true;

    if (role === "admin") {
      if (instructor !== undefined) updates.instructor = instructor;
      if (students !== undefined) updates.students = students;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    const course = await CourseDB.findByCourseKey(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const updated = await CourseDB.update(course.courseId, updates);
    const course = await CourseDB.findByCourseKey(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const updated = await CourseDB.update(course.courseId, updates);
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
    const course = await CourseDB.findByCourseKey(courseId);
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

/**
 * POST /api/courses/:courseId/subscribe
 */
export async function subscribeCourse(req, res) {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const [course, user] = await Promise.all([
      CourseDB.findByCourseKey(courseId),
      UserDB.findById(userId),
    ]);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const courseKey = course.courseUid || course.courseId;
    const enrolledSet = new Set([...(user.enrolledCourses || []), courseKey]);
    const studentsSet = new Set([...(course.students || []), userId]);

    const [updatedUser, updatedCourse] = await Promise.all([
      UserDB.updateProfile(userId, { enrolledCourses: Array.from(enrolledSet) }),
      CourseDB.update(course.courseId, { students: Array.from(studentsSet) }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Subscribed to course",
      data: {
        user: sanitizeUser(updatedUser),
        course: updatedCourse,
      },
    });
  } catch (err) {
    console.error("subscribeCourse error:", err);
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

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const [course, user] = await Promise.all([
      CourseDB.findByCourseKey(courseId),
      UserDB.findById(userId),
    ]);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const courseKey = course.courseUid || course.courseId;
    const enrolled = (user.enrolledCourses || []).filter((c) => c !== courseKey);
    const students = (course.students || []).filter((s) => s !== userId);

    const [updatedUser, updatedCourse] = await Promise.all([
      UserDB.updateProfile(userId, { enrolledCourses: enrolled }),
      CourseDB.update(course.courseId, { students }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Unsubscribed from course",
      data: {
        user: sanitizeUser(updatedUser),
        course: updatedCourse,
      },
    });
  } catch (err) {
    console.error("unsubscribeCourse error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}
