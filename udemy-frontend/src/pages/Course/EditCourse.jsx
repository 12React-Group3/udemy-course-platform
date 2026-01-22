import { useEffect, useRef, useState } from "react";
import { presignVideoUpload, updateCourse } from "../../api/courses";
import "./AddCourse.css";

export default function EditCourse({ isOpen, onClose, onSuccess, course }) {
    const [form, setForm] = useState({
        title: "",
        description: "",
        courseTag: "",
    });

    const [initialForm, setInitialForm] = useState({
        title: "",
        description: "",
        courseTag: "",
    });

    const [videoFile, setVideoFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);

    const courseId = course?.courseId || course?.id || "";

    // ✅ AddCourse-style: initialize on open
    // BUT guard so it runs only once per modal open (or courseId change)
    const initializedForCourseIdRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !courseId) return;

        // only init once per open for this courseId
        if (initializedForCourseIdRef.current === courseId) return;
        initializedForCourseIdRef.current = courseId;

        const next = {
            title: course?.title || "",
            description: course?.description || "",
            courseTag: course?.courseTag || course?.category || "",
        };

        setForm(next);
        setInitialForm(next);
        setVideoFile(null);
        setMessage("");
        setUploadProgress(0);
    }, [isOpen, courseId]); // ✅ do NOT depend on `course` object

    // when modal closes, reset init ref so next open re-inits
    useEffect(() => {
        if (!isOpen) initializedForCourseIdRef.current = null;
    }, [isOpen]);

    const computeDirty = () => {
        const formChanged =
            form.title !== initialForm.title ||
            form.description !== initialForm.description ||
            form.courseTag !== initialForm.courseTag;

        const videoChanged = Boolean(videoFile);
        return formChanged || videoChanged;
    };

    // ✅ unified close guard (same idea as AddCourse onClose, but with warning)
    const requestClose = () => {
        if (loading) return;

        if (!computeDirty()) {
            onClose?.();
            return;
        }

        const ok = window.confirm("You have unsaved changes. Discard them and close?");
        if (ok) onClose?.();
    };

    // ✅ AddCourse-style: Escape key + body scroll lock
    useEffect(() => {
        function handleEscape(e) {
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
    }, [isOpen, loading, form, videoFile, initialForm]); // uses current dirty state

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

                if (!putResp.ok) throw new Error(`S3 upload failed: ${putResp.status}`);

                setUploadProgress(70);
                payload = { ...payload, videoURL: fileUrl, videoKey: key };
            }

            const updateRes = await updateCourse(courseId, payload);
            if (!updateRes.data?.success) {
                throw new Error(updateRes.data?.message || "Update course failed");
            }

            setUploadProgress(100);
            setMessage("Course updated successfully!");

            // ✅ baseline becomes the saved state
            setInitialForm({
                title: form.title,
                description: form.description,
                courseTag: form.courseTag,
            });
            setVideoFile(null);

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
        // ✅ AddCourse-style: click outside to close, but guarded
        if (e.target === e.currentTarget && !loading) {
            requestClose();
        }
    }

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-container">
                <div className="modal-header">
                    <h2 className="modal-title">Edit Course</h2>
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
                        <input
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            disabled={loading}
                        />
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
                        <input
                            name="courseTag"
                            value={form.courseTag}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Replace Video (optional, mp4)</label>
                        <input type="file" accept="video/mp4" onChange={handleVideoChange} disabled={loading} />
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
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
