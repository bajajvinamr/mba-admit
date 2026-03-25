import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Application Timeline - Visual Roadmap from Research to Admission",
  description:
    "14-month visual timeline for MBA applications. Phase-by-phase tasks from research and test prep through Round 1/2 submissions and interviews.",
  openGraph: {
    title: "Application Timeline | Admit Compass",
    description: "Visual roadmap for your MBA application journey.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function TimelineVizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
