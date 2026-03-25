import { redirect } from "next/navigation";

// Diversity stats belong on school detail pages, not a standalone route
export default function DiversityRedirect() {
  redirect("/schools");
}
