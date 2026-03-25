import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Essay Draft Manager - Organize All Your MBA Essays",
  description:
    "Keep all your MBA application essays organized in one place. Draft, edit, and manage essays for multiple schools with auto-save and word count tracking.",
  openGraph: {
    title: "Essay Draft Manager | Admit Compass",
    description: "Organize and manage all your MBA application essays in one place.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function EssayDraftsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
