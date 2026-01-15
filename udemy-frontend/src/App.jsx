import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";

import DashboardPage from "./pages/DashboardPage";
import CoursesPage from "./pages/CoursesPage";
import TasksPage from "./pages/TasksPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages will be added by Rongwei; keep these routes reserved */}
        {/* <Route path="/login" element={<LoginPage />} /> */}
        {/* <Route path="/register" element={<RegisterPage />} /> */}

        {/* Layout (authenticated pages) */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<div style={{ padding: 18 }}>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
