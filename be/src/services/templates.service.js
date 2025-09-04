const { AppDataSource } = require('../config/dataSource');

// Fallback in-memory storage for testing
let memoryStore = new Map();
let initialized = false;

async function ensureInit() {
  if (!initialized) {
    try {
      if (!AppDataSource.isInitialized) await AppDataSource.initialize();
      initialized = true;
    } catch (e) {
      console.warn('Database connection failed, using in-memory storage for testing:', e.message);
      initialized = 'memory'; // Use memory store
    }
  }
}

async function list() {
  await ensureInit();
  if (initialized === 'memory') {
    return Array.from(memoryStore.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  const repo = AppDataSource.getRepository('Template');
  return await repo.find({ order: { updatedAt: 'DESC' } });
}

async function upsert(template) {
  await ensureInit();
  if (!template || !template.key) throw new Error('key is required');
  
  if (initialized === 'memory') {
    const existing = memoryStore.get(template.key);
    const now = new Date();
    if (existing) {
      const updated = { ...template, updatedAt: now };
      memoryStore.set(template.key, updated);
      return updated;
    } else {
      const created = { ...template, createdAt: now, updatedAt: now };
      memoryStore.set(template.key, created);
      return created;
    }
  }
  
  const repo = AppDataSource.getRepository('Template');
  const existing = await repo.findOneBy({ key: template.key });
  if (existing) {
    await repo.update({ key: template.key }, { ...template, updatedAt: new Date() });
    return await repo.findOneBy({ key: template.key });
  }
  return await repo.save(repo.create(template));
}

async function remove(key) {
  await ensureInit();
  if (initialized === 'memory') {
    memoryStore.delete(key);
    return;
  }
  const repo = AppDataSource.getRepository('Template');
  await repo.delete({ key });
}

async function get(key) {
  await ensureInit();
  if (initialized === 'memory') {
    return memoryStore.get(key) || null;
  }
  const repo = AppDataSource.getRepository('Template');
  return await repo.findOneBy({ key });
}

module.exports = { list, upsert, remove, get };
