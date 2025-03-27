function initializeMap() {
    const mapElement = document.getElementById('map');
    if (mapElement && !window.map) {
        window.map = L.map('map').setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(window.map);
        window.markersLayer = L.layerGroup().addTo(window.map);
    }
}

function loadIncidentsOnMap() {
    if (!window.markersLayer) return;
    window.markersLayer.clearLayers();
    const incidents = JSON.parse(localStorage.getItem('incidents')) || [];
    incidents.forEach(incident => {
        const marker = L.marker([incident.lat, incident.lng])
            .bindPopup(`<b>${incident.type}</b><br>${incident.description}<br>${new Date(incident.timestamp).toLocaleString()}`);
        window.markersLayer.addLayer(marker);
    });
}

export { initializeMap, loadIncidentsOnMap };