const KEYS = {
  alerts: 'protecther.alerts',
  feedback: 'protecther.feedback',
  chat: 'protecther.chat',
  prefs: 'protecther.prefs',
};

export function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(KEYS[key] ?? key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  localStorage.setItem(KEYS[key] ?? key, JSON.stringify(value));
}

export function append(key, item, cap = 200) {
  const list = read(key, []);
  list.unshift(item);
  if (list.length > cap) list.length = cap;
  write(key, list);
  return list;
}

export function clear(key) {
  localStorage.removeItem(KEYS[key] ?? key);
}

export { KEYS };
