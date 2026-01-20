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
    videoURL: "", // optional: YouTube URL
    instructor: "",
    courseTag: "",
  });

  const [videoFile, setVideoFile] = useState(null); // NEW: real file upload
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    const courseId = form.courseId.trim();
    const title = form.title.trim();
    const instructor = form.instructor.trim();

    if (!courseId || !title || !instructor) {
      setMessage("courseId, title, and instructor are required");
      return;
    }

    // If uploading a file, we don't need videoURL
    // If not uploading a file, videoURL (YouTube/mp4 link) is optional
    if (videoFile && form.videoURL.trim()) {
      setMessage("Please use either a Video URL OR upload a video file (not both).");
      return;
    }

    try {
      setLoading(true);

      let videoKey = ""; // S3 object key stored in DB
      let videoURL = form.videoURL.trim(); // YouTube URL stored in DB (optional)

      // 1) If user selected a video file: presign + upload to S3
      if (videoFile) {
        const presignRes = await presignVideoUpload({
          courseId,
          fileName: videoFile.name,
          contentType: videoFile.type || "video/mp4",
        });

        if (!presignRes.data?.success) {
          throw new Error(presignRes.data?.message || "Failed to get S3 upload URL");
        }

        const { uploadUrl, key } = presignRes.data.data;
        videoKey = key;
        videoURL = ""; // we will play via presigned GET later

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": videoFile.type || "video/mp4",
          },
          body: videoFile,
        });

        if (!putRes.ok) {
          throw new Error("S3 upload failed");
        }
      }

      // 2) Create course in DB
      const payload = {
        courseId,
        title,
        description: form.description?.trim() || "",
        instructor,
        courseTag: form.courseTag?.trim() || "",
        videoURL,   // YouTube link (optional)
        videoKey,   // S3 key (optional)
      };

      const res = await createCourse(payload);

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Create failed");
      }

      setMessage("✅ Course created successfully!");

      setTimeout(() => {
        navigate(`/courses/${courseId}`);
      }, 800);
    } catch (err) {
      console.log("AddCourse error:", err);

  const msg =
    err?.response?.data?.message ||      // axios backend error
    err?.response?.data?.error ||
    err?.message ||
    "Failed to fetch";

  setMessage(`❌ ${msg}`);
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

        {/* Option A: YouTube URL */}
        <input
          name="videoURL"
          placeholder="YouTube URL (optional if uploading file)"
          value={form.videoURL}
          onChange={handleChange}
          disabled={!!videoFile}
        />

        {/* Option B: Upload real video file to S3 */}
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
          disabled={!!form.videoURL.trim()}
        />

        {videoFile && (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Selected: <b>{videoFile.name}</b> ({Math.round(videoFile.size / 1024 / 1024)} MB)
          </div>
        )}

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

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
        Tip: Choose either a YouTube URL or upload a video file. For S3 upload, large files may take time.
      </div>
    </div>
  );
}
