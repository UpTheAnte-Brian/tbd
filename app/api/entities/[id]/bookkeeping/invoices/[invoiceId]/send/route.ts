import type { NextRequest } from "next/server";
import {
  getServerClient,
  getUserOrThrow,
  jsonError,
  jsonOk,
  parseEntityId,
} from "@/app/lib/server/route-context";
import {
  buildBusinessInvoiceEmailSubject,
  canSendBusinessInvoiceEmails,
  getBusinessInvoiceContext,
  sendBusinessInvoiceEmail,
} from "@/app/lib/server/business-invoice-delivery";
import {
  isGlobalAdmin,
  requireEntityAdmin,
} from "@/app/lib/server/rbac";

export const runtime = "nodejs";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; invoiceId: string }> },
) {
  const supabase = await getServerClient();

  try {
    const params = await context.params;
    const entityId = await parseEntityId(supabase, { id: params.id });
    const user = await getUserOrThrow(supabase);
    const globalAdmin = await isGlobalAdmin(supabase, user);

    if (!globalAdmin) {
      await requireEntityAdmin({ supabase, userId: user.id, entityId });
    }

    if (!canSendBusinessInvoiceEmails()) {
      throw new Error("Mail transport is not configured");
    }

    const invoiceId = params.invoiceId?.trim();
    if (!invoiceId) {
      throw new Error("Invoice id is required");
    }

    const body = (await req.json().catch(() => null)) as
      | { to?: unknown; subject?: unknown; message?: unknown }
      | null;

    const to = cleanString(body?.to);
    if (!to || !to.includes("@")) {
      throw new Error("A valid recipient email is required");
    }

    const invoiceContext = await getBusinessInvoiceContext(entityId, invoiceId);
    const subject = cleanString(body?.subject) || buildBusinessInvoiceEmailSubject(invoiceContext);
    const message = cleanString(body?.message) || null;

    const snapshot = await sendBusinessInvoiceEmail({
      entityId,
      invoiceId,
      to,
      subject,
      message,
    });

    return jsonOk({
      snapshot,
      sentTo: to,
      subject,
      message: `Invoice emailed to ${to}`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send invoice email";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 403
      : lower.includes("not found")
        ? 404
        : lower.includes("required") || lower.includes("valid")
          ? 400
          : lower.includes("configured")
            ? 503
            : 500;
    return jsonError(message, status);
  }
}
