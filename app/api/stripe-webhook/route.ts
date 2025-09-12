import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature")!;

    try {
        const event = stripe.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!,
        );

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log(
                "✅ Donation success:",
                session.id,
                session.amount_total,
            );
            if (session.mode === "subscription") {
                await supabase.from("subscriptions").insert({
                    subscription_id: session.subscription,
                    donor_email: session.customer_email,
                    amount: session.amount_total,
                    currency: session.currency,
                    status: "active",
                });
                await supabase.from("donations").insert({
                    amount: session.amount_total,
                    currency: session.currency,
                    donor_email: session.customer_email,
                    stripe_session_id: session.id,
                    type: "recurring-renewal",
                    subscription_id: session.subscription,
                });
            } else if (session.mode === "payment") {
                await supabase.from("donations").insert({
                    amount: session.amount_total,
                    currency: session.currency,
                    donor_email: session.customer_email,
                    stripe_session_id: session.id,
                    type: "one-time",
                });
            }
            console.log("✅ Donation recorded in Supabase:", session.id);
        }

        if (event.type === "invoice.payment_succeeded") {
            const invoice = event.data.object as Stripe.Invoice;

            // Get subscription from parent.subscription_details
            const subscriptionId =
                invoice.parent?.subscription_details?.subscription ?? null;

            await supabase.from("donations").insert({
                amount: invoice.amount_paid,
                currency: invoice.currency,
                donor_email: invoice.customer_email,
                stripe_session_id: invoice.id,
                type: "recurring-renewal",
                subscription_id: subscriptionId,
            });

            console.log(
                "✅ Recurring renewal recorded in Supabase:",
                invoice.id,
            );
        }

        if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object as Stripe.Subscription;
            await supabase.from("subscriptions").update({
                status: "canceled",
                canceled_at: new Date().toISOString(),
            }).eq("subscription_id", subscription.id);
            console.log(
                "⚠️ Subscription canceled recorded in Supabase:",
                subscription.id,
            );
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error("Webhook error:", err.message);
        return new NextResponse(`Webhook error: ${err.message}`, {
            status: 400,
        });
    }
}
