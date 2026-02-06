import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Env
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
        "Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
}

// Parse entity id: --entity <uuid> OR ENTITY_ID
function getEntityId(): string {
    const argv = process.argv;
    const idx = argv.indexOf("--entity");
    if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
    if (process.env.ENTITY_ID) return process.env.ENTITY_ID;
    throw new Error(
        "Missing entity_id. Pass --entity <uuid> or set ENTITY_ID env var.",
    );
}

const entityId = getEntityId();

// Supabase client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

const branding = supabase.schema("branding");

// Seed data (3 colors per role)
const PALETTES: Array<{
    role: "primary" | "secondary" | "accent";
    name: string;
    colors: Array<{ slot: 0 | 1 | 2; hex: string; label: string }>;
}> = [
    {
        role: "primary",
        name: "Primary Palette",
        colors: [
            { slot: 0, hex: "#da2b1f", label: "Primary 0" },
            { slot: 1, hex: "#ffffff", label: "Primary 1" },
            { slot: 2, hex: "#b51f17", label: "Primary 2" },
        ],
    },
    {
        role: "secondary",
        name: "Secondary Palette",
        colors: [
            { slot: 0, hex: "#50534c", label: "Secondary 0" },
            { slot: 1, hex: "#2c2a29", label: "Secondary 1" },
            { slot: 2, hex: "#a7a9b4", label: "Secondary 2" },
        ],
    },
    {
        role: "accent",
        name: "Accent Palette",
        colors: [
            { slot: 0, hex: "#94292e", label: "Accent 0" },
            { slot: 1, hex: "#ff3a1e", label: "Accent 1" },
            { slot: 2, hex: "#6d3235", label: "Accent 2" },
        ],
    },
];

const TYPOGRAPHY_ROLES: Array<
    "header1" | "header2" | "subheader" | "body" | "logo" | "display"
> = ["header1", "header2", "subheader", "body", "logo", "display"];

const PATTERN_TYPES: Array<
    "none" | "dots" | "stripes" | "grid" | "chevrons" | "waves"
> = ["none", "dots", "stripes", "grid", "chevrons", "waves"];

const ASSET_CATEGORIES: Array<
    { key: string; label: string; description: string }
> = [
    { key: "logo", label: "Logos", description: "Official logos and marks" },
    { key: "brand", label: "Brand", description: "Brand patterns and assets" },
    { key: "photo", label: "Photos", description: "Photography and imagery" },
    { key: "doc", label: "Docs", description: "Brand documents" },
];

const ASSET_SUBCATEGORIES: Array<
    { category_key: string; key: string; label: string }
> = [
    {
        category_key: "logo",
        key: "primary_stacked",
        label: "Primary Stacked Logo",
    },
    {
        category_key: "logo",
        key: "primary_horizontal",
        label: "Primary Horizontal Logo",
    },
    {
        category_key: "logo",
        key: "secondary_stacked_white",
        label: "Secondary Stacked White Logo",
    },
    {
        category_key: "logo",
        key: "secondary_horizontal_white",
        label: "Secondary Horizontal White Logo",
    },
    {
        category_key: "logo",
        key: "secondary_stacked_black",
        label: "Secondary Stacked Black Logo",
    },
    {
        category_key: "logo",
        key: "secondary_stacked_inverse",
        label: "Secondary Stacked Inverse Logo",
    },
    { category_key: "logo", key: "icon_shield_red", label: "Icon Shield Red" },
    {
        category_key: "logo",
        key: "icon_shield_white",
        label: "Icon Shield White",
    },
    {
        category_key: "logo",
        key: "school_hilltop_stacked",
        label: "Hilltop School Stacked Logo",
    },
    {
        category_key: "logo",
        key: "school_shirley_hills_stacked",
        label: "Shirley Hills School Stacked Logo",
    },
    {
        category_key: "logo",
        key: "school_middle_school_stacked",
        label: "Middle School Stacked Logo",
    },
    {
        category_key: "logo",
        key: "school_high_school_stacked",
        label: "High School Stacked Logo",
    },
    {
        category_key: "logo",
        key: "community_ed_stacked",
        label: "Community Ed Stacked Logo",
    },
    {
        category_key: "logo",
        key: "athletics_primary_full_color",
        label: "Athletics Primary Full Color",
    },
    {
        category_key: "logo",
        key: "athletics_primary_one_color_white",
        label: "Athletics Primary One Color White",
    },
    {
        category_key: "logo",
        key: "athletics_primary_inverse",
        label: "Athletics Primary Inverse",
    },
    { category_key: "brand", key: "pattern", label: "Pattern" },
];

const WESTONKA_ASSETS: Array<{
    subcategory_key: string;
    name: string; // canonical human name (no district prefix)
    path: string;
    bucket: string;
    mime_type: string;
    description: string | null;
}> = [
    {
        subcategory_key: "primary_stacked",
        name: "Stacked Primary",
        path: "westonka/westonka_stacked_primary.svg",
        bucket: "branding-assets",
        mime_type: "image/svg+xml",
        description: null,
    },
    {
        subcategory_key: "primary_horizontal",
        name: "Horizontal Primary",
        path: "westonka/westonka_horiz_primary.svg",
        bucket: "branding-assets",
        mime_type: "image/svg+xml",
        description: null,
    },
    {
        subcategory_key: "secondary_stacked_white",
        name: "Stacked Secondary White",
        path: "westonka/westonka_stacked_white.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
    {
        subcategory_key: "secondary_horizontal_white",
        name: "Horizontal Secondary White",
        path: "westonka/westonka_horiz_white.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
    {
        subcategory_key: "secondary_stacked_black",
        name: "Stacked Secondary Black",
        path: "westonka/westonka_stacked_black.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
    {
        subcategory_key: "secondary_stacked_inverse",
        name: "Stacked Secondary Inverse",
        path: "westonka/westonka_stacked_inverse.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
    {
        subcategory_key: "icon_shield_red",
        name: "Shield Icon Red",
        path: "westonka/westonka_shield_red.svg",
        bucket: "branding-assets",
        mime_type: "image/svg+xml",
        description: null,
    },
    {
        subcategory_key: "icon_shield_white",
        name: "Shield Icon White",
        path: "westonka/westonka_shield_white.svg",
        bucket: "branding-assets",
        mime_type: "image/svg+xml",
        description: null,
    },
    {
        subcategory_key: "school_hilltop_stacked",
        name: "Hilltop Stacked",
        path: "westonka/hilltop_primary_stacked.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
    {
        subcategory_key: "school_shirley_hills_stacked",
        name: "Shirley Hills Stacked",
        path: "westonka/shirley_hills_primary_stacked.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
    {
        subcategory_key: "school_middle_school_stacked",
        name: "Middle School Stacked",
        path: "westonka/middle_school_stacked.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
    {
        subcategory_key: "school_high_school_stacked",
        name: "High School Stacked",
        path: "westonka/high_school_stacked.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
    {
        subcategory_key: "community_ed_stacked",
        name: "Community Ed Stacked",
        path: "westonka/community_ed_stacked.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
    {
        subcategory_key: "athletics_primary_full_color",
        name: "Athletics Primary Full Color",
        path: "westonka/white_hawks_primary.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
    {
        subcategory_key: "athletics_primary_one_color_white",
        name: "Athletics Primary One Color White",
        path: "westonka/white_hawks_primary_white_text.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
    {
        subcategory_key: "athletics_primary_inverse",
        name: "Athletics Primary Inverse",
        path: "westonka/white_hawks_inverse.png",
        bucket: "branding-assets",
        mime_type: "image/png",
        description: null,
    },
];

function assertOk<T>(res: { data: T | null; error: any }, msg: string): T {
    if (res.error) {
        throw new Error(`${msg}: ${res.error.message ?? String(res.error)}`);
    }
    if (res.data === null) throw new Error(`${msg}: no data returned`);
    return res.data;
}

async function upsertPalettesAndColors() {
    console.log("Seeding palettes + palette_colors (3 slots per role)...");

    // Upsert palettes
    const paletteUpserts = PALETTES.map((p) => ({
        entity_id: entityId,
        role: p.role,
        name: p.name,
    }));

    const paletteRows = assertOk(
        await branding
            .from("palettes")
            .upsert(paletteUpserts as any, { onConflict: "entity_id,role" })
            .select("id,role"),
        "Upsert palettes",
    );

    // Build role -> palette_id map
    const paletteIdByRole = new Map<string, string>();
    for (const r of paletteRows as any[]) {
        paletteIdByRole.set(r.role, r.id);
    }

    for (const p of PALETTES) {
        const paletteId = paletteIdByRole.get(p.role);
        if (!paletteId) {
            throw new Error(`Missing palette id for role: ${p.role}`);
        }

        const colorUpserts = p.colors.map((c) => ({
            palette_id: paletteId,
            slot: c.slot,
            hex: c.hex,
            label: c.label,
        }));

        assertOk(
            await branding
                .from("palette_colors")
                .upsert(colorUpserts as any, { onConflict: "palette_id,slot" })
                .select("palette_id,slot"),
            `Upsert palette_colors for ${p.role}`,
        );
    }

    console.log("  ✔ palettes + palette_colors");
}

async function upsertTypography() {
    console.log("Seeding typography...");

    const rows = TYPOGRAPHY_ROLES.map((role) => ({
        entity_id: entityId,
        role,
        font_name: "Inter",
        availability: "google",
        weights: [400, 500, 600, 700],
        usage_rules: role === "body" ? "Default body" : null,
    }));

    assertOk(
        await branding
            .from("typography")
            .upsert(rows as any, { onConflict: "entity_id,role" })
            .select("entity_id,role"),
        "Upsert typography",
    );

    console.log("  ✔ typography");
}

async function upsertPatterns() {
    console.log("Seeding patterns...");

    const rows = PATTERN_TYPES.map((pattern_type) => ({
        entity_id: entityId,
        pattern_type,
        notes: pattern_type === "none" ? "No pattern" : null,
    }));

    assertOk(
        await branding
            .from("patterns")
            .upsert(rows as any, { onConflict: "entity_id,pattern_type" })
            .select("entity_id,pattern_type"),
        "Upsert patterns",
    );

    console.log("  ✔ patterns");
}

async function upsertAssetTaxonomyGlobal() {
    console.log("Seeding asset taxonomy (global)...");

    // Categories
    assertOk(
        await branding
            .from("asset_categories")
            .upsert(ASSET_CATEGORIES as any, { onConflict: "key" })
            .select("id,key"),
        "Upsert asset_categories",
    );

    const catRows = assertOk(
        await branding.from("asset_categories").select("id,key"),
        "Select asset_categories",
    );

    const catIdByKey = new Map<string, string>();
    for (const c of catRows as any[]) {
        catIdByKey.set(c.key, c.id);
    }

    const subRows = ASSET_SUBCATEGORIES.map((s) => {
        const category_id = catIdByKey.get(s.category_key);
        if (!category_id) {
            throw new Error(
                `Missing asset_category for key: ${s.category_key}`,
            );
        }
        return {
            category_id,
            key: s.key,
            label: s.label,
        };
    });

    assertOk(
        await branding
            .from("asset_subcategories")
            .upsert(subRows as any, { onConflict: "category_id,key" })
            .select("category_id,key"),
        "Upsert asset_subcategories",
    );

    console.log("  ✔ asset taxonomy");
}

async function upsertRowBySelect(
    table: string,
    selectWhere: Record<string, any>,
    insertData: Record<string, any>,
    updateData: Record<string, any>,
) {
    // Compose select query with exact match on keys
    const query = branding.from(table).select("*");
    for (const [k, v] of Object.entries(selectWhere)) {
        query.eq(k, v);
    }
    if (table === "assets") {
        // For assets, only select non-retired assets
        query.eq("is_retired", false);
    }
    const { data, error } = await query.limit(1).single();

    if (error && error.code !== "PGRST116") {
        // PGRST116: No rows found, treat as null data
        throw new Error(`Select error on ${table}: ${error.message ?? error}`);
    }

    if (data) {
        // Update
        const { error: updateError } = await branding
            .from(table)
            .update(updateData)
            .eq("id", data.id);
        if (updateError) {
            throw new Error(
                `Update error on ${table}: ${
                    updateError.message ?? updateError
                }`,
            );
        }
        return data.id;
    } else {
        // Insert
        const { data: inserted, error: insertError } = await branding
            .from(table)
            .insert([insertData])
            .select("id")
            .limit(1)
            .single();
        if (insertError) {
            throw new Error(
                `Insert error on ${table}: ${
                    insertError.message ?? insertError
                }`,
            );
        }
        return inserted.id;
    }
}

async function upsertAssetSlotsAndAssets() {
    console.log("Seeding asset slots and assets for district entity...");

    // Load categories and subcategories
    const catRows = assertOk(
        await branding.from("asset_categories").select("id,key"),
        "Select asset_categories for asset slots/assets",
    );
    const subRows = assertOk(
        await branding.from("asset_subcategories").select(
            "id,key,label,category_id",
        ),
        "Select asset_subcategories for asset slots/assets",
    );

    const catIdByKey = new Map<string, string>();
    for (const c of catRows as any[]) {
        catIdByKey.set(c.key, c.id);
    }
    const subByKey = new Map<
        string,
        { id: string; label: string; category_id: string }
    >();
    for (const s of subRows as any[]) {
        subByKey.set(s.key, {
            id: s.id,
            label: s.label,
            category_id: s.category_id,
        });
    }

    // Ensure all logo subcategories exist
    for (
        const subcategory of ASSET_SUBCATEGORIES.filter((s) =>
            s.category_key === "logo"
        )
    ) {
        if (!subByKey.has(subcategory.key)) {
            throw new Error(
                `Missing logo asset_subcategory key: ${subcategory.key}`,
            );
        }
    }

    const logoCategoryId = catIdByKey.get("logo");
    if (!logoCategoryId) {
        throw new Error("Missing logo category id");
    }

    // Upsert asset_slots for entity_type 'district' and category_id for 'logo'
    let sortOrder = 10;
    for (
        const subcategoryKey of ASSET_SUBCATEGORIES.filter((s) =>
            s.category_key === "logo"
        ).map((s) => s.key)
    ) {
        const sub = subByKey.get(subcategoryKey);
        if (!sub) continue;
        const insertData = {
            entity_type: "district",
            category_id: logoCategoryId,
            subcategory_id: sub.id,
            label_override: sub.label,
            help_text: "Upload an asset for this slot.",
            sort_order: sortOrder,
            is_required: false,
            max_assets: 1,
            allowed_mime_types: ["image/png", "image/svg+xml"],
            active: true,
        };
        const updateData = {
            label_override: sub.label,
            help_text: "Upload an asset for this slot.",
            sort_order: sortOrder,
            is_required: false,
            max_assets: 1,
            allowed_mime_types: ["image/png", "image/svg+xml"],
            active: true,
        };
        await upsertRowBySelect(
            "asset_slots",
            {
                entity_type: "district",
                category_id: logoCategoryId,
                subcategory_id: sub.id,
            },
            insertData,
            updateData,
        );
        sortOrder += 10;
    }

    // Upsert assets for provided entityId with WESTONKA_ASSETS
    for (const asset of WESTONKA_ASSETS) {
        const sub = subByKey.get(asset.subcategory_key);
        if (!sub) {
            throw new Error(
                `Missing subcategory for asset key: ${asset.subcategory_key}`,
            );
        }
        const insertData = {
            entity_id: entityId,
            category_id: logoCategoryId,
            subcategory_id: sub.id,
            name: `Westonka ${asset.name}`,
            path: asset.path,
            bucket: asset.bucket,
            mime_type: asset.mime_type,
            description: asset.description,
            is_retired: false,
        };

        const updateData = {
            name: `Westonka ${asset.name}`,
            path: asset.path,
            bucket: asset.bucket,
            mime_type: asset.mime_type,
            description: asset.description,
            is_retired: false,
        };
        await upsertRowBySelect(
            "assets",
            {
                entity_id: entityId,
                category_id: logoCategoryId,
                subcategory_id: sub.id,
            },
            insertData,
            updateData,
        );
    }

    console.log("  ✔ asset slots and assets");
}

async function main() {
    console.log(`Branding seed (TS) → entity_id=${entityId}`);

    await upsertPalettesAndColors();
    await upsertTypography();
    await upsertPatterns();
    await upsertAssetTaxonomyGlobal();
    await upsertAssetSlotsAndAssets();

    console.log("✅ Branding seed complete");
}

main().catch((err) => {
    console.error("❌ Branding seed failed:", err);
    process.exit(1);
});
