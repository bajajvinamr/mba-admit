import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Executive MBA (EMBA) Programs | Admit Compass",
  description: "Browse 575+ Executive MBA programs worldwide. Weekend and modular formats for senior professionals with 8+ years of experience.",
  openGraph: { title: "EMBA Programs Directory", description: "Find the right Executive MBA for senior leaders." },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
