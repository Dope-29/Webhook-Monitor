import { useState, useEffect } from 'react';
import {
  IconPlus, IconBell, IconTrash, IconToggleLeft, IconToggleRight,
  IconLoader2, IconMail, IconBrandSlack, IconEdit,
} from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';
import { toastSuccess, toastError } from '../store/toastStore';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonCard } from '../components/Skeleton';

const RULE_TYPE_LABELS = {
  failure_rate: 'Failure rate',
  consecutive_failures: 'Consecutive failures',
  no_events: 'No events (silence)',
  latency: 'High latency',
};

const RULE_DESCRIPTIONS = {
  failure_rate: 'Alert when error rate exceeds threshold % over a window',
  consecutive_failures: 'Alert after N consecutive delivery failures',
  no_events: 'Alert when no events received for N minutes',
  latency: 'Alert when average latency exceeds threshold ms',
};

const BLANK_RULE = {
  pipeline_id: '',
  rule_type: 'failure_rate',
  threshold: '',
  window_minutes: 10,
  channel_id: '',
};

const BLANK_CHANNEL = {
  channel_type: 'email',
  label: '',
  config: { address: '', webhook_url: '' },
};

export default function AlertRulesPage() {
  const confirm = useConfirm();

  const [rules,    setRules]    = useState([]);
  const [channels, setChannels] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [showRuleModal,    setShowRuleModal]    = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [ruleForm,    setRuleForm]    = useState(BLANK_RULE);
  const [channelForm, setChannelForm] = useState(BLANK_CHANNEL);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [rRes, cRes, pRes] = await Promise.all([
        client.get('/api/alerts/rules'),
        client.get('/api/alerts/channels'),
        client.get('/api/pipelines'),
      ]);
      setRules(rRes.data.rules || []);
      setChannels(cRes.data.channels || []);
      setPipelines(pRes.data.pipelines || []);
    } catch {
      toastError('Failed to load alert data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Rule actions ───────────────────────────────────────────────────────────
  const handleToggleRule = async (rule) => {
    try {
      await client.put(`/api/alerts/rules/${rule.id}`, { enabled: !rule.enabled });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
      toastSuccess(`Rule ${rule.enabled ? 'disabled' : 'enabled'}.`);
    } catch {
      toastError('Failed to update rule.');
    }
  };

  const handleDeleteRule = async (rule) => {
    const ok = await confirm({
      title: 'Delete rule',
      message: `Delete the ${RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type} rule for "${rule.pipeline_name}"?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await client.delete(`/api/alerts/rules/${rule.id}`);
      setRules(prev => prev.filter(r => r.id !== rule.id));
      toastSuccess('Rule deleted.');
    } catch {
      toastError('Failed to delete rule.');
    }
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!ruleForm.pipeline_id) return toastError('Select a pipeline.');
    if (!ruleForm.threshold || !ruleForm.window_minutes) return toastError('Fill in all fields.');
    setSaving(true);
    try {
      const payload = {
        pipeline_id:    ruleForm.pipeline_id,
        rule_type:      ruleForm.rule_type,
        threshold:      parseFloat(ruleForm.threshold),
        window_minutes: parseInt(ruleForm.window_minutes),
        channel_id:     ruleForm.channel_id || undefined,
      };
      const { data } = await client.post('/api/alerts/rules', payload);
      const pipeline = pipelines.find(p => p.id === data.rule.pipeline_id);
      const channel  = channels.find(c => c.id === data.rule.channel_id);
      setRules(prev => [{
        ...data.rule,
        pipeline_name: pipeline?.name || '',
        channel_type:  channel?.channel_type || null,
        channel_label: channel?.label || null,
      }, ...prev]);
      toastSuccess('Alert rule created.');
      setShowRuleModal(false);
      setRuleForm(BLANK_RULE);
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to create rule.');
    } finally {
      setSaving(false);
    }
  };

  // ── Channel actions ────────────────────────────────────────────────────────
  const handleSaveChannel = async (e) => {
    e.preventDefault();
    if (!channelForm.label) return toastError('Enter a channel label.');
    const cfg = channelForm.channel_type === 'email'
      ? { address: channelForm.config.address }
      : { webhook_url: channelForm.config.webhook_url };
    if (channelForm.channel_type === 'email' && !cfg.address) return toastError('Enter email address.');
    if (channelForm.channel_type === 'slack' && !cfg.webhook_url) return toastError('Enter Slack webhook URL.');

    setSaving(true);
    try {
      const { data } = await client.post('/api/alerts/channels', {
        channel_type: channelForm.channel_type,
        label: channelForm.label,
        config: cfg,
      });
      setChannels(prev => [data.channel, ...prev]);
      toastSuccess('Channel added.');
      setShowChannelModal(false);
      setChannelForm(BLANK_CHANNEL);
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to add channel.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChannel = async (ch) => {
    const ok = await confirm({
      title: 'Remove channel',
      message: `Remove "${ch.label}"? Alert rules using this channel will lose their notification target.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await client.delete(`/api/alerts/channels/${ch.id}`);
      setChannels(prev => prev.filter(c => c.id !== ch.id));
      toastSuccess('Channel removed.');
    } catch {
      toastError('Failed to remove channel.');
    }
  };

  // ── Threshold label ────────────────────────────────────────────────────────
  const thresholdLabel = (rule) => {
    switch (rule.rule_type) {
      case 'failure_rate':          return `≥ ${rule.threshold}%`;
      case 'consecutive_failures':  return `${rule.threshold} in a row`;
      case 'no_events':             return `silent for ${rule.window_minutes} min`;
      case 'latency':               return `avg ≥ ${rule.threshold} ms`;
      default: return `${rule.threshold}`;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout topbarProps={{
      breadcrumb: 'Alert rules',
      actions: (
        <button className="btn btn-sm btn-primary" onClick={() => setShowRuleModal(true)}>
          <IconPlus size={14} /> New rule
        </button>
      ),
    }}>
      <div className="page-title">Alert rules</div>

      {/* Notification channels */}
      <div className="card">
        <div className="section-head" style={{ marginBottom: '0.75rem' }}>
          <div className="section-title">Notification channels</div>
          <button className="btn btn-sm" onClick={() => setShowChannelModal(true)}>
            <IconPlus size={12} /> Add channel
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
          Where should alerts be delivered?
        </div>

        {loading ? <SkeletonCard rows={2} /> : channels.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.25rem 0' }}>
            No notification channels configured yet.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Label</th><th>Type</th><th>Destination</th><th></th></tr>
            </thead>
            <tbody>
              {channels.map(ch => {
                let config_redacted = {};
                try { config_redacted = JSON.parse(ch.config_redacted || '{}'); } catch {}
                return (
                  <tr key={ch.id}>
                    <td style={{ fontWeight: 500, fontSize: 12 }}>{ch.label}</td>
                    <td>
                      <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {ch.channel_type === 'slack'
                          ? <IconBrandSlack size={11} />
                          : <IconMail size={11} />}
                        {ch.channel_type}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      {config_redacted.address || config_redacted.webhook_url || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleDeleteChannel(ch)} title="Remove">
                        <IconTrash size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Active rules */}
      <div className="card">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">Active rules</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            Evaluated every minute
          </span>
        </div>

        {loading ? <SkeletonCard rows={3} /> : rules.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.75rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <IconBell size={20} stroke={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <div>No alert rules configured yet.</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              Alert rules trigger notifications when pipelines fail, slow down, or go silent.
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => setShowRuleModal(true)} style={{ marginTop: 4 }}>
              <IconPlus size={13} /> Create first rule
            </button>
          </div>
        ) : (
          <table className="table" style={{ marginTop: '0.75rem' }}>
            <thead>
              <tr><th>Pipeline</th><th>Type</th><th>Trigger when</th><th>Channel</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id}>
                  <td style={{ fontWeight: 500, fontSize: 12 }}>{rule.pipeline_name || '—'}</td>
                  <td style={{ fontSize: 12 }}>{RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}</td>
                  <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{thresholdLabel(rule)}</td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {rule.channel_label
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {rule.channel_type === 'slack' ? <IconBrandSlack size={11} /> : <IconMail size={11} />}
                          {rule.channel_label}
                        </span>
                      : <span style={{ color: 'var(--color-text-tertiary)' }}>None</span>}
                  </td>
                  <td>
                    <span className={`badge ${rule.enabled ? 'badge-success' : 'badge-gray'}`}>
                      {rule.enabled ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleToggleRule(rule)}
                        title={rule.enabled ? 'Disable' : 'Enable'}
                      >
                        {rule.enabled
                          ? <IconToggleRight size={14} style={{ color: 'var(--color-blue)' }} />
                          : <IconToggleLeft size={14} />}
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleDeleteRule(rule)}
                        title="Delete"
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── New Rule Modal ───────────────────────────────────────────────────── */}
      {showRuleModal && (
        <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>New alert rule</div>
            <form onSubmit={handleSaveRule}>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  PIPELINE
                </label>
                <select
                  className="input"
                  value={ruleForm.pipeline_id}
                  onChange={e => setRuleForm(f => ({ ...f, pipeline_id: e.target.value }))}
                  required
                >
                  <option value="">— select pipeline —</option>
                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  RULE TYPE
                </label>
                <select
                  className="input"
                  value={ruleForm.rule_type}
                  onChange={e => setRuleForm(f => ({ ...f, rule_type: e.target.value }))}
                >
                  {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3 }}>
                  {RULE_DESCRIPTIONS[ruleForm.rule_type]}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    {ruleForm.rule_type === 'failure_rate'         ? 'THRESHOLD (%)'   :
                     ruleForm.rule_type === 'consecutive_failures' ? 'FAILURES (count)' :
                     ruleForm.rule_type === 'latency'              ? 'THRESHOLD (ms)'  : 'THRESHOLD'}
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    step={ruleForm.rule_type === 'failure_rate' ? '1' : '1'}
                    placeholder={ruleForm.rule_type === 'failure_rate' ? '50' : ruleForm.rule_type === 'latency' ? '2000' : '3'}
                    value={ruleForm.threshold}
                    onChange={e => setRuleForm(f => ({ ...f, threshold: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    WINDOW (minutes)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={ruleForm.window_minutes}
                    onChange={e => setRuleForm(f => ({ ...f, window_minutes: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {channels.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    NOTIFICATION CHANNEL (optional)
                  </label>
                  <select
                    className="input"
                    value={ruleForm.channel_id}
                    onChange={e => setRuleForm(f => ({ ...f, channel_id: e.target.value }))}
                  >
                    <option value="">— none —</option>
                    {channels.map(c => <option key={c.id} value={c.id}>{c.label} ({c.channel_type})</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-sm" onClick={() => setShowRuleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                  {saving ? <IconLoader2 size={12} className="spinner" /> : null}
                  Create rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Channel Modal ────────────────────────────────────────────────── */}
      {showChannelModal && (
        <div className="modal-overlay" onClick={() => setShowChannelModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>Add notification channel</div>
            <form onSubmit={handleSaveChannel}>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  CHANNEL TYPE
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['email', 'slack'].map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`btn btn-sm ${channelForm.channel_type === t ? 'btn-primary' : ''}`}
                      onClick={() => setChannelForm(f => ({ ...f, channel_type: t }))}
                      style={{ flex: 1 }}
                    >
                      {t === 'slack' ? <IconBrandSlack size={13} /> : <IconMail size={13} />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  LABEL
                </label>
                <input
                  className="input"
                  placeholder={channelForm.channel_type === 'slack' ? 'e.g. #alerts' : 'e.g. Team email'}
                  value={channelForm.label}
                  onChange={e => setChannelForm(f => ({ ...f, label: e.target.value }))}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  {channelForm.channel_type === 'email' ? 'EMAIL ADDRESS' : 'SLACK WEBHOOK URL'}
                </label>
                {channelForm.channel_type === 'email' ? (
                  <input
                    className="input"
                    type="email"
                    placeholder="alerts@company.com"
                    value={channelForm.config.address}
                    onChange={e => setChannelForm(f => ({ ...f, config: { ...f.config, address: e.target.value } }))}
                    required
                  />
                ) : (
                  <input
                    className="input"
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={channelForm.config.webhook_url}
                    onChange={e => setChannelForm(f => ({ ...f, config: { ...f.config, webhook_url: e.target.value } }))}
                    required
                  />
                )}
                {channelForm.channel_type === 'slack' && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                    Create a webhook at api.slack.com/messaging/webhooks
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-sm" onClick={() => setShowChannelModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                  {saving ? <IconLoader2 size={12} className="spinner" /> : null}
                  Add channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
