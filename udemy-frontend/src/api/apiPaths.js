// src/api/apiPaths.js
export const BASE_URL = "http://localhost:5000";

export const API_PATHS = {
  AUTH: {
    REGISTER: `${BASE_URL}/api/auth/register`,
    LOGIN: `${BASE_URL}/api/auth/login`,
    PROFILE: `${BASE_URL}/api/auth/profile`,
    CHANGE_PASSWORD: `${BASE_URL}/api/auth/change-password`,
    UPLOAD_AVATAR: `${BASE_URL}/api/auth/avatar`,
  },

  COURSES: {
    GET_ALL: `${BASE_URL}/api/courses`,
    CREATE: `${BASE_URL}/api/courses`,
    PRESIGN_VIDEO: `${BASE_URL}/api/courses/presign-video`,
    PRESIGN_THUMBNAIL: `${BASE_URL}/api/courses/presign-thumbnail`,
    GET_BY_ID: (courseId) => `${BASE_URL}/api/courses/${encodeURIComponent(courseId)}`,
    GET_VIDEO_URL: (courseId) =>
      `${BASE_URL}/api/courses/${encodeURIComponent(courseId)}/video-url`,
    GET_THUMBNAIL_URL: (courseId) =>
      `${BASE_URL}/api/courses/${encodeURIComponent(courseId)}/thumbnail-url`,
    UPDATE: (courseId) => `${BASE_URL}/api/courses/${encodeURIComponent(courseId)}`,
    DELETE: (courseId) => `${BASE_URL}/api/courses/${encodeURIComponent(courseId)}`,
    SUBSCRIBE: (courseId) =>
      `${BASE_URL}/api/courses/${encodeURIComponent(courseId)}/subscribe`,
    UNSUBSCRIBE: (courseId) =>
      `${BASE_URL}/api/courses/${encodeURIComponent(courseId)}/unsubscribe`,
  },

  TASKS: {
    GET_ALL: `${BASE_URL}/api/tasks`,
    CREATE: `${BASE_URL}/api/tasks`,
    GET_BY_ID: (taskId) => `${BASE_URL}/api/tasks/${encodeURIComponent(taskId)}`,
    UPDATE: (taskId) => `${BASE_URL}/api/tasks/${encodeURIComponent(taskId)}`,
    DELETE: (taskId) => `${BASE_URL}/api/tasks/${encodeURIComponent(taskId)}`,
    GET_BY_COURSE: (courseId) =>
      `${BASE_URL}/api/tasks/course/${encodeURIComponent(courseId)}`,
    MY_SUBMISSIONS: `${BASE_URL}/api/tasks/my-submissions`,
    ADD_QUESTION: (taskId) => `${BASE_URL}/api/tasks/${encodeURIComponent(taskId)}/questions`,
    UPDATE_QUESTION: (taskId, questionId) =>
      `${BASE_URL}/api/tasks/${encodeURIComponent(taskId)}/questions/${encodeURIComponent(
        questionId
      )}`,
    DELETE_QUESTION: (taskId, questionId) =>
      `${BASE_URL}/api/tasks/${encodeURIComponent(taskId)}/questions/${encodeURIComponent(
        questionId
      )}`,
    SUBMIT: (taskId) => `${BASE_URL}/api/tasks/${encodeURIComponent(taskId)}/submit`,
    GET_RECORDS: (taskId) => `${BASE_URL}/api/tasks/${encodeURIComponent(taskId)}/records`,
  },

  USERS: {
    GET_ALL: `${BASE_URL}/api/users`,
    DELETE: (userId) => `${BASE_URL}/api/users/${encodeURIComponent(userId)}`,
    UPDATE_ROLE: (userId) => `${BASE_URL}/api/users/${encodeURIComponent(userId)}/role`,
    MY_STUDENTS: `${BASE_URL}/api/users/my-students`,
  },
};
