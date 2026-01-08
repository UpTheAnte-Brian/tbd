export const ATTENDANCE_OVERLAY_STYLE: google.maps.Data.StyleOptions = {
  fillOpacity: 0.25,
  strokeWeight: 1,
  strokeOpacity: 0.9,
  clickable: true,
  // Keep overlay above the district fill so it can receive hover/click events.
  zIndex: 2,
  cursor: "pointer",
};
