/**
 * Resend email service - server-side only.
 *
 * Provides typed email sending with pre-built templates.
 * Gracefully degrades if RESEND_API_KEY is not configured.
 */

import { Resend } from "resend";

const API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Admit Compass <noreply@admitcompass.ai>";

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured - emails disabled");
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(API_KEY);
  }
  return resendInstance;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// HTML Escaping (XSS prevention)
// ---------------------------------------------------------------------------

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function welcomeEmailHtml(name: string): string {
  const safeName = escapeHtml(name);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content=" width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
  <h1 style="font-family: Georgia, serif; font-size: 28px; margin-bottom: 16px;">Welcome to Admit Compass</h1>
  <p>Hi ${safeName},</p>
  <p>You're all set. Your profile is ready and you now have access to:</p>
  <ul style="line-height: 1.8;">
    <li>840+ MBA, MiM, and EMBA program profiles</li>
    <li>AI-powered essay feedback</li>
    <li>Interview simulator with voice mode</li>
    <li>Personalized school recommendations</li>
  </ul>
  <p style="margin-top: 24px;">
    <a href="https://admitcompass.ai/dashboard" style="background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block;">Go to Dashboard</a>
  </p>
  <p style="color: #666; font-size: 13px; margin-top: 32px;">— The Admit Compass Team</p>
</body>
</html>`.trim();
}

function deadlineAlertHtml(
  name: string,
  schoolName: string,
  deadline: string,
  daysLeft: number,
): string {
  const safeName = escapeHtml(name);
  const safeSchoolName = escapeHtml(schoolName);
  const safeDeadline = escapeHtml(deadline);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content=" width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
  <h1 style="font-family: Georgia, serif; font-size: 28px; margin-bottom: 16px;">Deadline Approaching</h1>
  <p>Hi ${safeName},</p>
  <p><strong>${safeSchoolName}</strong> has a deadline on <strong>${safeDeadline}</strong> — that's <strong>${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong> away.</p>
  <p>Make sure your application materials are ready:</p>
  <ul style="line-height: 1.8;">
    <li>Essays finalized and reviewed</li>
    <li>Recommendations submitted</li>
    <li>Test scores sent</li>
    <li>Application form completed</li>
  </ul>
  <p style="margin-top: 24px;">
    <a href="https://admitcompass.ai/app-checklist" style="background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block;">Check Your Checklist</a>
  </p>
  <p style="color: #666; font-size: 13px; margin-top: 32px;">— The Admit Compass Team</p>
</body>
</html>`.trim();
}

function paymentReceiptHtml(
  name: string,
  plan: string,
  amount: string,
  date: string,
): string {
  const safeName = escapeHtml(name);
  const safePlan = escapeHtml(plan);
  const safeAmount = escapeHtml(amount);
  const safeDate = escapeHtml(date);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content=" width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
  <h1 style="font-family: Georgia, serif; font-size: 28px; margin-bottom: 16px;">Payment Receipt</h1>
  <p>Hi ${safeName},</p>
  <p>Thanks for subscribing to <strong>Admit Compass ${safePlan}</strong>.</p>
  <table style=" width: 100%; border-collapse: collapse; margin: 24px 0;">
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px 0; color: #666;">Plan</td>
      <td style="padding: 12px 0; text-align: right; font-weight: bold;">${safePlan}</td>
    </tr>
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px 0; color: #666;">Amount</td>
      <td style="padding: 12px 0; text-align: right; font-weight: bold;">${safeAmount}</td>
    </tr>
    <tr>
      <td style="padding: 12px 0; color: #666;">Date</td>
      <td style="padding: 12px 0; text-align: right; font-weight: bold;">${safeDate}</td>
    </tr>
  </table>
  <p>You now have full access to all ${safePlan} features. If you have any questions, reply to this email.</p>
  <p style="margin-top: 24px;">
    <a href="https://admitcompass.ai/dashboard" style="background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block;">Go to Dashboard</a>
  </p>
  <p style="color: #666; font-size: 13px; margin-top: 32px;">— The Admit Compass Team</p>
</body>
</html>`.trim();
}

// ---------------------------------------------------------------------------
// Deadline Reminder (multi-deadline digest)
// ---------------------------------------------------------------------------

export interface DeadlineEntry {
  school_name: string;
  round: string;
  deadline_display: string;
  days_remaining: number;
  urgency: string;
}

function deadlineReminderHtml(
  name: string,
  deadlines: DeadlineEntry[],
): string {
  const safeName = escapeHtml(name);

  const rows = deadlines
    .map((dl) => {
      const safeSchool = escapeHtml(dl.school_name);
      const safeRound = escapeHtml(dl.round);
      const safeDate = escapeHtml(dl.deadline_display);
      const days = dl.days_remaining;
      const urgencyColor = days <= 2 ? "#dc2626" : days <= 5 ? "#f59e0b" : "#16a34a";
      return `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px 8px; font-weight: bold;">${safeSchool}</td>
      <td style="padding: 12px 8px;">${safeRound}</td>
      <td style="padding: 12px 8px;">${safeDate}</td>
      <td style="padding: 12px 8px; color: ${urgencyColor}; font-weight: bold;">${days} day${days === 1 ? "" : "s"}</td>
    </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
  <h1 style="font-family: Georgia, serif; font-size: 28px; margin-bottom: 16px;">Deadline Reminder</h1>
  <p>Hi ${safeName},</p>
  <p>You have <strong>${deadlines.length} upcoming deadline${deadlines.length === 1 ? "" : "s"}</strong> in the next 7 days:</p>
  <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
    <thead>
      <tr style="border-bottom: 2px solid #1a1a1a; text-align: left;">
        <th style="padding: 8px;">School</th>
        <th style="padding: 8px;">Round</th>
        <th style="padding: 8px;">Deadline</th>
        <th style="padding: 8px;">Remaining</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>
  <p>Make sure your applications are finalized and submitted before the deadlines.</p>
  <p style="margin-top: 24px;">
    <a href="https://admitcompass.ai/deadlines" style="background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block;">View All Deadlines</a>
  </p>
  <p style="color: #666; font-size: 13px; margin-top: 32px;">— The Admit Compass Team</p>
</body>
</html>`.trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a welcome email after onboarding.
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<SendResult> {
  const resend = getResend();
  if (!resend) return { success: false, error: "Email service not configured" };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to Admit Compass",
      html: welcomeEmailHtml(name),
    });
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Failed to send welcome email:", message);
    return { success: false, error: message };
  }
}

/**
 * Send a deadline alert email.
 */
export async function sendDeadlineAlert(
  to: string,
  name: string,
  schoolName: string,
  deadline: string,
  daysLeft: number,
): Promise<SendResult> {
  const resend = getResend();
  if (!resend) return { success: false, error: "Email service not configured" };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${schoolName} deadline in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      html: deadlineAlertHtml(name, schoolName, deadline, daysLeft),
    });
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Failed to send deadline alert:", message);
    return { success: false, error: message };
  }
}

/**
 * Send a payment receipt email.
 */
export async function sendPaymentReceipt(
  to: string,
  name: string,
  plan: string,
  amount: string,
  date: string,
): Promise<SendResult> {
  const resend = getResend();
  if (!resend) return { success: false, error: "Email service not configured" };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your Admit Compass ${plan} receipt`,
      html: paymentReceiptHtml(name, plan, amount, date),
    });
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Failed to send payment receipt:", message);
    return { success: false, error: message };
  }
}

/**
 * Send a deadline reminder digest email (multiple deadlines in one message).
 */
export async function sendDeadlineReminder(
  to: string,
  name: string,
  deadlines: DeadlineEntry[],
): Promise<SendResult> {
  const resend = getResend();
  if (!resend) return { success: false, error: "Email service not configured" };

  const count = deadlines.length;
  const subject = `MBA Deadline Reminder: ${count} deadline${count === 1 ? "" : "s"} within 7 days`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: deadlineReminderHtml(name, deadlines),
    });
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Failed to send deadline reminder:", message);
    return { success: false, error: message };
  }
}

/**
 * Generate deadline reminder HTML without sending (for preview/testing).
 */
export function deadlineReminderEmail(
  name: string,
  deadlines: DeadlineEntry[],
): string {
  return deadlineReminderHtml(name, deadlines);
}
