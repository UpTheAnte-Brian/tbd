"use client";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export function DistrictDonateButton({
  districtId,
  anonymous,
}: {
  districtId: string;
  anonymous?: boolean;
}) {
  const handleClick = async () => {
    const res = await fetch("/api/stripe/create-district-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ districtId, anonymous, amount: 3500 }),
    });
    const { id } = await res.json();
    const stripe = await stripePromise;
    if (stripe) stripe.redirectToCheckout({ sessionId: id });
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 w-full bg-brand-primary-0 text-brand-primary-1 rounded hover:bg-brand-primary-2"
    >
      {anonymous ? "Donate Anonymously" : "Donate to this District"}
    </button>
  );
}
