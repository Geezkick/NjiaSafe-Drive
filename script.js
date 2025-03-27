// Constants and Globals
const OPENWEATHERMAP_API_KEY = 'your_openweathermap_api_key_here';
let map, markersLayer;
let userPlan = localStorage.getItem('userPlan') || 'free';
let v2vDailyCount = parseInt(localStorage.getItem('v2vDailyCount')) || 0;
let lastResetDate = localStorage.getItem('lastResetDate') || new Date().toDateString();

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    initializeThemeToggle();
    initializeMap();
    resetV2VCountIfNeeded();
    if (page === 'index.html') initializeHome();
    else if (page === 'navigation.html') initializeNavigation();
    else if (page === 'report.html') initializeReport();
    simulateLiveData();
});

// Theme Toggle
function initializeThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;
    const body = document.body;
    body.dataset.theme = localStorage.getItem('theme') || 'dark';
    toggleBtn.textContent = body.dataset.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    toggleBtn.addEventListener('click', () => {
        body.dataset.theme = body.dataset.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', body.dataset.theme);
        toggleBtn.textContent = body.dataset.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    });
}

// Map Initialization
function initializeMap() {
    const mapElement = document.getElementById('map');
    if (mapElement && !map) {
        map = L.map('map').setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);
        loadIncidentsOnMap();
        updateSafetyStatus();
    }
}

// Simulate Live Data
function simulateLiveData() {
    setInterval(() => {
        const v2vCount = document.getElementById('v2v-count');
        const v2vSignal = document.getElementById('v2v-signal');
        if (v2vCount) v2vCount.textContent = Math.floor(Math.random() * 15) + 3;
        if (v2vSignal) v2vSignal.textContent = `${Math.floor(Math.random() * 90) + 10}%`;
    }, 10000);
}

// Reset V2V Count
function resetV2VCountIfNeeded() {
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
        v2vDailyCount = 0;
        localStorage.setItem('v2vDailyCount', v2vDailyCount);
        localStorage.setItem('lastResetDate', today);
    }
}

// Home Page with Radial Menu
function initializeHome() {
    const menuToggle = document.getElementById('menu-toggle');
    const menuItems = document.getElementById('menu-items');
    const radialMenu = document.getElementById('radial-menu');
    const popup = document.getElementById('feature-popup');
    const popupClose = document.getElementById('popup-close');
    const popupBody = document.getElementById('popup-body');
    const subscriptionBtn = document.getElementById('subscription-btn');
    const subModal = document.getElementById('subscription-modal');
    const closeModal = document.querySelector('.close-modal');
    const exitBtn = document.getElementById('exit-btn');

    menuToggle.addEventListener('click', () => {
        menuItems.classList.toggle('active');
        animateRadialMenu();
    });

    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const feature = btn.dataset.feature;
            showFeaturePopup(feature);
            menuItems.classList.remove('active');
            radialMenu.classList.add('hidden'); // Hide menu when pop-up opens
        });
    });

    popupClose.addEventListener('click', () => {
        popup.classList.remove('active');
        radialMenu.classList.remove('hidden'); // Show menu when pop-up closes
    });
    subscriptionBtn.addEventListener('click', () => subModal.style.display = 'block');
    closeModal.addEventListener('click', () => subModal.style.display = 'none');
    exitBtn.addEventListener('click', () => window.location.href = 'https://www.google.com');
    document.querySelectorAll('.subscribe-btn').forEach(btn => btn.addEventListener('click', () => subscribe(btn.dataset.plan)));

    getCurrentPosition()
        .then(position => {
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 13);
            updateSafetyStatus();
        });
}

function animateRadialMenu() {
    const items = document.querySelectorAll('.menu-btn');
    const angleStep = 360 / items.length;
    items.forEach((item, index) => {
        const angle = index * angleStep; // Expand rightward from left-middle
        const radius = 100;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        item.style.transform = `translate(${x}px, ${y}px)`;
    });
}

function showFeaturePopup(feature) {
    const popup = document.getElementById('feature-popup');
    const popupBody = document.getElementById('popup-body');
    popupBody.innerHTML = '';

    switch (feature) {
        case 'map':
            popupBody.innerHTML = '<h3>Interactive Map</h3><p>View real-time traffic and incidents.</p>';
            break;
        case 'v2v':
            popupBody.innerHTML = `
                <h3>Vehicle-to-Vehicle</h3>
                <div id="v2v-messages"></div>
                <input type="text" id="v2v-input" placeholder="Message nearby vehicles">
                <button id="v2v-send" class="action-btn">Send</button>
                <div class="v2v-stats">
                    <p>Connected: <span id="v2v-count">0</span></p>
                    <p>Signal: <span id="v2v-signal">N/A</span></p>
                </div>
            `;
            loadV2VMessages();
            document.getElementById('v2v-send').addEventListener('click', () => {
                if (userPlan === 'free' && v2vDailyCount >= 5) {
                    showNotification('Upgrade to Pro for unlimited V2V messages', true);
                    document.getElementById('subscription-modal').style.display = 'block';
                } else {
                    sendV2VMessage(document.getElementById('v2v-input').value, document.getElementById('v2v-messages'));
                    v2vDailyCount++;
                    localStorage.setItem('v2vDailyCount', v2vDailyCount);
                }
            });
            break;
        case 'weather':
            popupBody.innerHTML = `
                <h3>Weather Updates</h3>
                <div id="weather-info">
                    <p>Temp: <span id="weather-temp">N/A</span>°C</p>
                    <p>Condition: <span id="weather-condition">N/A</span></p>
                    <p>Wind: <span id="weather-wind">N/A</span> m/s</p>
                    <p>Humidity: <span id="weather-humidity">N/A</span>%</p>
                    <p>Precip: <span id="weather-precip">N/A</span> mm</p>
                </div>
                <button id="refresh-weather-btn" class="action-btn">Update</button>
            `;
            fetchWeatherData();
            document.getElementById('refresh-weather-btn').addEventListener('click', fetchAndDisplayWeather);
            break;
        case 'navigation':
            popupBody.innerHTML = '<h3>Navigation</h3><p>Go to <a href="pages/navigation.html">Navigation Page</a>.</p>';
            break;
        case 'report':
            popupBody.innerHTML = '<h3>Report</h3><p>Go to <a href="pages/report.html">Report Page</a>.</p>';
            break;
        case 'dashboard':
            popupBody.innerHTML = '<h3>Dashboard</h3><p>Go to <a href="pages/dashboard.html">Dashboard Page</a>.</p>';
            break;
        case 'security':
            popupBody.innerHTML = '<h3>Security</h3><p>Go to <a href="pages/security.html">Security Page</a>.</p>';
            break;
        case 'first-aid':
            popupBody.innerHTML = '<h3>First Aid</h3><p>Go to <a href="pages/first-aid.html">First Aid Page</a>.</p>';
            break;
        case 'hospitals':
            popupBody.innerHTML = '<h3>Hospitals</h3><p>Go to <a href="pages/hospitals.html">Hospitals Page</a>.</p>';
            break;
    }
    popup.classList.add('active');
}

function sendV2VMessage(message, messagesDiv) {
    const v2vMessages = JSON.parse(localStorage.getItem('v2vMessages')) || [];
    if (!message) return;
    const msg = { text: message, timestamp: new Date().toLocaleTimeString(), sender: 'You' };
    v2vMessages.push(msg);
    localStorage.setItem('v2vMessages', JSON.stringify(v2vMessages));
    messagesDiv.innerHTML = v2vMessages.map(m => `<p>${m.sender}: ${m.text} <small>(${m.timestamp})</small></p>`).join('');
    document.getElementById('v2v-input').value = '';
    showNotification('Message sent');
}

function loadV2VMessages() {
    const messagesDiv = document.getElementById('v2v-messages');
    if (!messagesDiv) return;
    const v2vMessages = JSON.parse(localStorage.getItem('v2vMessages')) || [];
    messagesDiv.innerHTML = v2vMessages.map(m => `<p>${m.sender}: ${m.text} <small>(${m.timestamp})</small></p>`).join('');
}

async function fetchWeatherData(lat = 51.505, lon = -0.09) {
    try {
        const position = await getCurrentPosition().catch(() => ({ coords: { latitude: lat, longitude: lon } }));
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`);
        if (!response.ok) throw new Error('Weather API failed');
        const data = await response.json();
        document.getElementById('weather-temp').textContent = data.main.temp.toFixed(1);
        document.getElementById('weather-condition').textContent = data.weather[0].description;
        document.getElementById('weather-wind').textContent = data.wind.speed.toFixed(1);
        document.getElementById('weather-humidity').textContent = data.main.humidity;
        document.getElementById('weather-precip').textContent = data.rain ? data.rain['1h'] : 0;
        showNotification('Weather updated');
    } catch (error) {
        console.error('Weather fetch error:', error);
        showNotification('Weather data unavailable', true);
    }
}

function subscribe(plan) {
    userPlan = plan;
    localStorage.setItem('userPlan', plan);
    document.getElementById('subscription-modal').style.display = 'none';
    v2vDailyCount = 0;
    localStorage.setItem('v2vDailyCount', v2vDailyCount);
    showNotification(`Subscribed to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`);
}

// Navigation Page (unchanged)
function initializeNavigation() {
    initializeMap();
    const elements = {
        shortestRouteBtn: document.getElementById('shortest-route-btn'),
        lessTrafficBtn: document.getElementById('less-traffic-btn'),
        safestRouteBtn: document.getElementById('safest-route-btn'),
        gasStationBtn: document.getElementById('gas-station-btn'),
        garageBtn: document.getElementById('garage-btn'),
        marketBtn: document.getElementById('market-btn'),
        subscriptionBtn: document.getElementById('subscription-btn'),
        subModal: document.getElementById('subscription-modal'),
        closeModal: document.querySelector('.close-modal')
    };

    elements.shortestRouteBtn.addEventListener('click', () => navigate('shortest'));
    elements.lessTrafficBtn.addEventListener('click', () => navigate('less-traffic'));
    elements.safestRouteBtn.addEventListener('click', () => navigate('safest'));
    elements.gasStationBtn.addEventListener('click', () => findNearest('gas_station'));
    elements.garageBtn.addEventListener('click', () => findNearest('garage'));
    elements.marketBtn.addEventListener('click', () => findNearest('supermarket'));
    elements.subscriptionBtn.addEventListener('click', () => elements.subModal.style.display = 'block');
    elements.closeModal.addEventListener('click', () => elements.subModal.style.display = 'none');

    getCurrentPosition()
        .then(position => {
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 13);
            loadIncidentsOnMap();
        });
}

async function navigate(type) {
    if (userPlan !== 'premium') {
        showNotification('Upgrade to Premium for navigation', true);
        document.getElementById('subscription-modal').style.display = 'block';
        return;
    }
    try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 13);
        markersLayer.clearLayers();
        const destination = [latitude + 0.05, longitude + 0.05];
        let routePoints;
        switch (type) {
            case 'shortest':
                routePoints = [[latitude, longitude], destination];
                break;
            case 'less-traffic':
                routePoints = [[latitude, longitude], [latitude + 0.02, longitude + 0.02], destination];
                break;
            case 'safest':
                routePoints = [[latitude, longitude], [latitude + 0.03, longitude - 0.03], destination];
                break;
        }
        L.polyline(routePoints, { color: '#00cc99' }).addTo(markersLayer);
        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} route calculated`);
    } catch (error) {
        showNotification('Location access required', true);
    }
}

async function findNearest(type) {
    if (userPlan !== 'premium') {
        showNotification('Upgrade to Premium for this feature', true);
        document.getElementById('subscription-modal').style.display = 'block';
        return;
    }
    try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 13);
        markersLayer.clearLayers();
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${type}&format=json&limit=3&lat=${latitude}&lon=${longitude}`);
        if (!response.ok) throw new Error('Nominatim API failed');
        const locations = await response.json();
        locations.forEach(loc => {
            L.marker([loc.lat, loc.lon]).bindPopup(loc.display_name).addTo(markersLayer);
        });
        showNotification(`Nearest ${type.replace('_', ' ')}s located`);
    } catch (error) {
        showNotification('Location access required', true);
    }
}

// Report Page (unchanged)
function initializeReport() {
    const form = document.getElementById('incident-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('incident-type').value;
        const description = document.getElementById('description').value;
        if (!type || !description) return;
        try {
            const position = await getCurrentPosition();
            const incident = { type, description, lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() };
            const incidents = JSON.parse(localStorage.getItem('incidents')) || [];
            incidents.push(incident);
            localStorage.setItem('incidents', JSON.stringify(incidents));
            showNotification(`Reported: ${type}`);
            if (type === 'ambulance' || type === 'first-aid') {
                const securityEvents = JSON.parse(localStorage.getItem('securityEvents')) || [];
                securityEvents.push({ type: `${type.toUpperCase()} REQUEST`, lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() });
                localStorage.setItem('securityEvents', JSON.stringify(securityEvents));
                showNotification(`${type.toUpperCase()} service dispatched`);
            }
            form.reset();
        } catch (error) {
            showNotification('Enable location services', true);
        }
    });

    document.getElementById('emergency-btn').addEventListener('click', () => {
        if (confirm('Send SOS?')) {
            const btn = document.getElementById('emergency-btn');
            btn.classList.add('blinking');
            getCurrentPosition()
                .then(position => {
                    const event = { type: 'Emergency SOS', lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() };
                    const securityEvents = JSON.parse(localStorage.getItem('securityEvents')) || [];
                    securityEvents.push(event);
                    localStorage.setItem('securityEvents', JSON.stringify(securityEvents));
                    showNotification(`SOS sent from ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
                    setTimeout(() => btn.classList.remove('blinking'), 5000);
                })
                .catch(() => {
                    showNotification('Location required for SOS', true);
                    setTimeout(() => btn.classList.remove('blinking'), 5000);
                });
        }
    });
}

// Helper Functions
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

function loadIncidentsOnMap() {
    if (!markersLayer) return;
    markersLayer.clearLayers();
    const incidents = JSON.parse(localStorage.getItem('incidents')) || [];
    incidents.forEach(incident => {
        const marker = L.marker([incident.lat, incident.lng])
            .bindPopup(`<b>${incident.type}</b><br>${incident.description}<br>${new Date(incident.timestamp).toLocaleString()}`);
        markersLayer.addLayer(marker);
    });
}

function updateSafetyStatus() {
    const status = document.getElementById('safety-status');
    if (!status) return;
    const incidents = JSON.parse(localStorage.getItem('incidents')) || [];
    const recentHazards = incidents.filter(i => new Date(i.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
    status.textContent = recentHazards > 5 ? 'High Risk' : recentHazards > 0 ? 'Moderate Risk' : 'Low Risk';
    status.style.backgroundColor = recentHazards > 5 ? '#ff4d4d' : recentHazards > 0 ? '#00b4d8' : '#00cc99';
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.style.backgroundColor = isError ? '#ff4d4d' : '#00cc99';
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 3000);
}