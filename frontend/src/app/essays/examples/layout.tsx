import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Essay Examples Library - Real MBA Essays That Worked",
  description:
    "Browse 30+ anonymized MBA essay examples from HBS, Stanford GSB, Wharton, and more. See what worked and why with expert coach notes.",
  openGraph: {
    title: "Essay Examples Library | Admit Compass",
    description: "Real MBA essays that got applicants admitted to top programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function EssayExamplesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
