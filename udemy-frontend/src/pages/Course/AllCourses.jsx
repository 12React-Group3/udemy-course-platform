import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllCourses } from "../../api/courses";

export default function AllCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetchAllCourses();
        if (!res.success) throw new Error(res.message || "Failed to load courses");
        setCourses(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>All Courses</h1>

      {courses.length === 0 ? (
        <p>No courses yet.</p>
      ) : (
        <ul style={{ paddingLeft: 16 }}>
          {courses.map((course) => (
            <li key={course.courseId} style={{ marginBottom: 12 }}>
              <Link to={`/courses/${course.courseId}`}>
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
