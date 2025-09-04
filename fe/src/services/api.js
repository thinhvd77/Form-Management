const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function http(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const TemplatesAPI = {
  list: () => http('GET', '/templates'),
  get: (key) => http('GET', `/templates/${encodeURIComponent(key)}`),
  upsert: (payload) => http('POST', '/templates', payload),
  bulk: (payload) => http('POST', '/templates/bulk', payload),
  remove: (key) => http('DELETE', `/templates/${encodeURIComponent(key)}`),
};
