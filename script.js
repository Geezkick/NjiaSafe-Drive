// Global Variables
let map, userMarker, routeLayer;
let currentPosition = { lat: -1.2921, lng: 36.8219 }; // Default: Nairobi
let currentLocationName = "Nairobi";
let travelMode = "DRIVING";
let isSignedIn = false;

// Initialize Map
function initMap() {
  const mapElement = document.getElementById("map");
  if (!mapElement) {
    console.error("Map container not found");
    updateFeedback("Error: Map container not found");
    return;
  }

  if (typeof L === "undefined") {
    console.error("Leaflet library not loaded");
    updateFeedback("Error: Leaflet library failed to load");
    mapElement.innerHTML = "<p>Map failed to load: Leaflet not available</p>";
    return;
  }

  try {
    map = L.map("map").setView([currentPosition.lat, currentPosition.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);
    userMarker = L.marker([currentPosition.lat, currentPosition.lng])
      .addTo(map)
      .bindPopup("You are here")
      .openPopup();
    console.log("Map initialized at:", currentPosition);
    updateFeedback("Map loaded successfully");
    setTimeout(() => map.invalidateSize(), 100);
    startGeolocation();
    fetchWeather();
  } catch (error) {
    console.error("Map initialization error:", error);
    updateFeedback("Error: Map failed to load - " + error.message);
    mapElement.innerHTML = "<p>Map failed to load: " + error.message + "</p>";
  }
}

// Start Geolocation
function startGeolocation() {
  if (!navigator.geolocation) {
    console.log("Geolocation not supported");
    updateFeedback("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      currentPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
      userMarker.setLatLng([currentPosition.lat, currentPosition.lng]);
      map.setView([currentPosition.lat, currentPosition.lng], 13);
      console.log("Geolocation updated:", currentPosition);
      updateFeedback("Location updated");
      updateLocationName();
      fetchWeather();
    },
    error => {
      console.error("Geolocation error:", error);
      updateFeedback("Geolocation failed: " + error.message);
      fetchWeather();
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Fetch Weather
async function fetchWeather() {
  const weatherInfo = document.getElementById("weather-info");
  if (!weatherInfo) {
    console.error("Weather info element not found");
    return;
  }

  weatherInfo.innerHTML = "Fetching weather...";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentPosition.lat}&longitude=${currentPosition.lng}&current_weather=true&hourly=temperature_2m`;
  console.log("https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,rain,relative_humidity_2m,visibility,precipitation&current=rain,wind_speed_10m&wind_speed_unit=ms:", url);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
    const data = await response.json();
    const { temperature, weathercode } = data.current_weather;
    weatherInfo.innerHTML = `
      <p><strong>Location:</strong> ${currentLocationName}</p>
      <p><strong>Temperature:</strong> ${temperature}°C</p>
      <p><strong>Condition:</strong> ${getWeatherDescription(weathercode)}</p>
    `;
    console.log("Weather fetched:", { temperature, weathercode });
    updateFeedback(`Weather updated: ${temperature}°C`);
  } catch (error) {
    console.error("Weather fetch error:", error);
    weatherInfo.innerHTML = "Weather data unavailable";
    updateFeedback("Error fetching weather: " + error.message);
  }
}

// Update Location Name
async function updateLocationName() {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${currentPosition.lat}&lon=${currentPosition.lng}&format=json`);
    if (!response.ok) throw new Error(`Geocoding error: ${response.status}`);
    const data = await response.json();
    currentLocationName = data.display_name.split(",")[0] || "Unknown Location";
    console.log("Location name updated:", currentLocationName);
    fetchWeather();
  } catch (error) {
    console.error("Location name fetch error:", error);
    currentLocationName = "Unknown Location";
    fetchWeather();
  }
}

// Weather Description
function getWeatherDescription(code) {
  const descriptions = {
    0: "Clear",
    1: "Partly cloudy",
    2: "Cloudy",
    3: "Overcast",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    95: "Thunderstorm"
  };
  return descriptions[code] || "Unknown";
}

// Toggle Sidebar
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const main = document.querySelector("main");
  sidebar.classList.toggle("active");
  main.classList.toggle("shifted");
  setTimeout(() => map.invalidateSize(), 300); // Match transition duration
}

// Sign In/Out
function handleSignIn() {
  isSignedIn = !isSignedIn;
  const signInBtn = document.getElementById("sign-in-btn");
  const userName = document.getElementById("user-name");
  signInBtn.innerHTML = isSignedIn
    ? '<i class="fas fa-sign-out-alt"></i> Sign Out'
    : '<i class="fas fa-sign-in-alt"></i> Sign In';
  userName.textContent = isSignedIn ? "User" : "Guest";
  updateFeedback(isSignedIn ? "Signed in" : "Signed out");
  if (!isSignedIn) toggleSidebar();
}

// Set Travel Mode
function setTravelMode(mode) {
  travelMode = mode;
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.mode === mode) btn.classList.add("active");
  });
  updateFeedback(`Travel mode set to: ${mode}`);
  if (routeLayer) findRoute(); // Recalculate route if already plotted
}

// Calculate Distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Calculate ETA
function calculateETA(distance) {
  const speed = travelMode === "DRIVING" ? 50 : travelMode === "WALKING" ? 5 : 15; // km/h
  return Math.round((distance / speed) * 60); // Minutes
}

// Find Nearest & Safest Route
async function findRoute() {
  const destination = document.getElementById("destination").value.trim();
  if (!destination) {
    updateFeedback("Error: Enter a destination");
    return;
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`);
    if (!response.ok) throw new Error(`Route API error: ${response.status}`);
    const data = await response.json();
    if (!data.length) throw new Error("Destination not found");

    const destPos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    const destName = data[0].display_name.split(",")[0];
    const distance = calculateDistance(currentPosition.lat, currentPosition.lng, destPos.lat, destPos.lng);
    const eta = calculateETA(distance);
    const safetyScore = Math.random() * 100; // Mock safety score

    // Simple route simulation (midpoint)
    const waypoints = [
      [currentPosition.lat, currentPosition.lng],
      [(currentPosition.lat + destPos.lat) / 2, (currentPosition.lng + destPos.lng) / 2],
      [destPos.lat, destPos.lng]
    ];

    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.polyline(waypoints, {
      color: travelMode === "DRIVING" ? "#007bff" : travelMode === "WALKING" ? "#28a745" : "#ff5722",
      weight: 4
    }).addTo(map);
    map.fitBounds(routeLayer.getBounds());

    updateFeedback(`Route to ${destName}: ${distance.toFixed(1)} km, ETA: ${eta} min, Safety: ${safetyScore.toFixed(0)}%`);
  } catch (error) {
    console.error("Route error:", error);
    updateFeedback("Error finding route: " + error.message);
  }
}

// Update Feedback
function updateFeedback(message) {
  const feedbackEl = document.getElementById("feedback");
  if (feedbackEl) feedbackEl.textContent = message;
  console.log("Feedback:", message);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, starting app...");
  initMap();

  document.getElementById("menu-toggle").addEventListener("click", toggleSidebar);
  document.getElementById("back-btn").addEventListener("click", toggleSidebar);
  document.getElementById("sign-in-btn").addEventListener("click", handleSignIn);
  document.getElementById("route-btn").addEventListener("click", findRoute);
  document.getElementById("destination").addEventListener("keypress", e => {
    if (e.key === "Enter") findRoute();
  });

  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => setTravelMode(btn.dataset.mode));
  });

  window.addEventListener("resize", () => {
    if (map) map.invalidateSize();
  });
});