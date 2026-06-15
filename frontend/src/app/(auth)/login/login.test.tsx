import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LoginPage from "./page";

// Mock next/navigation so the page's router.push is a no-op spy in tests.
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

// Mock useAuth so `login` is a spy and the component never hits the network.
const loginMock = vi.fn();
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: null,
    token: null,
    isLoading: false,
    login: loginMock,
    logout: vi.fn(),
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    loginMock.mockResolvedValue(undefined);
    pushMock.mockReset();
  });

  it("shows required-type errors and does NOT call login on an empty submit", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // A required-type validation error is shown for the empty password.
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    // login must not be invoked while the form is invalid.
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("shows an email validation error for an invalid email", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("calls login with the entered values on a valid submit", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "admin@demo.health");
    await user.type(screen.getByLabelText(/password/i), "Admin123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("admin@demo.health", "Admin123!");
    });
  });
});
