import { NextResponse, type NextRequest } from "next/server";
import {
  sendWelcomeEmail,
  sendDeadlineAlert,
  sendPaymentReceipt,
} from "@/lib/email";

/**
 * POST /api/email
 *
 * Internal email sending endpoint.
 * Expects JSON body with `template` and template-specific fields.
 *
 * Templates:
 *   - welcome: { to, name }
 *   - deadline_alert: { to, name, schoolName, deadline, daysLeft }
 *   - payment_receipt: { to, name, plan, amount, date }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, ...params } = body;

    if (!template || !params.to) {
      return NextResponse.json(
        { error: "Missing required fields: template, to" },
        { status: 400 },
      );
    }

    let result;

    switch (template) {
      case "welcome":
        if (!params.name) {
          return NextResponse.json(
            { error: "Missing required field: name" },
            { status: 400 },
          );
        }
        result = await sendWelcomeEmail(params.to, params.name);
        break;

      case "deadline_alert":
        if (!params.name || !params.schoolName || !params.deadline || params.daysLeft == null) {
          return NextResponse.json(
            { error: "Missing required fields: name, schoolName, deadline, daysLeft" },
            { status: 400 },
          );
        }
        result = await sendDeadlineAlert(
          params.to,
          params.name,
          params.schoolName,
          params.deadline,
          params.daysLeft,
        );
        break;

      case "payment_receipt":
        if (!params.name || !params.plan || !params.amount || !params.date) {
          return NextResponse.json(
            { error: "Missing required fields: name, plan, amount, date" },
            { status: 400 },
          );
        }
        result = await sendPaymentReceipt(
          params.to,
          params.name,
          params.plan,
          params.amount,
          params.date,
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unknown template: ${template}` },
          { status: 400 },
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[API /email] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
