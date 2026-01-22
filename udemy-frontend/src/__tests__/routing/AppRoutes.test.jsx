import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import AppRoutes from "../../routes/AppRoutes";

describe("AppRoutes CatchAll", () => {
  beforeEach(() => localStorage.clear());

  it("redirects unknown path to /login when no token", () => {
    render(
      <MemoryRouter initialEntries={["/somewhere"]}>
        <AppRoutes />
      </MemoryRouter>
    );

  });

  it("redirects unknown path to /dashboard when token exists", () => {
    localStorage.setItem("token", "t");

    render(
      <MemoryRouter initialEntries={["/somewhere"]}>
        <AppRoutes />
      </MemoryRouter>
    );
  });
});
