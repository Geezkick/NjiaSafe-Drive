const ORS_API_KEY = '5b3ce3597851110001cf62488d7e1693f9a04525ba93f70557d9e9a8'; // Replace with your API key
let map, shortestRouteLayer, safestRouteLayer, currentPosition;

// Sidebar toggle
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('hidden');
}

// Section navigation
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
}

// Login functionality
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username && password) {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        initMap();
        updateLocationAndTime();
        fetchWeather();
        simulateRealTimeData();
    } else {
        alert('Please enter username and password');
    }
}

// Logout functionality
function logout() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Initialize Leaflet Map centered on Kenya
function initMap() {
    map = L.map('map').setView([-1.2921, 36.8219], 6); // Default: Nairobi, Kenya
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            const { latitude, longitude } = position.coords;
            currentPosition = [longitude, latitude];
            map.setView([latitude, longitude], 13);
            L.marker([latitude, longitude]).addTo(map)
                .bindPopup('Your Location').openPopup();
            console.log('Geolocation success:', currentPosition);
        }, error => {
            console.error('Geolocation error:', error.message);
            document.getElementById('currentLocation').textContent = 'Nairobi (Default)';
            alert('Geolocation unavailable. Using default location (Nairobi). Please enable location services for full functionality.');
            currentPosition = [36.8219, -1.2921]; // Default to Nairobi
        });
    } else {
        console.warn('Geolocation not supported');
        document.getElementById('currentLocation').textContent = 'Nairobi (Default)';
        alert('Geolocation not supported by your browser. Using default location (Nairobi).');
        currentPosition = [36.8219, -1.2921]; // Default to Nairobi
    }
}

// Update current location and time
function updateLocationAndTime() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            fetch(`https://api.openrouteservice.org/geocode/reverse?api_key=${ORS_API_KEY}&point.lon=${longitude}&point.lat=${latitude}`)
                .then(response => response.json())
                .then(data => {
                    const locationName = data.features[0]?.properties?.name || 'Unknown Location';
                    document.getElementById('currentLocation').textContent = locationName;
                    console.log('Location updated:', locationName);
                })
                .catch(error => {
                    console.error('Reverse geocoding error:', error);
                    document.getElementById('currentLocation').textContent = 'Nairobi (Default)';
                });
        }, () => {
            document.getElementById('currentLocation').textContent = 'Nairobi (Default)';
            console.warn('Geolocation failed for location update');
        });
    }

    setInterval(() => {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleTimeString();
    }, 1000);
}

// Fetch weather data from Open-Meteo API
function fetchWeather() {
    const coords = currentPosition || [36.8219, -1.2921]; // Default to Nairobi
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords[1]}&longitude=${coords[0]}&current_weather=true&hourly=precipitation&temperature_unit=celsius&windspeed_unit=kmh`;
    
    console.log('Fetching weather for coordinates:', coords);
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('Weather data received:', data);
            const temp = data.current_weather.temperature;
            const weatherCode = data.current_weather.weathercode;
            const windSpeed = data.current_weather.windspeed;
            const precipitation = data.hourly.precipitation[0] || 0; // Fallback to 0 if undefined
            const weatherSymbols = {
                0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 61: '🌧️', 71: '❄️'
            };
            const symbol = weatherSymbols[weatherCode] || '🌤️';
            
            document.getElementById('weatherDisplay').innerHTML = `${symbol} ${temp}°C`;
            document.getElementById('windSpeed').textContent = `Wind: ${windSpeed} km/h`;
            document.getElementById('precipitation').textContent = `Precipitation: ${precipitation} mm`;
            console.log('Weather updated successfully');
        })
        .catch(error => {
            console.error('Weather fetch error:', error.message);
            document.getElementById('weatherDisplay').textContent = '☀️ 25°C (Default)';
            document.getElementById('windSpeed').textContent = 'Wind: 10 km/h (Default)';
            document.getElementById('precipitation').textContent = 'Precipitation: 0 mm (Default)';
            alert('Unable to fetch weather data. Showing default values for Nairobi.');
        });
}

// Calculate shortest and safest routes using OpenRouteService
function calculateRoutes() {
    const start = document.getElementById('startPoint').value;
    const end = document.getElementById('endPoint').value;
    if (!start || !end) {
        alert('Please enter start and end points');
        return;
    }

    Promise.all([
        fetch(`https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${start}&boundary.country=KEN`).then(res => res.json()),
        fetch(`https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${end}&boundary.country=KEN`).then(res => res.json())
    ]).then(([startData, endData]) => {
        const startCoords = startData.features[0].geometry.coordinates;
        const endCoords = endData.features[0].geometry.coordinates;

        fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startCoords.join(',')}&end=${endCoords.join(',')}`, {
            headers: { 'Accept': 'application/json, application/geo+json' }
        })
        .then(response => response.json())
        .then(data => {
            const distance = (data.features[0].properties.summary.distance / 1000).toFixed(2);
            const duration = (data.features[0].properties.summary.duration / 60).toFixed(1);
            document.getElementById('shortestRoute').innerHTML = `<h3>Shortest Route</h3><p>${distance} km - ${duration} min</p>`;
            if (shortestRouteLayer) map.removeLayer(shortestRouteLayer);
            shortestRouteLayer = L.geoJSON(data).addTo(map);
            map.fitBounds(shortestRouteLayer.getBounds());
        });

        fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startCoords.join(',')}&end=${endCoords.join(',')}&preference=fastest&options={"avoid_features":"unpavedroads"}`, {
            headers: { 'Accept': 'application/json, application/geo+json' }
        })
        .then(response => response.json())
        .then(data => {
            const distance = (data.features[0].properties.summary.distance / 1000).toFixed(2);
            const duration = (data.features[0].properties.summary.duration / 60).toFixed(1);
            document.getElementById('safestRoute').innerHTML = `<h3>Safest Route</h3><p>${distance} km - ${duration} min</p>`;
            if (safestRouteLayer) map.removeLayer(safestRouteLayer);
            safestRouteLayer = L.geoJSON(data, { style: { color: '#2ecc71' } }).addTo(map);
            showSection('routes');
        });
    }).catch(error => {
        console.error('Error calculating routes:', error);
        alert('Error finding routes. Please try again.');
    });
}

// Simulate real-time data
function simulateRealTimeData() {
    setInterval(() => {
        const traffic = document.getElementById('trafficStatus');
        const speed = Math.floor(Math.random() * 20) + 30;
        traffic.textContent = `Moderate - ${speed} km/h average`;

        const users = document.getElementById('activeUsers');
        const drivers = Math.floor(Math.random() * 50) + 100;
        const cyclists = Math.floor(Math.random() * 20) + 30;
        users.textContent = `${drivers} drivers, ${cyclists} cyclists`;
    }, 5000);
}

// SOS and nearest location functions
function sendSOS() {
    if (currentPosition) {
        alert(`SOS Sent from ${currentPosition}! Emergency services notified.`);
    } else {
        alert('SOS cannot be sent: Location unavailable. Using default Nairobi location.');
    }
}

function findNearest(type) {
    if (!currentPosition) {
        alert('Location unavailable. Using default Nairobi location for search.');
        currentPosition = [36.8219, -1.2921]; // Nairobi
    }

    const poiTypes = {
        'hospital': 'hospital',
        'garage': 'car_repair',
        'mall': 'mall',
        'police': 'police'
    };

    fetch(`https://api.openrouteservice.org/pois?api_key=${ORS_API_KEY}&request=pois&geometry={"bbox":[[${currentPosition[0]-0.1},${currentPosition[1]-0.1}],[${currentPosition[0]+0.1},${currentPosition[1]+0.1}]]}&filter={"category_ids":[${poiTypes[type] === 'hospital' ? 206 : poiTypes[type] === 'car_repair' ? 137 : poiTypes[type] === 'mall' ? 214 : 202}]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.features && data.features.length > 0) {
            const nearest = data.features[0];
            const coords = nearest.geometry.coordinates;
            const name = nearest.properties.name || `${type} at ${coords}`;
            L.marker([coords[1], coords[0]]).addTo(map)
                .bindPopup(`Nearest ${type}: ${name}`).openPopup();
            map.setView([coords[1], coords[0]], 15);
            alert(`Nearest ${type} found: ${name}`);
        } else {
            alert(`No ${type} found nearby.`);
        }
    })
    .catch(error => {
        console.error(`Error finding ${type}:`, error);
        alert(`Error finding nearest ${type}. Please try again.`);
    });
}