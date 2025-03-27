// Constants
const OPENWEATHERMAP_API_KEY = 'your_openweathermap_api_key_here'; // Replace with your key
const incidents = JSON.parse(localStorage.getItem('incidents')) || [];
const v2vMessages = JSON.parse(localStorage.getItem('v2vMessages')) || [];
const roadStats = { trafficDensity: 0, avgSpeed: 0, incidentRate: 0 };
const weatherData = { temp: null, condition: null, wind: null, humidity: null, precip: null };
const securityEvents = JSON.parse(localStorage.getItem('securityEvents')) || [];

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
    simulateLiveData();
});

// Theme Toggle
function initializeThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    toggleBtn.addEventListener('click', () => {
        body.dataset.theme = body.dataset.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', body.dataset.theme);
        toggleBtn.textContent = body.dataset.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    });
    body.dataset.theme = localStorage.getItem('theme') || 'dark';
    toggleBtn.textContent = body.dataset.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

// Simulate Live Data (Bonus Feature)
function simulateLiveData() {
    setInterval(() => {
        const v2vCount = document.getElementById('v2v-count');
        if (v2vCount) v2vCount.textContent = Math.floor(Math.random() * 20) + 5;
        const v2vSignal = document.getElementById('v2v-signal');
        if (v2vSignal) v2vSignal.textContent = `${Math.floor(Math.random() * 100)}%`;
    }, 5000);
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
        trafficVisual: document.getElementById('traffic-visual'),
        weatherSection: document.getElementById('weather-section'),
        refreshWeatherBtn: document.getElementById('refresh-weather-btn'),
        weatherTemp: document.getElementById('weather-temp'),
        weatherCondition: document.getElementById('weather-condition'),
        weatherWind: document.getElementById('weather-wind'),
        weatherHumidity: document.getElementById('weather-humidity'),
        weatherPrecip: document.getElementById('weather-precip')
    };
    let visibility = { map: false, v2v: false, roadData: false, weather: false };

    elements.toggleBtn.addEventListener('click', () => toggleSection('map', elements.mapContainer, elements.toggleBtn, () => {
        map.invalidateSize();
        loadIncidentsOnMap();
        updateSafetyStatus();
    }, visibility));
    elements.safetyRulesBtn.addEventListener('click', () => elements.modal.style.display = 'block');
    elements.securityBtn.addEventListener('click', () => window.location.href = 'security.html');
    elements.v2vBtn.addEventListener('click', () => toggleSection('v2v', elements.v2vSection, elements.v2vBtn, loadV2VMessages, visibility));
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
            loadV2VMessages();
        })
        .catch(() => {
            console.log('Geolocation failed, using default');
            fetchAndDisplayWeather(51.505, -0.09);
        });

    function toggleSection(type, container, btn, callback, vis) {
        vis[type] = !vis[type];
        container.classList.toggle('visible', vis[type]);
        btn.textContent = vis[type] ? type.toUpperCase() : type.toUpperCase();
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
                elements.trafficVisual.style.setProperty('--traffic-width', `${simulatedData.trafficDensity}%`);
                showNotification('Road data updated');
            })
            .catch(() => showNotification('Error: Enable location', true));
    }

    function updateRoadStats() {
        elements.trafficDensity.textContent = roadStats.trafficDensity || 'N/A';
        elements.avgSpeed.textContent = roadStats.avgSpeed || 'N/A';
        elements.incidentRate.textContent = roadStats.incidentRate || 'N/A';
        elements.trafficVisual.style.setProperty('--traffic-width', `${roadStats.trafficDensity || 0}%`);
    }

    function fetchAndDisplayWeather(lat, lon) {
        if (!lat || !lon) {
            getCurrentPosition()
                .then(position => fetchWeatherFromAPIs(position.coords.latitude, position.coords.longitude))
                .catch(() => fetchWeatherFromAPIs(51.505, -0.09));
        } else {
            fetchWeatherFromAPIs(lat, lon);
        }
    }

    async function fetchWeatherFromAPIs(lat, lon) {
        try {
            const openWeatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`);
            if (!openWeatherResponse.ok) throw new Error(`OpenWeatherMap: ${openWeatherResponse.status}`);
            const openWeatherData = await openWeatherResponse.json();

            const openMeteoResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation`);
            if (!openMeteoResponse.ok) throw new Error(`Open-Meteo: ${openMeteoResponse.status}`);
            const openMeteoData = await openMeteoResponse.json();

            weatherData.temp = openWeatherData.main.temp;
            weatherData.condition = openWeatherData.weather[0].description;
            weatherData.wind = openWeatherData.wind.speed;
            weatherData.humidity = openMeteoData.current.relative_humidity_2m;
            weatherData.precip = openMeteoData.current.precipitation;

            elements.weatherTemp.textContent = weatherData.temp;
            elements.weatherCondition.textContent = weatherData.condition;
            elements.weatherWind.textContent = weatherData.wind;
            elements.weatherHumidity.textContent = weatherData.humidity;
            elements.weatherPrecip.textContent = weatherData.precip;
            showNotification('Weather refreshed');
        } catch (error) {
            showNotification(`Weather fetch error: ${error.message}`, true);
            console.error(error);
            Object.keys(weatherData).forEach(key => elements[`weather-${key}`].textContent = 'N/A');
        }
    }

    function loadV2VMessages() {
        elements.v2vMessagesDiv.innerHTML = v2vMessages.map(msg => `<p>${msg.sender}: ${msg.text} <small>(${msg.timestamp})</small></p>`).join('');
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
            showNotification('Error: Enable location', true);
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
    const securityEventsList = document.getElementById('security-events');
    const sirenAudio = document.getElementById('siren-audio');
    const trafficAlerts = ["Heavy congestion on I-95", "Accident on Main St", "Road work on Hwy 101"];

    emergencyBtn.addEventListener('click', () => {
        if (confirm('Send emergency SOS?')) {
            getCurrentPosition()
                .then(position => {
                    const event = { type: 'SOS', lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() };
                    securityEvents.push(event);
                    saveSecurityEvents();
                    showNotification(`SOS sent from ${position.coords.latitude}, ${position.coords.longitude}`);
                    sirenAudio.play();
                    updateSecurityLog();
                })
                .catch(() => showNotification('Error: Enable location', true));
        }
    });

    trafficAlertBtn.addEventListener('click', () => {
        trafficAlertsDiv.style.display = trafficAlertsDiv.style.display === 'block' ? 'none' : 'block';
        if (trafficAlertsDiv.style.display === 'block') {
            trafficAlertsDiv.innerHTML = '<h4>Live Traffic Updates</h4>' + trafficAlerts.map(alert => `<p>${alert}</p>`).join('');
        }
    });

    updateSecurityLog();
    setInterval(() => {
        const randomEvent = { type: 'Patrol Check', lat: 51.5 + Math.random(), lng: -0.09 + Math.random(), timestamp: new Date().toISOString() };
        securityEvents.push(randomEvent);
        saveSecurityEvents();
        updateSecurityLog();
    }, 30000); // Simulate security events every 30s

    function updateSecurityLog() {
        securityEventsList.innerHTML = securityEvents.slice(-10).map(event => `<li>${event.type} at ${event.lat.toFixed(4)}, ${event.lng.toFixed(4)} - ${new Date(event.timestamp).toLocaleString()}</li>`).join('');
    }
}

// Helper Functions
function getCurrentPosition() {
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
}

function saveIncidents() {
    localStorage.setItem('incidents', JSON.stringify(incidents));
}

function saveV2VMessages() {
    localStorage.setItem('v2vMessages', JSON.stringify(v2vMessages));
}

function saveSecurityEvents() {
    localStorage.setItem('securityEvents', JSON.stringify(securityEvents));
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
        .filter(incident => activeFilters.length === 0 || activeFilters.includes(incident.type))
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
        if (!response.ok) throw new Error(`Weather API: ${response.status}`);
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
    status.textContent = recentHazards > 5 ? 'High Risk Zone' : recentHazards > 0 ? 'Moderate Risk' : 'Safe Zone';
    status.style.backgroundColor = recentHazards > 5 ? '#ff1744' : recentHazards > 0 ? '#6200ea' : '#00c853';
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.backgroundColor = isError ? '#ff1744' : '#00c853';
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 4000);
}

function sendV2VMessage(message, messagesDiv) {
    if (!message.trim()) return;
    const msg = { text: message, timestamp: new Date().toLocaleTimeString(), sender: 'You' };
    v2vMessages.push(msg);
    saveV2VMessages();
    messagesDiv.innerHTML = v2vMessages.map(m => `<p>${m.sender}: ${m.text} <small>(${m.timestamp})</small></p>`).join('');
    document.getElementById('v2v-input').value = '';
    showNotification('Message broadcasted');
}

// URL Parameters
if (window.location.search && map) {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('lat')), lng = parseFloat(params.get('lng'));
    if (lat && lng) {
        map.setView([lat, lng], 15);
        fetchWeatherData(lat, lng);
        document.getElementById('map-container').classList.add('visible');
        document.getElementById('toggle-map-btn').textContent = 'MAP';
        map.invalidateSize();
        loadIncidentsOnMap();
        updateSafetyStatus();
    }
}