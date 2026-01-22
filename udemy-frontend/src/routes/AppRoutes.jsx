import { Routes, Route, Navigate } from "react-router-dom";
import CoursePage from "../pages/Course/CoursePage";
import AllCourses from "../pages/Course/AllCourses";
import ProfilePage from "../pages/Profile/ProfilePage";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import Logout from "../pages/Auth/Logout";
import ProtectedRoute from "../components/ProtectedRoute";
import AppLayout from "../components/AppLayout";
import AdminRoute from "../components/AdminRoute";
import Dashboard from "../pages/Dashboard";
import TasksPage from "../pages/Tasks/TasksPage";
import TaskDetailPage from "../pages/Tasks/TaskDetailPage";
import AdminPage from "../pages/Admin/AdminPage";

function CatchAll() {
  const token = localStorage.getItem('token');
  return <Navigate to={token ? '/dashboard' : '/login'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/logout" element={<Logout />} />

      {/* Protected routes live under a shared layout (Topbar + Sidebar) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Courses */}
        <Route path="/courses" element={<AllCourses />} />
        <Route path="/courses/:courseUid" element={<CoursePage />} />

        {/* Tasks */}
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />

        {/* Profile */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Admin (placeholder) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<CatchAll />} />
    </Routes>
  );
}
