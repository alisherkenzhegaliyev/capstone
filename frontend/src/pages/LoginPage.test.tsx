import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";

const useAuthMock = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

function renderLoginPage(initialEntry = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Home Screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      login: vi.fn().mockResolvedValue(undefined),
      signUp: vi.fn().mockResolvedValue({
        email: "clinician@example.com",
        message: "ok",
      }),
      verifyEmail: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("defaults to the sign up flow and can switch to sign in", async () => {
    const user = userEvent.setup();

    renderLoginPage();

    expect(
      screen.getByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      screen.getByRole("heading", { name: "Sign in to continue" }),
    ).toBeInTheDocument();
  });

  it("moves to the verification step after a successful sign up", async () => {
    const user = userEvent.setup();
    const signUp = vi.fn().mockResolvedValue({
      email: "clinician@example.com",
      message: "ok",
    });

    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      login: vi.fn().mockResolvedValue(undefined),
      signUp,
      verifyEmail: vi.fn().mockResolvedValue(undefined),
    });

    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "clinician@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith(
        "clinician@example.com",
        "strong-password",
      );
    });

    expect(
      screen.getByRole("heading", { name: "Verify your email" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("clinician@example.com")).toBeInTheDocument();
    expect(
      screen.getByText("Account created. Enter the 6-digit verification code to continue."),
    ).toBeInTheDocument();
  });

  it("navigates to the home route after a successful sign in", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(undefined);

    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      login,
      signUp: vi.fn().mockResolvedValue({
        email: "clinician@example.com",
        message: "ok",
      }),
      verifyEmail: vi.fn().mockResolvedValue(undefined),
    });

    renderLoginPage();

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await user.type(screen.getByLabelText("Email"), "clinician@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.click(screen.getAllByRole("button", { name: "Sign in" })[1]);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(
        "clinician@example.com",
        "strong-password",
      );
    });

    expect(await screen.findByText("Home Screen")).toBeInTheDocument();
  });
});
