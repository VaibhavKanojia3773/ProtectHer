import { mountLayout } from '../shared/layout.js';
import { append, read } from '../shared/storage.js';
import './feedback.css';

const page = mountLayout({
  title: 'Feedback & Reports',
  subtitle: 'Tell us what you experienced or noticed',
  status: { label: 'Anonymous · stored locally', tone: '' },
});

let severity = 'medium';

function render() {
  const items = read('feedback', []);
  page.innerHTML = `
    <div class="fb-grid">
      <section class="glass fb-card">
        <h2>Submit feedback</h2>
        <p class="muted">Your name is optional. All submissions stay on this device for the demo.</p>
        <form class="fb-form" id="fb-form">
          <div class="fb-row">
            <div class="fb-field">
              <label>Name <span class="muted">(optional)</span></label>
              <input name="name" placeholder="Anonymous" autocomplete="off"/>
            </div>
            <div class="fb-field">
              <label>Location</label>
              <input name="location" placeholder="City, area, landmark…" required autocomplete="off"/>
            </div>
          </div>
          <div class="fb-field">
            <label>Type of incident</label>
            <select name="type" required>
              <option value="">Select…</option>
              <option>Verbal harassment</option>
              <option>Stalking / following</option>
              <option>Physical assault</option>
              <option>Inappropriate filming</option>
              <option>Unsafe area / poor lighting</option>
              <option>App suggestion / feedback</option>
              <option>Other</option>
            </select>
          </div>
          <div class="fb-field">
            <label>Severity</label>
            <div class="fb-severity" id="fb-sev">
              ${['low', 'medium', 'high', 'critical'].map((s) => `
                <div class="fb-sev-opt ${s === severity ? 'active' : ''}" data-sev="${s}">${s[0].toUpperCase() + s.slice(1)}</div>
              `).join('')}
            </div>
          </div>
          <div class="fb-field">
            <label>What happened?</label>
            <textarea name="description" placeholder="Describe what you saw or experienced…" required></textarea>
          </div>
          <div class="row" style="justify-content: flex-end; gap: 10px;">
            <button type="reset" class="btn btn-ghost">Reset</button>
            <button type="submit" class="btn btn-primary">Submit feedback</button>
          </div>
        </form>
      </section>

      <section>
        <h2 style="margin-bottom: 12px;">Recent reports <span class="muted" style="font-size: 0.85rem; font-weight: 400;">(${items.length})</span></h2>
        <div class="fb-list">
          ${items.length === 0 ? `
            <div class="glass" style="padding: 28px; text-align: center; color: var(--text-2);">
              No reports yet. Submit your first using the form on the left.
            </div>
          ` : items.slice(0, 20).map((it) => `
            <div class="glass">
              <div class="fb-item-head">
                <div>
                  <strong>${it.type}</strong>
                  <span class="tag tag-${it.severity === 'critical' ? 'danger' : it.severity === 'high' ? 'warn' : 'accent'}" style="margin-left: 8px;">${it.severity}</span>
                </div>
                <span class="fb-item-meta">${new Date(it.ts).toLocaleString()}</span>
              </div>
              <div class="fb-item-meta" style="margin-bottom: 6px;">${it.location} · ${it.name || 'Anonymous'}</div>
              <div class="fb-item-body">${it.description}</div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  page.querySelectorAll('.fb-sev-opt').forEach((el) => {
    el.addEventListener('click', () => {
      severity = el.dataset.sev;
      page.querySelectorAll('.fb-sev-opt').forEach((x) => x.classList.toggle('active', x === el));
    });
  });

  document.getElementById('fb-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
      severity,
      name: fd.get('name')?.trim(),
      location: fd.get('location')?.trim(),
      type: fd.get('type'),
      description: fd.get('description')?.trim(),
    };
    append('feedback', item, 100);
    showToast('Thanks — your feedback was saved.');
    e.target.reset();
    severity = 'medium';
    render();
  });
}

function showToast(msg) {
  const old = document.querySelector('.fb-toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'fb-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

render();
