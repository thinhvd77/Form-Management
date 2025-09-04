const express = require('express');
const ctrl = require('../controllers/templates.controller');
const { upload } = require('../middlewares/upload');

const router = express.Router();

router.get('/', ctrl.list);
router.get('/:key', ctrl.get);
router.post('/', ctrl.upsert);
router.post('/bulk', ctrl.bulkAssign);
router.post('/import', upload.single('file'), ctrl.importExcel);
router.post('/import-bulk', upload.single('file'), ctrl.importExcelBulk);
router.delete('/:key', ctrl.remove);

module.exports = router;
