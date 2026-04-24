// Combines per-frame face attributes + (optional) harassment score
// into the same alert rules as the original Streamlit pipeline:
//   HARASSMENT             — male+female AND harass_score>0.6 AND any negative emotion
//   LONE_WOMAN             — exactly 1 female, 0 male, sustained
//   LONE_WOMAN_SURROUNDED  — 1 female + >=2 male, sustained
import { fireAlert } from '../shared/alerts.js';
import { captureSnapshot } from './camera.js';

const BAD_EMOTIONS = new Set(['angry', 'disgusted', 'fearful']);
const SUSTAIN_LONE_MS = 5000;
const SUSTAIN_SURROUNDED_MS = 3000;
const HARASS_THRESHOLD = 0.6;

let state = {
  loneSince: null,
  surroundedSince: null,
  lastHarassScore: 0,
};

export function resetFusion() {
  state = { loneSince: null, surroundedSince: null, lastHarassScore: 0 };
}

export function fuseFrame({ faces, harassScore, video }) {
  const now = Date.now();

  let male = 0, female = 0;
  const emotions = [];
  for (const f of faces) {
    if (f.gender === 'male') male++;
    else if (f.gender === 'female') female++;
    if (f.emotion) emotions.push(f.emotion);
  }
  const negativeEmotion = emotions.find((e) => BAD_EMOTIONS.has(e));

  if (typeof harassScore === 'number') state.lastHarassScore = harassScore;
  const score = state.lastHarassScore;

  // 1. HARASSMENT
  if (male > 0 && female > 0 && score > HARASS_THRESHOLD && negativeEmotion) {
    const snap = captureSnapshot(video);
    fireAlert('HARASSMENT', {
      snapshotDataUrl: snap,
      meta: { faceCount: faces.length, maleCount: male, femaleCount: female, emotion: negativeEmotion, score },
    });
  }

  // 2. LONE_WOMAN_SURROUNDED — checked before LONE_WOMAN
  if (female >= 1 && male >= 2) {
    if (state.surroundedSince == null) state.surroundedSince = now;
    if (now - state.surroundedSince >= SUSTAIN_SURROUNDED_MS) {
      const snap = captureSnapshot(video);
      fireAlert('LONE_WOMAN_SURROUNDED', {
        snapshotDataUrl: snap,
        meta: { faceCount: faces.length, maleCount: male, femaleCount: female },
      });
      state.surroundedSince = null;
    }
  } else {
    state.surroundedSince = null;
  }

  // 3. LONE_WOMAN
  if (female === 1 && male === 0) {
    if (state.loneSince == null) state.loneSince = now;
    if (now - state.loneSince >= SUSTAIN_LONE_MS) {
      const snap = captureSnapshot(video);
      fireAlert('LONE_WOMAN', {
        snapshotDataUrl: snap,
        meta: { faceCount: faces.length, maleCount: male, femaleCount: female },
      });
      state.loneSince = null;
    }
  } else {
    state.loneSince = null;
  }

  return {
    faceCount: faces.length,
    maleCount: male,
    femaleCount: female,
    emotions,
    negativeEmotion,
    harassScore: score,
  };
}
