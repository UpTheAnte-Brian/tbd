import type { NextRequest } from "next/server";
import {
  getServerClient,
  getUserOrThrow,
  jsonError,
  parseEntityId,
} from "@/app/lib/server/route-context";
import {
  getBusinessInvoiceContext,
  generateBusinessInvoicePdf,
  getBusinessInvoicePdfFileName,
} from "@/app/lib/server/business-invoice-delivery";
import {
  isGlobalAdmin,
  requireEntityAdmin,
} from "@/app/lib/server/rbac";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
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

    const invoiceId = params.invoiceId?.trim();
    if (!invoiceId) {
      throw new Error("Invoice id is required");
    }

    const invoiceContext = await getBusinessInvoiceContext(entityId, invoiceId);
    const pdfBytes = await generateBusinessInvoicePdf(invoiceContext);
    const fileName = getBusinessInvoicePdfFileName(invoiceContext.invoice.invoice_number);

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate invoice PDF";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 403
      : lower.includes("not found")
        ? 404
        : lower.includes("required") || lower.includes("invalid")
          ? 400
          : 500;
    return jsonError(message, status);
  }
}
