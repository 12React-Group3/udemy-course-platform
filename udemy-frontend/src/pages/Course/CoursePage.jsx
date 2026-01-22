// src/pages/Course/CoursePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Topbar from "../../components/Topbar";
import {
  fetchCourseById,
  fetchCourseVideoUrl,
  subscribeCourse,
  unsubscribeCourse,
} from "../../api/courses";
import { getProfile } from "../../api/profile";
import { isLearner } from "../../auth/authStore";

export default function CoursePage() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [videoSrc, setVideoSrc] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // NEW: subscription state
  const [enrolledSet, setEnrolledSet] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

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

        // load course + profile in parallel
        const [res, profileRes] = await Promise.all([
          fetchCourseById(courseId),
          getProfile().catch(() => null),
        ]);

        if (!res.data?.success) throw new Error(res.data?.message || "Failed to load course");

        const c = res.data.data;
        if (!cancelled) setCourse(c);

        // set enrolledCourses
        const enrolled = profileRes?.data?.data?.user?.enrolledCourses || [];
        if (!cancelled) setEnrolledSet(new Set(enrolled));

        // video: only fetch signed url if video exists
        // (we fetch regardless of subscription, but we can hide playback below)
        if (c?.videoKey) {
          const v = await fetchCourseVideoUrl(courseId);
          if (!v.data?.success) throw new Error(v.data?.message || "Failed to get video url");
          if (!cancelled) setVideoSrc(v.data.data.signedUrl);
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
      <Topbar />

      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
        <Link to="/courses" style={{ display: "inline-block", marginBottom: 12 }}>
          ← Back
        </Link>

        {/* Title row with indicator + button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            margin: "6px 0",
          }}
        >
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

        <div style={{ marginTop: 18 }}>
          <h2 style={{ marginBottom: 10 }}>Course Video</h2>

          {/* OPTIONAL: gate video for learner if not subscribed */}
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
