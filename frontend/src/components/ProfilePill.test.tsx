import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfilePill } from "./ProfilePill";

// Mock useProfile hook
const mockUpdateProfile = vi.fn();
const mockResetProfile = vi.fn();
let mockProfile = { gmat: null as number | null, gpa: null as number | null, yoe: null as number | null, industry: null, name: null, test_type: null, target_degree: null, target_countries: [] };
let mockHasProfile = false;

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: mockProfile,
    updateProfile: mockUpdateProfile,
    resetProfile: mockResetProfile,
    hasProfile: mockHasProfile,
  }),
}));

describe("ProfilePill", () => {
  beforeEach(() => {
    mockProfile = { gmat: null, gpa: null, yoe: null, industry: null, name: null, test_type: null, target_degree: null, target_countries: [] };
    mockHasProfile = false;
    mockUpdateProfile.mockClear();
    mockResetProfile.mockClear();
  });

  it("shows 'My Stats' when no profile exists", () => {
    render(<ProfilePill />);
    expect(screen.getByText("My Stats")).toBeInTheDocument();
  });

  it("shows compact stats when profile has data", () => {
    mockProfile = { ...mockProfile, gmat: 730, gpa: 3.8, yoe: 4 };
    mockHasProfile = true;
    render(<ProfilePill />);
    expect(screen.getByText("730 · 3.8 · 4y")).toBeInTheDocument();
  });

  it("shows partial stats correctly (GMAT only)", () => {
    mockProfile = { ...mockProfile, gmat: 750 };
    mockHasProfile = true;
    render(<ProfilePill />);
    expect(screen.getByText("750")).toBeInTheDocument();
  });

  it(" opens popover on click", () => {
    render(<ProfilePill />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Your Profile")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. 730")).toBeInTheDocument();
  });

  it("shows GMAT, GPA, and Years Exp inputs in popover", () => {
    render(<ProfilePill />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("GMAT Score")).toBeInTheDocument();
    expect(screen.getByText("GPA")).toBeInTheDocument();
    expect(screen.getByText("Years Exp")).toBeInTheDocument();
  });

  it("calls updateProfile on save", () => {
    render(<ProfilePill />);
    fireEvent.click(screen.getByRole("button"));

    const gmatInput = screen.getByPlaceholderText("e.g. 730");
    fireEvent.change(gmatInput, { target: { value: "740" } });

    fireEvent.click(screen.getByText("Save"));
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      gmat: 740,
      gpa: null,
      yoe: null,
    });
  });

  it("shows Clear button only when profile exists", () => {
    render(<ProfilePill />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();
  });

  it("shows Clear button when profile has data", () => {
    mockHasProfile = true;
    mockProfile = { ...mockProfile, gmat: 700 };
    render(<ProfilePill />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("calls resetProfile on clear", () => {
    mockHasProfile = true;
    mockProfile = { ...mockProfile, gmat: 700 };
    render(<ProfilePill />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Clear"));
    expect(mockResetProfile).toHaveBeenCalled();
  });

  it("closes popover after save", () => {
    render(<ProfilePill />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Your Profile")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Save"));
    expect(screen.queryByText("Your Profile")).not.toBeInTheDocument();
  });

  it("pre-fills form inputs from existing profile", () => {
    mockProfile = { ...mockProfile, gmat: 720, gpa: 3.6, yoe: 5 };
    mockHasProfile = true;
    render(<ProfilePill />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByPlaceholderText("e.g. 730")).toHaveValue(720);
    expect(screen.getByPlaceholderText("3.8")).toHaveValue(3.6);
    expect(screen.getByPlaceholderText("4")).toHaveValue(5);
  });

  it("shows helpful description text", () => {
    render(<ProfilePill />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Saved locally/)).toBeInTheDocument();
  });
});
