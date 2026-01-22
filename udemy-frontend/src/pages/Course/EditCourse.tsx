import React, { useEffect, useRef, useState } from "react";
import { presignVideoUpload, presignThumbnailUpload, updateCourse } from "../../api/courses";
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
        await new Promise < void> ((resolve, reject) => {
            const onLoaded = () => resolve();
            const onError = () => reject(new Error("Failed to load video metadata"));

            video.addEventListener("loadedmetadata", onLoaded, { once: true });
            video.addEventListener("error", onError, { once: true });
        });

        const duration = Number.isFinite(video.duration) ? video.duration : 3;
        const safeMax = Math.max(0.2, duration - 0.2);
        const t = Math.min(safeMax, Math.max(0.5, Math.random() * safeMax));

        // Some browsers need loadeddata before seek works reliably
        await new Promise < void> ((resolve, reject) => {
            const onLoadedData = () => resolve();
            const onError = () => reject(new Error("Failed to load video data"));
            video.addEventListener("loadeddata", onLoadedData, { once: true });
            video.addEventListener("error", onError, { once: true });
        });

        video.currentTime = t;

        // 2) Wait seek
        await new Promise < void> ((resolve, reject) => {
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
        const blob = await new Promise < Blob > ((resolve, reject) => {
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

type EditCourseProps = {
    isOpen: boolean;
    onClose?: () => void;
    onSuccess?: () => void;
    course: any; // keep flexible since your Course type differs between pages
};

export default function EditCourse({ isOpen, onClose, onSuccess, course }: EditCourseProps) {
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

    const [videoFile, setVideoFile] = useState < File | null > (null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);

    // Prefer course.id (courseUid) for API calls since it's the unique identifier
    const courseId = course?.id || course?.courseUid || course?.courseId || "";

    // init once per open + courseId
    const initializedForCourseIdRef = useRef < string | null > (null);

    useEffect(() => {
        if (!isOpen || !courseId) return;

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
    }, [isOpen, courseId]);

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

    const requestClose = () => {
        if (loading) return;

        if (!computeDirty()) {
            onClose?.();
            return;
        }

        const ok = window.confirm("You have unsaved changes. Discard them and close?");
        if (ok) onClose?.();
    };

    // Escape + scroll lock
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
        // we want current dirty state, so keep deps
    }, [isOpen, loading, form, videoFile, initialForm]);

    if (!isOpen || !course) return null;

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        if (!courseId) {
            setMessage("Missing courseId.");
            return;
        }
        if (!form.title.trim()) {
            setMessage("Title is required.");
            return;
        }

        try {
            setLoading(true);
            setUploadProgress(10);

            // base payload always updates text fields
            let payload: any = {
                title: form.title,
                description: form.description,
                courseTag: form.courseTag,
            };

            // If replacing video, also replace thumbnailKey (and DO NOT store public thumbnailUrl)
            if (videoFile) {
                // 1) presign video upload
                const presignRes = await presignVideoUpload({
                    courseId,
                    fileName: videoFile.name,
                    contentType: videoFile.type,
                });

                if (!presignRes.data?.success) {
                    throw new Error(presignRes.data?.message || "Failed to presign video upload");
                }

                const { uploadUrl, fileUrl, key } = presignRes.data.data;
                setUploadProgress(30);

                // 2) upload video
                const putResp = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": "video/mp4" },
                    body: videoFile,
                });

                if (!putResp.ok) throw new Error(`S3 video upload failed: ${putResp.status}`);
                setUploadProgress(55);

                // 3) generate thumbnail blob from NEW video
                const thumbBlob = await extractRandomThumbnailBlob(videoFile);
                setUploadProgress(65);

                // 4) presign thumbnail upload
                const thumbName = `thumbnail-${Date.now()}.jpg`;
                const thumbPresign = await presignThumbnailUpload({
                    courseId,
                    fileName: thumbName,
                    contentType: "image/jpeg",
                });

                if (!thumbPresign.data?.success) {
                    throw new Error(thumbPresign.data?.message || "Failed to presign thumbnail upload");
                }

                const {
                    uploadUrl: thumbUploadUrl,
                    key: thumbKey,
                    // fileUrl: thumbFileUrl, // ignore (private bucket => 403 if rendered directly)
                } = thumbPresign.data.data;

                // 5) upload thumbnail
                const thumbPut = await fetch(thumbUploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": "image/jpeg" },
                    body: thumbBlob,
                });

                if (!thumbPut.ok) throw new Error(`Thumbnail upload failed: ${thumbPut.status}`);
                setUploadProgress(80);

                // 6) include video + thumbnail keys in update payload
                payload = {
                    ...payload,
                    videoURL: fileUrl,
                    videoKey: key,
                    thumbnailKey: thumbKey,
                    thumbnailUrl: "", // critical: don't store/serve public URL for private bucket
                };
            }

            const updateRes = await updateCourse(courseId, payload);
            if (!updateRes.data?.success) {
                throw new Error(updateRes.data?.message || "Update course failed");
            }

            setUploadProgress(100);
            setMessage("Course updated successfully!");

            // saved baseline
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
        if (e.target === e.currentTarget && !loading) requestClose();
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
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                            If you replace the video, we will auto-generate & upload a new thumbnail too.
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
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
