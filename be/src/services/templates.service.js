const { AppDataSource } = require('../config/dataSource');

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    initialized = true;
  }
}

async function list() {
  await ensureInit();
  const repo = AppDataSource.getRepository('Template');
  return await repo.find({ order: { updatedAt: 'DESC' } });
}

async function upsert(template) {
  await ensureInit();
  if (!template || !template.key) throw new Error('key is required');
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
  const repo = AppDataSource.getRepository('Template');
  await repo.delete({ key });
}

async function get(key) {
  await ensureInit();
  const repo = AppDataSource.getRepository('Template');
  return await repo.findOneBy({ key });
}

module.exports = { list, upsert, remove, get };
