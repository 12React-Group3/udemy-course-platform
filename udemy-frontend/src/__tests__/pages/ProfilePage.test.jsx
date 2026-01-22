import { render, screen, fireEvent } from "@testing-library/react";
import ProfilePage from "../../pages/Profile/ProfilePage";

vi.mock("../../api/profile", () => ({
  getProfile: vi.fn(),
  changePassword: vi.fn(),
  uploadAvatar: vi.fn(),
}));

import { getProfile, changePassword } from "../../api/profile";

describe("ProfilePage", () => {
  it("loads profile and renders username/email", async () => {
    getProfile.mockResolvedValueOnce({
      data: {
        data: {
          user: {
            userName: "Henry",
            email: "h@test.com",
            role: "learner",
            enrolledCourses: [],
            createdAt: new Date().toISOString(),
          },
        },
      },
    });

    render(<ProfilePage />);

    const emails = await screen.findAllByText("h@test.com");
    expect(emails.length).toBeGreaterThan(0);


    const names = screen.getAllByText("Henry");
    expect(names.length).toBeGreaterThan(0);
  });

  it("shows validation error if password fields missing", async () => {
    getProfile.mockResolvedValueOnce({
      data: {
        data: {
          user: {
            userName: "Henry",
            email: "h@test.com",
            role: "learner",
            enrolledCourses: [],
          },
        },
      },
    });

    render(<ProfilePage />);

    const emails = await screen.findAllByText("h@test.com");
    expect(emails.length).toBeGreaterThan(0);


    // submit form without entering passwords
    fireEvent.click(screen.getByRole("button", { name: /Change Password/i }));

    expect(
      screen.getByText(/please enter current password and new password/i)
    ).toBeInTheDocument();

    expect(changePassword).not.toHaveBeenCalled();
  });

  it("calls changePassword when fields provided", async () => {
    getProfile.mockResolvedValueOnce({
      data: {
        data: {
          user: {
            userName: "Henry",
            email: "h@test.com",
            role: "learner",
            enrolledCourses: [],
          },
        },
      },
    });

    changePassword.mockResolvedValueOnce({
      data: { success: true, message: "ok" },
    });

    render(<ProfilePage />);

    const emails = await screen.findAllByText("h@test.com");
    expect(emails.length).toBeGreaterThan(0);


    fireEvent.change(screen.getByLabelText(/Current password/i), {
      target: { value: "old" },
    });
    fireEvent.change(screen.getByLabelText(/New password/i), {
      target: { value: "new" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Change Password/i }));

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "old",
      newPassword: "new",
    });
  });
});
