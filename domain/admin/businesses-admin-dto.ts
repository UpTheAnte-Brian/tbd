import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createApiClient } from "@/utils/supabase/route";
import type { Database } from "@/database.types";
import {
  DEFAULT_BRAND_COLORS,
  DEFAULT_BRAND_TYPOGRAPHY,
} from "@/app/lib/branding/resolveBranding";
import type {
  CreateBusinessRequest,
  CreateBusinessResponse,
} from "@/app/lib/types/business-admin";

function slugify(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\u0000-\u007F]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return cleaned || "business";
}

async function ensureUniqueSlug(
  supabase: SupabaseClient<Database>,
  baseSlug: string,
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;

  while (suffix < 20) {
    const { data, error } = await supabase
      .from("entities")
      .select("id")
      .eq("entity_type", "business")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!data?.id) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return `${baseSlug}-${Date.now()}`;
}

async function bestEffortCleanup(
  supabase: SupabaseClient<Database>,
  entityId: string | null,
) {
  if (!entityId) return;

  try {
    await supabase.from("businesses").delete().eq("entity_id", entityId);
  } catch (err) {
    console.error("Cleanup failed for business", err);
  }

  try {
    await supabase.from("entities").delete().eq("id", entityId);
  } catch (err) {
    console.error("Cleanup failed for entity", err);
  }
}

async function ensureDefaultBranding(
  supabase: SupabaseClient<Database>,
  entityId: string,
  entityName: string,
) {
  const paletteDefaults = [
    {
      role: "primary" as const,
      name: `${entityName} Primary`,
      colors: [
        DEFAULT_BRAND_COLORS.primary0,
        DEFAULT_BRAND_COLORS.primary1,
        DEFAULT_BRAND_COLORS.primary2,
      ],
    },
    {
      role: "secondary" as const,
      name: `${entityName} Secondary`,
      colors: [
        DEFAULT_BRAND_COLORS.secondary0,
        DEFAULT_BRAND_COLORS.secondary1,
        DEFAULT_BRAND_COLORS.secondary2,
      ],
    },
    {
      role: "accent" as const,
      name: `${entityName} Accent`,
      colors: [
        DEFAULT_BRAND_COLORS.accent0,
        DEFAULT_BRAND_COLORS.accent1,
        DEFAULT_BRAND_COLORS.accent2,
      ],
    },
  ];

  const typographyDefaults = [
    { role: "header1", font_name: DEFAULT_BRAND_TYPOGRAPHY.header1 },
    { role: "header2", font_name: DEFAULT_BRAND_TYPOGRAPHY.header2 },
    { role: "subheader", font_name: DEFAULT_BRAND_TYPOGRAPHY.subheader },
    { role: "body", font_name: DEFAULT_BRAND_TYPOGRAPHY.body },
    { role: "display", font_name: DEFAULT_BRAND_TYPOGRAPHY.display },
    { role: "logo", font_name: DEFAULT_BRAND_TYPOGRAPHY.logo },
  ] as const;

  const patternDefaults = [
    "none",
    "dots",
    "stripes",
    "grid",
    "chevrons",
    "waves",
  ] as const;

  for (const paletteDefault of paletteDefaults) {
    const { data: palette, error: paletteError } = await supabase
      .schema("branding")
      .from("palettes")
      .upsert(
        {
          entity_id: entityId,
          role: paletteDefault.role,
          name: paletteDefault.name,
        },
        { onConflict: "entity_id,role" },
      )
      .select("id")
      .single();

    if (paletteError || !palette?.id) {
      throw new Error(paletteError?.message ?? "Failed to seed palettes");
    }

    const paletteColors = paletteDefault.colors.map((hex, slot) => ({
      palette_id: palette.id,
      slot,
      hex,
    }));

    const { error: colorsError } = await supabase
      .schema("branding")
      .from("palette_colors")
      .upsert(paletteColors, { onConflict: "palette_id,slot" });

    if (colorsError) {
      throw new Error(colorsError.message);
    }
  }

  const { error: typographyError } = await supabase
    .schema("branding")
    .from("typography")
    .upsert(
      typographyDefaults.map((entry) => ({
        entity_id: entityId,
        role: entry.role,
        font_name: entry.font_name,
        availability: "system",
        weights: [],
        usage_rules: null,
      })),
      { onConflict: "entity_id,role" },
    );

  if (typographyError) {
    throw new Error(typographyError.message);
  }

  const { error: patternsError } = await supabase
    .schema("branding")
    .from("patterns")
    .upsert(
      patternDefaults.map((patternType) => ({
        entity_id: entityId,
        pattern_type: patternType,
        notes: null,
      })),
      { onConflict: "entity_id,pattern_type" },
    );

  if (patternsError) {
    throw new Error(patternsError.message);
  }
}

export async function createBusinessShell(
  request: CreateBusinessRequest,
): Promise<CreateBusinessResponse> {
  const supabase = await createApiClient();
  const name = request.name?.trim();
  const website = request.website?.trim() || null;
  const address = request.address?.trim() || null;
  const phoneNumber = request.phone_number?.trim() || null;
  const placeId = request.place_id?.trim() || null;
  const types = (request.types ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  const status = request.status?.trim() || "active";

  if (!name) {
    throw new Error("name is required");
  }

  if (status !== "pending" && status !== "active" && status !== "inactive") {
    throw new Error("status must be pending, active, or inactive");
  }

  if (placeId) {
    const { data: existingBusiness, error: existingBusinessError } =
      await supabase
        .from("businesses")
        .select("id, entity_id")
        .eq("place_id", placeId)
        .maybeSingle();

    if (existingBusinessError) {
      throw new Error(existingBusinessError.message);
    }

    if (existingBusiness?.entity_id) {
      const { data: existingEntity, error: existingEntityError } =
        await supabase
          .from("entities")
          .select("id, slug")
          .eq("id", existingBusiness.entity_id)
          .maybeSingle();

      if (existingEntityError) {
        throw new Error(existingEntityError.message);
      }

      return {
        entity_id: String(existingBusiness.entity_id),
        business_id: String(existingBusiness.id),
        slug: String(existingEntity?.slug ?? ""),
      };
    }
  }

  const slug = await ensureUniqueSlug(supabase, slugify(name));
  let entityId: string | null = null;

  try {
    const { data: entity, error: entityError } = await supabase
      .from("entities")
      .insert({
        entity_type: "business",
        name,
        slug,
        active: status === "active",
        external_ids: placeId ? { place_id: placeId } : {},
      })
      .select("id, slug")
      .single();

    if (entityError || !entity) {
      throw new Error(entityError?.message ?? "Failed to create entity");
    }

    entityId = String(entity.id);

    const payload: Database["public"]["Tables"]["businesses"]["Insert"] = {
      id: entityId,
      entity_id: entityId,
      place_id: placeId,
      name,
      address,
      phone_number: phoneNumber,
      website,
      types: types.length ? types : null,
      status,
    };

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert(payload)
      .select("id")
      .single();

    if (businessError || !business) {
      throw new Error(businessError?.message ?? "Failed to create business");
    }

    await ensureDefaultBranding(supabase, entityId, name);

    return {
      entity_id: entityId,
      business_id: String(business.id),
      slug: String(entity.slug ?? slug),
    };
  } catch (err) {
    await bestEffortCleanup(supabase, entityId);
    throw err instanceof Error ? err : new Error("Failed to create business");
  }
}
