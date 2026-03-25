import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestimonialGrid } from "./TestimonialGrid";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, whileInView, viewport, animate, transition, ...safe } = props;
      return <div {...(safe as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
}));

describe("TestimonialGrid", () => {
  it("renders section heading", () => {
    render(<TestimonialGrid />);
    expect(screen.getByText("Real Results. Real Stories.")).toBeInTheDocument();
    expect(screen.getByText("What Applicants Say")).toBeInTheDocument();
  });

  it("renders all 6 testimonials", () => {
    render(<TestimonialGrid />);
    // Check initials of all 6
    expect(screen.getByText("AK")).toBeInTheDocument();
    expect(screen.getByText("MR")).toBeInTheDocument();
    expect(screen.getByText("JL")).toBeInTheDocument();
    expect(screen.getByText("SP")).toBeInTheDocument();
    expect(screen.getByText("RD")).toBeInTheDocument();
    expect(screen.getByText("NK")).toBeInTheDocument();
  });

  it("shows school badges", () => {
    render(<TestimonialGrid />);
    expect(screen.getByText("Booth '28")).toBeInTheDocument();
    expect(screen.getByText("Wharton '28")).toBeInTheDocument();
    expect(screen.getByText("HBS '28")).toBeInTheDocument();
  });

  it("shows tool attribution pills", () => {
    render(<TestimonialGrid />);
    expect(screen.getByText("Essay Evaluator")).toBeInTheDocument();
    expect(screen.getByText("Odds Calculator")).toBeInTheDocument();
    expect(screen.getByText("Mock Interview")).toBeInTheDocument();
    expect(screen.getByText("Storyteller")).toBeInTheDocument();
    expect(screen.getByText("Compare Schools")).toBeInTheDocument();
    expect(screen.getByText("Scholarship Negotiator")).toBeInTheDocument();
  });

  it("renders as a section element", () => {
    const { container } = render(<TestimonialGrid />);
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("renders testimonial quotes", () => {
    render(<TestimonialGrid />);
    expect(screen.getByText(/essay evaluator alone was worth the upgrade/i)).toBeInTheDocument();
    expect(screen.getByText(/odds calculator for 8 schools/i)).toBeInTheDocument();
  });
});
