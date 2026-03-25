import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Cost of Living Comparison - Monthly Expenses by City",
  description:
    "Compare monthly cost of living across MBA program cities. See rent, food, transport, and miscellaneous expenses for M7, T15, and 200+ business school locations.",
  openGraph: {
    title: "MBA Cost of Living Comparison | Admit Compass",
    description: "Side-by-side cost of living comparison for MBA program cities worldwide.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function CostOfLivingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
