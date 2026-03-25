import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Diversity Statistics - Gender, International & Demographics",
  description:
    "Compare diversity statistics across top MBA programs: gender ratio, international students, countries represented, and average age.",
  openGraph: {
    title: "MBA Diversity Stats | Admit Compass",
    description: "Gender, international, and demographic diversity data for top MBA programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function DiversityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
