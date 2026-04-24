import { append, read } from './storage.js';

export const ALERT_TYPES = {
  HARASSMENT: {
    id: 'HARASSMENT',
    label: 'Harassment Detected',
    severity: 'critical',
    color: 'danger',
  },
  LONE_WOMAN: {
    id: 'LONE_WOMAN',
    label: 'Lone Woman Detected',
    severity: 'warn',
    color: 'warn',
  },
  LONE_WOMAN_SURROUNDED: {
    id: 'LONE_WOMAN_SURROUNDED',
    label: 'Lone Woman Surrounded',
    severity: 'critical',
    color: 'danger',
  },
};

const cooldowns = new Map();
const COOLDOWN_MS = 10_000;

export function fireAlert(typeId, { snapshotDataUrl = null, meta = {} } = {}) {
  const now = Date.now();
  const last = cooldowns.get(typeId) ?? 0;
  if (now - last < COOLDOWN_MS) return null;
  cooldowns.set(typeId, now);

  const def = ALERT_TYPES[typeId];
  if (!def) return null;

  const alert = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    type: typeId,
    label: def.label,
    severity: def.severity,
    ts: now,
    snapshotDataUrl,
    meta,
  };
  append('alerts', alert, 200);
  window.dispatchEvent(new CustomEvent('protecther:alert', { detail: alert }));
  return alert;
}

export function listAlerts() {
  return read('alerts', []);
}

export function unreadCount() {
  const prefs = read('prefs', {});
  const lastSeen = prefs.lastSeenAlertTs ?? 0;
  return listAlerts().filter((a) => a.ts > lastSeen).length;
}

export function markAllAlertsSeen() {
  const list = listAlerts();
  const lastTs = list[0]?.ts ?? Date.now();
  const prefs = read('prefs', {});
  prefs.lastSeenAlertTs = lastTs;
  localStorage.setItem('protecther.prefs', JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent('protecther:alerts-seen'));
}
