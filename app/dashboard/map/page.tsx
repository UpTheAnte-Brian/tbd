// "use client";
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import {
//   GoogleMap,
//   InfoWindow,
//   KmlLayer,
//   Marker,
// } from "@react-google-maps/api";
// import Places from "@/app/ui/maps/places";
// import React from "react";

// type LatLngLiteral = google.maps.LatLngLiteral;
// type MapOptions = google.maps.MapOptions;
// // const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// // function loadScript(src: string, position: HTMLElement) {
// //   const script = document.createElement("script");
// //   script.setAttribute("async", "");
// //   script.src = src;
// //   position.appendChild(script);
// //   return script;
// // }

// export default function MapPage() {
//   const [point, setPoint] = useState<LatLngLiteral | null>(null);
//   // const callbackId = React.useId().replace(/:/g, "");
//   // const [loaded, setLoaded] = React.useState(false);
//   const mapRef = useRef<google.maps.Map | null>(null);
//   const kmlLayerRef = useRef<google.maps.KmlLayer | null>(null);
//   const center = useMemo<LatLngLiteral>(
//     () => ({
//       lat: 44.745,
//       lng: -93.523,
//     }),
//     []
//   );

//   const [selectedFeature, setSelectedFeature] = useState<KmlFeatureData | null>(
//     null
//   );

//   const kmlOptions = {
//     suppressInfoWindows: true, // Prevent default KML info windows
//   };

//   const onLoadKml = (kmlLayer: google.maps.KmlLayer) => {
//     kmlLayerRef.current = kmlLayer;
//   };

//   const handleKmlClick = (event: google.maps.KmlMouseEvent) => {
//     if (!event.featureData) {
//       console.error("Feature data is null");
//       return;
//     }
//     const featureData: KmlFeatureData = {
//       author: {
//         email: event.featureData?.author?.email ?? "",
//         name: event.featureData?.author?.name ?? "",
//         uri: event.featureData?.author?.uri ?? "",
//       },
//       description: event.featureData?.description ?? "",
//       id: event.featureData?.id ?? "",
//       infoWindowHtml: event.featureData?.infoWindowHtml ?? "",
//       name: event.featureData?.name ?? "Unknown",
//       snippet: event.featureData?.snippet ?? "",
//       position: event.latLng ?? undefined, // Use undefined if latLng is null
//       content: `
//         <h3>${event.featureData?.name ?? "No Name"}</h3>
//         <div>${event.featureData?.description ?? "No Description"}</div>
//       `,
//       pixelOffset: event.pixelOffset ?? null,
//     };

//     console.log("Feature Data:", featureData);
//     console.log("Clicked Feature Data:", featureData);
//     setSelectedFeature(featureData);
//   };
//   // const handleKmlClick = (kmlEvent: google.maps.KmlMouseEvent) => {
//   //   console.log("KML Clicked", kmlEvent);
//   //   if (kmlEvent.featureData) {
//   //     kmlEvent.featureData.infoWindowHtml = `<div id="kml-popup-content">${kmlEvent.featureData.infoWindowHtml}</div>`;
//   //   }

//   //   const infoWindow = new window.google.maps.InfoWindow({
//   //     content: kmlEvent.featureData ? kmlEvent.featureData.infoWindowHtml : "",
//   //   });

//   //   if (kmlEvent.featureData) {
//   //     if (kmlEvent.latLng) {
//   //       infoWindow.setPosition(kmlEvent.latLng);
//   //       infoWindow.open(mapRef.current);
//   //     }
//   //   }

//   //   window.google.maps.event.addListener(infoWindow, "domready", () => {
//   //     const popupContent = document.getElementById("kml-popup-content");
//   //     if (popupContent) {
//   //       popupContent.style.backgroundColor = "green";
//   //       popupContent.style.color = "black";
//   //       popupContent.style.padding = "10px";
//   //       popupContent.style.borderRadius = "5px";
//   //     }
//   //   });
//   // };

//   const options = useMemo<MapOptions>(
//     () => ({
//       disableDefaultUI: false,
//       zoomControl: true,
//       clickableIcons: true,
//       mapId: "74d818485994559a",
//     }),
//     []
//   );

//   const onLoad = useCallback((map: google.maps.Map) => {
//     mapRef.current = map;
//   }, []);

//   const onUnmount = useCallback(() => {
//     mapRef.current = null;
//   }, []);

//   useEffect(() => {
//     if (kmlLayerRef.current) {
//       kmlLayerRef.current.addListener("click", handleKmlClick);
//     }
//   }, [kmlLayerRef]);

//   return (
//     <div className="flex flex-col md:flex-row min-h-full">
//       <div className="w-full">
//         <GoogleMap
//           zoom={10}
//           center={center}
//           options={options}
//           onLoad={onLoad}
//           onUnmount={onUnmount}
//           mapContainerStyle={{ width: "100%", height: "80svh" }}
//         >
//           <KmlLayer
//             options={kmlOptions}
//             onClick={(event) =>
//               handleKmlClick(event as unknown as google.maps.KmlMouseEvent)
//             }
//             onLoad={onLoadKml}
//             url="https://www.google.com/maps/d/u/0/kml?mid=1FKYPSCOodzmWDszKJYHUrSL0jKpeVMc&lid=i9NuWw-UIno"
//           />

//           {selectedFeature && (
//             <InfoWindow
//               position={selectedFeature.position}
//               onCloseClick={() => setSelectedFeature(null)}
//               // Removed pixelOffset as it is not supported
//             >
//               <div
//                 style={{
//                   backgroundColor: "white",
//                   color: "black",
//                   padding: "10px",
//                 }}
//                 dangerouslySetInnerHTML={{ __html: selectedFeature.content }}
//               />
//             </InfoWindow>
//           )}
//           {point && <Marker position={point} />}
//           <div className="absolute overflow-auto p-4 bx-black bg-opacity-80 text-white top-14 left-2.5 w-64">
//             <h1>Search</h1>
//             <Places
//               setPoint={(position) => {
//                 setPoint(position);
//                 mapRef.current?.panTo(position);
//               }}
//             />
//           </div>
//         </GoogleMap>
//       </div>
//     </div>
//   );
// }
// interface KmlFeatureData {
//   author: {
//     email: string;
//     name: string;
//     uri: string;
//   };
//   description: string;
//   id: string;
//   infoWindowHtml: string;
//   name: string;
//   snippet: string;
//   position: google.maps.LatLng | google.maps.LatLngLiteral | undefined;
//   content: string;
//   pixelOffset: google.maps.Size | null;
// }
