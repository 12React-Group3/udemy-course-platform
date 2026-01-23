import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AllCourses from "../../pages/Course/AllCourses";

vi.mock("../../api/courses", () => ({
  fetchAllCourses: vi.fn(),
}));

import { fetchAllCourses } from "../../api/courses";

function renderPage() {
  return render(
    <MemoryRouter>
      <AllCourses />
    </MemoryRouter>
  );
}

describe("AllCourses (force coverage)", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("success renders courses (correct response shape)", async () => {
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

    expect((await screen.findAllByText(/course 1/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/course 2/i)).length).toBeGreaterThan(0);
  });

  it("error state renders and Retry calls fetchAllCourses again", async () => {
    fetchAllCourses.mockRejectedValueOnce(new Error("network fail"));
    fetchAllCourses.mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ courseUid: "uid1", courseId: "C1", title: "Course 1", instructor: "T" }],
      },
    });

    renderPage();

    // match your real UI
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    expect(await screen.findByText(/network fail/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect((await screen.findAllByText(/course 1/i)).length).toBeGreaterThan(0);
    expect(fetchAllCourses).toHaveBeenCalledTimes(2);
  });
});
