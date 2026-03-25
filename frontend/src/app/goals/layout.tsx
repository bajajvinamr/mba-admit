import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Goals Builder - MBA Post-MBA Vision Planner",
  description:
    "Craft compelling short-term and long-term career goals for your MBA application. AI-powered goal articulation aligned to your target schools.",
  openGraph: {
    title: "MBA Career Goals Builder | Admit Compass",
    description:
      "Articulate your post-MBA career vision with AI-powered goal planning tailored to top business school expectations.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function GoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
