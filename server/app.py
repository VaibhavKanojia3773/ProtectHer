"""ProtectHer harassment-score backend.

POST /infer  with multipart 'frame' (JPEG/PNG) or JSON {"image": "data:image/jpeg;base64,..."}
returns        {"score": 0..1, "label": "Harassment"|"Healthy", "ms": int}
GET  /health  returns {"ok": true, "model": "harass.h5"}

The browser already runs MediaPipe + face-api.js for face/gender/emotion at 30 FPS.
This server only adds the trained custom harassment classifier.
"""
import base64
import io
import os
import time
from pathlib import Path

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import tensorflow as tf  # noqa: E402
from tensorflow.keras.applications.vgg16 import VGG16, preprocess_input  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
HARASS_PATH = ROOT / "_model_source" / "harass.h5"

print(f"[backend] loading VGG16 (no-top) feature extractor…")
vgg = VGG16(weights="imagenet", include_top=False, input_shape=(224, 224, 3))
vgg.trainable = False

print(f"[backend] loading harass head from {HARASS_PATH} …")
if not HARASS_PATH.exists():
    raise SystemExit(f"harass.h5 not found at {HARASS_PATH}")
harass = tf.keras.models.load_model(str(HARASS_PATH), compile=False)

# Warm both models
print("[backend] warming models…")
_warm = np.zeros((1, 224, 224, 3), dtype=np.float32)
vgg.predict(_warm, verbose=0)
harass.predict(np.zeros((1, 25088), dtype=np.float32), verbose=0)
print("[backend] ready.")

app = Flask(__name__)
CORS(app)


def decode_image(req) -> np.ndarray | None:
    """Accept either multipart upload or JSON base64 data URL."""
    if "frame" in req.files:
        buf = req.files["frame"].read()
    else:
        body = req.get_json(silent=True) or {}
        data_url = body.get("image", "")
        if not data_url:
            return None
        if "," in data_url:
            data_url = data_url.split(",", 1)[1]
        try:
            buf = base64.b64decode(data_url)
        except Exception:
            return None
    arr = np.frombuffer(buf, dtype=np.uint8)
    if arr.size == 0:
        return None
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img


@app.get("/health")
def health():
    return jsonify(ok=True, model="harass.h5", input_shape=list(harass.input_shape))


@app.post("/infer")
def infer():
    t0 = time.perf_counter()
    img = decode_image(request)
    if img is None:
        return jsonify(error="missing or undecodable frame"), 400

    # Preprocess to VGG16's expected format
    resized = cv2.resize(img, (224, 224))
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    x = preprocess_input(rgb.astype(np.float32))
    x = np.expand_dims(x, axis=0)

    feats = vgg.predict(x, verbose=0)
    flat = feats.reshape(1, 7 * 7 * 512)
    pred = harass.predict(flat, verbose=0)[0]
    # pred is [healthy, harassment]
    score = float(pred[1])
    label = "Harassment" if int(np.argmax(pred)) == 1 else "Healthy"
    ms = int((time.perf_counter() - t0) * 1000)
    return jsonify(score=score, label=label, ms=ms)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5005))
    print(f"[backend] serving on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
