import { Routes, Route, Navigate } from "react-router-dom";
import CoursePage from "../pages/Course/CoursePage";
import AddCourse from "../pages/Course/AddCourse";
import AllCourses from "../pages/Course/AllCourses";
import ProfilePage from "../pages/Profile/ProfilePage"
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import Logout from "../pages/Auth/Logout";
import ProtectedRoute from "../components/ProtectedRoute";
import Dashboard from "../pages/Dashboard";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/logout" element={<Logout />} />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/courses" element={
        <ProtectedRoute>
          <AllCourses />
        </ProtectedRoute>
      } />
      <Route path="/courses/:courseId" element={
        <ProtectedRoute>
          <CoursePage />
        </ProtectedRoute>
      } />
      <Route path="/add-course" element={
        <ProtectedRoute>
          <AddCourse />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
