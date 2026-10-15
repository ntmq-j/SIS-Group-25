import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import 'leaflet/dist/leaflet.css';
import './index.css'; 

// React-Leaflet creates and removes an imperative Leaflet map instance. In
// React 19 development StrictMode, the intentional mount/unmount probe can
// race with Leaflet's layer cleanup when the lazy-loaded Host Event form is
// opened, leaving the page blank. Keep the root single-mounted; production
// builds were never double-mounted.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// to run the project with docker: -Saba
// docker run --rm -p 5173:5173 -v "${PWD}:/app" -w /app node:lts sh -c "npm install && npm run dev -- --host 0.0.0.0 --port 5173"
