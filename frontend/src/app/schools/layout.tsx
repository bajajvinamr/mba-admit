import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA School Directory - 840+ Programs Worldwide",
  description:
    "Browse and compare 840+ MBA programs. Filter by GMAT score, acceptance rate, location, and specialization. See personalized fit indicators based on your profile.",
  alternates: {
    canonical: "/schools",
  },
  openGraph: {
    title: "MBA School Directory | Admit Compass",
    description:
      "Browse 840+ MBA programs with GMAT scores, acceptance rates, and personalized fit indicators.",
    type: "website",
    siteName: "Admit Compass",
    url: "/schools",
  },
};

export default function SchoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
