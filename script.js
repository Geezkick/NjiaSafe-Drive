// Constants
const OPENWEATHERMAP_API_KEY = 'your_openweathermap_api_key_here'; // Replace with your key
const incidents = JSON.parse(localStorage.getItem('incidents')) || [];
const v2vMessages = JSON.parse(localStorage.getItem('v2vMessages')) || [];
const roadStats = { trafficDensity: 0, avgSpeed: 0, incidentRate: 0 };
const weatherData = { temp: null, condition: null, wind: null, humidity: null, precip: null };
const securityEvents = JSON.parse(localStorage.getItem('securityEvents')) || [];
const socialPosts = JSON.parse(localStorage.getItem('socialPosts')) || [];
const groups = JSON.parse(localStorage.getItem('groups')) || [];
const scheduledPosts = JSON.parse(localStorage.getItem('scheduledPosts')) || [];
let userPlan = localStorage.getItem('userPlan') || 'free';
let v2vDailyCount = parseInt(localStorage.getItem('v2vDailyCount')) || 0;
let lastResetDate = localStorage.getItem('lastResetDate') || new Date().toDateString();

// Map Initialization
let map, markersLayer, hospitalMap, hospitalMarkers;
function initializeMap() {
    const mapElement = document.getElementById('map');
    if (mapElement) {
        map = L.map('map').setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);
        console.log('Main map initialized');
    }
    const hospitalMapElement = document.getElementById('hospital-map');
    if (hospitalMapElement) {
        hospitalMap = L.map('hospital-map').setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(hospitalMap);
        hospitalMarkers = L.layerGroup().addTo(hospitalMap);
        console.log('Hospital map initialized');
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
        firstAidBtn: document.getElementById('first-aid-btn'),
        hospitalBtn: document.getElementById('hospital-btn'),
        modal: document.getElementById('safety-rules-modal'),
        subModal: document.getElementById('subscription-modal'),
        closeModal: document.querySelectorAll('.close-modal'),
        subscriptionBtn: document.getElementById('subscription-btn'),
        exitBtn: document.getElementById('exit-btn'),
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
        refreshAnalyticsBtn: document.getElementById('refresh-analytics-btn'),
        firstAidSection: document.getElementById('first-aid-section'),
        learnMoreBtn: document.getElementById('learn-more-btn'),
        hospitalSection: document.getElementById('hospital-section'),
        hospitalList: document.getElementById('hospital-list'),
        backButtons: document.querySelectorAll('.back-btn')
    };

    let visibility = { map: false, v2v: false, roadData: false, weather: false, socialFeed: false, groups: false, schedule: false, analytics: false, firstAid: false, hospital: false };

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
    if (elements.firstAidBtn) elements.firstAidBtn.addEventListener('click', () => toggleSection('firstAid', elements.firstAidSection, elements.firstAidBtn, null, visibility, 'premium'));
    if (elements.hospitalBtn) elements.hospitalBtn.addEventListener('click', () => toggleSection('hospital', elements.hospitalSection, elements.hospitalBtn, loadHospitals, visibility, 'premium'));
    if (elements.subscriptionBtn) elements.subscriptionBtn.addEventListener('click', () => elements.subModal && (elements.subModal.style.display = 'block'));
    if (elements.exitBtn) elements.exitBtn.addEventListener('click', () => window.location.href = 'https://www.google.com');
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
    if (elements.learnMoreBtn) elements.learnMoreBtn.addEventListener('click', () => window.open('https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/first-aid.html', '_blank'));
    document.querySelectorAll('.subscribe-btn').forEach(btn => btn.addEventListener('click', () => subscribe(btn.dataset.plan)));
    elements.backButtons.forEach(btn => btn.addEventListener('click', () => hideAllSections(visibility)));

    // Initial Load
    getCurrentPosition()
        .then(position => {
            const { latitude, longitude } = position.coords;
            if (map) map.setView([latitude, longitude], 13);
            if (hospitalMap) hospitalMap.setView([latitude, longitude], 13);
            fetchWeatherData(latitude, longitude);
            updateRoadStats();
            loadV2VMessages();
            loadSocialFeed();
            loadGroups();
            loadScheduledPosts();
            updateAnalytics();
            loadHospitals(latitude, longitude);
        })
        .catch(() => {
            fetchWeatherData();
            loadHospitals();
        });

    function toggleSection(type, container, btn, callback, vis, requiredPlan = 'free') {
        if (!container || !btn) return;
        if ((requiredPlan === 'pro' && userPlan === 'free') || (requiredPlan === 'premium' && (userPlan === 'free' || userPlan === 'pro'))) {
            showNotification(`Upgrade to ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan`, true);
            elements.subModal.style.display = 'block';
            return;
        }
        hideAllSections(vis);
        vis[type] = true;
        container.classList.add('visible');
        btn.textContent = type.toUpperCase();
        if (callback) callback();
    }

    function hideAllSections(vis) {
        Object.keys(vis).forEach(key => {
            vis[key] = false;
            const section = document.getElementById(`${key}-section`) || document.getElementById(`${key}-container`);
            if (section) section.classList.remove('visible');
            const btn = document.getElementById(`${key}-btn`);
            if (btn) btn.textContent = key.toUpperCase();
        });
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

    async function fetchWeatherData(lat = 51.505, lon = -0.09) {
        try {
            const position = await getCurrentPosition().catch(() => ({ coords: { latitude: lat, longitude: lon } }));
            lat = position.coords.latitude;
            lon = position.coords.longitude;
            const openWeatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`);
            const openWeatherData = await openWeatherResponse.ok ? await openWeatherResponse.json() : { main: { temp: 'N/A' }, weather: [{ description: 'Data unavailable' }], wind: { speed: 'N/A' } };
            const openMeteoResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation`);
            const openMeteoData = await openMeteoResponse.ok ? await openMeteoResponse.json() : { current: { relative_humidity_2m: 'N/A', precipitation: 'N/A' } };

            weatherData.temp = openWeatherData.main.temp !== 'N/A' ? openWeatherData.main.temp.toFixed(1) : 'N/A';
            weatherData.condition = openWeatherData.weather[0].description;
            weatherData.wind = openWeatherData.wind.speed !== 'N/A' ? openWeatherData.wind.speed.toFixed(1) : 'N/A';
            weatherData.humidity = openMeteoData.current.relative_humidity_2m;
            weatherData.precip = openMeteoData.current.precipitation !== 'N/A' ? openMeteoData.current.precipitation.toFixed(1) : 'N/A';

            if (elements.weatherTemp) elements.weatherTemp.textContent = weatherData.temp === 'N/A' ? 'N/A' : `${weatherData.temp}°C`;
            if (elements.weatherCondition) elements.weatherCondition.textContent = weatherData.condition;
            if (elements.weatherWind) elements.weatherWind.textContent = weatherData.wind === 'N/A' ? 'N/A' : `${weatherData.wind} m/s`;
            if (elements.weatherHumidity) elements.weatherHumidity.textContent = weatherData.humidity === 'N/A' ? 'N/A' : `${weatherData.humidity}%`;
            if (elements.weatherPrecip) elements.weatherPrecip.textContent = weatherData.precip === 'N/A' ? 'N/A' : `${weatherData.precip} mm`;
            showNotification('Weather updated');
        } catch (error) {
            console.error('Weather fetch error:', error);
            showNotification('Weather data unavailable', true);
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
        showNotification('Message sent');
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
            showNotification('Upgrade to Pro to post', true);
            elements.subModal.style.display = 'block';
            return;
        }
        const text = elements.socialPostInput?.value;
        const file = elements.socialPostImage?.files[0];
        if (!text) return;
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
                showNotification('Posted');
            };
            reader.readAsDataURL(file);
        } else {
            socialPosts.push(post);
            localStorage.setItem('socialPosts', JSON.stringify(socialPosts));
            loadSocialFeed();
            elements.socialPostInput.value = '';
            showNotification('Posted');
        }
    }

    function loadGroups() {
        if (elements.groupList) {
            elements.groupList.innerHTML = groups.map(group => `<li>${group.name} (${group.members} members)</li>`).join('');
        }
    }

    function joinOrCreateGroup() {
        if (userPlan === 'free') {
            showNotification('Upgrade to Pro to join/create groups', true);
            elements.subModal.style.display = 'block';
            return;
        }
        const name = elements.groupInput?.value;
        if (!name) return;
        const existingGroup = groups.find(g => g.name === name);
        if (existingGroup) {
            existingGroup.members++;
        } else {
            groups.push({ name, members: 1 });
        }
        localStorage.setItem('groups', JSON.stringify(groups));
        loadGroups();
        elements.groupInput.value = '';
        showNotification(`Joined/Created: ${name}`);
    }

    function loadScheduledPosts() {
        if (elements.scheduledPosts) {
            elements.scheduledPosts.innerHTML = scheduledPosts.map(post => `<li>${post.text} - ${new Date(post.time).toLocaleString()}</li>`).join('');
        }
    }

    function schedulePost() {
        if (userPlan !== 'premium') {
            showNotification('Upgrade to Premium to schedule', true);
            elements.subModal.style.display = 'block';
            return;
        }
        const text = elements.scheduleText?.value;
        const time = elements.scheduleTime?.value;
        if (!text || !time) return;
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
        }, 60000);
    }

    function updateAnalytics() {
        if (userPlan !== 'premium') {
            showNotification('Upgrade to Premium for analytics', true);
            elements.subModal.style.display = 'block';
            return;
        }
        if (elements.analyticsPosts) elements.analyticsPosts.textContent = socialPosts.length;
        if (elements.analyticsMembers) elements.analyticsMembers.textContent = groups.reduce((sum, g) => sum + g.members, 0);
        if (elements.analyticsEngagement) elements.analyticsEngagement.textContent = ((socialPosts.length / (groups.length || 1)) * 10).toFixed(1);
        showNotification('Analytics updated');
    }

    async function loadHospitals(lat = 51.505, lon = -0.09) {
        if (userPlan !== 'premium') {
            showNotification('Upgrade to Premium for hospital locator', true);
            elements.subModal.style.display = 'block';
            return;
        }
        try {
            const position = await getCurrentPosition().catch(() => ({ coords: { latitude: lat, longitude: lon } }));
            lat = position.coords.latitude;
            lon = position.coords.longitude;
            if (hospitalMap) hospitalMap.setView([lat, lon], 13);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=hospital&format=json&limit=5&lat=${lat}&lon=${lon}`);
            const hospitals = await response.json();
            hospitalMarkers.clearLayers();
            if (elements.hospitalList) {
                elements.hospitalList.innerHTML = hospitals.map(h => `<li>${h.display_name} (${(h.distance || 'N/A')} km)</li>`).join('');
            }
            hospitals.forEach(h => {
                const marker = L.marker([h.lat, h.lon]).bindPopup(h.display_name);
                hospitalMarkers.addLayer(marker);
            });
            hospitalMap.invalidateSize();
            showNotification('Hospitals loaded');
        } catch (error) {
            console.error('Hospital fetch error:', error);
            showNotification('Hospital data unavailable', true);
        }
    }

    function subscribe(plan) {
        userPlan = plan;
        localStorage.setItem('userPlan', plan);
        elements.subModal.style.display = 'none';
        v2vDailyCount = 0;
        localStorage.setItem('v2vDailyCount', v2vDailyCount);
        showNotification(`Subscribed to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`);
    }
}

// Report Page (Enhanced with Emergency Services)
function initializeReport() {
    const form = document.createElement('form');
    form.id = 'incident-form';
    form.innerHTML = `
        <h3>Report Incident</h3>
        <select id="incident-type">
            <option value="accident">Accident</option>
            <option value="hazard">Road Hazard</option>
            <option value="weather">Weather Issue</option>
            <option value="ambulance">Request Ambulance</option>
            <option value="first-aid">Emergency First Aid</option>
        </select>
        <textarea id="description" placeholder="Describe the incident"></textarea>
        <button type="submit" class="premium-btn">Submit Report</button>
        <button id="back-from-report" class="back-btn">Back</button>
    `;
    document.body.appendChild(form);

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
            showNotification(`Reported: ${type}`);
            if (type === 'ambulance' || type === 'first-aid') {
                securityEvents.push({ type: `${type.toUpperCase()} REQUEST`, lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() });
                localStorage.setItem('securityEvents', JSON.stringify(securityEvents));
                showNotification(`${type.toUpperCase()} service dispatched`, false);
            }
            form.reset();
        } catch (error) {
            showNotification('Enable location services', true);
        }
    });
    document.getElementById('back-from-report')?.addEventListener('click', () => window.location.href = 'index.html');
}

// Dashboard Page
function initializeDashboard() {
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) searchBtn.addEventListener('click', searchLocation);
    document.querySelectorAll('.filter').forEach(cb => cb.addEventListener('change', updateIncidentsList));
    updateIncidentsList();
}

// Security Page (Red SOS)
function initializeSecurity() {
    const emergencyBtn = document.createElement('button');
    emergencyBtn.id = 'emergency-btn';
    emergencyBtn.textContent = 'SOS';
    emergencyBtn.style.background = '#ff4d4d';
    emergencyBtn.style.color = '#fff';
    emergencyBtn.className = 'premium-btn';
    document.body.appendChild(emergencyBtn);

    emergencyBtn.addEventListener('click', () => {
        if (confirm('Send SOS?')) {
            getCurrentPosition()
                .then(position => {
                    const event = { type: 'Emergency SOS', lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() };
                    securityEvents.push(event);
                    localStorage.setItem('securityEvents', JSON.stringify(securityEvents));
                    showNotification(`SOS sent from ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
                })
                .catch(() => showNotification('Location required for SOS', true));
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

// URL Parameters
if (window.location.search && map) {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('lat')), lng = parseFloat(params.get('lng'));
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], 15);
        fetchWeatherData(lat, lng);
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