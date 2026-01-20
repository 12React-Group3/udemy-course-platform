// src/pages/Course/AddCourse.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCourse, presignVideoUpload } from "../../api/courses";

export default function AddCourse() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    courseId: "",
    title: "",
    description: "",
    instructor: "",
    courseTag: "",
  });

  const [videoFile, setVideoFile] = useState(null); // mp4 only
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleVideoChange(e) {
    const file = e.target.files?.[0] || null;
    setMessage("");

    if (!file) {
      setVideoFile(null);
      return;
    }

    // allow mp4 only
    if (file.type !== "video/mp4") {
      setVideoFile(null);
      e.target.value = "";
      setMessage("❌ Only .mp4 files are allowed.");
      return;
    }

    setVideoFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (!form.courseId || !form.title || !form.instructor) {
      setMessage("❌ courseId, title, and instructor are required");
      return;
    }

    if (!videoFile) {
      setMessage("❌ Please upload an MP4 video file.");
      return;
    }

    try {
      setLoading(true);

      // 1) get presigned URL from backend
      const presignRes = await presignVideoUpload({
        courseId: form.courseId,
        fileName: videoFile.name,
        contentType: videoFile.type, // video/mp4
      });

      if (!presignRes.data?.success) {
        throw new Error(presignRes.data?.message || "Failed to presign upload");
      }

      const { uploadUrl, fileUrl, key } = presignRes.data.data;

      // 2) upload mp4 directly to S3 (IMPORTANT: do NOT use apiClient here)
      const putResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "video/mp4",
        },
        body: videoFile,
      });

      if (!putResp.ok) {
        throw new Error(`S3 upload failed: ${putResp.status} ${putResp.statusText}`);
      }

      // 3) create course in DynamoDB, store S3 URL + key
      const createRes = await createCourse({
        ...form,
        videoURL: fileUrl,
        videoKey: key,
      });

      if (!createRes.data?.success) {
        throw new Error(createRes.data?.message || "Create course failed");
      }

      setMessage("✅ Course created and video uploaded!");

      setTimeout(() => {
        navigate(`/courses/${form.courseId}`);
      }, 600);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong";
      setMessage(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 650, margin: "0 auto" }}>
      <h1>Add Course (MP4 upload)</h1>

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

        <textarea
          name="description"
          placeholder="Description"
          rows={4}
          value={form.description}
          onChange={handleChange}
        />

        {/* MP4 only */}
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>Upload MP4 video</label>
          <input
            type="file"
            accept="video/mp4"
            onChange={handleVideoChange}
          />
          {videoFile ? (
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Selected: {videoFile.name} ({Math.round(videoFile.size / 1024 / 1024)} MB)
            </div>
          ) : null}
        </div>

        <button disabled={loading}>
          {loading ? "Uploading + Creating..." : "Create Course"}
        </button>

        {message ? <p>{message}</p> : null}
      </form>
    </div>
  );
}
