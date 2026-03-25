import { redirect } from "next/navigation";

// Consolidated into /checklist - one checklist page with all application requirements
export default function AppChecklistRedirect() {
  redirect("/checklist");
}
