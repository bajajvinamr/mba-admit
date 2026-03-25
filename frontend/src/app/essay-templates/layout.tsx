import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Essay Structure Templates - Proven Frameworks for Every Prompt",
  description:
    "Section-by-section essay templates for MBA goals, leadership, personal, contribution, and failure essays. Includes word allocation and example openings.",
  openGraph: {
    title: "MBA Essay Templates | Admit Compass",
    description: "Proven essay frameworks for every MBA prompt type.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function EssayTemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
