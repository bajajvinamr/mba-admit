import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Application Fee Calculator - Know Your Total Cost",
  description:
    "Calculate the total cost of applying to MBA programs. See per-school application fees for M7, T15, and 200+ business schools worldwide.",
  openGraph: {
    title: "MBA Application Fee Calculator | Admit Compass",
    description: "Total application fee calculator for M7, T15, and 200+ MBA programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function FeesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
