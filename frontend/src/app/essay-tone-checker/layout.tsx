import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Essay Tone Checker - Analyze Your MBA Essay's Voice",
  description: "Paste your MBA essay and get instant tone analysis: confidence, humility, storytelling, formality, and authenticity scores.",
  openGraph: { title: "Essay Tone Checker | Admit Compass", description: "Analyze the tone and voice of your MBA essay.", type: "website", siteName: "Admit Compass" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
