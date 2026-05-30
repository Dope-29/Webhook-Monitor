'use strict';

/**
 * Forwarding Service
 *
 * Decrypts a stored webhook payload and POSTs it to the pipeline's destination_url.
 * Retry schedule: immediate → 1 min → 5 min → 15 min (then mark permanently failed).
 * Captures response status + body (truncated to 4KB) for the Event Inspector.
 * Writes a replay_attempt row on every attempt.
 */

const axios = require('axios');
const db = require('../config/database');
const { getDEKByKeyId, decryptPayload } = require('./encryptionservice');
const logger = require('./loggerservice');

const RETRY_DELAYS_MS = [60_000, 300_000, 900_000]; // 1 min, 5 min, 15 min
const MAX_RESPONSE_BODY = 4096; // 4 KB cap

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Safely truncate response body to MAX_RESPONSE_BODY bytes */
function truncateBody(body) {
  if (!body) return null;
  const str = typeof body === 'object' ? JSON.stringify(body) : String(body);
  return str.length > MAX_RESPONSE_BODY ? str.slice(0, MAX_RESPONSE_BODY) + '…' : str;
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

  const dek = await getDEKByKeyId(key_id);
  const rawPayload = decryptPayload(encrypted_payload, iv, auth_tag, dek);

  let parsedPayload;
  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch {
    parsedPayload = rawPayload;
  }

  const axiosConfig = {
    timeout: pipeline.timeout || 10000,
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Source': 'HookWatch/1.0',
    },
    // Don't throw on non-2xx — capture the response instead
    validateStatus: () => true,
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

  let lastError = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const start = Date.now();
    let statusCode = null;
    let responseBody = null;
    let errorMessage = null;

    try {
      const response = await axios.post(pipeline.destination_url, parsedPayload, axiosConfig);
      const latency = Date.now() - start;
      statusCode = response.status;
      responseBody = truncateBody(response.data);

      // Write replay attempt
      await db.query(
        `INSERT INTO replay_attempts (webhook_id, status_code, latency_ms)
         VALUES ($1, $2, $3)`,
        [webhookId, statusCode, latency]
      );

      // Update webhook with final status + captured response
      await db.query(
        `UPDATE webhooks
         SET status_code = $1, latency_ms = $2, response_status = $3, response_body = $4
         WHERE id = $5`,
        [statusCode, latency, statusCode, responseBody, webhookId]
      );

      const isSuccess = statusCode >= 200 && statusCode < 300;
      if (isSuccess) {
        logger.info('Webhook forwarded successfully', { webhookId, status: statusCode, latency });
        return;
      }

      // Non-2xx — treat as failure, try retry
      lastError = new Error(`HTTP ${statusCode}`);
      logger.warn(`Webhook forward attempt ${attempt + 1} got non-2xx`, { webhookId, status: statusCode });

    } catch (err) {
      lastError = err;
      statusCode = -1;
      errorMessage = err.message;
      const latency = Date.now() - start;

      await db.query(
        `INSERT INTO replay_attempts (webhook_id, status_code, latency_ms, error_message)
         VALUES ($1, $2, $3, $4)`,
        [webhookId, statusCode, latency, errorMessage]
      );

      logger.warn(`Webhook forward attempt ${attempt + 1} failed`, { webhookId, error: err.message });
    }

    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  // Permanently failed
  await db.query(
    `UPDATE webhooks SET status_code = $1, response_status = NULL WHERE id = $2`,
    [-1, webhookId]
  );

  logger.error('Webhook permanently failed after all retries', {
    webhookId, error: lastError?.message, destination: pipeline.destination_url,
  });
}

module.exports = { forwardWebhook };
