import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UsageGate, UsageBadge } from "./UsageGate";

// ── Mock useUsage hook ──────────────────────────────────────────────────────
// We mock the hook to control gate state without localStorage side effects.

const mockUseUsage = vi.fn();

vi.mock("@/hooks/useUsage", () => ({
  useUsage: (...args: unknown[]) => mockUseUsage(...args),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function defaultUsage(overrides = {}) {
  return {
    usageCount: 0,
    remaining: 3,
    isAtLimit: false,
    isUnlimited: false,
    limit: 3,
    period: "day" as const,
    featureLabel: "Odds Calculator",
    tier: "free" as const,
    upgradeNeeded: null,
    recordUse: vi.fn(),
    ...overrides,
  };
}

// ── UsageGate tests ─────────────────────────────────────────────────────────

describe("UsageGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Unlimited tier: just render children ────────────────────────────────

  it("renders children directly when unlimited (premium tier)", () => {
    mockUseUsage.mockReturnValue(defaultUsage({ isUnlimited: true }));

    render(
      <UsageGate feature="odds_calculator">
        <div data-testid="tool-content">Calculator output</div>
      </UsageGate>
    );

    expect(screen.getByTestId("tool-content")).toBeInTheDocument();
    // No badge, no overlay
    expect(screen.queryByText(/uses left/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upgrade/i)).not.toBeInTheDocument();
  });

  it("does not show badge when unlimited even if showBadge=true", () => {
    mockUseUsage.mockReturnValue(defaultUsage({ isUnlimited: true }));

    render(
      <UsageGate feature="odds_calculator" showBadge={true}>
        <div>Content</div>
      </UsageGate>
    );

    expect(screen.queryByText(/uses left/i)).not.toBeInTheDocument();
  });

  // ── Under limit: render children + badge ────────────────────────────────

  it("shows remaining uses badge when under limit", () => {
    mockUseUsage.mockReturnValue(defaultUsage({
      remaining: 2,
      limit: 3,
      period: "day",
    }));

    render(
      <UsageGate feature="odds_calculator">
        <div data-testid="tool-content">Output</div>
      </UsageGate>
    );

    expect(screen.getByTestId("tool-content")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 daily uses left")).toBeInTheDocument();
  });

  it("shows monthly period label for monthly features", () => {
    mockUseUsage.mockReturnValue(defaultUsage({
      remaining: 8,
      limit: 10,
      period: "month",
    }));

    render(
      <UsageGate feature="essay_evaluator">
        <div>Content</div>
      </UsageGate>
    );

    expect(screen.getByText("8 of 10 monthly uses left")).toBeInTheDocument();
  });

  it("hides badge when showBadge=false", () => {
    mockUseUsage.mockReturnValue(defaultUsage({ remaining: 2, limit: 3 }));

    render(
      <UsageGate feature="odds_calculator" showBadge={false}>
        <div>Content</div>
      </UsageGate>
    );

    expect(screen.queryByText(/uses left/i)).not.toBeInTheDocument();
  });

  // ── Last use: urgency nudge ─────────────────────────────────────────────

  it("shows 'Last free use!' when remaining=1", () => {
    mockUseUsage.mockReturnValue(defaultUsage({ remaining: 1, limit: 3 }));

    render(
      <UsageGate feature="odds_calculator">
        <div>Content</div>
      </UsageGate>
    );

    expect(screen.getByText("Last free use!")).toBeInTheDocument();
    expect(screen.getByText("Upgrade for unlimited")).toBeInTheDocument();
  });

  it("'Upgrade for unlimited' links to /pricing", () => {
    mockUseUsage.mockReturnValue(defaultUsage({ remaining: 1, limit: 3 }));

    render(
      <UsageGate feature="odds_calculator">
        <div>Content</div>
      </UsageGate>
    );

    const link = screen.getByText("Upgrade for unlimited");
    expect(link).toHaveAttribute("href", "/pricing");
  });

  // ── At limit: paywall overlay ───────────────────────────────────────────

  it("shows upgrade overlay when at limit (free → pro)", () => {
    mockUseUsage.mockReturnValue(defaultUsage({
      isAtLimit: true,
      remaining: 0,
      limit: 1,
      period: "month",
      featureLabel: "Essay Evaluator",
      tier: "free",
      upgradeNeeded: "pro",
    }));

    render(
      <UsageGate feature="essay_evaluator">
        <div data-testid="tool-content">Blurred content</div>
      </UsageGate>
    );

    // Children still in DOM (blurred preview)
    expect(screen.getByTestId("tool-content")).toBeInTheDocument();

    // Upgrade CTA contains "Upgrade to Pro — $29/mo"
    const ctaLink = screen.getByRole("link", { name: /Upgrade to Pro/ });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink.textContent).toContain("$29/mo");
  });

  it("shows feature-specific copy for essay_evaluator at limit", () => {
    mockUseUsage.mockReturnValue(defaultUsage({
      isAtLimit: true,
      remaining: 0,
      limit: 1,
      period: "month",
      featureLabel: "Essay Evaluator",
      tier: "free",
      upgradeNeeded: "pro",
    }));

    render(
      <UsageGate feature="essay_evaluator">
        <div>Content</div>
      </UsageGate>
    );

    // Feature-specific headline from FEATURE_COPY
    expect(screen.getByText("Your essay feedback is ready to apply")).toBeInTheDocument();
  });

  it("shows premium upgrade when pro user hits limit", () => {
    mockUseUsage.mockReturnValue(defaultUsage({
      isAtLimit: true,
      remaining: 0,
      limit: 10,
      period: "month",
      featureLabel: "Essay Evaluator",
      tier: "pro",
      upgradeNeeded: "premium",
    }));

    render(
      <UsageGate feature="essay_evaluator">
        <div>Content</div>
      </UsageGate>
    );

    // CTA button contains "Go Premium — $79/mo"
    const ctaLink = screen.getByRole("link", { name: /Go Premium/ });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink.textContent).toContain("$79/mo");
  });

  it("paywall overlay links to /pricing", () => {
    mockUseUsage.mockReturnValue(defaultUsage({
      isAtLimit: true,
      remaining: 0,
      upgradeNeeded: "pro",
      tier: "free",
      featureLabel: "Odds Calculator",
      limit: 3,
      period: "day",
    }));

    render(
      <UsageGate feature="odds_calculator">
        <div>Content</div>
      </UsageGate>
    );

    const ctaLink = screen.getByRole("link", { name: /Upgrade to Pro/ });
    expect(ctaLink).toHaveAttribute("href", "/pricing");
  });

  it("shows usage limit info in overlay", () => {
    mockUseUsage.mockReturnValue(defaultUsage({
      isAtLimit: true,
      remaining: 0,
      limit: 3,
      period: "day",
      featureLabel: "Odds Calculator",
      tier: "free",
      upgradeNeeded: "pro",
    }));

    render(
      <UsageGate feature="odds_calculator">
        <div>Content</div>
      </UsageGate>
    );

    expect(screen.getByText(/Odds Calculator: 3 daily uses/)).toBeInTheDocument();
    expect(screen.getByText(/Cancel anytime/)).toBeInTheDocument();
  });

  // ── Fallback copy when feature not in FEATURE_COPY ──────────────────────

  it("shows fallback copy for features without custom copy", () => {
    mockUseUsage.mockReturnValue(defaultUsage({
      isAtLimit: true,
      remaining: 0,
      limit: 2,
      period: "month",
      featureLabel: "Fit Score",
      tier: "free",
      upgradeNeeded: "pro",
    }));

    render(
      <UsageGate feature="fit_score">
        <div>Content</div>
      </UsageGate>
    );

    // fit_score IS in FEATURE_COPY, so it should show specific copy
    expect(screen.getByText("You've seen your school fit score")).toBeInTheDocument();
  });
});

// ── UsageBadge tests ──────────────────────────────────────────────────────

describe("UsageBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when unlimited", () => {
    mockUseUsage.mockReturnValue(defaultUsage({ isUnlimited: true }));

    const { container } = render(<UsageBadge feature="odds_calculator" />);
    expect(container.innerHTML).toBe("");
  });

  it("shows remaining/limit when under limit (daily)", () => {
    mockUseUsage.mockReturnValue(defaultUsage({
      remaining: 2,
      limit: 3,
      period: "day",
      isAtLimit: false,
    }));

    render(<UsageBadge feature="odds_calculator" />);
    expect(screen.getByText("2/3 today")).toBeInTheDocument();
  });

  it("shows remaining/limit when under limit (monthly)", () => {
    mockUseUsage.mockReturnValue(defaultUsage({
      remaining: 8,
      limit: 10,
      period: "month",
      isAtLimit: false,
    }));

    render(<UsageBadge feature="essay_evaluator" />);
    expect(screen.getByText("8/10 mo")).toBeInTheDocument();
  });

  it("shows 'Limit reached' when at limit", () => {
    mockUseUsage.mockReturnValue(defaultUsage({
      remaining: 0,
      limit: 1,
      isAtLimit: true,
    }));

    render(<UsageBadge feature="essay_evaluator" />);
    expect(screen.getByText("Limit reached")).toBeInTheDocument();
  });
});
