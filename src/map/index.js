import L from 'leaflet';
import 'leaflet-routing-machine';
import { mountLayout } from '../shared/layout.js';
import { HOTSPOTS, DEFAULT_CENTER, DEFAULT_ZOOM } from './hotspots.js';
import { SAVED_ROUTES, EMERGENCY_CONTACTS } from './saved-routes.js';
import { pickSafest } from './safest-route.js';
import './map.css';

const page = mountLayout({
  title: 'Safety Map',
  subtitle: 'Hotspots + safest-route planner',
  status: { label: 'Leaflet · OSM · Nominatim', tone: '' },
  actions: `<button class="btn btn-secondary" id="btn-locate">📍 My location</button>
            <button class="btn btn-ghost" id="btn-reset">Reset</button>`,
});

page.innerHTML = `
  <div class="map-shell">
    <aside class="map-side">
      <section class="glass map-card">
        <h3>Search a place</h3>
        <p class="muted">Free OpenStreetMap geocoding — try "Connaught Place Delhi".</p>
        <input id="map-search" placeholder="Search city, area, landmark…" autocomplete="off"/>
        <div class="map-search-results" id="map-search-results"></div>
      </section>

      <section class="glass map-card">
        <h3>Plan a safe route</h3>
        <p class="muted">Click anywhere on the map: first click sets <strong>From</strong>, second sets <strong>To</strong>. We fetch 3 alternatives from OSRM and re-rank them by safety using Dijkstra.</p>
        <div class="legend-row"><span class="legend-dot from"></span> From point</div>
        <div class="legend-row"><span class="legend-dot to"></span> To point</div>
        <div class="legend-row"><span class="legend-dot route"></span> Safest route (chosen)</div>
        <div class="legend-row"><span class="legend-dot danger"></span> Reported hotspot</div>
      </section>

      <section class="glass map-card" id="safety-badge" style="display: none;"></section>

      <section class="glass map-card">
        <h3>Suggested safer routes</h3>
        <p class="muted">Pre-scored routes that avoid reported hotspots. Click to plot.</p>
        <div class="col" style="gap: 8px; margin-top: 8px;">
          ${SAVED_ROUTES.map((r) => `
            <button class="saved-route" data-route="${r.id}">
              <div class="row" style="justify-content: space-between; align-items: flex-start;">
                <strong style="font-size: 0.88rem;">${r.label}</strong>
                <span class="tag tag-ok" style="font-size: 0.66rem; padding: 2px 8px;">Safety ${r.score}</span>
              </div>
              <div class="muted" style="font-size: 0.78rem; margin-top: 4px;">${r.detail}</div>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="glass map-card">
        <h3>Quick dial</h3>
        <div class="col" style="gap: 6px;">
          ${EMERGENCY_CONTACTS.map((c) => `
            <a class="row" style="justify-content: space-between; padding: 8px 10px; border-radius: 8px; background: var(--bg-2); border: 1px solid var(--border);" href="tel:${c.num}">
              <span style="font-weight: 600;">${c.label}</span>
              <strong style="color: var(--accent);">${c.num}</strong>
            </a>
          `).join('')}
        </div>
      </section>
    </aside>
    <div class="map-canvas">
      <div id="leaflet-map"></div>
    </div>
  </div>
`;

// Fix Leaflet default-icon URLs (Vite-bundled assets)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const map = L.map('leaflet-map', { zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
}).addTo(map);

const fromIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#2dd4bf;box-shadow:0 0 0 4px rgba(45,212,191,0.3),0 0 14px #2dd4bf;border:2px solid #fff;"></div>',
  iconSize: [18, 18], iconAnchor: [9, 9],
});
const toIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#a78bfa;box-shadow:0 0 0 4px rgba(167,139,250,0.3),0 0 14px #a78bfa;border:2px solid #fff;"></div>',
  iconSize: [18, 18], iconAnchor: [9, 9],
});

let fromMarker = null;
let toMarker = null;
let routingControl = null;
let clickStage = 0;

function setFrom(latlng) {
  if (fromMarker) map.removeLayer(fromMarker);
  fromMarker = L.marker(latlng, { icon: fromIcon, draggable: true }).addTo(map).bindPopup('Start').openPopup();
  fromMarker.on('dragend', () => maybeRoute());
}
function setTo(latlng) {
  if (toMarker) map.removeLayer(toMarker);
  toMarker = L.marker(latlng, { icon: toIcon, draggable: true }).addTo(map).bindPopup('Destination').openPopup();
  toMarker.on('dragend', () => maybeRoute());
  maybeRoute();
}
function maybeRoute() {
  if (!fromMarker || !toMarker) return;
  if (routingControl) map.removeControl(routingControl);
  routingControl = L.Routing.control({
    waypoints: [fromMarker.getLatLng(), toMarker.getLatLng()],
    routeWhileDragging: false,
    addWaypoints: false,
    fitSelectedRoutes: true,
    show: true,
    showAlternatives: true,
    altLineOptions: {
      styles: [
        { color: '#5e5e80', opacity: 0.45, weight: 4 },
      ],
    },
    lineOptions: {
      styles: [
        { color: '#2dd4bf', opacity: 0.95, weight: 6 },
        { color: '#a78bfa', opacity: 0.5, weight: 3 },
      ],
    },
    createMarker: () => null,
  }).addTo(map);

  // Once routes come back, pick the safest using Dijkstra over hotspot-weighted edges
  routingControl.on('routesfound', (e) => {
    const routes = e.routes ?? [];
    if (routes.length === 0) return;
    const polylines = routes.map((r) => r.coordinates.map((c) => ({ lat: c.lat, lng: c.lng })));
    const { index, score, scores } = pickSafest(polylines);
    if (index !== 0) {
      // Tell leaflet-routing-machine to make our chosen alternative the main route
      try { routingControl._line && map.removeLayer(routingControl._line); } catch (_) {}
      routingControl._selectRoute({ route: routes[index], alternative: index });
    }
    renderSafetyBadge({ chosenIdx: index, score, scores, total: routes.length });
  });
}

function renderSafetyBadge({ chosenIdx, score, scores, total }) {
  const el = document.getElementById('safety-badge');
  if (!el) return;
  const tone = score >= 85 ? 'ok' : score >= 65 ? 'warn' : 'danger';
  el.innerHTML = `
    <div class="row" style="justify-content: space-between; align-items: baseline;">
      <strong>Safety score</strong>
      <span class="tag tag-${tone}" style="font-size: 0.74rem;">${score} / 100</span>
    </div>
    <div class="muted" style="font-size: 0.78rem; margin-top: 6px;">
      Picked alternative <strong>${chosenIdx + 1}</strong> of ${total} via Dijkstra
      over a hotspot-weighted graph${total > 1 ? ` (others scored ${scores.filter((_,i)=>i!==chosenIdx).join(', ')})` : ''}.
    </div>
  `;
  el.style.display = '';
}

map.on('click', (e) => {
  clickStage = (clickStage + 1) % 2;
  if (clickStage === 1) setFrom(e.latlng);
  else setTo(e.latlng);
});

HOTSPOTS.forEach((h) => {
  L.circle([h.lat, h.lng], {
    color: '#f43f5e',
    fillColor: '#f43f5e',
    fillOpacity: 0.22,
    weight: 1.5,
    radius: h.radius,
  }).addTo(map).bindPopup(`<strong style="color:#f43f5e">⚠ Hotspot</strong><br>${h.label}`);
});

document.getElementById('btn-locate').addEventListener('click', () => {
  if (!navigator.geolocation) return alert('Geolocation not available.');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const ll = [pos.coords.latitude, pos.coords.longitude];
      map.setView(ll, 15);
      setFrom(L.latLng(ll[0], ll[1]));
      clickStage = 1;
    },
    (err) => alert('Could not get your location: ' + err.message),
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (fromMarker) { map.removeLayer(fromMarker); fromMarker = null; }
  if (toMarker)   { map.removeLayer(toMarker); toMarker = null; }
  if (routingControl) { map.removeControl(routingControl); routingControl = null; }
  clickStage = 0;
  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
});

// Saved routes — click to plot
document.querySelectorAll('.saved-route').forEach((btn) => {
  btn.addEventListener('click', () => {
    const route = SAVED_ROUTES.find((r) => r.id === btn.dataset.route);
    if (!route) return;
    setFrom(L.latLng(route.from.lat, route.from.lng));
    fromMarker.bindPopup(route.from.name).openPopup();
    setTo(L.latLng(route.to.lat, route.to.lng));
    toMarker.bindPopup(route.to.name);
    map.fitBounds(L.latLngBounds(
      [route.from.lat, route.from.lng],
      [route.to.lat, route.to.lng]
    ).pad(0.3));
    clickStage = 0;
  });
});

// Nominatim search
const searchInput = document.getElementById('map-search');
const resultsBox = document.getElementById('map-search-results');
let searchTimer = null;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  if (q.length < 3) { resultsBox.innerHTML = ''; return; }
  searchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=in&q=${encodeURIComponent(q)}`, {
        headers: { 'Accept-Language': 'en' },
      });
      const data = await res.json();
      resultsBox.innerHTML = data.map((d) => `
        <div class="map-search-result" data-lat="${d.lat}" data-lon="${d.lon}">
          ${d.display_name}
        </div>
      `).join('') || `<div class="muted" style="padding: 6px 10px; font-size: 0.82rem;">No matches.</div>`;
      resultsBox.querySelectorAll('.map-search-result').forEach((el) => {
        el.addEventListener('click', () => {
          const lat = parseFloat(el.dataset.lat);
          const lon = parseFloat(el.dataset.lon);
          map.setView([lat, lon], 14);
          L.popup().setLatLng([lat, lon]).setContent(el.textContent.trim().slice(0, 60)).openOn(map);
          resultsBox.innerHTML = '';
          searchInput.value = '';
        });
      });
    } catch (e) {
      resultsBox.innerHTML = `<div class="muted" style="padding: 6px 10px; font-size: 0.82rem;">Search failed.</div>`;
    }
  }, 400);
});
