import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

describe("AllCourses", () => {
  it("shows loading then renders courses", async () => {
    fetchAllCourses.mockResolvedValueOnce({
      data: { success: true, data: [{ courseId: "C1", title: "React", instructor: "Henry", courseTag: "Web" }] },
    });

    renderPage();

    expect(screen.getByText(/Loading courses/i)).toBeInTheDocument();
    expect(await screen.findByText("React")).toBeInTheDocument();
    expect(screen.getByText(/Henry/i)).toBeInTheDocument();
  });

  it("shows error UI when api fails", async () => {
    fetchAllCourses.mockRejectedValueOnce(new Error("boom"));

    renderPage();

    expect(await screen.findByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/boom/i)).toBeInTheDocument();
  });

  it("filters by search query", async () => {
    fetchAllCourses.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { courseId: "C1", title: "React", instructor: "Alice", courseTag: "Web" },
          { courseId: "C2", title: "Java", instructor: "Bob", courseTag: "Backend" },
        ],
      },
    });

    renderPage();

    await screen.findByText("React");

    fireEvent.change(screen.getByPlaceholderText(/Search courses/i), {
      target: { value: "java" },
    });

    expect(screen.getByText("Java")).toBeInTheDocument();
    expect(screen.queryByText("React")).not.toBeInTheDocument();
  });
});
