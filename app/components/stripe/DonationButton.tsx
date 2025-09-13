"use client";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export function OneTimeDonateButton() {
  const handleClick = async () => {
    const res = await fetch("/api/create-checkout-session", { method: "POST" });
    const { id } = await res.json();
    const stripe = await stripePromise;
    if (stripe) stripe.redirectToCheckout({ sessionId: id });
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-blue-600 text-white rounded"
    >
      Donate $25
    </button>
  );
}
