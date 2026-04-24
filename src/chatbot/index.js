import { mountLayout } from '../shared/layout.js';
import { read, write } from '../shared/storage.js';
import { isConfigured, startChat, sendMessage } from './gemini.js';
import './chatbot.css';

const page = mountLayout({
  title: 'Safety Chat',
  subtitle: 'Powered by Gemini · grounded in Indian context',
  status: { label: isConfigured() ? 'Connected' : 'API key missing', tone: isConfigured() ? '' : 'warn' },
  actions: `<button class="btn btn-secondary" id="btn-clear-chat">New chat</button>`,
});

const SUGGESTIONS = [
  'Someone is following me on the way home — what should I do?',
  'I felt unsafe at work yesterday. How do I report it?',
  'Teach me 3 self-defense moves I can practice tonight.',
  'What helplines should I save in my phone in India?',
  'How do I help a friend who just told me she was harassed?',
];

let history = read('chat', []);
if (isConfigured()) startChat(history);

function render() {
  page.innerHTML = `
    <div class="chat-shell">
      <aside class="chat-side">
        <section class="glass chat-card">
          <h3>Try asking</h3>
          <div class="chat-suggestions">
            ${SUGGESTIONS.map((s) => `<button class="chat-suggest">${s}</button>`).join('')}
          </div>
        </section>
        <section class="glass chat-card">
          <h3>About this chat</h3>
          <p class="muted" style="font-size: 0.85rem; margin-bottom: 8px;">
            ${isConfigured()
              ? 'Conversations are stored only on this device. Clear them with the "New chat" button.'
              : '<span style="color: var(--warn);">Add a Gemini API key</span> to <code>.env.local</code> as <code>VITE_GEMINI_API_KEY</code>, then restart the dev server.'}
          </p>
          <p class="muted" style="font-size: 0.78rem;">If you are in immediate danger, call <strong style="color: var(--danger);">112</strong> first.</p>
        </section>
      </aside>

      <section class="chat-main">
        <div class="chat-thread" id="thread">
          ${history.length === 0 ? `
            <div class="chat-empty">
              <div class="big">💬</div>
              <div><strong>Hi, I'm ProtectHer.</strong></div>
              <div>Ask me anything about staying safe — or pick a suggestion on the left.</div>
            </div>
          ` : history.map((m) => `<div class="msg ${m.role}">${escapeHtml(m.text)}</div>`).join('')}
        </div>
        <form class="chat-input" id="chat-form">
          <textarea id="chat-input" placeholder="${isConfigured() ? 'Ask anything…' : 'Add VITE_GEMINI_API_KEY to .env.local first'}" ${isConfigured() ? '' : 'disabled'}></textarea>
          <button type="submit" class="btn btn-primary" ${isConfigured() ? '' : 'disabled'}>Send</button>
        </form>
      </section>
    </div>
  `;

  const thread = document.getElementById('thread');
  thread.scrollTop = thread.scrollHeight;

  page.querySelectorAll('.chat-suggest').forEach((b) => {
    b.addEventListener('click', () => submit(b.textContent.trim()));
  });
  document.getElementById('chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = document.getElementById('chat-input').value.trim();
    if (text) submit(text);
  });
  document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('chat-form').requestSubmit();
    }
  });
  document.getElementById('btn-clear-chat').addEventListener('click', () => {
    history = [];
    write('chat', history);
    if (isConfigured()) startChat([]);
    render();
  });
}

async function submit(text) {
  if (!isConfigured()) return;
  history.push({ role: 'user', text });
  render();

  const thread = document.getElementById('thread');
  const thinking = document.createElement('div');
  thinking.className = 'msg bot thinking';
  thinking.textContent = 'Thinking…';
  thread.appendChild(thinking);
  thread.scrollTop = thread.scrollHeight;

  try {
    const reply = await sendMessage(text);
    history.push({ role: 'bot', text: reply });
    write('chat', history);
    render();
  } catch (err) {
    thinking.classList.remove('thinking');
    thinking.classList.add('error');
    thinking.textContent = `Error: ${err.message ?? err}`;
  }
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

render();
