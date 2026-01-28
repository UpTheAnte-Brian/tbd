import { NextResponse } from "next/server";
import { assertAdmin } from "@/app/lib/auth/assertAdmin";
import { getAdminSummary } from "@/domain/admin/admin-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await getAdminSummary();
    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load admin summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
