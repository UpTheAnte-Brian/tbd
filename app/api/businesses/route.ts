import { NextResponse } from "next/server";
import { getBusinesses } from "@/domain/businesses/businesses-dto";

export async function GET() {
  try {
    const businesses = await getBusinesses();
    return NextResponse.json(businesses);
  } catch (err) {
    console.error("Error fetching businesses:", err);
    return NextResponse.json(
      { error: "Unable to fetch businesses" },
      { status: 500 },
    );
  }
}
