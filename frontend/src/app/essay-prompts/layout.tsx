import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Essay Prompts Library - Every Prompt from 200+ Schools",
  description:
    "Browse essay prompts from Harvard, Stanford, Wharton, and 200+ MBA programs. Search by school, word limit, and topic. Start writing with one click.",
  openGraph: {
    title: "MBA Essay Prompt Library | Admit Compass",
    description: "Every MBA essay prompt from 200+ schools - searchable and ready to write.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function EssayPromptsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
