import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Networking Events - Info Sessions, Webinars & Conferences",
  description:
    "Find MBA info sessions, campus visits, webinars, coffee chats, and conferences to connect with top business schools.",
  openGraph: {
    title: "MBA Networking Events | Admit Compass",
    description: "Discover info sessions, campus visits, and MBA conferences across top programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
