// Constants
const OPENWEATHERMAP_API_KEY = 'your_openweathermap_api_key_here'; // Replace with your OpenWeatherMap API key
const incidents = JSON.parse(localStorage.getItem('incidents')) || [];
const v2vMessages = JSON.parse(localStorage.getItem('v2vMessages')) || [];
const roadStats = { trafficDensity: 0, avgSpeed: 0, incidentRate: 0 };
const weatherData = { temp: null, condition: null, wind: null, humidity: null, precip: null };
const securityEvents = JSON.parse(localStorage.getItem('securityEvents')) || [];
const socialPosts = JSON.parse(localStorage.getItem('socialPosts')) || [];
const groups = JSON.parse(localStorage.getItem('groups')) || [];
const scheduledPosts = JSON.parse(localStorage.getItem('scheduledPosts')) || [];
let userPlan = localStorage.getItem('userPlan') || 'free'; // Default to free
let v2vDailyCount = parseInt(localStorage.getItem('v2vDailyCount')) || 0;
let lastResetDate = localStorage.getItem('lastResetDate') || new Date().toDateString();

// Map Initialization
let map, markersLayer;
function initializeMap() {
    const mapElement = document.getElementById('map');
    if (mapElement) {
        try {
            map = L.map('map').setView([51.505, -0.09], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            markersLayer = L.layerGroup().addTo(map);
            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Map initialization failed:', error);
        }
    }
}

// Page Load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    const page = window.location.pathname.split('/').pop() || 'index.html';
    initializeThemeToggle();
    initializeMap();
    resetV2VCountIfNeeded();
    switch (page) {
        case 'index.html':
            initializeHome();
            break;
        case 'report.html':
            initializeReport();
            break;
        case 'dashboard.html':
            initializeDashboard();
            break;
        case 'security.html':
            initializeSecurity();
            break;
        default:
            console.warn('Unknown page:', page);
    }
    simulateLiveData();
    checkScheduledPosts();
});

// Theme Toggle
function initializeThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;
    const body = document.body;
    toggleBtn.addEventListener('click', () => {
        body.dataset.theme = body.dataset.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', body.dataset.theme);
        toggleBtn.textContent = body.dataset.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
        console.log('Theme toggled to:', body.dataset.theme);
    });
    body.dataset.theme = localStorage.getItem('theme') || 'dark';
    toggleBtn.textContent = body.dataset.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

// Simulate Live Data
function simulateLiveData() {
    setInterval(() => {
        const v2vCount = document.getElementById('v2v-count');
        const v2vSignal = document.getElementById('v2v-signal');
        if (v2vCount) v2vCount.textContent = Math.floor(Math.random() * 15) + 3;
        if (v2vSignal) v2vSignal.textContent = `${Math.floor(Math.random() * 90) + 10}%`;
        console.log('Simulated V2V data updated');
    }, 10000);
}

// Reset V2V Count Daily
function resetV2VCountIfNeeded() {
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
        v2vDailyCount = 0;
        localStorage.setItem('v2vDailyCount', v2vDailyCount);
        localStorage.setItem('lastResetDate', today);
        console.log('V2V count reset for new day');
    }
}

// Home Page
function initializeHome() {
    console.log('Initializing Home page');
    const elements = {
        toggleBtn: document.getElementById('toggle-map-btn'),
        mapContainer: document.getElementById('map-container'),
        safetyRulesBtn: document.getElementById('safety-rules-btn'),
        securityBtn: document.getElementById('security-btn'),
        v2vBtn: document.getElementById('v2v-btn'),
        roadDataBtn: document.getElementById('road-data-btn'),
        weatherBtn: document.getElementById('weather-btn'),
        socialFeedBtn: document.getElementById('social-feed-btn'),
        groupsBtn: document.getElementById('groups-btn'),
        scheduleBtn: document.getElementById('schedule-btn'),
        analyticsBtn: document.getElementById('analytics-btn'),
        modal: document.getElementById('safety-rules-modal'),
        subModal: document.getElementById('subscription-modal'),
        closeModal: document.querySelectorAll('.close-modal'),
        subscriptionBtn: document.getElementById('subscription-btn'),
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
        weatherPrecip: document.getElementById('weather-precip'),
        socialFeedSection: document.getElementById('social-feed-section'),
        socialFeed: document.getElementById('social-feed'),
        socialPostBtn: document.getElementById('social-post-btn'),
        socialPostInput: document.getElementById('social-post-input'),
        socialPostImage: document.getElementById('social-post-image'),
        groupsSection: document.getElementById('groups-section'),
        groupList: document.getElementById('group-list'),
        groupInput: document.getElementById('group-input'),
        groupJoinBtn: document.getElementById('group-join-btn'),
        scheduleSection: document.getElementById('schedule-section'),
        scheduleText: document.getElementById('schedule-text'),
        scheduleTime: document.getElementById('schedule-time'),
        schedulePostBtn: document.getElementById('schedule-post-btn'),
        scheduledPosts: document.getElementById('scheduled-posts'),
        analyticsSection: document.getElementById('analytics-section'),
        analyticsPosts: document.getElementById('analytics-posts'),
        analyticsMembers: document.getElementById('analytics-members'),
        analyticsEngagement: document.getElementById('analytics-engagement'),
        refreshAnalyticsBtn: document.getElementById('refresh-analytics-btn')
    };

    let visibility = { map: false, v2v: false, roadData: false, weather: false, socialFeed: false, groups: false, schedule: false, analytics: false };

    // Event Listeners
    if (elements.toggleBtn) elements.toggleBtn.addEventListener('click', () => toggleSection('map', elements.mapContainer, elements.toggleBtn, () => {
        if (map) { map.invalidateSize(); loadIncidentsOnMap(); updateSafetyStatus(); }
    }, visibility));
    if (elements.safetyRulesBtn) elements.safetyRulesBtn.addEventListener('click', () => elements.modal && (elements.modal.style.display = 'block'));
    if (elements.securityBtn) elements.securityBtn.addEventListener('click', () => window.location.href = 'security.html');
    if (elements.v2vBtn) elements.v2vBtn.addEventListener('click', () => toggleSection('v2v', elements.v2vSection, elements.v2vBtn, loadV2VMessages, visibility));
    if (elements.roadDataBtn) elements.roadDataBtn.addEventListener('click', () => toggleSection('road-data', elements.roadDataSection, elements.roadDataBtn, updateRoadStats, visibility));
    if (elements.weatherBtn) elements.weatherBtn.addEventListener('click', () => toggleSection('weather', elements.weatherSection, elements.weatherBtn, fetchAndDisplayWeather, visibility));
    if (elements.socialFeedBtn) elements.socialFeedBtn.addEventListener('click', () => toggleSection('socialFeed', elements.socialFeedSection, elements.socialFeedBtn, loadSocialFeed, visibility, 'pro'));
    if (elements.groupsBtn) elements.groupsBtn.addEventListener('click', () => toggleSection('groups', elements.groupsSection, elements.groupsBtn, loadGroups, visibility, 'pro'));
    if (elements.scheduleBtn) elements.scheduleBtn.addEventListener('click', () => toggleSection('schedule', elements.scheduleSection, elements.scheduleBtn, loadScheduledPosts, visibility, 'premium'));
    if (elements.analyticsBtn) elements.analyticsBtn.addEventListener('click', () => toggleSection('analytics', elements.analyticsSection, elements.analyticsBtn, updateAnalytics, visibility, 'premium'));
    if (elements.subscriptionBtn) elements.subscriptionBtn.addEventListener('click', () => elements.subModal && (elements.subModal.style.display = 'block'));
    elements.closeModal.forEach(btn => btn.addEventListener('click', () => {
        if (elements.modal) elements.modal.style.display = 'none';
        if (elements.subModal) elements.subModal.style.display = 'none';
    }));
    if (elements.v2vSend) elements.v2vSend.addEventListener('click', () => {
        if (userPlan === 'free' && v2vDailyCount >= 5) {
            showNotification('Upgrade to Pro for unlimited V2V messages', true);
            elements.subModal.style.display = 'block';
        } else {
            sendV2VMessage(elements.v2vInput?.value, elements.v2vMessagesDiv);
            v2vDailyCount++;
            localStorage.setItem('v2vDailyCount', v2vDailyCount);
        }
    });
    if (elements.collectDataBtn) elements.collectDataBtn.addEventListener('click', collectRoadData);
    if (elements.refreshWeatherBtn) elements.refreshWeatherBtn.addEventListener('click', fetchAndDisplayWeather);
    if (elements.socialPostBtn) elements.socialPostBtn.addEventListener('click', postToSocialFeed);
    if (elements.groupJoinBtn) elements.groupJoinBtn.addEventListener('click', joinOrCreateGroup);
    if (elements.schedulePostBtn) elements.schedulePostBtn.addEventListener('click', schedulePost);
    if (elements.refreshAnalyticsBtn) elements.refreshAnalyticsBtn.addEventListener('click', updateAnalytics);
    document.querySelectorAll('.subscribe-btn').forEach(btn => btn.addEventListener('click', () => subscribe(btn.dataset.plan)));

    // Initial Load
    getCurrentPosition()
        .then(position => {
            const { latitude, longitude } = position.coords;
            if (map) map.setView([latitude, longitude], 13);
            fetchWeatherData(latitude, longitude);
            updateRoadStats();
            fetchAndDisplayWeather();
            loadV2VMessages();
            loadSocialFeed();
            loadGroups();
            loadScheduledPosts();
            updateAnalytics();
            console.log('Home initialized with geolocation');
        })
        .catch(() => {
            console.warn('Geolocation unavailable, using default');
            fetchAndDisplayWeather();
        });

    function toggleSection(type, container, btn, callback, vis, requiredPlan = 'free') {
        if (!container || !btn) return;
        if ((requiredPlan === 'pro' && userPlan === 'free') || (requiredPlan === 'premium' && (userPlan === 'free' || userPlan === 'pro'))) {
            showNotification(`Upgrade to ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan to access this feature`, true);
            elements.subModal.style.display = 'block';
            return;
        }
        vis[type] = !vis[type];
        container.classList.toggle('visible', vis[type]);
        btn.textContent = vis[type] ? type.toUpperCase() : type.toUpperCase();
        if (vis[type] && callback) callback();
        console.log(`${type} section toggled: ${vis[type]}`);
    }

    function collectRoadData() {
        getCurrentPosition()
            .then(position => {
                roadStats.trafficDensity = Math.floor(Math.random() * 100);
                roadStats.avgSpeed = Math.floor(Math.random() * 80) + 20;
                roadStats.incidentRate = (incidents.length / 24).toFixed(2);
                updateRoadStats();
                if (elements.trafficVisual) elements.trafficVisual.style.width = `${roadStats.trafficDensity}%`;
                showNotification('Road data refreshed');
            })
            .catch(() => showNotification('Location access required', true));
    }

    function updateRoadStats() {
        if (elements.trafficDensity) elements.trafficDensity.textContent = roadStats.trafficDensity || 'N/A';
        if (elements.avgSpeed) elements.avgSpeed.textContent = roadStats.avgSpeed || 'N/A';
        if (elements.incidentRate) elements.incidentRate.textContent = roadStats.incidentRate || 'N/A';
    }

    async function fetchAndDisplayWeather(lat = 51.505, lon = -0.09) {
        try {
            const position = await getCurrentPosition().catch(() => ({ coords: { latitude: lat, longitude: lon } }));
            lat = position.coords.latitude;
            lon = position.coords.longitude;
            const openWeatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`);
            if (!openWeatherResponse.ok) throw new Error('OpenWeatherMap API failed');
            const openWeatherData = await openWeatherResponse.json();

            const openMeteoResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation`);
            if (!openMeteoResponse.ok) throw new Error('Open-Meteo API failed');
            const openMeteoData = await openMeteoResponse.json();

            weatherData.temp = openWeatherData.main.temp.toFixed(1);
            weatherData.condition = openWeatherData.weather[0].description;
            weatherData.wind = openWeatherData.wind.speed.toFixed(1);
            weatherData.humidity = openMeteoData.current.relative_humidity_2m;
            weatherData.precip = openMeteoData.current.precipitation.toFixed(1);

            if (elements.weatherTemp) elements.weatherTemp.textContent = weatherData.temp;
            if (elements.weatherCondition) elements.weatherCondition.textContent = weatherData.condition;
            if (elements.weatherWind) elements.weatherWind.textContent = weatherData.wind;
            if (elements.weatherHumidity) elements.weatherHumidity.textContent = weatherData.humidity;
            if (elements.weatherPrecip) elements.weatherPrecip.textContent = weatherData.precip;
            showNotification('Weather updated successfully');
        } catch (error) {
            console.error('Weather fetch error:', error);
            showNotification('Weather update failed. Using defaults.', true);
            Object.keys(weatherData).forEach(key => {
                if (elements[`weather-${key}`]) elements[`weather-${key}`].textContent = 'N/A';
            });
        }
    }

    function loadV2VMessages() {
        if (elements.v2vMessagesDiv) {
            elements.v2vMessagesDiv.innerHTML = v2vMessages.map(m => `<p>${m.sender}: ${m.text} <small>(${m.timestamp})</small></p>`).join('');
        }
    }

    function sendV2VMessage(message, messagesDiv) {
        if (!message || !messagesDiv) return;
        const msg = { text: message, timestamp: new Date().toLocaleTimeString(), sender: 'You' };
        v2vMessages.push(msg);
        localStorage.setItem('v2vMessages', JSON.stringify(v2vMessages));
        messagesDiv.innerHTML = v2vMessages.map(m => `<p>${m.sender}: ${m.text} <small>(${m.timestamp})</small></p>`).join('');
        elements.v2vInput.value = '';
        showNotification('Message sent to nearby vehicles');
    }

    function loadSocialFeed() {
        if (elements.socialFeed) {
            elements.socialFeed.innerHTML = socialPosts.map(post => `
                <p>${post.user}: ${post.text} <small>(${post.timestamp})</small>
                ${post.image ? `<img src="${post.image}" alt="Post Image">` : ''}</p>
            `).join('');
        }
    }

    function postToSocialFeed() {
        if (userPlan === 'free') {
            showNotification('Upgrade to Pro to post to the social feed', true);
            elements.subModal.style.display = 'block';
            return;
        }
        const text = elements.socialPostInput?.value;
        const file = elements.socialPostImage?.files[0];
        if (!text) {
            showNotification('Please enter a message', true);
            return;
        }
        const post = { user: 'You', text, timestamp: new Date().toLocaleString() };
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                post.image = reader.result;
                socialPosts.push(post);
                localStorage.setItem('socialPosts', JSON.stringify(socialPosts));
                loadSocialFeed();
                elements.socialPostInput.value = '';
                elements.socialPostImage.value = '';
                showNotification('Posted to social feed');
            };
            reader.readAsDataURL(file);
        } else {
            socialPosts.push(post);
            localStorage.setItem('socialPosts', JSON.stringify(socialPosts));
            loadSocialFeed();
            elements.socialPostInput.value = '';
            showNotification('Posted to social feed');
        }
    }

    function loadGroups() {
        if (elements.groupList) {
            elements.groupList.innerHTML = groups.map(group => `<li>${group.name} (${group.members} members)</li>`).join('');
        }
    }

    function joinOrCreateGroup() {
        if (userPlan === 'free') {
            showNotification('Upgrade to Pro to join or create groups', true);
            elements.subModal.style.display = 'block';
            return;
        }
        const name = elements.groupInput?.value;
        if (!name) {
            showNotification('Please enter a group name', true);
            return;
        }
        const existingGroup = groups.find(g => g.name === name);
        if (existingGroup) {
            existingGroup.members++;
        } else {
            groups.push({ name, members: 1 });
        }
        localStorage.setItem('groups', JSON.stringify(groups));
        loadGroups();
        elements.groupInput.value = '';
        showNotification(`Joined/Created group: ${name}`);
    }

    function loadScheduledPosts() {
        if (elements.scheduledPosts) {
            elements.scheduledPosts.innerHTML = scheduledPosts.map(post => `<li>${post.text} - ${new Date(post.time).toLocaleString()}</li>`).join('');
        }
    }

    function schedulePost() {
        if (userPlan !== 'premium') {
            showNotification('Upgrade to Premium to schedule posts', true);
            elements.subModal.style.display = 'block';
            return;
        }
        const text = elements.scheduleText?.value;
        const time = elements.scheduleTime?.value;
        if (!text || !time) {
            showNotification('Please enter text and time', true);
            return;
        }
        scheduledPosts.push({ text, time });
        localStorage.setItem('scheduledPosts', JSON.stringify(scheduledPosts));
        loadScheduledPosts();
        elements.scheduleText.value = '';
        elements.scheduleTime.value = '';
        showNotification('Post scheduled');
    }

    function checkScheduledPosts() {
        setInterval(() => {
            const now = new Date();
            scheduledPosts.forEach((post, index) => {
                if (new Date(post.time) <= now) {
                    socialPosts.push({ user: 'Scheduled', text: post.text, timestamp: now.toLocaleString() });
                    localStorage.setItem('socialPosts', JSON.stringify(socialPosts));
                    scheduledPosts.splice(index, 1);
                    localStorage.setItem('scheduledPosts', JSON.stringify(scheduledPosts));
                    loadSocialFeed();
                    loadScheduledPosts();
                    showNotification('Scheduled post published');
                }
            });
        }, 60000); // Check every minute
    }

    function updateAnalytics() {
        if (userPlan !== 'premium') {
            showNotification('Upgrade to Premium to view analytics', true);
            elements.subModal.style.display = 'block';
            return;
        }
        if (elements.analyticsPosts) elements.analyticsPosts.textContent = socialPosts.length;
        if (elements.analyticsMembers) elements.analyticsMembers.textContent = groups.reduce((sum, g) => sum + g.members, 0);
        if (elements.analyticsEngagement) elements.analyticsEngagement.textContent = ((socialPosts.length / (groups.length || 1)) * 10).toFixed(1);
        showNotification('Analytics updated');
    }

    function subscribe(plan) {
        userPlan = plan;
        localStorage.setItem('userPlan', plan);
        elements.subModal.style.display = 'none';
        v2vDailyCount = 0;
        localStorage.setItem('v2vDailyCount', v2vDailyCount);
        showNotification(`Subscribed to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`);
        console.log('User plan updated to:', userPlan);
    }
}

// Report Page
function initializeReport() {
    const form = document.getElementById('incident-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('incident-type')?.value;
        const description = document.getElementById('description')?.value;
        if (!type || !description) return;
        try {
            const position = await getCurrentPosition();
            const incident = { type, description, lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() };
            incidents.push(incident);
            localStorage.setItem('incidents', JSON.stringify(incidents));
            showNotification(`Incident reported: ${type}`);
            form.reset();
        } catch (error) {
            showNotification('Please enable location services', true);
        }
    });
}

// Dashboard Page
function initializeDashboard() {
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) searchBtn.addEventListener('click', searchLocation);
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
    const trafficAlerts = ["Congestion on I-95", "Accident reported on Main St", "Road work on Hwy 101"];

    if (emergencyBtn) {
        emergencyBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to send an SOS?')) {
                getCurrentPosition()
                    .then(position => {
                        const event = { type: 'Emergency SOS', lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() };
                        securityEvents.push(event);
                        localStorage.setItem('securityEvents', JSON.stringify(securityEvents));
                        showNotification(`SOS sent from ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
                        if (sirenAudio) sirenAudio.play().catch(() => console.error('Audio play failed'));
                        updateSecurityLog();
                    })
                    .catch(() => showNotification('Location access required for SOS', true));
            }
        });
    }

    if (trafficAlertBtn && trafficAlertsDiv) {
        trafficAlertBtn.addEventListener('click', () => {
            trafficAlertsDiv.style.display = trafficAlertsDiv.style.display === 'block' ? 'none' : 'block';
            if (trafficAlertsDiv.style.display === 'block') {
                trafficAlertsDiv.innerHTML = '<h4>Current Traffic Alerts</h4>' + trafficAlerts.map(alert => `<p>${alert}</p>`).join('');
            }
        });
    }

    updateSecurityLog();

    function updateSecurityLog() {
        if (securityEventsList) {
            securityEventsList.innerHTML = securityEvents.slice(-5).map(event => `<li>${event.type} at ${event.lat.toFixed(4)}, ${event.lng.toFixed(4)} - ${new Date(event.timestamp).toLocaleString()}</li>`).join('');
        }
    }
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

async function searchLocation() {
    const query = document.getElementById('location-search')?.value;
    if (!query) return;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
        const data = await response.json();
        if (data.length > 0) window.location.href = `index.html?lat=${data[0].lat}&lng=${data[0].lon}`;
        else showNotification('Location not found', true);
    } catch (error) {
        showNotification('Search failed', true);
    }
}

function updateSafetyStatus() {
    const status = document.getElementById('safety-status');
    if (!status) return;
    const recentHazards = incidents.filter(i => new Date(i.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
    status.textContent = recentHazards > 5 ? 'High Risk' : recentHazards > 0 ? 'Moderate Risk' : 'Low Risk';
    status.style.backgroundColor = recentHazards > 5 ? '#d63031' : recentHazards > 0 ? '#00b4d8' : '#00b894';
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.style.backgroundColor = isError ? '#d63031' : '#00b894';
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 3000);
    console.log('Notification:', message);
}

// URL Parameters
if (window.location.search && map) {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('lat')), lng = parseFloat(params.get('lng'));
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], 15);
        fetchAndDisplayWeather(lat, lng);
        const mapContainer = document.getElementById('map-container');
        const toggleBtn = document.getElementById('toggle-map-btn');
        if (mapContainer && toggleBtn) {
            mapContainer.classList.add('visible');
            toggleBtn.textContent = 'MAP';
            map.invalidateSize();
            loadIncidentsOnMap();
            updateSafetyStatus();
        }
    }
}