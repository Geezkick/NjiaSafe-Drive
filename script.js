// Shared variables
const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with your API key
let map, markersLayer;
const incidents = JSON.parse(localStorage.getItem('incidents')) || [];

// Initialize map on home page if it exists
if (document.getElementById('map')) {
    map = L.map('map').setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
}

// Page-specific logic
document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';

    if (page === 'index.html') {
        initializeHome();
    } else if (page === 'report.html') {
        initializeReport();
    } else if (page === 'dashboard.html') {
        initializeDashboard();
    }
});

// Home page logic
function initializeHome() {
    const toggleBtn = document.getElementById('toggle-map-btn');
    const mapContainer = document.getElementById('map-container');
    const safetyRulesBtn = document.getElementById('safety-rules-btn');
    const modal = document.getElementById('safety-rules-modal');
    const closeModal = document.querySelector('.close-modal');
    const advert = document.getElementById('road-safety-advert');
    const closeAdvert = document.querySelector('.close-advert');
    let isMapVisible = false;

    // Map toggle
    toggleBtn.addEventListener('click', () => {
        isMapVisible = !isMapVisible;
        mapContainer.classList.toggle('visible', isMapVisible);
        toggleBtn.textContent = isMapVisible ? 'Hide Map' : 'Show Map';
        if (isMapVisible) {
            map.invalidateSize();
            loadIncidentsOnMap();
            updateSafetyStatus();
        }
    });

    // Safety rules modal
    safetyRulesBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Floating advert
    closeAdvert.addEventListener('click', () => {
        advert.style.display = 'none';
    });

    getCurrentPosition()
        .then(position => {
            map.setView([position.coords.latitude, position.coords.longitude], 13);
            fetchWeatherData(position.coords.latitude, position.coords.longitude);
        })
        .catch(() => console.log('Using default location'));
}

// Report page logic
function initializeReport() {
    document.getElementById('incident-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('incident-type').value;
        const description = document.getElementById('description').value;

        try {
            const position = await getCurrentPosition();
            const incident = {
                type,
                description,
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                timestamp: new Date().toISOString()
            };

            incidents.push(incident);
            saveIncidents();
            showNotification(`Reported: ${type}`);
            e.target.reset();
            fetchWeatherData(position.coords.latitude, position.coords.longitude);
        } catch (error) {
            showNotification('Error: Enable location services', true);
        }
    });
}

// Dashboard page logic
function initializeDashboard() {
    document.getElementById('search-btn').addEventListener('click', searchLocation);
    document.querySelectorAll('.filter').forEach(cb => cb.addEventListener('change', updateIncidentsList));
    updateIncidentsList();
}

// Helper functions
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

function saveIncidents() {
    localStorage.setItem('incidents', JSON.stringify(incidents));
}

function loadIncidentsOnMap() {
    markersLayer.clearLayers();
    incidents.forEach(incident => addIncidentToMap(incident));
}

function addIncidentToMap(incident) {
    const marker = L.marker([incident.lat, incident.lng])
        .bindPopup(`
            <b>${incident.type}</b><br>
            ${incident.description}<br>
            ${new Date(incident.timestamp).toLocaleString()}
        `);
    marker.incidentType = incident.type;
    markersLayer.addLayer(marker);
}

function updateIncidentsList() {
    const list = document.getElementById('incident-list');
    if (!list) return;

    const activeFilters = Array.from(document.querySelectorAll('.filter:checked')).map(cb => cb.value);
    list.innerHTML = incidents
        .filter(incident => activeFilters.includes(incident.type))
        .map(incident => `
            <li data-lat="${incident.lat}" data-lng="${incident.lng}">
                <strong>${incident.type}</strong><br>
                ${incident.description}<br>
                <small>${new Date(incident.timestamp).toLocaleString()}</small>
            </li>
        `).join('');

    list.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
            const lat = li.dataset.lat;
            const lng = li.dataset.lng;
            window.location.href = `index.html?lat=${lat}&lng=${lng}`;
        });
    });
}

async function fetchWeatherData(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        const data = await response.json();
        const weather = data.weather[0].main.toLowerCase();

        if (weather.includes('rain') || weather.includes('snow') || data.wind.speed > 15) {
            const weatherIncident = {
                type: 'weather',
                description: `${data.weather[0].description} (Temp: ${data.main.temp}°C, Wind: ${data.wind.speed} m/s)`,
                lat,
                lng,
                timestamp: new Date().toISOString()
            };
            incidents.push(weatherIncident);
            saveIncidents();
            if (map && document.getElementById('map-container').classList.contains('visible')) {
                loadIncidentsOnMap();
            }
            updateSafetyStatus();
            showNotification('Weather hazard detected');
        }
    } catch (error) {
        console.error('Weather fetch error:', error);
    }
}

async function searchLocation() {
    const query = document.getElementById('location-search').value;
    if (!query) return;

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
        );
        const data = await response.json();
        if (data.length > 0) {
            const { lat, lon } = data[0];
            window.location.href = `index.html?lat=${lat}&lng=${lon}`;
        } else {
            showNotification('Location not found', true);
        }
    } catch (error) {
        showNotification('Search error', true);
    }
}

function updateSafetyStatus() {
    const status = document.getElementById('safety-status');
    if (!status) return;

    const recentHazards = incidents.filter(i => 
        new Date(i.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    if (recentHazards > 5) {
        status.textContent = 'High Risk Area';
        status.style.color = '#e74c3c';
    } else if (recentHazards > 0) {
        status.textContent = 'Moderate Risk';
        status.style.color = '#f1c40f';
    } else {
        status.textContent = 'Safe Conditions';
        status.style.color = '#27ae60';
    }
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.backgroundColor = isError ? '#e74c3c' : '#27ae60';
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 3000);
}

// Handle URL parameters on home page
if (window.location.search && map) {
    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat');
    const lng = params.get('lng');
    if (lat && lng) {
        map.setView([lat, lng], 15);
        fetchWeatherData(lat, lng);
        document.getElementById('map-container').classList.add('visible');
        document.getElementById('toggle-map-btn').textContent = 'Hide Map';
        map.invalidateSize();
        loadIncidentsOnMap();
        updateSafetyStatus();
    }
}