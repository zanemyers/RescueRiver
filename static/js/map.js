/* global L, bootstrap */ // Indicates Leaflet (L) and Bootstrap are globally available

// Get references to latitude and longitude input fields
const latInput = document.getElementById("latitude");
const lngInput = document.getElementById("longitude");

let map, marker; // Will hold the Leaflet map instance and draggable marker

/**
 * Initializes the Leaflet map and marker.
 * - Loads OpenStreetMap tiles
 * - Places a draggable marker at the given coordinates
 * - Updates lat/lng inputs when the marker moves
 * - Allows setting location by clicking on the map
 */
const initMap = () => {
  // Use existing input values if valid, otherwise default to Yellowstone National Park
  const lat = parseFloat(latInput.value) || 44.427963;
  const lng = parseFloat(lngInput.value) || -110.588455;

  // Create a Leaflet map centered on the coordinates with zoom level 10
  map = new L.Map("map").setView([lat, lng], 10);

  // Add OpenStreetMap tiles as the base map layer
  new L.TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "Map data © OpenStreetMap contributors",
  }).addTo(map);

  // Add a draggable marker at the coordinates
  marker = new L.Marker([lat, lng], { draggable: true }).addTo(map);

  // When the marker is moved, update the latitude and longitude input fields
  marker.on("dragend", () => {
    const pos = marker.getLatLng();
    latInput.value = pos.lat.toFixed(6);
    lngInput.value = pos.lng.toFixed(6);
  });

  // When the user clicks on the map:
  // - Move the marker to the clicked location
  // - Update the latitude/longitude inputs
  // - Close the map modal
  map.on("click", (e) => {
    marker.setLatLng(e.latlng);
    latInput.value = e.latlng.lat.toFixed(6);
    lngInput.value = e.latlng.lng.toFixed(6);

    const modalInstance = bootstrap.Modal.getInstance(mapModal);
    modalInstance.hide();
  });
};

// ===== Map Modal Behavior =====

// Get reference to the Bootstrap modal element
const mapModal = document.getElementById("mapModal");

// When the modal is shown:
mapModal.addEventListener("shown.bs.modal", () => {
  if (!map) {
    // First time opening: initialize the map
    initMap();
  } else {
    // Map already exists: refresh the display and update marker position
    map.invalidateSize(); // Fixes display issues if map was hidden
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    map.setView([lat, lng], 10);
    marker.setLatLng([lat, lng]);
  }
});
