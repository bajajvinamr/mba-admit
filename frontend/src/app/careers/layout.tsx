import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post-MBA Career Explorer - Career Paths by Industry",
  description:
    "Explore post-MBA career paths across consulting, finance, tech, healthcare, and more. See roles, salaries, top recruiters, and which schools feed each industry.",
  openGraph: {
    title: "Post-MBA Career Explorer | Admit Compass",
    description: "Discover career paths, salaries, and top recruiters across 8 industries for MBA graduates.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
