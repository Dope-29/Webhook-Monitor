'use strict';

/**
 * Email Service (nodemailer)
 *
 * Reads SMTP config from env. Falls back to a no-op in development
 * if SMTP_HOST is not set — all emails are logged to console instead.
 *
 * Required env vars (production):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

const nodemailer = require('nodemailer');
const logger = require('./loggerservice');

const FRONTEND_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const FROM = process.env.SMTP_FROM || 'HookWatch <noreply@hookwatch.io>';

function createTransport() {
  if (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.example.com') {
    // Dev / no-op transport — log instead of sending
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail({ to, subject, html }) {
  const transport = createTransport();
  if (!transport) {
    logger.info('[EMAIL DEV] Would send email', { to, subject });
    logger.debug('[EMAIL DEV] Body:', { html });
    return;
  }
  await transport.sendMail({ from: FROM, to, subject, html });
  logger.info('Email sent', { to, subject });
}

// ── Specific email templates ──────────────────────────────────────────────────

async function sendPasswordReset(to, token) {
  const url = `${FRONTEND_URL}/reset-password?token=${token}`;
  await sendMail({
    to,
    subject: 'Reset your HookWatch password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1A1916">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px">Reset your password</h2>
        <p style="color:#5F5E5A;font-size:14px;margin-bottom:24px">
          Click the button below to set a new password. This link expires in 1 hour.
        </p>
        <a href="${url}" style="
          display:inline-block;padding:10px 20px;
          background:#185FA5;color:#fff;border-radius:6px;
          font-size:14px;text-decoration:none;font-weight:500
        ">Reset password</a>
        <p style="color:#888780;font-size:12px;margin-top:24px">
          If you didn't request this, you can safely ignore this email.
        </p>
        <p style="color:#888780;font-size:11px">
          Or copy this link: <a href="${url}" style="color:#185FA5">${url}</a>
        </p>
      </div>
    `,
  });
}

async function sendEmailVerification(to, token) {
  const url = `${FRONTEND_URL}/verify-email?token=${token}`;
  await sendMail({
    to,
    subject: 'Verify your HookWatch email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1A1916">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px">Verify your email</h2>
        <p style="color:#5F5E5A;font-size:14px;margin-bottom:24px">
          Thanks for signing up! Click below to verify your email address.
        </p>
        <a href="${url}" style="
          display:inline-block;padding:10px 20px;
          background:#185FA5;color:#fff;border-radius:6px;
          font-size:14px;text-decoration:none;font-weight:500
        ">Verify email</a>
        <p style="color:#888780;font-size:12px;margin-top:24px">
          This link expires in 24 hours.
        </p>
      </div>
    `,
  });
}

async function sendTeamInvite(to, token, ownerName) {
  const url = `${FRONTEND_URL}/team/accept?token=${token}`;
  await sendMail({
    to,
    subject: `${ownerName} invited you to join their HookWatch workspace`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1A1916">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:8px">You've been invited</h2>
        <p style="color:#5F5E5A;font-size:14px;margin-bottom:24px">
          <strong>${ownerName}</strong> has invited you to collaborate on their HookWatch workspace.
          Click below to accept the invitation.
        </p>
        <a href="${url}" style="
          display:inline-block;padding:10px 20px;
          background:#185FA5;color:#fff;border-radius:6px;
          font-size:14px;text-decoration:none;font-weight:500
        ">Accept invitation</a>
        <p style="color:#888780;font-size:12px;margin-top:24px">
          This invitation expires in 7 days.
        </p>
        <p style="color:#888780;font-size:11px">
          Or copy: <a href="${url}" style="color:#185FA5">${url}</a>
        </p>
      </div>
    `,
  });
}

async function sendAlertEmail(to, subject, body) {
  await sendMail({
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1916">
        <h2 style="font-size:16px;font-weight:600;margin-bottom:8px;color:#C0392B">⚠️ HookWatch Alert</h2>
        <p style="color:#5F5E5A;font-size:14px;line-height:1.6;margin-bottom:24px">${body}</p>
        <a href="${FRONTEND_URL}/alerts/history" style="
          display:inline-block;padding:9px 18px;
          background:#185FA5;color:#fff;border-radius:6px;
          font-size:13px;text-decoration:none;font-weight:500
        ">View in HookWatch</a>
        <p style="color:#888780;font-size:11px;margin-top:24px">
          Manage alert rules at <a href="${FRONTEND_URL}/alerts" style="color:#185FA5">${FRONTEND_URL}/alerts</a>
        </p>
      </div>
    `,
  });
}

module.exports = { sendPasswordReset, sendEmailVerification, sendAlertEmail, sendTeamInvite };
