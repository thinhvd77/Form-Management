// Simple local storage based template store
// Key = `${branchId}|${departmentId}|${positionId}`

const STORAGE_KEY = 'formTemplatesV1';

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function makeKey(branchId, departmentId, positionId) {
  return [branchId, departmentId, positionId].join('|');
}

export function upsertTemplate(key, template) {
  const store = loadStore();
  store[key] = {
    ...template,
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
}

export function getTemplate(key) {
  const store = loadStore();
  return store[key];
}

export function listTemplates() {
  const store = loadStore();
  return Object.entries(store).map(([key, value]) => ({ key, ...value }));
}

export function removeTemplate(key) {
  const store = loadStore();
  delete store[key];
  saveStore(store);
}
