import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Switcher Assessment - Is an MBA Right for Your Transition?",
  description:
    "Evaluate your career switch readiness for an MBA. Assess transferable skills, industry fit, and timeline for consulting, tech, finance, and more.",
  openGraph: {
    title: "Career Switcher Assessment | Admit Compass",
    description: "Is an MBA the right move for your career switch?",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function CareerSwitcherLayout({ children }: { children: React.ReactNode }) {
  return children;
}
