// src/api/courses.js
import apiClient from "./apiClient";
import { API_PATHS } from "./apiPaths";

export function fetchAllCourses() {
  return apiClient.get(API_PATHS.COURSES.GET_ALL);
}

// All course-specific functions use courseUid (system-generated unique ID)
export function fetchCourseById(courseUid) {
  return apiClient.get(API_PATHS.COURSES.GET_BY_ID(courseUid));
}

export function createCourse(courseData) {
  return apiClient.post(API_PATHS.COURSES.CREATE, courseData);
}

export function presignVideoUpload(payload) {
  return apiClient.post(API_PATHS.COURSES.PRESIGN_VIDEO, payload);
}

export function presignThumbnailUpload(payload) {
  return apiClient.post(API_PATHS.COURSES.PRESIGN_THUMBNAIL, payload);
}

export function fetchCourseVideoUrl(courseUid) {
  return apiClient.get(API_PATHS.COURSES.GET_VIDEO_URL(courseUid));
}

export function fetchCourseThumbnailUrl(courseUid) {
  return apiClient.get(API_PATHS.COURSES.GET_THUMBNAIL_URL(courseUid));
}

export function updateCourse(courseUid, payload) {
  return apiClient.put(API_PATHS.COURSES.UPDATE(courseUid), payload);
}

export function deleteCourse(courseUid) {
  return apiClient.delete(API_PATHS.COURSES.DELETE(courseUid));
}

export function subscribeCourse(courseUid) {
  return apiClient.post(API_PATHS.COURSES.SUBSCRIBE(courseUid), {});
}

export function unsubscribeCourse(courseUid) {
  return apiClient.post(API_PATHS.COURSES.UNSUBSCRIBE(courseUid), {});
}
