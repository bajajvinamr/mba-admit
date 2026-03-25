import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visa & Work Permits - Post-MBA Work Authorization by Country",
  description:
    "Understand student visas, post-graduation work permits, STEM extensions, and spouse work rights for MBA programs worldwide.",
  openGraph: {
    title: "Visa & Work Permits | Admit Compass",
    description: "Post-MBA work authorization info for US, UK, Canada, Singapore, and more.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function VisaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
