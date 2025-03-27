import { showNotification, getCurrentPosition } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('report.html')) {
        initializeReport();
    }
});

function initializeReport() {
    const form = document.createElement('form');
    form.id = 'incident-form';
    form.innerHTML = `
        <h2>Report Incident</h2>
        <select id="incident-type">
            <option value="accident">Accident</option>
            <option value="hazard">Road Hazard</option>
            <option value="weather">Weather Issue</option>
            <option value="ambulance">Request Ambulance</option>
            <option value="first-aid">Emergency First Aid</option>
        </select>
        <textarea id="description" placeholder="Describe the incident"></textarea>
        <button type="submit" class="action-btn">Submit Report</button>
        <button id="emergency-btn" class="action-btn sos-btn">SOS</button>
    `;
    document.body.appendChild(form);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('incident-type').value;
        const description = document.getElementById('description').value;
        if (!type || !description) return;
        try {
            const position = await getCurrentPosition();
            const incident = { type, description, lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() };
            const incidents = JSON.parse(localStorage.getItem('incidents')) || [];
            incidents.push(incident);
            localStorage.setItem('incidents', JSON.stringify(incidents));
            showNotification(`Reported: ${type}`);
            if (type === 'ambulance' || type === 'first-aid') {
                const securityEvents = JSON.parse(localStorage.getItem('securityEvents')) || [];
                securityEvents.push({ type: `${type.toUpperCase()} REQUEST`, lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() });
                localStorage.setItem('securityEvents', JSON.stringify(securityEvents));
                showNotification(`${type.toUpperCase()} service dispatched`);
            }
            form.reset();
        } catch (error) {
            showNotification('Enable location services', true);
        }
    });

    document.getElementById('emergency-btn').addEventListener('click', () => {
        if (confirm('Send SOS?')) {
            const btn = document.getElementById('emergency-btn');
            btn.classList.add('blinking');
            getCurrentPosition()
                .then(position => {
                    const event = { type: 'Emergency SOS', lat: position.coords.latitude, lng: position.coords.longitude, timestamp: new Date().toISOString() };
                    const securityEvents = JSON.parse(localStorage.getItem('securityEvents')) || [];
                    securityEvents.push(event);
                    localStorage.setItem('securityEvents', JSON.stringify(securityEvents));
                    showNotification(`SOS sent from ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
                    setTimeout(() => btn.classList.remove('blinking'), 5000);
                })
                .catch(() => {
                    showNotification('Location required for SOS', true);
                    setTimeout(() => btn.classList.remove('blinking'), 5000);
                });
        }
    });
}