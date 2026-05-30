import { useEffect, useState } from 'react';
import {
  IconUser, IconMail, IconPlus, IconTrash, IconLoader2,
  IconCrown, IconLock, IconSend,
} from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';
import { toastSuccess, toastError } from '../store/toastStore';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonCard } from '../components/Skeleton';

const ROLE_LABELS = { owner: 'Owner', member: 'Member', viewer: 'Viewer' };
const ROLE_BADGE  = { owner: 'badge-blue', member: 'badge-success', viewer: 'badge-gray' };

function Avatar({ name, avatarUrl, size = 28 }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--color-blue)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function TeamPage() {
  const confirm = useConfirm();
  const [settings, setSettings] = useState(null);
  const [members,  setMembers]  = useState([]);
  const [invites,  setInvites]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [planLoading, setPlanLoading] = useState(true);
  const [plan, setPlan] = useState('free');

  const [email,   setEmail]   = useState('');
  const [role,    setRole]    = useState('member');
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const [sRes, mRes, iRes, bRes] = await Promise.all([
        client.get('/api/settings'),
        client.get('/api/team/members'),
        client.get('/api/team/invites'),
        client.get('/api/billing/status'),
      ]);
      setSettings(sRes.data.settings);
      setMembers(mRes.data.members || []);
      setInvites(iRes.data.invites || []);
      setPlan(bRes.data.billing?.plan || 'free');
    } catch {
      toastError('Failed to load team data.');
    } finally {
      setLoading(false);
      setPlanLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toastError('Enter an email address.');
    setSending(true);
    try {
      const { data } = await client.post('/api/team/invite', { email: email.trim(), role });
      setInvites(prev => [data.invite, ...prev]);
      setEmail('');
      toastSuccess(`Invite sent to ${email.trim()}.`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send invite.';
      if (err.response?.data?.code === 'PLAN_REQUIRED') {
        toastError('Team invitations require the Team plan. Upgrade in Billing.');
      } else {
        toastError(msg);
      }
    } finally {
      setSending(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const ok = await confirm({
      title: 'Remove member',
      message: `Remove ${member.name} from your workspace? They will lose access immediately.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await client.delete(`/api/team/members/${member.id}`);
      setMembers(prev => prev.filter(m => m.id !== member.id));
      toastSuccess('Member removed.');
    } catch {
      toastError('Failed to remove member.');
    }
  };

  const handleCancelInvite = async (invite) => {
    try {
      await client.delete(`/api/team/invites/${invite.id}`);
      setInvites(prev => prev.filter(i => i.id !== invite.id));
      toastSuccess('Invite cancelled.');
    } catch {
      toastError('Failed to cancel invite.');
    }
  };

  const isTeamPlan = plan === 'team';

  return (
    <AppLayout topbarProps={{ breadcrumb: 'Team' }}>
      <div className="page-title">Team</div>

      {/* Current members */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: '0.75rem' }}>Members</div>

        {loading ? <SkeletonCard rows={2} /> : (
          <table className="table">
            <thead>
              <tr><th>Member</th><th>Email</th><th>Role</th><th></th></tr>
            </thead>
            <tbody>
              {/* Owner row */}
              {settings && (
                <tr>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={settings.name} avatarUrl={settings.avatar_url} size={26} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{settings.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>(you)</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{settings.email}</td>
                  <td>
                    <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <IconCrown size={10} /> Owner
                    </span>
                  </td>
                  <td></td>
                </tr>
              )}

              {/* Team members */}
              {members.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={m.name} avatarUrl={m.avatar_url} size={26} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{m.email}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[m.role] || 'badge-gray'}`}>
                      {ROLE_LABELS[m.role] || m.role}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleRemoveMember(m)} title="Remove">
                      <IconTrash size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: '0.75rem' }}>Pending invites</div>
          <table className="table">
            <thead><tr><th>Email</th><th>Role</th><th>Sent</th><th>Expires</th><th></th></tr></thead>
            <tbody>
              {invites.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontSize: 12 }}>{inv.invitee_email}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[inv.role] || 'badge-gray'}`}>
                      {ROLE_LABELS[inv.role] || inv.role}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {new Date(inv.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleCancelInvite(inv)} title="Cancel">
                      <IconTrash size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite form */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: '0.5rem' }}>Invite team members</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '0.875rem' }}>
          Invite colleagues to access your pipelines and events.{' '}
          {!isTeamPlan && (
            <span style={{ color: 'var(--color-text-tertiary)' }}>
              Requires the <a href="/billing" style={{ color: 'var(--color-blue)' }}>Team plan</a>.
            </span>
          )}
        </div>

        <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="input"
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={!isTeamPlan}
            style={{ flex: '1 1 220px', maxWidth: 300 }}
          />
          <select
            className="input"
            value={role}
            onChange={e => setRole(e.target.value)}
            disabled={!isTeamPlan}
            style={{ width: 120 }}
          >
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={!isTeamPlan || sending}
          >
            {sending
              ? <IconLoader2 size={12} className="spinner" />
              : <IconSend size={12} />}
            Send invite
          </button>
        </form>

        {!isTeamPlan && (
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconLock size={11} />
            Upgrade to Team plan to invite collaborators.
          </div>
        )}

        <div style={{ marginTop: '1rem', padding: '12px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>ROLE PERMISSIONS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', rowGap: 3, fontSize: 11, color: 'var(--color-text-secondary)' }}>
            <span><strong>Member</strong></span><span>View &amp; manage pipelines, events, replay</span>
            <span><strong>Viewer</strong></span><span>Read-only access to pipelines and events</span>
            <span><strong>Owner</strong></span><span>Full access including billing and team settings</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
