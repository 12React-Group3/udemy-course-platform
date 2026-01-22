// src/pages/Course/CoursePage.tsx
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
import type { ApiCourse } from "../../types";
import { useNavigate } from "react-router-dom";
import "./CoursePage.css";

// Extended course type with additional fields from API
interface CourseData extends ApiCourse {
  id?: string;
}

// Task type for this page
interface Task {
  taskId?: string;
  _id?: string;
  title?: string;
  taskName?: string;
  description?: string;
}

export default function CoursePage() {
  // Route param is :courseUid (matches the route definition in AppRoutes.jsx)
  const { courseUid: courseId } = useParams<{ courseUid: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [videoSrc, setVideoSrc] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // subscription state
  const [enrolledSet, setEnrolledSet] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // Tasks state
  const [tasksRaw, setTasksRaw] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksErr, setTasksErr] = useState("");

  const learner = isLearner();
  // Use the course's actual id (courseUid) for subscription check, not the URL param
  const courseUid = course?.id || course?.courseUid || courseId || "";
  const subscribed = useMemo(() => courseUid ? enrolledSet.has(courseUid) : false, [enrolledSet, courseUid]);

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
        } catch (te: unknown) {
          if (!cancelled) {
            const taskError = te as { response?: { data?: { message?: string } }; message?: string };
            setTasksErr(taskError.response?.data?.message || taskError.message || "Failed to load tasks");
          }
        } finally {
          if (!cancelled) setTasksLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const error = e as { response?: { data?: { error?: string } }; message?: string };
          setErr(error.response?.data?.error || error.message || "Something went wrong");
        }
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
    // Use courseUid for subscription API calls
    const subKey = course?.id || course?.courseUid || courseId || "";
    if (!subKey) return;

    try {
      setBusy(true);
      setToast("");

      if (subscribed) {
        const res = await unsubscribeCourse(subKey);
        if (!res.data?.success) throw new Error(res.data?.message || "Unsubscribe failed");

        const next = new Set(enrolledSet);
        next.delete(subKey);
        setEnrolledSet(next);
        setToast("Unsubscribed.");
      } else {
        const res = await subscribeCourse(subKey);
        if (!res.data?.success) throw new Error(res.data?.message || "Subscribe failed");

        const next = new Set(enrolledSet);
        next.add(subKey);
        setEnrolledSet(next);
        setToast("Subscribed! You can access the course now.");
      }
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } }; message?: string };
      setToast(error.response?.data?.message || error.message || "Action failed");
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
    <div className="course-page">
      <div className="course-page-content">
        <button
          className="back-btn course-back-link"
          type="button"
          onClick={() => navigate("/courses")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to catalog
        </button>

        {toast && <div className="course-toast">{toast}</div>}

        <div className="course-header-card">
          <div className="course-header-text">
            <h1 className="course-title">{course.title}</h1>
            <div className="course-meta">
              <span>Course ID: {course.courseId}</span>
              <span className="course-meta-separator">·</span>
              <span>Instructor: {course.instructor}</span>
              {course.courseTag ? (
                <>
                  <span className="course-meta-separator">·</span>
                  <span>Tag: {course.courseTag}</span>
                </>
              ) : null}
            </div>
          </div>

          {learner ? (
            <div className="course-header-actions">
              <span className={`course-status-badge ${subscribed ? "course-status-badge--active" : ""}`}>
                {subscribed ? "Subscribed" : "Not Subscribed"}
              </span>
              <button
                className={`course-btn ${subscribed ? "course-btn--primary" : "course-btn--outline"}`}
                onClick={onToggleSubscribe}
                disabled={busy}
              >
                {busy ? "Please wait..." : subscribed ? "Unsubscribe" : "Subscribe"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="course-description">
          {course.description ? (
            <p>{course.description}</p>
          ) : (
            <p className="course-description--faint">This course doesn’t have a description yet.</p>
          )}
        </div>

        <section className="course-section">
          <div className="section-card">
            <div className="section-heading">
              <h2>Tasks</h2>
            </div>

            <div className="section-body">
              {tasksLoading ? (
                <div className="placeholder-card">Loading tasks...</div>
              ) : tasksErr ? (
                <div className="placeholder-card placeholder-card--error">{tasksErr}</div>
              ) : tasksRaw.length === 0 ? (
                <div className="placeholder-card">No tasks right now.</div>
              ) : (
                <div className="tasks-grid">
                  {tasksRaw.map((t: Task) => {
                    const targetId = encodeURIComponent(t.taskId || t._id || "");
                    return (
                      <Link key={t.taskId || t._id} className="task-card" to={`/tasks/${targetId}`}>
                        <div>
                          <p className="task-card-title">
                            {t.title || t.taskName || `Task ${t.taskId || t._id}`}
                          </p>
                          {t.description ? (
                            <p className="task-card-description">{t.description}</p>
                          ) : null}
                        </div>
                        <span className="task-card-link-text">View task →</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="course-section">
          <div className="section-card">
            <div className="section-heading">
              <h2>Course Video</h2>
            </div>

            <div className="section-body course-video-card">
              {learner && !subscribed ? (
                <p className="placeholder-card">Subscribe to access this course video.</p>
              ) : !course.videoKey ? (
                <p className="placeholder-card">No video uploaded yet.</p>
              ) : !videoSrc ? (
                <p className="placeholder-card">Loading video...</p>
              ) : (
                <VideoPlayer url={videoSrc} />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

interface VideoPlayerProps {
  url: string;
}

function VideoPlayer({ url }: VideoPlayerProps) {
  return (
    <video
      src={url}
      controls
      playsInline
      preload="metadata"
      className="course-video-player"
    />
  );
}
