'use strict';

const express = require('express');
const { list, getById, replay, getReplayHistory, deleteAll } = require('../controllers/eventcontroller');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// All event routes require JWT
router.use(authenticateJWT);

router.get('/',            list);
router.delete('/',         deleteAll);
router.get('/:id',                 getById);
router.post('/:id/replay',         replay);
router.get('/:id/replay-history',  getReplayHistory);

module.exports = router;
