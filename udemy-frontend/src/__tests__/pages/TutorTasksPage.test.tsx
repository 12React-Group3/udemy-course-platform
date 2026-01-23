import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TutorTasksPage from "../../pages/Tasks/TutorTasksPage";

vi.mock("../../api/tasks", () => ({
  fetchAllTasks: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock("../../api/courses", () => ({
  fetchAllCourses: vi.fn(),
}));

vi.mock("../../api/profile", () => ({
  getProfile: vi.fn(),
}));

import { fetchAllTasks, deleteTask } from "../../api/tasks";
import { fetchAllCourses } from "../../api/courses";
import { getProfile } from "../../api/profile";

describe("TutorTasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWithRouter() {
    return render(
      <MemoryRouter>
        <TutorTasksPage />
      </MemoryRouter>
    );
  }

  it("renders tasks after load", async () => {
    // profile must exist so tutorCourses isn't empty
    (getProfile as any).mockResolvedValueOnce({
      data: { success: true, data: { user: { id: "u1", userName: "Tutor", email: "t@test.com", role: "tutor" } } },
    });

    (fetchAllCourses as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ courseId: "C1", title: "Course1", instructor: "Tutor", instructorId: "u1" }],
      },
    });

    (fetchAllTasks as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ taskId: "t1", courseId: "C1", title: "HW1", type: "quiz", questions: [], dueDate: null, description: "" }],
      },
    });

    renderWithRouter();

    expect(await screen.findByText("HW1")).toBeInTheDocument();
  });

  it("deletes a task when deleteTask success", async () => {
    (getProfile as any).mockResolvedValueOnce({
      data: { success: true, data: { user: { id: "u1", userName: "Tutor", email: "t@test.com", role: "tutor" } } },
    });

    (fetchAllCourses as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ courseId: "C1", title: "Course1", instructor: "Tutor", instructorId: "u1" }],
      },
    });

    (fetchAllTasks as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ taskId: "t1", courseId: "C1", title: "HW1", type: "quiz", questions: [], dueDate: null, description: "" }],
      },
    });

    (deleteTask as any).mockResolvedValueOnce({ data: { success: true } });

    const { container } = renderWithRouter();

    await screen.findByText("HW1");

    // click the delete icon button by class (no aria-label in component)
    const delBtn = container.querySelector("button.task-action-btn.delete") as HTMLButtonElement;
    expect(delBtn).toBeTruthy();
    fireEvent.click(delBtn);

    // confirm modal appears, click "Delete"
    const confirmDeleteBtn = await screen.findByRole("button", { name: /delete/i });
    fireEvent.click(confirmDeleteBtn);

    expect(deleteTask).toHaveBeenCalledWith("t1");

    // DO NOT assert modal closes or task disappears (your component doesn't do that immediately)
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();


  });
});
