// controllers/courseController.js
import { CourseDB } from "../models/index.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET_NAME } from "../config/s3.js";

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
 * GET /api/courses/:courseId/video-url
 * Return presigned GET url for private bucket playback
 */
export async function getCourseVideoUrl(req, res) {
  try {
    const { courseId } = req.params;

    const course = await CourseDB.findByCourseId(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (!course.videoKey) {
      return res.status(400).json({ success: false, message: "This course has no uploaded video" });
    }

    if (!S3_BUCKET_NAME) {
      return res.status(500).json({ success: false, message: "S3 bucket is not configured" });
    }

    const cmd = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: course.videoKey,
      ResponseContentType: "video/mp4",
    });

    const signedUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 60 * 10 });

    return res.status(200).json({
      success: true,
      data: { signedUrl },
    });
  } catch (err) {
    console.error("getCourseVideoUrl error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
}

/**
 * POST /api/courses
 */
export async function createCourse(req, res) {
  try {
    const { courseId, title, description, instructor, courseTag, videoURL, videoKey } = req.body || {};

    if (!courseId || !title || !instructor) {
      return res.status(400).json({
        success: false,
        message: "courseId, title, and instructor are required",
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
      instructor,
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

    const course = await CourseDB.findByCourseId(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    return res.status(200).json({ success: true, data: course });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Invalid request" });
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
