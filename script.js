// script.js
const map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with your API key
const incidents = [];
const markersLayer = L.layerGroup().addTo(map);

// New Features:
// 1. Location search
// 2. Incident filtering
// 3. Real-time notifications
// 4. Interactive incident list
// 5. Weather hazard auto-detection

// Form submission
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
        addIncidentToMap(incident);
        updateIncidentsList();
        showNotification(`Reported: ${type}`);
        e.target.reset();
        fetchWeatherData(position.coords.latitude, position.coords.longitude);
    } catch (error) {
        showNotification('Error: Enable location services', true);
        console.error(error);
    }
});

// Location search
document.getElementById('search-btn').addEventListener('click', async () => {
    const query = document.getElementById('location-search').value;
    if (!query) return;

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
        );
        const data = await response.json();
        if (data.length > 0) {
            const { lat, lon } = data[0];
            map.setView([lat, lon], 13);
            fetchWeatherData(lat, lon);
            showNotification(`Moved to: ${query}`);
        } else {
            showNotification('Location not found', true);
        }
    } catch (error) {
        showNotification('Search error', true);
        console.error(error);
    }
});

// Filter incidents
document.querySelectorAll('.filter').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        updateMapAndList();
    });
});

// Get current position
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

// Add incident to map
function addIncidentToMap(incident) {
    const marker = L.marker([incident.lat, incident.lng])
        .bindPopup(`
            <b>${incident.type}</b><br>
            ${incident.description}<br>
            ${new Date(incident.timestamp).toLocaleString()}
        `);
    marker.incidentType = incident.type; // Store type for filtering
    markersLayer.addLayer(marker);
}

// Update incidents list
function updateIncidentsList() {
    const list = document.getElementById('incident-list');
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

    // Add click handlers to list items
    list.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
            const lat = li.dataset.lat;
            const lng = li.dataset.lng;
            map.setView([lat, lng], 15);
            markersLayer.eachLayer(marker => {
                if (marker.getLatLng().lat == lat && marker.getLatLng().lng == lng) {
                    marker.openPopup();
                }
            });
        });
    });
}

// Update map based on filters
function updateMapAndList() {
    const activeFilters = Array.from(document.querySelectorAll('.filter:checked')).map(cb => cb.value);
    markersLayer.eachLayer(marker => {
        const shouldShow = activeFilters.includes(marker.incidentType);
        if (shouldShow) {
            if (!map.hasLayer(marker)) markersLayer.addLayer(marker);
        } else {
            markersLayer.removeLayer(marker);
        }
    });
    updateIncidentsList();
}

// Fetch weather data
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
            addIncidentToMap(weatherIncident);
            updateMapAndList();
            showNotification('Weather hazard detected');
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
    }
}

// Show notification
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.backgroundColor = isError ? '#e74c3c' : '#27ae60';
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Initialize app
function initializeApp() {
    getCurrentPosition()
        .then(position => {
            map.setView([position.coords.latitude, position.coords.longitude], 13);
            fetchWeatherData(position.coords.latitude, position.coords.longitude);
        })
        .catch(error => {
            console.log('Using default location', error);
        });
}

initializeApp();