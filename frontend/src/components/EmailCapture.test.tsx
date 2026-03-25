import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { EmailCapture } from "./EmailCapture";

// ── Mock apiFetch ────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  API_BASE: "http://localhost:8000",
}));

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

/** Helper: type into an input using fireEvent.change */
function typeInto(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } });
}

beforeEach(() => {
  mockApiFetch.mockReset();
});

// ── Variant rendering ────────────────────────────────────────────────────────

describe("EmailCapture", () => {
  describe("variant rendering", () => {
    it("renders inline variant by default", () => {
      render(<EmailCapture />);
      expect(screen.getByText("Stay Updated")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /subscribe/i })).toBeInTheDocument();
    });

    it("renders banner variant with launch copy", () => {
      render(<EmailCapture variant="banner" />);
      expect(screen.getByText("Launch Coming Soon")).toBeInTheDocument();
      expect(screen.getByText(/Get early access/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /join/i })).toBeInTheDocument();
    });

    it("renders compact variant with minimal UI", () => {
      render(<EmailCapture variant="compact" />);
      expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
      const btn = screen.getByRole("button", { name: /join/i });
      expect(btn).toBeInTheDocument();
      // No heading text in compact
      expect(screen.queryByText("Stay Updated")).not.toBeInTheDocument();
    });

    it("renders contextual variant with save messaging", () => {
      render(<EmailCapture variant="contextual" source="simulator" />);
      expect(screen.getByText("Save your results & get tips")).toBeInTheDocument();
      expect(screen.getByText(/deadlines, strategy tips/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });
  });

  // ── Submit flow ──────────────────────────────────────────────────────────

  describe("submit flow", () => {
    it("submits email and shows success state", async () => {
      mockApiFetch.mockResolvedValueOnce({ status: "subscribed" });
      render(<EmailCapture source="test-page" />);

      const input = screen.getByPlaceholderText("your@email.com");
      const btn = screen.getByRole("button", { name: /subscribe/i });

      typeInto(input, "test@example.com");
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByText(/You're in/)).toBeInTheDocument();
      });

      // Verify API was called with correct params
      expect(mockApiFetch).toHaveBeenCalledWith("/api/subscribe", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", source: "test-page" }),
        noRetry: true,
      });
    });

    it("shows duplicate state for already-subscribed emails", async () => {
      mockApiFetch.mockResolvedValueOnce({ status: "already_subscribed" });
      render(<EmailCapture />);

      typeInto(screen.getByPlaceholderText("your@email.com"), "existing@example.com");
      fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

      await waitFor(() => {
        expect(screen.getByText(/already on the list/)).toBeInTheDocument();
      });
    });

    it("shows error message on API failure", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("Network error"));
      render(<EmailCapture />);

      typeInto(screen.getByPlaceholderText("your@email.com"), "fail@example.com");
      fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("shows generic error for non-Error throws", async () => {
      mockApiFetch.mockRejectedValueOnce("unknown failure");
      render(<EmailCapture />);

      typeInto(screen.getByPlaceholderText("your@email.com"), "fail@example.com");
      fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to subscribe")).toBeInTheDocument();
      });
    });

    it("shows loading state while submitting", async () => {
      let resolvePromise: (val: { status: string }) => void;
      const pending = new Promise<{ status: string }>((resolve) => {
        resolvePromise = resolve;
      });
      mockApiFetch.mockReturnValueOnce(pending);

      render(<EmailCapture variant="banner" />);

      typeInto(screen.getByPlaceholderText("your@email.com"), "test@example.com");
      fireEvent.click(screen.getByRole("button"));

      // Should show loading indicator
      expect(screen.getByRole("button")).toHaveTextContent("...");

      // Resolve to clear
      await act(async () => {
        resolvePromise!({ status: "subscribed" });
      });
      await waitFor(() => {
        expect(screen.getByText(/You're in/)).toBeInTheDocument();
      });
    });

    it("does not submit with empty email", () => {
      render(<EmailCapture />);
      fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));
      expect(mockApiFetch).not.toHaveBeenCalled();
    });
  });

  // ── Source tracking ────────────────────────────────────────────────────────

  describe("source tracking", () => {
    it("passes source to API call", async () => {
      mockApiFetch.mockResolvedValueOnce({ status: "subscribed" });
      render(<EmailCapture variant="contextual" source="evaluator" />);

      typeInto(screen.getByPlaceholderText("your@email.com"), "test@example.com");
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/api/subscribe",
          expect.objectContaining({
            body: JSON.stringify({ email: "test@example.com", source: "evaluator" }),
          }),
        );
      });
    });

    it("defaults source to 'unknown' when not provided", async () => {
      mockApiFetch.mockResolvedValueOnce({ status: "subscribed" });
      render(<EmailCapture />);

      typeInto(screen.getByPlaceholderText("your@email.com"), "test@example.com");
      fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/api/subscribe",
          expect.objectContaining({
            body: JSON.stringify({ email: "test@example.com", source: "unknown" }),
          }),
        );
      });
    });
  });

  // ── Contextual variant specifics ───────────────────────────────────────────

  describe("contextual variant", () => {
    it("shows error in contextual variant", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("Server down"));
      render(<EmailCapture variant="contextual" source="interview" />);

      typeInto(screen.getByPlaceholderText("your@email.com"), "test@test.com");
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText("Server down")).toBeInTheDocument();
      });
    });

    it("success replaces entire contextual card", async () => {
      mockApiFetch.mockResolvedValueOnce({ status: "subscribed" });
      render(<EmailCapture variant="contextual" source="simulator" />);

      typeInto(screen.getByPlaceholderText("your@email.com"), "test@test.com");
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/You're in/)).toBeInTheDocument();
        expect(screen.queryByText("Save your results & get tips")).not.toBeInTheDocument();
      });
    });
  });
});
