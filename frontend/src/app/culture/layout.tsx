import { Metadata } from "next";

export const metadata: Metadata = {
  title: "School Culture Matcher - Find Your MBA Fit",
  description:
    "Rate culture traits like collaboration, entrepreneurship, and innovation to discover which MBA programs best match your values and working style.",
  openGraph: {
    title: "School Culture Matcher | Admit Compass",
    description: "Discover which MBA programs align with your culture priorities across 8 dimensions.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function CultureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
