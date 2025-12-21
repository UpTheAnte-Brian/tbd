"use client";
import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { DistrictFeature } from "@/app/lib/types/types";
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
  const [districts, setDistricts] = useState<DistrictFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  const anonymous = !user;
  useEffect(() => {
    async function fetchDistricts() {
      try {
        const res = await fetch("/api/districts");
        const data = await res.json();
        setDistricts(data.features);
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
      <div className="max-w-xl mx-auto my-4 p-6 bg-white rounded shadow text-black">
        Loading districts...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-4 p-6 bg-white rounded shadow">
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
      <h1 className="text-3xl font-bold mb-2 text-gray-700">
        Donate{" "}
        {selectedDistrictId && (
          <span className="text-3xl font-bold text-gray-700">
            to {districts.find((d) => d.id === selectedDistrictId)?.properties?.shortname}
          </span>
        )}
      </h1>
      <p className="mb-6 text-gray-700">
        Support your favorite districts and help us make a difference!
      </p>

      <section className="mb-6">
        {!initialDistrictId && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Select District(s)
            </h2>
            <DistrictSearch
              features={districts}
              onSelect={(selected) => setSelectedDistrictId(selected.id)}
            />
          </div>
        )}
        {/* {selectedDistrictId && (
          <p className="mt-2 text-lg text-black">
            Selected:{" "}
            {districts.find((d) => d.id === selectedDistrictId)?.properties?.shortname}
          </p>
        )} */}
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          One-Time Donation
        </h2>
        <div className="flex gap-3 mb-2">
          {presetDonationAmounts.map((amt) => (
            <button
              key={amt}
              className={`px-4 py-2 rounded border ${
                donationAmount === amt
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
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
            className="px-2 py-1 w-24 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Subscription
        </h2>
        <div className="flex gap-4">
          {subscriptionOptions.map((opt) => (
            <label
              key={opt.value}
              className={`px-3 py-1 rounded border cursor-pointer ${
                subscriptionType === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
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
        className="w-full mt-4 py-3 bg-blue-600 text-white rounded font-bold text-lg hover:bg-blue-700 transition"
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
