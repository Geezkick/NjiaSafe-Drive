// Constants
const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with your OpenWeatherMap API key
const incidents = JSON.parse(localStorage.getItem('incidents')) || [];
const v2vMessages = [];
const trafficAlerts = [
    "Heavy congestion on I-95 Northbound",
    "Accident reported on Main St",
    "Road work on Highway 101 - expect delays"
];

// Map Initialization
let map, markersLayer;
if (document.getElementById('map')) {
    map = L.map('map').setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
}

// Page Load
document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    initializeThemeToggle();
    switch (page) {
        case 'index.html': initializeHome(); break;
        case 'report.html': initializeReport(); break;
        case 'dashboard.html': initializeDashboard(); break;
        case 'security.html': initializeSecurity(); break;
    }
});

// Theme Toggle
function initializeThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    toggleBtn.addEventListener('click', () => {
        body.dataset.theme = body.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', body.dataset.theme);
    });
    body.dataset.theme = localStorage.getItem('theme') || 'light';
}

// Home Page
function initializeHome() {
    const elements = {
        toggleBtn: document.getElementById('toggle-map-btn'),
        mapContainer: document.getElementById('map-container'),
        safetyRulesBtn: document.getElementById('safety-rules-btn'),
        securityBtn: document.getElementById('security-btn'),
        v2vBtn: document.getElementById('v2v-btn'),
        modal: document.getElementById('safety-rules-modal'),
        closeModal: document.querySelector('.close-modal'),
        advert: document.getElementById('road-safety-advert'),
        closeAdvert: document.querySelector('.close-advert'),
        v2vSection: document.getElementById('v2v-section'),
        v2vSend: document.getElementById('v2v-send'),
        v2vInput: document.getElementById('v2v-input'),
        v2vMessagesDiv: document.getElementById('v2v-messages')
    };
    let isMapVisible = false, isV2VVisible = false;

    elements.toggleBtn.addEventListener('click', () => {
        isMapVisible = !isMapVisible;
        elements.mapContainer.classList.toggle('visible', isMapVisible);
        elements.toggleBtn.textContent = isMapVisible ? 'Hide Map' : 'Show Map';
        if (isMapVisible) {
            map.invalidateSize();
            loadIncidentsOnMap();
            updateSafetyStatus();
        }
    });

    elements.safetyRulesBtn.addEventListener('click', () => elements.modal.style.display = 'block');
    elements.securityBtn.addEventListener('click', () => window.location.href = 'security.html');
    elements.v2vBtn.addEventListener('click', toggleV2VSection);
    elements.closeModal.addEventListener('click', () => elements.modal.style.display = 'none');
    elements.closeAdvert.addEventListener('click', () => elements.advert.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === elements.modal) elements.modal.style.display = 'none'; });

    elements.v2vSend.addEventListener('click', () => sendV2VMessage(elements.v2vInput.value, elements.v2vMessagesDiv));

    getCurrentPosition()
        .then(position => {
            map.setView([position.coords.latitude, position.coords.longitude], 13); // Fixed syntax error here
            fetchWeatherData(position.coords.latitude, position.coords.longitude);
        })
        .catch(() => console.log('Using default location'));

    function toggleV2VSection() {
        isV2VVisible = !isV2VVisible;
        elements.v2vSection.classList.toggle('visible', isV2VVisible);
        elements.v2vBtn.textContent = isV2VVisible ? 'Hide V2V' : 'V2V Network';
    }
}

// Report Page
function initializeReport() {
    document.getElementById('incident-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('incident-type').value;
        const description = document.getElementById('description').value;
        try {
            const position = await getCurrentPosition();
            const incident = { type, description, lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() };
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

// Dashboard Page
function initializeDashboard() {
    document.getElementById('search-btn').addEventListener('click', searchLocation);
    document.querySelectorAll('.filter').forEach(cb => cb.addEventListener('change', updateIncidentsList));
    updateIncidentsList();
}

// Security Page
function initializeSecurity() {
    const emergencyBtn = document.getElementById('emergency-btn');
    const trafficAlertBtn = document.getElementById('traffic-alert-btn');
    const trafficAlertsDiv = document.getElementById('traffic-alerts');
    emergencyBtn.addEventListener('click', () => {
        if (confirm('Send emergency SOS?')) {
            getCurrentPosition()
                .then(position => showNotification(`SOS sent from ${position.coords.latitude}, ${position.coords.longitude}`))
                .catch(() => showNotification('Error: Enable location', true));
        }
    });
    trafficAlertBtn.addEventListener('click', () => {
        trafficAlertsDiv.style.display = trafficAlertsDiv.style.display === 'block' ? 'none' : 'block';
        if (trafficAlertsDiv.style.display === 'block') {
            trafficAlertsDiv.innerHTML = '<h4>Live Traffic Updates</h4>' + trafficAlerts.map(alert => `<p>${alert}</p>`).join('');
        }
    });
}

// Helper Functions
function getCurrentPosition() {
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
}

function saveIncidents() {
    localStorage.setItem('incidents', JSON.stringify(incidents));
}

function loadIncidentsOnMap() {
    markersLayer.clearLayers();
    incidents.forEach(incident => {
        const marker = L.marker([incident.lat, incident.lng])
            .bindPopup(`<b>${incident.type}</b><br>${incident.description}<br>${new Date(incident.timestamp).toLocaleString()}`);
        marker.incidentType = incident.type;
        markersLayer.addLayer(marker);
    });
}

function updateIncidentsList() {
    const list = document.getElementById('incident-list');
    if (!list) return;
    const activeFilters = Array.from(document.querySelectorAll('.filter:checked')).map(cb => cb.value);
    list.innerHTML = incidents
        .filter(incident => activeFilters.includes(incident.type))
        .map(incident => `
            <li data-lat="${incident.lat}" data-lng="${incident.lng}">
                <strong>${incident.type}</strong><br>${incident.description}<br><small>${new Date(incident.timestamp).toLocaleString()}</small>
            </li>
        `).join('');
    list.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => window.location.href = `index.html?lat=${li.dataset.lat}&lng=${li.dataset.lng}`);
    });
}

async function fetchWeatherData(lat, lon) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        const data = await response.json();
        const weather = data.weather[0].main.toLowerCase();
        if (weather.includes('rain') || weather.includes('snow') || data.wind.speed > 15) {
            const weatherIncident = {
                type: 'weather',
                description: `${data.weather[0].description} (Temp: ${data.main.temp}°C, Wind: ${data.wind.speed} m/s)`,
                lat, 
                lng: lon,
                timestamp: new Date().toISOString()
            };
            incidents.push(weatherIncident);
            saveIncidents();
            if (map && document.getElementById('map-container')?.classList.contains('visible')) loadIncidentsOnMap();
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
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
        const data = await response.json();
        if (data.length > 0) window.location.href = `index.html?lat=${data[0].lat}&lng=${data[0].lon}`;
        else showNotification('Location not found', true);
    } catch (error) {
        showNotification('Search error', true);
    }
}

function updateSafetyStatus() {
    const status = document.getElementById('safety-status');
    if (!status) return;
    const recentHazards = incidents.filter(i => new Date(i.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
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

function sendV2VMessage(message, messagesDiv) {
    if (!message.trim()) return;
    v2vMessages.push({ text: message, timestamp: new Date().toLocaleTimeString() });
    messagesDiv.innerHTML = v2vMessages.map(msg => `<p>${msg.text} <small>(${msg.timestamp})</small></p>`).join('');
    document.getElementById('v2v-input').value = '';
    showNotification('Message sent to nearby vehicles');
    console.log('IoT Broadcast:', message); // Simulate IoT broadcast
}

// URL Parameters
if (window.location.search && map) {
    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat'), lng = params.get('lng');
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