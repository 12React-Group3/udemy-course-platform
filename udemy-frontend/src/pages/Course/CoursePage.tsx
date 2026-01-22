// src/pages/Course/CoursePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  fetchCourseById,
  fetchCourseVideoUrl,
  subscribeCourse,
  unsubscribeCourse,
} from "../../api/courses";
import { getProfile } from "../../api/profile";
import { isLearner } from "../../auth/authStore";
import { fetchTasksByCourseId, fetchMySubmissions } from "../../api/tasks";
import type { ApiCourse } from "../../types";
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
  type?: string;
  dueDate?: string | null;
  questions?: Array<{ questionId: string }>;
}

// Submission record type
interface TaskRecord {
  taskId: string;
  score: number;
}

export default function CoursePage() {
  const { courseUid: courseId } = useParams<{ courseUid: string }>();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Submissions state (to check completion)
  const [submissions, setSubmissions] = useState<Map<string, TaskRecord>>(new Map());

  const learner = isLearner();
  const locationState = (location.state as { from?: string } | null) ?? null;
  const fromPath = locationState?.from;
  const handleBack = () => {
    if (fromPath) {
      navigate(fromPath);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/courses");
  };
  // Use the course's actual id (courseUid) for subscription check, not the URL param
  const courseUid = course?.id || course?.courseUid || courseId || "";
  const subscribed = useMemo(() => (courseUid ? enrolledSet.has(courseUid) : false), [enrolledSet, courseUid]);

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

        // load tasks and submissions
        try {
          if (!cancelled) setTasksLoading(true);
          const [tRes, subRes] = await Promise.all([
            fetchTasksByCourseId(courseId),
            fetchMySubmissions().catch(() => null),
          ]);
          const list = tRes.data?.data || tRes.data || [];
          if (!cancelled) setTasksRaw(Array.isArray(list) ? list : []);

          // Build submissions map
          if (subRes?.data?.success && !cancelled) {
            const map = new Map<string, TaskRecord>();
            (subRes.data.data || []).forEach((record: TaskRecord) => {
              if (record.taskId) {
                map.set(record.taskId, record);
              }
            });
            setSubmissions(map);
          }
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

  if (loading) {
    return (
      <div className="course-page">
        <div className="fallback-container">
          <div className="loading-spinner" />
          <p>Loading course...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="course-page">
        <div className="fallback-container error">
          <p>Error: {err}</p>
          <Link to="/">Back</Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-page">
        <div className="fallback-container">
          <p>Course not found.</p>
          <Link to="/">Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="course-page">
      <button
        className="back-btn course-back-link"
        type="button"
        onClick={handleBack}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to catalog
      </button>

      {toast && <div className="course-toast">{toast}</div>}

      <div className="course-page-body">
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
            <div className="course-description">
              {course.description ? (
                <p>{course.description}</p>
              ) : (
                <p className="course-description--faint">This course doesn’t have a description yet.</p>
              )}
            </div>
          </div>

          {learner ? (
            <div className="course-header-actions">
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

        <section className="course-section">
          <div className="section-card">
            <div className="section-heading">
              <h2>Tasks</h2>
              {tasksRaw.length > 0 && (
                <span className="section-count">{tasksRaw.length} tasks</span>
              )}
            </div>

            <div className="section-body">
              {tasksLoading ? (
                <div className="placeholder-card">Loading tasks...</div>
              ) : tasksErr ? (
                <div className="placeholder-card placeholder-card--error">{tasksErr}</div>
              ) : tasksRaw.length === 0 ? (
                <div className="placeholder-card">No tasks right now.</div>
              ) : (
                <div className="tasks-list">
                  {tasksRaw.map((t: Task) => {
                    const taskId = t.taskId || t._id || "";
                    const targetId = encodeURIComponent(taskId);
                    const record = submissions.get(taskId);
                    const isCompleted = !!record;
                    const targetPath = learner
                      ? isCompleted
                        ? `/tasks/${targetId}/result`
                        : `/tasks/${targetId}/take`
                      : `/tasks/${targetId}`;

                    return (
                      <Link
                        key={taskId}
                        className={`task-item ${isCompleted ? "task-item--completed" : ""}`}
                        to={targetPath}
                      >
                        <div className="task-item-left">
                          {learner && (
                            <span className={`task-item-status ${isCompleted ? "done" : "pending"}`}>
                              {isCompleted ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                </svg>
                              )}
                            </span>
                          )}
                          <div className="task-item-info">
                            <span className="task-item-title">
                              {t.title || t.taskName || `Task ${taskId}`}
                            </span>
                            <span className="task-item-meta">
                              {t.type && <span className="task-item-type">{t.type}</span>}
                              <span>{t.questions?.length || 0} questions</span>
                              {learner && isCompleted && record && (
                                <span className="task-item-score">{record.score}%</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <span className="task-item-action">
                          {learner ? (isCompleted ? "View Result" : "Start") : "View"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
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
