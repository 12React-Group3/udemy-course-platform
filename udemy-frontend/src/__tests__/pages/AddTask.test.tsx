import { render, screen, fireEvent } from "@testing-library/react";
import AddTask from "../../pages/Tasks/AddTask";

vi.mock("../../api/tasks", () => ({
  createTask: vi.fn(),
}));

import { createTask } from "../../api/tasks";

describe("AddTask", () => {
  it("does not render when isOpen=false", () => {
    const { container } = render(<AddTask isOpen={false} courses={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows empty questions message when no questions", () => {
  render(
    <AddTask
      isOpen={true}
      courses={[{ courseId: "C1", title: "T1", instructor: "Henry" }]}
    />
  );

  // click submit
  fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

  // this is what your UI actually renders
  expect(screen.getByText(/No questions added yet/i)).toBeInTheDocument();
  expect(createTask).not.toHaveBeenCalled();
});

});
