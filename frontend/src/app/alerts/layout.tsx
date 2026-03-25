import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deadline Alerts - Never Miss an MBA Application Deadline",
  description:
    "Set deadline reminders for every MBA program round you're targeting. Get alerted 1, 3, 7, or 14 days before each deadline.",
  openGraph: {
    title: "MBA Deadline Alerts | Admit Compass",
    description: "Deadline reminders for MBA applications - never miss R1, R2, or R3.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
