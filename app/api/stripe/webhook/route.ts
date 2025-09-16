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

            const districtId = session.metadata?.district_id || null;
            const userId = session.metadata?.user_id || null;

            const email = await getEmail(session);
            console.log("email: ", email);
            if (session.mode === "subscription") {
                const { error: subError } = await supabase.from("subscriptions")
                    .insert({
                        subscription_id: session.subscription,
                        email: email,
                        amount: session.amount_total,
                        status: "active",
                        user_id: userId,
                        district_id: districtId,
                    });
                if (subError) {
                    console.error("Error inserting subscription:", subError);
                }

                const { error: donationError } = await supabase.from(
                    "donations",
                ).insert({
                    amount: session.amount_total,
                    email: email,
                    stripe_session_id: session.id,
                    type: "platform",
                    subscription_id: session.subscription,
                    user_id: userId,
                    district_id: districtId,
                });
                if (donationError) {
                    console.error("Error inserting donation:", donationError);
                }
            } else if (session.mode === "payment") {
                const { error: donationError } = await supabase.from(
                    "donations",
                ).insert({
                    amount: session.amount_total,
                    email: email,
                    stripe_session_id: session.id,
                    district_id: districtId,
                    type: districtId ? "district" : "platform",
                    user_id: userId,
                });
                if (donationError) {
                    console.error("Error inserting donation:", donationError);
                }
            }
            console.log("✅ Donation recorded in Supabase:", session.id);
        }

        if (event.type === "invoice.payment_succeeded") {
            const invoice = event.data.object as Stripe.Invoice;
            const email = await getEmail(invoice);
            // Get subscription from parent.subscription_details
            const subscriptionId =
                invoice.parent?.subscription_details?.subscription ?? null;
            // Only insert if this is NOT the first invoice from checkout.session.completed
            if (invoice.billing_reason === "subscription_create") {
                // Skip: first payment already handled in checkout.session.completed
                console.log(
                    "⚠️ Skipping initial subscription payment; already recorded in checkout.session.completed",
                );
            } else {
                // Fetch districtId from Supabase using subscription_id
                const { data: subscriptionData, error: subError } =
                    await supabase
                        .from("subscriptions")
                        .select("district_id, user_id")
                        .eq("subscription_id", subscriptionId)
                        .single();

                if (subError) {
                    console.error(
                        "Error fetching subscription metadata:",
                        subError,
                    );
                }

                const districtId = subscriptionData?.district_id || null;
                const userId = subscriptionData?.user_id || null;

                const { error } = await supabase.from("donations").insert({
                    amount: invoice.amount_paid,
                    currency: invoice.currency,
                    email,
                    stripe_session_id: invoice.id,
                    type: districtId ? "district" : "platform",
                    subscription_id: subscriptionId,
                    district_id: districtId,
                    user_id: userId,
                });

                if (error) {
                    console.error(
                        "Error inserting recurring renewal donation:",
                        error,
                    );
                } else {
                    console.log(
                        "✅ Recurring renewal recorded in Supabase:",
                        invoice.id,
                    );
                }
            }
        }

        if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object as Stripe.Subscription;
            const { error } = await supabase.from("subscriptions").update({
                status: "canceled",
                canceled_at: new Date().toISOString(),
            }).eq("subscription_id", subscription.id);
            if (error) {
                console.error(
                    "Error updating subscription cancellation:",
                    error,
                );
            }
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

async function getEmail(
    session: Stripe.Checkout.Session | Stripe.Invoice,
): Promise<string | null> {
    let email: string | null = null;

    if ("customer_email" in session && session.customer_email) {
        email = session.customer_email;
    } else if ("customer" in session && session.customer) {
        try {
            const customer = await stripe.customers.retrieve(
                session.customer as string,
            );
            if (!("deleted" in customer)) {
                email = customer.email ?? null;
            }
        } catch (err) {
            console.error(
                "Error retrieving customer for session:",
                err,
            );
        }
    } else if (
        "customer_details" in session && session.customer_details?.email
    ) {
        email = session.customer_details.email;
    }

    return email;
}
