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

export function presignVideoUpload(payload) {
  return apiClient.post(API_PATHS.COURSES.PRESIGN_VIDEO, payload);
}

export function fetchCourseVideoUrl(courseId) {
  return apiClient.get(API_PATHS.COURSES.GET_VIDEO_URL(courseId));
}

export function updateCourse(courseId, payload) {
  return apiClient.put(API_PATHS.COURSES.UPDATE(courseId), payload);
}

export function deleteCourse(courseId) {
  return apiClient.delete(API_PATHS.COURSES.DELETE(courseId));
}

export function subscribeCourse(courseId) {
  return apiClient.post(API_PATHS.COURSES.SUBSCRIBE(courseId));
}

export function unsubscribeCourse(courseId) {
  return apiClient.post(API_PATHS.COURSES.UNSUBSCRIBE(courseId));
}
