'use client';


import {APIProvider, Map} from '@vis.gl/react-google-maps';
 
export default function MapPage() {
  return (
    <APIProvider apiKey={'AIzaSyA0zw5s1RtdiiXqsaAC0qIfH4b5eRBsw2M'}>
      <Map
        style={{width: '100vw', height: '100vh'}}
        defaultCenter={{lat: 22.54992, lng: 0}}
        defaultZoom={3}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
      />
    </APIProvider>
  );
}