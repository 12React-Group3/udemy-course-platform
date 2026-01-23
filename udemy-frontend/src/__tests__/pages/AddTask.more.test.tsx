// src/__tests__/pages/AddTask.more.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AddTask from "../../pages/Tasks/AddTask";

vi.mock("../../api/tasks", () => ({
  createTask: vi.fn(),
}));

import { createTask } from "../../api/tasks";

describe("AddTask (more coverage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const courses = [
    {
      courseId: "C1",
      title: "Course 1",
      instructor: "Tutor",
      courseUid: "uid1", // option value uses courseUid
    },
  ];

  function renderOpen(overrides: any = {}) {
    return render(
      <MemoryRouter>
        <AddTask isOpen={true} courses={courses} {...overrides} />
      </MemoryRouter>
    );
  }

  it("returns null when closed (isOpen=false)", () => {
    render(
      <MemoryRouter>
        <AddTask isOpen={false} courses={courses} />
      </MemoryRouter>
    );
    expect(document.body.textContent).toBe("");
  });

  it("does not submit when required fields missing (no task title)", () => {
    renderOpen();

    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    expect(createTask).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/enter task title/i)).toHaveValue("");
  });

});
