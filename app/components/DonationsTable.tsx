"use client";

import "@/app/lib/agGridSetup";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import { useEffect, useMemo, useState } from "react";
import type { Receipt } from "@/app/lib/types";
import type {
  ColDef,
  ValueFormatterParams,
  ICellRendererParams,
} from "ag-grid-community";

export default function DonationsTable() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const columnDefs: ColDef<Receipt>[] = useMemo<ColDef<Receipt>[]>(
    () => [
      { field: "id", headerName: "ID", flex: 1 },
      { field: "district_name", headerName: "District", flex: 1 },
      { field: "email", headerName: "Donor Email", flex: 1 },
      {
        field: "amount",
        headerName: "Amount",
        flex: 1,
        valueFormatter: (p: ValueFormatterParams<Receipt, number>) =>
          p.value != null ? `$${(p.value / 100).toFixed(2)}` : "$0.00",
      },
      { field: "date", headerName: "Date", flex: 1 },
      {
        field: "receipt_url",
        headerName: "Receipt",
        cellRenderer: (params: ICellRendererParams<Receipt, string>) =>
          params.value ? (
            <a
              href={params.value}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              View
            </a>
          ) : null,
        flex: 1,
      },
    ],
    []
  );
  const defaultColDef = {
    flex: 1,
    cellStyle: {
      backgroundColor: "#1a1a1a", // dark background
      color: "#ffffff", // white text
    },
    headerStyle: {
      backgroundColor: "#1a1a1a", // dark background
      color: "#ffffff", // white text
    },
  };

  useEffect(() => {
    async function loadReceipts() {
      try {
        const res = await fetch("/api/receipts");
        if (!res.ok) throw new Error("Failed to fetch receipts");

        const data = await res.json();

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
    <div className="h-80 w-full bg-black text-black">
      <AgGridReact<Receipt>
        columnDefs={columnDefs}
        rowData={receipts}
        theme={themeQuartz}
        defaultColDef={defaultColDef}
      />
    </div>
  );
}
