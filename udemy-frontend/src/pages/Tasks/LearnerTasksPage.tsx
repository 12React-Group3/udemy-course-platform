import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllTasks, fetchMySubmissions } from "../../api/tasks";
import { fetchAllCourses } from "../../api/courses";
import { getProfile } from "../../api/profile";
import "./LearnerTasksPage.css";

interface Question {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
}

interface Task {
  taskId: string;
  _id?: string;
  courseUid?: string;
  courseId?: string;
  title: string;
  description: string;
  type: string;
  dueDate: string | null;
  questions: Question[];
  createdAt: string;
}

interface Course {
  courseId: string;
  courseUid?: string;
  title?: string;
  instructor?: string;
  instructorId?: string;
}

interface UserProfile {
  id: string;
  userName: string;
  email: string;
  role: string;
  enrolledCourses?: string[];
}

interface TaskRecord {
  taskId: string;
  score: number;
  responses: Array<{ questionId: string; answer: string; isCorrect: boolean }>;
  createdAt?: string;
}

export default function LearnerTasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState<Map<string, TaskRecord>>(new Map());
  const [subLoading, setSubLoading] = useState(true);
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [tasksRes, coursesRes, profileRes] = await Promise.all([
          fetchAllTasks(),
          fetchAllCourses(),
          getProfile().catch(() => null),
        ]);

        if (tasksRes.data?.success && !cancelled) {
          setTasks(tasksRes.data.data || []);
        }
        if (coursesRes.data?.success && !cancelled) {
          setCourses(coursesRes.data.data || []);
        }
        if (profileRes?.data?.success && profileRes.data.data?.user && !cancelled) {
          setUserProfile(profileRes.data.data.user);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          let apiMessage = "Failed to load tasks";
          if (typeof err === "object" && err !== null) {
            const errorObj = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
            apiMessage =
              errorObj.response?.data?.message ||
              errorObj.response?.data?.error ||
              errorObj.message ||
              "Failed to load tasks";
          }
          setError(apiMessage);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSubmissions() {
      try {
        setSubLoading(true);
        setSubmissionError("");
        const res = await fetchMySubmissions();
        if (!res.data?.success) {
          throw new Error(res.data?.message || "Failed to load submissions");
        }
        const map = new Map<string, TaskRecord>();
        (res.data.data || []).forEach((record: TaskRecord) => {
          if (record.taskId) {
            map.set(record.taskId, record);
          }
        });
        if (!cancelled) setSubmissions(map);
      } catch (err: unknown) {
        if (!cancelled) {
          const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
          setSubmissionError(errorObj.response?.data?.message || errorObj.message || "Failed to load your submissions");
        }
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    }

    loadSubmissions();
    return () => {
      cancelled = true;
    };
  }, []);

  const enrolledCourseUids = useMemo(() => {
    if (!userProfile?.enrolledCourses || userProfile.enrolledCourses.length === 0) {
      return new Set<string>();
    }
    return new Set(userProfile.enrolledCourses);
  }, [userProfile]);

  const learnerTasks = useMemo(() => {
    if (enrolledCourseUids.size === 0) return [];
    return tasks.filter((task) =>
      enrolledCourseUids.has(task.courseUid || task.courseId || "")
    );
  }, [tasks, enrolledCourseUids]);

  const learnerTasksSorted = useMemo(() => {
    const computeTime = (dateStr: string | null) =>
      dateStr ? new Date(dateStr).getTime() : Number.POSITIVE_INFINITY;

    return [...learnerTasks].sort((a, b) => {
      const taskIdA = a.taskId || a._id || "";
      const taskIdB = b.taskId || b._id || "";
      const isCompletedA = submissions.has(taskIdA);
      const isCompletedB = submissions.has(taskIdB);

      // Incomplete tasks come first
      if (isCompletedA !== isCompletedB) {
        return isCompletedA ? 1 : -1;
      }

      // Then sort by due date
      const timeA = computeTime(a.dueDate);
      const timeB = computeTime(b.dueDate);
      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // Then by created date
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [learnerTasks, submissions]);

  const stats = useMemo(() => {
    const total = learnerTasks.length;
    const completed = learnerTasks.filter((t) => {
      const taskId = t.taskId || t._id || "";
      return submissions.has(taskId);
    }).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [learnerTasks, submissions]);

  const getCourseName = (courseUid: string) => {
    const course = courses.find(
      (c) => (c.courseUid || c.courseId) === courseUid
    );
    return course?.title || courseUid;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No due date";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getScoreClass = (score: number) => {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    if (score >= 40) return "average";
    return "poor";
  };

  if (loading) {
    return (
      <div className="learner-tasks-page">
        <div className="learner-tasks-loading">
          <div className="learner-spinner" />
          <p>Loading your tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="learner-tasks-page">
        <div className="learner-tasks-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!userProfile?.enrolledCourses || userProfile.enrolledCourses.length === 0) {
    return (
      <div className="learner-tasks-page">
        <div className="learner-tasks-header">
          <h1>My Tasks</h1>
          <p>Complete tasks from your enrolled courses</p>
        </div>
        <div className="learner-tasks-empty">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3>No courses subscribed yet</h3>
          <p>Subscribe to courses to see their tasks and assignments here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="learner-tasks-page">
      <div className="learner-tasks-header">
        <h1>My Tasks</h1>
        <p>Complete tasks from your enrolled courses</p>
      </div>

      {/* Stats Section */}
      <div className="learner-tasks-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Tasks</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      </div>

      {submissionError && (
        <div className="learner-submission-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{submissionError}</span>
        </div>
      )}

      {learnerTasks.length === 0 ? (
        <div className="learner-tasks-empty">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3>No tasks available</h3>
          <p>Tasks will appear here once your tutors create them for your courses.</p>
        </div>
      ) : (
        <div className="learner-tasks-grid">
          {learnerTasksSorted.map((task) => {
            const taskId = task.taskId || task._id || "";
            const record = taskId ? submissions.get(taskId) : null;
            const isCompleted = !!record;
            const targetPath = isCompleted
              ? `/tasks/${taskId}/result`
              : `/tasks/${taskId}/take`;

            return (
              <div
                key={taskId}
                className={`learner-task-card ${isCompleted ? "completed" : ""}`}
                onClick={() => taskId && navigate(targetPath)}
              >
                <div className="learner-card-header">
                  <div className="learner-card-badges">
                    <span className={`learner-type-badge ${task.type}`}>
                      {task.type}
                    </span>
                    <span className="learner-course-badge">
                      {getCourseName(task.courseUid || task.courseId || "")}
                    </span>
                    <span
                      className={`learner-status-badge ${
                        isCompleted ? "submitted" : subLoading ? "checking" : "not-started"
                      }`}
                    >
                      {isCompleted ? "Completed" : subLoading ? "Checking..." : "Not Started"}
                    </span>
                  </div>
                </div>

                <div className="learner-card-body">
                  <h3 className="learner-card-title">{task.title}</h3>
                  {task.description && (
                    <p className="learner-card-description">{task.description}</p>
                  )}
                  <div className="learner-card-meta">
                    <span className="learner-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {task.questions?.length || 0} questions
                    </span>
                    <span className="learner-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                </div>

                <div className="learner-card-footer">
                  {isCompleted && record ? (
                    <div className="learner-score-display">
                      <span className="learner-score-text">
                        Score: <span className="learner-score-value">{record.score}%</span>
                      </span>
                      <div className="learner-score-bar">
                        <div
                          className={`learner-score-fill ${getScoreClass(record.score)}`}
                          style={{ width: `${record.score}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="learner-not-taken">Ready to attempt</span>
                  )}
                  <button
                    className={`learner-card-btn ${isCompleted ? "view" : "start"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (taskId) navigate(targetPath);
                    }}
                  >
                    {isCompleted ? (
                      <>
                        View Result
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </>
                    ) : (
                      <>
                        Start Task
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
