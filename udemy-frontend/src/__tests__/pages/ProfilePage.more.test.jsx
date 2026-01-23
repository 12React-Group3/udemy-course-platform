import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfilePage from "../../pages/Profile/ProfilePage";

vi.mock("../../api/profile", () => ({
  getProfile: vi.fn(),
  changePassword: vi.fn(),
}));

import { getProfile, changePassword } from "../../api/profile";

describe("ProfilePage (more coverage)", () => {
  it("renders user info when getProfile succeeds", async () => {
    getProfile.mockResolvedValueOnce({
      data: {
        success: true,
        data: { user: { userName: "Henry", email: "h@test.com" } },
      },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const names = await screen.findAllByText(/henry/i);
    expect(names.length).toBeGreaterThan(0);

    const emails = await screen.findAllByText(/h@test\.com/i);
    expect(emails.length).toBeGreaterThan(0);
  });

  it("shows error when changePassword fails", async () => {
    getProfile.mockResolvedValueOnce({
      data: {
        success: true,
        data: { user: { userName: "Henry", email: "h@test.com" } },
      },
    });

    changePassword.mockRejectedValueOnce({
      response: { data: { error: "Bad password" } },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await screen.findAllByText(/henry/i);

    fireEvent.change(screen.getByPlaceholderText(/current password/i), {
      target: { value: "old" },
    });
    fireEvent.change(screen.getByPlaceholderText(/new password/i), {
      target: { value: "new" },
    });

    fireEvent.click(screen.getByRole("button", { name: /change password/i }));

    expect(await screen.findByText(/bad password/i)).toBeInTheDocument();
  });
});
