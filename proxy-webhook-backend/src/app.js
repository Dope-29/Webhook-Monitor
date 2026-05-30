'use strict';

require('dotenv').config();

// ─── Startup env validation — crash loudly rather than fail silently ──────────
const REQUIRED_ENV = ['DATABASE_URL', 'MASTER_KEY', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  console.error('Set them in .env or your deployment config before starting the server.');
  process.exit(1);
}
if (process.env.MASTER_KEY.length < 64) {
  console.error('[FATAL] MASTER_KEY must be at least 64 hex characters (32 bytes).');
  process.exit(1);
}

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const compression = require('compression');
const crypto     = require('crypto');

const { requestLogger } = require('./middleware/requestlogger');
const { globalErrorHandler } = require('./middleware/errorhandler');

const passport       = require('./config/passport');
const authRoutes     = require('./routes/authroutes');
const oauthRoutes    = require('./routes/oauthroutes');
const pipelineRoutes = require('./routes/pipelineroutes');
const eventRoutes    = require('./routes/eventroutes');
const webhookRoutes  = require('./routes/publicwebhookroutes');
const settingsRoutes   = require('./routes/settingsroutes');
const dashboardRoutes  = require('./routes/dashboardroutes');
const billingRoutes    = require('./routes/billingroutes');
const alertRoutes      = require('./routes/alertroutes');
const apiKeyRoutes     = require('./routes/apikeyroutes');
const teamRoutes       = require('./routes/teamroutes');

const app = express();

// ─── Trust reverse proxy (required for accurate IP in rate limiters) ──────────
app.set('trust proxy', 1);

// ─── Security headers ────────────────────────────────────────────────────────
// This is a JSON API — we keep CSP off but enable all other protections.
app.use(helmet({
  contentSecurityPolicy: false,           // API, no HTML served
  crossOriginEmbedderPolicy: false,       // Allow embedding in dev
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ─── CORS — restrict in production ───────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'x-request-id'],
}));

app.use(compression());

// ─── Request ID — thread through all log lines ───────────────────────────────
app.use((req, _res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  next();
});

// ─── Stripe webhook (raw body — must come BEFORE json parser) ────────────────
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Passport (session: false — we use stateless JWT) ────────────────────────
app.use(passport.initialize());

// ─── HTTP Request Logger ─────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const start = Date.now();
  let dbOk = false;
  let dbLatencyMs = null;
  try {
    const db = require('./config/database');
    const t0 = Date.now();
    await db.query('SELECT 1');
    dbOk = true;
    dbLatencyMs = Date.now() - t0;
  } catch {}

  const status = dbOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    status,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    checks: {
      database: { status: dbOk ? 'ok' : 'error', latency_ms: dbLatencyMs },
      stripe_configured: { status: (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder') ? 'configured' : 'placeholder' },
      smtp_configured:   { status: (process.env.SMTP_HOST && process.env.SMTP_HOST !== 'smtp.example.com') ? 'configured' : 'dev_mode' },
    },
  });
});

// ─── Route Mounting ──────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/auth',      oauthRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/events',    eventRoutes);
app.use('/api/settings',   settingsRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/billing',    billingRoutes);
app.use('/api/alerts',     alertRoutes);
app.use('/api/api-keys',   apiKeyRoutes);
app.use('/api/team',       teamRoutes);
app.use('/webhook',       webhookRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
});

// ─── Global Error Handler (must be LAST) ─────────────────────────────────────
app.use(globalErrorHandler);

module.exports = app;
