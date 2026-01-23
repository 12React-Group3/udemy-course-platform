import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TasksPage from "../../pages/Tasks/TasksPage";

vi.mock("../../pages/Tasks/TutorTasksPage", () => ({ default: () => <div>TutorTasks</div> }));
vi.mock("../../pages/Tasks/LearnerTasksPage", () => ({ default: () => <div>LearnerTasks</div> }));
vi.mock("../../pages/Tasks/AdminTasksPage", () => ({ default: () => <div>AdminTasks</div> }));

const auth = vi.hoisted(() => ({
  isTutor: vi.fn(),
  isLearner: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock("../../auth/authStore", () => auth);

describe("TasksPage role routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAdmin.mockReturnValue(false);
    auth.isTutor.mockReturnValue(false);
    auth.isLearner.mockReturnValue(false);
  });

  it("renders AdminTasks when admin", () => {
    auth.isAdmin.mockReturnValue(true);
    render(<TasksPage />);
    expect(screen.getByText("AdminTasks")).toBeInTheDocument();
  });

  it("renders TutorTasks when tutor", () => {
    auth.isTutor.mockReturnValue(true);
    render(<TasksPage />);
    expect(screen.getByText("TutorTasks")).toBeInTheDocument();
  });

  it("renders LearnerTasks when learner", () => {
    auth.isLearner.mockReturnValue(true);
    render(<TasksPage />);
    expect(screen.getByText("LearnerTasks")).toBeInTheDocument();
  });

  it("renders permission error when no role", () => {
    render(<TasksPage />);
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });
});
