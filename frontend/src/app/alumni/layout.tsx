import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alumni Network Explorer - Compare MBA Alumni Outcomes",
  description:
    "Explore and compare alumni networks across top MBA programs. See industry distributions, top employers, and notable graduates side by side.",
  openGraph: {
    title: "Alumni Network Explorer | Admit Compass",
    description: "Compare alumni networks, industry placement, and notable graduates across top MBA programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function AlumniLayout({ children }: { children: React.ReactNode }) {
  return children;
}
