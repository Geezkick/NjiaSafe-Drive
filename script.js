// Global Variables
let map, userMarker, routeLayer;
let currentPosition = { lat: -1.2921, lng: 36.8219 }; // Nairobi default
let lastWeatherUpdate = 0;
let lastTrafficUpdate = 0;
let travelMode = "DRIVING";
let isSignedIn = false;
let userProfile = { name: "Guest", preferredMode: "DRIVING" };
let currentLocationName = "Nairobi";
let favorites = [];
let weatherCache = null;
let trafficCache = null;
let recentSearches = [];
const mapStyles = {
  default: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  satellite: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
};

// Utility Functions
function showSpinner() {
  document.getElementById("loadingSpinner").classList.add("active");
}

function hideSpinner() {
  document.getElementById("loadingSpinner").classList.remove("active");
}

function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Map Initialization
function initMap() {
  console.log("Initializing map...");
  showSpinner();
  try {
    map = L.map("map", { zoomControl: false }).setView([currentPosition.lat, currentPosition.lng], 14);
    L.tileLayer(mapStyles.default, {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);
    userMarker = L.marker([currentPosition.lat, currentPosition.lng], {
      icon: L.divIcon({ className: "user-marker", html: '<i class="fas fa-location-dot fa-2x" style="color: var(--primary);"></i>' })
    }).addTo(map).bindPopup("You").openPopup();
    console.log("Map initialized successfully");
    updateFeedback("Map ready at Nairobi");
    startGeolocation();
    fetchTraffic();
  } catch (error) {
    console.error("Map initialization error:", error);
    updateFeedback("Error: Map failed to load");
    document.getElementById("map").innerHTML = "<p>Map failed to load</p>";
  } finally {
    hideSpinner();
  }
}

// Geolocation
function startGeolocation() {
  if (!navigator.geolocation) {
    console.log("Geolocation not supported");
    updateFeedback("Geolocation not supported");
    return;
  }
  navigator.geolocation.watchPosition(
    position => {
      currentPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
      userMarker.setLatLng([currentPosition.lat, currentPosition.lng]);
      map.panTo([currentPosition.lat, currentPosition.lng]);
      console.log("Geolocation updated:", currentPosition);
      updateFeedback(`Location: ${currentPosition.lat}, ${currentPosition.lng}`);
      fetchWeather();
      fetchTraffic();
      updateLocationName();
    },
    error => {
      console.error("Geolocation error:", error);
      updateFeedback("Geolocation failed: " + error.message);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Weather Fetching
async function fetchWeather() {
  const weatherEl = document.getElementById("weather");
  if (!weatherEl) return;
  const now = Date.now();
  if (now - lastWeatherUpdate < 30000 && weatherCache) {
    weatherEl.innerHTML = weatherCache;
    return;
  }

  showSpinner();
  weatherEl.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Updating...";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentPosition.lat}&longitude=${currentPosition.lng}&current_weather=true&hourly=temperature_2m,precipitation,windspeed_10m,relativehumidity_2m,pressure_msl`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    const current = data.current_weather || {};
    const temperature = current.temperature ?? "N/A";
    const weathercode = current.weathercode ?? 0;
    const windspeed = current.windspeed ?? "N/A";
    const hourly = data.hourly || {};
    const precip = hourly.precipitation?.[0] ?? 0;
    const humidity = hourly.relativehumidity_2m?.[0] ?? 0;

    const html = `
      <div class="weather-data">
        <span><i class="fas fa-map-marker-alt"></i> ${currentLocationName}</span>
        <span><i class="wi ${getWeatherIcon(weathercode)}"></i> ${temperature}°C - ${getWeatherDescription(weathercode)}</span>
        <span><i class="fas fa-tint"></i> ${precip} mm</span>
        <span><i class="fas fa-wind"></i> ${windspeed} m/s</span>
        <span><i class="fas fa-water"></i> ${humidity}%</span>
      </div>
    `;
    weatherEl.innerHTML = html;
    weatherCache = html;
    lastWeatherUpdate = now;
    updateFeedback(`Weather: ${temperature}°C in ${currentLocationName}`);
    checkWeatherConditions(weathercode, precip, windspeed, humidity);
  } catch (error) {
    console.error("Weather fetch error:", error);
    weatherEl.innerHTML = "<i class='fas fa-exclamation-triangle'></i> Unavailable";
    updateFeedback(`Weather error: ${error.message}`);
  } finally {
    hideSpinner();
  }
}

async function updateLocationName() {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${currentPosition.lat}&lon=${currentPosition.lng}&format=json`);
    if (!response.ok) throw new Error(`Reverse geocoding error ${response.status}`);
    const data = await response.json();
    currentLocationName = data.display_name.split(",")[0] || "Unknown";
    console.log("Location name updated:", currentLocationName);
    fetchWeather();
  } catch (error) {
    console.error("Location name fetch error:", error);
    currentLocationName = "Unknown";
  }
}

function getWeatherIcon(code) {
  const icons = { 0: "wi-day-sunny", 1: "wi-day-cloudy", 61: "wi-rain", 95: "wi-thunderstorm" };
  return icons[code] || "wi-cloudy";
}

function getWeatherDescription(code) {
  const desc = { 0: "Clear", 1: "Cloudy", 61: "Rain", 95: "Thunderstorm" };
  return desc[code] || "Overcast";
}

function checkWeatherConditions(code, precip, windspeed, humidity) {
  let message = "";
  if (code === 65 || precip > 5) message = "Heavy rain alert!";
  else if (windspeed > 15) message = "Strong winds!";
  else if (code === 95) message = "Thunderstorm warning!";
  if (message) updateFeedback(message);
}

// Traffic Fetching
function fetchTraffic() {
  const trafficEl = document.getElementById("traffic");
  if (!trafficEl) return;
  const now = Date.now();
  if (now - lastTrafficUpdate < 60000 && trafficCache) {
    trafficEl.innerHTML = trafficCache;
    return;
  }

  showSpinner();
  const condition = ["Light", "Moderate", "Heavy"][Math.floor(Math.random() * 3)];
  const baseSpeed = travelMode === "DRIVING" ? 50 : travelMode === "WALKING" ? 5 : 15;
  const speed = Math.round(baseSpeed * (condition === "Heavy" ? 0.6 : condition === "Moderate" ? 0.8 : 1));
  const travelTime = travelMode === "DRIVING" ? "10-15 min" : travelMode === "WALKING" ? "20-30 min" : "15-20 min";
  const html = `
    <div class="traffic-data">
      <span><i class="fas fa-road"></i> ${condition}</span>
      <span><i class="fas fa-tachometer-alt"></i> ${speed} km/h</span>
      <span><i class="fas fa-clock"></i> ${travelTime}</span>
    </div>
  `;
  trafficEl.innerHTML = html;
  trafficCache = html;
  lastTrafficUpdate = now;
  updateFeedback(`Traffic: ${condition}, ${speed} km/h`);
  hideSpinner();
}

// Location Search
async function searchLocation(query = document.getElementById("locationSearch").value.trim()) {
  if (!query) {
    updateFeedback("Enter a destination");
    return;
  }
  showSpinner();
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
    if (!response.ok) throw new Error(`Search error ${response.status}`);
    const data = await response.json();
    if (!data.length) throw new Error("Location not found");
    const { lat, lon } = data[0];
    currentPosition = { lat: parseFloat(lat), lng: parseFloat(lon) };
    currentLocationName = data[0].display_name.split(",")[0];
    userMarker.setLatLng([currentPosition.lat, currentPosition.lng]);
    map.setView([currentPosition.lat, currentPosition.lng], 14);
    updateFeedback(`Moved to ${currentLocationName}`);
    fetchWeather();
    fetchTraffic();
    addRecentSearch(query);
  } catch (error) {
    console.error("Search error:", error);
    updateFeedback(`Search failed: ${error.message}`);
  } finally {
    hideSpinner();
  }
}

// Voice Search
function startVoiceSearch() {
  if (!("webkitSpeechRecognition" in window)) {
    updateFeedback("Voice search not supported");
    return;
  }
  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";
  recognition.start();
  updateFeedback("Listening...");

  recognition.onresult = event => {
    const query = event.results[0][0].transcript;
    document.getElementById("locationSearch").value = query;
    searchLocation(query);
    updateFeedback(`Voice search: ${query}`);
  };
  recognition.onerror = error => {
    console.error("Voice search error:", error);
    updateFeedback("Voice search failed");
  };
}

// Predictive Suggestions
function updateSuggestions() {
  const input = document.getElementById("locationSearch").value.trim();
  const suggestionsEl = document.getElementById("suggestions");
  if (!input || recentSearches.length === 0) {
    suggestionsEl.classList.remove("active");
    return;
  }
  const filtered = recentSearches.filter(s => s.toLowerCase().includes(input.toLowerCase())).slice(0, 5);
  suggestionsEl.innerHTML = filtered.map(s => `<div>${s}</div>`).join("");
  suggestionsEl.classList.add("active");
  suggestionsEl.querySelectorAll("div").forEach(div => {
    div.addEventListener("click", () => {
      document.getElementById("locationSearch").value = div.textContent;
      searchLocation(div.textContent);
      suggestionsEl.classList.remove("active");
    });
  });
}

function addRecentSearch(query) {
  if (!recentSearches.includes(query)) {
    recentSearches.unshift(query);
    if (recentSearches.length > 10) recentSearches.pop();
  }
}

// Route Calculation
async function calculateRoute() {
  const destination = document.getElementById("locationSearch").value.trim();
  if (!destination) {
    updateFeedback("Enter a destination");
    return;
  }

  showSpinner();
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`);
    if (!response.ok) throw new Error(`Route error ${response.status}`);
    const data = await response.json();
    if (!data.length) throw new Error("Destination not found");
    const destPos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    const destName = data[0].display_name.split(",")[0];

    const distance = calculateDistance(currentPosition.lat, currentPosition.lng, destPos.lat, destPos.lng);
    const eta = calculateETA(distance);
    const safetyScore = Math.random() * 100;
    const waypoints = generateWaypoints(currentPosition, destPos);

    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.polyline(waypoints, {
      color: travelMode === "DRIVING" ? "#00b4d8" : travelMode === "WALKING" ? "#90e0ef" : "#ff006e",
      weight: 5,
      opacity: 0.9
    }).addTo(map).bindPopup(`To ${destName}: ${distance.toFixed(1)} km, ${eta} min`).openPopup();
    map.fitBounds(routeLayer.getBounds());

    document.getElementById("routeInfo").innerHTML = `
      <div class="route-data">
        <span><i class="fas fa-map-signs"></i> ${destName}</span>
        <span><i class="fas fa-ruler"></i> ${distance.toFixed(1)} km</span>
        <span><i class="fas fa-clock"></i> ${eta} min</span>
        <span><i class="fas fa-shield-alt"></i> ${safetyScore.toFixed(0)}%</span>
      </div>
    `;
    updateFeedback(`Route to ${destName}: ${distance.toFixed(1)} km`);
    updateRealTimeETA(distance);
  } catch (error) {
    console.error("Route calculation error:", error);
    updateFeedback(`Route error: ${error.message}`);
  } finally {
    hideSpinner();
  }
}

function generateWaypoints(start, end) {
  const waypoints = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;
    waypoints.push([lat, lng]);
  }
  return waypoints;
}

function updateRealTimeETA(distance) {
  const routeEl = document.getElementById("routeInfo");
  let elapsed = 0;
  const interval = setInterval(() => {
    if (!routeLayer) {
      clearInterval(interval);
      return;
    }
    elapsed += 1;
    const eta = Math.max(0, calculateETA(distance) - Math.round(elapsed / 60));
    routeEl.querySelector("span:nth-child(3)").innerHTML = `<i class="fas fa-clock"></i> ${eta} min`;
  }, 1000);
}

// Side Menu Features
function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  const container = document.querySelector(".container");
  menu.classList.toggle("active");
  container.classList.toggle("shifted");
}

function handleSignIn() {
  isSignedIn = !isSignedIn;
  document.getElementById("signInBtn").innerHTML = isSignedIn ? "<i class='fas fa-sign-out-alt'></i> Sign Out" : "<i class='fas fa-sign-in-alt'></i> Sign In";
  userProfile.name = isSignedIn ? "User" : "Guest";
  updateProfile();
  updateFeedback(isSignedIn ? "Signed in" : "Signed out");
  if (!isSignedIn) toggleMenu();
}

function updateProfile() {
  document.getElementById("profileName").textContent = userProfile.name;
  document.getElementById("profileMode").textContent = `Mode: ${userProfile.preferredMode}`;
}

function setTravelMode(mode) {
  travelMode = mode;
  userProfile.preferredMode = mode;
  document.querySelectorAll(".mode-btn").forEach(btn => btn.classList.remove("active"));
  const selectedBtn = document.getElementById(`mode${mode}`);
  if (selectedBtn) selectedBtn.classList.add("active");
  updateProfile();
  updateFeedback(`Mode: ${mode}`);
  fetchTraffic();
  if (routeLayer) calculateRoute();
}

async function findNearest(type) {
  const types = { gas: "fuel", mall: "mall", garage: "car_repair", hospital: "hospital" };
  const query = types[type] || type;
  showSpinner();
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}+near+${currentPosition.lat},${currentPosition.lng}&format=json&limit=1`);
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    if (!data.length) throw new Error(`${type} not found`);
    const { lat, lon, display_name } = data[0];
    const distance = calculateDistance(currentPosition.lat, currentPosition.lng, parseFloat(lat), parseFloat(lon));
    const eta = calculateETA(distance);
    L.marker([lat, lon], {
      icon: L.divIcon({ className: "poi-marker", html: `<i class="fas fa-${type === 'hospital' ? 'hospital' : type === 'gas' ? 'gas-pump' : 'map-pin'} fa-2x" style="color: var(--accent);"></i>` })
    }).addTo(map).bindPopup(`${display_name} (${distance.toFixed(1)} km)`).openPopup();
    map.panTo([lat, lon]);
    updateFeedback(`Nearest ${type}: ${distance.toFixed(1)} km`);
    return { lat, lon, distance, eta };
  } catch (error) {
    console.error(`${type} search error:`, error);
    updateFeedback(`Error finding ${type}`);
    return null;
  } finally {
    hideSpinner();
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function calculateETA(distance) {
  const speed = travelMode === "DRIVING" ? 50 : travelMode === "WALKING" ? 5 : 15;
  return Math.round((distance / speed) * 60);
}

function callSOS() {
  if (!isSignedIn) return updateFeedback("Sign in for SOS");
  updateFeedback(`SOS sent from ${currentLocationName}`);
}

async function requestHospitalPickup() {
  if (!isSignedIn) return updateFeedback("Sign in for hospital pickup");
  const hospital = await findNearest("hospital");
  if (hospital) updateFeedback(`Hospital pickup: ${hospital.distance.toFixed(1)} km`);
}

function checkRoadSafety() {
  const tips = travelMode === "DRIVING" ? "Obey speed limits" : travelMode === "WALKING" ? "Use crosswalks" : "Wear a helmet";
  updateFeedback(`Safety tip: ${tips}`);
}

async function bookParking() {
  if (!isSignedIn) return updateFeedback("Sign in to book parking");
  const distance = (Math.random() * 5 + 1).toFixed(1);
  const eta = calculateETA(distance);
  updateFeedback(`Parking booked: ${distance} km, ETA ${eta} min`);
}

// Favorites
function updateFavorites() {
  const list = document.getElementById("favoritesList");
  list.innerHTML = favorites.map(loc => `<li data-lat="${loc.lat}" data-lng="${loc.lng}">${loc.name}</li>`).join("");
  list.querySelectorAll("li").forEach(li => {
    li.addEventListener("click", () => {
      currentPosition = { lat: parseFloat(li.dataset.lat), lng: parseFloat(li.dataset.lng) };
      currentLocationName = li.textContent;
      userMarker.setLatLng([currentPosition.lat, currentPosition.lng]);
      map.setView([currentPosition.lat, currentPosition.lng], 14);
      updateFeedback(`Moved to ${currentLocationName}`);
      fetchWeather();
      fetchTraffic();
    });
  });
}

function addFavorite() {
  if (favorites.some(f => f.name === currentLocationName)) return updateFeedback(`${currentLocationName} already saved`);
  favorites.push({ name: currentLocationName, lat: currentPosition.lat, lng: currentPosition.lng });
  updateFavorites();
  updateFeedback(`Saved ${currentLocationName}`);
}

// Feedback
function updateFeedback(message) {
  const feedbackEl = document.getElementById("feedback");
  if (feedbackEl) feedbackEl.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
  console.log("Feedback:", message);
}

// Dark Mode Toggle
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  const btn = document.getElementById("darkModeBtn");
  btn.classList.toggle("fa-adjust");
  btn.classList.toggle("fa-circle-half-stroke");
  updateFeedback(document.body.classList.contains("dark") ? "Dark theme on" : "Light theme on");
}

// Map Style Switch
function updateMapStyle() {
  const style = document.getElementById("mapStyle").value;
  map.eachLayer(layer => {
    if (layer instanceof L.TileLayer) map.removeLayer(layer);
  });
  L.tileLayer(mapStyles[style], {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  fetchWeather();

  document.getElementById("fetchWeather").addEventListener("click", debounce(() => {
    updateFeedback("Refreshing weather...");
    fetchWeather();
  }, 500));

  document.getElementById("searchBtn").addEventListener("click", () => searchLocation());
  document.getElementById("locationSearch").addEventListener("keypress", e => {
    if (e.key === "Enter") searchLocation();
  });
  document.getElementById("locationSearch").addEventListener("input", updateSuggestions);
  document.getElementById("voiceSearch").addEventListener("click", startVoiceSearch);

  document.getElementById("menuBtn").addEventListener("click", toggleMenu);
  document.getElementById("backBtn").addEventListener("click", toggleMenu);
  document.getElementById("signInBtn").addEventListener("click", handleSignIn);

  ["Driving", "Walking", "Cycling"].forEach(mode => {
    const btn = document.getElementById(`mode${mode}`);
    if (btn) btn.addEventListener("click", () => setTravelMode(mode));
  });

  document.getElementById("sosBtn").addEventListener("click", callSOS);
  document.getElementById("hospitalBtn").addEventListener("click", requestHospitalPickup);
  document.getElementById("safetyBtn").addEventListener("click", checkRoadSafety);
  document.getElementById("gasBtn").addEventListener("click", () => findNearest("gas"));
  document.getElementById("mallBtn").addEventListener("click", () => findNearest("mall"));
  document.getElementById("garageBtn").addEventListener("click", () => findNearest("garage"));
  document.getElementById("parkingBtn").addEventListener("click", bookParking);

  document.getElementById("routeBtn").addEventListener("click", calculateRoute);
  document.getElementById("darkModeBtn").addEventListener("click", toggleDarkMode);
  document.getElementById("addFavorite").addEventListener("click", addFavorite);
  document.getElementById("mapStyle").addEventListener("change", updateMapStyle);

  document.getElementById("mobileMenu").addEventListener("click", toggleMenu);
  document.getElementById("mobileRoute").addEventListener("click", calculateRoute);
  document.getElementById("mobileWeather").addEventListener("click", fetchWeather);

  document.getElementById("modeDriving").classList.add("active");
  updateProfile();
  setInterval(fetchWeather, 30000);
  setInterval(fetchTraffic, 60000);
});