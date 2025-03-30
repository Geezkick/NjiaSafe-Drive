async function fetchWeather(force = false) {
    // ...
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentPosition.lat}&longitude=${currentPosition.lng}&current_weather=true&hourly=temperature_2m,precipitation,windspeed_10m,relativehumidity_2m&daily=sunrise,sunset&timezone=Africa/Nairobi`;
    // ...
  }
  const apiKey = "YOUR_OPEN_METEO_API_KEY_HERE";
const url = `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,rain,precipitation,relative_humidity_2m,visibility&current=is_day,wind_speed_10m,relative_humidity_2m&wind_speed_unit=ms${apiKey}`;

async function findFuelStations() {
    // ...
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=[out:json];node(around:5000,${currentPosition.lat},${currentPosition.lng})["amenity"="fuel"];out;`);
    // ...
  }

  async function fetchRealTraffic() {
    const apiKey = "h6vDGMt5pNROz3aXE24AdrQStkPwPE7T"; // Replace with your TomTom API key
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${apiKey}&point=${currentPosition.lat},${currentPosition.lng}`;
    // ...
  }