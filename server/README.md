# ProtectHer — Harassment Backend

A tiny Flask server that runs the trained `harass.h5` classifier. The browser handles
face/gender/emotion (MediaPipe + face-api.js); this backend only adds the custom
harassment score, called every 2-3 seconds from the webcam page.

## Run

```bash
cd app/server
python -m venv venv
venv\Scripts\activate           # Windows
# source venv/bin/activate      # macOS / Linux
pip install -r requirements.txt
python app.py
# → http://127.0.0.1:5005
```

The web app auto-detects this backend (it polls `/health` every 5 s on the webcam
page). If it's offline, the live page falls back to a simulated score and shows a
"Backend offline" tag in the topbar.

## Endpoints

- `GET /health` → `{ok, model, input_shape}`
- `POST /infer` (multipart `frame` JPEG **or** JSON `{image: "data:image/jpeg;base64,..."}`)
  → `{score: 0..1, label: "Harassment"|"Healthy", ms}`

## Configuration

- `PORT` env var (default 5005)
- `harass.h5` is loaded from `../_model_source/harass.h5`
