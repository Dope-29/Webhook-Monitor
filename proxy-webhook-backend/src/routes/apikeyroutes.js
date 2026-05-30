'use strict';

const express = require('express');
const { list, create, revoke } = require('../controllers/apikeycontroller');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateJWT);

router.get('/',       list);
router.post('/',      create);
router.delete('/:id', revoke);

module.exports = router;
