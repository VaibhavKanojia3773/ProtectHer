import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';
import * as faceapi from '@vladmandic/face-api';

let faceDetector = null;
let faceApiReady = false;

export async function loadFaceDetector(onProgress = () => {}) {
  if (faceDetector) return faceDetector;
  onProgress('Loading face detector…');
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );
  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
  });
  return faceDetector;
}

export async function loadFaceApi(onProgress = () => {}) {
  if (faceApiReady) return;
  onProgress('Loading gender + emotion models…');
  // face-api.js model weights served from CDN to avoid bundling 6MB locally
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
  ]);
  faceApiReady = true;
}

export async function detectFaces(video) {
  if (!faceDetector || !video.videoWidth) return [];
  const t = performance.now();
  const result = faceDetector.detectForVideo(video, t);
  return (result?.detections ?? []).map((d) => {
    const b = d.boundingBox;
    return { x: b.originX, y: b.originY, w: b.width, h: b.height, score: d.categories?.[0]?.score ?? 0 };
  });
}

export async function classifyAttributes(video) {
  if (!faceApiReady || !video.videoWidth) return [];
  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withAgeAndGender()
    .withFaceExpressions();
  return detections.map((d) => {
    const b = d.detection.box;
    let topEmotion = 'neutral';
    let topScore = 0;
    for (const [k, v] of Object.entries(d.expressions)) {
      if (v > topScore) { topScore = v; topEmotion = k; }
    }
    return {
      x: b.x, y: b.y, w: b.width, h: b.height,
      gender: d.gender,                  // 'male' | 'female'
      genderScore: d.genderProbability,
      age: d.age,
      emotion: topEmotion,
      emotionScore: topScore,
    };
  });
}

// Stub for the harassment model — returns null until the .h5 is converted.
// When ready, drop in tf.loadGraphModel('/models/harass/model.json') etc.
export async function predictHarassment(/* video */) {
  return null;
}
