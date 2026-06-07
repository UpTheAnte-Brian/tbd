import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createApiClient } from "@/utils/supabase/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  let entityId: string | undefined;
  let amount: number;
  let anonymous = false;

  try {
    const body = await req.json();
    entityId = body.entityId;
    amount = body.amount;
    anonymous = Boolean(body.anonymous);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, {
      status: 400,
    });
  }

  if (!entityId) {
    return NextResponse.json({ error: "Missing entityId" }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const supabase = await createApiClient();
  const { data: entity, error: entityError } = await supabase
    .from("entities")
    .select("id, name, entity_type")
    .eq("id", entityId)
    .maybeSingle();

  if (entityError) {
    return NextResponse.json({ error: entityError.message }, { status: 500 });
  }

  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  const metadata: Record<string, string> = {
    entity_id: entity.id,
    entity_type: entity.entity_type,
    funding_purpose: "ai_credits",
  };

  if (anonymous) {
    metadata.anonymous = "true";
  } else {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    metadata.user_id = user.id;
    metadata.anonymous = "false";
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_HOST;

  if (!baseUrl) {
    return NextResponse.json({ error: "Missing site URL" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${entity.name} AI Credits`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    metadata,
    invoice_creation: { enabled: true },
    success_url:
      `${baseUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/entities/${entity.id}?tab=agent`,
  });

  return NextResponse.json({ id: session.id, url: session.url });
}
