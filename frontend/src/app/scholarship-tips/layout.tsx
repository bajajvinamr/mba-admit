import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Scholarship Essay Tips - Win More Funding",
  description:
    "Expert strategies for writing winning MBA scholarship essays. Dos, don'ts, and examples for positioning, strategy, and writing.",
  openGraph: {
    title: "Scholarship Essay Tips | Admit Compass",
    description: "Win more MBA scholarship funding with proven strategies.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ScholarshipTipsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
