export const BASE_URL="http://localhost:5000";


export const API_PATHS={
    AUTH:{
        REGISTER:`${BASE_URL}/api/auth/register`,
        LOGIN:`${BASE_URL}/api/auth/login`,
        PROFILE:`${BASE_URL}/api/auth/profile`,
        CHANGE_PASSWORD:`${BASE_URL}/api/auth/change-password`,
    },
    COURSES:{
        GET_ALL:`${BASE_URL}/api/courses`,
        CREATE:`${BASE_URL}/api/courses`,
        GET_BY_ID:(courseId)=>`${BASE_URL}/api/courses/${encodeURIComponent(courseId)}`,
    },
    UPLOADS: {
    // POST -> { courseId, fileName, contentType }
    PRESIGN_VIDEO_UPLOAD: `${BASE_URL}/api/uploads/video`,

    // GET -> ?key=...
    PRESIGN_VIDEO_PLAY: (key) =>
      `${BASE_URL}/api/uploads/video/play?key=${encodeURIComponent(key)}`,
  },
}