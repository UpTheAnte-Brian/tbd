// app/donate/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import DistrictMultiSelectSearch from "../components/districts/district-multi-select-search";
import { DistrictWithFoundation } from "@/app/lib/types";
import Canvas from "react-canvas-confetti/dist/presets/snow";

const presetDonationAmounts = [10, 25, 50, 100];
const subscriptionOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

export default function DonatePage() {
  const [selectedDistrictIds, setSelectedDistrictIds] = useState<string[]>([]);
  const [donationAmount, setDonationAmount] = useState<number | "">("");
  const [subscriptionType, setSubscriptionType] = useState("monthly");
  const [districts, setDistricts] = useState<DistrictWithFoundation[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Placeholder for Stripe integration
  const handleDonate = () => {
    alert(
      `Donate $${donationAmount} (${subscriptionType}) to districts: ${selectedDistrictIds.join(
        ", "
      )}`
    );
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded shadow">
        Loading districts...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded shadow">
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
      <h1 className="text-3xl font-bold mb-2 text-gray-700">Donate</h1>
      <p className="mb-6 text-gray-700">
        Support your favorite districts and help us make a difference!
      </p>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Select District(s)
        </h2>
        {/* <AssignDistrictsModal
          assignToId={assignToId!}
          handleSaveAssignments={() => {
            setUsers((localUsers) => {
              // localUsers is not defined here; we must pass it from modal
              // So instead, update handleSaveAssignments to accept localUsers
              return localUsers;
            });
            handleSaveAssignments();
          }}
          users={users}
          features={features}
          setUsers={setUsers}
          onClose={() => setAssignToId(null)}
        /> */}
        <DistrictMultiSelectSearch
          features={districts}
          selectedIds={selectedDistrictIds}
          onChange={setSelectedDistrictIds}
        />
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
            value={
              typeof donationAmount === "number"
                ? presetDonationAmounts.includes(donationAmount)
                  ? ""
                  : donationAmount
                : donationAmount
            }
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
        disabled={
          !donationAmount ||
          Number(donationAmount) <= 0 ||
          selectedDistrictIds.length === 0
        }
      >
        Donate
      </button>
    </div>
  );
}
