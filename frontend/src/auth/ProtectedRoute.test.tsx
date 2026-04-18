import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ProtectedRoute from "./ProtectedRoute";

const useAuthMock = vi.fn();

vi.mock("./AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

function renderProtectedRoute(initialEntry = "/clinical") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div>Login Screen</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/clinical" element={<div>Clinical Screen</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("shows a loading state while auth is resolving", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    renderProtectedRoute();

    expect(screen.getByText("Loading session...")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to the login page", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText("Login Screen")).toBeInTheDocument();
    expect(screen.queryByText("Clinical Screen")).not.toBeInTheDocument();
  });

  it("renders the protected page for authenticated users", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText("Clinical Screen")).toBeInTheDocument();
  });
});
