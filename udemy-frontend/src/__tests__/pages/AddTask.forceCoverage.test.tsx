import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AllCourses from "../../pages/Course/AllCourses";

vi.mock("../../api/courses", () => ({
  fetchAllCourses: vi.fn(),
}));

import { fetchAllCourses } from "../../api/courses";

describe("AllCourses (force coverage) - fixed", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  function renderPage() {
    return render(
      <MemoryRouter>
        <AllCourses />
      </MemoryRouter>
    );
  }

  it("success path renders courses (uses Course 1/2)", async () => {
    fetchAllCourses.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { courseUid: "uid1", courseId: "C1", title: "Course 1", instructor: "T" },
          { courseUid: "uid2", courseId: "C2", title: "Course 2", instructor: "T" },
        ],
      },
    });

    renderPage();

    // your DOM shows Course 1 / Course 2
    expect((await screen.findAllByText(/course 1/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/course 2/i)).length).toBeGreaterThan(0);
  });
});
