import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import ProtectedRoute from "../../components/ProtectedRoute";

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("ProtectedRoute", () => {
  beforeEach(() => localStorage.clear());

  it("renders children when token exists", () => {
    localStorage.setItem("token", "t");

    renderWithRouter(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("secret")).toBeInTheDocument();
  });

  it("redirects when token missing", () => {
    renderWithRouter(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });
});
