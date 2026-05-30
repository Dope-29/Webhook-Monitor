'use strict';

const express = require('express');
const {
  listRules, createRule, updateRule, deleteRule,
  listChannels, createChannel, deleteChannel,
  listHistory, acknowledge, acknowledgeAll,
} = require('../controllers/alertcontroller');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateJWT);

// Rules
router.get('/rules',         listRules);
router.post('/rules',        createRule);
router.put('/rules/:id',     updateRule);
router.delete('/rules/:id',  deleteRule);

// Channels
router.get('/channels',        listChannels);
router.post('/channels',       createChannel);
router.delete('/channels/:id', deleteChannel);

// History
router.get('/history',                        listHistory);
router.post('/history/:id/acknowledge',       acknowledge);
router.post('/history/acknowledge-all',       acknowledgeAll);

module.exports = router;
