// Constants
const OPENWEATHERMAP_API_KEY = 'your_openweathermap_api_key_here'; // Replace with your OpenWeatherMap API key
const incidents = JSON.parse(localStorage.getItem('incidents')) || [];
const v2vMessages = [];
const roadStats = { trafficDensity: 0, avgSpeed: 0, incidentRate: 0 };
const weatherData = { temp: null, condition: null, wind: null, humidity: null };

// Map Initialization
let map, markersLayer;
if (document.getElementById('map')) {
    map = L.map('map').setView([51.505, -0.09], 13); // Default: London
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
        roadDataBtn: document.getElementById('road-data-btn'),
        weatherBtn: document.getElementById('weather-btn'),
        modal: document.getElementById('safety-rules-modal'),
        closeModal: document.querySelector('.close-modal'),
        advert: document.getElementById('road-safety-advert'),
        closeAdvert: document.querySelector('.close-advert'),
        v2vSection: document.getElementById('v2v-section'),
        v2vSend: document.getElementById('v2v-send'),
        v2vInput: document.getElementById('v2v-input'),
        v2vMessagesDiv: document.getElementById('v2v-messages'),
        roadDataSection: document.getElementById('road-data-section'),
        collectDataBtn: document.getElementById('collect-data-btn'),
        trafficDensity: document.getElementById('traffic-density'),
        avgSpeed: document.getElementById('avg-speed'),
        incidentRate: document.getElementById('incident-rate'),
        weatherSection: document.getElementById('weather-section'),
        refreshWeatherBtn: document.getElementById('refresh-weather-btn'),
        weatherTemp: document.getElementById('weather-temp'),
        weatherCondition: document.getElementById('weather-condition'),
        weatherWind: document.getElementById('weather-wind'),
        weatherHumidity: document.getElementById('weather-humidity')
    };
    let visibility = { map: false, v2v: false, roadData: false, weather: false };

    elements.toggleBtn.addEventListener('click', () => toggleSection('map', elements.mapContainer, elements.toggleBtn, () => {
        map.invalidateSize();
        loadIncidentsOnMap();
        updateSafetyStatus();
    }, visibility));
    elements.safetyRulesBtn.addEventListener('click', () => elements.modal.style.display = 'block');
    elements.securityBtn.addEventListener('click', () => window.location.href = 'security.html');
    elements.v2vBtn.addEventListener('click', () => toggleSection('v2v', elements.v2vSection, elements.v2vBtn, null, visibility));
    elements.roadDataBtn.addEventListener('click', () => toggleSection('road-data', elements.roadDataSection, elements.roadDataBtn, updateRoadStats, visibility));
    elements.weatherBtn.addEventListener('click', () => toggleSection('weather', elements.weatherSection, elements.weatherBtn, fetchAndDisplayWeather, visibility));
    elements.closeModal.addEventListener('click', () => elements.modal.style.display = 'none');
    elements.closeAdvert.addEventListener('click', () => elements.advert.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === elements.modal) elements.modal.style.display = 'none'; });
    elements.v2vSend.addEventListener('click', () => sendV2VMessage(elements.v2vInput.value, elements.v2vMessagesDiv));
    elements.collectDataBtn.addEventListener('click', collectRoadData);
    elements.refreshWeatherBtn.addEventListener('click', fetchAndDisplayWeather);

    getCurrentPosition()
        .then(position => {
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 13);
            fetchWeatherData(latitude, longitude);
            updateRoadStats();
            fetchAndDisplayWeather(latitude, longitude);
        })
        .catch(() => {
            console.log('Geolocation failed, using default location');
            fetchAndDisplayWeather(51.505, -0.09); // Default: London
        });

    function toggleSection(type, container, btn, callback, vis) {
        vis[type] = !vis[type];
        container.classList.toggle('visible', vis[type]);
        btn.textContent = vis[type] ? `Hide ${type.charAt(0).toUpperCase() + type.slice(1)}` : `${type.charAt(0).toUpperCase() + type.slice(1)}`;
        if (vis[type] && callback) callback();
    }

    function collectRoadData() {
        getCurrentPosition()
            .then(position => {
                const simulatedData = {
                    trafficDensity: Math.floor(Math.random() * 100) + 1,
                    avgSpeed: Math.floor(Math.random() * 80) + 20,
                    incidentRate: incidents.length / 24
                };
                roadStats.trafficDensity = simulatedData.trafficDensity;
                roadStats.avgSpeed = simulatedData.avgSpeed;
                roadStats.incidentRate = simulatedData.incidentRate.toFixed(2);
                updateRoadStats();
                showNotification('Road data collected');
                console.log('IoT Road Data:', simulatedData);
            })
            .catch(() => showNotification('Error: Enable location', true));
    }

    function updateRoadStats() {
        elements.trafficDensity.textContent = roadStats.trafficDensity || 'N/A';
        elements.avgSpeed.textContent = roadStats.avgSpeed || 'N/A';
        elements.incidentRate.textContent = roadStats.incidentRate || 'N/A';
    }

    function fetchAndDisplayWeather(lat, lon) {
        if (!lat || !lon) {
            getCurrentPosition()
                .then(position => fetchWeatherFromAPIs(position.coords.latitude, position.coords.longitude))
                .catch(() => fetchWeatherFromAPIs(51.505, -0.09)); // Fallback to London
        } else {
            fetchWeatherFromAPIs(lat, lon);
        }
    }

    async function fetchWeatherFromAPIs(lat, lon) {
        if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
            showNotification('Invalid coordinates', true);
            return;
        }

        try {
            // Fetch from OpenWeatherMap
            const openWeatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`);
            if (!openWeatherResponse.ok) {
                throw new Error(`OpenWeatherMap error: ${openWeatherResponse.status}`);
            }
            const openWeatherData = await openWeatherResponse.json();

            // Fetch from Open-Meteo (no API key required)
            const openMeteoResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode`);
            if (!openMeteoResponse.ok) {
                throw new Error(`Open-Meteo error: ${openMeteoResponse.status}`);
            }
            const openMeteoData = await openMeteoResponse.json();

            // Merge data
            weatherData.temp = openWeatherData.main.temp; // OpenWeatherMap for temp
            weatherData.condition = openWeatherData.weather[0].description; // OpenWeatherMap for condition
            weatherData.wind = openWeatherData.wind.speed; // OpenWeatherMap for wind
            weatherData.humidity = openMeteoData.current.relative_humidity_2m; // Open-Meteo for humidity

            // Update UI
            elements.weatherTemp.textContent = weatherData.temp;
            elements.weatherCondition.textContent = weatherData.condition;
            elements.weatherWind.textContent = weatherData.wind;
            elements.weatherHumidity.textContent = weatherData.humidity;
            showNotification('Weather updated from dual APIs');
        } catch (error) {
            let errorMessage = 'Weather fetch error';
            if (error.message.includes('401')) errorMessage = 'Invalid OpenWeatherMap API key';
            else if (error.message.includes('429')) errorMessage = 'API rate limit exceeded';
            else if (error.message.includes('network')) errorMessage = 'Network error';
            showNotification(errorMessage, true);
            console.error('Weather fetch error:', error);

            // Fallback to default values if both APIs fail
            elements.weatherTemp.textContent = 'N/A';
            elements.weatherCondition.textContent = 'N/A';
            elements.weatherWind.textContent = 'N/A';
            elements.weatherHumidity.textContent = 'N/A';
        }
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
    const trafficAlerts = ["Heavy congestion on I-95", "Accident on Main St", "Road work on Hwy 101"];
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
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`);
        if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
        const data = await response.json();
        const weather = data.weather[0].main.toLowerCase();
        if (weather.includes('rain') || weather.includes('snow') || data.wind.speed > 15) {
            const weatherIncident = {
                type: 'weather',
                description: `${data.weather[0].description} (Temp: ${data.main.temp}°C, Wind: ${data.wind.speed} m/s)`,
                lat, lng: lon,
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
    status.textContent = recentHazards > 5 ? 'High Risk Area' : recentHazards > 0 ? 'Moderate Risk' : 'Safe Conditions';
    status.style.color = recentHazards > 5 ? '#e74c3c' : recentHazards > 0 ? '#f1c40f' : '#27ae60';
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
    v2vMessages.push({ text: message, timestamp: new Date().toLocaleTimeString(), sender: 'You' });
    messagesDiv.innerHTML = v2vMessages.map(msg => `<p>${msg.sender}: ${msg.text} <small>(${msg.timestamp})</small></p>`).join('');
    document.getElementById('v2v-input').value = '';
    showNotification('Message sent to nearby vehicles');
    console.log('IoT V2V Broadcast:', message);
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