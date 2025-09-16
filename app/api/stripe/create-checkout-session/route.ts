import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/utils/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

export async function POST() {
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: { name: "One-time General Donation" },
                    unit_amount: 2500, // $25.00
                },
                quantity: 1,
            },
        ],
        metadata: { user_id: user.id },
        success_url:
            `${process.env.NEXT_PUBLIC_HOST}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_HOST}/donate/cancel`,
    });

    return NextResponse.json({ id: session.id });
}
