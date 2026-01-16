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
      setMessage("Course ID, title, and instructor are required.");
      return;
    }

    try {
      setLoading(true);
      const res = await createCourse(form);

      if (!res.success) {
        throw new Error(res.message || "Create failed");
      }

      setMessage("Course created successfully.");

      setTimeout(() => {
        navigate(`/courses/${form.courseId}`);
      }, 800);
    } catch (err) {
      setMessage(err.message || "Failed to create course.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">Add Course</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="courseId"
          placeholder="Course ID (e.g. CS101)"
          value={form.courseId}
          onChange={handleChange}
        />

        <Input
          name="title"
          placeholder="Course title"
          value={form.title}
          onChange={handleChange}
        />

        <Input
          name="instructor"
          placeholder="Instructor"
          value={form.instructor}
          onChange={handleChange}
        />

        <Input
          name="courseTag"
          placeholder="Tag (optional)"
          value={form.courseTag}
          onChange={handleChange}
        />

        <Input
          name="videoURL"
          placeholder="Video URL (YouTube or mp4)"
          value={form.videoURL}
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Course description"
          rows={4}
          value={form.description}
          onChange={handleChange}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <button
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create Course"}
        </button>

        {message && (
          <p
            className={`text-sm ${
              message.toLowerCase().includes("success")
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

/* ---------- small reusable input ---------- */

function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
  );
}
