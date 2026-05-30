'use strict';

/**
 * Team Controller
 *
 * Team model:
 *   - One customer is the "workspace owner"
 *   - They can invite other registered or new users as members
 *   - team_members: links member_customer_id → owner_customer_id
 *   - team_invites: pending invite tokens (expire in 7 days)
 *
 * Access scoping:
 *   - On login, if user is a team member, JWT includes workspace_owner_id
 *   - authenticateJWT sets req.user.customer_id = workspace_owner_id (if present)
 *     so all existing controllers transparently serve the owner's data
 */

const crypto = require('crypto');
const db     = require('../config/database');
const logger = require('../services/loggerservice');
const { sendTeamInvite } = require('../services/emailservice');
const jwt      = require('jsonwebtoken');
const { audit } = require('../services/auditservice');

const INVITE_EXPIRE_DAYS = 7;

// ── GET /api/team/members ─────────────────────────────────────────────────────
async function listMembers(req, res, next) {
  try {
    // Members of this workspace (owner is req.user.customer_id)
    const { rows } = await db.query(
      `SELECT tm.id, tm.role, tm.joined_at,
              c.id AS member_id, c.name, c.email, c.avatar_url
       FROM   team_members tm
       JOIN   customers c ON c.id = tm.member_customer_id
       WHERE  tm.owner_customer_id = $1
       ORDER BY tm.joined_at`,
      [req.user.customer_id]
    );
    res.json({ members: rows });
  } catch (err) { next(err); }
}

// ── GET /api/team/invites ─────────────────────────────────────────────────────
async function listInvites(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, invitee_email, role, created_at, expires_at, accepted_at
       FROM   team_invites
       WHERE  owner_customer_id = $1
         AND  accepted_at IS NULL
         AND  expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.user.customer_id]
    );
    res.json({ invites: rows });
  } catch (err) { next(err); }
}

// ── POST /api/team/invite ─────────────────────────────────────────────────────
async function invite(req, res, next) {
  try {
    const { email, role = 'member' } = req.body;
    if (!email) return res.status(422).json({ error: 'email is required.' });
    if (!['member', 'viewer'].includes(role)) {
      return res.status(422).json({ error: 'role must be member or viewer.' });
    }

    // Check plan allows team members
    const { rows: ownerRows } = await db.query(
      'SELECT plan, name FROM customers WHERE id = $1',
      [req.user.customer_id]
    );
    const owner = ownerRows[0];
    if (!owner || owner.plan !== 'team') {
      return res.status(403).json({
        error: 'Team invitations require the Team plan.',
        code: 'PLAN_REQUIRED',
      });
    }

    // Don't invite yourself
    const { rows: selfRows } = await db.query(
      'SELECT email FROM customers WHERE id = $1', [req.user.customer_id]
    );
    if (selfRows[0]?.email?.toLowerCase() === email.toLowerCase()) {
      return res.status(422).json({ error: 'You cannot invite yourself.' });
    }

    // Check not already a member
    const { rows: memberRows } = await db.query(
      `SELECT tm.id FROM team_members tm
       JOIN customers c ON c.id = tm.member_customer_id
       WHERE tm.owner_customer_id = $1 AND LOWER(c.email) = LOWER($2)`,
      [req.user.customer_id, email]
    );
    if (memberRows.length) return res.status(409).json({ error: 'This person is already a team member.' });

    // Upsert pending invite (replace existing un-accepted one)
    await db.query(
      `DELETE FROM team_invites
       WHERE owner_customer_id = $1 AND LOWER(invitee_email) = LOWER($2) AND accepted_at IS NULL`,
      [req.user.customer_id, email]
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRE_DAYS * 86400 * 1000);

    const { rows } = await db.query(
      `INSERT INTO team_invites (owner_customer_id, invitee_email, role, token_hash, expires_at)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, invitee_email, role, created_at, expires_at`,
      [req.user.customer_id, email.toLowerCase(), role, tokenHash, expiresAt]
    );

    await sendTeamInvite(email, rawToken, owner.name);
    logger.info('Team invite sent', { ownerId: req.user.customer_id, inviteeEmail: email });
    audit(req.user.customer_id, 'member_invited', { inviteeEmail: email, role });

    res.status(201).json({ invite: rows[0] });
  } catch (err) { next(err); }
}

// ── POST /api/team/accept/:token ──────────────────────────────────────────────
async function acceptInvite(req, res, next) {
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { rows } = await db.query(
      `SELECT ti.id, ti.owner_customer_id, ti.invitee_email, ti.role,
              c.name AS owner_name
       FROM   team_invites ti
       JOIN   customers c ON c.id = ti.owner_customer_id
       WHERE  ti.token_hash = $1
         AND  ti.accepted_at IS NULL
         AND  ti.expires_at > NOW()`,
      [tokenHash]
    );
    if (!rows.length) {
      return res.status(400).json({ error: 'Invalid or expired invite link.' });
    }
    const invite = rows[0];

    // Find or check invitee account
    const { rows: inviteeRows } = await db.query(
      'SELECT id, name, email FROM customers WHERE LOWER(email) = LOWER($1)',
      [invite.invitee_email]
    );

    if (!inviteeRows.length) {
      // No account yet — return info so frontend can redirect to signup with pre-filled email
      return res.json({
        status: 'needs_signup',
        email: invite.invitee_email,
        owner_name: invite.owner_name,
        token,
      });
    }

    const invitee = inviteeRows[0];

    // Already a member?
    const { rows: existingMember } = await db.query(
      'SELECT id FROM team_members WHERE owner_customer_id = $1 AND member_customer_id = $2',
      [invite.owner_customer_id, invitee.id]
    );
    if (!existingMember.length) {
      await db.query(
        'INSERT INTO team_members (owner_customer_id, member_customer_id, role) VALUES ($1,$2,$3)',
        [invite.owner_customer_id, invitee.id, invite.role]
      );
    }

    await db.query(
      'UPDATE team_invites SET accepted_at = NOW() WHERE id = $1',
      [invite.id]
    );

    logger.info('Team invite accepted', { ownerId: invite.owner_customer_id, memberId: invitee.id });
    audit(invite.owner_customer_id, 'member_joined', { memberId: invitee.id, role: invite.role });

    // Issue JWT with workspace_owner_id
    const jwtToken = jwt.sign(
      {
        customer_id: invitee.id,
        workspace_owner_id: invite.owner_customer_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d', issuer: 'hookwatch-api', audience: 'hookwatch-client' }
    );

    res.json({
      status: 'accepted',
      token: jwtToken,
      customer_id: invitee.id,
      workspace_owner_id: invite.owner_customer_id,
      owner_name: invite.owner_name,
    });
  } catch (err) { next(err); }
}

// ── DELETE /api/team/members/:id ──────────────────────────────────────────────
async function removeMember(req, res, next) {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM team_members WHERE id = $1 AND owner_customer_id = $2',
      [req.params.id, req.user.customer_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Member not found.' });
    res.json({ removed: true });
  } catch (err) { next(err); }
}

// ── DELETE /api/team/invites/:id ──────────────────────────────────────────────
async function cancelInvite(req, res, next) {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM team_invites WHERE id = $1 AND owner_customer_id = $2',
      [req.params.id, req.user.customer_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Invite not found.' });
    res.json({ cancelled: true });
  } catch (err) { next(err); }
}

// ── GET /api/team/invite-info/:token (public) ─────────────────────────────────
async function getInviteInfo(req, res, next) {
  try {
    const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const { rows } = await db.query(
      `SELECT ti.invitee_email, ti.role, c.name AS owner_name
       FROM   team_invites ti
       JOIN   customers c ON c.id = ti.owner_customer_id
       WHERE  ti.token_hash = $1 AND ti.accepted_at IS NULL AND ti.expires_at > NOW()`,
      [tokenHash]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invalid or expired invite.' });
    res.json({ invite: rows[0] });
  } catch (err) { next(err); }
}

module.exports = { listMembers, listInvites, invite, acceptInvite, removeMember, cancelInvite, getInviteInfo };
