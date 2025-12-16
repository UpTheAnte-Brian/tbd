import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiClient } from "@/utils/supabase/route";
import { isEntityAdmin } from "@/app/lib/auth/entityRoles";
import {
    athleticsLogoPath,
    communityEdLogoPath,
    districtLogoPath,
    fontFilePath,
    patternFilePath,
    schoolLogoPath,
    teamLogoPath,
} from "@/app/lib/storage/brandingStoragePaths";

const uploadSchema = z.object({
    category: z.string().optional(),
    districtId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    schoolId: z.string().optional(),
    logoId: z.string().optional(),
    patternType: z.enum(["small", "large"]).optional(),
    fontId: z.string().optional(),
    subcategory: z.string().optional(),
});

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const supabase = await createApiClient();
    const { id: districtId } = await context.params;
    const formData = await req.formData();

    const file = formData.get("file") as File;
    if (!file) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const logoId = formData.get("logoId") ?? undefined;
    const name = formData.get("name") ?? undefined;

    const parsed = uploadSchema.safeParse({
        category: formData.get("category"),
        districtId,
        name: logoId ? name ?? undefined : name,
        description: formData.get("description") ?? undefined,
        schoolId: formData.get("schoolId") ?? undefined,
        logoId,
        patternType: formData.get("patternType") ?? undefined,
        fontId: formData.get("fontId") ?? undefined,
        subcategory: formData.get("subcategory") ?? undefined,
    });

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, {
            status: 400,
        });
    }

    let data = parsed.data;

    // If category not provided, try to derive from existing logo row
    if (!data.category && data.logoId) {
        const { data: existing, error: lookupErr } = await supabase
            .schema("branding")
            .from("logos")
            .select("category, subcategory")
            .eq("id", data.logoId)
            .eq("district_id", districtId)
            .maybeSingle();
        if (lookupErr) {
            return NextResponse.json({ error: lookupErr.message }, {
                status: 400,
            });
        }
        if (existing?.category) {
            data = { ...data, category: existing.category };
            if (!data.subcategory && existing.subcategory) {
                data.subcategory = existing.subcategory;
            }
        }
    }

    if (!data.category) {
        return NextResponse.json({ error: "category is required" }, {
            status: 400,
        });
    }

    // Enforce RBAC: check if user has district admin privileges
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData.user.id;

    const { data: roleRows } = await supabase
        .from("entity_users")
        .select("entity_type, entity_id, role, user_id")
        .eq("entity_type", "district")
        .eq("entity_id", data.districtId)
        .eq("user_id", userId);

    if (!isEntityAdmin(roleRows ?? [], "district", data.districtId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Compute file path
    let filePath: string;

    switch (data.category) {
        case "district_primary":
        case "district_secondary":
        case "icon":
            filePath = districtLogoPath(
                data.districtId,
                data.logoId ?? crypto.randomUUID(),
                file,
            );
            break;

        case "school_logo":
            if (!data.schoolId) {
                return NextResponse.json({ error: "schoolId required" }, {
                    status: 400,
                });
            }
            filePath = schoolLogoPath(
                data.districtId,
                data.schoolId,
                data.logoId ?? crypto.randomUUID(),
                file,
            );
            break;

        case "athletics_primary":
        case "athletics_icon":
        case "athletics_wordmark":
            filePath = athleticsLogoPath(
                data.districtId,
                data.logoId ?? crypto.randomUUID(),
                file,
            );
            break;

        case "community_ed":
            filePath = communityEdLogoPath(
                data.districtId,
                data.logoId ?? crypto.randomUUID(),
                file,
            );
            break;

        case "team_logo":
            if (!data.logoId) {
                return NextResponse.json(
                    { error: "logoId / team id required" },
                    { status: 400 },
                );
            }
            filePath = teamLogoPath(
                data.districtId,
                data.logoId,
                data.logoId,
                file,
            );
            break;

        case "brand_pattern":
            if (!data.patternType) {
                return NextResponse.json({ error: "patternType required" }, {
                    status: 400,
                });
            }
            filePath = patternFilePath(
                data.districtId,
                data.patternType as "small" | "large",
                data.logoId ?? crypto.randomUUID(),
                file,
            );
            break;

        case "font":
            filePath = fontFilePath(
                data.districtId,
                data.fontId ?? crypto.randomUUID(),
                file,
            );
            break;

        default:
            return NextResponse.json({ error: "Unknown category" }, {
                status: 400,
            });
    }

    // Upload file to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const bucket = data.category === "brand_pattern"
        ? "branding-patterns"
        : data.category === "font"
        ? "branding-fonts"
        : "branding-logos";

    // If updating, remove existing files with known extensions before upload
    if (data.logoId) {
        const existingFiles = [
            filePath.replace(/\.(png|jpg|jpeg|svg|eps)$/, ".png"),
            filePath.replace(/\.(png|jpg|jpeg|svg|eps)$/, ".jpg"),
            filePath.replace(/\.(png|jpg|jpeg|svg|eps)$/, ".jpeg"),
            filePath.replace(/\.(png|jpg|jpeg|svg|eps)$/, ".svg"),
            filePath.replace(/\.(png|jpg|jpeg|svg|eps)$/, ".eps"),
        ];
        await supabase.storage.from(bucket).remove(existingFiles);
    }

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

    // Insert or update DB row, with cleanup on failure
    let dbRow;
    try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";

        if (data.logoId) {
            // Update existing logo row
            const updateData: Record<string, string | null> = {
                description: data.description ?? null,
                file_png: ext === "png" ? filePath : null,
                file_jpg: ext === "jpg" || ext === "jpeg" ? filePath : null,
                file_svg: ext === "svg" ? filePath : null,
                file_eps: ext === "eps" ? filePath : null,
            };
            updateData.updated_at = new Date().toISOString();
            if (data.name) {
                updateData.name = data.name;
            }
            if (data.subcategory) {
                updateData.subcategory = data.subcategory;
            }

            const { data: updated, error: updErr } = await supabase
                .schema("branding")
                .from("logos")
                .update(updateData)
                .eq("id", data.logoId)
                .eq("district_id", data.districtId)
                .select("*, updated_at")
                .single();

            if (updErr) throw updErr;
            dbRow = updated;
        } else {
            // Create new logo row
            const { data: inserted, error: insErr } = await supabase
                .schema("branding")
                .from("logos")
                .insert({
                    district_id: data.districtId,
                    school_id: data.schoolId ?? null,
                    category: data.category,
                    subcategory: data.subcategory ?? "other",
                    name: data.name,
                    description: data.description,
                    file_png: ext === "png" ? filePath : null,
                    file_jpg: ext === "jpg" || ext === "jpeg" ? filePath : null,
                    file_svg: ext === "svg" ? filePath : null,
                    file_eps: ext === "eps" ? filePath : null,
                })
                .select("*")
                .single();

            if (insErr) throw insErr;
            dbRow = inserted;
        }
    } catch (dbErr: unknown) {
        // If DB write fails, remove the uploaded file so storage and DB stay in sync
        await supabase.storage.from(bucket).remove([filePath]);

        return NextResponse.json(
            {
                error: dbErr instanceof Error
                    ? dbErr.message
                    : "Database error while saving branding logo",
            },
            { status: 500 },
        );
    }

    return NextResponse.json({
        success: true,
        filePath,
        logo: dbRow,
    });
}
