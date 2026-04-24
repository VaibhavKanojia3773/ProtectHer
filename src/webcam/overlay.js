// Draws bounding boxes + labels on a canvas matched to the video size.
// The canvas is CSS-mirrored, so we draw in normal (un-mirrored) coordinates.
const COLORS = {
  female: '#f472b6',
  male: '#60a5fa',
  unknown: '#a78bfa',
};

const BAD_EMOTIONS = new Set(['angry', 'disgusted', 'fearful']);

export function drawOverlay(ctx, faces, opts = {}) {
  const { showFaces = true, showAttrs = true } = opts;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!showFaces) return;

  for (const f of faces) {
    const color = f.gender ? (COLORS[f.gender] ?? COLORS.unknown) : COLORS.unknown;
    const isBad = f.emotion && BAD_EMOTIONS.has(f.emotion);

    // Box
    ctx.lineWidth = 2;
    ctx.strokeStyle = isBad ? '#f43f5e' : color;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = isBad ? 14 : 6;
    ctx.strokeRect(f.x, f.y, f.w, f.h);
    ctx.shadowBlur = 0;

    if (!showAttrs) continue;

    // Label background
    const parts = [];
    if (f.gender) parts.push(`${f.gender}${f.genderScore ? ` ${(f.genderScore * 100).toFixed(0)}%` : ''}`);
    if (f.emotion) parts.push(f.emotion);
    if (parts.length === 0) continue;

    const label = parts.join(' · ');
    ctx.font = '600 13px Inter, system-ui';
    const tw = ctx.measureText(label).width;
    const pad = 6;
    const lh = 22;
    const lx = f.x;
    const ly = Math.max(0, f.y - lh - 2);

    ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
    ctx.fillRect(lx, ly, tw + pad * 2, lh);
    ctx.fillStyle = isBad ? '#fecdd3' : '#f4f4ff';
    ctx.fillText(label, lx + pad, ly + 15);
  }
}

export function syncCanvasToVideo(canvas, video) {
  if (!video.videoWidth) return;
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
}
