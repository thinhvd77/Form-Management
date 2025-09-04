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

async function httpFormData(method, path, formData) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
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
  
  // New import methods for Excel files
  importExcel: (file, branchId, departmentId, positionId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('branchId', branchId);
    formData.append('departmentId', departmentId);
    formData.append('positionId', positionId);
    return httpFormData('POST', '/templates/import', formData);
  },
  
  importExcelBulk: (file, keys) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('keys', JSON.stringify(keys));
    return httpFormData('POST', '/templates/import-bulk', formData);
  },
};
