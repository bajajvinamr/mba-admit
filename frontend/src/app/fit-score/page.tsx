import { redirect } from "next/navigation";

// Consolidated into /profile-report - fit scores are shown as part of the full profile analysis
export default function FitScoreRedirect() {
  redirect("/profile-report");
}
