import { initializeMap } from './map.js';
import { showNotification, getCurrentPosition } from './utils.js';

const OPENWEATHERMAP_API_KEY = 'your_openweathermap_api_key_here';
let userPlan = localStorage.getItem('userPlan') || 'free';
let v2vDailyCount = parseInt(localStorage.getItem('v2vDailyCount')) || 0;
let lastResetDate = localStorage.getItem('lastResetDate') || new Date().toDateString();

document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    initializeThemeToggle();
    initializeMap();
    resetV2VCountIfNeeded();
    if (page === 'index.html') initializeHome();
    simulateLiveData();
});

function initializeThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;
    const body = document.body;
    body.dataset.theme = localStorage.getItem('theme') || 'dark';
    toggleBtn.textContent = body.dataset.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    toggleBtn.addEventListener('click', () => {
        body.dataset.theme = body.dataset.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', body.dataset.theme);
        toggleBtn.textContent = body.dataset.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    });
}

function simulateLiveData() {
    setInterval(() => {
        const v2vCount = document.getElementById('v2v-count');
        const v2vSignal = document.getElementById('v2v-signal');
        if (v2vCount) v2vCount.textContent = Math.floor(Math.random() * 15) + 3;
        if (v2vSignal) v2vSignal.textContent = `${Math.floor(Math.random() * 90) + 10}%`;
    }, 10000);
}

function resetV2VCountIfNeeded() {
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
        v2vDailyCount = 0;
        localStorage.setItem('v2vDailyCount', v2vDailyCount);
        localStorage.setItem('lastResetDate', today);
    }
}

function initializeHome() {
    const elements = {
        mapContainer: document.getElementById('map-container'),
        v2vSection: document.getElementById('v2v-section'),
        v2vSend: document.getElementById('v2v-send'),
        v2vInput: document.getElementById('v2v-input'),
        v2vMessagesDiv: document.getElementById('v2v-messages'),
        weatherSection: document.getElementById('weather-section'),
        refreshWeatherBtn: document.getElementById('refresh-weather-btn'),
        subscriptionBtn: document.getElementById('subscription-btn'),
        subModal: document.getElementById('subscription-modal'),
        closeModal: document.querySelectorAll('.close-modal'),
        exitBtn: document.getElementById('exit-btn')
    };

    elements.subscriptionBtn.addEventListener('click', () => elements.subModal.style.display = 'block');
    elements.closeModal.forEach(btn => btn.addEventListener('click', () => elements.subModal.style.display = 'none'));
    elements.exitBtn.addEventListener('click', () => window.location.href = 'https://www.google.com');
    elements.v2vSend.addEventListener('click', () => {
        if (userPlan === 'free' && v2vDailyCount >= 5) {
            showNotification('Upgrade to Pro for unlimited V2V messages', true);
            elements.subModal.style.display = 'block';
        } else {
            sendV2VMessage(elements.v2vInput.value, elements.v2vMessagesDiv);
            v2vDailyCount++;
            localStorage.setItem('v2vDailyCount', v2vDailyCount);
        }
    });
    elements.refreshWeatherBtn.addEventListener('click', fetchAndDisplayWeather);
    document.querySelectorAll('.subscribe-btn').forEach(btn => btn.addEventListener('click', () => subscribe(btn.dataset.plan)));

    getCurrentPosition()
        .then(position => {
            const { latitude, longitude } = position.coords;
            fetchWeatherData(latitude, longitude);
            loadV2VMessages();
        })
        .catch(() => fetchWeatherData());
}

function sendV2VMessage(message, messagesDiv) {
    const v2vMessages = JSON.parse(localStorage.getItem('v2vMessages')) || [];
    if (!message) return;
    const msg = { text: message, timestamp: new Date().toLocaleTimeString(), sender: 'You' };
    v2vMessages.push(msg);
    localStorage.setItem('v2vMessages', JSON.stringify(v2vMessages));
    messagesDiv.innerHTML = v2vMessages.map(m => `<p>${m.sender}: ${m.text} <small>(${m.timestamp})</small></p>`).join('');
    document.getElementById('v2v-input').value = '';
    showNotification('Message sent');
}

function loadV2VMessages() {
    const messagesDiv = document.getElementById('v2v-messages');
    if (!messagesDiv) return;
    const v2vMessages = JSON.parse(localStorage.getItem('v2vMessages')) || [];
    messagesDiv.innerHTML = v2vMessages.map(m => `<p>${m.sender}: ${m.text} <small>(${m.timestamp})</small></p>`).join('');
}

async function fetchWeatherData(lat = 51.505, lon = -0.09) {
    try {
        const position = await getCurrentPosition().catch(() => ({ coords: { latitude: lat, longitude: lon } }));
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`);
        const data = await response.json();
        document.getElementById('weather-temp').textContent = data.main.temp.toFixed(1);
        document.getElementById('weather-condition').textContent = data.weather[0].description;
        document.getElementById('weather-wind').textContent = data.wind.speed.toFixed(1);
        document.getElementById('weather-humidity').textContent = data.main.humidity;
        document.getElementById('weather-precip').textContent = data.rain ? data.rain['1h'] : 0;
        showNotification('Weather updated');
    } catch (error) {
        showNotification('Weather data unavailable', true);
    }
}

function subscribe(plan) {
    userPlan = plan;
    localStorage.setItem('userPlan', plan);
    document.getElementById('subscription-modal').style.display = 'none';
    v2vDailyCount = 0;
    localStorage.setItem('v2vDailyCount', v2vDailyCount);
    showNotification(`Subscribed to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`);
}

export { userPlan };