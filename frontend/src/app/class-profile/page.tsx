import { redirect } from "next/navigation";

// Class profiles belong in the Compare tool as a view toggle
export default function ClassProfileRedirect() {
  redirect("/compare");
}
