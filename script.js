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
    map = L.map("map").setView([currentPosition.lat, currentPosition.lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);
    userMarker = L.marker([currentPosition.lat, currentPosition.lng], {
      icon: L.divIcon({ className: "user-marker", html: '<i class="fas fa-map-marker-alt"></i>' })
    }).addTo(map).bindPopup("You are here").openPopup();
    console.log("Map initialized successfully");
    updateFeedback("Map loaded at Nairobi");
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
      updateFeedback(`Position updated: ${currentPosition.lat}, ${currentPosition.lng}`);
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
  if (!weatherEl) {
    console.error("Weather element not found");
    return;
  }
  const now = Date.now();
  if (now - lastWeatherUpdate < 30000 && weatherCache) {
    console.log("Using cached weather data");
    weatherEl.innerHTML = weatherCache;
    return;
  }

  showSpinner();
  weatherEl.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Fetching weather...";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentPosition.lat}&longitude=${currentPosition.lng}&current_weather=true&hourly=temperature_2m,precipitation,windspeed_10m,relativehumidity_2m,pressure_msl`;
  console.log("Fetching weather from:", url);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    const data = await response.json();
    console.log("Weather API response:", data);

    const current = data.current_weather || {};
    const temperature = current.temperature ?? "N/A";
    const weathercode = current.weathercode ?? 0;
    const windspeed = current.windspeed ?? "N/A";
    const hourly = data.hourly || {};
    const precip = hourly.precipitation?.[0] ?? 0;
    const humidity = hourly.relativehumidity_2m?.[0] ?? 0;
    const pressure = hourly.pressure_msl?.[0] ?? 0;

    const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const html = `
      <div class="weather-data">
        <span><i class="fas fa-map-marker-alt"></i> Location: ${currentLocationName}</span>
        <span><i class="fas fa-calendar-alt"></i> ${date}</span>
        <span><i class="wi ${getWeatherIcon(weathercode)} animate"></i> Temp: ${temperature}°C</span>
        <span><i class="fas fa-cloud"></i> ${getWeatherDescription(weathercode)}</span>
        <span><i class="fas fa-tint"></i> Precip: ${precip} mm</span>
        <span><i class="fas fa-wind"></i> Wind: ${windspeed} m/s</span>
        <span><i class="fas fa-water"></i> Humidity: ${humidity}%</span>
        <span><i class="fas fa-tachometer-alt"></i> Pressure: ${pressure} hPa</span>
      </div>
    `;
    weatherEl.innerHTML = html;
    weatherCache = html;
    lastWeatherUpdate = now;
    updateFeedback(`Weather updated for ${currentLocationName}: ${temperature}°C`);
    checkWeatherConditions(weathercode, precip, windspeed, humidity);
    console.log("Weather displayed:", { temperature, weathercode, windspeed, precip, humidity, pressure });
  } catch (error) {
    console.error("Weather fetch error:", error);
    weatherEl.innerHTML = "<i class='fas fa-exclamation-triangle'></i> Weather unavailable";
    updateFeedback(`Error fetching weather: ${error.message}`);
  } finally {
    hideSpinner();
  }
}

async function updateLocationName() {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${currentPosition.lat}&lon=${currentPosition.lng}&format=json`);
    if (!response.ok) throw new Error(`Reverse geocoding error ${response.status}`);
    const data = await response.json();
    currentLocationName = data.display_name.split(",")[0] || "Unknown Location";
    console.log("Location name updated:", currentLocationName);
    fetchWeather();
  } catch (error) {
    console.error("Location name fetch error:", error);
    currentLocationName = "Unknown Location";
  }
}

function getWeatherIcon(code) {
  const icons = {
    0: "wi-day-sunny", 1: "wi-day-cloudy", 2: "wi-cloudy", 3: "wi-cloudy",
    61: "wi-rain", 63: "wi-rain", 65: "wi-rain-wind", 95: "wi-thunderstorm"
  };
  return icons[code] || "wi-na";
}

function getWeatherDescription(code) {
  const desc = {
    0: "Clear", 1: "Partly cloudy", 2: "Cloudy", 3: "Overcast",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 95: "Thunderstorm"
  };
  return desc[code] || "Unknown";
}

function checkWeatherConditions(code, precip, windspeed, humidity) {
  let message = "";
  if (code === 65 || precip > 5) message = "Heavy rain warning!";
  else if (windspeed > 15) message = "Strong wind warning!";
  else if (code === 95) message = "Thunderstorm warning!";
  else if (humidity > 90) message = "High humidity alert!";
  if (message) updateFeedback(`Weather condition: ${message}`);
}

// Traffic Fetching
function fetchTraffic() {
  const trafficEl = document.getElementById("traffic");
  if (!trafficEl) {
    console.error("Traffic element not found");
    return;
  }
  const now = Date.now();
  if (now - lastTrafficUpdate < 60000 && trafficCache) {
    console.log("Using cached traffic data");
    trafficEl.innerHTML = trafficCache;
    return;
  }

  showSpinner();
  const trafficConditions = ["Light", "Moderate", "Heavy"];
  const condition = trafficConditions[Math.floor(Math.random() * 3)];
  const baseSpeed = travelMode === "DRIVING" ? 50 : travelMode === "WALKING" ? 5 : 15; // km/h
  const speedAdjustment = condition === "Heavy" ? 0.6 : condition === "Moderate" ? 0.8 : 1;
  const speed = Math.round(baseSpeed * speedAdjustment);
  const travelTime = travelMode === "DRIVING" ? "10-15 min" : travelMode === "WALKING" ? "20-30 min" : "15-20 min";
  const html = `
    <div class="traffic-data">
      <span><i class="fas fa-road"></i> Condition: ${condition}</span>
      <span><i class="fas fa-tachometer-alt"></i> Avg Speed: ${speed} km/h</span>
      <span><i class="fas fa-clock"></i> Est. Travel Time: ${travelTime}</span>
    </div>
  `;
  trafficEl.innerHTML = html;
  trafficCache = html;
  lastTrafficUpdate = now;
  console.log("Traffic updated:", { condition, speed, travelTime });
  updateFeedback(`Traffic: ${condition}, ${speed} km/h, ETA ${travelTime}`);
  hideSpinner();
}

// Location Search
async function searchLocation() {
  const query = document.getElementById("locationSearch").value.trim();
  if (!query) {
    updateFeedback("Error: Enter a location");
    return;
  }
  console.log("Searching for:", query);
  showSpinner();

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
    if (!response.ok) throw new Error(`Search API error ${response.status}`);
    const data = await response.json();
    if (data.length === 0) throw new Error("Location not found");
    const { lat, lon } = data[0];
    currentPosition = { lat: parseFloat(lat), lng: parseFloat(lon) };
    currentLocationName = data[0].display_name.split(",")[0];
    userMarker.setLatLng([currentPosition.lat, currentPosition.lng]);
    map.setView([currentPosition.lat, currentPosition.lng], 14);
    console.log("Location found:", currentPosition);
    updateFeedback(`Moved to: ${currentLocationName}`);
    fetchWeather();
    fetchTraffic();
  } catch (error) {
    console.error("Search error:", error);
    updateFeedback("Error: " + error.message);
  } finally {
    hideSpinner();
  }
}

// Nearest & Safest Route Calculation (fixed & enhanced)
async function calculateRoute() {
  const destination = document.getElementById("locationSearch").value.trim();
  if (!destination) {
    updateFeedback("Error: Enter a destination in the search bar");
    return;
  }

  showSpinner();
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`);
    if (!response.ok) throw new Error(`Route API error ${response.status}`);
    const data = await response.json();
    if (data.length === 0) throw new Error("Destination not found");
    const destPos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    const destName = data[0].display_name.split(",")[0];

    const distance = calculateDistance(currentPosition.lat, currentPosition.lng, destPos.lat, destPos.lng);
    const eta = calculateETA(distance);
    const safetyScore = Math.random() * 100; // Mock safety score
    const waypoints = generateWaypoints(currentPosition, destPos);

    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.polyline(waypoints, {
      color: travelMode === "DRIVING" ? "#007bff" : travelMode === "WALKING" ? "#28a745" : "#ff5722",
      weight: 4,
      opacity: 0.8
    }).addTo(map).bindPopup(`Route to ${destName}<br>Distance: ${distance.toFixed(1)} km<br>ETA: ${eta} min<br>Safety: ${safetyScore.toFixed(0)}%`).openPopup();
    map.fitBounds(routeLayer.getBounds());

    const routeEl = document.getElementById("routeInfo");
    routeEl.innerHTML = `
      <div class="route-data">
        <span><i class="fas fa-map-signs"></i> To: ${destName}</span>
        <span><i class="fas fa-ruler"></i> Distance: ${distance.toFixed(1)} km</span>
        <span><i class="fas fa-clock"></i> ETA: ${eta} min</span>
        <span><i class="fas fa-shield-alt"></i> Safety: ${safetyScore.toFixed(0)}%</span>
      </div>
    `;
    updateFeedback(`Route to ${destName}: ${distance.toFixed(1)} km, ETA: ${eta} min, Safety: ${safetyScore.toFixed(0)}%`);
    updateRealTimeETA(distance); // Start real-time ETA updates
  } catch (error) {
    console.error("Route calculation error:", error);
    updateFeedback("Error calculating route: " + error.message);
  } finally {
    hideSpinner();
  }
}

function generateWaypoints(start, end) {
  const numPoints = 5; // More waypoints for smoother curve
  const waypoints = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = start.lat + (end.lat - start.lat) * t + (Math.random() - 0.5) * 0.01; // Slight randomization
    const lng = start.lng + (end.lng - start.lng) * t + (Math.random() - 0.5) * 0.01;
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
    const remainingETA = Math.max(0, calculateETA(distance) - Math.round(elapsed / 60));
    routeEl.querySelector("span:nth-child(3)").innerHTML = `<i class="fas fa-clock"></i> ETA: ${remainingETA} min`;
  }, 1000); // Update every second
}

// Side Menu and Smart Road Features
function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  const container = document.querySelector(".container");
  menu.classList.toggle("active");
  container.classList.toggle("shifted");
}

function handleSignIn() {
  isSignedIn = !isSignedIn;
  const signInBtn = document.getElementById("signInBtn");
  signInBtn.innerHTML = isSignedIn ? "<i class='fas fa-sign-out-alt'></i> Sign Out" : "<i class='fas fa-sign-in-alt'></i> Sign In";
  signInBtn.setAttribute("aria-label", isSignedIn ? "Sign Out" : "Sign In");
  userProfile.name = isSignedIn ? "BRIAN OCHIENG" : "Guest";
  updateProfile();
  updateFeedback(isSignedIn ? "Signed in" : "Signed out");
  if (!isSignedIn) toggleMenu();
}

function updateProfile() {
  document.getElementById("profileName").textContent = userProfile.name;
  document.getElementById("profileMode").textContent = `Mode: ${userProfile.preferredMode}`;
}

function setTravelMode(mode) {
  console.log("setTravelMode called with:", mode);
  travelMode = mode;
  userProfile.preferredMode = mode;
  
  const modeButtons = document.querySelectorAll(".mode-btn");
  modeButtons.forEach(btn => btn.classList.remove("active"));
  
  const selectedBtn = document.getElementById(`mode${mode}`);
  if (selectedBtn) {
    selectedBtn.classList.add("active");
    console.log(`Added active to ${selectedBtn.id}`);
  } else {
    console.error(`Button mode${mode} not found`);
  }

  updateProfile();
  updateFeedback(`Travel mode set to: ${mode}`);
  fetchTraffic();
  if (routeLayer) calculateRoute();
}

async function findNearest(type) {
  const types = {
    gas: "fuel", mall: "mall", garage: "car_repair", hospital: "hospital"
  };
  const query = types[type] || type;
  showSpinner();
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}+near+${currentPosition.lat},${currentPosition.lng}&format=json&limit=1`);
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    if (data.length === 0) throw new Error(`${type} not found`);
    const { lat, lon, display_name } = data[0];
    const distance = calculateDistance(currentPosition.lat, currentPosition.lng, parseFloat(lat), parseFloat(lon));
    const eta = calculateETA(distance);
    L.marker([lat, lon], {
      icon: L.divIcon({ className: "poi-marker", html: `<i class="fas fa-${type === 'hospital' ? 'hospital' : type === 'gas' ? 'gas-pump' : 'map-pin'}"></i>` })
    }).addTo(map).bindPopup(`${display_name} (${distance.toFixed(1)} km)`).openPopup();
    map.panTo([lat, lon]);
    updateFeedback(`Nearest ${type}: ${display_name}, ${distance.toFixed(1)} km, ETA: ${eta} min`);
    return { lat, lon, distance, eta };
  } catch (error) {
    console.error(`${type} search error:`, error);
    updateFeedback(`Error finding ${type}: ${error.message}`);
    return null;
  } finally {
    hideSpinner();
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

function calculateETA(distance) {
  const speed = travelMode === "DRIVING" ? 50 : travelMode === "WALKING" ? 5 : 15; // km/h
  return Math.round((distance / speed) * 60); // Minutes
}

function callSOS() {
  if (!isSignedIn) {
    updateFeedback("Please sign in to use SOS");
    return;
  }
  updateFeedback(`SOS triggered - Emergency services contacted at ${currentLocationName} (${currentPosition.lat}, ${currentPosition.lng})`);
}

async function requestHospitalPickup() {
  if (!isSignedIn) {
    updateFeedback("Please sign in for hospital pickup");
    return;
  }
  const hospital = await findNearest("hospital");
  if (hospital) {
    updateFeedback(`Hospital pickup requested - ${hospital.distance.toFixed(1)} km, ETA: ${hospital.eta} min`);
  }
}

function checkRoadSafety() {
  const safetyTips = travelMode === "DRIVING" ? "Check tire pressure, obey speed limits" :
                     travelMode === "WALKING" ? "Use crosswalks, stay visible" :
                     "Wear helmet, use bike lanes";
  updateFeedback(`Road safety in ${currentLocationName}: ${safetyTips}`);
}

async function bookParking() {
  if (!isSignedIn) {
    updateFeedback("Please sign in to book parking");
    return;
  }
  const vehicle = travelMode === "CYCLING" ? "bike" : "car";
  const distance = (Math.random() * 5 + 1).toFixed(1);
  const eta = calculateETA(distance);
  const parkingType = travelMode === "CYCLING" ? "Bike rack" : "Car parking";
  updateFeedback(`Parking booked for ${vehicle} - ${parkingType}, ${distance} km away, ETA: ${eta} min near ${currentLocationName}`);
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
      updateFeedback(`Moved to favorite: ${currentLocationName}`);
      fetchWeather();
      fetchTraffic();
    });
  });
}

function addFavorite() {
  if (favorites.some(f => f.name === currentLocationName)) {
    updateFeedback(`${currentLocationName} already in favorites`);
    return;
  }
  favorites.push({ name: currentLocationName, lat: currentPosition.lat, lng: currentPosition.lng });
  updateFavorites();
  updateFeedback(`Added ${currentLocationName} to favorites`);
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
  const icon = btn.querySelector("i");
  icon.classList.toggle("fa-moon");
  icon.classList.toggle("fa-sun");
  btn.style.transition = "transform 0.3s, background 0.3s";
  btn.style.transform = "rotate(360deg)";
  setTimeout(() => btn.style.transform = "rotate(0deg)", 300);
  updateFeedback(document.body.classList.contains("dark") ? "Dark mode enabled" : "Light mode enabled");
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, starting app...");
  initMap();
  fetchWeather();

  document.getElementById("fetchWeather").addEventListener("click", debounce(() => {
    console.log("Fetch Weather button clicked");
    updateFeedback("Manual weather fetch triggered");
    fetchWeather();
  }, 500));

  document.getElementById("searchBtn").addEventListener("click", searchLocation);
  document.getElementById("locationSearch").addEventListener("keypress", e => {
    if (e.key === "Enter") searchLocation();
  });

  document.getElementById("menuBtn").addEventListener("click", toggleMenu);
  document.getElementById("backBtn").addEventListener("click", toggleMenu);
  document.getElementById("signInBtn").addEventListener("click", handleSignIn);

  const drivingBtn = document.getElementById("modeDriving");
  const walkingBtn = document.getElementById("modeWalking");
  const cyclingBtn = document.getElementById("modeCycling");

  if (drivingBtn) drivingBtn.addEventListener("click", () => {
    console.log("Driving button clicked");
    setTravelMode("DRIVING");
  });
  if (walkingBtn) walkingBtn.addEventListener("click", () => {
    console.log("Walking button clicked");
    setTravelMode("WALKING");
  });
  if (cyclingBtn) cyclingBtn.addEventListener("click", () => {
    console.log("Cycling button clicked");
    setTravelMode("CYCLING");
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

  const defaultBtn = document.getElementById("modeDriving");
  if (defaultBtn) defaultBtn.classList.add("active");
  updateProfile();
  setInterval(fetchWeather, 30000);
  setInterval(fetchTraffic, 60000);
});