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
  const [visibleCount, setVisibleCount] = useState(0);
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
    setVisibleCount(params.api.getDisplayedRowCount());
    params.api.addEventListener("filterChanged", () => {
      setVisibleCount(params.api.getDisplayedRowCount());
    });
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    const api = gridApiRef.current;
    if (api) {
      const asUnknown = api as unknown;
      const withQuick = asUnknown as {
        setQuickFilter?: (text: string) => void;
      };
      const withGridOption = asUnknown as {
        setGridOption?: (key: string, val: unknown) => void;
      };

      if (typeof withQuick.setQuickFilter === "function") {
        withQuick.setQuickFilter(value);
        setVisibleCount(api.getDisplayedRowCount());
      } else if (typeof withGridOption.setGridOption === "function") {
        withGridOption.setGridOption("quickFilterText", value);
        setVisibleCount(api.getDisplayedRowCount());
      }
    }
  };

  const columnDefs: ColDef<Nonprofit>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Organization Name",
        flex: 1.5,
        cellRenderer: (params: ICellRendererParams<Nonprofit>) => {
          const entityId = params.data?.entity_id ?? null;
          if (!entityId) return params.value;

          return (
            <Link
              href={`/nonprofits/${entityId}`}
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
    sortable: true,
    filter: true,
    resizable: true,
    cellClass: "bg-brand-secondary-1 text-brand-primary-1",
    headerClass: "bg-brand-secondary-1 text-brand-primary-1",
  };

  if (!nonprofits.length) return <LoadingSpinner />;

  return (
    <div className="w-full">
      <div className="m-1 flex items-center justify-between gap-3 flex-wrap bg-brand-secondary-1 px-3 py-2 rounded">
        <input
          type="text"
          placeholder="Search foundations..."
          value={searchText}
          onChange={handleSearchChange}
          className="flex-[1_1_55%] rounded border border-brand-secondary-0 bg-brand-secondary-1 px-3 py-2 text-brand-primary-1 focus:outline-none focus:ring-1 focus:ring-brand-accent-1"
        />
        <div className="text-sm text-brand-secondary-2 whitespace-nowrap">
          Showing {visibleCount} / {nonprofits.length}
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-sm font-semibold rounded-full hover:bg-blue-500 shadow-sm whitespace-nowrap"
        >
          <span className="text-base leading-none">＋</span>
          <span>Add Nonprofit</span>
        </button>
      </div>

      <div className="ag-theme-quartz h-[600px] w-full text-brand-primary-1 bg-brand-secondary-1">
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
