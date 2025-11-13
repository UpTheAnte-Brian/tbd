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
import { DistrictWithFoundation } from "@/app/lib/types";
import { ColDef, GridReadyEvent } from "ag-grid-community";
import Link from "next/link";
import type { ICellRendererParams } from "ag-grid-community";
import LoadingSpinner from "@/app/components/loading-spinner";

type FullGridApi<T> = GridApi<T> & {
  getModel(): IClientSideRowModel;
  setQuickFilter(text: string): void;
};

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<DistrictWithFoundation[]>([]);
  const [searchText, setSearchText] = useState("");
  const gridApiRef = useRef<FullGridApi<DistrictWithFoundation> | null>(null);

  useEffect(() => {
    async function fetchDistricts() {
      try {
        const response = await fetch("/api/districts", { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch districts");
        const json = await response.json();
        if (json?.features?.length) {
          setDistricts(json.features as DistrictWithFoundation[]);
        } else {
          console.warn("Unexpected /api/districts format:", json);
        }
      } catch (error) {
        console.error(error);
      }
    }
    fetchDistricts();
  }, []);

  const onGridReady = useCallback(
    (params: GridReadyEvent<DistrictWithFoundation>) => {
      gridApiRef.current = params.api as FullGridApi<DistrictWithFoundation>;
    },
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    gridApiRef.current?.setQuickFilter(value);
  };

  const columnDefs: ColDef<DistrictWithFoundation>[] = useMemo(
    () => [
      {
        field: "properties.prefname",
        headerName: "District Name",
        flex: 1.5,
        cellRenderer: (params: ICellRendererParams<DistrictWithFoundation>) => {
          const id = params.data?.sdorgid;
          if (!id) return params.value;
          return (
            <Link
              href={`/districts/${id}`}
              style={{ color: "#4dabf7", textDecoration: "none" }}
            >
              {params.value}
            </Link>
          );
        },
      },
      { field: "properties.shortname", headerName: "Short Name", flex: 1 },
      { field: "properties.sdnumber", headerName: "Number", width: 120 },
      {
        field: "properties.web_url",
        headerName: "District Website",
        flex: 1.5,
        cellRenderer: (params: ICellRendererParams<DistrictWithFoundation>) => {
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
        field: "foundation.name",
        headerName: "Foundation",
        flex: 1.2,
        cellRenderer: (params: ICellRendererParams<DistrictWithFoundation>) =>
          params.value || "—",
      },
      {
        field: "foundation.website",
        headerName: "Foundation Website",
        flex: 1.5,
        cellRenderer: (params: ICellRendererParams<DistrictWithFoundation>) => {
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
        field: "metadata.logo_path",
        headerName: "Logo",
        width: 120,
        cellRenderer: (params: ICellRendererParams<DistrictWithFoundation>) => {
          const logo = params.value;
          if (!logo) return "—";
          return (
            <img
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/${process.env.NEXT_PUBLIC_SUPABASE_STORAGE_LOGO_PATH}${logo}`}
              alt="Logo"
              style={{ height: 32, width: "auto", borderRadius: 4 }}
            />
          );
        },
      },
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

  if (!districts.length) return <LoadingSpinner />;

  return (
    <div style={{ width: "100%" }}>
      {/* 🔍 Search bar */}
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Search districts..."
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
        <AgGridReact<DistrictWithFoundation>
          rowData={districts}
          columnDefs={columnDefs}
          theme={themeQuartz}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
        />
      </div>
    </div>
  );
}
