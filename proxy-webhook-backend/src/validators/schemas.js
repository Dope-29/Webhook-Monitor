'use strict';

const Joi = require('joi');

// ─── Auth ────────────────────────────────────────────────────────────────────

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().min(1).max(255).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ─── Pipelines ───────────────────────────────────────────────────────────────

const createPipelineSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  destination_url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  proxy_url: Joi.string().uri().optional().allow('', null).default(null),
  timeout: Joi.number().integer().min(1000).max(60000).default(10000),
  provider: Joi.string().max(100).optional().allow('', null).default(null),
  retention_days: Joi.number().integer().min(1).max(365).required(),
});

const updatePipelineSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  destination_url: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  proxy_url: Joi.string().uri().optional().allow('', null),
  timeout: Joi.number().integer().min(1000).max(60000).optional(),
  provider: Joi.string().max(100).optional().allow('', null),
  retention_days: Joi.number().integer().min(1).max(365).optional(),
  paused: Joi.boolean().optional(),
}).min(1); // at least one field required

// ─── Settings ────────────────────────────────────────────────────────────────

const updateRetentionSchema = Joi.object({
  default_retention_days: Joi.number().integer().min(1).max(365).required(),
});

module.exports = {
  signupSchema,
  loginSchema,
  createPipelineSchema,
  updatePipelineSchema,
  updateRetentionSchema,
};
