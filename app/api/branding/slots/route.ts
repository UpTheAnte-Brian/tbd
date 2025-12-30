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

  const { data: slots, error: slotsError } = await supabase
    .schema("branding")
    .from("asset_slots")
    .select("*")
    .eq("entity_type", entityType)
    .order("sort_order", { ascending: true });

  if (slotsError) {
    return NextResponse.json({ error: slotsError.message }, { status: 500 });
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
    slots: slots ?? [],
    categories: categories ?? [],
    subcategories: subcategories ?? [],
  });
}
