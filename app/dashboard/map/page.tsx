"use client";

import { APIProvider, Map } from "@vis.gl/react-google-maps";

export default function MapPage() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  function initMap() {
    console.log("init map");
    // const map = new google.maps.Map(
    //   document.getElementById("map") as HTMLElement,
    //   {
    //     zoom: 11,
    //     center: { lat: 41.876, lng: -87.624 },
    //   }
    // );
    // const ctaLayer = new google.maps.KmlLayer({
    //   url: "http://www.google.com/maps/d/kml?mid=1-mpfnFjp1e5JJ1YkSBjE6ZX_d9w",
    //   map: map,
    // });
    // const georssLayer = new google.maps.KmlLayer({
    //   url: "http://api.flickr.com/services/feeds/geo/?g=322338@N20&lang=en-us&format=feed-georss",
    // });
    // georssLayer.setMap(map);
    // const map = new google.maps.Map(
    //   document.getElementById("map") as HTMLElement,
    //   {
    //     zoom: 6,
    //     center: { lat: -33.872, lng: 151.252 },
    //   }
    // );
    // // Define the LatLng coordinates for the outer path.
    // const outerCoords = [
    //   { lat: -32.364, lng: 153.207 }, // north west
    //   { lat: -35.364, lng: 153.207 }, // south west
    //   { lat: -35.364, lng: 158.207 }, // south east
    //   { lat: -32.364, lng: 158.207 }, // north east
    // ];
    // // Define the LatLng coordinates for an inner path.
    // const innerCoords1 = [
    //   { lat: -33.364, lng: 154.207 },
    //   { lat: -34.364, lng: 154.207 },
    //   { lat: -34.364, lng: 155.207 },
    //   { lat: -33.364, lng: 155.207 },
    // ];
    // // Define the LatLng coordinates for another inner path.
    // const innerCoords2 = [
    //   { lat: -33.364, lng: 156.207 },
    //   { lat: -34.364, lng: 156.207 },
    //   { lat: -34.364, lng: 157.207 },
    //   { lat: -33.364, lng: 157.207 },
    // ];
    // map.data.add({
    //   geometry: new google.maps.Data.Polygon([
    //     outerCoords,
    //     innerCoords1,
    //     innerCoords2,
    //   ]),
    // });
  }
  // 44°56'21.4"N 93°39'52.9"W
  // 44.93854042584834, -93.6650996570076
  return (
    <APIProvider apiKey={`${googleMapsApiKey}`} onLoad={initMap}>
      <div className="flex h-200">
        <Map
          id="map"
          style={{ width: "100vw", height: "82vh" }}
          defaultCenter={{ lat: 45, lng: -93.5 }}
          defaultZoom={8}
          // gestureHandling={"greedy"}
          // disableDefaultUI={true}
          // className="outline rounded-lg"
        />
      </div>
    </APIProvider>
  );
}
