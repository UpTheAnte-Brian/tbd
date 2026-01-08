import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createApiClient } from "@/utils/supabase/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) { // Expect JSON body with { districtId, anonymous? }
    let districtId: string | undefined;
    let anonymous: boolean | undefined;
    let amount: number;
    let interval: string;
    try {
        const body = await req.json();
        districtId = body.districtId || undefined;
        anonymous = body.anonymous;
        amount = body.amount;
        interval = body.interval;
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, {
            status: 400,
        });
    }
    if (anonymous !== undefined && typeof anonymous !== "boolean") {
        return NextResponse.json({ error: "Invalid anonymous flag" }, {
            status: 400,
        });
    }
    const metadata: Record<string, string> = {
        interval,
    };
    if (districtId !== undefined) {
        metadata.district_id = districtId;
    }
    if (anonymous !== undefined) {
        metadata.anonymous = anonymous.toString();
    }
    if (!anonymous) {
        const supabase = await createApiClient();
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
    const allowedIntervals = ["day", "week", "month", "year"] as const;
    type StripeInterval = (typeof allowedIntervals)[number];

    // Validate interval
    if (!allowedIntervals.includes(interval as StripeInterval)) {
        return NextResponse.json({ error: "Invalid interval" }, {
            status: 400,
        });
    }
    const productName = anonymous
        ? (districtId
            ? "District Donation (Anonymous)"
            : "Up The Ante Donation (Anonymous)")
        : (districtId ? "District Donation" : "Up The Ante Donation");

    const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.NEXT_PUBLIC_HOST; // TODO: remove NEXT_PUBLIC_HOST fallback after migration

    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: productName,
                    },
                    unit_amount: amount * 100,
                    recurring: { interval: interval as StripeInterval },
                },
                quantity: 1,
            },
        ],
        metadata,
        success_url:
            `${baseUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/donate/cancel`,
    });

    return NextResponse.json({ id: session.id });
}
