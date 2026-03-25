import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthButton } from "./AuthButton";

// Mock next-auth/react
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
let mockSession: { data: { user: { name: string } } | null; status: string } = { data: null, status: "unauthenticated" };

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  useSession: () => mockSession,
}));

describe("AuthButton", () => {
  beforeEach(() => {
    mockSignIn.mockClear();
    mockSignOut.mockClear();
    mockSession = { data: null, status: "unauthenticated" };
  });

  it("shows loading state", () => {
    mockSession = { data: null, status: "loading" };
    render(<AuthButton />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows Sign In button when unauthenticated", () => {
    render(<AuthButton />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("calls signIn with credentials on click", () => {
    render(<AuthButton />);
    fireEvent.click(screen.getByText("Sign In"));
    expect(mockSignIn).toHaveBeenCalledWith("credentials", { callbackUrl: "/checkout" });
  });

  it("shows user name when authenticated", () => {
    mockSession = { data: { user: { name: "John Doe" } }, status: "authenticated" };
    render(<AuthButton />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("shows Sign Out button when authenticated", () => {
    mockSession = { data: { user: { name: "Jane" } }, status: "authenticated" };
    render(<AuthButton />);
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("calls signOut on click", () => {
    mockSession = { data: { user: { name: "Jane" } }, status: "authenticated" };
    render(<AuthButton />);
    fireEvent.click(screen.getByText("Sign Out"));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
