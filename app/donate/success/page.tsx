"use client";

import { Receipt } from "@/app/lib/types/types";
import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";
import Canvas from "react-canvas-confetti/dist/presets/fireworks";

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

export default function DonationSuccessPage() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [districtId, setDistrictId] = useState<string | null>(null);

  const sessionId = new URLSearchParams(window.location.search).get(
    "session_id"
  );

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/stripe/get-session?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        setDistrictId(data.metadata?.district_id || null);
      });
  }, []);

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
    <div className="relative w-full h-full bg-brand-secondary-1 text-brand-primary-1">
      <Canvas
        autorun={{ speed: 1 }}
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
      <div className="max-w-xl mx-auto py-16 px-6 text-center relative z-10">
        <h1 className="text-3xl font-bold text-brand-accent-1 mb-4">
          🎉 Thank you for your donation!
        </h1>
        <p className="text-lg mb-6">Your payment was processed successfully.</p>

        <div className="border border-brand-secondary-2 rounded-lg p-6 shadow-md bg-brand-primary-1 text-left text-brand-secondary-1">
          <h2 className="text-xl font-semibold mb-4 text-brand-secondary-1">
            Donation Receipt
          </h2>

          {loading && <p className="text-brand-secondary-0">Loading receipt...</p>}
          {!loading && !sessionId && (
            <p className="text-brand-accent-1">Missing session ID in URL.</p>
          )}
          {!loading && sessionId && !receipt && (
            <p className="text-brand-accent-1">Unable to load receipt details.</p>
          )}
          {!loading && receipt && (
            <div>
              <p>
                <a
                  href={receipt.receipt_url}
                  target="_blank"
                  className="text-brand-accent-1 underline"
                >
                  View Receipt
                </a>
              </p>
              <p className="text-brand-secondary-1">
                <strong className="text-brand-secondary-1">Amount:</strong> $
                {(receipt.amount / 100).toFixed(2)}
              </p>
              <p className="text-brand-secondary-1">
                <strong className="text-brand-secondary-1">Date:</strong> {receipt.date}
              </p>
            </div>
          )}
        </div>
        {districtId && (
          <Link
            href={`/districts/${districtId}`}
            className="inline-block mt-2 px-6 py-3 bg-brand-primary-0 text-brand-primary-1 font-medium rounded-md hover:bg-brand-primary-2"
          >
            Return to District
          </Link>
        )}
        <Link
          href="/"
          className="inline-block mt-2 px-6 py-3 bg-brand-primary-0 text-brand-primary-1 font-medium rounded-md hover:bg-brand-primary-2"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
