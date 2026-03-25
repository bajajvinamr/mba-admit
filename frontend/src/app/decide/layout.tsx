import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Decision Matrix | Compare MBA Admits | AdmitCompass",
  description:
    "Compare your MBA admits side-by-side with weighted scoring. Evaluate financial aid, salary outcomes, employment rates, and more to make a data-driven decision.",
  openGraph: {
    title: "MBA Decision Matrix",
    description:
      "Side-by-side comparison of your MBA admits with customizable importance weights.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
