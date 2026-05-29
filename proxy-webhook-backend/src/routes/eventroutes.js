'use strict';

const express = require('express');
const { list, getById, replay } = require('../controllers/eventcontroller');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// All event routes require JWT
router.use(authenticateJWT);

router.get('/',          list);
router.get('/:id',       getById);
router.post('/:id/replay', replay);

module.exports = router;
