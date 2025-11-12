"use client";

import "@/app/lib/agGridSetup";
import React, { useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import { DistrictWithFoundation } from "@/app/lib/types";
import { ColDef } from "ag-grid-community";
import Link from "next/link";
import type { ICellRendererParams } from "ag-grid-community";
import LoadingSpinner from "@/app/components/loading-spinner";

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<DistrictWithFoundation[]>([]);

  useEffect(() => {
    async function fetchDistricts() {
      try {
        const response = await fetch("/api/districts", { method: "GET" });
        if (!response.ok) {
          throw new Error("Failed to fetch districts");
        }
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

  const columnDefs: ColDef<DistrictWithFoundation>[] = useMemo(
    () => [
      {
        field: "properties.prefname",
        headerName: "District Name",
        flex: 1.5,
        cellRenderer: (
          params: ICellRendererParams<DistrictWithFoundation, string>
        ) => {
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
        cellRenderer: (
          params: ICellRendererParams<DistrictWithFoundation, string>
        ) => {
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
        cellRenderer: (
          params: ICellRendererParams<DistrictWithFoundation, string>
        ) => params.value || "—",
      },
      {
        field: "foundation.website",
        headerName: "Foundation Website",
        flex: 1.5,
        cellRenderer: (
          params: ICellRendererParams<DistrictWithFoundation, string>
        ) => {
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
        cellRenderer: (
          params: ICellRendererParams<DistrictWithFoundation, string>
        ) => {
          const logo = params.value;
          if (!logo) return "—";
          return (
            <img
              src={logo.startsWith("http") ? logo : `/storage/${logo}`}
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

  if (!districts.length) {
    return <LoadingSpinner />;
  }
  return (
    <div className="ag-theme-quartz" style={{ height: 600, width: "100%" }}>
      <AgGridReact<DistrictWithFoundation>
        rowData={districts}
        columnDefs={columnDefs}
        theme={themeQuartz}
        defaultColDef={defaultColDef}
      />
    </div>
  );
}
