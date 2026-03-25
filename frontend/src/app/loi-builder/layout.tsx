import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Letter of Intent Builder - Draft Your Statement of Purpose",
  description:
    "Build a compelling MBA letter of intent or statement of purpose with guided templates, structure outlines, and expert tips for top business schools.",
  openGraph: {
    title: "MBA Letter of Intent Builder | Admit Compass",
    description: "Craft a winning MBA statement of purpose with guided templates and expert tips.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function LoiBuilderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
