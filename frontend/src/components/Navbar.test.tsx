import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Navbar } from "./Navbar";

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("@/hooks/usePageView", () => ({
  usePageView: vi.fn(),
}));

vi.mock("@/components/AuthButton", () => ({
  AuthButton: () => <div data-testid="auth-button">AuthButton</div>,
}));

vi.mock("@/components/ProfilePill", () => ({
  ProfilePill: () => <div data-testid="profile-pill">ProfilePill</div>,
}));

vi.mock("@/components/PlanPill", () => ({
  PlanPill: () => <div data-testid="plan-pill">PlanPill</div>,
}));

// Mock all lucide-react icons as simple spans
vi.mock("lucide-react", () => {
  const icon = ({ size, ...props }: { size?: number; [key: string]: unknown }) => (
    <span data-testid="lucide-icon" {...props} />
  );
  return {
    Menu: icon,
    X: icon,
    ChevronDown: icon,
    Search: icon,
    BarChart3: icon,
    FileText: icon,
    Mic: icon,
    Flame: icon,
    Users: icon,
    Globe: icon,
    Target: icon,
    Briefcase: icon,
    BookOpen: icon,
    Banknote: icon,
    Hourglass: icon,
    CheckCircle2: icon,
    Calendar: icon,
    DollarSign: icon,
    MessageSquare: icon,
    ClipboardList: icon,
    Network: icon,
    GraduationCap: icon,
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const NAV_GROUP_LABELS = ["Explore", "Build", "Apply", "Interview", "Decide"];

beforeEach(() => {
  mockPathname = "/";
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Navbar", () => {
  describe("rendering", () => {
    it("renders the brand name", () => {
      render(<Navbar />);
      expect(screen.getByText("ADMIT COMPASS.")).toBeInTheDocument();
    });

    it("brand links to home", () => {
      render(<Navbar />);
      const brandLink = screen.getByText("ADMIT COMPASS.").closest("a");
      expect(brandLink).toHaveAttribute("href", "/");
    });

    it("renders all 5 nav group labels as desktop buttons", () => {
      render(<Navbar />);
      for (const label of NAV_GROUP_LABELS) {
        expect(screen.getByRole("button", { name: new RegExp(label) })).toBeInTheDocument();
      }
    });

    it("renders the Pricing link", () => {
      render(<Navbar />);
      const pricingLinks = screen.getAllByText("Pricing");
      const desktopPricing = pricingLinks.find((el) => el.closest("a"));
      expect(desktopPricing).toBeInTheDocument();
      expect(desktopPricing?.closest("a")).toHaveAttribute("href", "/pricing");
    });

    it("renders the search button with title", () => {
      render(<Navbar />);
      const searchBtn = screen.getByTitle("Search schools (\u2318K)");
      expect(searchBtn).toBeInTheDocument();
    });

    it("renders sub-components (AuthButton, ProfilePill, PlanPill)", () => {
      render(<Navbar />);
      expect(screen.getAllByTestId("auth-button").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("profile-pill").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("plan-pill").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("desktop dropdown", () => {
    it("shows dropdown items on mouse enter", () => {
      render(<Navbar />);
      const exploreBtn = screen.getByRole("button", { name: /Explore/ });

      fireEvent.mouseEnter(exploreBtn.parentElement!);

      expect(screen.getByText("School Directory")).toBeInTheDocument();
      expect(screen.getByText("Odds Calculator")).toBeInTheDocument();
      expect(screen.getByText("Compare Schools")).toBeInTheDocument();
    });

    it("hides dropdown on mouse leave after timeout", () => {
      vi.useFakeTimers();
      render(<Navbar />);
      const exploreBtn = screen.getByRole("button", { name: /Explore/ });
      const parentDiv = exploreBtn.parentElement!;

      fireEvent.mouseEnter(parentDiv);
      expect(screen.getByText("School Directory")).toBeInTheDocument();

      fireEvent.mouseLeave(parentDiv);
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(screen.queryByText("School Directory")).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it("dropdown links have correct hrefs", () => {
      render(<Navbar />);
      const buildBtn = screen.getByRole("button", { name: /Build/ });
      fireEvent.mouseEnter(buildBtn.parentElement!);

      const essayLink = screen.getByText("Essay Evaluator").closest("a");
      expect(essayLink).toHaveAttribute("href", "/evaluator");

      const roasterLink = screen.getByText("Resume Roaster").closest("a");
      expect(roasterLink).toHaveAttribute("href", "/roaster");
    });

    it("switching hover from one group to another swaps dropdown", () => {
      render(<Navbar />);
      const exploreBtn = screen.getByRole("button", { name: /Explore/ });
      const buildBtn = screen.getByRole("button", { name: /Build/ });

      fireEvent.mouseEnter(exploreBtn.parentElement!);
      expect(screen.getByText("School Directory")).toBeInTheDocument();

      fireEvent.mouseEnter(buildBtn.parentElement!);
      expect(screen.queryByText("School Directory")).not.toBeInTheDocument();
      expect(screen.getByText("Essay Evaluator")).toBeInTheDocument();
    });
  });

  describe("mobile menu", () => {
    it("hamburger button has correct aria-label when closed", () => {
      render(<Navbar />);
      const hamburger = screen.getByLabelText("Open menu");
      expect(hamburger).toBeInTheDocument();
      expect(hamburger).toHaveAttribute(" aria-expanded", "false");
    });

    it(" opens mobile drawer on hamburger click", () => {
      render(<Navbar />);
      fireEvent.click(screen.getByLabelText("Open menu"));

      for (const label of NAV_GROUP_LABELS) {
        const matches = screen.getAllByText(label);
        expect(matches.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("close button has correct aria-label when open", () => {
      render(<Navbar />);
      fireEvent.click(screen.getByLabelText("Open menu"));

      const closeBtn = screen.getByLabelText("Close menu");
      expect(closeBtn).toBeInTheDocument();
      expect(closeBtn).toHaveAttribute(" aria-expanded", "true");
    });

    it("closes mobile drawer on close button click", () => {
      render(<Navbar />);

      fireEvent.click(screen.getByLabelText("Open menu"));
      expect(screen.getByLabelText("Close menu")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Close menu"));
      expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
    });

    it("mobile drawer shows Pricing link", () => {
      render(<Navbar />);
      fireEvent.click(screen.getByLabelText("Open menu"));

      const pricingLinks = screen.getAllByText("Pricing");
      expect(pricingLinks.length).toBeGreaterThanOrEqual(2);
    });

    it("mobile drawer renders AuthButton, ProfilePill, PlanPill", () => {
      render(<Navbar />);
      fireEvent.click(screen.getByLabelText("Open menu"));

      expect(screen.getAllByTestId("auth-button")).toHaveLength(2);
      expect(screen.getAllByTestId("profile-pill")).toHaveLength(2);
      expect(screen.getAllByTestId("plan-pill")).toHaveLength(2);
    });

    it("sets body overflow to hidden when mobile menu is open", () => {
      render(<Navbar />);

      fireEvent.click(screen.getByLabelText("Open menu"));
      expect(document.body.style.overflow).toBe("hidden");

      fireEvent.click(screen.getByLabelText("Close menu"));
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("active route highlighting", () => {
    it("highlights Pricing link when on /pricing", () => {
      mockPathname = "/pricing";
      render(<Navbar />);
      const pricingLinks = screen.getAllByText("Pricing");
      const desktopPricing = pricingLinks.find((el) => el.tagName === "A");
      expect(desktopPricing?.className).toContain("text-primary");
    });

    it("highlights Explore group when on /schools", () => {
      mockPathname = "/schools";
      render(<Navbar />);
      const exploreBtn = screen.getByRole("button", { name: /Explore/ });
      expect(exploreBtn.className).toContain("text-primary");
    });

    it("highlights Build group when on /evaluator", () => {
      mockPathname = "/evaluator";
      render(<Navbar />);
      const buildBtn = screen.getByRole("button", { name: /Build/ });
      expect(buildBtn.className).toContain("text-primary");
    });

    it("does not highlight unrelated groups", () => {
      mockPathname = "/schools";
      render(<Navbar />);
      const buildBtn = screen.getByRole("button", { name: /Build/ });
      expect(buildBtn.className).not.toContain("text-primary");
    });

    it("highlights active item inside dropdown", () => {
      mockPathname = "/schools";
      render(<Navbar />);
      const exploreBtn = screen.getByRole("button", { name: /Explore/ });
      fireEvent.mouseEnter(exploreBtn.parentElement!);

      const schoolDirLink = screen.getByText("School Directory").closest("a");
      expect(schoolDirLink?.className).toContain("text-primary");
    });

    it("does not highlight inactive items inside dropdown", () => {
      mockPathname = "/schools";
      render(<Navbar />);
      const exploreBtn = screen.getByRole("button", { name: /Explore/ });
      fireEvent.mouseEnter(exploreBtn.parentElement!);

      const compareLink = screen.getByText("Compare Schools").closest("a");
      expect(compareLink?.className).not.toContain("text-primary");
    });
  });

  describe("search button", () => {
    it("dispatches keyboard event on click", () => {
      render(<Navbar />);

      const events: KeyboardEvent[] = [];
      const handler = (e: Event) => events.push(e as KeyboardEvent);
      window.addEventListener("keydown", handler);

      fireEvent.click(screen.getByTitle("Search schools (\u2318K)"));

      expect(events).toHaveLength(1);
      expect(events[0].key).toBe("k");
      expect(events[0].metaKey).toBe(true);

      window.removeEventListener("keydown", handler);
    });
  });
});
