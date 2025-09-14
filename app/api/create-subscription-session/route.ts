import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

export async function POST() {
    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
            {
                price: process.env.STRIPE_MONTHLY_DONATION_PRICE_ID!, // from Stripe dashboard
                quantity: 1,
            },
        ],
        success_url: `${process.env.NEXT_PUBLIC_HOST}/donate/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_HOST}/donate/cancel`,
    });

    return NextResponse.json({ id: session.id });
}
