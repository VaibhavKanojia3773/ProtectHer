export function renderTopbar(root, { title, subtitle = '', status = null, actions = '' }) {
  root.innerHTML = `
    <div class="topbar">
      <div class="topbar-title">
        <h1>${title}</h1>
        ${subtitle ? `<span class="topbar-sub">${subtitle}</span>` : ''}
      </div>
      <div class="topbar-actions">
        ${status ? `
          <span class="topbar-status">
            <span class="status-dot ${status.tone ?? ''}"></span>
            ${status.label}
          </span>` : ''}
        ${actions}
      </div>
    </div>
  `;
}

export function setTopbarStatus(label, tone = '') {
  const status = document.querySelector('.topbar-status');
  if (!status) return;
  const dot = status.querySelector('.status-dot');
  dot.className = `status-dot ${tone}`;
  status.lastChild.textContent = ` ${label}`;
}
