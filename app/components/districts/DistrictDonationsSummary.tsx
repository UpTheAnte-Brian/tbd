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
      <div className="border rounded p-4 mb-4 bg-gray-50 animate-pulse">
        <h2 className="text-lg font-semibold mb-2 bg-gray-300 rounded w-48 h-6"></h2>
        <div className="mb-1 flex space-x-2 items-center">
          <span className="font-medium bg-gray-300 rounded w-40 h-5 inline-block"></span>
          <span className="bg-gray-300 rounded w-24 h-5 inline-block"></span>
        </div>
        <div className="mb-1 flex space-x-2 items-center">
          <span className="font-medium bg-gray-300 rounded w-40 h-5 inline-block"></span>
          <span className="bg-gray-300 rounded w-12 h-5 inline-block"></span>
        </div>
        <div className="flex space-x-2 items-center">
          <span className="font-medium bg-gray-300 rounded w-60 h-5 inline-block"></span>
          <span className="bg-gray-300 rounded w-12 h-5 inline-block"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-4 mb-4 bg-gray-50">
      <h2 className="text-lg font-semibold mb-2 text-black">
        Donation Summary
      </h2>
      <div className="mb-1">
        <span className="font-medium text-black">Total Donations: </span>
        <span className="text-black">
          $
          {(totalAmount / 100).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </span>
      </div>
      <div className="mb-1">
        <span className="font-medium text-black">Unique Donors: </span>
        <span className="text-black">{uniqueDonors}</span>
      </div>
      <div>
        <span className="font-medium text-black">
          Active Recurring Subscriptions:{" "}
        </span>
        <span className="text-black">{activeSubsCount}</span>
      </div>
    </div>
  );
}
