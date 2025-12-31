import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiClient } from "@/utils/supabase/route";
import { resolveDistrictEntityId } from "@/app/lib/entities";

type CategoryRow = {
    id: string;
    key?: string | null;
    label?: string | null;
};

type SubcategoryRow = {
    id: string;
    key?: string | null;
    label?: string | null;
    category_id?: string | null;
};

const uploadSchema = z.object({
    category: z.string().optional(),
    districtId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    logoId: z.string().optional(),
    subcategory: z.string().optional(),
});

const normalizeValue = (value: string) =>
    value.trim().toLowerCase().replace(/[\s-]+/g, "_");

const matchesValue = (value: string, rowValue?: string | null) =>
    rowValue ? normalizeValue(rowValue) === normalizeValue(value) : false;

const findCategory = (rows: CategoryRow[], value: string) =>
    rows.find((row) =>
        matchesValue(value, row.id) ||
        matchesValue(value, row.key) ||
        matchesValue(value, row.label)
    );

const findSubcategory = (
    rows: SubcategoryRow[],
    value: string,
    categoryId: string,
) => rows.find((row) =>
    (row.category_id ? row.category_id === categoryId : true) &&
    (matchesValue(value, row.id) ||
        matchesValue(value, row.key) ||
        matchesValue(value, row.label))
);

const sanitizeFilename = (name: string): string => {
    const trimmed = name.trim();
    return trimmed ? trimmed.replace(/[\\/]/g, "-") : "asset";
};

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const supabase = await createApiClient();
    const { id: districtId } = await context.params;
    const formData = await req.formData();

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const getString = (key: string) => {
        const value = formData.get(key);
        return typeof value === "string" ? value : undefined;
    };

    const rawLogoId = getString("logoId");
    const logoId = rawLogoId && rawLogoId.trim() ? rawLogoId.trim() : undefined;
    const parsed = uploadSchema.safeParse({
        category: getString("category"),
        districtId,
        name: getString("name"),
        description: getString("description"),
        logoId,
        subcategory: getString("subcategory"),
    });

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, {
            status: 400,
        });
    }

    const data = parsed.data;

    // Enforce RBAC: check if user has district admin privileges
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData.user.id;
    let entityId: string;
    try {
        entityId = await resolveDistrictEntityId(supabase, data.districtId);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Entity not found";
        return NextResponse.json({ error: message }, { status: 404 });
    }

    type RoleRow = {
        role: string;
        entities?:
            | { entity_type?: string | null }[]
            | { entity_type?: string | null }
            | null;
    };
    const { data: roleRows } = await supabase
        .from("entity_users")
        .select("entity_id, role, user_id, entities:entities ( entity_type )")
        .eq("entity_id", entityId)
        .eq("user_id", userId);

    const getEntityType = (row: RoleRow): string | null => {
        const entity = Array.isArray(row.entities)
            ? row.entities[0]
            : row.entities;
        return entity?.entity_type ?? null;
    };
    const rows = (roleRows ?? []) as RoleRow[];
    const isAdmin = rows.some((row) =>
        row.role === "admin" && getEntityType(row) === "district"
    );

    if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    type ExistingAsset = {
        id: string;
        entity_id: string;
        category_id?: string | null;
        subcategory_id?: string | null;
        path?: string | null;
    };

    let existingAsset: ExistingAsset | null = null;
    if (data.logoId) {
        const { data: assetRow, error: assetErr } = await supabase
            .schema("branding")
            .from("assets")
            .select("id, entity_id, category_id, subcategory_id, path")
            .eq("id", data.logoId)
            .maybeSingle();

        if (assetErr) {
            return NextResponse.json({ error: assetErr.message }, {
                status: 500,
            });
        }

        if (assetRow) {
            if (assetRow.entity_id !== entityId) {
                return NextResponse.json({ error: "Asset not found" }, {
                    status: 404,
                });
            }
            existingAsset = assetRow as ExistingAsset;
        }
    }

    const categoryInput = data.category?.trim() || existingAsset?.category_id ||
        "";
    if (!categoryInput) {
        return NextResponse.json({ error: "category is required" }, {
            status: 400,
        });
    }

    let categoryId = categoryInput;
    if (!existingAsset || categoryInput !== existingAsset.category_id) {
        const { data: categories, error: categoriesErr } = await supabase
            .schema("branding")
            .from("asset_categories")
            .select("id, key, label");

        if (categoriesErr) {
            return NextResponse.json({ error: categoriesErr.message }, {
                status: 500,
            });
        }

        const match = findCategory(
            (categories ?? []) as CategoryRow[],
            categoryInput,
        );
        if (!match) {
            return NextResponse.json({ error: "Unknown category" }, {
                status: 400,
            });
        }
        categoryId = match.id;
    }

    let subcategoryId: string | null = null;
    const subcategoryInput = data.subcategory?.trim() ||
        existingAsset?.subcategory_id || "";
    if (subcategoryInput) {
        if (
            existingAsset && subcategoryInput === existingAsset.subcategory_id
        ) {
            subcategoryId = existingAsset.subcategory_id ?? null;
        } else {
            const { data: subcategories, error: subcategoriesErr } =
                await supabase
                    .schema("branding")
                    .from("asset_subcategories")
                    .select("id, key, label, category_id");

            if (subcategoriesErr) {
                return NextResponse.json({ error: subcategoriesErr.message }, {
                    status: 500,
                });
            }

            const match = findSubcategory(
                (subcategories ?? []) as SubcategoryRow[],
                subcategoryInput,
                categoryId,
            );
            if (!match) {
                return NextResponse.json({ error: "Unknown subcategory" }, {
                    status: 400,
                });
            }
            subcategoryId = match.id;
        }
    }

    const assetId = data.logoId ?? randomUUID();
    const assetName = data.name?.trim() || file.name;
    const safeName = sanitizeFilename(file.name || assetName);
    const filePath = `${entityId}/${assetId}/${safeName}`;
    const bucket = "branding-assets";

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from(bucket).upload(
        filePath,
        uint8,
        {
            upsert: true,
            contentType: file.type,
        },
    );

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, {
            status: 500,
        });
    }

    let dbRow;
    try {
        const payload = {
            id: assetId,
            entity_id: entityId,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            name: assetName,
            path: filePath,
            mime_type: file.type || null,
            size_bytes: file.size,
            is_retired: false,
        };

        if (existingAsset) {
            const { data: updated, error: updErr } = await supabase
                .schema("branding")
                .from("assets")
                .update({
                    ...payload,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", assetId)
                .select("*")
                .single();

            if (updErr) throw updErr;
            dbRow = updated;
        } else {
            const { data: inserted, error: insErr } = await supabase
                .schema("branding")
                .from("assets")
                .insert(payload)
                .select("*")
                .single();

            if (insErr) throw insErr;
            dbRow = inserted;
        }

        const oldPath = existingAsset?.path ?? null;
        if (oldPath && oldPath !== filePath) {
            await supabase.storage.from(bucket).remove([oldPath]);
        }
    } catch (dbErr: unknown) {
        await supabase.storage.from(bucket).remove([filePath]);

        return NextResponse.json(
            {
                error: dbErr instanceof Error
                    ? dbErr.message
                    : "Database error while saving branding asset",
            },
            { status: 500 },
        );
    }

    return NextResponse.json({
        success: true,
        filePath,
        asset: dbRow,
        logo: dbRow,
    });
}
