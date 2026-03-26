import { redirect } from "next/navigation";

export default function Page() {
  redirect("/essays?tab=evaluator");
}
