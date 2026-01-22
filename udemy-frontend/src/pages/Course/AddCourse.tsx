import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createCourse, presignVideoUpload, presignThumbnailUpload } from "../../api/courses";
import "./AddCourse.css";

/**
 * Extract a thumbnail from a random (safe) frame of the local video file.
 * Returns a JPEG Blob.
 */
async function extractRandomThumbnailBlob(videoFile: File): Promise<Blob> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  const objectUrl = URL.createObjectURL(videoFile);
  video.src = objectUrl;

  try {
    // 1) Wait metadata
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => resolve();
      const onError = () => reject(new Error("Failed to load video metadata"));

      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });
    });

    const duration = Number.isFinite(video.duration) ? video.duration : 3;
    const safeMax = Math.max(0.2, duration - 0.2);

    // Avoid very beginning (often black) and very end
    const t = Math.min(safeMax, Math.max(0.5, Math.random() * safeMax));

    // Some browsers need loadeddata before seek works reliably
    await new Promise<void>((resolve, reject) => {
      const onLoadedData = () => resolve();
      const onError = () => reject(new Error("Failed to load video data"));
      video.addEventListener("loadeddata", onLoadedData, { once: true });
      video.addEventListener("error", onError, { once: true });
    });

    video.currentTime = t;

    // 2) Wait seek
    await new Promise<void>((resolve, reject) => {
      const onSeeked = () => resolve();
      const onError = () => reject(new Error("Failed to seek video"));
      video.addEventListener("seeked", onSeeked, { once: true });
      video.addEventListener("error", onError, { once: true });
    });

    // 3) Draw frame on canvas
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(video, 0, 0, w, h);

    // 4) Convert to JPEG blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) reject(new Error("Failed to generate thumbnail"));
          else resolve(b);
        },
        "image/jpeg",
        0.85
      );
    });

    return blob;
  } finally {
    // Cleanup
    try {
      video.pause();
      video.removeAttribute("src");
      video.load();
    } catch {
      // ignore
    }
    URL.revokeObjectURL(objectUrl);
  }
}

type AddCourseProps = {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  defaultInstructor?: string;
};

export default function AddCourse({
  isOpen,
  onClose,
  onSuccess,
  defaultInstructor = "",
}: AddCourseProps) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
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

  // track unsaved edits
  const [isDirty, setIsDirty] = useState(false);

  // refs to avoid re-binding ESC listener on every keystroke
  const latestRef = useRef({
    loading: false,
    isDirty: false,
    form,
    videoFile: null as File | null,
  });

  useEffect(() => {
    latestRef.current = { loading, isDirty, form, videoFile };
  }, [loading, isDirty, form, videoFile]);

  const hasAnyInput = useCallback(() => {
    const f = latestRef.current.form;
    const anyText =
      f.courseId.trim() ||
      f.title.trim() ||
      f.description.trim() ||
      f.instructor.trim() ||
      f.courseTag.trim();
    return Boolean(anyText) || Boolean(latestRef.current.videoFile);
  }, []);

  const requestClose = useCallback(() => {
    const { loading: nowLoading, isDirty: nowDirty } = latestRef.current;

    if (nowLoading) return;

    if (!nowDirty && !hasAnyInput()) {
      onClose?.();
      return;
    }

    const ok = window.confirm("You have unsaved changes. Discard them and close?");
    if (ok) onClose?.();
  }, [hasAnyInput, onClose]);

  // Reset form when modal opens
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
      setIsDirty(false);
    }
  }, [isOpen, defaultInstructor]);

  // ESC + body scroll lock (bind once per open)
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, requestClose]);

  if (!isOpen) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setMessage("");

    if (!file) {
      setVideoFile(null);
      setIsDirty(true);
      return;
    }

    if (file.type !== "video/mp4") {
      setVideoFile(null);
      e.target.value = "";
      setMessage("Only .mp4 files are allowed.");
      return;
    }

    setVideoFile(file);
    setIsDirty(true);
  }

  async function handleSubmit(e: React.FormEvent) {
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
      setUploadProgress(5);

      // 1) Presign video
      const presignRes = await presignVideoUpload({
        courseId: form.courseId,
        fileName: videoFile.name,
        contentType: videoFile.type,
      });

      if (!presignRes.data?.success) {
        throw new Error(presignRes.data?.message || "Failed to presign video upload");
      }

      const { uploadUrl, fileUrl, key } = presignRes.data.data;
      setUploadProgress(15);

      // 2) Upload video to S3
      const putResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: videoFile,
      });

      if (!putResp.ok) {
        throw new Error(`S3 video upload failed: ${putResp.status}`);
      }

      setUploadProgress(55);

      // 3) Generate thumbnail from local video file
      const thumbBlob = await extractRandomThumbnailBlob(videoFile);
      setUploadProgress(65);

      // 4) Presign thumbnail upload (make filename unique to avoid overwrite/caching)
      const thumbName = `thumbnail-${Date.now()}.jpg`;

      const thumbPresign = await presignThumbnailUpload({
        courseId: form.courseId,
        fileName: thumbName,
        contentType: "image/jpeg",
      });

      if (!thumbPresign.data?.success) {
        throw new Error(thumbPresign.data?.message || "Failed to presign thumbnail upload");
      }

      const {
        uploadUrl: thumbUploadUrl,
        key: thumbKey,
        // fileUrl: thumbFileUrl, // <- DO NOT use/store as public URL (private bucket => 403)
      } = thumbPresign.data.data;

      // 5) Upload thumbnail
      const thumbPut = await fetch(thumbUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: thumbBlob,
      });

      if (!thumbPut.ok) {
        throw new Error(`Thumbnail upload failed: ${thumbPut.status}`);
      }

      setUploadProgress(80);

      // 6) Create course in DB
      // IMPORTANT: store thumbnailKey, but do NOT rely on thumbnailUrl for rendering.
      const createRes = await createCourse({
        ...form,
        videoURL: fileUrl,
        videoKey: key,
        thumbnailKey: thumbKey,
        thumbnailUrl: "", // keep empty so frontend won't accidentally render forbidden public URL
      });

      if (!createRes.data?.success) {
        throw new Error(createRes.data?.message || "Create course failed");
      }

      setUploadProgress(100);
      setMessage("Course created successfully!");
      setIsDirty(false);

      setTimeout(() => {
        onSuccess?.();
        onClose?.();
        navigate(`/courses/${form.courseId}`);
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
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) requestClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">Create New Course</h2>
          <button
            className="modal-close"
            onClick={requestClose}
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
                    <span className="file-name">{videoFile.name}</span>
                    <span className="file-size">
                      {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                ) : (
                  <div className="file-placeholder">
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
              {message}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={requestClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Uploading..." : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
