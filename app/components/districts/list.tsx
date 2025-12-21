"use client";
import { useState, useEffect } from "react";
import { DistrictFeature } from "../../lib/types/types";
import { Button } from "@/app/components/ui/button";

type DistrictsPanelProps = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  districts: DistrictFeature[];
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
    useState<DistrictFeature>();

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
          <div className="space-y-2 text-black">
            <h3 className="text-lg font-semibold">
              {selectedFeature.properties?.shortname}
            </h3>
            <p className="text-sm">
              District ID: {selectedFeature.properties?.sdorgid}
            </p>
            <p className="text-sm">
              Website:{" "}
              {selectedFeature.properties?.web_url ? (
                <a
                  href={selectedFeature.properties.web_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {selectedFeature.properties.web_url}
                </a>
              ) : (
                "Not provided"
              )}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
