import { describe, it, expect, vi } from"vitest";
import { render, screen } from"@testing-library/react";
import { MobileTabBar } from"./MobileTabBar";

let mockPathname ="/";
vi.mock("next/navigation", () => ({
 usePathname: () => mockPathname,
}));

describe("MobileTabBar", () => {
 it("renders all 4 tab links", () => {
 render(<MobileTabBar />);
 expect(screen.getByText("Home")).toBeInTheDocument();
 expect(screen.getByText("Schools")).toBeInTheDocument();
 expect(screen.getByText("Essay AI")).toBeInTheDocument();
 expect(screen.getByText("My List")).toBeInTheDocument();
 });

 it("links to correct hrefs", () => {
 render(<MobileTabBar />);
 const links = screen.getAllByRole("link");
 expect(links).toHaveLength(4);
 expect(links[0]).toHaveAttribute("href","/dashboard");
 expect(links[1]).toHaveAttribute("href","/schools");
 expect(links[2]).toHaveAttribute("href","/evaluator");
 expect(links[3]).toHaveAttribute("href","/my-schools");
 });

 it("highlights active tab based on pathname", () => {
 mockPathname ="/schools";
 render(<MobileTabBar />);
 const schoolsLink = screen.getByText("Schools").closest("a");
 expect(schoolsLink?.className).toContain("text-primary");
 });

 it("does not highlight inactive tabs", () => {
 mockPathname ="/schools";
 render(<MobileTabBar />);
 const homeLink = screen.getByText("Home").closest("a");
 expect(homeLink?.className).toContain("text-muted-foreground/40");
 expect(homeLink?.className).not.toContain("text-primary");
 });

 it("matches nested routes (e.g. /schools/hbs)", () => {
 mockPathname ="/schools/hbs";
 render(<MobileTabBar />);
 const schoolsLink = screen.getByText("Schools").closest("a");
 expect(schoolsLink?.className).toContain("text-primary");
 });

 it("renders as nav element with correct classes", () => {
 const { container } = render(<MobileTabBar />);
 const nav = container.querySelector("nav");
 expect(nav).toBeTruthy();
 expect(nav?.className).toContain("md:hidden");
 expect(nav?.className).toContain("fixed");
 expect(nav?.className).toContain("bottom-0");
 });

 // Note: safe-area-inset-bottom test skipped — jsdom drops env() CSS values
});
