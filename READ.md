# NjiaSafe Drive - Advanced Road Ecosystem

A  web app for road safety and connectivity.

## Features
- **Theme**: Black-blue-purple with light/dark modes.
- **Design**: Complex, animated UI with floating buttons and tooltips.
- **Home**: Interactive map, V2V with stats, road analytics with visuals, dual-API weather (temp, wind, humidity, precip).
- **Report**: Enhanced incident types including security.
- **Dashboard**: Filterable incident list with location search.
- **Security**: SOS with siren, traffic alerts, live security log, CCTV.
- **Bonus**: Live V2V stats, traffic density visual, security event simulation.

## Setup
1. Replace `OPENWEATHERMAP_API_KEY` in `script.js` with your key from [OpenWeatherMap](https://openweathermap.org/).
2. Add assets: `traffic-video.mp4`, `logo.png`, `warning.png`, `cctv-sample.mp4`, `siren.mp3`.
3. Serve via `npx live-server`.

## Deployment
- Push to GitHub: `git push origin main`
- Host on GitHub Pages or a static server.