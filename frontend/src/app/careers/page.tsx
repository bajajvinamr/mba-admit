import { redirect } from "next/navigation";

// Post-MBA placement data belongs on school detail pages
export default function CareersRedirect() {
  redirect("/schools");
}
