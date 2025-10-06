"use client";

import DonationsTable from "@/app/components/DonationsTable";
import { Receipt } from "@/app/lib/types";
import { useEffect, useState } from "react";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReceipts() {
      try {
        const res = await fetch("/api/receipts");
        if (!res.ok) throw new Error("Failed to fetch receipts");

        const data = await res.json();
        console.log("data: ", data);
        if (Array.isArray(data)) {
          setReceipts(data);
        } else {
          console.error("Unexpected response:", data);
          setReceipts([]);
          setError("Unexpected response format from API");
        }
      } catch (err) {
        console.error("Error loading receipts:", err);
        setError("Error loading receipts");
        setReceipts([]);
      } finally {
        setLoading(false);
      }
    }
    loadReceipts();
  }, []);

  if (loading) return <p>Loading receipts...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="flex flex-col">
      <div className="p-6">
        <DonationsTable />
      </div>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Your Receipts</h1>
        {receipts.length === 0 ? (
          <p>No receipts yet.</p>
        ) : (
          <ul className="space-y-4">
            {receipts.map((r) => (
              <li key={r.id} className="border p-4 rounded">
                <p>
                  <strong>Amount:</strong> ${(r.amount / 100).toFixed(2)}
                </p>
                <p>
                  <strong>District:</strong> {r.district_name ?? "N/A"}
                </p>
                <p>
                  <strong>Date:</strong> {new Date(r.date).toLocaleDateString()}
                </p>
                <p>
                  <strong>User:</strong> {r.user_id ?? "N/A"}
                </p>
                <p>
                  <strong>Type:</strong> {r.type ?? "N/A"}
                </p>
                <p>
                  <strong>Email:</strong> {r.email ?? "N/A"}
                </p>
                {r.stripe_session_id && (
                  <p>
                    <strong>Stripe Session:</strong> {r.stripe_session_id}
                  </p>
                )}
                {r.stripe_session_id && (
                  <a
                    href={r.receipt_url}
                    target="_blank"
                    className="text-blue-600 underline"
                  >
                    View Receipt
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
