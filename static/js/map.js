/* global L, bootstrap */

const latInput = document.getElementById("latitude");
const lngInput = document.getElementById("longitude");

let map, marker;

const initMap = () => {
  const lat = parseFloat(latInput.value) || 44.427963;
  const lng = parseFloat(lngInput.value) || -110.588455;

  map = new L.Map("map").setView([lat, lng], 10);

  new L.TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "Map data © OpenStreetMap contributors",
  }).addTo(map);

  marker = new L.Marker([lat, lng], { draggable: true }).addTo(map);

  marker.on("dragend", () => {
    const pos = marker.getLatLng();
    latInput.value = pos.lat.toFixed(6);
    lngInput.value = pos.lng.toFixed(6);
  });

  map.on("click", (e) => {
    marker.setLatLng(e.latlng);
    latInput.value = e.latlng.lat.toFixed(6);
    lngInput.value = e.latlng.lng.toFixed(6);

    const modalInstance = bootstrap.Modal.getInstance(mapModal);
    modalInstance.hide();
  });
};

// Map Modal
const mapModal = document.getElementById("mapModal");
mapModal.addEventListener("shown.bs.modal", () => {
  if (!map) {
    initMap();
  } else {
    map.invalidateSize();
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    map.setView([lat, lng], 10);
    marker.setLatLng([lat, lng]);
  }
});
