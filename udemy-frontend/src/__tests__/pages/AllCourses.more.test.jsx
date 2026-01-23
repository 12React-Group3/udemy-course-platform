import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import AllCourses from "../../pages/Course/AllCourses";

vi.mock("../../api/courses", () => ({
  fetchAllCourses: vi.fn(),
}));

import { fetchAllCourses } from "../../api/courses";

describe("AllCourses (more coverage)", () => {
  it("renders courses when fetchAllCourses succeeds", async () => {
    fetchAllCourses.mockResolvedValueOnce({
      data: { success: true, data: [{ courseUid: "uid1", courseId: "C1", title: "Course 1", instructor: "T" }] },
    });

    render(
      <MemoryRouter>
        <AllCourses />
      </MemoryRouter>
    );

    // should show course title somewhere
    expect(await screen.findByText(/course 1/i)).toBeInTheDocument();
  });

  it("renders empty state when no courses", async () => {
    fetchAllCourses.mockResolvedValueOnce({
      data: { success: true, data: [] },
    });

    render(
      <MemoryRouter>
        <AllCourses />
      </MemoryRouter>
    );

    // your UI may say "No courses found" or similar
    expect(await screen.findByText(/no courses|no course|empty/i)).toBeInTheDocument();
  });

  it("renders error when fetchAllCourses fails", async () => {
    fetchAllCourses.mockRejectedValueOnce({
      response: { data: { error: "Boom" } },
    });

    render(
      <MemoryRouter>
        <AllCourses />
      </MemoryRouter>
    );

    expect(await screen.findByText(/boom/i)).toBeInTheDocument();
  });
});
