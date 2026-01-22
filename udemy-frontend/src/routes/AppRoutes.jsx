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
import TutorRoute from "../components/TutorRoute";
import LearnerRoute from "../components/LearnerRoute";
import Dashboard from "../pages/Dashboard";
import TasksPage from "../pages/Tasks/TasksPage";
import TaskDetailPage from "../pages/Tasks/TaskDetailPage";
import TakeTaskPage from "../pages/Tasks/TakeTaskPage";
import TaskResultPage from "../pages/Tasks/TaskResultPage";
import AdminPage from "../pages/Admin/AdminPage";
import SubscribersPage from "../pages/Subscribers/SubscribersPage";

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
        <Route
          path="/tasks/:taskId/take"
          element={
            <LearnerRoute>
              <TakeTaskPage />
            </LearnerRoute>
          }
        />
        <Route
          path="/tasks/:taskId/result"
          element={
            <LearnerRoute>
              <TaskResultPage />
            </LearnerRoute>
          }
        />
        <Route
          path="/tasks/:taskId"
          element={
            <TutorRoute>
              <TaskDetailPage />
            </TutorRoute>
          }
        />

        {/* Profile */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Subscribers (tutor only) */}
        <Route
          path="/subscribers"
          element={
            <TutorRoute>
              <SubscribersPage />
            </TutorRoute>
          }
        />

        {/* Admin */}
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
