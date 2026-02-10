"use client";

import "@/app/lib/agGridSetup";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { useRouter, useSearchParams } from "next/navigation";
import type { EntityDirectoryRow } from "@/app/lib/types/entity-directory";
import type { EntityType } from "@/domain/entities/types";
import { entityPath } from "@/app/lib/routes";

const GRID_OPTIONS = {
  // AG Grid v33+ defaults to Theming API (themeQuartz). We are using CSS theme files,
  // so force legacy mode to avoid error #239.
  theme: "legacy" as const,
};

// UI only supports these filters, even if other parts of the codebase define additional variants.
const UI_FILTERS = ["all", "district", "business", "nonprofit"] as const;
type UiDirectoryFilter = (typeof UI_FILTERS)[number];

type Props = {
  initialType?: EntityType;
  /**
   * When true, show All/Districts/Businesses/Nonprofits filter buttons.
   * Defaults to true when initialType is not provided.
   */
  allowTypeSwitch?: boolean;
};

const FILTER_LABELS: Record<UiDirectoryFilter, string> = {
  all: "All",
  district: "Districts",
  business: "Businesses",
  nonprofit: "Nonprofits",
};

const TYPE_LABELS: Partial<Record<EntityType, string>> = {
  district: "District",
  business: "Business",
  nonprofit: "Nonprofit",
};

export default function EntityDirectoryGrid({
  initialType,
  allowTypeSwitch,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine initial activeType based on props and query param
  const getInitialActiveType = (): UiDirectoryFilter => {
    if (initialType) {
      return initialType as UiDirectoryFilter;
    }
    if (allowTypeSwitch) {
      const param = searchParams.get("type");
      if (param && ["district", "business", "nonprofit"].includes(param)) {
        return param as UiDirectoryFilter;
      }
    }
    return "all";
  };

  const [activeType, setActiveType] = useState<UiDirectoryFilter>(
    getInitialActiveType(),
  );

  const showTypeSwitch = allowTypeSwitch ?? initialType === undefined;
  const filterKeys = useMemo<UiDirectoryFilter[]>(() => {
    if (!showTypeSwitch) {
      // Locked to the initial type (or all if none).
      return [activeType];
    }
    return [...UI_FILTERS];
  }, [activeType, showTypeSwitch]);
  const [rows, setRows] = useState<EntityDirectoryRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gridApiRef = useRef<GridApi<EntityDirectoryRow> | null>(null);
  const fetchRows = useCallback(async (filter: UiDirectoryFilter) => {
    setLoading(true);
    setError(null);
    try {
      const typeQuery =
        filter === "all" ? "" : `?type=${encodeURIComponent(filter)}`;
      const res = await fetch(`/api/entities${typeQuery}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load entities");
      const data = (await res.json()) as EntityDirectoryRow[];
      setRows(Array.isArray(data) ? data : []);
      setVisibleCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load entities";
      setRows([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showTypeSwitch) return;
    const param = searchParams.get("type");
    if (param && UI_FILTERS.includes(param as UiDirectoryFilter)) {
      setActiveType(param as UiDirectoryFilter);
      return;
    }
    if (initialType) {
      setActiveType(initialType as UiDirectoryFilter);
      return;
    }
    setActiveType("all");
  }, [initialType, searchParams, showTypeSwitch]);

  useEffect(() => {
    fetchRows(activeType);
  }, [activeType, fetchRows]);

  const onGridReady = useCallback(
    (params: GridReadyEvent<EntityDirectoryRow>) => {
      // Defer until grid has rendered the initial row model.
      queueMicrotask(() => setVisibleCount(params.api.getDisplayedRowCount()));
      params.api.addEventListener("filterChanged", () => {
        setVisibleCount(params.api.getDisplayedRowCount());
      });
    },
    [],
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchText(value);
  };

  const columnDefs: ColDef<EntityDirectoryRow>[] = useMemo(
    () => [
      {
        headerName: "Name",
        field: "name",
        flex: 1.6,
      },
      {
        headerName: "Short Name",
        field: "short_name",
        flex: 1,
        valueFormatter: (params) => params.value ?? "--",
      },
      {
        headerName: "Type",
        field: "entity_type",
        width: 140,
        valueFormatter: (params) => {
          const t = params.value as EntityType | undefined;
          if (!t) return "--";
          return TYPE_LABELS[t] ?? t;
        },
      },
      {
        headerName: "City / State",
        field: "city",
        flex: 1,
        valueGetter: (params) => {
          const city = params.data?.city ?? "";
          const state = params.data?.state ?? "";
          const combined = [city, state].filter(Boolean).join(", ");
          return combined || "--";
        },
      },
      {
        headerName: "Website",
        field: "website",
        flex: 1.2,
        cellRenderer: (params: { value?: string | null }) => {
          const url = params.value ?? "";
          if (!url) return "--";
          const domain = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
          return (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-brand-accent-1 hover:underline"
            >
              {domain}
            </a>
          );
        },
      },
      {
        headerName: "District #",
        field: "district_number",
        width: 140,
        valueFormatter: (params) => params.value ?? "--",
      },
    ],
    [],
  );

  const defaultColDef = {
    flex: 1,
    minWidth: 120,
    sortable: true,
    filter: true,
    resizable: true,
  };

  // Handle pill click: update activeType and URL if allowed
  const handlePillClick = (key: UiDirectoryFilter) => {
    setActiveType(key);
    if (allowTypeSwitch && !initialType) {
      if (key === "all") {
        router.replace("/entities");
      } else {
        router.replace(`/entities?type=${key}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface-page px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-4">
        {showTypeSwitch ? (
          <div className="flex flex-wrap items-center gap-3">
            {filterKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePillClick(key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeType === key
                    ? "bg-brand-primary-0 text-brand-primary-1"
                    : "border border-border-subtle text-text-on-light hover:border-brand-primary-0"
                }`}
              >
                {FILTER_LABELS[key]}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-md border border-border-subtle bg-brand-secondary-1 px-3 py-2">
          <input
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Search entities..."
            className="w-full rounded border border-border-subtle bg-brand-primary-1 px-3 py-2 text-sm text-text-on-light focus:outline-none focus:ring-2 focus:ring-focus-ring md:flex-1"
          />
          <div className="text-xs text-text-on-light">
            Showing {visibleCount} / {rows.length}
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div
          className="ag-theme-quartz h-[640px] w-full rounded-md bg-white text-black"
          style={{ minHeight: 640 }}
        >
          <AgGridReact<EntityDirectoryRow>
            gridOptions={GRID_OPTIONS}
            rowData={rows}
            quickFilterText={searchText}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            domLayout="autoHeight"
            getRowId={(params) => params.data.entity_id}
            rowHeight={44}
            headerHeight={44}
            onGridReady={(params) => {
              gridApiRef.current = params.api;
              onGridReady(params);
            }}
            onFirstDataRendered={(e) => {
              setVisibleCount(e.api.getDisplayedRowCount());
            }}
            overlayLoadingTemplate={
              "<span class='ag-overlay-loading-center'>Loading...</span>"
            }
            overlayNoRowsTemplate={
              "<span class='ag-overlay-loading-center'>No entities found.</span>"
            }
            onRowClicked={(event) => {
              const entityId = event.data?.entity_id;
              if (!entityId) return;
              router.push(entityPath(entityId));
            }}
          />
        </div>
        {loading ? (
          <div className="text-xs text-text-on-light">Loading…</div>
        ) : null}
      </div>
    </div>
  );
}
