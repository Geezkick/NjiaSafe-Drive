// Initialize Leaflet map centered on Nairobi, Kenya
const map = L.map('map').setView([-1.2864, 36.8172], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let allRoads = [];
let currentRoute = null;
let sosCircle = null;
const markers = [];

// Fetch road data from Overpass API
async function fetchRoadData() {
  const roadList = document.getElementById('road-list');
  roadList.innerHTML = '<li>Loading road data from OpenStreetMap...</li>';
  
  try {
    const query = `
      [out:json];
      way["highway"](around:5000,-1.2864,36.8172);
      out center;
    `;
    const response = await fetch('http://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    
    allRoads = data.elements.slice(0, Math.max(5, data.elements.length)).map((way, index) => ({
      id: way.id,
      location: way.tags?.name || `Road ${index + 1} near Nairobi`,
      trafficStatus: ['clear', 'moderate', 'congested'][Math.floor(Math.random() * 3)],
      accident: Math.random() > 0.7 ? 'Minor incident' : 'None',
      roadCondition: ['dry', 'wet', 'under construction'][Math.floor(Math.random() * 3)],
      lat: way.center.lat,
      lon: way.center.lon
    }));
    
    displayRoads(allRoads);
    startTrafficUpdates();
  } catch (error) {
    console.error('Error fetching road data:', error.message);
    roadList.innerHTML = '<li>Failed to load road data from OpenStreetMap. Check internet and console.</li>';
  }
}

// Display roads
function displayRoads(roads, filter = false) {
  const roadList = document.getElementById('road-list');
  
  if (!filter) {
    markers.forEach(marker => map.removeLayer(marker));
    markers.length = 0;
    roads.forEach(road => {
      const marker = L.marker([road.lat, road.lon]).addTo(map);
      marker.bindPopup(`
        <strong>${road.location}</strong><br>
        Traffic: ${road.trafficStatus}<br>
        Accident: ${road.accident}<br>
        Condition: ${road.roadCondition}
      `);
      markers.push(marker);
    });
  }
  
  roadList.innerHTML = '';
  roads.forEach(road => {
    const li = document.createElement('li');
    li.textContent = `${road.location}: ${road.trafficStatus} (${road.roadCondition})`;
    li.dataset.id = road.id;
    roadList.appendChild(li);
  });
}

// Event Listener 1: 'input' for start point
document.getElementById('start').addEventListener('input', (e) => {
  const query = e.target.value.trim().toLowerCase();
  const filteredRoads = allRoads.filter(road => 
    road.location.toLowerCase().includes(query)
  );
  displayRoads(filteredRoads.length ? filteredRoads : allRoads, true);
});

// Event Listener 2: 'click' for navigation
document.getElementById('navigate').addEventListener('click', () => {
  const start = document.getElementById('start').value.trim().toLowerCase();
  const end = document.getElementById('end').value.trim().toLowerCase();
  
  const startRoad = allRoads.find(r => r.location.toLowerCase().includes(start));
  const endRoad = allRoads.find(r => r.location.toLowerCase().includes(end));
  
  if (startRoad && endRoad) {
    if (currentRoute) map.removeLayer(currentRoute);
    currentRoute = L.polyline([
      [startRoad.lat, startRoad.lon],
      [endRoad.lat, endRoad.lon]
    ], { color: 'blue' }).addTo(map);
    map.fitBounds(currentRoute.getBounds());
    alert(`Route plotted from ${startRoad.location} to ${endRoad.location}!`);
  } else {
    const errorMsg = [];
    if (!startRoad) errorMsg.push(`Invalid start: "${start}"`);
    if (!endRoad) errorMsg.push(`Invalid end: "${end}"`);
    alert(`${errorMsg.join(' and ')}. Try partial road names from the list.`);
  }
});

// Event Listener 3: 'click' for SOS
document.getElementById('sos').addEventListener('click', () => {
  if (sosCircle) map.removeLayer(sosCircle);
  sosCircle = L.circle([-1.2864, 36.8172], { radius: 500, color: 'red' }).addTo(map);
  alert('SOS Alert! Emergency reported near Nairobi CBD, Kenya.');
});

// Fetch weather from Open-Meteo with retry and diagnostics
async function fetchWeather(retries = 3, delayMs = 1000) {
  const weatherDiv = document.getElementById('weather');
  weatherDiv.textContent = 'Nairobi Weather: Fetching...';
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-1.2864&longitude=36.8172&current_weather=true&wind_speed_unit=kmh', {
        mode: 'cors' // Ensure CORS compatibility
      });
      if (!response.ok) throw new Error(`Weather API failed: ${response.status} - ${response.statusText}`);
      const data = await response.json();
      if (!data.current_weather) throw new Error('Invalid weather data format');
      
      const { temperature, weathercode, windspeed, winddirection } = data.current_weather;
      const weatherIcons = {
        0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 61: '🌧️', 63: '⛈️'
      };
      const weatherDesc = {
        0: 'Clear', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast', 61: 'Rain', 63: 'Heavy Rain'
      }[weathercode] || 'Unknown';
      const windDir = winddirection < 90 ? 'NE' : winddirection < 180 ? 'SE' : winddirection < 270 ? 'SW' : 'NW';
      
      weatherDiv.textContent = `Nairobi Weather: ${weatherIcons[weathercode] || '❓'} ${weatherDesc}, ${temperature}°C, Wind: ${windspeed} km/h ${windDir}`;
      return true;
    } catch (error) {
      console.error(`Weather fetch attempt ${i + 1}/${retries}:`, error.message);
      if (i === retries - 1) {
        weatherDiv.textContent = 'Nairobi Weather: ❓ Unavailable (Check internet or API status)';
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

// Dynamic traffic updates
function updateTraffic() {
  const statuses = ['clear', 'moderate', 'congested'];
  allRoads.forEach(road => {
    const isMajorRoad = road.location.includes('Road') || road.location.includes('Avenue');
    const randomFactor = Math.random();
    const newStatus = isMajorRoad && randomFactor > 0.4 ? 'congested' :
                      !isMajorRoad && randomFactor < 0.6 ? 'clear' : 'moderate';
    
    if (road.trafficStatus !== newStatus) {
      road.trafficStatus = newStatus;
      const marker = markers.find(m => m._popup._content.includes(road.location));
      if (marker) {
        marker.setPopupContent(`
          <strong>${road.location}</strong><br>
          Traffic: ${road.trafficStatus}<br>
          Accident: ${road.accident}<br>
          Condition: ${road.roadCondition}
        `);
      }
    }
  });
  displayRoads(allRoads, true);
}

function startTrafficUpdates() {
  if (allRoads.length) setInterval(updateTraffic, 15000);
}

// Initial load
async function initializeApp() {
  await fetchWeather();
  await fetchRoadData();
}

initializeApp();