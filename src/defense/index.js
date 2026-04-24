import { mountLayout } from '../shared/layout.js';
import './defense.css';

const page = mountLayout({
  title: 'Self Defense',
  subtitle: 'Practical techniques and helplines',
  status: { label: 'Read · save · share', tone: '' },
});

const TABS = ['Verbal', 'Defensive', 'Strikes', 'Tools'];
let active = 'Verbal';

const TECHNIQUES = {
  Verbal: [
    { title: 'Be loud, be clear', steps: ['Yell "BACK OFF" or "STOP" instead of "help" — it draws attention faster.', 'Make eye contact and point — name what they\'re doing.', 'Use short, repeated commands. Don\'t argue.'] },
    { title: 'Stay grounded', steps: ['Plant your feet shoulder-width apart, slight bend in knees.', 'Hands open, palms forward at chest height — looks calm, ready to react.', 'Keep your voice low and steady — projects confidence.'] },
    { title: 'Use the bystander effect against itself', steps: ['Single out one person: "You — in the red shirt — call the police."', 'Direct commands break the bystander freeze.', 'Stay near groups, lit areas, open shops.'] },
  ],
  Defensive: [
    { title: 'Wrist grab escape', steps: ['Rotate your wrist toward the attacker\'s thumb — the weakest grip point.', 'Pull sharply, step back, create distance.', 'Run toward people, not away into isolation.'] },
    { title: 'Bear hug from behind', steps: ['Drop your weight — bend knees, lower your hips.', 'Stomp the instep of their foot hard.', 'Throw your head back into their nose, then twist out.'] },
    { title: 'Choke from front', steps: ['Tuck your chin to protect the airway.', 'Bring both arms up between theirs and rotate sharply outward.', 'Counter with a knee to the groin or palm strike to nose.'] },
  ],
  Strikes: [
    { title: 'Palm-heel strike', steps: ['Safer than a fist — won\'t injure your knuckles.', 'Aim for the nose, chin, or jaw at upward angle.', 'Drive through with your hips, not just your arm.'] },
    { title: 'Knee strike', steps: ['Best when grabbed close — drive your knee into the groin or thigh nerve.', 'Grab their shoulders to anchor and add force.', 'Repeat fast — don\'t stop after one.'] },
    { title: 'Elbow strike', steps: ['Strongest weapon you have at close range.', 'Sideways, backwards, downward — versatile from any angle.', 'Aim for nose, throat, or temple.'] },
    { title: 'Eye jab', steps: ['Use straight fingers in a poking motion.', 'Even a near-miss makes them flinch and turn away.', 'Buy yourself the second you need to run.'] },
  ],
  Tools: [
    { title: 'Keys as a weapon', steps: ['Hold one key protruding between your fingers like a small spike.', 'Strike soft tissue: face, neck, ribs.', 'Carry pre-positioned in your hand walking through parking lots.'] },
    { title: 'Pepper spray', steps: ['Practice deploying with eyes closed at home — real attacks happen fast.', 'Spray in a sweeping motion across the eyes.', 'Move sideways immediately — wind can blow it back.'] },
    { title: 'Personal alarm', steps: ['120dB+ siren, runs on a pin-pull. Easier to use than spray.', 'Loud noise startles attackers and alerts everyone within a block.', 'Clip to a bag strap so it\'s always reachable.'] },
    { title: 'Phone safety apps', steps: ['Set up SOS shortcut: 5 power-button presses on Android, side-button hold on iPhone.', 'Pre-add 3 emergency contacts who get your live location.', 'Keep ProtectHer\'s alert dashboard open during walks.'] },
  ],
};

const HELPLINES = [
  { num: '112', label: 'Pan-India Emergency' },
  { num: '1091', label: 'Women Helpline' },
  { num: '181', label: 'Women in Distress' },
  { num: '1098', label: 'Childline' },
  { num: '100', label: 'Police' },
  { num: '108', label: 'Ambulance' },
];

function render() {
  page.innerHTML = `
    <section class="glass def-hero">
      <h2>Face Everything And Rise.</h2>
      <p>Practical techniques you can rehearse in 5 minutes that may matter for the rest of your life. Pick a category below — each card is a real technique, not theory. The goal is awareness, decisiveness, and creating just enough space to escape.</p>
    </section>

    <div class="def-tabs">
      ${TABS.map((t) => `<button class="def-tab ${t === active ? 'active' : ''}" data-tab="${t}">${t}</button>`).join('')}
    </div>

    <div class="def-grid">
      ${TECHNIQUES[active].map((tech, i) => `
        <article class="glass def-card">
          <div class="def-card-head">
            <div class="def-num">${i + 1}</div>
            <h3>${tech.title}</h3>
          </div>
          <ul class="def-steps">
            ${tech.steps.map((s) => `<li>${s}</li>`).join('')}
          </ul>
        </article>
      `).join('')}
    </div>

    <section class="glass def-helplines">
      <h2>Helplines (India)</h2>
      <div class="helpline-grid">
        ${HELPLINES.map((h) => `
          <a class="helpline" href="tel:${h.num}">
            <strong>${h.num}</strong>
            <span>${h.label}</span>
          </a>
        `).join('')}
      </div>
    </section>
  `;

  page.querySelectorAll('.def-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      active = btn.dataset.tab;
      render();
    });
  });
}

render();
