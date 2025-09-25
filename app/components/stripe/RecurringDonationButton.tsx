"use client";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export function MonthlyDonateButton() {
  const handleClick = async () => {
    const res = await fetch("/api/stripe/create-subscription-session", {
      method: "POST",
    });
    const { id } = await res.json();
    const stripe = await stripePromise;
    if (stripe) stripe.redirectToCheckout({ sessionId: id });
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 w-full bg-green-600 text-white rounded"
    >
      Donate Monthly
    </button>
  );
}
