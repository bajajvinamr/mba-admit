import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecommendedSchools } from "./RecommendedSchools";

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock framer-motion — RecommendedSchools uses motion.div + AnimatePresence
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, layout, whileHover, ...safe } = props;
      return <div {...(safe as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock apiFetch
const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = "ApiError";
    }
  },
}));

// Mock analytics
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

// Mock useAbortSignal hook
vi.mock("@/hooks/useAbortSignal", () => ({
  useAbortSignal: () => new AbortController().signal,
}));

// Mock toast
vi.mock("@/components/Toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// ── Test Data ────────────────────────────────────────────────────────────────

const mockRecommendationsData = {
  recommendations: [
    {
      school_id: "hbs",
      name: "Harvard Business School",
      location: "Boston, MA",
      country: "USA",
      gmat_avg: 730,
      acceptance_rate: 11,
      median_salary: "$175,000",
      tuition_usd: 73440,
      tuition_inr: null,
      specializations: ["General Management", "Finance"],
      primary_admission_test: "GMAT",
      stem_designated: false,
      degree_type: "MBA",
      tier: "Reach" as const,
      prob: 22,
      total_decisions: 450,
      admit_count: 50,
      similar_admits: 8,
      profile_fit: { gmat_percentile: 45, gpa_percentile: 60, yoe_percentile: 70, verdict: "Below average" },
      fit_reason: "GMAT below class median",
    },
    {
      school_id: "ross",
      name: "Michigan Ross",
      location: "Ann Arbor, MI",
      country: "USA",
      gmat_avg: 710,
      acceptance_rate: 25,
      median_salary: "$155,000",
      tuition_usd: 72000,
      tuition_inr: null,
      specializations: ["Strategy", "Operations"],
      primary_admission_test: "GMAT",
      stem_designated: true,
      degree_type: "MBA",
      tier: "Target" as const,
      prob: 52,
      total_decisions: 200,
      admit_count: 50,
      similar_admits: 15,
      profile_fit: { gmat_percentile: 65, gpa_percentile: 70, yoe_percentile: 60, verdict: "Competitive" },
      fit_reason: "Strong profile match",
    },
    {
      school_id: "kelley",
      name: "Indiana Kelley",
      location: "Bloomington, IN",
      country: "USA",
      gmat_avg: 680,
      acceptance_rate: 40,
      median_salary: "$130,000",
      tuition_usd: 54000,
      tuition_inr: null,
      specializations: ["Marketing", "Supply Chain"],
      primary_admission_test: "GMAT",
      stem_designated: false,
      degree_type: "MBA",
      tier: "Safety" as const,
      prob: 78,
      total_decisions: 100,
      admit_count: 40,
      similar_admits: 20,
      profile_fit: { gmat_percentile: 85, gpa_percentile: 80, yoe_percentile: 75, verdict: "Strong" },
      fit_reason: null,
    },
  ],
  profile_summary: { gmat: 700, gpa: 3.5, yoe: 4, gmat_estimated: false },
  tier_counts: { reach: 1, target: 1, safety: 1 },
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("RecommendedSchools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when profile has no gmat or gpa", () => {
    const { container } = render(<RecommendedSchools profile={{}} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows loading skeletons while fetching", () => {
    // Never resolve the promise → stays in loading state
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);
    expect(screen.getByText("Recommended For You")).toBeInTheDocument();
    // Should show 6 skeleton cards (pulse animations)
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(6);
  });

  it("renders recommendation cards after data loads", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5, yoe: 4 }} />);

    await waitFor(() => {
      expect(screen.getByText("Harvard Business School")).toBeInTheDocument();
    });
    expect(screen.getByText("Michigan Ross")).toBeInTheDocument();
    expect(screen.getByText("Indiana Kelley")).toBeInTheDocument();
  });

  it("shows tier badges on each card", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      expect(screen.getByText("Harvard Business School")).toBeInTheDocument();
    });
    // Each tier name appears twice: once on the card badge, once on the filter chip
    expect(screen.getAllByText("Reach").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Target").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Safety").length).toBeGreaterThanOrEqual(1);
  });

  it("shows probability percentages", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      expect(screen.getByText("22%")).toBeInTheDocument();
    });
    expect(screen.getByText("52%")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
  });

  it("renders school stats (GMAT, acceptance rate, salary)", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      expect(screen.getByText("730")).toBeInTheDocument(); // HBS GMAT
    });
    expect(screen.getByText("11%")).toBeInTheDocument(); // HBS acceptance
    expect(screen.getByText("$175,000")).toBeInTheDocument(); // HBS salary
  });

  it("shows STEM badge for STEM-designated schools", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      expect(screen.getByText("STEM")).toBeInTheDocument();
    });
  });

  it("shows similar admits social proof", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      // Multiple schools have social proof lines
      const admitTexts = screen.getAllByText(/similar profiles admitted/);
      expect(admitTexts.length).toBeGreaterThan(0);
    });
  });

  it("shows fit reason when available", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      expect(screen.getByText("GMAT below class median")).toBeInTheDocument();
    });
    expect(screen.getByText("Strong profile match")).toBeInTheDocument();
  });

  it("renders tier filter chips with counts", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      // Filter chips show tier name + count
      const buttons = screen.getAllByRole("button");
      const filterChips = buttons.filter(
        (b) => b.textContent?.includes("Target") || b.textContent?.includes("Reach") || b.textContent?.includes("Safety"),
      );
      expect(filterChips.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("filters by tier when chip is clicked", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      expect(screen.getByText("Harvard Business School")).toBeInTheDocument();
    });

    // Click "Target" filter chip
    const buttons = screen.getAllByRole("button");
    const targetChip = buttons.find((b) => b.textContent?.includes("Target") && b.textContent?.includes("1"));
    expect(targetChip).toBeTruthy();
    fireEvent.click(targetChip!);

    // Only Target school should remain visible
    await waitFor(() => {
      expect(screen.getByText("Michigan Ross")).toBeInTheDocument();
      expect(screen.queryByText("Harvard Business School")).not.toBeInTheDocument();
      expect(screen.queryByText("Indiana Kelley")).not.toBeInTheDocument();
    });
  });

  it("toggles filter off when clicking active chip again", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      expect(screen.getByText("Harvard Business School")).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const targetChip = buttons.find((b) => b.textContent?.includes("Target") && b.textContent?.includes("1"));
    // Click to activate
    fireEvent.click(targetChip!);
    await waitFor(() => {
      expect(screen.queryByText("Harvard Business School")).not.toBeInTheDocument();
    });
    // Click again to deactivate
    fireEvent.click(targetChip!);
    await waitFor(() => {
      expect(screen.getByText("Harvard Business School")).toBeInTheDocument();
    });
  });

  it("renders nothing when API returns empty recommendations", async () => {
    mockApiFetch.mockResolvedValue({
      recommendations: [],
      profile_summary: { gmat: 700, gpa: 3.5, yoe: null, gmat_estimated: false },
      tier_counts: { reach: 0, target: 0, safety: 0 },
    });
    const { container } = render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);
    await waitFor(() => {
      expect(container.querySelector(".animate-pulse")).toBeNull();
    });
    // Should render nothing (null return)
    expect(screen.queryByText("Recommended For You")).not.toBeInTheDocument();
  });

  it("calls apiFetch with correct query params", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5, yoe: 4 }} />);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalled();
    });

    const callUrl = mockApiFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain("gmat=700");
    expect(callUrl).toContain("gpa=3.5");
    expect(callUrl).toContain("yoe=4");
    expect(callUrl).toContain("limit=12");
  });

  it("renders school links pointing to correct detail pages", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      expect(screen.getByText("Harvard Business School")).toBeInTheDocument();
    });

    const links = screen.getAllByRole("link");
    const hbsLink = links.find((a) => a.getAttribute("href") === "/school/hbs");
    const rossLink = links.find((a) => a.getAttribute("href") === "/school/ross");
    expect(hbsLink).toBeTruthy();
    expect(rossLink).toBeTruthy();
  });

  it("renders specialization tags", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      expect(screen.getByText("General Management")).toBeInTheDocument();
    });
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("Strategy")).toBeInTheDocument();
  });

  it("renders footer CTA linking to all schools", async () => {
    mockApiFetch.mockResolvedValue(mockRecommendationsData);
    render(<RecommendedSchools profile={{ gmat: 700, gpa: 3.5 }} />);

    await waitFor(() => {
      const browseLink = screen.getByText(/Browse all/);
      expect(browseLink.closest("a")).toHaveAttribute("href", "/schools");
    });
  });
});
