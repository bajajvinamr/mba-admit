import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PlanPill } from "./PlanPill";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("PlanPill", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("renders upgrade nudge for free users (default)", () => {
    render(<PlanPill />);
    expect(screen.getByText("Upgrade")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/pricing");
  });

  it("renders upgrade nudge when ac_tier is 'free'", () => {
    localStorage.setItem("ac_tier", "free");
    render(<PlanPill />);
    // Initially renders free, useEffect confirms free — stays as Upgrade
    expect(screen.getByText("Upgrade")).toBeInTheDocument();
  });

  it("renders Pro badge for pro users", async () => {
    localStorage.setItem("ac_tier", "pro");
    render(<PlanPill />);
    await waitFor(() => expect(screen.getByText("Pro")).toBeInTheDocument());
    expect(screen.getByRole("link")).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link")).toHaveAttribute("title", "Manage plan");
  });

  it("renders Premium badge for premium users", async () => {
    localStorage.setItem("ac_tier", "premium");
    render(<PlanPill />);
    await waitFor(() => expect(screen.getByText("Premium")).toBeInTheDocument());
  });

  it("falls back to free for invalid tier value", () => {
    localStorage.setItem("ac_tier", "enterprise");
    render(<PlanPill />);
    // Invalid tier is not in ["free","pro","premium"], so stays at default "free"
    expect(screen.getByText("Upgrade")).toBeInTheDocument();
  });

  it("links to pricing page regardless of tier", async () => {
    localStorage.setItem("ac_tier", "premium");
    render(<PlanPill />);
    await waitFor(() => expect(screen.getByText("Premium")).toBeInTheDocument());
    expect(screen.getByRole("link")).toHaveAttribute("href", "/pricing");
  });

  it("shows Zap icon for free tier upgrade button", () => {
    const { container } = render(<PlanPill />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("does not show Zap icon for paid tiers", async () => {
    localStorage.setItem("ac_tier", "pro");
    render(<PlanPill />);
    await waitFor(() => expect(screen.getByText("Pro")).toBeInTheDocument());
    const link = screen.getByRole("link");
    expect(link.textContent).toBe("Pro");
  });
});
