import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA School Culture Map - Where Programs Fit on Key Dimensions",
  description:
    "Visual map showing where top MBA programs fall on collaborative vs competitive, quantitative vs qualitative, and other cultural dimensions.",
  openGraph: {
    title: "School Culture Map | Admit Compass",
    description: "See where MBA programs fall on key cultural dimensions.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function SchoolCultureMapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
