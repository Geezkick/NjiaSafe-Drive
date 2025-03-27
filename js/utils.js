function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.style.backgroundColor = isError ? '#ff4d4d' : '#00cc99';
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 3000);
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

export { showNotification, getCurrentPosition };