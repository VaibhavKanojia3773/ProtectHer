// Bridges the browser to the Python harassment backend (server/app.py).
// Browser still does face / gender / emotion via MediaPipe + face-api.js (30 FPS).
// This module sends a JPEG snapshot every ~3 s and returns the trained score.

const BASE = (import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:5005').replace(/\/$/, '');
const INFER_INTERVAL_MS = 3000;
const HEALTH_INTERVAL_MS = 5000;

const state = {
  online: false,
  lastScore: null,
  lastLabel: null,
  lastMs: null,
  lastError: null,
};

let healthTimer = null;
let inferring = false;
let lastInferAt = 0;

export function getBackendState() {
  return { ...state };
}

export function startHealthChecks(onChange = () => {}) {
  if (healthTimer) clearInterval(healthTimer);
  const tick = async () => {
    const wasOnline = state.online;
    try {
      const r = await fetch(`${BASE}/health`, { method: 'GET' });
      const ok = r.ok;
      const j = ok ? await r.json() : null;
      state.online = !!(ok && j?.ok);
      state.lastError = state.online ? null : 'health failed';
    } catch (e) {
      state.online = false;
      state.lastError = e.message ?? String(e);
    }
    if (state.online !== wasOnline) onChange(state);
  };
  tick();
  healthTimer = setInterval(tick, HEALTH_INTERVAL_MS);
}

function captureJpeg(video, maxW = 320, quality = 0.7) {
  if (!video.videoWidth) return null;
  const w = video.videoWidth;
  const h = video.videoHeight;
  const scale = Math.min(1, maxW / w);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  // No mirroring — backend doesn't care, and avoids extra context ops
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
}

/**
 * Throttled inference. Call every frame; only actually fires every INFER_INTERVAL_MS.
 * Returns the latest cached score, or null if nothing yet.
 */
export async function maybeInfer(video) {
  if (!state.online) return state.lastScore;
  const now = performance.now();
  if (inferring || now - lastInferAt < INFER_INTERVAL_MS) return state.lastScore;
  lastInferAt = now;
  inferring = true;
  try {
    const blob = await captureJpeg(video);
    if (!blob) return state.lastScore;
    const fd = new FormData();
    fd.append('frame', blob, 'frame.jpg');
    const r = await fetch(`${BASE}/infer`, { method: 'POST', body: fd });
    if (!r.ok) throw new Error(`infer ${r.status}`);
    const j = await r.json();
    state.lastScore = j.score;
    state.lastLabel = j.label;
    state.lastMs = j.ms;
    state.lastError = null;
  } catch (e) {
    state.lastError = e.message ?? String(e);
  } finally {
    inferring = false;
  }
  return state.lastScore;
}

export function stopHealthChecks() {
  if (healthTimer) clearInterval(healthTimer);
  healthTimer = null;
}
