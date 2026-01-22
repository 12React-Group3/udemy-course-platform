// src/pages/Course/CoursePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchCourseById,
  fetchCourseVideoUrl,
  subscribeCourse,
  unsubscribeCourse,
} from "../../api/courses";
import { getProfile } from "../../api/profile";
import { isLearner } from "../../auth/authStore";
import { fetchTasksByCourseId } from "../../api/tasks";

export default function CoursePage() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [videoSrc, setVideoSrc] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // subscription state
  const [enrolledSet, setEnrolledSet] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // NEW: tasks state
  const [tasksRaw, setTasksRaw] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksErr, setTasksErr] = useState("");

  const learner = isLearner();
  const subscribed = useMemo(() => enrolledSet.has(courseId), [enrolledSet, courseId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr("");
        setToast("");
        setVideoSrc("");

        setTasksRaw([]);
        setTasksErr("");

        // load course + profile in parallel
        const [res, profileRes] = await Promise.all([
          fetchCourseById(courseId),
          getProfile().catch(() => null),
        ]);

        if (!res.data?.success) throw new Error(res.data?.message || "Failed to load course");

        const c = res.data.data;
        if (!cancelled) setCourse(c);

        const enrolled = profileRes?.data?.data?.user?.enrolledCourses || [];
        if (!cancelled) setEnrolledSet(new Set(enrolled));

        // load video
        if (c?.videoKey) {
          const v = await fetchCourseVideoUrl(courseId);
          if (!v.data?.success) throw new Error(v.data?.message || "Failed to get video url");
          if (!cancelled) setVideoSrc(v.data.data.signedUrl);
        }

        // load tasks
        try {
          if (!cancelled) setTasksLoading(true);
          const tRes = await fetchTasksByCourseId(courseId);
          const list = tRes.data?.data || tRes.data || [];
          if (!cancelled) setTasksRaw(Array.isArray(list) ? list : []);
        } catch (te) {
          if (!cancelled) {
            setTasksErr(te.response?.data?.message || te.message || "Failed to load tasks");
          }
        } finally {
          if (!cancelled) setTasksLoading(false);
        }
      } catch (e) {
        if (!cancelled) setErr(e.response?.data?.error || e?.message || "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const onToggleSubscribe = async () => {
    try {
      setBusy(true);
      setToast("");

      if (subscribed) {
        const res = await unsubscribeCourse(courseId);
        if (!res.data?.success) throw new Error(res.data?.message || "Unsubscribe failed");

        const next = new Set(enrolledSet);
        next.delete(courseId);
        setEnrolledSet(next);
        setToast("Unsubscribed.");
      } else {
        const res = await subscribeCourse(courseId);
        if (!res.data?.success) throw new Error(res.data?.message || "Subscribe failed");

        const next = new Set(enrolledSet);
        next.add(courseId);
        setEnrolledSet(next);
        setToast("Subscribed! You can access the course now.");
      }
    } catch (e) {
      setToast(e.response?.data?.message || e.message || "Action failed");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(""), 2500);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <p style={{ color: "crimson" }}>Error: {err}</p>
        <Link to="/">Back</Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: 16 }}>
        <p>Course not found.</p>
        <Link to="/">Back</Link>
      </div>
    );
  }

  return (
    <>

      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
        <Link to="/courses" style={{ display: "inline-block", marginBottom: 12 }}>
          ← Back
        </Link>

        {/* Title row with indicator + button */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "6px 0" }}>
          <h1 style={{ margin: 0 }}>{course.title}</h1>

          {learner ? (
            <>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  border: "1px solid #d1d7dc",
                  background: subscribed ? "#e8f5ff" : "#fff",
                }}
              >
                {subscribed ? "Subscribed" : "Not Subscribed"}
              </span>

              <button
                onClick={onToggleSubscribe}
                disabled={busy}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d7dc",
                  background: subscribed ? "#007bff" : "#fff",
                  color: subscribed ? "#fff" : "#111",
                  fontWeight: 800,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Please wait..." : subscribed ? "Unsubscribe" : "Subscribe"}
              </button>
            </>
          ) : null}
        </div>

        {toast ? (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              border: "1px solid #d1d7dc",
              borderRadius: 10,
              fontWeight: 600,
              background: "#fff",
            }}
          >
            {toast}
          </div>
        ) : null}

        <div style={{ opacity: 0.8, marginBottom: 12 }}>
          <span>CourseId: {course.courseId}</span>
          {" · "}
          <span>Instructor: {course.instructor}</span>
          {course.courseTag ? (
            <>
              {" · "}
              <span>Tag: {course.courseTag}</span>
            </>
          ) : null}
        </div>

        {course.description ? (
          <p style={{ lineHeight: 1.6 }}>{course.description}</p>
        ) : (
          <p style={{ opacity: 0.8 }}>No description yet.</p>
        )}

        {/* NEW: Tasks section */}
        <div style={{ marginTop: 18 }}>
          <h2 style={{ marginBottom: 10 }}>Tasks</h2>

          {tasksLoading ? (
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>Loading tasks...</div>
          ) : tasksErr ? (
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, color: "crimson" }}>
              {tasksErr}
            </div>
          ) : tasksRaw.length === 0 ? (
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, opacity: 0.85 }}>
              No tasks right now.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {tasksRaw.map((t) => (
                <div
                  key={t.taskId || t._id}
                  style={{
                    padding: 12,
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800 }}>
                      {t.title || t.taskName || `Task ${t.taskId || t._id}`}
                    </div>
                    {t.description ? (
                      <div style={{ opacity: 0.85, marginTop: 4, lineHeight: 1.4 }}>
                        {t.description}
                      </div>
                    ) : null}
                  </div>

                  {/* Button to task detail page */}
                  <Link
                    to={`/tasks/${encodeURIComponent(t.taskId || t._id)}`}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #d1d7dc",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                      textDecoration: "none",
                      color: "#111",
                      background: "#fff",
                    }}
                  >
                    View Task →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video Section */}
        <div style={{ marginTop: 18 }}>
          <h2 style={{ marginBottom: 10 }}>Course Video</h2>

          {/* optional gating */}
          {learner && !subscribed ? (
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
              Subscribe to access this course video.
            </div>
          ) : !course.videoKey ? (
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
              No video uploaded yet.
            </div>
          ) : !videoSrc ? (
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
              Loading video...
            </div>
          ) : (
            <VideoPlayer url={videoSrc} />
          )}
        </div>
      </div>
    </>
  );
}

function VideoPlayer({ url }) {
  return (
    <video
      src={url}
      controls
      playsInline
      preload="metadata"
      style={{ width: "100%", borderRadius: 10, border: "1px solid #ddd" }}
    />
  );
}
