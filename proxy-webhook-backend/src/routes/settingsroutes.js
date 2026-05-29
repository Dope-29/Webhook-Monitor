'use strict';

const express = require('express');
const { getSettings, updateRetention } = require('../controllers/settingscontroller');
const { authenticateJWT } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateRetentionSchema } = require('../validators/schemas');

const router = express.Router();

// All settings routes require JWT
router.use(authenticateJWT);

router.get('/',            getSettings);
router.put('/retention',   validate(updateRetentionSchema), updateRetention);

module.exports = router;
