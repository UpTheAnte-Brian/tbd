import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

export async function POST() {
    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: { name: "One-time Donation" },
                    unit_amount: 2500, // $25.00
                },
                quantity: 1,
            },
        ],
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/donate/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/donate/cancel`,
    });

    return NextResponse.json({ id: session.id });
}
