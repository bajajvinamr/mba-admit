import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Program Formats - Compare 1-Year, 2-Year, Part-Time, Executive & Online",
  description:
    "Compare MBA program formats side by side: 2-year, 1-year, accelerated, part-time, executive, and online. See schools, costs, pros/cons, and find the best fit.",
  openGraph: {
    title: "MBA Program Format Comparison | Admit Compass",
    description: "Compare every MBA format - full-time, part-time, executive, online - with costs and school lists.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ProgramFormatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
