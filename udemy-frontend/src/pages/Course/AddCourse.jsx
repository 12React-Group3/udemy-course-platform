import { useState } from "react";
import { createCourse } from "../../api/courses";
import { useNavigate } from "react-router-dom";

export default function AddCourse() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    courseId: "",
    title: "",
    description: "",
    videoURL: "",
    instructor: "",
    courseTag: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (!form.courseId || !form.title || !form.instructor) {
      setMessage("courseId, title, and instructor are required");
      return;
    }

    try {
      setLoading(true);
      const res = await createCourse(form);

      if (!res.success) {
        throw new Error(res.message || "Create failed");
      }

      setMessage("✅ Course created successfully!");

      // optional: redirect to CoursePage
      setTimeout(() => {
        navigate(`/courses/${form.courseId}`);
      }, 800);
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h1>Add Course</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          name="courseId"
          placeholder="Course ID (e.g. CS101)"
          value={form.courseId}
          onChange={handleChange}
        />

        <input
          name="title"
          placeholder="Title"
          value={form.title}
          onChange={handleChange}
        />

        <input
          name="instructor"
          placeholder="Instructor"
          value={form.instructor}
          onChange={handleChange}
        />

        <input
          name="courseTag"
          placeholder="Tag (optional)"
          value={form.courseTag}
          onChange={handleChange}
        />

        <input
          name="videoURL"
          placeholder="Video URL (YouTube or mp4)"
          value={form.videoURL}
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Description"
          rows={4}
          value={form.description}
          onChange={handleChange}
        />

        <button disabled={loading}>
          {loading ? "Creating..." : "Create Course"}
        </button>

        {message && <p>{message}</p>}
      </form>
    </div>
  );
}
