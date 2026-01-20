import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllCourses } from "../../api/courses";

export default function AllCourses() {
  const [coursesRaw, setCoursesRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetchAllCourses();
        if (!res.data?.success) throw new Error(res.data?.message || "Failed to load courses");

        setCoursesRaw(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ✅ Only show courses created with the new MP4+S3 flow (videoKey exists)
  const courses = useMemo(() => {
    return coursesRaw.filter((c) => typeof c?.videoKey === "string" && c.videoKey.trim() !== "");
  }, [coursesRaw]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>All Courses</h1>

      {courses.length === 0 ? (
        <p>No MP4 video courses yet.</p>
      ) : (
        <ul style={{ paddingLeft: 16 }}>
          {courses.map((course) => (
            <li key={course.courseId} style={{ marginBottom: 12 }}>
              <Link to={`/courses/${encodeURIComponent(course.courseId)}`}>
                <strong>{course.title}</strong>
              </Link>
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                ID: {course.courseId} · Instructor: {course.instructor}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
