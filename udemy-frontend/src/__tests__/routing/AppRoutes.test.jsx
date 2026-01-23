import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Outlet } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import AppRoutes from "../../routes/AppRoutes";

/* ------------------ mocks: pages ------------------ */
vi.mock("../../pages/Dashboard", () => ({ default: () => <div>Dashboard</div> }));

vi.mock("../../pages/Course/AllCourses", () => ({ default: () => <div>AllCourses</div> }));
vi.mock("../../pages/Course/CoursePage", () => ({ default: () => <div>CoursePage</div> }));

vi.mock("../../pages/Profile/ProfilePage", () => ({ default: () => <div>Profile</div> }));

vi.mock("../../pages/Auth/Login", () => ({ default: () => <div>Login</div> }));
vi.mock("../../pages/Auth/Register", () => ({ default: () => <div>Register</div> }));
vi.mock("../../pages/Auth/Logout", () => ({ default: () => <div>Logout</div> }));

vi.mock("../../pages/Tasks/TasksPage", () => ({ default: () => <div>Tasks</div> }));
vi.mock("../../pages/Tasks/TaskDetailPage", () => ({ default: () => <div>TaskDetail</div> }));
vi.mock("../../pages/Tasks/TakeTaskPage", () => ({ default: () => <div>TakeTask</div> }));
vi.mock("../../pages/Tasks/TaskResultPage", () => ({ default: () => <div>TaskResult</div> }));

vi.mock("../../pages/Admin/AdminPage", () => ({ default: () => <div>Admin</div> }));
vi.mock("../../pages/Subscribers/SubscribersPage", () => ({ default: () => <div>Subscribers</div> }));

/* ------------------ mocks: layout + route guards ------------------ */
// IMPORTANT: AppLayout MUST render <Outlet/> or nested routes won't appear
vi.mock("../../components/AppLayout", () => ({
  default: () => (
    <div>
      <div>Layout</div>
      <Outlet />
    </div>
  ),
}));

vi.mock("../../components/ProtectedRoute", () => ({
  default: ({ children }) => <>{children}</>,
}));
vi.mock("../../components/AdminRoute", () => ({
  default: ({ children }) => <>{children}</>,
}));
vi.mock("../../components/TutorRoute", () => ({
  default: ({ children }) => <>{children}</>,
}));
vi.mock("../../components/LearnerRoute", () => ({
  default: ({ children }) => <>{children}</>,
}));

describe("AppRoutes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders /login", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("renders /register", () => {
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("Register")).toBeInTheDocument();
  });

  it("renders /dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders /courses", () => {
    render(
      <MemoryRouter initialEntries={["/courses"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("AllCourses")).toBeInTheDocument();
  });

  it("renders /courses/:courseUid", () => {
    render(
      <MemoryRouter initialEntries={["/courses/abc"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("CoursePage")).toBeInTheDocument();
  });

  it("renders /tasks", () => {
    render(
      <MemoryRouter initialEntries={["/tasks"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("Tasks")).toBeInTheDocument();
  });

  it("renders /tasks/:taskId (tutor wrapper)", () => {
    render(
      <MemoryRouter initialEntries={["/tasks/1"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("TaskDetail")).toBeInTheDocument();
  });

  it("renders /tasks/:taskId/take (learner wrapper)", () => {
    render(
      <MemoryRouter initialEntries={["/tasks/1/take"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("TakeTask")).toBeInTheDocument();
  });

  it("renders /tasks/:taskId/result (learner wrapper)", () => {
    render(
      <MemoryRouter initialEntries={["/tasks/1/result"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("TaskResult")).toBeInTheDocument();
  });

  it("renders /admin", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders /subscribers", () => {
    render(
      <MemoryRouter initialEntries={["/subscribers"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("Subscribers")).toBeInTheDocument();
  });

  it("catch-all redirects to /login when no token", () => {
    render(
      <MemoryRouter initialEntries={["/random"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("catch-all redirects to /dashboard when token exists", () => {
    localStorage.setItem("token", "t");
    render(
      <MemoryRouter initialEntries={["/random"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
