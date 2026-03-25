import { redirect } from "next/navigation";

// Consolidated into /essay-length-optimizer - word counting is not a standalone tool
export default function WordCounterRedirect() {
  redirect("/essay-length-optimizer");
}
