import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchTaskById, fetchTaskRecords } from "../../api/tasks";
import { fetchCourseById } from "../../api/courses";
import "./TaskDetailPage.css";
import { isAdmin, isTutor } from "../../auth/authStore";

interface Question {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
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
}

interface CompletedLearner {
  userId: string;
  userName: string;
  email: string;
  score: number;
  createdAt: string;
}

interface NotCompletedLearner {
  userId: string;
  userName: string;
  email: string;
}

interface TaskRecordsData {
  completedLearners: CompletedLearner[];
  notCompletedLearners: NotCompletedLearner[];
  totalEnrolled: number;
  totalCompleted: number;
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [records, setRecords] = useState<TaskRecordsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"questions" | "completed" | "notCompleted">("questions");

  useEffect(() => {
    async function loadData() {
      if (!taskId) return;

      try {
        setLoading(true);
        setError("");

        // Fetch task details
        const taskRes = await fetchTaskById(taskId);
        if (!taskRes.data?.success) {
          throw new Error(taskRes.data?.message || "Failed to load task");
        }
        const taskData = taskRes.data.data;
        setTask(taskData);

        // Fetch course details
        const courseIdentifier = taskData.courseUid || taskData.courseId || "";
        if (courseIdentifier) {
          const courseRes = await fetchCourseById(courseIdentifier);
          if (courseRes.data?.success) {
            setCourse(courseRes.data.data);
          }
        }

        // Fetch task records only when tutor/admin
        if (isTutor() || isAdmin()) {
          const recordsRes = await fetchTaskRecords(taskId);
          if (recordsRes.data?.success) {
            setRecords(recordsRes.data.data);
          }
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || "Failed to load data";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [taskId]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No due date";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="task-detail-page">
        <div className="task-detail-loading">
          <div className="task-detail-spinner"></div>
          <p>Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="task-detail-page">
        <div className="task-detail-error">
          <p>{error || "Task not found"}</p>
          <button onClick={() => navigate("/tasks")}>Back to Tasks</button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-detail-page">
      {/* Header */}
      <div className="task-detail-header">
        <button className="back-btn" onClick={() => navigate("/tasks")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Tasks
        </button>

        <div className="task-detail-title-section">
          <div className="task-detail-badges">
            <span className={`task-type-badge ${task.type}`}>{task.type}</span>
            {course && <span className="task-course-badge">{course.title}</span>}
          </div>
          <h1 className="task-detail-title">{task.title}</h1>
          {task.description && (
            <p className="task-detail-description">{task.description}</p>
          )}
          <div className="task-detail-meta">
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
              Due: {formatDate(task.dueDate)}
            </span>
            {records && (
              <span className="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
                {records.totalCompleted}/{records.totalEnrolled} completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="task-detail-tabs">
        <button
          className={`tab-btn ${activeTab === "questions" ? "active" : ""}`}
          onClick={() => setActiveTab("questions")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Questions ({task.questions?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Completed ({records?.totalCompleted || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === "notCompleted" ? "active" : ""}`}
          onClick={() => setActiveTab("notCompleted")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Not Completed ({records?.notCompletedLearners?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      <div className="task-detail-content">
        {/* Questions Tab */}
        {activeTab === "questions" && (
          <div className="questions-section">
            {task.questions && task.questions.length > 0 ? (
              <div className="questions-list">
                {task.questions.map((q, index) => (
                  <div key={q.questionId} className="question-detail-card">
                    <div className="question-detail-header">
                      <span className="question-number">Question {index + 1}</span>
                      <span className={`difficulty-badge ${q.difficulty}`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <p className="question-text">{q.questionText}</p>
                    <div className="options-list">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`option-item ${opt === q.correctAnswer ? "correct" : ""}`}
                        >
                          <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                          <span className="option-text">{opt}</span>
                          {opt === q.correctAnswer && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="correct-icon">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="explanation">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No questions added to this task yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Completed Learners Tab */}
        {activeTab === "completed" && (
          <div className="learners-section">
            {records?.completedLearners && records.completedLearners.length > 0 ? (
              <div className="learners-table-wrapper">
                <table className="learners-table">
                  <thead>
                    <tr>
                      <th>Learner</th>
                      <th>Email</th>
                      <th>Score</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.completedLearners.map((learner) => (
                      <tr key={learner.userId}>
                        <td className="learner-name">{learner.userName}</td>
                        <td className="learner-email">{learner.email}</td>
                        <td>
                          <span className={`score-badge ${learner.score >= 70 ? "pass" : "fail"}`}>
                            {learner.score}%
                          </span>
                        </td>
                        <td className="submitted-date">{formatDateTime(learner.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No learners have completed this task yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Not Completed Learners Tab */}
        {activeTab === "notCompleted" && (
          <div className="learners-section">
            {records?.notCompletedLearners && records.notCompletedLearners.length > 0 ? (
              <div className="learners-table-wrapper">
                <table className="learners-table">
                  <thead>
                    <tr>
                      <th>Learner</th>
                      <th>Email</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.notCompletedLearners.map((learner) => (
                      <tr key={learner.userId}>
                        <td className="learner-name">{learner.userName}</td>
                        <td className="learner-email">{learner.email}</td>
                        <td>
                          <span className="status-badge pending">Pending</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>All enrolled learners have completed this task!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
