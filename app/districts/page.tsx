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
import { DistrictFeature } from "@/app/lib/types/types";
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
  const [districts, setDistricts] = useState<DistrictFeature[]>([]);
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);
  const gridApiRef = useRef<FullGridApi<DistrictFeature> | null>(null);
  const isSmall = useMediaQuery({ maxWidth: 767 });

  useEffect(() => {
    async function fetchDistricts() {
      try {
        const response = await fetch("/api/districts", { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch districts");
        const json = await response.json();
        if (json?.features?.length) {
          setDistricts(json.features as DistrictFeature[]);
        } else {
          console.warn("Unexpected /api/districts format:", json);
        }
      } catch (error) {
        console.error(error);
      }
    }
    fetchDistricts();
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent<DistrictFeature>) => {
    gridApiRef.current = params.api as FullGridApi<DistrictFeature>;
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

  // const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = e.target.value;
  //   setSearchText(value);
  //   const api = gridApiRef.current;
  //   if (api && typeof (api as any).setQuickFilter === "function") {
  //     (api as any).setQuickFilter(value);
  //   }
  // };

  const columnDefs: ColDef<DistrictFeature>[] = useMemo(() => {
    const baseColumns: ColDef<DistrictFeature>[] = [
      {
        headerName: "District Name",
        flex: 1.5,
        valueGetter: (params) => params.data?.properties?.prefname,
        cellRenderer: (params: ICellRendererParams<DistrictFeature>) => {
          const id =
            params.data?.properties?.district_id ??
            params.data?.id ??
            params.data?.properties?.sdorgid;
          const name = params.data?.properties?.prefname ?? params.value;
          if (!id) return name;
          return (
            <Link
              href={`/districts/${id}`}
              style={{ color: "#4dabf7", textDecoration: "none" }}
            >
              {name}
            </Link>
          );
        },
      },
      {
        headerName: "Number",
        width: 120,
        valueGetter: (params) => params.data?.properties?.sdnumber,
      },
      {
        headerName: "District Website",
        flex: 1.5,
        valueGetter: (params) => params.data?.properties?.web_url,
        cellRenderer: (params: ICellRendererParams<DistrictFeature>) => {
          const url = params.data?.properties?.web_url;
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
    ];

    if (isSmall) {
      return baseColumns;
    }

    return [
      baseColumns[0],
      {
        headerName: "Short Name",
        flex: 1,
        valueGetter: (params) => params.data?.properties?.shortname,
      },
      baseColumns[1],
      baseColumns[2],
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
        <AgGridReact<DistrictFeature>
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
