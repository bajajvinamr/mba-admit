import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Application Countdown - Days Until Your Deadline",
  description:
    "Set your MBA application deadline and watch the countdown. Stay motivated and on track.",
  openGraph: {
    title: "Deadline Countdown | Admit Compass",
    description: "Track days, hours, and minutes until your MBA application deadline.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function CountdownLayout({ children }: { children: React.ReactNode }) {
  return children;
}
