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
import { DistrictWithFoundation } from "@/app/lib/types/types";
import { ColDef, GridReadyEvent } from "ag-grid-community";
import Link from "next/link";
import type { ICellRendererParams } from "ag-grid-community";
import LoadingSpinner from "@/app/components/loading-spinner";
import { useMediaQuery } from "react-responsive";

type FullGridApi<T> = GridApi<T> & {
  getModel(): IClientSideRowModel;
  setQuickFilter(text: string): void;
};

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<DistrictWithFoundation[]>([]);
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);
  const gridApiRef = useRef<FullGridApi<DistrictWithFoundation> | null>(null);
  const isSmall = useMediaQuery({ maxWidth: 767 });

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
      setVisibleCount(params.api.getDisplayedRowCount());
      params.api.addEventListener("filterChanged", () => {
        setVisibleCount(params.api.getDisplayedRowCount());
      });
    },
    []
  );

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

  // const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = e.target.value;
  //   setSearchText(value);
  //   const api = gridApiRef.current;
  //   if (api && typeof (api as any).setQuickFilter === "function") {
  //     (api as any).setQuickFilter(value);
  //   }
  // };

  const columnDefs: ColDef<DistrictWithFoundation>[] = useMemo(() => {
    const baseColumns: ColDef<DistrictWithFoundation>[] = [
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
    ];

    if (isSmall) {
      return baseColumns;
    }

    return [
      ...baseColumns.slice(0, 1),
      { field: "properties.shortname", headerName: "Short Name", flex: 1 },
      baseColumns[1],
      baseColumns[2],
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
      baseColumns[3],
    ];
  }, [isSmall]);

  const defaultColDef = {
    flex: 1,
    sortable: true,
    filter: true,
    resizable: true,
    cellClass: "bg-[#1a1a1a] text-white",
    headerClass: "bg-[#1a1a1a] text-white",
  };

  if (!districts.length) return <LoadingSpinner />;

  return (
    <div className="w-full">
      {/* 🔍 Search bar */}
      <div className="m-1 flex items-center justify-between gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search districts..."
          value={searchText}
          onChange={handleSearchChange}
          className="flex-[1_1_60%] rounded border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="text-sm text-gray-300 whitespace-nowrap">
          Showing {visibleCount} / {districts.length}
        </div>
      </div>

      <div className="ag-theme-quartz h-[600px] w-full text-white bg-[#0f1116]">
        <AgGridReact<DistrictWithFoundation>
          rowData={districts}
          columnDefs={columnDefs}
          rowModelType="clientSide"
          theme={themeQuartz}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
        />
      </div>
    </div>
  );
}
