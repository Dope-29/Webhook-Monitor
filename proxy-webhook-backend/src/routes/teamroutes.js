'use strict';

const express = require('express');
const {
  listMembers, listInvites, invite, acceptInvite,
  removeMember, cancelInvite, getInviteInfo,
} = require('../controllers/teamcontroller');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Public — invite info & accept
router.get('/invite-info/:token', getInviteInfo);
router.post('/accept/:token',     acceptInvite);

// Protected
router.use(authenticateJWT);
router.get('/members',         listMembers);
router.get('/invites',         listInvites);
router.post('/invite',         invite);
router.delete('/members/:id',  removeMember);
router.delete('/invites/:id',  cancelInvite);

module.exports = router;
