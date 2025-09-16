import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

// This route creates a Stripe Checkout session for a district donation
export async function POST(req: Request) {
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Expect JSON body with { districtId }
    let districtId: string | undefined;
    try {
        const body = await req.json();
        districtId = body.districtId;
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, {
            status: 400,
        });
    }
    if (!districtId) {
        return NextResponse.json({ error: "Missing districtId" }, {
            status: 400,
        });
    }

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: { name: "District Donation" },
                    unit_amount: 2500, // $25.00
                },
                quantity: 1,
            },
        ],
        metadata: {
            district_id: districtId,
            user_id: user.id,
        },
        success_url:
            `${process.env.NEXT_PUBLIC_HOST}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_HOST}/donate/cancel`,
    });

    return NextResponse.json({ id: session.id });
}
