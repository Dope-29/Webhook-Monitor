'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const { requestLogger } = require('./middleware/requestlogger');
const { globalErrorHandler } = require('./middleware/errorhandler');

const authRoutes        = require('./routes/authroutes');
const pipelineRoutes    = require('./routes/pipelineroutes');
const eventRoutes       = require('./routes/eventroutes');
const webhookRoutes     = require('./routes/publicwebhookroutes');
const settingsRoutes    = require('./routes/settingsroutes');

const app = express();

// ─── Trust reverse proxy (required for accurate IP in rate limiters) ──────────
app.set('trust proxy', 1);

// ─── Security & Optimization Middleware ─────────────────────────────────────
// Disable CSP — this is a pure JSON API, no HTML is served
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(compression());

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── HTTP Request Logger (headers/IP only — never body) ──────────────────────
app.use(requestLogger);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Route Mounting ──────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/events',    eventRoutes);
app.use('/api/settings',  settingsRoutes);
app.use('/webhook',       webhookRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global Error Handler (must be LAST) ─────────────────────────────────────
app.use(globalErrorHandler);

module.exports = app;