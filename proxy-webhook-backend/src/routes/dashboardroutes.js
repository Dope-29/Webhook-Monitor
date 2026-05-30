'use strict';

const express = require('express');
const { getStats } = require('../controllers/dashboardcontroller');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateJWT);
router.get('/stats', getStats);

module.exports = router;
