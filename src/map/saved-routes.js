// Curated demo routes — pre-defined "safer" walking paths that avoid known
// hotspots. Each route has a from/to display name plus the actual coordinates
// so the map can drop both markers and trigger routing on click.
export const SAVED_ROUTES = [
  {
    id: 'r1',
    label: 'Connaught Place → Khan Market',
    detail: 'Avoids 2 reported hotspots · ~3.4 km · ~10 min by cab',
    score: 92,
    from: { lat: 28.6328, lng: 77.2197, name: 'Connaught Place' },
    to:   { lat: 28.5985, lng: 77.2278, name: 'Khan Market' },
  },
  {
    id: 'r2',
    label: 'AIIMS → Saket',
    detail: 'Well-lit, high-foot-traffic route · ~6.1 km',
    score: 88,
    from: { lat: 28.5672, lng: 77.2100, name: 'AIIMS Metro' },
    to:   { lat: 28.5244, lng: 77.2066, name: 'Saket Metro' },
  },
  {
    id: 'r3',
    label: 'Andheri Stn → Powai',
    detail: 'Mumbai · busy main road, avoids 1 dim alley · ~7.8 km',
    score: 84,
    from: { lat: 19.1197, lng: 72.8468, name: 'Andheri East' },
    to:   { lat: 19.1176, lng: 72.9060, name: 'Powai' },
  },
  {
    id: 'r4',
    label: 'MG Road → Indiranagar',
    detail: 'Bengaluru · 100 ft road, well patrolled · ~5.2 km',
    score: 90,
    from: { lat: 12.9756, lng: 77.6068, name: 'MG Road' },
    to:   { lat: 12.9784, lng: 77.6408, name: 'Indiranagar' },
  },
];

export const EMERGENCY_CONTACTS = [
  { num: '112', label: 'All-India Emergency' },
  { num: '1091', label: 'Women Helpline' },
  { num: '181', label: 'Women in Distress' },
];
