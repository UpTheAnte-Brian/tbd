"use client";
import { useState, useEffect } from "react";
import { DistrictWithFoundation } from "../../lib/types";
import { Button } from "../button";
import FoundationEditor from "./foundation-editor";

type DistrictsPanelProps = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  districts: DistrictWithFoundation[];
  mapRef: React.RefObject<google.maps.Map | null>;
  panToMinnesota: () => void;
};

export function DistrictList({
  selectedId,
  setSelectedId,
  districts,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mapRef,
  panToMinnesota,
}: DistrictsPanelProps) {
  // WRAP IN USE EFFECT WITH selectedId dependency
  const [selectedFeature, setSelectedFeature] =
    useState<DistrictWithFoundation>();

  useEffect(() => {
    const fetchDistrict = async () => {
      if (!selectedId) return;
      const res = await fetch(`/api/districts/${selectedId}`);
      const json = await res.json();
      setSelectedFeature(json);
    };

    fetchDistrict();
  }, [selectedId]);
  return (
    <aside className="w-80 h-full border-r flex flex-col bg-inherit">
      <div className="sticky top-0 z-10 border-b px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Districts {districts.length}</h2>
        <Button onClick={panToMinnesota}>Reset Map</Button>
      </div>
      <div className="overflow-y-auto flex-1">
        <ul>
          {districts.map((feature) => {
            const id = feature.properties?.sdorgid;
            const name = feature.properties?.shortname || "Unnamed";
            return (
              <li
                key={id}
                className={`px-4 py-2 cursor-pointer hover:bg-yellow-100 hover:text-gray-500${
                  selectedId === id
                    ? "bg-yellow-200 text-gray-500 underline font-medium"
                    : ""
                }`}
                onClick={() => setSelectedId(id)}
              >
                {name}
              </li>
            );
          })}
        </ul>
      </div>
      {/* Selected feature details */}
      <div className="flex-1 p-4 border-t border-gray-600 overflow-y-auto">
        {selectedFeature?.properties?.sdorgid && (
          <FoundationEditor
            foundation={{
              district_id: selectedFeature.properties.sdorgid,
              name: "",
              contact: "",
              website: selectedFeature.properties.web_url,
              founding_year: null,
              average_class_size: null,
              balance_sheet: null,
              ...(selectedFeature.foundation ?? {}),
            }}
            onSave={async (updated) => {
              try {
                if (!updated.district_id) {
                  throw new Error("Missing district_id for foundation update");
                }

                const response = await fetch(
                  `/api/foundations/${updated.district_id}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updated),
                  }
                );

                if (!response.ok) {
                  throw new Error(
                    `Failed to save foundation: ${response.statusText}`
                  );
                }
              } catch (error) {
                console.error("Error saving foundation data:", error);
              }
            }}
          />
        )}
      </div>
    </aside>
  );
}
