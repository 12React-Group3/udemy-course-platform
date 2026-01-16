import { Routes, Route, Navigate } from "react-router-dom";
import CoursePage from "../pages/Course/CoursePage";
import AddCourse from "../pages/Course/AddCourse";
import AllCourses from "../pages/Course/AllCourses";
import ProfilePage from "../pages/Profile/ProfilePage"

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/courses" element={<AllCourses />} />
      <Route path="/courses/:courseId" element={<CoursePage />} />
      <Route path="/add-course" element={<AddCourse />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}
