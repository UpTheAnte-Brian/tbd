import type { SupabaseClient } from "@supabase/supabase-js";
import type { Geometry } from "geojson";
import type { PaletteVM } from "@/app/lib/branding/paletteTypes";
import type { BrandingSummary } from "@/app/lib/types/types";
import type {
  EntityUser,
  EntityUserRole,
  ProfilePreview,
} from "@/domain/entities/types";
import type {
  EntityFeature,
  EntityFeatureCollection,
  EntityMapProperties,
} from "@/app/lib/types/map";

type EntityRecord = {
  id: string;
  entity_type: string | null;
  slug: string | null;
  name: string | null;
  active: boolean | null;
};

const PROFILE_FIELDS =
  "id, full_name, username, first_name, last_name, avatar_url, website";

function mapProfile(profileRaw: unknown): ProfilePreview | null {
  if (!profileRaw) return null;
  const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
  if (!profile || typeof profile !== "object") return null;

  const {
    id,
    full_name = null,
    username = null,
    first_name = null,
    last_name = null,
    avatar_url = null,
    website = null,
  } = profile as {
    id?: string;
    full_name?: string | null;
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    website?: string | null;
  };

  if (!id) return null;

  return {
    id: String(id),
    full_name,
    username,
    first_name,
    last_name,
    avatar_url,
    website,
    entity_users: undefined,
  };
}

function mapEntityUser(row: Record<string, unknown>): EntityUser | null {
  if (!row.id || !row.entity_id || !row.user_id) return null;
  const entityRaw = row.entities as
    | { entity_type?: string | null }
    | { entity_type?: string | null }[]
    | null
    | undefined;
  const entity = Array.isArray(entityRaw) ? entityRaw[0] : entityRaw;

  return {
    id: String(row.id),
    entity_id: String(row.entity_id),
    user_id: String(row.user_id),
    role: (row.role as EntityUserRole) ?? "viewer",
    status: (row.status as EntityUser["status"]) ?? null,
    created_at: (row.created_at as string | null | undefined) ?? null,
    updated_at: (row.updated_at as string | null | undefined) ?? null,
    entity_type: (entity?.entity_type as EntityUser["entity_type"]) ?? undefined,
    profile: mapProfile(row.profile),
  };
}

export async function getEntityById(
  supabase: SupabaseClient,
  entityId: string
): Promise<EntityRecord | null> {
  const { data, error } = await supabase
    .from("entities")
    .select("id, entity_type, slug, name, active")
    .eq("id", entityId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch entity: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: String(data.id),
    entity_type: (data.entity_type as string | null) ?? null,
    slug: (data.slug as string | null) ?? null,
    name: (data.name as string | null) ?? null,
    active: (data.active as boolean | null) ?? null,
  };
}

export async function getEntityBrandingSummary(
  supabase: SupabaseClient,
  entityId: string
): Promise<BrandingSummary> {
  const logos: BrandingSummary["logos"] = [];

  const { data: patterns, error: patternsErr } = await supabase
    .schema("branding")
    .from("patterns")
    .select("*")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (patternsErr) {
    throw new Error(`Failed to fetch patterns: ${patternsErr.message}`);
  }

  const { data: palettesRaw, error: palettesErr } = await supabase
    .schema("branding")
    .from("palettes")
    .select(
      `
        id,
        entity_id,
        role,
        name,
        usage_notes,
        created_at,
        updated_at,
        palette_colors (
          id,
          slot,
          hex,
          label,
          usage_notes
        )
      `
    )
    .eq("entity_id", entityId)
    .order("role", { ascending: true })
    .order("slot", { foreignTable: "palette_colors", ascending: true });
  if (palettesErr) {
    throw new Error(`Failed to fetch palettes: ${palettesErr.message}`);
  }

  const palettes: PaletteVM[] = (palettesRaw ?? []).map((palette) => ({
    id: String(palette.id),
    entity_id: String(palette.entity_id),
    role: palette.role,
    name: palette.name ?? palette.role ?? "",
    usage_notes: palette.usage_notes ?? null,
    created_at: palette.created_at ?? null,
    updated_at: palette.updated_at ?? null,
    colors: Array.isArray(palette.palette_colors)
      ? palette.palette_colors
          .map((color) => ({
            id: color.id ?? undefined,
            slot: Number(color.slot ?? 0),
            hex: String(color.hex ?? ""),
            label: color.label ?? null,
            usage_notes: color.usage_notes ?? null,
          }))
          .sort((a, b) => a.slot - b.slot)
      : [],
  }));

  const { data: typography, error: typographyErr } = await supabase
    .schema("branding")
    .from("typography")
    .select("*")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });
  if (typographyErr) {
    throw new Error(`Failed to fetch typography: ${typographyErr.message}`);
  }

  const fonts = typography ?? [];

  return {
    logos,
    patterns: patterns ?? [],
    fonts,
    palettes,
    typography: typography ?? [],
  };
}

export async function getEntityUsers(
  supabase: SupabaseClient,
  entityId: string
): Promise<EntityUser[]> {
  const { data, error } = await supabase
    .from("entity_users")
    .select(
      `
        id, entity_id, user_id, role, status, created_at,
        entities:entities ( entity_type ),
        profile:profiles ( ${PROFILE_FIELDS} )
      `
    )
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch entity users: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => mapEntityUser(row as Record<string, unknown>))
    .filter((row): row is EntityUser => Boolean(row));
}

export async function upsertEntityUser(
  supabase: SupabaseClient,
  entityId: string,
  userId: string,
  role: EntityUserRole,
  status?: EntityUser["status"]
): Promise<EntityUser> {
  const { data, error } = await supabase
    .from("entity_users")
    .upsert(
      {
        entity_id: entityId,
        user_id: userId,
        role,
        status: status ?? null,
      },
      { onConflict: "entity_id,user_id" }
    )
    .select(
      `
        id, entity_id, user_id, role, status, created_at,
        entities:entities ( entity_type ),
        profile:profiles ( ${PROFILE_FIELDS} )
      `
    )
    .single();

  if (error) {
    throw new Error(`Failed to upsert entity user: ${error.message}`);
  }

  const mapped = mapEntityUser(data as Record<string, unknown>);
  if (!mapped) {
    throw new Error("Failed to map entity user");
  }

  return mapped;
}

export async function deleteEntityUser(
  supabase: SupabaseClient,
  entityId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("entity_users")
    .delete()
    .eq("entity_id", entityId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete entity user: ${error.message}`);
  }
}

export async function getEntityMapFeatureCollection(
  supabase: SupabaseClient,
  entityId: string,
  geometryType = "boundary_simplified"
): Promise<EntityFeatureCollection> {
  const entity = await getEntityById(supabase, entityId);
  if (!entity) {
    return { type: "FeatureCollection", features: [] };
  }

  const { data: geomRows, error: geomError } = await supabase
    .from("entity_geometries_geojson")
    .select("entity_id, geometry_type, geojson")
    .eq("entity_id", entityId)
    .eq("geometry_type", geometryType)
    .limit(1);

  if (geomError) {
    throw new Error(`Failed to fetch entity geometry: ${geomError.message}`);
  }

  const geometry = geomRows?.[0]?.geojson as Geometry | undefined;
  const requirePolygon =
    geometryType === "boundary" || geometryType === "boundary_simplified";

  if (!geometry) {
    return { type: "FeatureCollection", features: [] };
  }

  if (
    requirePolygon &&
    geometry.type !== "Polygon" &&
    geometry.type !== "MultiPolygon"
  ) {
    return { type: "FeatureCollection", features: [] };
  }

  const props: EntityMapProperties = {
    entity_id: entity.id,
    entity_type: entity.entity_type ?? "",
    slug: entity.slug ?? null,
    name: entity.name ?? null,
    active: entity.active ?? true,
    child_count: 0,
  };

  const feature: EntityFeature = {
    type: "Feature",
    id: entity.id,
    properties: props,
    geometry,
  };

  return {
    type: "FeatureCollection",
    features: [feature],
  };
}
