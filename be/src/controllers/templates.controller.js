const svc = require('../services/templates.service');

function makeKey(branchId, departmentId, positionId) {
  return [branchId, departmentId, positionId].join('|');
}

exports.list = async (req, res, next) => {
  try {
    const items = await svc.list();
    res.json({ items });
  } catch (e) { next(e); }
};

exports.upsert = async (req, res, next) => {
  const { branchId, departmentId, positionId, headers, rows, sourceFile } = req.body || {};
  if (!branchId || !departmentId || !positionId) return res.status(400).json({ error: 'branchId, departmentId, positionId are required' });
  if (!Array.isArray(headers) || !Array.isArray(rows)) return res.status(400).json({ error: 'headers and rows must be arrays' });
  const key = makeKey(branchId, departmentId, positionId);
  try {
    const saved = await svc.upsert({ key, branchId, departmentId, positionId, headers, rows, sourceFile });
    res.json(saved);
  } catch (e) { next(e); }
};

exports.bulkAssign = async (req, res, next) => {
  const { keys, headers, rows, sourceFile } = req.body || {};
  if (!Array.isArray(keys) || keys.length === 0) return res.status(400).json({ error: 'keys is required' });
  if (!Array.isArray(headers) || !Array.isArray(rows)) return res.status(400).json({ error: 'headers and rows must be arrays' });
  try {
    const results = [];
    for (const key of keys) {
      const [branchId, departmentId, positionId] = key.split('|');
      const saved = await svc.upsert({ key, branchId, departmentId, positionId, headers, rows, sourceFile });
      results.push(saved);
    }
    res.json({ items: results });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  const { key } = req.params;
  if (!key) return res.status(400).json({ error: 'key is required' });
  try {
    await svc.remove(key);
    res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  const { key } = req.params;
  try {
    const item = await svc.get(key);
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(item);
  } catch (e) { next(e); }
};
