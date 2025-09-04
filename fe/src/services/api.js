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

// FormData upload helper (đừng set Content-Type để fetch tự gắn boundary)
async function httpForm(path, formData) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
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

  // NEW: upload Excel, backend parse + save
  importExcel: ({ file, branchId, departmentId, positionId }) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('branchId', branchId);
    fd.append('departmentId', departmentId);
    fd.append('positionId', positionId);
    return httpForm('/templates/import', fd);
  },

  // NEW: upload Excel + list key để bulk assign
  importExcelBulk: ({ file, keys }) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('keys', JSON.stringify(keys));
    return httpForm('/templates/import-bulk', fd);
  },
};