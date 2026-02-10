import { NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { jsonError } from "@/app/lib/api/errors";
import {
  addScopeNonprofit,
  DISTRICT_FOUNDATION_CONSTRAINT,
  DistrictFoundationConflictError,
  getScopeNonprofitById,
  updateScopeNonprofit,
} from "@/domain/admin/nonprofits-admin-dto";
import type { ScopeStatus, ScopeTier } from "@/app/admin/nonprofits/types";
import { areAdminToolsDisabled } from "@/utils/admin-tools";
import type { OrgType } from "@/app/lib/types/nonprofits";

const TIERS: ScopeTier[] = [
  "registry_only",
  "disclosure_grade",
  "institutional",
];
const STATUSES: ScopeStatus[] = ["candidate", "active", "archived"];
const ORG_TYPES: OrgType[] = [
  "district_foundation",
  "up_the_ante",
  "external_charity",
];

const DISTRICT_FOUNDATION_ERROR =
  "Another nonprofit is listed as the District Foundation.";

function asTier(value: unknown): ScopeTier | undefined {
  return TIERS.includes(value as ScopeTier) ? (value as ScopeTier) : undefined;
}

function asStatus(value: unknown): ScopeStatus | undefined {
  return STATUSES.includes(value as ScopeStatus)
    ? (value as ScopeStatus)
    : undefined;
}

function asOrgType(value: unknown): OrgType | undefined {
  return ORG_TYPES.includes(value as OrgType) ? (value as OrgType) : undefined;
}

export async function GET(req: Request) {
  return safeRoute(async () => {
    if (areAdminToolsDisabled()) {
      return jsonError("Admin routes are disabled.", 403);
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
    if (areAdminToolsDisabled()) {
      return jsonError("Admin routes are disabled.", 403);
    }

    const body = (await req.json().catch(() => null)) as
      | {
        district_entity_id: string;
        ein?: string;
        label?: string | null;
        tier?: ScopeTier;
        status?: ScopeStatus;
        org_type?: OrgType;
      }
      | null;

    if (!body?.ein) {
      return jsonError("EIN is required", 400);
    }
    if (!body.district_entity_id) {
      return jsonError("district_entity_id is required", 400);
    }

    try {
      const scope = await addScopeNonprofit({
        district_entity_id: body.district_entity_id,
        ein: body.ein,
        label: body.label ?? null,
        tier: asTier(body.tier),
        status: asStatus(body.status),
        org_type: asOrgType(body.org_type),
      });

      return NextResponse.json(scope);
    } catch (err) {
      if (err instanceof DistrictFoundationConflictError) {
        return NextResponse.json(
          {
            error: "DISTRICT_FOUNDATION_CONFLICT",
            message: DISTRICT_FOUNDATION_ERROR,
            constraint: DISTRICT_FOUNDATION_CONSTRAINT,
            code: err.code,
          },
          { status: 409 },
        );
      }
      throw err;
    }
  });
}

export async function PATCH(req: Request) {
  return safeRoute(async () => {
    if (areAdminToolsDisabled()) {
      return jsonError("Admin routes are disabled.", 403);
    }

    const body = (await req.json().catch(() => null)) as
      | {
        district_entity_id?: string;
        ein?: string;
        label?: string | null;
        tier?: ScopeTier;
        status?: ScopeStatus;
        org_type?: OrgType;
      }
      | null;

    if (!body?.ein) {
      return jsonError("EIN is required", 400);
    }
    if (!body.district_entity_id) {
      return jsonError("district_entity_id is required", 400);
    }

    const tier = asTier(body.tier);
    const status = asStatus(body.status);
    const label = body.label;
    const orgType = asOrgType(body.org_type);

    if (!tier && !status && label === undefined && orgType === undefined) {
      return jsonError("No updates provided", 400);
    }

    try {
      const scope = await updateScopeNonprofit({
        district_entity_id: body.district_entity_id,
        ein: body.ein,
        tier,
        status,
        label,
        org_type: orgType,
      });

      return NextResponse.json(scope);
    } catch (err) {
      if (err instanceof DistrictFoundationConflictError) {
        return NextResponse.json(
          {
            error: "DISTRICT_FOUNDATION_CONFLICT",
            message: DISTRICT_FOUNDATION_ERROR,
            constraint: DISTRICT_FOUNDATION_CONSTRAINT,
            code: err.code,
          },
          { status: 409 },
        );
      }
      throw err;
    }
  });
}
