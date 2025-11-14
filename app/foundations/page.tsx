"use client";

import "@/app/lib/agGridSetup";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import type { GridApi, IClientSideRowModel } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import { Foundation } from "@/app/lib/types";
import { ColDef, GridReadyEvent } from "ag-grid-community";
import Link from "next/link";
import type { ICellRendererParams } from "ag-grid-community";
import LoadingSpinner from "@/app/components/loading-spinner";

type FullGridApi<T> = GridApi<T> & {
  getModel(): IClientSideRowModel;
  setQuickFilter(text: string): void;
};

export default function FoundationsPage() {
  const [foundations, setFoundations] = useState<Foundation[]>([]);
  const [searchText, setSearchText] = useState("");
  const gridApiRef = useRef<FullGridApi<Foundation> | null>(null);

  useEffect(() => {
    async function fetchFoundations() {
      try {
        const response = await fetch("/api/foundations", { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch foundations");
        const json: Foundation[] = await response.json();
        console.log("foundations: ", json);
        setFoundations(json as Foundation[]);
      } catch (error) {
        console.error(error);
      }
    }
    fetchFoundations();
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent<Foundation>) => {
    gridApiRef.current = params.api as FullGridApi<Foundation>;
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    gridApiRef.current?.setQuickFilter(value);
  };

  const columnDefs: ColDef<Foundation>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Foundation Name",
        flex: 1.5,
        cellRenderer: (params: ICellRendererParams<Foundation>) => {
          const district_id = params.data?.district_id;
          if (!district_id) return params.value;
          return (
            <Link
              href={`/districts/${district_id}?tab=Foundation`}
              style={{ color: "#4dabf7", textDecoration: "none" }}
            >
              {params.value}
            </Link>
          );
        },
      },
      { field: "contact", headerName: "Contact", flex: 1 },
      { field: "founding_year", headerName: "Number", width: 120 },
      {
        field: "website",
        headerName: "Foundation Website",
        flex: 1.5,
        cellRenderer: (params: ICellRendererParams<Foundation>) => {
          const url = params.value;
          if (!url) return "";
          const domain = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#91c9ff", textDecoration: "underline" }}
            >
              {domain}
            </a>
          );
        },
      },
      {
        field: "average_class_size",
        headerName: "Foundation",
        flex: 1.2,
        cellRenderer: (params: ICellRendererParams<Foundation>) =>
          params.value || "—",
      },
      {
        field: "website",
        headerName: "Foundation Website",
        flex: 1.5,
        cellRenderer: (params: ICellRendererParams<Foundation>) => {
          const url = params.value;
          if (!url) return "";
          const domain = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#91c9ff", textDecoration: "underline" }}
            >
              {domain}
            </a>
          );
        },
      },
      // {
      //   field: "metadata.logo_path",
      //   headerName: "Logo",
      //   width: 120,
      //   cellRenderer: (params: ICellRendererParams<Foundation>) => {
      //     const logo = params.value;
      //     if (!logo) return "—";
      //     return (
      //       <img
      //         src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/${process.env.NEXT_PUBLIC_SUPABASE_STORAGE_LOGO_PATH}${logo}`}
      //         alt="Logo"
      //         style={{ height: 32, width: "auto", borderRadius: 4 }}
      //       />
      //     );
      //   },
      // },
    ],
    []
  );

  const defaultColDef = {
    flex: 1,
    cellStyle: { backgroundColor: "#1a1a1a", color: "#ffffff" },
    headerStyle: { backgroundColor: "#1a1a1a", color: "#ffffff" },
    sortable: true,
    filter: true,
    resizable: true,
  };

  if (!foundations.length) return <LoadingSpinner />;

  return (
    <div style={{ width: "100%" }}>
      {/* 🔍 Search bar */}
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Search foundations..."
          value={searchText}
          onChange={handleSearchChange}
          disabled
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#1a1a1a",
            color: "#fff",
          }}
        />
      </div>

      <div className="ag-theme-quartz" style={{ height: 600, width: "100%" }}>
        <AgGridReact<Foundation>
          rowData={foundations}
          columnDefs={columnDefs}
          theme={themeQuartz}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
        />
      </div>
    </div>
  );
}
