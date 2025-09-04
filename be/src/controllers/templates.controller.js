const svc = require('../services/templates.service');
const excelService = require('../services/excel.service');

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

// Import Excel file and save to a single group
exports.importExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { branchId, departmentId, positionId } = req.body;
    if (!branchId || !departmentId || !positionId) {
      return res.status(400).json({ error: 'branchId, departmentId, positionId are required' });
    }

    // Parse Excel file
    const parsedData = await excelService.parseExcelFile(req.file.buffer);
    const { headers, rows } = parsedData;

    if (!headers.length || !rows.length) {
      return res.status(400).json({ error: 'No valid data found in Excel file' });
    }

    // Save to database
    const key = makeKey(branchId, departmentId, positionId);
    const saved = await svc.upsert({ 
      key, 
      branchId, 
      departmentId, 
      positionId, 
      headers, 
      rows, 
      sourceFile: req.file.originalname 
    });

    res.json(saved);
  } catch (e) {
    next(e);
  }
};

// Import Excel file and bulk assign to multiple groups
exports.importExcelBulk = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { keys } = req.body;
    if (!keys) {
      return res.status(400).json({ error: 'keys field is required' });
    }

    // Parse keys (might be a JSON string from FormData)
    let parsedKeys;
    try {
      parsedKeys = typeof keys === 'string' ? JSON.parse(keys) : keys;
    } catch (e) {
      return res.status(400).json({ error: 'keys must be a valid JSON array' });
    }

    if (!Array.isArray(parsedKeys) || parsedKeys.length === 0) {
      return res.status(400).json({ error: 'keys must be a non-empty array' });
    }

    // Parse Excel file
    const parsedData = await excelService.parseExcelFile(req.file.buffer);
    const { headers, rows } = parsedData;

    if (!headers.length || !rows.length) {
      return res.status(400).json({ error: 'No valid data found in Excel file' });
    }

    // Save to multiple groups
    const results = [];
    for (const key of parsedKeys) {
      const [branchId, departmentId, positionId] = key.split('|');
      const saved = await svc.upsert({ 
        key, 
        branchId, 
        departmentId, 
        positionId, 
        headers, 
        rows, 
        sourceFile: req.file.originalname 
      });
      results.push(saved);
    }

    res.json({ items: results });
  } catch (e) {
    next(e);
  }
};
