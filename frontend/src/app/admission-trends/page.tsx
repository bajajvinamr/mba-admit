import { redirect } from "next/navigation";

// Per-school trend data belongs on school detail pages, not a standalone route
export default function AdmissionTrendsRedirect() {
  redirect("/schools");
}
