"use client";

import Link from "next/link";
import React, { use } from "react";
import { useEffect, useState } from "react";

interface Receipt {
  id: string;
  amount: number;
  date: string;
}

async function getReceipt(sessionId: string): Promise<Receipt | null> {
  try {
    const res = await fetch(
      `/api/stripe/receipt?session_id=${encodeURIComponent(sessionId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function DonationSuccessPage({
  searchParams,
}: {
  searchParams: any;
}) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);

  const params = use(searchParams) as { session_id: string };
  const sessionId = params?.session_id;

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    getReceipt(sessionId).then((data) => {
      setReceipt(data);
      setLoading(false);
    });
  }, [sessionId]);

  return (
    <div className="max-w-xl mx-auto py-16 px-6 text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        🎉 Thank you for your donation!
      </h1>
      <p className="text-lg mb-6">Your payment was processed successfully.</p>

      <div className="border rounded-lg p-6 shadow-md bg-white text-left">
        <h2 className="text-xl font-semibold mb-4 text-black">
          Donation Receipt
        </h2>

        {loading && <p className="text-gray-600">Loading receipt...</p>}
        {!loading && !sessionId && (
          <p className="text-red-600">Missing session ID in URL.</p>
        )}
        {!loading && sessionId && !receipt && (
          <p className="text-red-600">Unable to load receipt details.</p>
        )}
        {!loading && receipt && (
          <div>
            <p className="text-black">
              <strong>Receipt ID:</strong> {receipt.id}
            </p>
            <p className="text-black">
              <strong>Amount:</strong> ${(receipt.amount / 100).toFixed(2)}
            </p>
            <p className="text-black">
              <strong>Date:</strong> {receipt.date}
            </p>
          </div>
        )}
      </div>

      <Link
        href="/"
        className="inline-block mt-8 px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
      >
        Return to Home
      </Link>
    </div>
  );
}
