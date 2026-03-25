import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Myths Quiz - True or False?",
  description: "Test your knowledge of common MBA admissions myths. Separate fact from fiction about GMAT scores, work experience, and more.",
  openGraph: { title: "MBA Myths Quiz | Admit Compass", description: "True or false? Test your MBA admissions knowledge.", type: "website", siteName: "Admit Compass" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
