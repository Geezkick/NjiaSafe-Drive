import { initializeMap, loadIncidentsOnMap } from './map.js';
import { showNotification, getCurrentPosition } from './utils.js';
import { userPlan } from './main.js';

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('navigation.html')) {
        initializeNavigation();
    }
});

function initializeNavigation() {
    initializeMap();
    const elements = {
        shortestRouteBtn: document.getElementById('shortest-route-btn'),
        lessTrafficBtn: document.getElementById('less-traffic-btn'),
        safestRouteBtn: document.getElementById('safest-route-btn'),
        gasStationBtn: document.getElementById('gas-station-btn'),
        garageBtn: document.getElementById('garage-btn'),
        marketBtn: document.getElementById('market-btn'),
        subscriptionBtn: document.getElementById('subscription-btn'),
        subModal: document.getElementById('subscription-modal')
    };

    elements.shortestRouteBtn.addEventListener('click', () => navigate('shortest'));
    elements.lessTrafficBtn.addEventListener('click', () => navigate('less-traffic'));
    elements.safestRouteBtn.addEventListener('click', () => navigate('safest'));
    elements.gasStationBtn.addEventListener('click', () => findNearest('gas_station'));
    elements.garageBtn.addEventListener('click', () => findNearest('garage'));
    elements.marketBtn.addEventListener('click', () => findNearest('supermarket'));
    elements.subscriptionBtn.addEventListener('click', () => elements.subModal.style.display = 'block');

    getCurrentPosition()
        .then(position => {
            const { latitude, longitude } = position.coords;
            if (window.map) window.map.setView([latitude, longitude], 13);
            loadIncidentsOnMap();
        });
}

async function navigate(type) {
    if (userPlan !== 'premium') {
        showNotification('Upgrade to Premium for navigation', true);
        document.getElementById('subscription-modal').style.display = 'block';
        return;
    }
    try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        if (window.map) {
            window.map.setView([latitude, longitude], 13);
            window.markersLayer.clearLayers();
            const destination = [latitude + 0.05, longitude + 0.05];
            let routePoints;
            switch (type) {
                case 'shortest':
                    routePoints = [[latitude, longitude], destination];
                    break;
                case 'less-traffic':
                    routePoints = [[latitude, longitude], [latitude + 0.02, longitude + 0.02], destination];
                    break;
                case 'safest':
                    routePoints = [[latitude, longitude], [latitude + 0.03, longitude - 0.03], destination];
                    break;
            }
            L.polyline(routePoints, { color: '#00cc99' }).addTo(window.markersLayer);
            showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} route calculated`);
        }
    } catch (error) {
        showNotification('Location access required', true);
    }
}

async function findNearest(type) {
    if (userPlan !== 'premium') {
        showNotification('Upgrade to Premium for this feature', true);
        document.getElementById('subscription-modal').style.display = 'block';
        return;
    }
    try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        if (window.map) {
            window.map.setView([latitude, longitude], 13);
            window.markersLayer.clearLayers();
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${type}&format=json&limit=3&lat=${latitude}&lon=${longitude}`);
            const locations = await response.json();
            locations.forEach(loc => {
                L.marker([loc.lat, loc.lon]).bindPopup(loc.display_name).addTo(window.markersLayer);
            });
            showNotification(`Nearest ${type.replace('_', ' ')}s located`);
        }
    } catch (error) {
        showNotification('Location access required', true);
    }
}