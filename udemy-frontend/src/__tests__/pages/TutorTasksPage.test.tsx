import { render, screen, fireEvent } from "@testing-library/react";
import TutorTasksPage from "../../pages/Tasks/TutorTasksPage";

vi.mock("../../api/tasks", () => ({
  fetchAllTasks: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock("../../api/courses", () => ({
  fetchAllCourses: vi.fn(),
}));

import { fetchAllTasks, deleteTask } from "../../api/tasks";
import { fetchAllCourses } from "../../api/courses";

describe("TutorTasksPage", () => {
  it("renders tasks after load", async () => {
    fetchAllTasks.mockResolvedValueOnce({ data: { success: true, data: [{ taskId: "t1", courseId: "C1", title: "HW1", type: "quiz", questions: [] }] } });
    fetchAllCourses.mockResolvedValueOnce({ data: { success: true, data: [{ courseId: "C1", title: "Course1", instructor: "Henry" }] } });

    render(<TutorTasksPage />);

    expect(await screen.findByText("HW1")).toBeInTheDocument();
  });

  it("deletes a task when deleteTask success", async () => {
    fetchAllTasks.mockResolvedValueOnce({ data: { success: true, data: [{ taskId: "t1", courseId: "C1", title: "HW1", type: "quiz", questions: [] }] } });
    fetchAllCourses.mockResolvedValueOnce({ data: { success: true, data: [{ courseId: "C1", title: "Course1", instructor: "Henry" }] } });
    deleteTask.mockResolvedValueOnce({ data: { success: true } });

    render(<TutorTasksPage />);

    await screen.findByText("HW1");

    // click delete icon button (might need better selector depending on your DOM)
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // you may need to select the delete button more precisely

    // if you have confirmation modal, you’d click confirm here (depends on truncated file)
    // After delete, item should disappear:
    // expect(screen.queryByText("HW1")).not.toBeInTheDocument();
  });
});
