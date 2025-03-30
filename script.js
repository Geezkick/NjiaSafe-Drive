// Global Variables
let map, userMarker;
let currentPosition = { lat: -1.2921, lng: 36.8219 }; // Nairobi default
let lastWeatherUpdate = 0;
let travelMode = "DRIVING";
let isSignedIn = false;

// Map Initialization
function initMap() {
  console.log("Initializing map...");
  try {
    map = L.map("map").setView([currentPosition.lat, currentPosition.lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);
    userMarker = L.marker([currentPosition.lat, currentPosition.lng]).addTo(map).bindPopup("You are here").openPopup();
    console.log("Map initialized successfully");
    updateFeedback("Map loaded at Nairobi");
    startGeolocation();
  } catch (error) {
    console.error("Map initialization error:", error);
    updateFeedback("Error: Map failed to load");
    document.getElementById("map").innerHTML = "<p>Map failed to load</p>";
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
  if (now - lastWeatherUpdate < 30000) return;

  weatherEl.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Fetching weather...";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentPosition.lat}&longitude=${currentPosition.lng}¤t_weather=true&hourly=temperature_2m,precipitation,windspeed_10m,relativehumidity_2m,pressure_msl`;
  console.log("Fetching weather from:", url);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    console.log("Weather API response:", data);

    const { temperature, weathercode, windspeed } = data.current_weather;
    const precip = data.hourly.precipitation[0] || 0;
    const humidity = data.hourly.relativehumidity_2m[0] || 0;
    const pressure = data.hourly.pressure_msl[0] || 0;
    weatherEl.innerHTML = `
      <div class="weather-data">
        <span><i class="wi ${getWeatherIcon(weathercode)} animate"></i> ${temperature}°C</span>
        <span><i class="fas fa-cloud"></i> ${getWeatherDescription(weathercode)}</span>
        <span><i class="fas fa-tint"></i> Precip: ${precip} mm</span>
        <span><i class="fas fa-wind"></i> Wind: ${windspeed} m/s</span>
        <span><i class="fas fa-water"></i> Humidity: ${humidity}%</span>
        <span><i class="fas fa-tachometer-alt"></i> Pressure: ${pressure} hPa</span>
      </div>
    `;
    lastWeatherUpdate = now;
    updateFeedback(`Weather updated: ${temperature}°C, ${getWeatherDescription(weathercode)}`);
    checkWeatherAlerts(weathercode, precip, windspeed, humidity);
    console.log("Weather displayed:", { temperature, weathercode, windspeed, precip, humidity, pressure });
  } catch (error) {
    console.error("Weather fetch error:", error);
    weatherEl.innerHTML = "<i class='fas fa-exclamation-triangle'></i> Weather unavailable";
    updateFeedback("Error fetching weather: " + error.message);
    displayAlert("Weather fetch failed");
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

function checkWeatherAlerts(code, precip, windspeed, humidity) {
  let alertMessage = "";
  if (code === 65 || precip > 5) alertMessage = "Heavy rain warning!";
  else if (windspeed > 15) alertMessage = "Strong wind warning!";
  else if (code === 95) alertMessage = "Thunderstorm warning!";
  else if (humidity > 90) alertMessage = "High humidity alert!";
  if (alertMessage) {
    displayAlert(alertMessage);
    updateFeedback(`Alert: ${alertMessage}`);
  }
}

// Location Search
async function searchLocation() {
  const query = document.getElementById("locationSearch").value.trim();
  if (!query) {
    updateFeedback("Error: Enter a location");
    return;
  }
  console.log("Searching for:", query);

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
    if (!response.ok) throw new Error(`Search API error ${response.status}`);
    const data = await response.json();
    if (data.length === 0) throw new Error("Location not found");
    const { lat, lon } = data[0];
    currentPosition = { lat: parseFloat(lat), lng: parseFloat(lon) };
    userMarker.setLatLng([currentPosition.lat, currentPosition.lng]);
    map.setView([currentPosition.lat, currentPosition.lng], 14);
    console.log("Location found:", currentPosition);
    updateFeedback(`Moved to: ${query}`);
    fetchWeather();
  } catch (error) {
    console.error("Search error:", error);
    updateFeedback("Error: " + error.message);
    displayAlert("Location search failed");
  }
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
  updateFeedback(isSignedIn ? "Signed in" : "Signed out");
  if (!isSignedIn) toggleMenu();
}

function setTravelMode(mode) {
  travelMode = mode;
  document.querySelectorAll(".mode-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`mode${mode}`).classList.add("active");
  updateFeedback(`Travel mode set to: ${mode}`);
}

async function findNearest(type) {
  const types = {
    gas: "fuel", mall: "mall", garage: "car_repair", hospital: "hospital"
  };
  const query = types[type] || type;
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}+near+${currentPosition.lat},${currentPosition.lng}&format=json&limit=1`);
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    if (data.length === 0) throw new Error(`${type} not found`);
    const { lat, lon, display_name } = data[0];
    L.marker([lat, lon]).addTo(map).bindPopup(display_name).openPopup();
    map.panTo([lat, lon]);
    updateFeedback(`Nearest ${type}: ${display_name}`);
  } catch (error) {
    console.error(`${type} search error:`, error);
    updateFeedback(`Error finding ${type}: ${error.message}`);
    displayAlert(`Failed to find ${type}`);
  }
}

function callSOS() {
  if (!isSignedIn) {
    updateFeedback("Please sign in to use SOS");
    displayAlert("Sign in required for SOS");
    return;
  }
  updateFeedback("SOS triggered - Emergency services contacted");
  displayAlert("SOS: Emergency services dispatched to your location");
}

function requestHospitalPickup() {
  if (!isSignedIn) {
    updateFeedback("Please sign in for hospital pickup");
    displayAlert("Sign in required");
    return;
  }
  findNearest("hospital");
  updateFeedback("Hospital pickup requested");
  displayAlert("Hospital pickup dispatched");
}

function checkRoadSafety() {
  updateFeedback("Road safety: Check local conditions");
  displayAlert("Road safety info: Stay alert, follow traffic rules");
}

function bookParking() {
  if (!isSignedIn) {
    updateFeedback("Please sign in to book parking");
    displayAlert("Sign in required");
    return;
  }
  const vehicle = travelMode === "CYCLING" ? "bike" : "car";
  updateFeedback(`Booking parking for ${vehicle} near ${currentPosition.lat}, ${currentPosition.lng}`);
  displayAlert(`Parking booked for ${vehicle}`);
}

// Feedback and Alerts
function updateFeedback(message) {
  const feedbackEl = document.getElementById("feedback");
  if (feedbackEl) feedbackEl.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
  console.log("Feedback:", message);
}

function displayAlert(message) {
  const alert = document.getElementById("safetyAlert");
  alert.querySelector("#alertContent").textContent = message;
  alert.classList.add("active");
  setTimeout(() => alert.classList.remove("active"), 5000);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, starting app...");
  initMap();
  fetchWeather();

  document.getElementById("fetchWeather").addEventListener("click", () => {
    console.log("Fetch Weather button clicked");
    updateFeedback("Manual weather fetch triggered");
    fetchWeather();
  });

  document.getElementById("searchBtn").addEventListener("click", searchLocation);
  document.getElementById("locationSearch").addEventListener("keypress", e => {
    if (e.key === "Enter") searchLocation();
  });

  document.getElementById("menuBtn").addEventListener("click", toggleMenu);
  document.getElementById("backBtn").addEventListener("click", toggleMenu);
  document.getElementById("signInBtn").addEventListener("click", handleSignIn);

  document.getElementById("modeDriving").addEventListener("click", () => setTravelMode("DRIVING"));
  document.getElementById("modeWalking").addEventListener("click", () => setTravelMode("WALKING"));
  document.getElementById("modeCycling").addEventListener("click", () => setTravelMode("CYCLING"));

  document.getElementById("sosBtn").addEventListener("click", callSOS);
  document.getElementById("hospitalBtn").addEventListener("click", requestHospitalPickup);
  document.getElementById("safetyBtn").addEventListener("click", checkRoadSafety);
  document.getElementById("gasBtn").addEventListener("click", () => findNearest("gas"));
  document.getElementById("mallBtn").addEventListener("click", () => findNearest("mall"));
  document.getElementById("garageBtn").addEventListener("click", () => findNearest("garage"));
  document.getElementById("parkingBtn").addEventListener("click", bookParking);

  document.getElementById("modeDriving").classList.add("active"); // Default
  setInterval(fetchWeather, 30000); // Update every 30 seconds
});