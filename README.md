<div align="center">

# 🛡️ ProtectHer

### Real-time Women Safety Analytics — built for SIH 2024

A unified web platform that combines real-time computer-vision threat detection,
crime-hotspot-aware safe routing, an LLM safety advisor, and an incident-reporting
dashboard — all running locally on a single laptop.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/Vite-5-646cff.svg)](https://vitejs.dev/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.17-FF6F00.svg)](https://www.tensorflow.org/)
[![Gemini](https://img.shields.io/badge/Gemini-1.5%20Flash-4285F4.svg)](https://ai.google.dev/)
[![SIH 2024](https://img.shields.io/badge/SIH%202024-PS%201605-orange.svg)](#)

</div>

---

## ✨ Highlights

- **3-stage CV pipeline** running 30 FPS in the browser + 1 trained CNN running on a local Python server.
- **Dijkstra-based safest-route picker** that re-ranks OSRM alternatives by proximity to crime hotspots.
- **Gemini 1.5 Flash safety advisor** with a domain system prompt and persistent local history.
- **7 polished pages** behind a shared dark-glass dashboard chrome.
- **One-click launcher** ([`start.bat`](start.bat)) — no Docker, no cloud, runs offline.
- **Zero backend persistence** — alerts, feedback, chat all stay in `localStorage`.

---

## 🧱 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser (Vite MPA · vanilla JS)             │
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  Landing  │  │  Live     │  │  Safety   │  │   Alert      │  │
│  │           │  │  Webcam   │  │  Map      │  │   Dashboard  │  │
│  └───────────┘  └─────┬─────┘  └─────┬─────┘  └──────────────┘  │
│  ┌───────────┐  ┌─────┴─────┐  ┌─────┴─────┐  ┌──────────────┐  │
│  │  Defense  │  │  Gemini   │  │  Feedback │  │  Sidebar +   │  │
│  │           │  │  Chatbot  │  │           │  │  Topbar      │  │
│  └───────────┘  └───────────┘  └───────────┘  └──────────────┘  │
│                                                                  │
│  ML in browser  ┌─────────────────────────────────────────────┐  │
│  ─────────────► │ MediaPipe FaceDetector  (every frame)        │ │
│                 │ @vladmandic/face-api  (gender + emotion, every 4th)   │ │
│                 │ Fusion combiner  (alert rules + cooldowns)   │ │
│                 └──────────────┬──────────────────────────────┘  │
└─────────────────────────────────┼──────────────────────────────┘
                                  │ POST /infer  (JPEG every 3s)
                                  ▼
                  ┌────────────────────────────────────┐
                  │    Python backend (Flask · CORS)    │
                  │   ─────────────────────────────────  │
                  │   VGG16 (no-top, ImageNet weights)  │
                  │       │ block5_pool features        │
                  │       ▼                              │
                  │   harass.h5  (5-layer Dense head)    │
                  │       │ softmax(2)                   │
                  │       ▼                              │
                  │   { score, label, ms }               │
                  └────────────────────────────────────┘
```

Two processes, no external services. The browser keeps the cheap models
local for 30 FPS overlays; the Python server holds the trained classifier
that's the project's actual IP.

---

## 🧠 ML / DL components

| Stage | Model | Where it runs | Cadence | Job |
| --- | --- | --- | --- | --- |
| 1. Face detection | MediaPipe **BlazeFace** (short-range, fp16 TFLite, GPU) | Browser via `@mediapipe/tasks-vision` | **Every frame** (~30 FPS) | Bounding boxes + score |
| 2. Gender + Age | **@vladmandic/face-api `ageGenderNet`** (MobileNetV1-based, 6 MB) | Browser | **Every 4th frame** (~7 FPS) | `{ gender, genderProb, age }` per face |
| 3. Facial expression | **@vladmandic/face-api `faceExpressionNet`** (7-class softmax) | Browser | Every 4th frame | Top emotion of {angry, disgusted, fearful, happy, neutral, sad, surprised} |
| 4. Harassment classifier | **VGG16 + custom Dense head** (`harass.h5`, ~26 M params, trained on 1 000 paired frames, 88.5 % test accuracy) | Local Python (Flask + TF 2.17) | **Every 3 s** (or pause when camera off) | `score ∈ [0, 1]`, label ∈ {Harassment, Healthy} |

### How the classifier was trained

- Dataset: balanced 1 000-frame harassment vs. healthy-environment corpus from the original team's annotation work.
- Backbone: VGG16 frozen at ImageNet weights, `block5_pool` (7×7×512) features used as input.
- Head: `Dense(1024 → 512 → 256 → 128 → 2)` with 0.5 dropout between every layer, softmax output.
- Training: 200 epochs, Adam(`lr=1e-3`), categorical cross-entropy, `ModelCheckpoint(val_loss)`.
- Reproducible from [`Harassment_Detection_VGG16_final.ipynb`](../Harassment_Detection_VGG16_final.ipynb) at the repo root (kept outside the app folder).

### Fusion logic ([`src/webcam/fusion.js`](src/webcam/fusion.js))

A small finite-state combiner mirrors the original Streamlit demo
([`_model_source/reference_pipeline.py`](_model_source/reference_pipeline.py)):

| Rule | Condition | Cooldown |
| --- | --- | --- |
| `HARASSMENT` | `score > 0.6` AND ≥1 male AND ≥1 female AND any face shows angry/disgusted/fearful | 10 s |
| `LONE_WOMAN` | exactly 1 female + 0 males, sustained 5 s | 10 s |
| `LONE_WOMAN_SURROUNDED` | 1 female + ≥2 males, sustained 3 s | 10 s |

Each fired alert captures a JPEG snapshot from the webcam (`canvas.toDataURL`),
appends to `localStorage["protecther.alerts"]` (capped at 200, FIFO), and
dispatches a `protecther:alert` `CustomEvent` so the sidebar bell badge and
dashboard live-update without polling.

---

## 🗺️ Algorithms

### 1. Safest-route picker (Dijkstra over a hotspot-weighted graph)

The map page asks OSRM (via leaflet-routing-machine) for **3 alternative routes**
between two points, then re-ranks them by safety. Implementation:
[`src/map/safest-route.js`](src/map/safest-route.js).

**Graph construction.** For each alternative route `R`, build a weighted graph `G_R`:

- **Nodes** — every polyline vertex of `R`.
- **Edges** — between consecutive vertices, with weight:

  ```
  w(u, v) = haversine(u, v) · (1 + 1.5 · risk(midpoint))
  ```

  where

  ```
  risk(p) = Σ over hotspots h: max(0, 1 − dist(p, h) / horizon(h))
  horizon(h) = max(h.radius, 350m)
  ```

  i.e. each segment is "stretched" in proportion to how close its
  midpoint sits to a hotspot — a 100 m segment passing 50 m from a
  reported hotspot may cost like 200 m.

**Pathfinding.** Run **Dijkstra** with a binary min-heap (`MinHeap` in
`safest-route.js`) from the route's start vertex to its end vertex.
Because the polyline is a chain, the only path is the route itself, so
the cost collapses to `Σ w(u, v)`. The same code generalizes 1-for-1
to a branching street-grid (planned future work — see *Roadmap*).

**Selection.** Pick `R* = argmin C(R)`. Compute a 0–100 safety score:

```
safetyScore = round(  raw_length(R*) / weighted_length(R*)  · 100 )
```

100 means the chosen route never came within `350 m` of any hotspot;
65 ↔ 84 means moderate exposure; below 65 means the user is asked to reconsider.

### 2. Frame fusion + alert rules

See "Fusion logic" above — a deterministic FSM with per-rule cooldowns and
sustain windows. Snapshot capture uses `OffscreenCanvas` when available, falling
back to a plain `<canvas>`, so it never blocks the render loop.

### 3. Frame throttling

`loop.js` is a `requestAnimationFrame` driver with a frame counter that
dispatches expensive work by modulo:

| Frame mod | Work |
| --- | --- |
| `% 1` | MediaPipe face detection + canvas draw |
| `% 4` | @vladmandic/face-api gender + emotion |
| `% 90` (≈ 3 s) | POST snapshot to Python `/infer` |

Heavy work runs in `tf.tidy`-equivalent contexts to avoid GC pauses.

---

## 🤖 GenAI — Safety chatbot

`src/chatbot/gemini.js` wraps **Google Gemini 1.5 Flash** with:

- **Custom system prompt** that primes the model as a women-safety assistant
  for the Indian context — knows helpline numbers (112, 1091, 181, 1098, 100, 108),
  Indian legal references, and emergency-first response style.
- **Persistent multi-turn history** stored in `localStorage["protecther.chat"]`
  and restored into Gemini's `startChat({ history })` so context survives
  page reloads.
- **Streaming-ready API client** via `@google/generative-ai`.
- **Suggested prompts** for cold-start UX (`src/chatbot/index.js`).

```js
generationConfig: { temperature: 0.6, maxOutputTokens: 600 }
```

The key is read from `import.meta.env.VITE_GEMINI_API_KEY` (Vite-injected at
build time from `.env.local`). For production, swap to a small server-side
proxy — see *Security notes* below.

---

## 🛠️ Tech stack

### Frontend
- **Vite 5 (MPA mode)** — multi-page entries with shared component caching across pages.
- **Vanilla JS + ES modules** — no React/Vue overhead; every page bundle stays under 50 KB except the ML pages.
- **CSS custom-properties theme** (`src/styles/theme.css`) — dark glassmorphism with purple/teal accents.
- **No CSS framework** — design system is hand-rolled (~250 lines of tokens).

### ML / DL
- **MediaPipe Tasks (Vision)** — Google's WebGL-accelerated face detector.
- **@vladmandic/face-api** — pre-trained MobileNet-style nets for gender + expression.
- **TensorFlow 2.17** (server) — loads `harass.h5` and ImageNet VGG16.
- **OpenCV-Python 4.10** — JPEG decode + BGR↔RGB.

### GenAI
- **Google Gemini 1.5 Flash** via `@google/generative-ai` SDK.

### Backend
- **Flask 3 + flask-cors** — single endpoint, ~110 lines.
- **NumPy < 2** (TF compatibility), **Werkzeug** (development WSGI).

### Maps & data
- **Leaflet 1.9** + **leaflet-routing-machine** + **OSRM** demo server.
- **CartoDB dark_all** tiles.
- **OpenStreetMap Nominatim** for free place search (no API key).

### Dev experience
- **`start.bat` / `start.ps1`** — one-click launcher that starts the frontend immediately and the backend in parallel.
- **Hot module reload** — Vite reloads CSS in place, JS with state preservation.
- **Production build** in 6–8 s; output is a fully static `dist/` ready for any CDN.

---

## 📦 Project layout

```
app/
├── index.html         dashboard.html  feedback.html
├── webcam.html        chatbot.html    defense.html       map.html
├── start.bat / start.ps1            ← one-click launcher
├── package.json       vite.config.js
├── .env.example       .env.local
├── public/
│   └── logo.svg
├── docs/
│   └── SIHfinale.pptx               ← original SIH 2024 pitch deck
├── _model_source/                   ← (gitignored) original .h5 + reference pipeline
│   ├── harass.h5                       302 MB · trained classifier
│   └── reference_pipeline.py           original Streamlit version
├── server/                          ← Python harassment backend
│   ├── app.py                          Flask, /health + /infer
│   ├── requirements.txt
│   └── README.md
└── src/
    ├── styles/        theme.css, sidebar.css, topbar.css
    ├── components/    sidebar.js, topbar.js
    ├── shared/        layout.js, alerts.js, storage.js, seed.js
    ├── landing/       index.js, landing.css
    ├── webcam/        index.js, camera.js, models.js, fusion.js,
    │                  overlay.js, backend.js, webcam.css
    ├── map/           index.js, hotspots.js, saved-routes.js,
    │                  safest-route.js   ← Dijkstra picker
    │                  map.css
    ├── dashboard/     index.js, dashboard.css
    ├── chatbot/       index.js, gemini.js, chatbot.css
    ├── defense/       index.js, defense.css
    └── feedback/      index.js, feedback.css
```

---

## 🚀 Quick start

### One-click (Windows)

Double-click [`start.bat`](start.bat) (or `cmd /c start.bat` from PowerShell).
On first run it does `npm install`. The frontend opens in your browser
within ~3 seconds; the backend warms up in the background and the
**Backend live** badge flips on automatically once the model finishes loading
(~30 s on a fresh start).

### Manual (any OS)

```bash
# Terminal 1 — frontend
cd app
npm install
cp .env.example .env.local           # paste your Gemini key
npm run dev                          # → http://localhost:5173

# Terminal 2 — Python harassment backend (optional but recommended)
cd app/server
pip install -r requirements.txt
python app.py                        # → http://127.0.0.1:5005
```

> **Note about the trained model.** `harass.h5` (~302 MB) is **not** committed
> to the repo — it's listed in `.gitignore`. To run real harassment scoring,
> place your trained file at `app/_model_source/harass.h5`. The repo includes
> the training notebook so you can reproduce it from scratch.

### Production build

```bash
npm run build
npx serve dist
```

`dist/` is a static directory. Drop it on Netlify, Vercel, or GitHub Pages.

---

## 📋 Page-by-page reference

| Page | Route | What it does | Key files |
| --- | --- | --- | --- |
| **Landing** | `/` | Hero + 4 feature cards + landmark-cases timeline + CTA band. | [`src/landing/index.js`](src/landing/index.js) |
| **Live Detection** | `/webcam.html` | Webcam, MediaPipe overlays, KPIs, alert banner, backend-live badge, lite-mode toggle, mirror toggle. | [`src/webcam/index.js`](src/webcam/index.js), [`src/webcam/fusion.js`](src/webcam/fusion.js), [`src/webcam/models.js`](src/webcam/models.js) |
| **Safety Map** | `/map.html` | Leaflet dark map, 8 hotspots, click-to-route with Dijkstra safety re-ranker, Nominatim search, "use my location", 4 saved routes, helplines. | [`src/map/index.js`](src/map/index.js), [`src/map/safest-route.js`](src/map/safest-route.js), [`src/map/hotspots.js`](src/map/hotspots.js) |
| **Alert Log** | `/dashboard.html` | All alerts with snapshots, filters, stat tiles (last 24 h), bulk clear. Pre-seeded with 6 sample alerts on first visit. | [`src/dashboard/index.js`](src/dashboard/index.js) |
| **Safety Chat** | `/chatbot.html` | Gemini-powered safety advisor with persistent history + suggestion chips. | [`src/chatbot/index.js`](src/chatbot/index.js), [`src/chatbot/gemini.js`](src/chatbot/gemini.js) |
| **Self Defense** | `/defense.html` | 14 techniques across 4 tabs (Verbal / Defensive / Strikes / Tools) + 6 Indian helplines. | [`src/defense/index.js`](src/defense/index.js) |
| **Feedback** | `/feedback.html` | Anonymous incident form with severity tiers + reports list. Pre-seeded with 3 sample reports. | [`src/feedback/index.js`](src/feedback/index.js) |

---

## 🔌 Backend API

`POST /infer`
> Body: multipart `frame=<jpeg>` **or** JSON `{ "image": "data:image/jpeg;base64,…" }`
> Response: `{ "score": 0..1, "label": "Harassment"|"Healthy", "ms": int }`

`GET /health`
> Response: `{ "ok": true, "model": "harass.h5", "input_shape": [null, 25088] }`

CORS is fully open by design (single-machine demo). For multi-user deployments,
restrict origins in `app.py`.

---

## 🔐 Security notes

- **Gemini key in bundle.** Vite inlines `VITE_*` env vars into the production
  JS bundle. Acceptable for a hackathon demo where the deploy is local. For
  any public deployment, proxy Gemini through a tiny serverless function
  (e.g. Cloudflare Worker) and remove the key from the build.
- **CORS.** The Flask server uses `flask_cors.CORS(app)` with no allowlist.
  Tighten before production.
- **Local data only.** Alerts, feedback, and chat history live in
  `localStorage`. Clear via the in-app buttons or `localStorage.clear()` in DevTools.

---

## 🗺️ Roadmap

- Replace single-route Dijkstra with a real **street-graph** (OSM PBF excerpt for
  Delhi NCR) so the picker can synthesize new safer paths, not just rank existing ones.
- Add **A\*** with a haversine heuristic on top of the same graph.
- Convert `harass.h5` to **TensorFlow.js** so the demo can run with zero
  Python (90 MB cold-load tradeoff).
- Wire **Twilio** for real SMS alerts to a configured emergency contact.
- Replace `localStorage` with **IndexedDB + Dexie** for unlimited history.

---

## 📜 Credits

- **Author:** [Vaibhav Kanojia](https://github.com/VaibhavKanojia3773) — Team TechRizz, SIH 2024.
- Map tiles © OpenStreetMap contributors, © CARTO.
- Pre-trained gender + expression weights © @vladmandic/face-api authors.
- BlazeFace TFLite model © Google MediaPipe.

## 📄 License

[MIT](LICENSE) — © 2024 Vaibhav Kanojia.
