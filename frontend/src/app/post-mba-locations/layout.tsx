import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post-MBA Location Guide - Where MBA Grads Work",
  description:
    "Explore top post-MBA cities: salary data, cost of living, visa friendliness, top employers, and feeder schools for each location.",
  openGraph: {
    title: "Post-MBA Location Guide | Admit Compass",
    description: "Compare cities where MBA graduates build their careers.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function PostMbaLocationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
