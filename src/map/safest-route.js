// Safest-route picker — runs Dijkstra over a safety-weighted graph built
// from OSRM alternatives + crime hotspots.
//
// Algorithm
// ---------
// 1. Ask OSRM for K alternative routes (lightest = shortest distance/time).
// 2. For each alternative R, build a weighted graph G_R:
//      - nodes: each polyline vertex of R
//      - edges: consecutive vertices, weight = haversine(d) * (1 + risk(midpoint))
//      - risk(p): sum of (1 - dist(p, hotspot) / hotspot.radius) over hotspots in range
// 3. Run Dijkstra(G_R, start, end) → safety-cost C_R.
// 4. Pick R* = argmin C_R. Compute a 0..100 safety score for display.
//
// In practice OSRM alternatives are linear chains (no graph branching), so
// Dijkstra collapses to a sum of edge weights — but we keep the priority-queue
// implementation so swapping in a richer graph (e.g. street-grid with junctions)
// is a one-line change.

import { HOTSPOTS } from './hotspots.js';

const HOTSPOT_INFLUENCE_M = 350;   // distance beyond which a hotspot stops penalizing a segment

function haversine(a, b) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function riskAt(point) {
  let risk = 0;
  for (const h of HOTSPOTS) {
    const d = haversine(point, { lat: h.lat, lng: h.lng });
    const horizon = Math.max(h.radius, HOTSPOT_INFLUENCE_M);
    if (d < horizon) {
      risk += 1 - d / horizon;
    }
  }
  return risk;
}

class MinHeap {
  constructor() { this.a = []; }
  push(node) {
    this.a.push(node);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p].cost <= this.a[i].cost) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  pop() {
    if (!this.a.length) return null;
    const top = this.a[0];
    const last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      let i = 0;
      const n = this.a.length;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let s = i;
        if (l < n && this.a[l].cost < this.a[s].cost) s = l;
        if (r < n && this.a[r].cost < this.a[s].cost) s = r;
        if (s === i) break;
        [this.a[s], this.a[i]] = [this.a[i], this.a[s]];
        i = s;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

/**
 * Dijkstra on a route polyline — returns the cumulative safety-weighted cost
 * from start (index 0) to end (last index). Because the polyline is linear,
 * the shortest path is the only path, but the same code generalizes to
 * branching graphs with no changes.
 */
function dijkstraRouteCost(coords) {
  const n = coords.length;
  if (n < 2) return 0;
  // Build adjacency on the fly (linear chain)
  const dist = new Float64Array(n).fill(Infinity);
  dist[0] = 0;
  const heap = new MinHeap();
  heap.push({ idx: 0, cost: 0 });

  while (heap.size) {
    const { idx, cost } = heap.pop();
    if (cost > dist[idx]) continue;
    if (idx === n - 1) return cost;
    for (const nb of [idx - 1, idx + 1]) {
      if (nb < 0 || nb >= n) continue;
      const a = coords[idx];
      const b = coords[nb];
      const len = haversine(a, b);
      const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
      const w = len * (1 + 1.5 * riskAt(mid));    // 1 unit of risk ≈ +150% length
      const next = cost + w;
      if (next < dist[nb]) {
        dist[nb] = next;
        heap.push({ idx: nb, cost: next });
      }
    }
  }
  return dist[n - 1];
}

/**
 * Score 0..100 — pure length over the safety-weighted length.
 * Higher = safer. 100 means zero hotspot proximity penalty.
 */
function safetyScore(rawMeters, weightedMeters) {
  if (weightedMeters <= 0) return 100;
  return Math.round((rawMeters / weightedMeters) * 100);
}

/**
 * @param {Array<{lat:number,lng:number}>[]} alternatives — array of polylines
 * @returns {{ index:number, score:number, scores:number[] }}
 *   index of the safest alternative + the chosen route's safety score (0..100)
 *   + per-route scores for UI display.
 */
export function pickSafest(alternatives) {
  const scores = alternatives.map((coords) => {
    let raw = 0;
    for (let i = 1; i < coords.length; i++) raw += haversine(coords[i - 1], coords[i]);
    const weighted = dijkstraRouteCost(coords);
    return { raw, weighted, score: safetyScore(raw, weighted) };
  });
  let bestIdx = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i].weighted < scores[bestIdx].weighted) bestIdx = i;
  }
  return {
    index: bestIdx,
    score: scores[bestIdx].score,
    scores: scores.map((s) => s.score),
  };
}
