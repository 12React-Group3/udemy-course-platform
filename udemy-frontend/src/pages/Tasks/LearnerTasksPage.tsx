import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllTasks } from "../../api/tasks";
import { fetchAllCourses } from "../../api/courses";
import { getProfile } from "../../api/profile";
import "./TutorTasksPage.css";

interface Question {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
}

interface Task {
  taskId: string;
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

export default function LearnerTasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return (
      <div className="tutor-tasks-page">
        <div className="tasks-loading">
          <div className="tasks-spinner"></div>
          <p>Loading your tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tutor-tasks-page">
        <div className="tasks-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!userProfile?.enrolledCourses || userProfile.enrolledCourses.length === 0) {
    return (
      <div className="tutor-tasks-page">
        <div className="tasks-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3>No subscriptions yet</h3>
          <p>Subscribe to a course to see its tasks here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tutor-tasks-page">
      <div className="tasks-header">
        <div className="tasks-header-content">
          <h1 className="tasks-title">My Tasks</h1>
          <p className="tasks-subtitle">Tasks from the courses you are subscribed to</p>
        </div>
      </div>

      {learnerTasks.length === 0 ? (
        <div className="tasks-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3>No tasks available</h3>
          <p>Tasks will appear once your tutors create them.</p>
        </div>
      ) : (
        <div className="tasks-list">
          {learnerTasks.map((task) => (
            <div key={task.taskId} className="task-card">
              <div
                className="task-card-header"
                onClick={() => navigate(`/tasks/${task.taskId}`)}
              >
                <div className="task-card-info">
                  <div className="task-card-top">
                    <span className={`task-type-badge ${task.type}`}>{task.type}</span>
                    <span className="task-course-badge">
                      {getCourseName(task.courseUid || task.courseId || "")}
                    </span>
                  </div>
                  <h3 className="task-card-title">{task.title}</h3>
                  {task.description && (
                    <p className="task-card-description">{task.description}</p>
                  )}
                  <div className="task-card-meta">
                    <span className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {task.questions?.length || 0} questions
                    </span>
                    <span className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                </div>
                <svg className="task-item-arrow" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
