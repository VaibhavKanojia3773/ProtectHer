import { unreadCount } from '../shared/alerts.js';

const NAV = [
  { href: '/', label: 'Home', icon: 'home', match: ['/', '/index.html'] },
  { href: '/webcam.html', label: 'Live Detection', icon: 'video' },
  { href: '/dashboard.html', label: 'Alert Log', icon: 'bell', showBadge: true },
  { href: '/map.html', label: 'Safety Map', icon: 'map' },
  { href: '/chatbot.html', label: 'Safety Chat', icon: 'chat' },
  { href: '/defense.html', label: 'Self Defense', icon: 'shield' },
  { href: '/feedback.html', label: 'Feedback', icon: 'inbox' },
];

const ICONS = {
  home: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  video: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
  map: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>',
  chat: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 4V5z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l3-8h12l3 8v6H3v-6z"/><path d="M3 13h5l1 2h6l1-2h5"/></svg>',
};

function isActive(item, path) {
  if (item.match) return item.match.includes(path);
  return path === item.href;
}

export function renderSidebar(root) {
  const path = window.location.pathname;
  const badge = unreadCount();
  root.innerHTML = `
    <aside class="sidebar">
      <a class="sidebar-brand" href="/">
        <div class="sidebar-logo">PH</div>
        <div>
          <div class="sidebar-name">ProtectHer</div>
          <div class="sidebar-tag">Safety analytics</div>
        </div>
      </a>
      <nav class="sidebar-nav">
        ${NAV.map((item) => `
          <a class="sidebar-link ${isActive(item, path) ? 'active' : ''}" href="${item.href}">
            <span class="sidebar-icon">${ICONS[item.icon] ?? ''}</span>
            <span>${item.label}</span>
            ${item.showBadge && badge > 0 ? `<span class="sidebar-bell-badge">${badge}</span>` : ''}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-foot">
        <div>SIH 2024 · PS 1605</div>
        <div>Team TechRizz</div>
      </div>
    </aside>
  `;

  window.addEventListener('protecther:alert', () => renderSidebar(root));
  window.addEventListener('protecther:alerts-seen', () => renderSidebar(root));
}
