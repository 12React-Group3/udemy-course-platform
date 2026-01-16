import { Routes, Route } from "react-router-dom";
import CoursePage from "../pages/Course/CoursePage";
import AddCourse from "../pages/Course/AddCourse";
import AllCourses from "../pages/Course/AllCourses";
import ProfilePage from "../pages/Profile/ProfilePage";

function Home() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Home</h2>
      
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/courses" element={<AllCourses />} />
      <Route path="/courses/:courseId" element={<CoursePage />} />
      <Route path="/add-course" element={<AddCourse />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}
