import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Countries for MBA | Global MBA Guide | AdmitCompass",
  description:
    "Compare countries for MBA programs side-by-side. Evaluate cost of living, work visa policies, salary outcomes, and quality of life across global MBA destinations.",
  openGraph: {
    title: "Compare Countries for MBA",
    description: "Side-by-side country comparison for MBA destinations worldwide.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
