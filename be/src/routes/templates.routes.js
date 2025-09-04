const express = require('express');
const ctrl = require('../controllers/templates.controller');

const router = express.Router();

router.get('/', ctrl.list);
router.get('/:key', ctrl.get);
router.post('/', ctrl.upsert);
router.post('/bulk', ctrl.bulkAssign);
router.delete('/:key', ctrl.remove);

// NEW: import Excel -> backend xử lý
router.post('/import', ctrl.importOneMiddleware, ctrl.importOne);
router.post('/import-bulk', ctrl.importBulkMiddleware, ctrl.importBulk);

module.exports = router;