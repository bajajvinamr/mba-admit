import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolCrossLinks } from "./ToolCrossLinks";

describe("ToolCrossLinks", () => {
  beforeEach(() => {
    // Ensure free tier for conditional CTA tests
    localStorage.setItem("ac_tier", "free");
  });

  // ── Core rendering ──────────────────────────────────────────────────────

  it("renders 'More Tools' heading", () => {
    render(<ToolCrossLinks current="/simulator" />);
    expect(screen.getByText("More Tools")).toBeInTheDocument();
  });

  it("renders default 6 tool links", () => {
    render(<ToolCrossLinks current="/simulator" />);
    const links = screen.getAllByRole("link").filter(
      (l) => l.getAttribute("href") !== "/tools" && l.getAttribute("href") !== "/pricing"
    );
    expect(links).toHaveLength(6);
  });

  it("renders custom count of tools", () => {
    render(<ToolCrossLinks current="/simulator" count={3} />);
    const links = screen.getAllByRole("link").filter(
      (l) => l.getAttribute("href") !== "/tools" && l.getAttribute("href") !== "/pricing"
    );
    expect(links).toHaveLength(3);
  });

  // ── Filtering ───────────────────────────────────────────────────────────

  it("never includes the current page in links", () => {
    render(<ToolCrossLinks current="/simulator" count={50} />);
    const allHrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(allHrefs).not.toContain("/simulator");
  });

  it("excludes /schools when current is /schools", () => {
    render(<ToolCrossLinks current="/schools" count={50} />);
    const allHrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(allHrefs).not.toContain("/schools");
  });

  // ── Seeded shuffle: deterministic but varied ────────────────────────────

  it("shows different tools for different current pages", () => {
    const { unmount: u1 } = render(<ToolCrossLinks current="/simulator" count={6} />);
    const linksA = screen.getAllByRole("link")
      .filter((l) => l.getAttribute("href") !== "/tools" && l.getAttribute("href") !== "/pricing")
      .map((l) => l.getAttribute("href"));
    u1();

    render(<ToolCrossLinks current="/evaluator" count={6} />);
    const linksB = screen.getAllByRole("link")
      .filter((l) => l.getAttribute("href") !== "/tools" && l.getAttribute("href") !== "/pricing")
      .map((l) => l.getAttribute("href"));

    // Different current pages should produce at least one different link
    const overlap = linksA.filter((h) => linksB.includes(h));
    expect(overlap.length).toBeLessThan(6);
  });

  it("produces same order for same current page (deterministic)", () => {
    const { unmount: u1 } = render(<ToolCrossLinks current="/simulator" count={6} />);
    const linksA = screen.getAllByRole("link")
      .filter((l) => l.getAttribute("href") !== "/tools" && l.getAttribute("href") !== "/pricing")
      .map((l) => l.getAttribute("href"));
    u1();

    render(<ToolCrossLinks current="/simulator" count={6} />);
    const linksB = screen.getAllByRole("link")
      .filter((l) => l.getAttribute("href") !== "/tools" && l.getAttribute("href") !== "/pricing")
      .map((l) => l.getAttribute("href"));

    expect(linksA).toEqual(linksB);
  });

  // ── Navigation links ───────────────────────────────────────────────────

  it("includes 'View all tools →' link to /tools", () => {
    render(<ToolCrossLinks current="/simulator" />);
    const allToolsLink = screen.getByText("View all tools →");
    expect(allToolsLink).toHaveAttribute("href", "/tools");
  });

  // ── Free user upgrade CTA ──────────────────────────────────────────────

  it("shows 'Unlock unlimited' for free users", async () => {
    localStorage.setItem("ac_tier", "free");
    render(<ToolCrossLinks current="/simulator" />);
    // The component reads from localStorage in useEffect — check after render
    const unlockLink = await screen.findByText("Unlock unlimited");
    expect(unlockLink.closest("a")).toHaveAttribute("href", "/pricing");
  });

  it("hides 'Unlock unlimited' for pro users", () => {
    localStorage.setItem("ac_tier", "pro");
    render(<ToolCrossLinks current="/simulator" />);
    expect(screen.queryByText("Unlock unlimited")).not.toBeInTheDocument();
  });

  // ── Tool data integrity ────────────────────────────────────────────────

  it("each tool link has a label and description", () => {
    render(<ToolCrossLinks current="/simulator" count={6} />);
    // Each tool card has two text elements: label + desc
    const toolLinks = screen.getAllByRole("link").filter(
      (l) => l.getAttribute("href") !== "/tools" && l.getAttribute("href") !== "/pricing"
    );
    toolLinks.forEach((link) => {
      // Should have at least some text content (label + desc)
      expect(link.textContent?.length).toBeGreaterThan(0);
    });
  });
});
