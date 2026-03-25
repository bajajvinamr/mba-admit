import { redirect } from "next/navigation";

// Consolidated into /interview/questions - single canonical question bank
export default function InterviewBankRedirect() {
  redirect("/interview/questions");
}
