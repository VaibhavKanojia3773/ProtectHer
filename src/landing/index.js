import { mountLayout } from '../shared/layout.js';
import './landing.css';

const page = mountLayout({
  title: 'ProtectHer',
  subtitle: 'Real-time women safety analytics',
  status: { label: 'Demo · all features local', tone: '' },
});

const FEATURES = [
  { icon: '📹', title: 'Live Detection', text: 'In-browser webcam pipeline that flags harassment, lone-woman, and surrounded-woman situations in real time.', href: '/webcam.html', cta: 'Open live feed →' },
  { icon: '🗺️', title: 'Safety Map', text: 'Leaflet map with crime hotspots and a safest-route planner for walking from A to B.', href: '/map.html', cta: 'Open map →' },
  { icon: '🔔', title: 'Alert Log', text: 'Every detection is timestamped and snapshot-saved so you can review incidents later.', href: '/dashboard.html', cta: 'View alerts →' },
  { icon: '💬', title: 'Safety Chat', text: 'Ask our Gemini-powered chat for guidance: helplines, situational advice, defense techniques.', href: '/chatbot.html', cta: 'Open chat →' },
  { icon: '🛡️', title: 'Self Defense', text: 'A short, illustrated guide to practical techniques every woman should know.', href: '/defense.html', cta: 'Read guide →' },
  { icon: '📥', title: 'Feedback', text: 'Anonymous incident reporting and feedback from women in the field.', href: '/feedback.html', cta: 'Send feedback →' },
];

const CASES = [
  { year: 1972, title: 'Mathura Custodial Case', desc: 'Tribal girl raped by two policemen in Maharashtra — sparked rape-law reform.' },
  { year: 2012, title: 'Nirbhaya Case', desc: 'Brutal Delhi gang rape that led to the Criminal Law Amendment Act of 2013.' },
  { year: 2019, title: 'Hyderabad Veterinarian Case', desc: 'A 26-year-old doctor raped and murdered while returning from work.' },
  { year: 2024, title: 'Kolkata Doctor Case', desc: 'Trainee doctor raped and murdered inside a reputed medical college.' },
];

page.innerHTML = `
  <section class="hero fade-in">
    <div>
      <span class="hero-eyebrow">SIH 2024 · PS 1605 · Team TechRizz</span>
      <h1 class="hero-title">
        Safety, in <span class="grad">real time</span>.<br>
        Built for women, by analytics.
      </h1>
      <p class="hero-sub">
        ProtectHer combines a 3-stage computer vision pipeline, crime-hotspot mapping, and conversational guidance
        into one product — so women have eyes, routes, and answers when they need them most.
      </p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/webcam.html">Try live detection</a>
        <a class="btn btn-secondary" href="/map.html">Explore safety map</a>
      </div>
    </div>
    <div class="hero-art glass">
      <div class="hero-art-grid"></div>
      <div class="hero-art-pings"><span></span><span></span><span></span><span></span></div>
      <div class="hero-art-shield">PROTECT<br>HER</div>
    </div>
  </section>

  <section style="margin-top: 36px;">
    <div class="grid grid-4">
      <div class="glass stat-card"><div class="stat-value">12,847</div><div class="stat-label">Alerts triaged</div></div>
      <div class="glass stat-card"><div class="stat-value">2,140</div><div class="stat-label">Routes planned</div></div>
      <div class="glass stat-card"><div class="stat-value">8 cities</div><div class="stat-label">Hotspot coverage</div></div>
      <div class="glass stat-card"><div class="stat-value">88.5%</div><div class="stat-label">Model accuracy</div></div>
    </div>
  </section>

  <section style="margin-top: 56px;">
    <span class="section-eyebrow">What's inside</span>
    <h2 class="section-title">Six features, one product</h2>
    <p class="section-sub">Designed to consolidate every previous prototype into a single shippable demo.</p>
    <div class="grid grid-3">
      ${FEATURES.map((f) => `
        <article class="glass feature-card">
          <div class="feature-icon"><span style="font-size:1.3rem">${f.icon}</span></div>
          <h3>${f.title}</h3>
          <p>${f.text}</p>
          <a href="${f.href}">${f.cta}</a>
        </article>
      `).join('')}
    </div>
  </section>

  <section style="margin-top: 56px;">
    <span class="section-eyebrow">Why it matters</span>
    <h2 class="section-title">India's pattern of harm</h2>
    <p class="section-sub">A handful of landmark cases that shaped public conversation and the law.</p>
    <div class="col">
      ${CASES.map((c) => `
        <article class="glass case-strip">
          <div class="case-year">${c.year}</div>
          <div>
            <div class="case-title">${c.title}</div>
            <div class="case-desc">${c.desc}</div>
          </div>
          <div class="case-tag-col"><span class="tag tag-danger">Reform</span></div>
        </article>
      `).join('')}
    </div>
  </section>

  <section class="cta-band">
    <h2>Ready to see it work?</h2>
    <p>Open the live feed, allow camera access, and watch the pipeline draw boxes, classify, and alert.</p>
    <a class="btn btn-primary" href="/webcam.html">Launch live detection</a>
  </section>
`;
