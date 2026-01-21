"use client";
import React, { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { DistrictDetails } from "@/app/lib/types/types";
import Canvas from "react-canvas-confetti/dist/presets/snow";
import { useUser } from "@/app/hooks/useUser";
import DistrictSearch from "@/app/components/districts/district-search";

const presetDonationAmounts = [10, 25, 50, 100];
const subscriptionOptions = [
  { value: "none", label: "None" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

export function DonatePageContent({
  initialDistrictId,
}: {
  initialDistrictId?: string;
}) {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    initialDistrictId || null
  );
  const [donationAmount, setDonationAmount] = useState<number | "">("");
  const [subscriptionType, setSubscriptionType] = useState("none");
  const [districts, setDistricts] = useState<DistrictDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const searchFeatures = useMemo(
    () =>
      districts.map((district) => ({
        id: district.id,
        properties: {
          entity_id: district.entity_id,
          entity_type: "district",
          name:
            district.prefname ??
            district.shortname ??
            district.sdorgid ??
            "District",
          slug: null,
          active: true,
          child_count: 0,
        },
      })),
    [districts]
  );

  const anonymous = !user;
  useEffect(() => {
    async function fetchDistricts() {
      try {
        const res = await fetch("/api/districts");
        const data = await res.json();
        setDistricts(data.districts ?? []);
      } catch (error) {
        console.error("Failed to fetch districts:", error);
        setDistricts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchDistricts();
  }, []);

  // For custom amount input
  const handleAmountChange = (amt: number | string) => {
    // Only allow number or empty string
    if (typeof amt === "number" || amt === "") {
      setDonationAmount(amt);
    }
  };

  // Stripe integration
  const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
  );

  const handleDonate = async () => {
    const amount = donationAmount === "" ? 0 : donationAmount;
    if (!amount || amount <= 0) {
      console.error("Invalid donation amount");
      return;
    }
    const isRecurring =
      subscriptionType === "month" || subscriptionType === "year";
    const apiUrl = isRecurring
      ? "/api/stripe/create-subscription-session"
      : "/api/stripe/create-checkout-session";
    const body: {
      amount: number;
      anonymous: boolean;
      districtId?: string;
      interval?: "month" | "year";
    } = {
      amount,
      anonymous,
      ...(selectedDistrictId && {
        districtId: selectedDistrictId,
      }),
      ...(subscriptionType === "month" || subscriptionType === "year"
        ? { interval: subscriptionType }
        : {}),
    };
    // For one-time donations, interval may not be needed, but API can ignore it.
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      const { id } = await res.json();
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to initialize");
      }
      await stripe.redirectToCheckout({ sessionId: id });
    } catch (error) {
      console.error("Error during donation:", error);
      // Optionally show error to user
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto my-4 p-6 bg-brand-primary-1 rounded shadow text-brand-secondary-1">
        Loading districts...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-4 p-6 bg-brand-primary-1 rounded shadow">
      <Canvas
        autorun={{ speed: 10 }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <h1 className="text-3xl font-bold mb-2 text-brand-secondary-1">
        Donate{" "}
        {selectedDistrictId && (
          <span className="text-3xl font-bold text-brand-secondary-1">
            to {districts.find((d) => d.id === selectedDistrictId)?.shortname}
          </span>
        )}
      </h1>
      <p className="mb-6 text-brand-secondary-0">
        Support your favorite districts and help us make a difference!
      </p>

      <section className="mb-6">
        {!initialDistrictId && (
          <div>
            <h2 className="text-sm font-semibold text-brand-secondary-1 mb-2">
              Select District(s)
            </h2>
            <DistrictSearch
              features={searchFeatures}
              onSelect={(selected) => {
                const id =
                  typeof selected.id === "string" || typeof selected.id === "number"
                    ? String(selected.id)
                    : null;
                if (id) {
                  setSelectedDistrictId(id);
                }
              }}
            />
          </div>
        )}
        {/* {selectedDistrictId && (
          <p className="mt-2 text-lg text-brand-secondary-1">
            Selected:{" "}
            {districts.find((d) => d.id === selectedDistrictId)?.shortname}
          </p>
        )} */}
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-brand-secondary-1 mb-2">
          One-Time Donation
        </h2>
        <div className="flex gap-3 mb-2">
          {presetDonationAmounts.map((amt) => (
            <button
              key={amt}
              className={`px-4 py-2 rounded border ${
                donationAmount === amt
                  ? "bg-brand-primary-0 text-brand-primary-1 border-brand-primary-0"
                  : "bg-brand-primary-1 text-brand-secondary-1 border-brand-secondary-2 hover:border-brand-accent-1"
              }`}
              onClick={() => handleAmountChange(amt)}
              type="button"
            >
              ${amt}
            </button>
          ))}
          <input
            type="number"
            min={1}
            placeholder="Custom"
            className="px-2 py-1 w-24 border border-brand-secondary-2 rounded focus:ring-2 focus:ring-brand-accent-1 focus:outline-none"
            value={donationAmount === "" ? "" : donationAmount}
            onChange={(e) => {
              const v = e.target.value;
              handleAmountChange(v === "" ? "" : Number(v));
            }}
            onFocus={() => setDonationAmount("")}
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-brand-secondary-1 mb-2">
          Subscription
        </h2>
        <div className="flex gap-4">
          {subscriptionOptions.map((opt) => (
            <label
              key={opt.value}
              className={`px-3 py-1 rounded border cursor-pointer ${
                subscriptionType === opt.value
                  ? "bg-brand-primary-0 text-brand-primary-1 border-brand-primary-0"
                  : "bg-brand-primary-1 text-brand-secondary-1 border-brand-secondary-2 hover:border-brand-accent-1"
              }`}
            >
              <input
                type="radio"
                name="subscription"
                value={opt.value}
                checked={subscriptionType === opt.value}
                onChange={() => setSubscriptionType(opt.value)}
                className="hidden"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      <button
        className="w-full mt-4 py-3 bg-brand-primary-0 text-brand-primary-1 rounded font-bold text-lg hover:bg-brand-primary-2 transition"
        onClick={handleDonate}
        disabled={!donationAmount || Number(donationAmount) <= 0}
      >
        Donate
      </button>
    </div>
  );
}

// Next.js dynamic route wrapper for donate/[districtId]
export default function DonatePage({
  params,
}: {
  params: Promise<{ districtId?: string }>;
}) {
  const resolvedParams = React.use(params);
  return <DonatePageContent initialDistrictId={resolvedParams?.districtId} />;
}
