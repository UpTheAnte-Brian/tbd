"use client";

import "@/app/lib/agGridSetup";
import React, { useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import { Business } from "@/app/lib/types/types";
import { ColDef } from "ag-grid-community";
import Link from "next/link";
import type { ICellRendererParams } from "ag-grid-community";

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    async function fetchBusinesses() {
      try {
        const response = await fetch("/api/businesses", { method: "GET" });
        if (!response.ok) {
          throw new Error("Failed to fetch businesses");
        }
        const data: Business[] = await response.json();
        setBusinesses(data);
      } catch (error) {
        console.error(error);
      }
    }
    fetchBusinesses();
  }, []);

  const columnDefs: ColDef<Business>[] = useMemo<ColDef<Business>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        cellRenderer: (params: ICellRendererParams<Business, string>) => {
          const businessId = params.data?.id;
          if (!businessId) return params.value;
          return (
            <Link
              href={`/businesses/${businessId}`}
              style={{ color: "#4dabf7" }}
            >
              {params.value}
            </Link>
          );
        },
      },
      { field: "address", headerName: "Address", flex: 1 },
      { field: "phone_number", headerName: "Phone Number", flex: 1 },
      { field: "website", headerName: "Website", flex: 1 },
      { field: "status", headerName: "Status", flex: 1 },
      { field: "created_at", headerName: "Created At", flex: 1 },
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
    sortable: true,
    filter: true,
    resizable: true,
  };

  return (
    <div className="ag-theme-quartz" style={{ height: 600, width: "100%" }}>
      <AgGridReact<Business>
        rowData={businesses}
        columnDefs={columnDefs}
        theme={themeQuartz}
        defaultColDef={defaultColDef}
      />
    </div>
  );
}
