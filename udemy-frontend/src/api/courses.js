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
