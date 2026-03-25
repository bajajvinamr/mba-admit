import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Day in the Life - What MBA Students Actually Do",
  description:
    "Hour-by-hour schedules at HBS, Stanford GSB, Wharton, and Chicago Booth. See what a typical day looks like at top MBA programs.",
  openGraph: {
    title: "Day in the Life | Admit Compass",
    description: "What a typical day looks like at top MBA programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function DayInLifeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
