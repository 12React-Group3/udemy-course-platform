import api from "./api";

export async function fetchCourseById(courseId) {
  const { data } = await api.get(`/courses/${encodeURIComponent(courseId)}`);
  return data; // { success, data: course }
}

export async function createCourse(courseData) {
  const { data } = await api.post("/courses", courseData);
  return data;
}

export async function fetchAllCourses() {
  const { data } = await api.get("/courses");
  return data;
}