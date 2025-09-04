const express = require('express');
const ctrl = require('../controllers/templates.controller');

const router = express.Router();

router.get('/', ctrl.list);
router.get('/:key', ctrl.get);
router.post('/', ctrl.upsert);
router.post('/bulk', ctrl.bulkAssign);
router.delete('/:key', ctrl.remove);

module.exports = router;
