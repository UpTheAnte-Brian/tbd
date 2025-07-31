// import { useEffect, useRef, useState } from "react";

// export default function Map({ options, onMount, className, onMountProps }) {
//   const ref = useRef<HTMLDivElement | null>(null);
//   const [map, setMap] = useState<google.maps.Map | undefined>(undefined);

//   useEffect(() => {
//     const onLoad = () => {
//       if (ref.current) {
//         setMap(new window.google.maps.Map(ref.current, options));
//       }
//     };

//     if (!window.google.maps) {
//       const script = document.createElement(`script`);
//       script.src =
//         `https://maps.googleapis.com/maps/api/js?key=` +
//         process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
//       document.head.append(script);
//       script.addEventListener(`load`, onLoad);
//       return () => script.removeEventListener(`load`, onLoad);
//     } else onLoad();
//   }, [options]);

//   if (map && typeof onMount === `function`) onMount(map, onMountProps);

//   return (
//     <div
//       style={{ height: `60vh`, margin: `1em 0`, borderRadius: `0.5em` }}
//       {...{ ref, className }}
//     ></div>
//   );
// }

// Map.defaultProps = {
//   options: {
//     center: { lat: 48, lng: 8 },
//     zoom: 5,
//   },
// };
