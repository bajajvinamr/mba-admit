import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fee Waiver Finder - Save on MBA Application Fees",
  description:
    "Find application fee waivers for top MBA programs. Filter by military service, Consortium membership, and need-based options.",
  openGraph: {
    title: "MBA Fee Waiver Finder | Admit Compass",
    description: "Discover fee waiver opportunities for M7, T15, and T25 MBA programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function FeeWaiverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
