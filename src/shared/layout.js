import { renderSidebar } from '../components/sidebar.js';
import { renderTopbar } from '../components/topbar.js';
import { seedDemoDataIfNeeded } from './seed.js';

import '../styles/theme.css';
import '../styles/sidebar.css';
import '../styles/topbar.css';

export function mountLayout({ title, subtitle = '', status = null, actions = '' }) {
  seedDemoDataIfNeeded();
  document.body.innerHTML = `
    <div class="app-shell">
      <div id="sidebar-root"></div>
      <div class="app-main">
        <div id="topbar-root"></div>
        <main class="page" id="page-root"></main>
      </div>
    </div>
  `;
  renderSidebar(document.getElementById('sidebar-root'));
  renderTopbar(document.getElementById('topbar-root'), { title, subtitle, status, actions });
  return document.getElementById('page-root');
}
