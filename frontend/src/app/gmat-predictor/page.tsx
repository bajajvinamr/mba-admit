import { redirect } from "next/navigation";

// Redundant with Profile Report and Fit Score - merged into /profile-report
export default function GmatPredictorRedirect() {
  redirect("/profile-report");
}
