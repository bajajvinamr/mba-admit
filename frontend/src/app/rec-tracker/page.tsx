import { redirect } from "next/navigation";

// Consolidated into /recommenders - tracker is built into the Recommender Strategy page
export default function RecTrackerRedirect() {
  redirect("/recommenders");
}
