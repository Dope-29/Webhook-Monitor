'use strict';

/**
 * Forwarding Service
 *
 * Decrypts a stored webhook payload and POSTs it to the pipeline's destination_url.
 * Retry schedule: immediate → 1 min → 5 min → 15 min (then mark permanently failed).
 * This function is always called fire-and-forget (no await at call site).
 */

const axios = require('axios');
const db = require('../config/database');
const { getDEKByKeyId, decryptPayload } = require('./encryptionservice');
const logger = require('./loggerservice');

const RETRY_DELAYS_MS = [60_000, 300_000, 900_000]; // 1 min, 5 min, 15 min

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function forwardWebhook(webhookId, pipeline) {
  // Fetch the full encrypted webhook record
  const webhookResult = await db.query(
    'SELECT encrypted_payload, iv, auth_tag, key_id FROM webhooks WHERE id = $1',
    [webhookId]
  );

  if (webhookResult.rows.length === 0) {
    logger.error(`forwardWebhook: webhook ${webhookId} not found in DB`);
    return;
  }

  const { encrypted_payload, iv, auth_tag, key_id } = webhookResult.rows[0];

  // Decrypt in memory — DEK is never written to a variable that escapes this function
  const dek = await getDEKByKeyId(key_id);
  const rawPayload = decryptPayload(encrypted_payload, iv, auth_tag, dek);

  let parsedPayload;
  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch {
    parsedPayload = rawPayload; // forward as plain string if not valid JSON
  }

  // Build axios config
  const axiosConfig = {
    timeout: pipeline.timeout || 10000,
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Source': 'WebhookMonitor/1.0',
    },
  };

  if (pipeline.proxy_url) {
    try {
      const proxyUrl = new URL(pipeline.proxy_url);
      axiosConfig.proxy = {
        host: proxyUrl.hostname,
        port: parseInt(proxyUrl.port, 10) || 80,
        protocol: proxyUrl.protocol.replace(':', ''),
      };
    } catch {
      logger.warn(`Invalid proxy_url for pipeline ${pipeline.id}: ${pipeline.proxy_url}`);
    }
  }

  // Attempt + retry loop
  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const start = Date.now();
    try {
      const response = await axios.post(pipeline.destination_url, parsedPayload, axiosConfig);
      const latency = Date.now() - start;

      await db.query(
        'UPDATE webhooks SET status_code = $1, latency_ms = $2 WHERE id = $3',
        [response.status, latency, webhookId]
      );

      logger.info('Webhook forwarded successfully', {
        webhookId, status: response.status, latency, destination: pipeline.destination_url,
      });
      return; // success — exit

    } catch (err) {
      lastError = err;
      const statusCode = err.response?.status ?? 0;
      const latency = Date.now() - start;

      logger.warn(`Webhook forward attempt ${attempt + 1} failed`, {
        webhookId, status: statusCode, latency, error: err.message,
      });

      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  // Permanently failed — status_code -1 signals permanent failure in the DB
  await db.query(
    'UPDATE webhooks SET status_code = $1 WHERE id = $2',
    [-1, webhookId]
  );

  logger.error('Webhook permanently failed after all retries', {
    webhookId, error: lastError?.message, destination: pipeline.destination_url,
  });
}

module.exports = { forwardWebhook };
