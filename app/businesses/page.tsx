"use client";

import "@/app/lib/agGridSetup";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type {
  GridApi,
  GridReadyEvent,
  IClientSideRowModel,
  FirstDataRenderedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import { Business } from "@/app/lib/types/types";
import { ColDef } from "ag-grid-community";
import Link from "next/link";
import type { ICellRendererParams } from "ag-grid-community";

type FullGridApi<T> = GridApi<T> & {
  getModel(): IClientSideRowModel;
  setQuickFilter(text: string): void;
};

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);
  const gridApiRef = useRef<FullGridApi<Business> | null>(null);

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

  const onGridReady = useCallback((params: GridReadyEvent<Business>) => {
    gridApiRef.current = params.api as FullGridApi<Business>;
    setVisibleCount(params.api.getDisplayedRowCount());
    params.api.addEventListener("filterChanged", () => {
      setVisibleCount(params.api.getDisplayedRowCount());
    });
  }, []);

  const onFirstDataRendered = useCallback(
    (params: FirstDataRenderedEvent<Business>) => {
      setVisibleCount(params.api.getDisplayedRowCount());
    },
    [],
  );

  useEffect(() => {
    const api = gridApiRef.current;
    if (api) {
      setVisibleCount(api.getDisplayedRowCount());
    }
  }, [businesses]);

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

  const columnDefs: ColDef<Business>[] = useMemo<ColDef<Business>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        cellRenderer: (params: ICellRendererParams<Business, string>) => {
          const entityId = params.data?.entity_id ?? null;
          if (!entityId) return params.value;
          return (
            <Link
              href={`/businesses/${entityId}`}
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
    sortable: true,
    filter: true,
    resizable: true,
    cellClass: "bg-brand-secondary-1 text-brand-primary-1",
    headerClass: "bg-brand-secondary-1 text-brand-primary-1",
  };

  return (
    <div className="w-full">
      <div className="m-1 flex items-center justify-between gap-4 flex-wrap bg-brand-secondary-1 px-3 py-2 rounded">
        <input
          type="text"
          placeholder="Search businesses..."
          value={searchText}
          onChange={handleSearchChange}
          className="flex-[1_1_60%] rounded border border-brand-secondary-0 bg-brand-secondary-1 px-3 py-2 text-brand-primary-1 focus:outline-none focus:ring-1 focus:ring-brand-accent-1"
        />
        <div className="text-sm text-brand-secondary-2 whitespace-nowrap">
          Showing {visibleCount} / {businesses.length}
        </div>
      </div>

      <div className="ag-theme-quartz h-[600px] w-full text-brand-primary-1 bg-brand-secondary-1">
        <AgGridReact<Business>
          rowData={businesses}
          columnDefs={columnDefs}
          theme={themeQuartz}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onFirstDataRendered={onFirstDataRendered}
        />
      </div>
    </div>
  );
}
