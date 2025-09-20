import { getReceiptBySessionId } from "@/app/data/receipt-dto";
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

        const receipt = await getReceiptBySessionId(sessionId);

        const result: any = {
            id: session.id,
            amount: session.amount_total,
            date: new Date(session.created * 1000).toLocaleString(),
        };
        if (receipt) {
            result.receipt_url = receipt.receipt_url;
            result.subscription_id = receipt.subscription_id;
            result.invoice_id = receipt.invoice_id;
            result.district_name = receipt.district_name;
            result.user_id = receipt.user_id;
            result.type = receipt.type;
        }
        return NextResponse.json(result);
    } catch (err) {
        console.error("Error retrieving session:", err);
        return NextResponse.json(
            { error: "Unable to retrieve receipt" },
            { status: 500 },
        );
    }
}
