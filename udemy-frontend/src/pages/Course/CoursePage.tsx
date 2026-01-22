// src/pages/Course/CoursePage.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import {
  fetchCourseById,
  fetchCourseVideoUrl,
  deleteCourse,
  subscribeCourse,
  unsubscribeCourse,
} from "../../api/courses";
import { fetchTasksByCourse } from "../../api/tasks";
import { getProfile } from "../../api/profile";
import "./CoursePage.css";
import type { ApiCourse } from "../../types";

type TaskQuestion = {
  questionId: string;
  difficulty?: string;
  options?: string[];
};

type Task = {
  taskId: string;
  courseId: string;
  title: string;
  description?: string;
  type: string;
  dueDate?: string | null;
  questions?: TaskQuestion[];
};

type UserProfile = {
  id: string;
  role: string;
  enrolledCourses?: string[];
};

export default function CoursePage() {
  const { courseUid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backFrom = location.state?.from;
  const handleBack = () => {
    const target = backFrom && backFrom !== location.pathname ? backFrom : "/courses";
    navigate(target);
  };

  const openStatusModal = (message: string) => {
    setStatusMessage(message);
    setIsStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    if (isSubscriptionChanging) return;
    setStatusMessage("");
    setIsStatusModalOpen(false);
  };

  const openDeleteModal = () => {
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteError("");
    setIsDeleteModalOpen(false);
  };

  const handleDeleteCourse = async () => {
    if (!course?.courseUid) {
      setDeleteError("Unable to delete this course at the moment.");
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError("");
      const res = await deleteCourse(course.courseUid);
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to delete course");
      }
      setIsDeleteModalOpen(false);
      navigate("/dashboard");
    } catch (e) {
      setDeleteError(e.response?.data?.message || e.message || "Failed to delete course");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubscribeCourse = async () => {
    if (!course?.courseId) {
      openStatusModal("Unable to determine course ID for subscription.");
      return;
    }

    try {
      setIsSubscriptionChanging(true);
      const res = await subscribeCourse(course.courseId);
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to subscribe");
      }
      const courseKey = course.courseUid || course.courseId;
      setUserProfile((prev) => {
        if (!prev) return prev;
        const enrolled = new Set(prev.enrolledCourses || []);
        enrolled.add(courseKey);
        return { ...prev, enrolledCourses: Array.from(enrolled) };
      });
      openStatusModal("You are now subscribed to this course.");
    } catch (e) {
      openStatusModal(e.response?.data?.message || e.message || "Subscription failed");
    } finally {
      setIsSubscriptionChanging(false);
    }
  };

  const handleUnsubscribeCourse = async () => {
    if (!course?.courseId) {
      openStatusModal("Unable to determine course ID for unsubscribing.");
      return;
    }

    try {
      setIsSubscriptionChanging(true);
      const res = await unsubscribeCourse(course.courseId);
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to unsubscribe");
      }
      const courseKey = course.courseUid || course.courseId;
      setUserProfile((prev) => {
        if (!prev) return prev;
        const enrolled = (prev.enrolledCourses || []).filter((id) => id !== courseKey);
        return { ...prev, enrolledCourses: enrolled };
      });
      openStatusModal("You have unsubscribed from this course.");
    } catch (e) {
      openStatusModal(e.response?.data?.message || e.message || "Unsubscribe failed");
    } finally {
      setIsSubscriptionChanging(false);
    }
  };

  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [videoSrc, setVideoSrc] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubscriptionChanging, setIsSubscriptionChanging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Check if current user is the course owner
  const isOwner = userProfile?.id && course?.instructorId && userProfile.id === course.instructorId;
  const isLearnerUser = userProfile?.role === "learner";
  const courseKey = course?.courseUid || course?.courseId || "";
  const isEnrolled = Boolean(
    courseKey && userProfile?.enrolledCourses?.includes(courseKey)
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr("");
        setVideoSrc("");

        // Fetch course and profile in parallel
        const [courseRes, profileRes] = await Promise.all([
          fetchCourseById(courseUid),
          getProfile().catch(() => null),
        ]);

        if (!courseRes.data?.success) {
          throw new Error(courseRes.data?.message || "Failed to load course");
        }

        const c = courseRes.data.data;
        if (!cancelled) setCourse(c);

        // Set user profile
        if (profileRes?.data?.success && profileRes.data.data?.user) {
          if (!cancelled) setUserProfile(profileRes.data.data.user);
        }

        // Fetch video URL if available
        if (c?.videoKey && c?.courseId) {
          const v = await fetchCourseVideoUrl(c.courseId);
          if (v.data?.success && !cancelled) {
            setVideoSrc(v.data.data.signedUrl);
          }
        }

        // Fetch tasks for this course
        const tasksRes = c?.courseId
          ? await fetchTasksByCourse(c.courseId).catch(() => null)
          : null;
        if (tasksRes?.data?.success && !cancelled) {
          setTasks(tasksRes.data.data || []);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e.response?.data?.error || e?.message || "Something went wrong");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseUid]);

  if (loading) {
    return (
      <div className="course-page">
        <div className="course-loading">
          <div className="course-spinner"></div>
          <p>Loading course...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="course-page">
        <div className="course-error">
          <p>Error: {err}</p>
          <button type="button" className="back-link" onClick={handleBack}>Back to Courses</button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-page">
        <div className="course-not-found">
          <p>Course not found.</p>
          <button type="button" className="back-link" onClick={handleBack}>Back to Courses</button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-page">
      {/* Back Button */}
      <button type="button" className="back-link" onClick={handleBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Courses
      </button>

      {/* Course Header */}
      <div className="course-header">
        <div className="course-title-row">
          <h1 className="course-title">{course.title}</h1>
          <div className="course-badges">
            {course.courseTag && (
              <span className="course-tag-badge">{course.courseTag}</span>
            )}
            {isOwner && (
              <span className="owner-badge">Your Course</span>
            )}
          </div>
        </div>

        <div className="course-meta">
          <span className="course-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            {course.instructor}
          </span>
          <span className="course-meta-divider"></span>
          <span className="course-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            {course.courseId}
          </span>
        </div>
      </div>

      {/* Video - Main Focus */}
      <div className="course-video-wrapper">
        <div className="video-container">
          {!course.videoKey ? (
            <div className="video-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p>No video uploaded</p>
            </div>
          ) : !videoSrc ? (
            <div className="video-placeholder">
              <div className="course-spinner"></div>
              <p>Loading video...</p>
            </div>
          ) : (
            <video
              src={videoSrc}
              controls
              playsInline
              preload="metadata"
            />
          )}
        </div>
      </div>

      {/* Info Bar - Stats */}
      <div className="course-info-bar">
        <div className="course-stats">
          <div className="stat-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span className="stat-value">{course.students?.length || 0}</span>
            <span className="stat-label">enrolled</span>
          </div>
          <div className="stat-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="stat-value">{tasks.length}</span>
            <span className="stat-label">tasks</span>
          </div>
        </div>
        <div className="course-actions">
          {isLearnerUser && (
            <button
              type="button"
              className="subscribe-course-btn"
              onClick={isEnrolled ? handleUnsubscribeCourse : handleSubscribeCourse}
              disabled={isSubscriptionChanging}
            >
              {isSubscriptionChanging
                ? isEnrolled
                  ? "Unsubscribing..."
                  : "Subscribing..."
                : isEnrolled
                ? "Unsubscribe"
                : "Subscribe"}
            </button>
          )}
          {isOwner && (
            <button
              className="delete-course-btn"
              type="button"
              onClick={openDeleteModal}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Course"}
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {course.description && (
        <div className="course-description-section">
          <h3 className="description-title">About this course</h3>
          <p className="course-description">{course.description}</p>
        </div>
      )}

      {/* Tasks Section - Only for course owner */}
      {isOwner && (
        <div className="course-tasks-section">
          <div className="tasks-section-header">
            <h3 className="tasks-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Course Tasks
            </h3>
            <span className="tasks-count-badge">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
          </div>

          {tasks.length > 0 ? (
            <div className="course-tasks-list">
              {tasks.map((task) => (
                <Link key={task.taskId} to={`/tasks/${task.taskId}`} className="course-task-item">
                  <div className="task-item-left">
                    <span className={`task-type-badge ${task.type}`}>{task.type}</span>
                    <div className="task-item-content">
                      <h4 className="task-item-title">{task.title}</h4>
                      <div className="task-item-meta">
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {task.questions?.length || 0} questions
                        </span>
                        {task.dueDate && (
                          <span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <svg className="task-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          ) : (
            <div className="no-tasks-message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No tasks created for this course yet.</p>
              <Link to="/tasks" className="create-task-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create Task
              </Link>
            </div>
          )}
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="delete-modal-backdrop" role="dialog" aria-modal="true">
          <div className="delete-modal">
            <h3>Delete course?</h3>
            <p>
              This action cannot be undone. Please confirm that you want to permanently delete{" "}
              <strong>{course?.title}</strong> and all of its data.
            </p>
            {deleteError && <p className="delete-modal-error">{deleteError}</p>}
            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-modal-cancel"
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-modal-confirm"
                onClick={handleDeleteCourse}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Course"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isStatusModalOpen && (
        <div className="status-modal-backdrop" role="dialog" aria-modal="true">
          <div className="status-modal">
            <h3>Subscription status</h3>
            <p>{statusMessage}</p>
            <div className="status-modal-actions">
              <button
                type="button"
                className="status-modal-close"
                onClick={closeStatusModal}
                disabled={isSubscriptionChanging}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
