import { redirect } from "next/navigation";

export default function Page() {
  redirect("/test-prep?tab=comparison");
}
