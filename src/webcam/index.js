import { mountLayout } from '../shared/layout.js';
import { setTopbarStatus } from '../components/topbar.js';
import { startCamera, stopCamera, attachVideoFile } from './camera.js';
import { loadFaceDetector, loadFaceApi, detectFaces, classifyAttributes, predictHarassment } from './models.js';
import { drawOverlay, syncCanvasToVideo } from './overlay.js';
import { fuseFrame, resetFusion } from './fusion.js';
import { ALERT_TYPES } from '../shared/alerts.js';
import { startHealthChecks, maybeInfer, getBackendState } from './backend.js';
import './webcam.css';

const page = mountLayout({
  title: 'Live Detection',
  subtitle: 'Browser pipeline · MediaPipe + face-api.js + (harass model placeholder)',
  status: { label: 'Camera off', tone: 'off' },
  actions: `
    <label class="btn btn-secondary" for="upload-video" style="cursor:pointer;">📁 Upload video</label>
    <input id="upload-video" type="file" accept="video/*" style="display:none;"/>
  `,
});

page.innerHTML = `
  <div class="cam-shell">
    <div class="cam-stage" id="stage">
      <video id="video" playsinline muted></video>
      <canvas id="overlay"></canvas>
      <div id="cam-empty" class="cam-empty">
        <div class="big">📹</div>
        <p>Click <strong>Start camera</strong> to begin live detection. Models load from a CDN on first use.</p>
        <button class="btn btn-primary" id="btn-start">Start camera</button>
      </div>
      <div id="cam-loader" class="loader" style="display:none;">
        <div class="spinner"></div>
        <div id="cam-loader-text" class="muted">Loading models…</div>
      </div>
      <div id="cam-banner" class="cam-banner"></div>
      <div id="cam-fps" class="cam-fps">— FPS</div>
      <div class="cam-controls">
        <button class="btn btn-secondary" id="btn-stop" style="display:none;">Stop</button>
      </div>
    </div>

    <aside class="cam-side">
      <section class="glass cam-card">
        <h3>Live signals</h3>
        <div class="kpi-row">
          <div class="kpi"><div class="kpi-label">Faces</div><div class="kpi-value" id="k-faces">0</div></div>
          <div class="kpi"><div class="kpi-label">Female / Male</div><div class="kpi-value" id="k-fm">0 / 0</div></div>
        </div>
        <div style="margin-top:10px;">
          <div class="kpi-label">Emotions</div>
          <div class="emo-row" id="emo-row"><span class="emo-chip">—</span></div>
        </div>
        <div style="margin-top:14px;">
          <div class="row" style="justify-content: space-between;">
            <div class="kpi-label">Harassment score</div>
            <span class="tag" id="backend-tag" style="font-size: 0.66rem; padding: 2px 8px;">checking…</span>
          </div>
          <div class="harass-bar"><div class="harass-bar-fill" id="harass-fill"></div></div>
          <div class="muted" style="font-size: 0.72rem; margin-top: 4px;" id="backend-help">
            Connecting to local Python backend on port 5005…
          </div>
        </div>
      </section>

      <section class="glass cam-card">
        <h3>Alert rules</h3>
        <div class="col" style="gap: 8px;">
          ${Object.values(ALERT_TYPES).map((t) => `
            <div class="row" style="justify-content: space-between;">
              <span class="tag tag-${t.color}">${t.label}</span>
              <span class="muted" style="font-size: 0.78rem;" id="rule-${t.id}">idle</span>
            </div>
          `).join('')}
        </div>
        <div class="muted" style="font-size: 0.72rem; margin-top: 10px;">
          Triggered alerts are saved to your <a href="/dashboard.html">Alert Log</a>.
        </div>
      </section>

      <section class="glass cam-card">
        <h3>Settings</h3>
        <div class="cam-toggles">
          <div class="toggle-row">
            <div>
              <label>Draw overlays</label>
              <div class="muted">Boxes, labels, banner</div>
            </div>
            <div class="switch on" data-toggle="overlay"></div>
          </div>
          <div class="toggle-row">
            <div>
              <label>Lite mode</label>
              <div class="muted">Skip gender + emotion (saves CPU)</div>
            </div>
            <div class="switch" data-toggle="lite"></div>
          </div>
          <div class="toggle-row">
            <div>
              <label>Mirror video</label>
              <div class="muted">For self-view</div>
            </div>
            <div class="switch on" data-toggle="mirror"></div>
          </div>
        </div>
      </section>
    </aside>
  </div>
`;

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');
const empty = document.getElementById('cam-empty');
const loader = document.getElementById('cam-loader');
const loaderText = document.getElementById('cam-loader-text');
const banner = document.getElementById('cam-banner');
const fpsEl = document.getElementById('cam-fps');
const stopBtn = document.getElementById('btn-stop');

const settings = { overlay: true, lite: false, mirror: true };

document.querySelectorAll('.switch').forEach((sw) => {
  sw.addEventListener('click', () => {
    sw.classList.toggle('on');
    settings[sw.dataset.toggle] = sw.classList.contains('on');
    if (sw.dataset.toggle === 'mirror') {
      const t = settings.mirror ? 'scaleX(-1)' : 'none';
      video.style.transform = t;
      canvas.style.transform = t;
    }
  });
});

let running = false;
let frame = 0;
let lastFps = performance.now();
let fpsCount = 0;
let cachedAttrs = [];
let cachedHarass = null;
let activeStream = null;

async function ensureModels() {
  loader.style.display = 'flex';
  loaderText.textContent = 'Loading face detector…';
  await loadFaceDetector((m) => (loaderText.textContent = m));
  if (!settings.lite) {
    loaderText.textContent = 'Loading gender + emotion…';
    await loadFaceApi((m) => (loaderText.textContent = m));
  }
  loader.style.display = 'none';
}

async function start(streamPromise) {
  try {
    await ensureModels();
    empty.style.display = 'none';
    stopBtn.style.display = '';
    setTopbarStatus('Live', '');
    activeStream = await streamPromise;
    resetFusion();
    running = true;
    requestAnimationFrame(loop);
  } catch (err) {
    loader.style.display = 'none';
    alert(`Couldn't start: ${err.message ?? err}`);
    setTopbarStatus('Camera off', 'off');
  }
}

async function stop() {
  running = false;
  stopCamera(video);
  if (video.src) { URL.revokeObjectURL(video.src); video.src = ''; }
  empty.style.display = '';
  stopBtn.style.display = 'none';
  banner.classList.remove('show');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setTopbarStatus('Camera off', 'off');
}

document.getElementById('btn-start').addEventListener('click', () => start(startCamera(video)));
stopBtn.addEventListener('click', stop);

document.getElementById('upload-video').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await start(attachVideoFile(video, file));
});

// Backend health monitoring — runs from page load so the badge is accurate before camera starts
function applyBackendBadge(s) {
  const tag = document.getElementById('backend-tag');
  const help = document.getElementById('backend-help');
  if (!tag || !help) return;
  if (s.online) {
    tag.textContent = `Backend live · ${s.lastMs ?? '—'}ms`;
    tag.className = 'tag tag-ok';
    help.innerHTML = `Real harassment classifier (<code>harass.h5</code>) running locally · scores update every ~3s.`;
  } else {
    tag.textContent = 'Backend offline';
    tag.className = 'tag tag-warn';
    help.innerHTML = `Start the Python server (<code>cd server && python app.py</code>) for real scores. Until then, score is simulated when negative emotion + mixed gender are detected.`;
  }
}
startHealthChecks(applyBackendBadge);
applyBackendBadge(getBackendState());

window.addEventListener('protecther:alert', (e) => {
  const a = e.detail;
  banner.textContent = `⚠ ${a.label}`;
  banner.className = `cam-banner show ${a.severity === 'critical' ? 'danger' : 'warn'}`;
  setTimeout(() => banner.classList.remove('show'), 4500);
  const ruleEl = document.getElementById(`rule-${a.type}`);
  if (ruleEl) {
    ruleEl.textContent = 'just now';
    ruleEl.style.color = 'var(--danger)';
    setTimeout(() => { ruleEl.textContent = 'idle'; ruleEl.style.color = ''; }, 5000);
  }
});

async function loop() {
  if (!running) return;
  syncCanvasToVideo(canvas, video);

  let faces = [];
  try {
    faces = await detectFaces(video);
  } catch (e) { /* ignore single-frame errors */ }

  // Run heavier face-api every 4th frame
  if (!settings.lite && frame % 4 === 0 && video.videoWidth) {
    try {
      cachedAttrs = await classifyAttributes(video);
    } catch (e) { /* ignore */ }
  }

  // Merge MediaPipe boxes with face-api gender/emotion (nearest match by center distance)
  const merged = faces.map((f) => {
    const fcx = f.x + f.w / 2, fcy = f.y + f.h / 2;
    let best = null, bestD = Infinity;
    for (const a of cachedAttrs) {
      const acx = a.x + a.w / 2, acy = a.y + a.h / 2;
      const d = Math.hypot(fcx - acx, fcy - acy);
      if (d < bestD && d < Math.max(f.w, f.h)) { bestD = d; best = a; }
    }
    return best ? { ...f, gender: best.gender, genderScore: best.genderScore, emotion: best.emotion, emotionScore: best.emotionScore } : f;
  });

  // Harass score: real Python backend if online, else simulated fallback so demo flows
  const backend = getBackendState();
  if (backend.online) {
    const real = await maybeInfer(video);
    if (real != null) cachedHarass = real;
  } else if (frame % 10 === 0) {
    const hasMale = merged.some((m) => m.gender === 'male');
    const hasFemale = merged.some((m) => m.gender === 'female');
    const hasBad = merged.some((m) => ['angry', 'disgusted', 'fearful'].includes(m.emotion));
    cachedHarass = hasMale && hasFemale && hasBad ? 0.78 : (hasMale && hasFemale ? 0.32 : 0.08);
  }

  // Fuse + maybe fire alerts
  const summary = fuseFrame({ faces: merged, harassScore: cachedHarass, video });

  // Update UI panels
  document.getElementById('k-faces').textContent = summary.faceCount;
  document.getElementById('k-fm').textContent = `${summary.femaleCount} / ${summary.maleCount}`;
  const emoRow = document.getElementById('emo-row');
  if (summary.emotions.length === 0) {
    emoRow.innerHTML = `<span class="emo-chip">—</span>`;
  } else {
    emoRow.innerHTML = summary.emotions.map((e) => {
      const bad = ['angry', 'disgusted', 'fearful'].includes(e);
      const ok = ['happy', 'neutral', 'surprised'].includes(e);
      return `<span class="emo-chip ${bad ? 'bad' : ok ? 'ok' : ''}">${e}</span>`;
    }).join('');
  }
  document.getElementById('harass-fill').style.width = `${(summary.harassScore * 100).toFixed(0)}%`;

  if (settings.overlay) drawOverlay(ctx, merged);
  else ctx.clearRect(0, 0, canvas.width, canvas.height);

  // FPS
  fpsCount++;
  const now = performance.now();
  if (now - lastFps > 1000) {
    fpsEl.textContent = `${fpsCount} FPS`;
    fpsCount = 0;
    lastFps = now;
  }

  frame++;
  requestAnimationFrame(loop);
}
