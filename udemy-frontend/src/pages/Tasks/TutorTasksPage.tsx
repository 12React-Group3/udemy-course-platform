import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllTasks, deleteTask } from "../../api/tasks";
import { fetchAllCourses } from "../../api/courses";
import { getProfile } from "../../api/profile";
import AddTask from "./AddTask";
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
  title: string;
  instructor: string;
  instructorId?: string;
  courseUid?: string;
  id?: string;
}

interface UserProfile {
  id: string;
  userName: string;
  email: string;
  role: string;
}

export default function TutorTasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [filterCourse, setFilterCourse] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [tasksRes, coursesRes, profileRes] = await Promise.all([
        fetchAllTasks(),
        fetchAllCourses(),
        getProfile().catch(() => null),
      ]);

      if (tasksRes.data?.success) {
        setTasks(tasksRes.data.data || []);
      }

      if (coursesRes.data?.success) {
        setAllCourses(coursesRes.data.data || []);
      }

      if (profileRes?.data?.success && profileRes.data.data?.user) {
        setUserProfile(profileRes.data.data.user);
      }
    } catch (err: any) {
      const apiMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message;
      setError(apiMessage || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter courses to only show courses created by this tutor
  const tutorCourses = useMemo(() => {
    if (!userProfile?.id) return [];
    return allCourses.filter((c) => c.instructorId === userProfile.id);
  }, [allCourses, userProfile]);

  // Get courseIds for tutor's courses
  const tutorCourseUids = useMemo(() => {
    const ids = new Set<string>();
    tutorCourses.forEach((course) => {
      [course.courseUid, course.id, course.courseId].forEach((value) => {
        if (value) ids.add(value);
      });
    });
    return ids;
  }, [tutorCourses]);

  // Filter tasks to only show tasks for tutor's courses
  const tutorTasks = useMemo(() => {
    return tasks.filter((t) =>
      tutorCourseUids.has(t.courseUid || t.courseId || "")
    );
  }, [tasks, tutorCourseUids]);

  const filteredTasks = useMemo(() => {
    if (filterCourse === "all") return tutorTasks;
    return tutorTasks.filter((t) => (t.courseUid || t.courseId || "") === filterCourse);
  }, [tutorTasks, filterCourse]);

  const getCourseName = (courseId: string) => {
    const course = allCourses.find(
      (c) => (c.courseUid || c.id || c.courseId) === courseId
    );
    return course?.title || courseId;
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await deleteTask(taskId);
      if (res.data?.success) {
        setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
        setDeleteConfirm(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete task");
    }
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
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tutor-tasks-page">
        <div className="tasks-error">
          <p>{error}</p>
          <button onClick={loadData}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tutor-tasks-page">
      <div className="tasks-header">
        <div className="tasks-header-content">
          <h1 className="tasks-title">My Tasks</h1>
          <p className="tasks-subtitle">Create and manage quizzes for your courses</p>
        </div>
        <button
          className="create-task-btn"
          onClick={() => setIsAddTaskOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create Task
        </button>
      </div>

      <div className="tasks-filter-bar">
        <div className="filter-group">
          <label>Filter by Course:</label>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
          >
            <option value="all">All Courses</option>
            {tutorCourses.map((course) => (
              <option key={course.courseUid || course.courseId} value={course.courseUid || course.id || course.courseId}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
        <span className="tasks-count">
          {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="tasks-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3>No tasks yet</h3>
          <p>
            {filterCourse !== "all"
              ? "No tasks for this course. Create one to get started."
              : "Create your first task to start assessing your students."}
          </p>
          <button
            className="create-task-btn"
            onClick={() => setIsAddTaskOpen(true)}
          >
            Create Task
          </button>
        </div>
      ) : (
        <div className="tasks-list">
          {filteredTasks.map((task) => (
            <div key={task.taskId} className="task-card">
              <div className="task-card-header" onClick={() => setExpandedTask(expandedTask === task.taskId ? null : task.taskId)}>
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
                <div className="task-card-actions">
                  <button
                    className="task-action-btn view"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tasks/${task.taskId}`);
                    }}
                    title="View Details"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    className="task-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(task.taskId);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button className="task-expand-btn">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{
                        transform: expandedTask === task.taskId ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {expandedTask === task.taskId && task.questions && task.questions.length > 0 && (
                <div className="task-questions-preview">
                  <h4>Questions Preview</h4>
                  <div className="questions-preview-list">
                    {task.questions.map((q, index) => (
                      <div key={q.questionId} className="question-preview">
                        <div className="question-preview-header">
                          <span className="question-preview-number">Q{index + 1}</span>
                          <span className={`difficulty-badge ${q.difficulty}`}>
                            {q.difficulty}
                          </span>
                        </div>
                        <p className="question-preview-text">{q.questionText}</p>
                        <div className="question-preview-options">
                          {q.options.map((opt, i) => (
                            <span
                              key={i}
                              className={`option-preview ${opt === q.correctAnswer ? "correct" : ""}`}
                            >
                              {opt}
                              {opt === q.correctAnswer && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delete Confirmation */}
              {deleteConfirm === task.taskId && (
                <div className="delete-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
                  <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                    <h4>Delete Task?</h4>
                    <p>This will permanently delete "{task.title}" and all its questions.</p>
                    <div className="delete-confirm-actions">
                      <button onClick={() => setDeleteConfirm(null)}>Cancel</button>
                      <button className="delete-btn" onClick={() => handleDeleteTask(task.taskId)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddTask
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onSuccess={loadData}
        courses={tutorCourses}
      />
    </div>
  );
}
