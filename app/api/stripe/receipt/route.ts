import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2025-08-27.basil",
});

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
        return NextResponse.json({ error: "Missing session_id" }, {
            status: 400,
        });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["payment_intent"],
        });

        return NextResponse.json({
            id: session.id,
            amount: session.amount_total,
            date: new Date(session.created * 1000).toLocaleString(),
        });
    } catch (err) {
        console.error("Error retrieving session:", err);
        return NextResponse.json(
            { error: "Unable to retrieve receipt" },
            { status: 500 },
        );
    }
}
