import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are ProtectHer, a calm, supportive safety assistant for women in India.
Your priorities, in order:
1. If the user is in immediate danger, tell them to call 112 (or 1091 women helpline) FIRST, then give 1-2 short tactical tips.
2. Otherwise give clear, practical advice grounded in real situations: defense techniques, safe-route habits, helplines, legal rights, mental-health resources.
3. Be brief, kind, and concrete. Prefer bullet points and numbered steps. Avoid lectures.
4. Never minimize or victim-blame. Believe what the user tells you.
5. If asked something unrelated to safety, gently redirect — but answer general questions in 1-2 sentences before redirecting.
6. Use Indian context: helpline numbers, Indian laws (BNS / IT Act), Indian cities and norms.

Helpline cheat-sheet you can mention:
- 112 (all-India emergency)
- 1091 (women helpline)
- 181 (women in distress)
- 1098 (children)
- 100 (police), 108 (ambulance)`;

let chat = null;

export function isConfigured() {
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY);
}

export function startChat(history = []) {
  if (!isConfigured()) throw new Error('VITE_GEMINI_API_KEY missing — copy .env.example to .env.local and set the key.');
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });
  chat = model.startChat({
    history: history.map((m) => ({
      role: m.role === 'bot' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
    generationConfig: { temperature: 0.6, maxOutputTokens: 600 },
  });
  return chat;
}

export async function sendMessage(text) {
  if (!chat) startChat();
  const res = await chat.sendMessage(text);
  return res.response.text();
}
