'use strict';

const express = require('express');
const { ingest } = require('../controllers/webhookcontroller');
const { webhookIngestLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public endpoint — no JWT, but rate-limited
router.post('/:pipelineId', webhookIngestLimiter, ingest);

module.exports = router;
