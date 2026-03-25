import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA School Culture Quiz - Find Your Best-Fit Program",
  description:
    "Take our personality quiz to discover which MBA program's culture matches your work style, values, and goals.",
  openGraph: {
    title: "School Culture Quiz | Admit Compass",
    description: "Discover which MBA culture fits you best - collaborative, competitive, entrepreneurial, or analytical.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function CultureQuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
