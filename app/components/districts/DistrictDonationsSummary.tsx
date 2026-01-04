"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";

type DistrictDonationsSummaryProps = {
  districtId: string;
};

// You may want to move these to env vars in production

export default function DistrictDonationsSummary({
  districtId,
}: DistrictDonationsSummaryProps) {
  const [totalAmount, setTotalAmount] = useState(0);
  const [uniqueDonors, setUniqueDonors] = useState(0);
  const [activeSubsCount, setActiveSubsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseClient();

  const fetchData = async () => {
    // Fetch donations
    const { data: donationsAgg, error: donationsError } = await supabase
      .from("donations")
      .select("amount,email")
      .eq("district_id", districtId);

    if (!donationsError && donationsAgg) {
      const total = donationsAgg.reduce(
        (
          sum: number,
          row: {
            amount: number;
            email: string;
          }
        ) => sum + (row.amount ?? 0),
        0
      );
      const donorEmails = new Set<string>();
      for (const row of donationsAgg) {
        if (row.email) donorEmails.add(row.email);
      }
      setTotalAmount(total);
      setUniqueDonors(donorEmails.size);
    }

    // Fetch subscriptions count
    const { count: subsCount, error: subsError } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("district_id", districtId)
      .eq("status", "active");

    if (!subsError) {
      setActiveSubsCount(subsCount ?? 0);
    }

    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchData();

    const donationsChannel = supabase
      .channel(`donations-district-${districtId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "donations",
          filter: `district_id=eq.${districtId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel(`subscriptions-district-${districtId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `district_id=eq.${districtId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(donationsChannel);
      supabase.removeChannel(subscriptionsChannel);
    };
  }, [districtId]);

  if (loading) {
    return (
      <div className="mb-4 rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4 text-brand-secondary-0 animate-pulse">
        <h2 className="mb-2 h-6 w-48 rounded bg-brand-secondary-1 opacity-40 text-lg font-semibold"></h2>
        <div className="mb-1 flex space-x-2 items-center">
          <span className="inline-block h-5 w-40 rounded bg-brand-secondary-1 opacity-30"></span>
          <span className="inline-block h-5 w-24 rounded bg-brand-secondary-1 opacity-30"></span>
        </div>
        <div className="mb-1 flex space-x-2 items-center">
          <span className="inline-block h-5 w-40 rounded bg-brand-secondary-1 opacity-30"></span>
          <span className="inline-block h-5 w-12 rounded bg-brand-secondary-1 opacity-30"></span>
        </div>
        <div className="flex space-x-2 items-center">
          <span className="inline-block h-5 w-60 rounded bg-brand-secondary-1 opacity-30"></span>
          <span className="inline-block h-5 w-12 rounded bg-brand-secondary-1 opacity-30"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4 text-brand-secondary-0">
      <h2 className="mb-2 text-lg font-semibold text-brand-secondary-0">
        Donation Summary
      </h2>
      <div className="mb-1">
        <span className="font-medium text-brand-secondary-0">
          Total Donations:{" "}
        </span>
        <span className="text-brand-secondary-0">
          $
          {(totalAmount / 100).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </span>
      </div>
      <div className="mb-1">
        <span className="font-medium text-brand-secondary-0">
          Unique Donors:{" "}
        </span>
        <span className="text-brand-secondary-0">{uniqueDonors}</span>
      </div>
      <div>
        <span className="font-medium text-brand-secondary-0">
          Active Recurring Subscriptions:{" "}
        </span>
        <span className="text-brand-secondary-0">{activeSubsCount}</span>
      </div>
    </div>
  );
}
