'use strict';

const express = require('express');
const { list, create, update, remove } = require('../controllers/pipelinecontroller');
const { authenticateJWT } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createPipelineSchema, updatePipelineSchema } = require('../validators/schemas');

const router = express.Router();

// All pipeline routes require JWT
router.use(authenticateJWT);

router.get('/',    list);
router.post('/',   validate(createPipelineSchema), create);
router.put('/:id', validate(updatePipelineSchema), update);
router.delete('/:id', remove);

module.exports = router;
