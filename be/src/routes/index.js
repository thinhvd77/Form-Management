const express = require('express');
let sampleRouter;
try { sampleRouter = require('./sample.routes'); } catch { sampleRouter = express.Router(); }
const templatesRouter = require('./templates.routes');

const router = express.Router();

router.use('/sample', sampleRouter);
router.use('/templates', templatesRouter);

module.exports = router;
