// import { useEffect, useState } from "react";
// import { ExtendedFeature } from "../lib/interfaces";

// const useMarkers = (map: google.maps.Map, markerData: ExtendedFeature) => {
//     const [markers, setMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([]);

//     useEffect(() => {
//         if (!map || !markerData) return;

//         // Clear existing markers when markerData changes or map becomes unavailable
//         markers.forEach((marker) => marker.setMap(null));
//         setMarkers([]);

//         const newMarkers = markerData.map((data) => {
//             const marker = new window.google.maps.Marker({
//                 position: data.position, // { lat: ..., lng: ... }
//                 map: map,
//                 title: data.title,
//                 // Add other marker options as needed (e.g., icon, label)
//             });

//             // Add event listeners if required
//             if (data.onClick) {
//                 marker.addListener("click", data.onClick);
//             }

//             return marker;
//         });

//         setMarkers(newMarkers);

//         // Cleanup function to remove markers when the component unmounts
//         return () => {
//             newMarkers.forEach((marker) => marker.setMap(null));
//         };
//     }, [map, markerData]); // Re-run effect when map or markerData changes

//     return markers; // Return the array of Google Maps Marker objects
// };

// export default useMarkers;
