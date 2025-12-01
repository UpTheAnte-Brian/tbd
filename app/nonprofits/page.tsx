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
import { ColDef, GridReadyEvent } from "ag-grid-community";
import Link from "next/link";
import type { ICellRendererParams } from "ag-grid-community";
import LoadingSpinner from "@/app/components/loading-spinner";
import { Nonprofit } from "@/app/lib/types/nonprofits";
import NonprofitCreateDrawer from "@/app/components/nonprofits/NonprofitCreateDrawer";
import { toast, Toaster } from "react-hot-toast";

type FullGridApi<T> = GridApi<T> & {
  getModel(): IClientSideRowModel;
  setQuickFilter(text: string): void;
};

export default function NonprofitsPage() {
  const [nonprofits, setNonprofits] = useState<Nonprofit[]>([]);
  const [searchText, setSearchText] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const gridApiRef = useRef<FullGridApi<Nonprofit> | null>(null);

  const fetchNonProfits = useCallback(async () => {
    try {
      const response = await fetch("/api/nonprofits", { method: "GET" });
      if (!response.ok) throw new Error("Failed to fetch nonprofits");
      const json = await response.json();
      setNonprofits(json);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load nonprofits");
    }
  }, []);

  useEffect(() => {
    fetchNonProfits();
    return () => {
      // clean up grid API to avoid stale refs
      gridApiRef.current = null;
    };
  }, [fetchNonProfits]);

  const onGridReady = useCallback((params: GridReadyEvent<Nonprofit>) => {
    gridApiRef.current = params.api as FullGridApi<Nonprofit>;
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    const api = gridApiRef.current as Partial<FullGridApi<Nonprofit>> | null;
    if (api && typeof api.setQuickFilter === "function") {
      api.setQuickFilter(value);
    }
  };

  const columnDefs: ColDef<Nonprofit>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Organization Name",
        flex: 1.5,
        cellRenderer: (params: ICellRendererParams<Nonprofit>) => {
          const id = params.data?.id;
          if (!id) return params.value;

          return (
            <Link
              href={`/nonprofits/${id}`}
              style={{ color: "#4dabf7", textDecoration: "none" }}
            >
              {params.value}
            </Link>
          );
        },
      },
      {
        field: "org_type",
        headerName: "Type",
        width: 150,
      },
      {
        field: "website_url",
        headerName: "Website",
        flex: 1.2,
        cellRenderer: (params: ICellRendererParams<Nonprofit>) => {
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

  if (!nonprofits.length) return <LoadingSpinner />;

  return (
    <div style={{ width: "100%" }}>
      <div className="flex justify-between items-center mb-4 gap-3">
        <h1 className="text-lg font-semibold text-white">Nonprofits</h1>
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-sm font-semibold rounded-full hover:bg-blue-500 shadow-sm"
        >
          <span className="text-base leading-none">＋</span>
          <span>Add Nonprofit</span>
        </button>
      </div>
      {/* 🔍 Search bar */}
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Search foundations..."
          value={searchText}
          onChange={handleSearchChange}
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
        <AgGridReact<Nonprofit>
          rowData={nonprofits}
          columnDefs={columnDefs}
          theme={themeQuartz}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
        />
      </div>
      <NonprofitCreateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreateSuccess={async () => {
          await fetchNonProfits();
          toast.success("Nonprofit created successfully!");
        }}
      />
      {/* Toast container */}
      <div>
        <Toaster position="top-right" />
      </div>
    </div>
  );
}
