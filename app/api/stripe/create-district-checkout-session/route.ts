import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

// This route creates a Stripe Checkout session for a district donation
export async function POST(req: Request) {
    // Expect JSON body with { districtId, anonymous? }
    let districtId: string | undefined;
    let anonymous: boolean | undefined;
    let amount: number;
    try {
        const body = await req.json();
        districtId = body.districtId;
        amount = body.amount;
        anonymous = body.anonymous;
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
    if (anonymous !== undefined && typeof anonymous !== "boolean") {
        return NextResponse.json({ error: "Invalid anonymous flag" }, {
            status: 400,
        });
    }
    const metadata: Record<string, string> = {};
    if (districtId !== undefined) {
        metadata.district_id = districtId;
    }
    if (anonymous !== undefined) {
        metadata.anonymous = anonymous.toString();
    }
    if (!anonymous) {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }
        metadata.user_id = user.id;
    }

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: anonymous
                            ? "District Donation (Anonymous)"
                            : "District Donation",
                    },
                    unit_amount: amount * 100,
                },
                quantity: 1,
            },
        ],
        metadata,
        invoice_creation: {
            enabled: true, // This ensures an invoice is generated for this session
        },
        success_url:
            `${process.env.NEXT_PUBLIC_HOST}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_HOST}/donate/cancel`,
    });

    return NextResponse.json({ id: session.id });
}
