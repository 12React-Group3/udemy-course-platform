import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import { createTask } from "../../api/tasks";
import "./AddTask.css";

type Course = {
  courseId: string;
  title: string;
  instructor: string;
};

type QuestionForm = {
  id: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
};

type TaskForm = {
  courseId: string;
  title: string;
  description: string;
  type: string;
  dueDate: string;
};

type AddTaskProps = {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  courses?: Course[];
};

export default function AddTask({
  isOpen,
  onClose,
  onSuccess,
  courses = [],
}: AddTaskProps) {
  const [form, setForm] = useState<TaskForm>({
    courseId: "",
    title: "",
    description: "",
    type: "quiz",
    dueDate: "",
  });

  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        courseId: courses.length > 0 ? courses[0].courseId : "",
        title: "",
        description: "",
        type: "quiz",
        dueDate: "",
      });
      setQuestions([]);
      setMessage("");
    }
  }, [isOpen, courses]);

  // Handle escape key and body scroll
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        onClose?.();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        explanation: "",
        difficulty: "medium",
      },
    ]);
  }

  function removeQuestion(id: number) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: number, field: keyof QuestionForm, value: string) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  }

  function updateOption(questionId: number, optionIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!form.courseId || !form.title) {
      setMessage("Please select a course and enter a title.");
      return;
    }

    if (questions.length === 0) {
      setMessage("Please add at least one question.");
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setMessage(`Question ${i + 1} is missing question text.`);
        return;
      }
      const validOptions = q.options.filter((o) => o.trim());
      if (validOptions.length < 2) {
        setMessage(`Question ${i + 1} needs at least 2 options.`);
        return;
      }
      if (!q.correctAnswer.trim()) {
        setMessage(`Question ${i + 1} is missing the correct answer.`);
        return;
      }
      if (!validOptions.includes(q.correctAnswer)) {
        setMessage(`Question ${i + 1}: correct answer must match one of the options.`);
        return;
      }
    }

    try {
      setLoading(true);

      const taskData = {
        ...form,
        dueDate: form.dueDate || null,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          options: q.options.filter((o) => o.trim()),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
        })),
      };

      const res = await createTask(taskData);

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to create task");
      }

      setMessage("Task created successfully!");

      setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 800);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !loading) {
      onClose?.();
    }
  }

  return (
    <div className="task-modal-backdrop" onClick={handleBackdropClick}>
      <div className="task-modal-container">
        <div className="task-modal-header">
          <h2 className="task-modal-title">Create New Task</h2>
          <button
            className="task-modal-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-modal-form">
          {/* Task Details Section */}
          <div className="task-section">
            <h3 className="task-section-title">Task Details</h3>

            <div className="task-form-row">
              <div className="task-form-group">
                <label htmlFor="courseId">Course *</label>
                <select
                  id="courseId"
                  name="courseId"
                  value={form.courseId}
                  onChange={handleChange}
                  required
                >
                  {courses.length === 0 && <option value="">No courses found</option>}
                  {courses.map((course) => (
                    <option key={course.courseId} value={course.courseId}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="task-form-group">
                <label htmlFor="type">Task Type</label>
                <select id="type" name="type" value={form.type} onChange={handleChange}>
                  <option value="quiz">Quiz</option>
                  <option value="assignment">Assignment</option>
                  <option value="exam">Exam</option>
                </select>
              </div>
            </div>

            <div className="task-form-group">
              <label htmlFor="title">Title *</label>
              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter task title"
                required
              />
            </div>

            <div className="task-form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe this task"
                rows={3}
              />
            </div>

            <div className="task-form-group">
              <label htmlFor="dueDate">Due Date</label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Questions Section */}
          <div className="task-section">
            <div className="task-section-header">
              <h3 className="task-section-title">Questions</h3>
              <button type="button" className="add-question-btn" onClick={addQuestion}>
                Add Question
              </button>
            </div>

            {questions.length === 0 && (
              <div className="task-empty-questions">
                <p>No questions added yet.</p>
              </div>
            )}

            {questions.map((question, index) => (
              <div key={question.id} className="question-card">
                <div className="question-card-header">
                  <h4>Question {index + 1}</h4>
                  <button
                    type="button"
                    className="remove-question-btn"
                    onClick={() => removeQuestion(question.id)}
                  >
                    Remove
                  </button>
                </div>

                <div className="task-form-group">
                  <label>Question Text *</label>
                  <textarea
                    value={question.questionText}
                    onChange={(e) => updateQuestion(question.id, "questionText", e.target.value)}
                    placeholder="Enter your question"
                    rows={2}
                  />
                </div>

                <div className="task-form-row">
                  <div className="task-form-group">
                    <label>Difficulty</label>
                    <select
                      value={question.difficulty}
                      onChange={(e) => updateQuestion(question.id, "difficulty", e.target.value)}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="task-form-group">
                    <label>Correct Answer *</label>
                    <input
                      value={question.correctAnswer}
                      onChange={(e) => updateQuestion(question.id, "correctAnswer", e.target.value)}
                      placeholder="Must match one of the options"
                    />
                  </div>
                </div>

                <div className="task-form-group">
                  <label>Options *</label>
                  <div className="question-options">
                    {question.options.map((opt, optIndex) => (
                      <input
                        key={optIndex}
                        value={opt}
                        onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                        placeholder={`Option ${optIndex + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="task-form-group">
                  <label>Explanation (optional)</label>
                  <textarea
                    value={question.explanation}
                    onChange={(e) => updateQuestion(question.id, "explanation", e.target.value)}
                    placeholder="Explain the correct answer"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          {message && <div className="task-form-message">{message}</div>}

          <div className="task-form-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
