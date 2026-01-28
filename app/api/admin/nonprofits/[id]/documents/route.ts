import { NextResponse, type NextRequest } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { uploadNonprofitDocument } from "@/domain/admin/nonprofit-documents-dto";
import { getNonprofitOnboardingData } from "@/domain/admin/nonprofit-onboarding-dto";
import type { Database } from "@/database.types";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return safeRoute(async () => {
    if (process.env.NODE_ENV === "production") {
      return jsonError("Admin routes are disabled in production.", 403);
    }

    const { id } = await context.params;
    if (!id) {
      return jsonError("entity_id is required", 400);
    }

    const scopeId = req.nextUrl.searchParams.get("scope_id");
    const formData = await req.formData();
    const file = formData.get("file");
    const documentType = formData.get("document_type") as
      | Database["public"]["Enums"]["document_type"]
      | null;
    const title = (formData.get("title") as string | null) ?? null;
    const taxYearRaw = formData.get("tax_year");
    const taxYear = taxYearRaw ? Number(taxYearRaw) : null;
    const taxYearValue = Number.isFinite(taxYear) ? taxYear : null;

    if (!file || !(file instanceof File)) {
      return jsonError("file is required", 400);
    }

    if (documentType === "form_990") {
      if (!taxYearValue) {
        return jsonError("tax_year is required for Form 990 uploads", 400);
      }
    }

    await uploadNonprofitDocument({
      entityId: id,
      file,
      documentType: documentType ?? "other",
      title,
      taxYear: taxYearValue,
    });

    const payload = await getNonprofitOnboardingData(id, scopeId);
    return NextResponse.json<typeof payload>(payload);
  });
}
