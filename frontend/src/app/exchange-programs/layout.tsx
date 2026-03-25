import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exchange Programs - Study Abroad Partnerships for MBA Students",
  description:
    "Explore study abroad and exchange partnerships at top MBA programs. Filter by school or region to find programs in Europe, Asia, and the Americas.",
  openGraph: {
    title: "Exchange Programs | Admit Compass",
    description: "Study abroad partnerships at HBS, Stanford, Wharton, INSEAD, LBS, Booth, and Kellogg.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ExchangeProgramsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
