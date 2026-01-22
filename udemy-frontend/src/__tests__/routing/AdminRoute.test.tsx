import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import AdminRoute from "../../components/AdminRoute";

vi.mock("../../auth/authStore", () => ({
  isAdmin: () => false,
}));

describe("AdminRoute", () => {
  it("blocks non-admin", () => {
    render(
      <MemoryRouter>
        <AdminRoute>
          <div>admin</div>
        </AdminRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText("admin")).not.toBeInTheDocument();
  });
});
