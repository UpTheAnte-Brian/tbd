import { NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import { createEntityFromEin } from "@/domain/admin/nonprofits-admin-dto";

export async function POST(req: Request) {
  return safeRoute(async () => {
    if (process.env.NODE_ENV === "production") {
      return jsonError("Admin routes are disabled in production.", 403);
    }

    const body = (await req.json().catch(() => null)) as
      | {
          ein?: string;
        }
      | null;

    if (!body?.ein) {
      return jsonError("EIN is required", 400);
    }

    const result = await createEntityFromEin(body.ein);
    return NextResponse.json(result);
  });
}
