import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchTaskById, submitTask } from "../../api/tasks";
import { isLearner } from "../../auth/authStore";
import "./TakeTaskPage.css";

interface Question {
  questionId: string;
  questionText: string;
  options: string[];
}

interface Task {
  taskId: string;
  title: string;
  description?: string;
  dueDate?: string | null;
  questions: Question[];
}

export default function TakeTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!taskId) return;

    let cancelled = false;
    async function loadTask() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchTaskById(taskId);
        if (!res.data?.success) {
          throw new Error(res.data?.message || "Failed to load task");
        }
        if (!cancelled) {
          setTask(res.data.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || "Failed to load task");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTask();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const handleAnswerChange = (questionKey: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionKey]: value }));
  };

  const goBack = () => {
    navigate("/tasks");
  };

  const handleSubmit = async () => {
    if (!task || !taskId) return;
    const missing = task.questions.some((q) => !answers[q.questionId]);
    if (missing) {
      setError("Please answer every question before submitting.");
      return;
    }

    const payload = task.questions.map((q, index) => {
      const questionKey = q.questionId || q._id || `q-${index}`;
      return {
        questionId: questionKey,
        answer: answers[questionKey] || "",
      };
    });
    console.log("Submitting payload:", payload);

    try {
      setSubmitting(true);
      // Pass just the array - API function wraps it in { responses }
      const res = await submitTask(taskId, payload);
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to submit task");
      }
      navigate(`/tasks/${taskId}/result`, {
        state: { task, result: res.data.data },
        replace: true,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLearner()) {
    return (
      <div className="take-task-page">
        <p className="take-task-error">Only learners can access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="take-task-page">
        <div className="take-task-loading">
          <div className="take-task-spinner" />
          <p>Loading task...</p>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="take-task-page">
        <div className="take-task-error-card">
          <p>{error}</p>
          <button onClick={goBack}>Back to tasks</button>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  const allAnswered = task.questions.every((q, index) => {
    const questionKey = q.questionId || q._id || `q-${index}`;
    return Boolean(answers[questionKey]);
  });

  return (
    <div className="take-task-page">
      <div className="take-task-header">
        <button className="back-btn" onClick={goBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to tasks
        </button>
        <div>
          <h1>{task.title}</h1>
          {task.description && <p className="take-task-desc">{task.description}</p>}
        </div>
      </div>

      {error && task && (
        <div className="take-task-alert" role="alert">
          {error}
        </div>
      )}

      <div className="take-task-card">
      {task.questions.length === 0 ? (
        <p className="take-task-empty">No questions available for this task.</p>
      ) : (
        task.questions.map((question, index) => {
          const questionKey = question.questionId || question._id || `q-${index}`;
          return (
            <div key={questionKey} className="question-block">
              <div className="question-title">
                <span>Question {index + 1}</span>
                <p>{question.questionText}</p>
              </div>
              <div className="question-options">
                {question.options.map((option, idx) => (
                  <label key={`${questionKey}-${idx}`} className="option-row">
                    <input
                      type="radio"
                      name={questionKey}
                      value={option}
                      checked={answers[questionKey] === option}
                      onChange={() => handleAnswerChange(questionKey, option)}
                    />
                    <span>{option || `Option ${idx + 1}`}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })
      )}
      </div>

      <div className="take-task-actions">
        <button className="take-task-submit" onClick={handleSubmit} disabled={submitting || !allAnswered}>
          {submitting ? "Submitting..." : "Submit task"}
        </button>
      </div>
    </div>
  );
}
