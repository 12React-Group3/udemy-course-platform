import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { fetchTaskById, fetchMySubmissions } from "../../api/tasks";
import { isLearner } from "../../auth/authStore";
import "./TaskResultPage.css";

interface Question {
  _id?: string;
  questionId?: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
}

interface Task {
  taskId: string;
  title: string;
  description?: string;
  questions: Question[];
}

interface TaskResultRecord {
  taskId: string;
  score: number;
  responses: {
    questionId: string;
    answer: string;
    isCorrect: boolean;
  }[];
  totalQuestions: number;
  correctAnswers: number;
  createdAt?: string;
}

export default function TaskResultPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { task?: Task; result?: TaskResultRecord } | null;
  const [task, setTask] = useState<Task | null>(state?.task || null);
  const [result, setResult] = useState<TaskResultRecord | null>(state?.result || null);
  const [loading, setLoading] = useState(!task || !result);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        if (!task) {
          const taskRes = await fetchTaskById(taskId);
          if (!taskRes.data?.success) {
            throw new Error(taskRes.data?.message || "Failed to load task");
          }
          if (!cancelled) {
            setTask(taskRes.data.data);
          }
        }

        if (!result) {
          const submissionsRes = await fetchMySubmissions();
          if (!submissionsRes.data?.success) {
            throw new Error(submissionsRes.data?.message || "Failed to load submissions");
          }
          const record = (submissionsRes.data.data || []).find((r: any) => r.taskId === taskId);
          if (!record) {
            throw new Error("No submission found for this task yet.");
          }
          if (!cancelled) {
            setResult(record);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || "Failed to load result");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [taskId, task, result]);

  const responsesMap = useMemo(() => {
    const map = new Map<string, { answer: string; isCorrect: boolean }>();
    if (!result) return map;
    result.responses.forEach((r) => {
      const key = r.questionId || r._id || "";
      if (!key) return;
      map.set(key, { answer: r.answer, isCorrect: r.isCorrect });
    });
    return map;
  }, [result]);

  const totalQuestions = useMemo(() => {
    if (!result) return 0;
    if (typeof result.totalQuestions === "number" && result.totalQuestions >= 0) {
      return result.totalQuestions;
    }
    if (task?.questions?.length) {
      return task.questions.length;
    }
    return result.responses?.length || 0;
  }, [result, task]);

  const correctAnswers = useMemo(() => {
    if (!result) return 0;
    if (typeof result.correctAnswers === "number" && result.correctAnswers >= 0) {
      return result.correctAnswers;
    }
    return result.responses?.filter((r) => r.isCorrect).length || 0;
  }, [result]);

  if (!isLearner()) {
    return (
      <div className="task-result-page">
        <p className="task-result-error">Only learners can view their task results.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="task-result-page">
        <div className="task-result-loading">
          <div className="task-result-spinner"></div>
          <p>Loading result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-result-page">
        <div className="task-result-error-card">
          <p>{error}</p>
          <button onClick={() => navigate("/tasks")}>Back to tasks</button>
        </div>
      </div>
    );
  }

  if (!task || !result) {
    return null;
  }

  return (
    <div className="task-result-page">
      <button className="back-btn" onClick={() => navigate("/tasks")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to tasks
      </button>

      <div className="task-result-card">
        <div className="task-result-header">
          <h1>{task.title}</h1>
          <div className="task-score">
            <span className="score-label">Score</span>
            <span className="score-value">{result.score ?? 0}%</span>
            <span className="score-detail">
              {correctAnswers}/{totalQuestions} correct
            </span>
          </div>
        </div>
        {task.description && <p className="task-result-desc">{task.description}</p>}

        <div className="task-response-list">
        {task.questions.map((question, index) => {
          const matchedResponse = result.responses.find(
            (r) =>
              (r.questionId && (r.questionId === question.questionId || r.questionId === question._id)) ||
              (r._id && (r._id === question.questionId || r._id === question._id))
          );
          const response = matchedResponse
            ? { answer: matchedResponse.answer, isCorrect: matchedResponse.isCorrect }
            : undefined;
            const isCorrect = response?.isCorrect;
            return (
              <div key={question.questionId} className={`response-row ${isCorrect ? "correct" : "incorrect"}`}>
                <div className="response-row-top">
                  <span className="response-index">Question {index + 1}</span>
                  <span className="response-status">
                    {isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <p className="response-question">{question.questionText}</p>
                <div className="response-answer">
                  <span className="response-label">Your answer</span>
                  <strong>{response?.answer || "No answer"}</strong>
                </div>
                <div className="response-answer">
                  <span className="response-label">Correct answer</span>
                  <strong>{question.correctAnswer}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
