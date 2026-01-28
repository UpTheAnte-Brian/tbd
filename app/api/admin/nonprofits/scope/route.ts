import { NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import {
  addScopeNonprofit,
  getScopeNonprofitById,
  updateScopeNonprofit,
} from "@/domain/admin/nonprofits-admin-dto";
import type { ScopeStatus, ScopeTier } from "@/app/admin/nonprofits/types";

const TIERS: ScopeTier[] = [
  "registry_only",
  "disclosure_grade",
  "institutional",
];
const STATUSES: ScopeStatus[] = ["candidate", "active", "archived"];

function asTier(value: unknown): ScopeTier | undefined {
  return TIERS.includes(value as ScopeTier) ? (value as ScopeTier) : undefined;
}

function asStatus(value: unknown): ScopeStatus | undefined {
  return STATUSES.includes(value as ScopeStatus)
    ? (value as ScopeStatus)
    : undefined;
}

export async function GET(req: Request) {
  return safeRoute(async () => {
    if (process.env.NODE_ENV === "production") {
      return jsonError("Admin routes are disabled in production.", 403);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonError("id is required", 400);
    }

    const scope = await getScopeNonprofitById(id);
    if (!scope) {
      return jsonError("Scope row not found", 404);
    }

    return NextResponse.json(scope);
  });
}

export async function POST(req: Request) {
  return safeRoute(async () => {
    if (process.env.NODE_ENV === "production") {
      return jsonError("Admin routes are disabled in production.", 403);
    }

    const body = (await req.json().catch(() => null)) as
      | {
          district_entity_id?: string | null;
          ein?: string;
          label?: string | null;
          tier?: ScopeTier;
          status?: ScopeStatus;
        }
      | null;

    if (!body?.ein) {
      return jsonError("EIN is required", 400);
    }

    const scope = await addScopeNonprofit({
      district_entity_id: body.district_entity_id ?? null,
      ein: body.ein,
      label: body.label ?? null,
      tier: asTier(body.tier),
      status: asStatus(body.status),
    });

    return NextResponse.json(scope);
  });
}

export async function PATCH(req: Request) {
  return safeRoute(async () => {
    if (process.env.NODE_ENV === "production") {
      return jsonError("Admin routes are disabled in production.", 403);
    }

    const body = (await req.json().catch(() => null)) as
      | {
          district_entity_id?: string | null;
          ein?: string;
          label?: string | null;
          tier?: ScopeTier;
          status?: ScopeStatus;
        }
      | null;

    if (!body?.ein) {
      return jsonError("EIN is required", 400);
    }

    const tier = asTier(body.tier);
    const status = asStatus(body.status);
    const label = body.label;

    if (!tier && !status && label === undefined) {
      return jsonError("No updates provided", 400);
    }

    const scope = await updateScopeNonprofit({
      ein: body.ein,
      tier,
      status,
      label,
    });

    return NextResponse.json(scope);
  });
}
