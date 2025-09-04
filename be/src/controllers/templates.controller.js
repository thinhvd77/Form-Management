const multer = require('multer');
const upload = multer(); // memory storage
const tmplService = require('../services/templates.service');
const { parseExcelBuffer } = require('../utils/parseExcel');

// GET /templates
async function list(req, res) {
  try {
    const items = await tmplService.list();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// GET /templates/:key
async function get(req, res) {
  try {
    const item = await tmplService.get(req.params.key);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// POST /templates
async function upsert(req, res) {
  try {
    const saved = await tmplService.upsert(req.body);
    res.json(saved);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// POST /templates/bulk
async function bulkAssign(req, res) {
  try {
    const { keys, headers, rows, sourceFile } = req.body || {};
    if (!Array.isArray(keys) || !headers || !rows) {
      return res.status(400).json({ error: 'keys, headers, rows are required' });
    }
    for (const key of keys) {
      const [branchId, departmentId, positionId] = String(key).split('|');
      await tmplService.upsert({ key, branchId, departmentId, positionId, headers, rows, sourceFile });
    }
    res.json({ ok: true, count: keys.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// DELETE /templates/:key
async function remove(req, res) {
  try {
    await tmplService.remove(req.params.key);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// NEW: POST /templates/import (multipart) -> parse + save one group
const importOneMiddleware = upload.single('file');
async function importOne(req, res) {
  try {
    const { branchId, departmentId, positionId } = req.body || {};
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    if (!branchId || !departmentId || !positionId) return res.status(400).json({ error: 'branchId, departmentId, positionId are required' });

    const { headers, rows } = parseExcelBuffer(req.file.buffer);
    const key = [branchId, departmentId, positionId].join('|');
    const saved = await tmplService.upsert({
      key,
      branchId,
      departmentId,
      positionId,
      headers,
      rows,
      sourceFile: req.file.originalname,
    });
    res.json(saved);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// NEW: POST /templates/import-bulk (multipart) -> parse once + save many keys
const importBulkMiddleware = upload.single('file');
async function importBulk(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    let { keys } = req.body || {};
    try { keys = JSON.parse(keys); } catch {}
    if (!Array.isArray(keys) || keys.length === 0) return res.status(400).json({ error: 'keys[] is required' });

    const { headers, rows } = parseExcelBuffer(req.file.buffer);
    for (const key of keys) {
      const [branchId, departmentId, positionId] = String(key).split('|');
      await tmplService.upsert({
        key,
        branchId,
        departmentId,
        positionId,
        headers,
        rows,
        sourceFile: req.file.originalname,
      });
    }
    res.json({ ok: true, count: keys.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = {
  list,
  get,
  upsert,
  bulkAssign,
  remove,
  importOneMiddleware,
  importOne,
  importBulkMiddleware,
  importBulk,
};