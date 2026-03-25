import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dual Degree Explorer - MBA Joint Programs",
  description:
    "Explore MBA dual degree programs: MBA/JD, MBA/MD, MBA/MPP, MBA/MS at top business schools. Compare duration, benefits, and career outcomes.",
  openGraph: {
    title: "Dual Degree Explorer | Admit Compass",
    description: "Find the right MBA dual degree program across M7 and T15 schools.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function DualDegreesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
