import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Simulator | Post-MBA Career Paths | AdmitCompass",
  description:
    "Simulate your post-MBA career trajectory. Explore salary projections, industry transitions, and career paths from top business schools.",
  openGraph: {
    title: "Post-MBA Career Simulator",
    description: "Explore post-MBA career trajectories, salary projections, and industry transition paths.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
