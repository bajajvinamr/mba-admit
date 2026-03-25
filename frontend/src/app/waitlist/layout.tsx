import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Waitlist Strategy - MBA LOCI Letter Generator",
  description:
    "Convert your MBA waitlist into an acceptance. Generate a Letter of Continued Interest (LOCI) with a tactical 30-day update plan.",
  openGraph: {
    title: "MBA Waitlist Strategy & LOCI Generator | Admit Compass",
    description:
      "Getting waitlisted is a 'maybe,' not a 'no.' Generate a school-specific LOCI letter and tactical plan to convert it to a 'yes.'",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
