"use client";
import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBoundsFromGeoJSON } from "../../lib/getBoundsFromGeoJSON";
import { DistrictsPanel, panToMinnesota } from "../../ui/districts/district";
import { ExtendedFeature, DistrictProperties } from "../../lib/interfaces";
import { getLabel, getLabelPosition } from "../../lib/district/utils";
import React from "react";
type LatLngLiteral = google.maps.LatLngLiteral;

const mapContainerStyle = {
  width: "100%",
  height: "100vh",
};
const containerStyle = {
  width: "100%",
  height: "100vh",
  display: "flex",
};

function panToFeature(
  feature: ExtendedFeature | google.maps.Data.Feature,
  map: google.maps.Map
) {
  if ("getGeometry" in feature) {
    feature.toGeoJson((geoJsonFeature) => {
      map.fitBounds(getBoundsFromGeoJSON(geoJsonFeature as ExtendedFeature));
    });
  } else {
    const bounds = getBoundsFromGeoJSON(feature);
    map.fitBounds(bounds);
  }
}

const MapComponent = React.memo(() => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [features, setFeatures] = useState<ExtendedFeature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredFeatureProps, setHoveredFeatureProps] =
    useState<DistrictProperties | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const center = useMemo<LatLngLiteral>(() => ({ lat: 46.3, lng: -94.2 }), []);
  // const { updateLabelMarkers, clearLabelMarkers } = useLabelMarkers();
  //   const [, setLabelMarkers] = useState<
  //     google.maps.marker.AdvancedMarkerElement[]
  //   >([]);
  const labelMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>(
    []
  );

  const onUnMount = () => {
    mapRef.current = null;
  };

  const updateLabelMarkers = useCallback(
    (map: google.maps.Map, features: ExtendedFeature[]) => {
      //   labelMarkersRef.current.forEach((m) => m.setMap(null));

      //   const zoomThreshold = 4;
      //   if (zoomLevel < zoomThreshold) {
      //     labelMarkersRef.current = [];
      //     setLabelMarkers([]);
      //     return;
      //   }
      const customMarkerContent = document.createElement("div");
      customMarkerContent.style.backgroundColor = "blue";
      customMarkerContent.style.color = "white";
      customMarkerContent.style.padding = "5px 10px";
      customMarkerContent.style.borderRadius = "5px";
      customMarkerContent.textContent = "Custom Marker";
      customMarkerContent.innerHTML = "test";

      const newMarkers: google.maps.marker.AdvancedMarkerElement[] = features
        .map((feature) => {
          const position = getLabelPosition(feature);
          const label = getLabel(feature) || "";
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            title: label,
            content: customMarkerContent,
            zIndex: 1000,
          });
        })
        .filter(
          (m): m is google.maps.marker.AdvancedMarkerElement => m !== null
        );
      labelMarkersRef.current = newMarkers;
      //   setLabelMarkers(newMarkers);
    },
    [zoomLevel]
  );
  const onLoad = async (map: google.maps.Map) => {
    mapRef.current = map;

    await fetch("/api/districts")
      .then((res) => res.json())
      .then((geojson: { features: ExtendedFeature[] }) => {
        map.data.addGeoJson(geojson);
        setFeatures(geojson.features);

        map.data.setStyle((feature) => {
          const id = feature.getProperty("SDORGID");
          const isSelected = id === selectedId;
          const isHovered = id === hoveredId;

          return {
            fillColor: isSelected
              ? "#FFEB3B"
              : isHovered
              ? "#FFF176"
              : "#2196F3",
            fillOpacity: 0.5,
            strokeColor: isSelected || isHovered ? "#FBC02D" : "#1976D2",
            strokeWeight: 2,
          };
        });

        // Assuming 'map' is your google.maps.Map object and 'marker' is your google.maps.Marker object
        const minZoomLevel = 8; // Set your desired minimum zoom level for the marker to be visible

        map.addListener("zoom_changed", function () {
          const currentZoom = map.getZoom() ?? 6;
          if (currentZoom >= minZoomLevel) {
            labelMarkersRef.current.map((mark) => {
              mark.map = map;
            });
          } else {
            labelMarkersRef.current.map((mark) => {
              mark.map = null;
            });
          }
        });

        const bounds = new google.maps.LatLngBounds();
        geojson.features.forEach((feature) => {
          const { centroid_lat, centroid_lng } = feature;
          if (centroid_lat && centroid_lng) {
            bounds.extend({ lat: centroid_lat, lng: centroid_lng });
          }
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds);

        map.data.addListener(
          "mouseover",
          (event: google.maps.Data.MouseEvent) => {
            const id = event.feature.getProperty("SDORGID") as string;
            setHoveredId(id);
            setHoveredFeatureProps({
              SDORGID: id,
              ACRES: event.feature.getProperty("ACRES") as string,
              FORMID: event.feature.getProperty("FORMID") as string,
              SDTYPE: event.feature.getProperty("SDTYPE") as string,
              SQMILES: event.feature.getProperty("SQMILES") as string,
              WEB_URL: event.feature.getProperty("WEB_URL") as string,
              PREFNAME: event.feature.getProperty("PREFNAME") as string,
              SDNUMBER: event.feature.getProperty("SDNUMBER") as string,
              SHORTNAME: event.feature.getProperty("SHORTNAME") as string,
              Shape_Area: event.feature.getProperty("Shape_Area") as string,
              Shape_Leng: event.feature.getProperty("Shape_Leng") as string,
            });
          }
        );

        map.data.addListener("mouseout", () => {
          setHoveredId(null);
          setHoveredFeatureProps(null);
        });

        // Inside your onLoad function, after map and features are ready:
        // const zoom = map.getZoom() ?? 0;
        updateLabelMarkers(map, geojson.features);
      });
  };
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;

    const selectedFeature = features.find(
      (f) => f.properties?.SDORGID === selectedId
    );

    if (selectedFeature) {
      panToFeature(selectedFeature, mapRef.current);
      // optionally update label styling, etc.
    }
  }, [selectedId, mapRef, features]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !features.length) return;

    function handleClick(event: google.maps.Data.MouseEvent) {
      // Your click handling logic here,
      // using event.feature to access feature data

      const clickedFeature = event.feature;
      const clickedId = clickedFeature.getProperty("SDORGID") as string;

      if (!clickedId) return;

      setSelectedId(clickedId);

      if (mapRef.current) {
        panToFeature(clickedFeature, mapRef.current);
      }
    }

    const clickEvent = map.data.addListener("click", handleClick);

    // updateLabelMarkers(map, features);
    return () => {
      clickEvent.remove();
      // map.data.removeListener("click", handleClick);
    };
  }, [selectedId, features]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !features.length) return;

    map.data.setStyle((feature) => {
      const id = feature.getProperty("SDORGID");
      const isSelected = id === selectedId;
      const isHovered = id === hoveredId;

      return {
        fillColor: isSelected ? "#FFEB3B" : isHovered ? "#FFF176" : "#2196F3",
        fillOpacity: 0.5,
        strokeColor: isSelected || isHovered ? "#FBC02D" : "#1976D2",
        strokeWeight: 2,
      };
    });
  }, [hoveredId, selectedId]);

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    console.log("event: ", e);
  };

  return (
    <div style={containerStyle}>
      <LoadScript
        version="beta"
        libraries={["marker"]}
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          onLoad={onLoad}
          onClick={onMapClick}
          onUnmount={onUnMount}
          center={center}
          zoom={zoomLevel}
          onZoomChanged={() => setZoomLevel(mapRef.current?.getZoom() ?? 6)}
          options={{
            mapTypeId: "roadmap",
            mapId: "74d818485994559a",
            zoomControl: true,
            disableDefaultUI: true,
          }}
        />
      </LoadScript>
      <DistrictsPanel
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        districts={features}
        mapRef={mapRef}
        panToMinnesota={() => {
          if (mapRef.current) {
            panToMinnesota(mapRef.current);
          }
        }}
      />

      {hoveredFeatureProps && (
        <div className="absolute top-24 left-3 bg-black/80 text-white rounded-lg px-4 py-2 pointer-events-none z-50 shadow-lg transition-all duration-150 opacity-100">
          <div className="font-semibold">{hoveredFeatureProps.SHORTNAME}</div>
          <div className="text-sm">ID: {hoveredFeatureProps.SDORGID}</div>
          {/* <div>{labelMarkersRef.current}</div> */}
        </div>
      )}

      <div className="absolute top-12 right-3 bg-black text-white text-sm px-2 py-1 rounded z-50">
        Zoom: {zoomLevel}
        <br />
        Center: {center.lat}
      </div>
    </div>
  );
});

export default MapComponent;
