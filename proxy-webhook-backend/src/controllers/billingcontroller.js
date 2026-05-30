'use strict';

/**
 * Billing Controller — Stripe integration
 *
 * All Stripe API keys are read from environment variables.
 * Set STRIPE_SECRET_KEY to a real key to go live; leave as placeholder for dev.
 *
 * Endpoints:
 *   POST /api/billing/checkout  → Create a Stripe Checkout session (plan upgrade)
 *   POST /api/billing/portal    → Create a Stripe Customer Portal session (manage billing)
 *   GET  /api/billing/status    → Return current plan + subscription status
 *   POST /api/billing/webhook   → Handle Stripe webhook events (public, no JWT)
 */

const db = require('../config/database');
const logger = require('../services/loggerservice');

// Lazy-init Stripe — only requires the key when billing routes are actually called
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_placeholder') {
    const err = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.');
    err.statusCode = 501;
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }
  // eslint-disable-next-line global-require
  return require('stripe')(key);
}

const PLAN_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_placeholder_starter',
  team:    process.env.STRIPE_PRICE_TEAM    || 'price_placeholder_team',
};

const FRONTEND_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

// ── GET /api/billing/status ───────────────────────────────────────────────────
async function getStatus(req, res, next) {
  try {
    const result = await db.query(
      'SELECT plan, stripe_customer_id, stripe_subscription_id FROM customers WHERE id = $1',
      [req.user.customer_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ billing: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/billing/checkout ────────────────────────────────────────────────
async function createCheckout(req, res, next) {
  try {
    const { plan } = req.body;
    if (!['starter', 'team'].includes(plan)) {
      return res.status(422).json({ error: 'Invalid plan. Choose starter or team.' });
    }

    const stripe = getStripe();

    // Get or create Stripe customer
    const customerResult = await db.query(
      'SELECT email, name, stripe_customer_id FROM customers WHERE id = $1',
      [req.user.customer_id]
    );
    const row = customerResult.rows[0];

    let stripeCustomerId = row.stripe_customer_id;
    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: row.email,
        name: row.name,
        metadata: { hookwatch_customer_id: req.user.customer_id },
      });
      stripeCustomerId = stripeCustomer.id;
      await db.query(
        'UPDATE customers SET stripe_customer_id = $1 WHERE id = $2',
        [stripeCustomerId, req.user.customer_id]
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: PLAN_PRICES[plan], quantity: 1 }],
      success_url: `${FRONTEND_URL}/billing?success=1`,
      cancel_url:  `${FRONTEND_URL}/billing?cancelled=1`,
      metadata: { hookwatch_customer_id: req.user.customer_id, plan },
    });

    logger.info('Stripe checkout session created', { customerId: req.user.customer_id, plan, sessionId: session.id });
    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/billing/portal ──────────────────────────────────────────────────
async function createPortal(req, res, next) {
  try {
    const stripe = getStripe();

    const result = await db.query(
      'SELECT stripe_customer_id FROM customers WHERE id = $1',
      [req.user.customer_id]
    );
    const { stripe_customer_id: stripeCustomerId } = result.rows[0] || {};

    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer on record. Please upgrade first.', code: 'NO_STRIPE_CUSTOMER' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${FRONTEND_URL}/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/billing/webhook (public — no JWT) ───────────────────────────────
async function handleWebhook(req, res, next) {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || secret === 'whsec_placeholder') {
    logger.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not configured');
    return res.json({ received: true });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', { error: err.message });
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const hookwatchId = session.metadata?.hookwatch_customer_id;
        const plan = session.metadata?.plan;
        if (hookwatchId && plan) {
          await db.query(
            'UPDATE customers SET plan = $1, stripe_subscription_id = $2 WHERE id = $3',
            [plan, session.subscription, hookwatchId]
          );
          logger.info('Plan upgraded via checkout', { hookwatchId, plan });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status; // active, past_due, canceled, etc.
        if (status === 'active') {
          // Plan is determined by price ID
          const priceId = sub.items?.data?.[0]?.price?.id;
          const plan = Object.entries(PLAN_PRICES).find(([, p]) => p === priceId)?.[0] || 'starter';
          await db.query(
            'UPDATE customers SET plan = $1 WHERE stripe_subscription_id = $2',
            [plan, sub.id]
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await db.query(
          'UPDATE customers SET plan = $1, stripe_subscription_id = NULL WHERE stripe_subscription_id = $2',
          ['free', sub.id]
        );
        logger.info('Subscription cancelled — reverted to free', { subscriptionId: sub.id });
        break;
      }

      default:
        logger.debug('Unhandled Stripe event type', { type: event.type });
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStatus, createCheckout, createPortal, handleWebhook };
