let map, currentRoute, currentMarker, speed = 0, lastWeather = null;
const API_KEYS = {
    MAP: "YOUR_LEAFLET_API_KEY",
    WEATHER: "f98e3bf500248c94f6fe8e131752282f",
    ROUTE: "YOUR_OSRM_API_KEY",
    V2V: "YOUR_V2V_API_KEY"
};

const userProfile = { name: "BRIAN OCHIENG", id: "12345", trips: 0, mode: "Driver", lastTrip: "N/A", subscribed: false };
const pedestrianData = { steps: 3200, distance: 2.5, activeTime: "1h 20m", crossings: 5, avgPace: "4:30 min/km", calories: 180 };
const cyclistData = { distance: 15, avgSpeed: 20, activeTime: "45m", calories: 400 };
const mockTrafficData = {
    incidents: [
        { lat: 37.7649, lng: -122.4094, description: "Collision", delaySeconds: 300 },
        { lat: 37.7549, lng: -122.3994, description: "Road Work", delaySeconds: 600 }
    ],
    trafficJams: [
        { lat: 37.7549, lng: -122.3994, severity: "Moderate", avgSpeed: 20 }
    ]
};
const mockV2VData = {
    nearbyVehicles: [
        { id: "V001", lat: 37.7750, lng: -122.4190, speed: 40, message: "Slowing down" },
        { id: "V002", lat: 37.7740, lng: -122.4180, speed: 50, message: "Lane change" }
    ]
};

function initMap(lat = 37.7749, lng = -122.4194) {
    map = L.map("map").setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    currentMarker = L.marker([lat, lng]).addTo(map).bindPopup("You are here");
    console.log("Map initialized at:", lat, lng);
}

function updateTopDetails(lat, lon, city = "Unknown") {
    document.getElementById("top-info").textContent = `Location: ${city} (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    document.getElementById("current-time").textContent = `Time: ${new Date().toLocaleTimeString()}`;
    document.getElementById("speed-info").textContent = `Speed: ${speed.toFixed(1)} km/h`;
}

async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,precipitation,relative_humidity_2m`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
        const data = await response.json();
        const weatherDiv = document.getElementById("weather");
        const rain = data.current.precipitation;
        const isHeavyRain = rain > 5;
        weatherDiv.classList.remove("animate-pulse");
        weatherDiv.innerHTML = `
            <p><span class="weather-symbol ${isHeavyRain ? 'weather-heavy-rain' : 'weather-rain'}"></span>Temp: ${data.current.temperature_2m}°C ${isHeavyRain ? '(Heavy Rain)' : rain > 0 ? '(Light Rain)' : ''}</p>
            <p><span class="weather-symbol weather-wind"></span>Wind: ${data.current.wind_speed_10m} m/s</p>
            <p><span class="weather-symbol weather-humidity"></span>Humidity: ${data.current.relative_humidity_2m}%</p>
        `;
        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const geoData = await geoResponse.ok ? await geoResponse.json() : { address: {} };
        const city = geoData.address?.city || "Unknown";
        if (lastWeather && lastWeather.precipitation !== rain) {
            showLiveUpdate(`Weather Update: ${isHeavyRain ? 'Heavy Rain' : rain > 0 ? 'Light Rain' : 'Clear'} - ${rain} mm`);
        }
        lastWeather = data.current;
        return city;
    } catch (error) {
        console.error("Weather fetch error:", error);
        document.getElementById("weather").innerHTML = "<p>Weather data unavailable</p>";
        return "Unknown";
    }
}

async function updateTraffic(lat, lon) {
    const trafficDiv = document.getElementById("traffic");
    const jams = mockTrafficData.trafficJams.filter(jam => Math.abs(jam.lat - lat) < 0.05 && Math.abs(jam.lng - lon) < 0.05);
    const avgSpeed = jams.length ? jams[0].avgSpeed : 50;
    trafficDiv.classList.remove("animate-pulse");
    trafficDiv.innerHTML = `
        <p>${jams.length ? `${jams.length} Jam(s)` : "No Jams"}</p>
        <p class="text-xs">Avg Speed: ${avgSpeed} km/h</p>
        <p class="text-xs">Severity: ${jams.length ? jams[0].severity : "Clear"}</p>
    `;
}

async function fetchTrafficIncidents(lat, lon) {
    const incidents = mockTrafficData.incidents.filter(incident => Math.abs(incident.lat - lat) < 0.05 && Math.abs(incident.lng - lon) < 0.05);
    const alertsList = document.getElementById("alerts");
    alertsList.classList.remove("animate-pulse");
    alertsList.innerHTML = "";
    const bounds = L.latLngBounds([[lat, lon]]);
    incidents.forEach(incident => {
        const li = document.createElement("li");
        li.textContent = `${incident.description} (${incident.delaySeconds}s)`;
        li.classList.add("text-gray-200");
        alertsList.appendChild(li);
        L.marker([incident.lat, incident.lng]).addTo(map).bindPopup(incident.description);
        bounds.extend([incident.lat, incident.lng]);
        showLiveUpdate(`Traffic Alert: ${incident.description}`);
    });
    if (!alertsList.children.length) {
        const li = document.createElement("li");
        li.textContent = "No alerts";
        li.classList.add("text-gray-200");
        alertsList.appendChild(li);
    } else {
        map.fitBounds(bounds);
    }
    return incidents;
}

function showAlertsPopup() {
    const alertsList = document.getElementById("alerts").innerHTML || "<li>No alerts</li>";
    const content = `
        <h3>Alerts</h3>
        <ul class="text-gray-200">${alertsList}</ul>
        <button class="futuristic-btn mt-3" onclick="hidePopup('alerts-popup')">Close</button>
    `;
    showPopupContent("alerts-popup", content);
}

async function fetchRoute(isSafest = false) {
    const fromInput = document.getElementById("from-input").value.trim();
    const toInput = document.getElementById("to-input").value.trim();
    if (!fromInput || !toInput) {
        showFeedback("Please enter both 'From' and 'To' locations.");
        return;
    }

    showFeedback("Calculating route...");

    try {
        const fromGeo = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fromInput)}&format=json&limit=1`);
        if (!fromGeo.ok) throw new Error("Failed to geocode 'From' location");
        const fromData = await fromGeo.json();
        if (!fromData.length) throw new Error("'From' location not found");

        const toGeo = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(toInput)}&format=json&limit=1`);
        if (!toGeo.ok) throw new Error("Failed to geocode 'To' location");
        const toData = await toGeo.json();
        if (!toData.length) throw new Error("'To' location not found");

        const [startLon, startLat] = [parseFloat(fromData[0].lon), parseFloat(fromData[0].lat)];
        const [endLon, endLat] = [parseFloat(toData[0].lon), parseFloat(toData[0].lat)];

        // OSRM for shortest route (default)
        let url = `http://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
        let routeData;

        if (isSafest) {
            // Simulate safest route by adding a waypoint to avoid mock incidents (e.g., detour around 37.7549, -122.3994)
            const safeWaypoint = `${startLon + (endLon - startLon) / 2},${startLat + 0.01}`; // Simple detour north
            url = `http://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${safeWaypoint};${endLon},${endLat}?overview=full&geometries=geojson`;
        }

        const routeResponse = await fetch(url);
        if (!routeResponse.ok) throw new Error("Route calculation failed");
        routeData = await routeResponse.json();

        if (map.hasLayer(currentRoute)) map.removeLayer(currentRoute);
        const routeCoords = routeData.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        currentRoute = L.polyline(routeCoords, { color: isSafest ? 'green' : 'blue', weight: 5 }).addTo(map);
        map.fitBounds(L.latLngBounds(routeCoords));

        const distanceKm = (routeData.routes[0].distance / 1000).toFixed(2);
        const durationMin = (routeData.routes[0].duration / 60).toFixed(0);
        const content = `
            <h3>${isSafest ? "Safest" : "Shortest"} Route</h3>
            <p>From: ${fromInput}</p>
            <p>To: ${toInput}</p>
            <p>Distance: ${distanceKm} km</p>
            <p>Duration: ${durationMin} min</p>
            <button class="btn bg-${isSafest ? 'green' : 'blue'}-600 hover:bg-${isSafest ? 'green' : 'blue'}-700 mt-3" onclick="hidePopup('route-popup')">Close</button>
        `;
        showPopupContent("route-popup", content);
        userProfile.trips++;
        userProfile.lastTrip = `${toInput} (${isSafest ? "safe" : "short"})`;
        updateSidebarProfile();
        showLiveUpdate(`Route Planned: ${isSafest ? "Safest" : "Shortest"} to ${toInput}`);
    } catch (error) {
        console.error("Route fetch error:", error.message);
        showFeedback(`Route error: ${error.message}`);
    }
}

async function fetchSOS() {
    const { coords: { latitude, longitude } } = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
    L.marker([latitude, longitude], { icon: L.icon({ iconUrl: 'https://leafletjs.com/examples/custom-icons/leaf-red.png', iconSize: [38, 95] }) })
        .addTo(map).bindPopup("SOS - Police Notified");
    map.setView([latitude, longitude], 14);
    const content = `
        <h3>SOS Alert</h3>
        <p>Location: (${latitude.toFixed(4)}, ${longitude.toFixed(4)})</p>
        <p>Status: Police Notified</p>
        <p>Time: ${new Date().toLocaleTimeString()}</p>
        <button class="btn bg-red-600 hover:bg-red-700 mt-3" onclick="hidePopup('sos-popup')">Close</button>
    `;
    showPopupContent("sos-popup", content);
    showLiveUpdate("SOS Sent: Police Notified");
}

async function fetchPlaces(type, popupId, title) {
    const { coords: { latitude, longitude } } = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
    const query = `[out:json];node(around:5000,${latitude},${longitude})["${type}"];out 5;`;
    try {
        const response = await fetch(`https://overpass-api.de/api/interpreter`, { method: 'POST', body: query });
        const data = await response.json();
        const bounds = L.latLngBounds([[latitude, longitude]]);
        let content = `<h3>${title}</h3><ul>`;
        data.elements.forEach(node => {
            content += `<li>${node.tags.name || type} (${node.lat.toFixed(4)}, ${node.lon.toFixed(4)})</li>`;
            L.marker([node.lat, node.lon]).addTo(map).bindPopup(node.tags.name || type);
            bounds.extend([node.lat, node.lon]);
        });
        content += `</ul><button class="btn bg-gray-600 hover:bg-gray-700 mt-3" onclick="hidePopup('${popupId}')">Close</button>`;
        showPopupContent(popupId, content);
        map.fitBounds(bounds);
        showLiveUpdate(`${title}: ${data.elements.length} found`);
    } catch (error) {
        console.error("Places fetch error:", error);
        showFeedback("Failed to fetch nearby places.");
    }
}

async function fetchV2V() {
    const content = `
        <h3>V2V Data</h3>
        <ul>${mockV2VData.nearbyVehicles.map(v => `<li>ID: ${v.id}, Speed: ${v.speed} km/h, Msg: ${v.message}</li>`).join('')}</ul>
        <button class="btn bg-indigo-600 hover:bg-indigo-700 mt-3" onclick="hidePopup('v2v-popup')">Close</button>
        <button class="btn bg-gray-600 hover:bg-gray-700 mt-3" onclick="showSidebar();hidePopup('v2v-popup')">Back to Menu</button>
    `;
    showPopupContent("v2v-popup", content);
    mockV2VData.nearbyVehicles.forEach(v => L.marker([v.lat, v.lng]).addTo(map).bindPopup(`${v.id}: ${v.message}`));
    showLiveUpdate("V2V Data: Nearby vehicles updated");
}

function showHome() {
    const content = `
        <h3>Home</h3>
        <p>Welcome, ${userProfile.name}!</p>
        <p>Mode: ${userProfile.mode}</p>
        <p>Trips: ${userProfile.trips}</p>
        <button class="btn bg-blue-600 hover:bg-blue-700 mt-3" onclick="hidePopup('home-popup')">Close</button>
        <button class="btn bg-gray-600 hover:bg-gray-700 mt-3" onclick="showSidebar();hidePopup('home-popup')">Back to Menu</button>
    `;
    showPopupContent("home-popup", content);
    closeSidebar();
}

async function showRoadStats() {
    const { coords: { latitude, longitude } } = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
    const incidents = await fetchTrafficIncidents(latitude, longitude);
    const jams = mockTrafficData.trafficJams.length;
    const content = `
        <h3>Road Statistics</h3>
        <p>Total Incidents: ${incidents.length}</p>
        <p>Traffic Jams: ${jams}</p>
        <p>Incident Types: ${incidents.map(i => i.description).join(", ") || "None"}</p>
        <button class="btn bg-blue-600 hover:bg-blue-700 mt-3" onclick="hidePopup('road-stats-popup')">Close</button>
        <button class="btn bg-gray-600 hover:bg-gray-700 mt-3" onclick="showSidebar();hidePopup('road-stats-popup')">Back to Menu</button>
    `;
    showPopupContent("road-stats-popup", content);
    closeSidebar();
}

function showProfile() {
    const content = `
        <h3>User Profile</h3>
        <p>Name: ${userProfile.name}</p>
        <p>ID: ${userProfile.id}</p>
        <p>Trips: ${userProfile.trips}</p>
        <p>Mode: ${userProfile.mode}</p>
        <p>Last Trip: ${userProfile.lastTrip}</p>
        <button class="futuristic-btn mt-3" onclick="hidePopup('profile-popup')">Close</button>
        <button class="futuristic-btn mt-3 ml-2" onclick="showSidebar();hidePopup('profile-popup')">Back to Menu</button>
    `;
    showPopupContent("profile-popup", content);
    closeSidebar();
}

function showSettings() {
    const content = `
        <h3>Settings</h3>
        <label class="flex items-center text-gray-200">
            <input type="checkbox" id="notifications" ${userProfile.subscribed ? 'checked' : ''} class="mr-2" onchange="userProfile.subscribed = this.checked"> Notifications
        </label>
        <button class="futuristic-btn mt-3" onclick="hidePopup('settings-popup')">Close</button>
        <button class="futuristic-btn mt-3 ml-2" onclick="showSidebar();hidePopup('settings-popup')">Back to Menu</button>
    `;
    showPopupContent("settings-popup", content);
    closeSidebar();
}

function togglePedestrianMode() {
    userProfile.mode = userProfile.mode === "Driver" ? "Pedestrian" : userProfile.mode === "Pedestrian" ? "Cyclist" : "Driver";
    const data = userProfile.mode === "Pedestrian" ? pedestrianData : userProfile.mode === "Cyclist" ? cyclistData : {};
    const content = `
        <h3>${userProfile.mode} Mode</h3>
        ${userProfile.mode === "Driver" ? "<p>Driver mode activated.</p>" : `
            <p>Distance: ${data.distance} km</p>
            <p>${userProfile.mode === "Pedestrian" ? `Steps: ${data.steps}` : `Avg Speed: ${data.avgSpeed} km/h`}</p>
            <p>Active Time: ${data.activeTime}</p>
            <p>Calories: ${data.calories}</p>
        `}
        <button class="btn bg-blue-600 hover:bg-blue-700 mt-3" onclick="hidePopup('mode-popup')">Close</button>
        <button class="btn bg-gray-600 hover:bg-gray-700 mt-3" onclick="showSidebar();hidePopup('mode-popup')">Back to Menu</button>
    `;
    showPopupContent("mode-popup", content);
    updateSidebarProfile();
    closeSidebar();
    showLiveUpdate(`Mode Switched to ${userProfile.mode}`);
}

function toggleNightMode() {
    document.body.classList.toggle("bg-gray-900");
    const content = `
        <h3>Night Mode</h3>
        <p>${document.body.classList.contains("bg-gray-900") ? "Enabled" : "Disabled"}</p>
        <button class="btn bg-blue-600 hover:bg-blue-700 mt-3" onclick="hidePopup('night-mode-popup')">Close</button>
        <button class="btn bg-gray-600 hover:bg-gray-700 mt-3" onclick="showSidebar();hidePopup('night-mode-popup')">Back to Menu</button>
    `;
    showPopupContent("night-mode-popup", content);
    closeSidebar();
    showLiveUpdate(`Night Mode ${document.body.classList.contains("bg-gray-900") ? "Enabled" : "Disabled"}`);
}

function showFeedback(message) {
    const content = `
        <h3>Feedback</h3>
        <p>${new Date().toLocaleTimeString()} - ${message}</p>
        <button class="btn bg-blue-600 hover:bg-blue-700 mt-3" onclick="hidePopup('feedback-popup')">Close</button>
    `;
    showPopupContent("feedback-popup", content);
    setTimeout(() => hidePopup("feedback-popup"), 4000);
}

function showLiveUpdate(message) {
    const liveUpdates = document.getElementById("live-updates");
    const list = document.getElementById("live-updates-list");
    const li = document.createElement("li");
    li.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    list.insertBefore(li, list.firstChild);
    liveUpdates.classList.remove("hidden");
    if (list.children.length > 5) list.removeChild(list.lastChild);
}

function showPopupContent(id, content) {
    document.getElementById(`${id.split('-')[0]}-content`).innerHTML = content;
    document.getElementById(id).classList.remove("hidden");
}

function hidePopup(id) {
    document.getElementById(id).classList.add("hidden");
}

function showSidebar() {
    document.querySelector(".sidebar").classList.add("open");
}

function updateSidebarProfile() {
    document.getElementById("sidebar-name").textContent = userProfile.name;
    document.getElementById("sidebar-mode").textContent = userProfile.mode;
    document.getElementById("sidebar-trips").textContent = `Trips: ${userProfile.trips}`;
    document.getElementById("profile-preview").classList.remove("hidden");
}

function closeSidebar() {
    document.querySelector(".sidebar").classList.remove("open");
}

document.addEventListener("DOMContentLoaded", async () => {
    initMap();

    // Initial UI setup
    document.getElementById("weather").innerHTML = "<p>Loading weather...</p>";
    document.getElementById("traffic").innerHTML = "<p>Loading traffic...</p>";
    document.getElementById("alerts").innerHTML = "<li>Loading alerts...</li>";
    document.getElementById("top-info").textContent = "Location: Loading...";

    // Event listeners
    document.querySelector(".menu-btn").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
    document.getElementById("shortest-route-btn").addEventListener("click", () => fetchRoute(false));
    document.getElementById("safest-route-btn").addEventListener("click", () => fetchRoute(true));
    document.getElementById("sos-btn").addEventListener("click", fetchSOS);
    document.getElementById("gas-btn").addEventListener("click", () => fetchPlaces("fuel", "gas-popup", "Nearby Gas Stations"));
    document.getElementById("hospital-btn").addEventListener("click", () => fetchPlaces("hospital", "hospital-popup", "Nearby Hospitals"));
    document.getElementById("v2v-btn").addEventListener("click", fetchV2V);
    document.getElementById("garage-btn").addEventListener("click", () => fetchPlaces("car_repair", "garage-popup", "Nearby Garages"));

    // Real-time updates
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                initMap(latitude, longitude); // Re-init map with actual position
                const city = await fetchWeather(latitude, longitude);
                await updateTraffic(latitude, longitude);
                await fetchTrafficIncidents(latitude, longitude);
                updateTopDetails(latitude, longitude, city);
            },
            (error) => console.error("Initial geolocation error:", error)
        );

        navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude, speed: gpsSpeed } = position.coords;
                speed = gpsSpeed ? gpsSpeed * 3.6 : 0;
                console.log(`Position: (${latitude}, ${longitude}), Speed: ${speed} km/h`);

                currentMarker.setLatLng([latitude, longitude]);
                map.setView([latitude, longitude], 13);
                const city = await fetchWeather(latitude, longitude);
                await updateTraffic(latitude, longitude);
                await fetchTrafficIncidents(latitude, longitude);
                updateTopDetails(latitude, longitude, city);

                if (userProfile.subscribed && lastWeather) {
                    const distance = lastWeather ? L.latLng(lastWeather.latitude || latitude, lastWeather.longitude || longitude).distanceTo([latitude, longitude]) / 1000 : 0;
                    if (distance > 0.1) showFeedback(`Moved ${distance.toFixed(2)} km`);
                }
                lastWeather = lastWeather || {};
                lastWeather.latitude = latitude;
                lastWeather.longitude = longitude;
            },
            (error) => {
                console.error("Geolocation watch error:", error);
                showFeedback(`Location error: ${error.message}`);
                document.getElementById("top-info").textContent = "Location: Unavailable";
                document.getElementById("weather").innerHTML = "<p>Location unavailable</p>";
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
    } else {
        showFeedback("Geolocation not supported.");
        document.getElementById("top-info").textContent = "Location: Geolocation not supported";
        document.getElementById("weather").innerHTML = "<p>Geolocation unavailable</p>";
    }

    setInterval(() => {
        document.getElementById("current-time").textContent = `Time: ${new Date().toLocaleTimeString()}`;
    }, 1000);
});