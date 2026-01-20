// src/api/apiPaths.js
export const BASE_URL = "http://localhost:5000";

export const API_PATHS = {
  AUTH: {
    REGISTER: `${BASE_URL}/api/auth/register`,
    LOGIN: `${BASE_URL}/api/auth/login`,
    PROFILE: `${BASE_URL}/api/auth/profile`,
    CHANGE_PASSWORD: `${BASE_URL}/api/auth/change-password`,
  },
  COURSES: {
    GET_ALL: `${BASE_URL}/api/courses`,
    CREATE: `${BASE_URL}/api/courses`,
    PRESIGN_VIDEO: `${BASE_URL}/api/courses/presign-video`,
    GET_BY_ID: (courseId) => `${BASE_URL}/api/courses/${encodeURIComponent(courseId)}`,

    GET_VIDEO_URL: (courseId) =>
      `${BASE_URL}/api/courses/${encodeURIComponent(courseId)}/video-url`,
  },
};
