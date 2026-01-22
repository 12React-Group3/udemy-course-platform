import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createCourse, presignVideoUpload } from "../../api/courses";
import "./AddCourse.css";

type AddCourseProps = {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  defaultInstructor?: string;
};

type CourseForm = {
  courseId: string;
  title: string;
  description: string;
  instructor: string;
  courseTag: string;
};

export default function AddCourse({
  isOpen,
  onClose,
  onSuccess,
  defaultInstructor = "",
}: AddCourseProps) {
  const navigate = useNavigate();

  const [form, setForm] = useState<CourseForm>({
    courseId: "",
    title: "",
    description: "",
    instructor: defaultInstructor,
    courseTag: "",
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setForm({
        courseId: "",
        title: "",
        description: "",
        instructor: defaultInstructor,
        courseTag: "",
      });
      setVideoFile(null);
      setMessage("");
      setUploadProgress(0);
    }
  }, [isOpen, defaultInstructor]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        onClose?.();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setMessage("");

    if (!file) {
      setVideoFile(null);
      return;
    }

    if (file.type !== "video/mp4") {
      setVideoFile(null);
      e.target.value = "";
      setMessage("Only .mp4 files are allowed.");
      return;
    }

    setVideoFile(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    if (!form.courseId || !form.title || !form.instructor) {
      setMessage("Course ID, title, and instructor are required.");
      return;
    }

    if (!videoFile) {
      setMessage("Please upload an MP4 video file.");
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(10);

      const presignRes = await presignVideoUpload({
        courseId: form.courseId,
        fileName: videoFile.name,
        contentType: videoFile.type,
      });

      if (!presignRes.data?.success) {
        throw new Error(presignRes.data?.message || "Failed to presign upload");
      }

      const { uploadUrl, fileUrl, key } = presignRes.data.data;
      setUploadProgress(30);

      const putResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: videoFile,
      });

      if (!putResp.ok) {
        throw new Error(`S3 upload failed: ${putResp.status}`);
      }

      setUploadProgress(70);

      const createRes = await createCourse({
        ...form,
        videoURL: fileUrl,
        videoKey: key,
      });

      if (!createRes.data?.success) {
        throw new Error(createRes.data?.message || "Create course failed");
      }

      setUploadProgress(100);
      setMessage("Course created successfully!");

      setTimeout(() => {
        onSuccess?.();
        onClose?.();
        const createdCourse = createRes.data?.data;
        const courseUid = createdCourse?.courseUid;
        if (courseUid) {
          navigate(`/courses/${courseUid}`, { state: { from: "/dashboard" } });
        } else {
          console.warn("Created course missing courseUid, skipping navigation");
        }
      }, 800);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong";
      setMessage(msg);
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">Create New Course</h2>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="courseId">Course ID *</label>
            <input
              id="courseId"
              name="courseId"
              type="text"
              placeholder="e.g. CS101, REACT-001"
              value={form.courseId}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Course title"
              value={form.title}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="instructor">Instructor *</label>
              <input
                id="instructor"
                name="instructor"
                type="text"
                placeholder="Instructor name"
                value={form.instructor}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="courseTag">Category</label>
              <input
                id="courseTag"
                name="courseTag"
                type="text"
                placeholder="e.g. Programming, Design"
                value={form.courseTag}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Course description..."
              rows={3}
              value={form.description}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Video File (MP4) *</label>
            <div className="file-upload-area">
              <input
                type="file"
                accept="video/mp4"
                onChange={handleVideoChange}
                disabled={loading}
                id="video-upload"
                className="file-input"
              />
              <label htmlFor="video-upload" className="file-upload-label">
                {videoFile ? (
                  <div className="file-selected">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="file-name">{videoFile.name}</span>
                    <span className="file-size">
                      {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                ) : (
                  <div className="file-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Click to upload or drag and drop</span>
                    <span className="file-hint">MP4 files only</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {loading && uploadProgress > 0 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              <span className="progress-text">{uploadProgress}%</span>
            </div>
          )}

          {message && (
            <div className={`form-message ${message.includes("success") ? "success" : "error"}`}>
              {message.includes("success") ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
              )}
              {message}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Uploading...
                </>
              ) : (
                "Create Course"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
