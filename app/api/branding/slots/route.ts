import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

export async function GET(req: NextRequest) {
  const supabase = await createApiClient();
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");

  if (!entityType) {
    return NextResponse.json(
      { error: "entityType is required" },
      { status: 400 }
    );
  }

  const { data: directSlots, error: slotsError } = await supabase
    .schema("branding")
    .from("asset_slots")
    .select("*")
    .eq("entity_type", entityType)
    .order("sort_order", { ascending: true });

  if (slotsError) {
    return NextResponse.json({ error: slotsError.message }, { status: 500 });
  }

  let slots = directSlots ?? [];

  if (
    slots.length === 0 &&
    (entityType === "business" || entityType === "nonprofit")
  ) {
    const { data: fallbackSlots, error: fallbackError } = await supabase
      .schema("branding")
      .from("asset_slots")
      .select("*")
      .eq("entity_type", "district")
      .order("sort_order", { ascending: true });

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }

    slots = (fallbackSlots ?? []).map((slot) => ({
      ...slot,
      entity_type: entityType,
    }));
  }

  const { data: categories, error: categoriesError } = await supabase
    .schema("branding")
    .from("asset_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (categoriesError) {
    return NextResponse.json(
      { error: categoriesError.message },
      { status: 500 }
    );
  }

  const { data: subcategories, error: subcategoriesError } = await supabase
    .schema("branding")
    .from("asset_subcategories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (subcategoriesError) {
    return NextResponse.json(
      { error: subcategoriesError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    slots,
    categories: categories ?? [],
    subcategories: subcategories ?? [],
  });
}
