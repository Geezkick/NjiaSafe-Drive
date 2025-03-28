// script.js
let mapInstance, directionsService, directionsRenderer, leafletMap, trafficLayer;
let isGoogleMapsLoaded = false;
let isTrafficVisible = false;

function initMap() {
    isGoogleMapsLoaded = true;
    mapInstance = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 13
    });
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ map: mapInstance });
    trafficLayer = new google.maps.TrafficLayer();
}

class SmartRoadSystem {
    constructor() {
        this.currentPosition = { lat: 37.7749, lng: -122.4194 };
        this.googleMapsApiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with actual key
        this.openWeatherApiKey = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with actual key
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.fetchWeather();
        this.monitorVehicle();
        this.loadSafestCars();
        this.updateFuelPrices();
        if (!isGoogleMapsLoaded) {
            this.initFallbackMap();
        }
    }

    initFallbackMap() {
        leafletMap = L.map('map').setView([37.7749, -122.4194], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(leafletMap);
    }

    setupEventListeners() {
        const events = {
            'sosBtn': () => this.handleSOS(),
            'shortestRouteBtn': () => this.findShortestRoute(),
            'safestRouteBtn': () => this.findSafestRoute(),
            'subscribeBtn': () => this.handleSubscription(),
            'vehicleStatsBtn': () => this.showVehicleStats(),
            'useLocationBtn': () => this.useCurrentLocation(),
            'voiceControlBtn': () => this.startVoiceControl(),
            'trafficToggleBtn': () => this.toggleTraffic(),
            'hospitalBtn': () => this.findNearest('hospital'),
            'policeBtn': () => this.findNearest('police'),
            'gasBtn': () => this.findNearest('gas_station'),
            'shoppingBtn': () => this.findNearest('shopping_mall'),
            'garageBtn': () => this.findNearest('car_repair'),
            'airportBtn': () => this.findNearest('airport'),
            'searchRouteBtn': () => this.searchRoute(),
            'closeDashboard': () => this.hideDashboard(),
            'carSearch': (e) => this.searchCars(e.target.value)
        };

        for (const [id, handler] of Object.entries(events)) {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(id === 'carSearch' ? 'input' : 'click', handler);
            }
        }
    }

    showDashboard(title, content) {
        const dashboard = document.getElementById('dashboardScreen');
        const mapContainer = document.querySelector('.map-container');
        document.getElementById('dashboardTitle').textContent = title;
        document.getElementById('routeInfo').innerHTML = content;
        dashboard.classList.add('active');
        mapContainer.classList.add('fade');
    }

    hideDashboard() {
        const dashboard = document.getElementById('dashboardScreen');
        const mapContainer = document.querySelector('.map-container');
        dashboard.classList.remove('active');
        mapContainer.classList.remove('fade');
    }

    async fetchWeather() {
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${this.currentPosition.lat}&lon=${this.currentPosition.lng}&appid=${this.openWeatherApiKey}&units=metric`);
            const data = await response.json();
            document.getElementById('temp').textContent = `${Math.round(data.main.temp)}°C`;
            document.getElementById('humidity').textContent = `${data.main.humidity}%`;
            document.getElementById('conditions').textContent = data.weather[0].description;
            document.getElementById('climateTrend').textContent = data.main.temp > 15 ? 'Above average' : 'Below average';
            
            // Weather alerts
            const weatherId = data.weather[0].id;
            if (weatherId < 600) { // Rain, storm, etc.
                document.getElementById('weatherAlert').textContent = 'Warning: Severe weather conditions!';
                this.showDashboard('Weather Alert', '<p>Caution: Severe weather detected in your area</p>');
            }
            
            document.getElementById('weatherDetails').classList.add('active');
            document.getElementById('weatherInfo').querySelector('span').style.display = 'none';
        } catch (error) {
            this.showDashboard('Weather Error', '<p>Unable to fetch weather data</p>');
        }
    }

    monitorVehicle() {
        setInterval(() => {
            document.getElementById('speedMonitor').textContent = `Speed: ${Math.floor(Math.random() * 80)} mph`;
            document.getElementById('v2vStatus').textContent = `V2V: Connected (${Math.floor(Math.random() * 5)})`;
            document.getElementById('fuelEfficiency').textContent = `Fuel: ${Math.floor(Math.random() * 40 + 20)} mpg`;
            const isGreen = Math.random() > 0.5;
            document.getElementById('trafficLightIndicator').className = `traffic-light ${isGreen ? 'green' : 'red'}`;
        }, 2000);
    }

    loadSafestCars() {
        this.searchCars('');
    }

    searchCars(query) {
        const carData = [
            { name: 'Volvo XC90', safety: '5 stars', price: '$55,000', image: 'https://via.placeholder.com/100x60?text=Volvo+XC90' },
            { name: 'Tesla Model Y', safety: '5 stars', price: '$52,000', image: 'https://via.placeholder.com/100x60?text=Tesla+Model+Y' },
            { name: 'Subaru Outback', safety: '5 stars', price: '$35,000', image: 'https://via.placeholder.com/100x60?text=Subaru+Outback' }
        ];

        const results = carData.filter(car => car.name.toLowerCase().includes(query.toLowerCase()));
        document.getElementById('carResults').innerHTML = results.map(car => `
            <div class="car-result">
                <img src="${car.image}" alt="${car.name}">
                <div>
                    <strong>${car.name}</strong><br>
                    Safety: ${car.safety}<br>
                    Price: ${car.price}
                </div>
            </div>
        `).join('');
    }

    async updateFuelPrices() {
        if (!isGoogleMapsLoaded) return;
        const service = new google.maps.places.PlacesService(mapInstance);
        try {
            const results = await new Promise((resolve, reject) => {
                service.nearbySearch({
                    location: this.currentPosition,
                    radius: 5000,
                    type: 'gas_station'
                }, (results, status) => {
                    if (status === 'OK') resolve(results.slice(0, 3));
                    else reject(status);
                });
            });
            
            const fuelData = results.map((station, index) => ({
                name: station.name,
                price: `$${(2.5 + Math.random() * 2).toFixed(2)}/gal` // Simulated prices
            }));
            
            document.getElementById('fuelPriceResults').innerHTML = fuelData.map(station => `
                <div class="fuel-result">
                    <span>${station.name}</span>
                    <span>${station.price}</span>
                </div>
            `).join('');
        } catch (error) {
            document.getElementById('fuelPriceResults').innerHTML = '<p>Fuel prices unavailable</p>';
        }
    }

    async searchRoute() {
        const searchQuery = document.getElementById('routeSearch').value;
        if (!searchQuery || !isGoogleMapsLoaded) {
            this.showDashboard('Route Error', '<p>Please enter a destination and ensure map is loaded</p>');
            return;
        }

        const geocoder = new google.maps.Geocoder();
        try {
            const results = await new Promise((resolve, reject) => {
                geocoder.geocode({ address: searchQuery }, (results, status) => {
                    if (status === 'OK') resolve(results);
                    else reject(status);
                });
            });
            const destination = results[0].geometry.location;
            await this.calculateRoute(this.currentPosition, destination, 'Route to ' + searchQuery);
        } catch (error) {
            this.showDashboard('Route Error', '<p>Could not find route</p>');
        }
    }

    async findShortestRoute() {
        if (!isGoogleMapsLoaded) {
            this.showDashboard('Route Error', '<p>Map not loaded</p>');
            return;
        }
        const destination = { lat: 37.7849, lng: -122.4294 };
        await this.calculateRoute(this.currentPosition, destination, 'Shortest Route');
    }

    async findSafestRoute() {
        if (!isGoogleMapsLoaded) {
            this.showDashboard('Route Error', '<p>Map not loaded</p>');
            return;
        }
        const destination = { lat: 37.7849, lng: -122.4294 };
        await this.calculateRoute(this.currentPosition, destination, 'Safest Route', { avoidHighways: true });
    }

    async findNearest(type) {
        if (!isGoogleMapsLoaded) {
            this.showDashboard('Search Error', '<p>Map not loaded</p>');
            return;
        }
        const service = new google.maps.places.PlacesService(mapInstance);
        try {
            const results = await new Promise((resolve, reject) => {
                service.nearbySearch({
                    location: this.currentPosition,
                    radius: 5000,
                    type: type
                }, (results, status) => {
                    if (status === 'OK' && results.length) resolve(results);
                    else reject(status);
                });
            });
            const place = results[0];
            await this.calculateRoute(this.currentPosition, place.geometry.location, `Nearest ${type.replace('_', ' ')}: ${place.name}`);
        } catch (error) {
            this.showDashboard('Search Error', `<p>No ${type.replace('_', ' ')} found nearby</p>`);
        }
    }

    async calculateRoute(origin, destination, title, options = {}) {
        try {
            const result = await new Promise((resolve, reject) => {
                directionsService.route({
                    origin,
                    destination,
                    travelMode: google.maps.TravelMode.DRIVING,
                    ...options
                }, (result, status) => {
                    if (status === 'OK') resolve(result);
                    else reject(status);
                });
            });
            directionsRenderer.setDirections(result);
            const distance = result.routes[0].legs[0].distance.text;
            const duration = result.routes[0].legs[0].duration.text;
            this.showDashboard(title, `
                <p>Distance: ${distance}</p>
                <p>Duration: ${duration}</p>
            `);
        } catch (error) {
            this.showDashboard('Route Error', '<p>Could not calculate route</p>');
        }
    }

    async useCurrentLocation() {
        if (!navigator.geolocation) {
            this.showDashboard('Location Error', '<p>Geolocation not supported</p>');
            return;
        }
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            this.currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            if (isGoogleMapsLoaded) {
                mapInstance.setCenter(this.currentPosition);
                new google.maps.Marker({ position: this.currentPosition, map: mapInstance });
            } else {
                leafletMap.setView([this.currentPosition.lat, this.currentPosition.lng], 13);
                L.marker([this.currentPosition.lat, this.currentPosition.lng]).addTo(leafletMap);
            }
            await this.fetchWeather();
            this.updateFuelPrices();
            this.showDashboard('Location Update', '<p>Location updated to current position</p>');
        } catch (error) {
            this.showDashboard('Location Error', '<p>Could not get location</p>');
        }
    }

    handleSOS() {
        const sosBtn = document.getElementById('sosBtn');
        sosBtn.classList.add('active');
        this.showDashboard('Emergency SOS', '<p>Alert sent to authorities!<br>Location shared</p>');
        setTimeout(() => {
            sosBtn.classList.remove('active');
        }, 5000);
    }

    handleSubscription() {
        this.showDashboard('Subscription', '<p>Premium subscription activated!<br>Full features unlocked</p>');
    }

    showVehicleStats() {
        const speed = document.getElementById('speedMonitor').textContent;
        const v2v = document.getElementById('v2vStatus').textContent;
        const fuel = document.getElementById('fuelEfficiency').textContent;
        this.showDashboard('Vehicle Statistics', `
            <p>${speed}</p>
            <p>${v2v}</p>
            <p>${fuel}</p>
        `);
    }

    startVoiceControl() {
        if (!('webkitSpeechRecognition' in window)) {
            this.showDashboard('Voice Error', '<p>Voice control not supported in this browser</p>');
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            if (command.includes('emergency') || command.includes('sos')) this.handleSOS();
            else if (command.includes('shortest')) this.findShortestRoute();
            else if (command.includes('safest')) this.findSafestRoute();
            else if (command.includes('location')) this.useCurrentLocation();
            else if (command.includes('traffic')) this.toggleTraffic();
            else this.showDashboard('Voice Command', `<p>Command "${command}" not recognized</p>`);
        };

        recognition.onerror = () => {
            this.showDashboard('Voice Error', '<p>Could not process voice command</p>');
        };

        recognition.start();
        this.showDashboard('Voice Control', '<p>Say: "emergency", "shortest route", "safest route", "location", or "traffic"</p>');
    }

    toggleTraffic() {
        if (!isGoogleMapsLoaded) {
            this.showDashboard('Traffic Error', '<p>Traffic layer requires Google Maps</p>');
            return;
        }
        isTrafficVisible = !isTrafficVisible;
        trafficLayer.setMap(isTrafficVisible ? mapInstance : null);
        document.getElementById('trafficToggleBtn').textContent = 
            isTrafficVisible ? 'Hide Traffic' : 'Show Traffic';
        this.showDashboard('Traffic Info', `<p>Traffic layer ${isTrafficVisible ? 'enabled' : 'disabled'}</p>`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SmartRoadSystem();
});