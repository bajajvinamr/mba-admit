import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "About | Admit Compass",
  description: "Admit Compass democratizes MBA admissions with AI-powered tools for 840+ programs worldwide.",
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
