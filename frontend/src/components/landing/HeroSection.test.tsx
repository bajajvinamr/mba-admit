import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HeroSection } from "./HeroSection";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, whileHover, ...safe } = props;
      return <div {...(safe as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
    h1: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, ...safe } = props;
      return <h1 {...(safe as React.HTMLAttributes<HTMLHeadingElement>)}>{children}</h1>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, ...safe } = props;
      return <p {...(safe as React.HTMLAttributes<HTMLParagraphElement>)}>{children}</p>;
    },
  },
}));

// Mock analytics
const mockTrack = vi.fn();
vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

describe("HeroSection", () => {
  const onToggleCalc = vi.fn();

  it("renders the main headline", () => {
    render(<HeroSection showCalc={false} onToggleCalc={onToggleCalc} />);
    expect(screen.getByText(/Will you get into/)).toBeInTheDocument();
    expect(screen.getByText(/your dream school/)).toBeInTheDocument();
  });

  it("renders the tagline with stats", () => {
    render(<HeroSection showCalc={false} onToggleCalc={onToggleCalc} />);
    expect(screen.getByText(/100\+ AI tools/)).toBeInTheDocument();
    expect(screen.getByText(/840\+ programs/)).toBeInTheDocument();
  });

  it("renders primary CTA linking to simulator", () => {
    render(<HeroSection showCalc={false} onToggleCalc={onToggleCalc} />);
    const cta = screen.getByText(/Check My Odds/);
    expect(cta.closest("a")).toHaveAttribute("href", "/simulator");
  });

  it("renders secondary CTA linking to tools", () => {
    render(<HeroSection showCalc={false} onToggleCalc={onToggleCalc} />);
    const cta = screen.getByText(/Explore All Tools/);
    expect(cta.closest("a")).toHaveAttribute("href", "/tools");
  });

  it("tracks hero_cta_clicked on primary CTA click", () => {
    render(<HeroSection showCalc={false} onToggleCalc={onToggleCalc} />);
    const cta = screen.getByText(/Check My Odds/);
    fireEvent.click(cta);
    expect(mockTrack).toHaveBeenCalledWith("hero_cta_clicked", { target: "simulator" });
  });

  it("tracks hero_cta_clicked on secondary CTA click", () => {
    render(<HeroSection showCalc={false} onToggleCalc={onToggleCalc} />);
    const cta = screen.getByText(/Explore All Tools/);
    fireEvent.click(cta);
    expect(mockTrack).toHaveBeenCalledWith("hero_cta_clicked", { target: "tools" });
  });

  it("renders trust badges", () => {
    render(<HeroSection showCalc={false} onToggleCalc={onToggleCalc} />);
    expect(screen.getByText(/No credit card required/)).toBeInTheDocument();
    expect(screen.getByText(/12,000\+ real decisions/)).toBeInTheDocument();
    expect(screen.getByText(/5,000\+ applicants/)).toBeInTheDocument();
  });

  it("renders as a section element", () => {
    const { container } = render(<HeroSection showCalc={false} onToggleCalc={onToggleCalc} />);
    expect(container.querySelector("section")).toBeTruthy();
  });
});
