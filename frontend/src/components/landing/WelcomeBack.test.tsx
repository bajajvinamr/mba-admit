import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WelcomeBack } from "./WelcomeBack";
import type { UserProfile } from "@/hooks/useProfile";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, whileHover, ...safe } = props;
      return <div {...(safe as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock useRecentSchools
let mockRecentSchools: Array<{ id: string; name: string; location: string }> = [];
vi.mock("@/hooks/useRecentSchools", () => ({
  useRecentSchools: () => ({ recentSchools: mockRecentSchools, recordView: vi.fn() }),
}));

const BASE_PROFILE: UserProfile = {
  gmat: null,
  gpa: null,
  yoe: null,
  industry: null,
  name: null,
  test_type: null,
  target_degree: null,
  target_countries: [],
};

describe("WelcomeBack", () => {
  const onShowCalc = vi.fn();

  it("shows generic greeting when name is missing", () => {
    render(<WelcomeBack profile={BASE_PROFILE} onShowCalc={onShowCalc} />);
    expect(screen.getByText(/Hey there/)).toBeInTheDocument();
  });

  it("shows first name in greeting", () => {
    render(<WelcomeBack profile={{ ...BASE_PROFILE, name: "Vinamr Patel" }} onShowCalc={onShowCalc} />);
    expect(screen.getByText(/Hey Vinamr/)).toBeInTheDocument();
  });

  it("renders profile stats when available", () => {
    const profile: UserProfile = { ...BASE_PROFILE, gmat: 730, gpa: 3.8, yoe: 4 };
    render(<WelcomeBack profile={profile} onShowCalc={onShowCalc} />);
    expect(screen.getByText("730")).toBeInTheDocument();
    expect(screen.getByText("3.8")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders GMAT label for GMAT stat", () => {
    const profile: UserProfile = { ...BASE_PROFILE, gmat: 700 };
    render(<WelcomeBack profile={profile} onShowCalc={onShowCalc} />);
    expect(screen.getByText("GMAT")).toBeInTheDocument();
  });

  it("does not render stats strip when no profile data", () => {
    render(<WelcomeBack profile={BASE_PROFILE} onShowCalc={onShowCalc} />);
    expect(screen.queryByText("GMAT")).not.toBeInTheDocument();
    expect(screen.queryByText("Update Profile")).not.toBeInTheDocument();
  });

  it("calls onShowCalc when Update Profile is clicked", () => {
    const profile: UserProfile = { ...BASE_PROFILE, gmat: 700 };
    render(<WelcomeBack profile={profile} onShowCalc={onShowCalc} />);
    fireEvent.click(screen.getByText("Update Profile"));
    expect(onShowCalc).toHaveBeenCalled();
  });

  it("renders all 4 quick action links", () => {
    render(<WelcomeBack profile={BASE_PROFILE} onShowCalc={onShowCalc} />);
    expect(screen.getByText("Browse Schools")).toBeInTheDocument();
    expect(screen.getByText("Profile Report")).toBeInTheDocument();
    expect(screen.getByText("My Applications")).toBeInTheDocument();
    expect(screen.getByText("Essay Evaluator")).toBeInTheDocument();
  });

  it("shows recently viewed schools", () => {
    mockRecentSchools = [
      { id: "hbs", name: "Harvard Business School", location: "Boston, MA" },
      { id: "gsb", name: "Stanford GSB", location: "Stanford, CA" },
    ];
    render(<WelcomeBack profile={BASE_PROFILE} onShowCalc={onShowCalc} />);
    expect(screen.getByText("Harvard Business School")).toBeInTheDocument();
    expect(screen.getByText("Stanford GSB")).toBeInTheDocument();
    expect(screen.getByText("Recently Viewed")).toBeInTheDocument();
    mockRecentSchools = [];
  });

  it("hides recently viewed section when empty", () => {
    mockRecentSchools = [];
    render(<WelcomeBack profile={BASE_PROFILE} onShowCalc={onShowCalc} />);
    expect(screen.queryByText("Recently Viewed")).not.toBeInTheDocument();
  });

  it("shows industry in stats when available", () => {
    const profile: UserProfile = { ...BASE_PROFILE, industry: "Consulting" };
    render(<WelcomeBack profile={profile} onShowCalc={onShowCalc} />);
    expect(screen.getByText("Consulting")).toBeInTheDocument();
    expect(screen.getByText("Industry")).toBeInTheDocument();
  });
});
