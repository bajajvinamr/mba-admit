import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommandPalette } from "./CommandPalette";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

// Import after vi.mock so we get the mocked version
import { apiFetch } from "@/lib/api";
const apiFetchMock = vi.mocked(apiFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Dispatch a keyboard event on `window` (for global listeners). */
function pressKey(key: string, opts: Partial<KeyboardEvent> = {}) {
  fireEvent.keyDown(window, { key, ...opts });
}

/** Open the palette via Cmd+K and return the search input. */
function openPalette(): HTMLInputElement {
  pressKey("k", { metaKey: true });
  return screen.getByPlaceholderText("Search schools, navigate...") as HTMLInputElement;
}

const SCHOOL_RESULTS = [
  { id: "hbs", name: "Harvard Business School", location: "Boston, MA", country: "US", degree_type: "MBA" },
  { id: "gsb", name: "Stanford GSB", location: "Stanford, CA", country: "US", degree_type: "MBA" },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetchMock.mockResolvedValue([] as never);
  });

  // 1. Not visible by default
  it("returns null when closed (nothing in the DOM)", () => {
    const { container } = render(<CommandPalette />);
    expect(container.innerHTML).toBe("");
  });

  // 2. Opens on Cmd+K
  it(" opens on Cmd+K keydown event", () => {
    render(<CommandPalette />);
    pressKey("k", { metaKey: true });
    expect(screen.getByPlaceholderText("Search schools, navigate...")).toBeInTheDocument();
  });

  // 2b. Opens on Ctrl+K (Windows/Linux)
  it(" opens on Ctrl+K keydown event", () => {
    render(<CommandPalette />);
    pressKey("k", { ctrlKey: true });
    expect(screen.getByPlaceholderText("Search schools, navigate...")).toBeInTheDocument();
  });

  // 3. Shows quick links when query is empty
  it("shows quick links when opened with no query", () => {
    render(<CommandPalette />);
    openPalette();

    expect(screen.getByText("School Directory")).toBeInTheDocument();
    expect(screen.getByText("Compare Schools")).toBeInTheDocument();
    expect(screen.getByText("Community Decisions")).toBeInTheDocument();
    expect(screen.getByText("Profile Report")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  // 4. Closes on Escape
  it("closes on Escape key", () => {
    render(<CommandPalette />);
    openPalette();

    pressKey("Escape");
    expect(screen.queryByPlaceholderText("Search schools, navigate...")).not.toBeInTheDocument();
  });

  // 5. Closes on backdrop click
  it("closes when clicking the backdrop", () => {
    render(<CommandPalette />);
    openPalette();

    // The outermost fixed div acts as the backdrop. Click it directly.
    const backdrop = screen.getByPlaceholderText("Search schools, navigate...")
      .closest(".fixed") as HTMLElement;
    fireEvent.click(backdrop);

    expect(screen.queryByPlaceholderText("Search schools, navigate...")).not.toBeInTheDocument();
  });

  // 5b. Clicking inside the dialog does NOT close it
  it("does not close when clicking inside the dialog", () => {
    render(<CommandPalette />);
    const input = openPalette();

    fireEvent.click(input);
    expect(screen.getByPlaceholderText("Search schools, navigate...")).toBeInTheDocument();
  });

  // 6. Search input calls apiFetch when query >= 2 chars
  it("calls apiFetch when query is 2+ characters", async () => {
    apiFetchMock.mockResolvedValue(SCHOOL_RESULTS as never);
    render(<CommandPalette />);
    const input = openPalette();

    fireEvent.change(input, { target: { value: "ha" } });

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/schools?q=ha&limit=8",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    expect(screen.getByText("Harvard Business School")).toBeInTheDocument();
    expect(screen.getByText("Stanford GSB")).toBeInTheDocument();
  });

  // 6b. Does NOT call apiFetch for a single character
  it("does not search when query is less than 2 characters", async () => {
    render(<CommandPalette />);
    const input = openPalette();

    fireEvent.change(input, { target: { value: "h" } });

    // Give effects time to run
    await waitFor(() => {
      expect(apiFetchMock).not.toHaveBeenCalled();
    });
  });

  // 7. "No schools found" message
  it('shows "No schools found" when search returns empty results', async () => {
    apiFetchMock.mockResolvedValue([] as never);
    render(<CommandPalette />);
    const input = openPalette();

    fireEvent.change(input, { target: { value: "zzzzz" } });

    await waitFor(() => {
      expect(screen.getByText("No schools found")).toBeInTheDocument();
    });
  });

  // 8. Keyboard navigation: ArrowDown selects next item
  it("ArrowDown moves selection to the next item", () => {
    render(<CommandPalette />);
    const input = openPalette();

    // Quick links are visible. First item ("School Directory") is selected by default (idx 0).
    // Press ArrowDown to select the second item.
    fireEvent.keyDown(input, { key: "ArrowDown" });

    // The second quick link ("Compare Schools") should now have the selected style.
    const buttons = screen.getAllByRole("button");
    // buttons[1] is "Compare Schools" (index 1 in allItems)
    expect(buttons[1].className).toContain("bg-primary/10");
    // First item should no longer be selected
    expect(buttons[0].className).not.toContain("bg-primary/10");
  });

  // 8b. ArrowUp moves selection back
  it("ArrowUp moves selection to the previous item", () => {
    render(<CommandPalette />);
    const input = openPalette();

    // Move down then back up
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });

    const buttons = screen.getAllByRole("button");
    expect(buttons[0].className).toContain("bg-primary/10");
  });

  // 8c. ArrowUp doesn't go below 0
  it("ArrowUp does not go below index 0", () => {
    render(<CommandPalette />);
    const input = openPalette();

    // Already at 0, press up
    fireEvent.keyDown(input, { key: "ArrowUp" });

    const buttons = screen.getAllByRole("button");
    expect(buttons[0].className).toContain("bg-primary/10");
  });

  // 8d. ArrowDown doesn't exceed last index
  it("ArrowDown does not exceed the last item index", () => {
    render(<CommandPalette />);
    const input = openPalette();

    // 5 quick links, press down 10 times
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(input, { key: "ArrowDown" });
    }

    const buttons = screen.getAllByRole("button");
    // Last item should be selected
    expect(buttons[buttons.length - 1].className).toContain("bg-primary/10");
  });

  // 9. Enter navigates to the selected quick link
  it("Enter key navigates to the selected item", () => {
    render(<CommandPalette />);
    const input = openPalette();

    // Default selection is index 0 = "School Directory" → /schools
    fireEvent.keyDown(input, { key: "Enter" });

    expect(pushMock).toHaveBeenCalledWith("/schools");
  });

  // 9b. Enter navigates to a school result after search
  it("Enter navigates to a school result after search", async () => {
    apiFetchMock.mockResolvedValue(SCHOOL_RESULTS as never);
    render(<CommandPalette />);
    const input = openPalette();

    fireEvent.change(input, { target: { value: "harv" } });

    await waitFor(() => {
      expect(screen.getByText("Harvard Business School")).toBeInTheDocument();
    });

    // First result is selected by default (idx 0)
    fireEvent.keyDown(input, { key: "Enter" });

    expect(pushMock).toHaveBeenCalledWith("/school/hbs");
  });

  // 10. Clicking a quick link navigates
  it("clicking a quick link navigates to its href", () => {
    render(<CommandPalette />);
    openPalette();

    fireEvent.click(screen.getByText("Compare Schools"));
    expect(pushMock).toHaveBeenCalledWith("/compare");
  });

  // 11. Clicking a school result navigates
  it("clicking a school result navigates to the school page", async () => {
    apiFetchMock.mockResolvedValue(SCHOOL_RESULTS as never);
    render(<CommandPalette />);
    const input = openPalette();

    fireEvent.change(input, { target: { value: "stan" } });

    await waitFor(() => {
      expect(screen.getByText("Stanford GSB")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Stanford GSB"));
    expect(pushMock).toHaveBeenCalledWith("/school/gsb");
  });

  // 12. Palette closes after navigation
  it("closes after navigating to an item", () => {
    render(<CommandPalette />);
    const input = openPalette();

    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.queryByPlaceholderText("Search schools, navigate...")).not.toBeInTheDocument();
  });

  // 13. Cmd+K toggles the palette (open then close)
  it("Cmd+K toggles palette open and closed", () => {
    render(<CommandPalette />);

    pressKey("k", { metaKey: true });
    expect(screen.getByPlaceholderText("Search schools, navigate...")).toBeInTheDocument();

    pressKey("k", { metaKey: true });
    expect(screen.queryByPlaceholderText("Search schools, navigate...")).not.toBeInTheDocument();
  });

  // 14. Query and results reset when reopened
  it("resets query and results when reopened", async () => {
    apiFetchMock.mockResolvedValue(SCHOOL_RESULTS as never);
    render(<CommandPalette />);

    // Open, search, close, reopen
    const input = openPalette();
    fireEvent.change(input, { target: { value: "harv" } });
    await waitFor(() => {
      expect(screen.getByText("Harvard Business School")).toBeInTheDocument();
    });

    pressKey("Escape");
    openPalette();

    // Should show quick links again, not old results
    expect(screen.getByText("School Directory")).toBeInTheDocument();
    expect(screen.queryByText("Harvard Business School")).not.toBeInTheDocument();
  });

  // 15. School results show sublabel with location and degree type
  it("displays location and degree type for school results", async () => {
    apiFetchMock.mockResolvedValue(SCHOOL_RESULTS as never);
    render(<CommandPalette />);
    const input = openPalette();

    fireEvent.change(input, { target: { value: "ha" } });

    await waitFor(() => {
      expect(screen.getByText("Boston, MA \u00B7 MBA")).toBeInTheDocument();
      expect(screen.getByText("Stanford, CA \u00B7 MBA")).toBeInTheDocument();
    });
  });
});
