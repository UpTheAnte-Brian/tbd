interface StripeInvoiceWithSubscription extends StripeType.Invoice {
    subscription?: string;
    payment_intent?: string | StripeType.PaymentIntent | null;
}

interface StripeInvoiceWithCharge extends StripeInvoiceWithSubscription {
    charge?: string;
    // Remove any synthetic stripe_session_id or mixed ID logic
    // Only include real charge ID and optional subscription/payment_intent
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import type StripeType from "stripe";
import { createClient } from "@supabase/supabase-js";

type ExpandedPaymentIntent = StripeType.PaymentIntent & {
    charges: StripeType.ApiList<StripeType.Charge>;
};

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

        // Helper function to safely upsert a donation
        const upsertDonation = async (data: {
            stripe_session_id?: string;
            invoice_id?: string | null;
            amount: number;
            email?: string | null;
            type?: "platform" | "district";
            district_id?: string | null;
            user_id?: string | null;
            subscription_id?: string | null;
            receipt_url?: string | null;
        }) => {
            console.log("data: ", data);
            if (data.stripe_session_id) {
                // Only include stripe_session_id if it exists
                await supabase.from("donations").upsert(
                    { ...data },
                    { onConflict: "stripe_session_id" },
                );
            } else if (data.invoice_id) {
                await supabase
                    .from("donations")
                    .update({ receipt_url: data.receipt_url })
                    .eq("invoice_id", data.invoice_id);
            } else {
                // throw new Error(
                //     "Cannot upsert donation: no primary key provided",
                // );
                return;
            }
        };

        // --------------------------
        // Checkout session completed (one-time or initial subscription)
        // --------------------------
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const districtId = session.metadata?.district_id ?? null;
            const userId = session.metadata?.user_id ?? null;
            const interval = session.metadata?.interval ?? null;
            const email = await getEmail(session);

            // TODO This receiptUrl isn't quite right
            const finalReceiptUrl =
                `https://dashboard.stripe.com/invoices/${session.invoice}`;

            await upsertDonation({
                stripe_session_id: session.id,
                invoice_id: session.invoice as string,
                amount: session.amount_total || 0,
                email,
                type: districtId ? "district" : "platform",
                ...(districtId && { district_id: districtId }),
                ...(userId && { user_id: userId }),
                ...(interval &&
                    {
                        subscription_id: session.subscription as
                            | string
                            | null,
                    }),
                receipt_url: finalReceiptUrl,
            });
            // console.log("receipt ", session);
            if (session.mode === "subscription" && session.subscription) {
                const payload = {
                    stripe_subscription_id: session.subscription as string,
                    user_id: userId ?? undefined,
                    email,
                    amount: session.amount_total ?? 0,
                    type: districtId ? "district" : "platform",
                    status: "active",
                    created_at: new Date().toISOString(),
                    ...(districtId && { district_id: districtId }),
                    ...(interval && { interval }),
                };

                await supabase.from("subscriptions").upsert(payload, {
                    onConflict: "stripe_subscription_id",
                });
            }
        }

        // --------------------------
        // Invoice payment succeeded (recurring)
        // --------------------------
        if (event.type === "invoice.payment_succeeded") {
            const invoice = event.data.object as StripeInvoiceWithCharge;
            const email = await getEmail(invoice);

            // Skip first invoice if handled in checkout.session.completed
            if (invoice.billing_reason === "subscription_create") {
                return NextResponse.json({ skipped: true });
            }

            const subscriptionId = typeof invoice.subscription === "string"
                ? invoice.subscription
                : null;

            let receiptUrl: string | undefined;

            if (invoice.hosted_invoice_url) {
                receiptUrl = invoice.hosted_invoice_url;
            } else {
                receiptUrl = await getReceiptUrl(invoice);
            }

            // Fallback to invoice ID if no URL could be retrieved
            const finalReceiptUrl = receiptUrl ??
                `https://dashboard.stripe.com/invoices/${invoice.id}`;

            // console.log("invoice.payment_succeeded", invoice);
            if (!subscriptionId) {
                // One-time invoice
                await upsertDonation({
                    invoice_id: invoice.id as string,
                    amount: invoice.amount_paid,
                    email,
                    type: "platform",
                    receipt_url: finalReceiptUrl,
                });
            } else {
                // Subscription payment
                const { data: subscriptionData } = await supabase
                    .from("subscriptions")
                    .select("district_id, user_id")
                    .eq("stripe_subscription_id", subscriptionId)
                    .single();

                const districtId = subscriptionData?.district_id ?? null;
                const userId = subscriptionData?.user_id ?? null;

                await upsertDonation({
                    invoice_id: invoice.id as string,
                    amount: invoice.amount_paid,
                    email,
                    type: districtId ? "district" : "platform",
                    ...(districtId && { district_id: districtId }),
                    ...(userId && { user_id: userId }),
                    subscription_id: subscriptionId,
                    receipt_url: finalReceiptUrl,
                });
            }
        }

        // --------------------------
        // Charge succeeded (guaranteed receipt_url)
        // --------------------------
        // if (event.type === "charge.succeeded") {
        //     const charge = event.data.object as Stripe.Charge;
        //     const receiptUrl = charge.receipt_url;
        //     console.log("charge.succeeded", charge, receiptUrl);

        //     await upsertDonation({
        //         payment_intent_id: charge.payment_intent as string,
        //         amount: charge.amount,
        //         currency: charge.currency,
        //         email: charge.billing_details.email,
        //         type: "platform",
        //         receipt_url: receiptUrl ?? null,
        //     });
        // }

        // --------------------------
        // Subscription cancellation
        // --------------------------
        if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object as Stripe.Subscription;
            await supabase.from("subscriptions").update({
                status: "canceled",
                canceled_at: new Date().toISOString(),
            }).eq("stripe_subscription_id", subscription.id);
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error("Webhook error:", err);
        return new NextResponse(`Webhook error: ${err}`, {
            status: 400,
        });
    }
}

async function getEmail(
    session: Stripe.Checkout.Session | Stripe.Invoice,
): Promise<string | null> {
    if ("customer_email" in session && session.customer_email) {
        return session.customer_email;
    }
    if ("customer_details" in session && session.customer_details?.email) {
        return session.customer_details.email;
    }
    if ("customer" in session && session.customer) {
        try {
            const customer = await stripe.customers.retrieve(
                session.customer as string,
            );
            if (!("deleted" in customer)) return customer.email ?? null;
        } catch (err) {
            console.error("Error retrieving customer:", err);
        }
    }
    return null;
}

async function getReceiptUrl(
    sessionOrInvoice: Stripe.Checkout.Session | StripeType.Invoice,
): Promise<string | undefined> {
    try {
        // For Checkout Session (one-time payments or initial subscription)
        if (
            "payment_intent" in sessionOrInvoice &&
            sessionOrInvoice.payment_intent
        ) {
            const paymentIntentId = sessionOrInvoice.payment_intent as string;

            // Try fetching the PaymentIntent and expanding charges
            const paymentIntent = await stripe.paymentIntents.retrieve(
                paymentIntentId,
                { expand: ["charges.data"] },
            ) as unknown as ExpandedPaymentIntent;

            let firstCharge = paymentIntent.charges?.data[0];

            // Retry once if charge not yet created
            if (!firstCharge?.receipt_url) {
                await new Promise((r) => setTimeout(r, 1000));
                const retryIntent = await stripe.paymentIntents.retrieve(
                    paymentIntentId,
                    { expand: ["charges.data"] },
                ) as unknown as ExpandedPaymentIntent;
                firstCharge = retryIntent.charges?.data[0];
            }

            return firstCharge?.receipt_url ?? undefined;
        }

        // For Invoice (recurring subscription payments)
        if (
            "charge" in sessionOrInvoice &&
            typeof sessionOrInvoice.charge === "string"
        ) {
            const chargeId = sessionOrInvoice.charge;
            const charge = await stripe.charges.retrieve(
                chargeId,
            ) as StripeType.Charge;
            return charge.receipt_url ?? undefined;
        }
    } catch (err) {
        console.error("Error fetching receipt_url:", err);
    }

    return undefined;
}
