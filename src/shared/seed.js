// Seeds localStorage with demo data on first run so the app feels alive
// without needing the user to trigger every event manually.
import { read, write } from './storage.js';

const SEED_KEY = 'protecther.seeded.v1';

const HOURS = (n) => n * 3600 * 1000;
const MIN = (n) => n * 60 * 1000;

function tinySnap(color) {
  // 1x1 PNG data URL of the given color — placeholder thumbnail
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📹', 32, 40);
  return c.toDataURL('image/jpeg', 0.7);
}

const SEED_ALERTS = () => {
  const now = Date.now();
  return [
    {
      id: 's1', type: 'HARASSMENT', label: 'Harassment Detected', severity: 'critical',
      ts: now - MIN(12),
      snapshotDataUrl: tinySnap('#f43f5e'),
      meta: { faceCount: 3, maleCount: 2, femaleCount: 1, emotion: 'fearful', score: 0.84 },
    },
    {
      id: 's2', type: 'LONE_WOMAN_SURROUNDED', label: 'Lone Woman Surrounded', severity: 'critical',
      ts: now - HOURS(2) - MIN(15),
      snapshotDataUrl: tinySnap('#a78bfa'),
      meta: { faceCount: 4, maleCount: 3, femaleCount: 1 },
    },
    {
      id: 's3', type: 'LONE_WOMAN', label: 'Lone Woman Detected', severity: 'warn',
      ts: now - HOURS(5),
      snapshotDataUrl: tinySnap('#facc15'),
      meta: { faceCount: 1, maleCount: 0, femaleCount: 1 },
    },
    {
      id: 's4', type: 'HARASSMENT', label: 'Harassment Detected', severity: 'critical',
      ts: now - HOURS(9) - MIN(20),
      snapshotDataUrl: tinySnap('#f43f5e'),
      meta: { faceCount: 2, maleCount: 1, femaleCount: 1, emotion: 'angry', score: 0.71 },
    },
    {
      id: 's5', type: 'LONE_WOMAN', label: 'Lone Woman Detected', severity: 'warn',
      ts: now - HOURS(20),
      snapshotDataUrl: tinySnap('#facc15'),
      meta: { faceCount: 1, maleCount: 0, femaleCount: 1 },
    },
    {
      id: 's6', type: 'LONE_WOMAN_SURROUNDED', label: 'Lone Woman Surrounded', severity: 'critical',
      ts: now - HOURS(28),
      snapshotDataUrl: tinySnap('#a78bfa'),
      meta: { faceCount: 4, maleCount: 3, femaleCount: 1 },
    },
  ];
};

const SEED_FEEDBACK = () => {
  const now = Date.now();
  return [
    {
      id: 'fb1', ts: now - HOURS(3),
      severity: 'high', name: 'Anonymous',
      location: 'Connaught Place, Delhi',
      type: 'Stalking / following',
      description: 'A man followed me from the metro exit for about 5 minutes. He turned away when I stopped at a chai stall with other people around.',
    },
    {
      id: 'fb2', ts: now - HOURS(18),
      severity: 'medium', name: 'Priya',
      location: 'Andheri East, Mumbai',
      type: 'Verbal harassment',
      description: 'Group of men outside a paan shop near the station. Loud comments. Reported to local police via 100.',
    },
    {
      id: 'fb3', ts: now - HOURS(36),
      severity: 'low', name: 'Anonymous',
      location: 'MG Road, Bengaluru',
      type: 'Unsafe area / poor lighting',
      description: 'Two streetlights out near the bus stop. Walked the long way around. Adding here so others can avoid after 9pm.',
    },
  ];
};

export function seedDemoDataIfNeeded() {
  if (localStorage.getItem(SEED_KEY)) return;
  const existingAlerts = read('alerts', []);
  const existingFeedback = read('feedback', []);
  if (existingAlerts.length === 0) write('alerts', SEED_ALERTS());
  if (existingFeedback.length === 0) write('feedback', SEED_FEEDBACK());
  localStorage.setItem(SEED_KEY, '1');
}
