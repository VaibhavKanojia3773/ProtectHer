import { mountLayout } from '../shared/layout.js';
import { listAlerts, ALERT_TYPES, markAllAlertsSeen } from '../shared/alerts.js';
import { write, read } from '../shared/storage.js';
import './dashboard.css';

const page = mountLayout({
  title: 'Alert Log',
  subtitle: 'All detection events, newest first',
  status: { label: 'Local storage', tone: '' },
  actions: `<button class="btn btn-secondary" id="btn-clear">Clear all</button>`,
});

let activeFilter = 'ALL';

function relTime(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function tagFor(type) {
  const t = ALERT_TYPES[type];
  if (!t) return `<span class="tag">${type}</span>`;
  return `<span class="tag tag-${t.color}">${t.label}</span>`;
}

function metaSummary(meta = {}) {
  const parts = [];
  if (meta.faceCount != null) parts.push(`${meta.faceCount} face${meta.faceCount === 1 ? '' : 's'}`);
  if (meta.maleCount != null && meta.femaleCount != null) parts.push(`${meta.maleCount}M / ${meta.femaleCount}F`);
  if (meta.emotion) parts.push(meta.emotion);
  if (meta.score != null) parts.push(`score ${(meta.score * 100).toFixed(0)}%`);
  return parts.join(' · ') || '—';
}

function render() {
  const all = listAlerts();
  const filtered = activeFilter === 'ALL' ? all : all.filter((a) => a.type === activeFilter);

  const stats = {
    total: all.length,
    last24: all.filter((a) => a.ts > Date.now() - 86400000).length,
    harassment: all.filter((a) => a.type === 'HARASSMENT').length,
    lone: all.filter((a) => a.type.startsWith('LONE')).length,
  };

  page.innerHTML = `
    <section class="dash-stats">
      <div class="glass dash-stat">
        <div class="dash-stat-value">${stats.total}</div>
        <div class="dash-stat-label">Total alerts</div>
        <div class="dash-stat-sub">All time</div>
      </div>
      <div class="glass dash-stat teal">
        <div class="dash-stat-value">${stats.last24}</div>
        <div class="dash-stat-label">Last 24h</div>
        <div class="dash-stat-sub">Rolling window</div>
      </div>
      <div class="glass dash-stat danger">
        <div class="dash-stat-value">${stats.harassment}</div>
        <div class="dash-stat-label">Harassment</div>
        <div class="dash-stat-sub">Critical events</div>
      </div>
      <div class="glass dash-stat warn">
        <div class="dash-stat-value">${stats.lone}</div>
        <div class="dash-stat-label">Lone Woman</div>
        <div class="dash-stat-sub">Risk indicators</div>
      </div>
    </section>

    <div class="dash-toolbar">
      <div class="dash-filters">
        ${['ALL', 'HARASSMENT', 'LONE_WOMAN', 'LONE_WOMAN_SURROUNDED'].map((f) => `
          <button class="dash-filter ${activeFilter === f ? 'active' : ''}" data-filter="${f}">
            ${f === 'ALL' ? 'All' : ALERT_TYPES[f]?.label ?? f}
          </button>
        `).join('')}
      </div>
      <span class="muted" style="font-size: 0.82rem;">${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}</span>
    </div>

    <div class="glass alert-table">
      <div class="alert-row head">
        <div>Snapshot</div>
        <div>Event</div>
        <div class="hide-sm">Detail</div>
        <div class="hide-sm">Time</div>
        <div></div>
      </div>
      ${filtered.length === 0 ? `
        <div class="alert-empty">
          <div class="big">🔕</div>
          <div>No alerts yet. Open <a href="/webcam.html">Live Detection</a> and trigger one.</div>
        </div>
      ` : filtered.map((a) => `
        <div class="alert-row" data-id="${a.id}">
          <div class="alert-snap" style="${a.snapshotDataUrl ? `background-image:url(${a.snapshotDataUrl})` : ''}"></div>
          <div>${tagFor(a.type)}</div>
          <div class="hide-sm alert-meta">${metaSummary(a.meta)}</div>
          <div class="hide-sm alert-time">${relTime(a.ts)}</div>
          <div style="text-align:right;">
            <button class="btn btn-ghost" data-del="${a.id}">✕</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  page.querySelectorAll('.dash-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      render();
    });
  });

  page.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.del;
      const next = listAlerts().filter((a) => a.id !== id);
      write('alerts', next);
      render();
    });
  });

  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (!confirm('Clear all alerts? This cannot be undone.')) return;
    write('alerts', []);
    render();
  });
}

render();
markAllAlertsSeen();
window.addEventListener('protecther:alert', render);
