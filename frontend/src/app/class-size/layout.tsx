import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Class Size Comparison - MBA Program Demographics",
  description:
    "Compare MBA class sizes, section structures, student-faculty ratios, and international student percentages across top business schools.",
  openGraph: {
    title: "Class Size Comparison | Admit Compass",
    description: "See how MBA class sizes compare across M7 and T15 programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ClassSizeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
