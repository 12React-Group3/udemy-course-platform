import { useEffect, useState } from "react";
import { presignVideoUpload, updateCourse } from "../../api/courses";
import "./AddCourse.css";

/**
 * EditCourse modal (reuses AddCourse modal styles)
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onSuccess: () => void
 * - course: {
 *     id/courseId, title, description, courseTag/category, instructor, videoURL, videoKey, isHidden
 *   }
 */
export default function EditCourse({ isOpen, onClose, onSuccess, course }) {
    const [form, setForm] = useState({
        title: "",
        description: "",
        courseTag: "",
    });

    const [videoFile, setVideoFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);

    const courseId = course?.courseId || course?.id || "";

    // Reset form when modal opens / course changes
    useEffect(() => {
        if (isOpen && course) {
            setForm({
                title: course.title || "",
                description: course.description || "",
                courseTag: course.courseTag || course.category || "",
            });
            setVideoFile(null);
            setMessage("");
            setUploadProgress(0);
        }
    }, [isOpen, course]);

    // Escape key + body scroll lock
    useEffect(() => {
        function handleEscape(e) {
            if (e.key === "Escape" && !loading) onClose?.();
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

    if (!isOpen || !course) return null;

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

        if (file.type !== "video/mp4") {
            setVideoFile(null);
            e.target.value = "";
            setMessage("Only .mp4 files are allowed.");
            return;
        }

        setVideoFile(file);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");

        if (!courseId) {
            setMessage("Missing courseId.");
            return;
        }

        if (!form.title) {
            setMessage("Title is required.");
            return;
        }

        try {
            setLoading(true);
            setUploadProgress(10);

            let payload = {
                title: form.title,
                description: form.description,
                courseTag: form.courseTag,
            };

            // If user selected a new video, upload it first, then update videoURL/videoKey
            if (videoFile) {
                const presignRes = await presignVideoUpload({
                    courseId,
                    fileName: videoFile.name,
                    contentType: videoFile.type,
                });

                if (!presignRes.data?.success) {
                    throw new Error(presignRes.data?.message || "Failed to presign upload");
                }

                const { uploadUrl, fileUrl, key } = presignRes.data.data;
                setUploadProgress(35);

                const putResp = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": "video/mp4" },
                    body: videoFile,
                });

                if (!putResp.ok) {
                    throw new Error(`S3 upload failed: ${putResp.status}`);
                }

                setUploadProgress(70);

                payload = { ...payload, videoURL: fileUrl, videoKey: key };
            }

            const updateRes = await updateCourse(courseId, payload);

            if (!updateRes.data?.success) {
                throw new Error(updateRes.data?.message || "Update course failed");
            }

            setUploadProgress(100);
            setMessage("Course updated successfully!");

            setTimeout(() => {
                onSuccess?.();
                onClose?.();
            }, 600);
        } catch (err) {
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

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget && !loading) onClose?.();
    }

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-container">
                <div className="modal-header">
                    <h2 className="modal-title">Edit Course</h2>
                    <button className="modal-close" onClick={() => !loading && onClose?.()} aria-label="Close">
                        ✕
                    </button>
                </div>

                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Course ID</label>
                        <input value={courseId} disabled />
                    </div>

                    <div className="form-group">
                        <label>Instructor</label>
                        <input value={course.instructor || ""} disabled />
                    </div>

                    <div className="form-group">
                        <label>Title *</label>
                        <input name="title" value={form.title} onChange={handleChange} disabled={loading} />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows={4}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Category / Tag</label>
                        <input name="courseTag" value={form.courseTag} onChange={handleChange} disabled={loading} />
                    </div>

                    <div className="form-group">
                        <label>Replace Video (optional, mp4)</label>
                        <input type="file" accept="video/mp4" onChange={handleVideoChange} disabled={loading} />
                    </div>

                    {uploadProgress > 0 && (
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    )}

                    {message && <p className={`modal-message ${message.includes("success") ? "success" : "error"}`}>{message}</p>}

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={() => !loading && onClose?.()}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
