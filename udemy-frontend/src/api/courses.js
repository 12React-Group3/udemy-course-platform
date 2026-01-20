// src/api/courses.js
import apiClient from "./apiClient";
import { API_PATHS } from "./apiPaths";

export function fetchAllCourses() {
    return apiClient.get(API_PATHS.COURSES.GET_ALL);
}

export function fetchCourseById(courseId) {
    return apiClient.get(API_PATHS.COURSES.GET_BY_ID(courseId));
}

export function createCourse(courseData) {
    return apiClient.post(API_PATHS.COURSES.CREATE, courseData);
}

// 1️⃣ Ask backend for presigned PUT url
export function presignVideoUpload({ courseId, fileName, contentType }) {
  return apiClient.post(API_PATHS.UPLOADS.PRESIGN_VIDEO_UPLOAD, {
    courseId,
    fileName,
    contentType,
  });
}

// 2️⃣ Ask backend for presigned GET url (play)
export function presignVideoPlay(key) {
  return apiClient.get(API_PATHS.UPLOADS.PRESIGN_VIDEO_PLAY(key));
}