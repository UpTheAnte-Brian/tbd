import { ExtendedFeature, DistrictProperties } from "../../lib/interfaces";
import { Button } from "../button";

type DistrictsPanelProps = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  districts: ExtendedFeature[];
  mapRef: React.RefObject<google.maps.Map | null>;
  panToMinnesota: () => void;
};

export const panToMinnesota = (map: google.maps.Map) => {
  map.setZoom(6);
  map.panTo({ lat: 46.3, lng: -94.3 }); // Center of MN
};

export function DistrictsPanel({
  selectedId,
  setSelectedId,
  districts,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mapRef,
  panToMinnesota,
}: DistrictsPanelProps) {
  const selectedFeature = districts.find(
    (f) => f.properties?.SDORGID === selectedId
  );
  return (
    <aside className="w-80 h-full border-r flex flex-col bg-inherit">
      <div className="sticky top-0 z-10 border-b px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Districts</h2>
        <Button onClick={panToMinnesota}>Reset Map</Button>
      </div>

      <div className="overflow-y-auto flex-1">
        <ul>
          {districts.map((feature) => {
            const id = feature.properties?.SDORGID;
            const name = feature.properties?.SHORTNAME || "Unnamed";
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
        {selectedFeature ? (
          <div>
            <h2 className="text-lg font-bold mb-2">
              {(selectedFeature.properties as DistrictProperties)?.SHORTNAME ??
                "Selected District"}
            </h2>
            <p className="text-sm text-gray-400 mb-2">
              ID: {selectedFeature.id}
            </p>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap">
              {JSON.stringify(selectedFeature.properties, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500">Select a district to view details</p>
        )}
      </div>
    </aside>
  );
}
