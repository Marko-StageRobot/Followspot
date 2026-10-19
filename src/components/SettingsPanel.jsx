import React, { useState, useEffect } from 'react';
import { getCachedLicense, setCachedLicense, validateLicense, deactivateLicense } from '../license';
import WhatsNew from './WhatsNew';
const { ipcRenderer, shell } = window.require('electron');

// Home → Settings: Account, General (updates), Help & Feedback, About.
// Laid out like macOS System Settings: titled groups of rows, label on the left, value or control on the right.

const C = {
  window: '#1E1E1E', group: 'rgba(255,255,255,0.05)', separator: 'rgba(255,255,255,0.10)',
  label1: '#FFFFFF', label2: 'rgba(255,255,255,0.55)', label3: 'rgba(255,255,255,0.25)',
  accent: '#0A84FF', accentText: '#409CFF', red: '#FF453A', orange: '#FF9F0A', green: '#30D158',
};

const PLAN_NAMES = { standard: 'Standard', student: 'Student', comped: 'Complimentary', production: 'Production', education: 'Education', beta: 'Beta' };
const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function planText(lic) {
  if (!lic?.plan) return '—';
  const name = PLAN_NAMES[lic.plan] || lic.plan.charAt(0).toUpperCase() + lic.plan.slice(1);
  const interval = lic.billing_interval === 'year' ? 'Yearly' : lic.billing_interval === 'month' ? 'Monthly' : null;
  return interval ? `${name} · ${interval}` : name;
}

// The account's state in plain words, colored when it needs attention
function statusText(lic) {
  if (!lic) return { text: '—' };
  if (lic.payment_failed) return { text: 'Payment failed: update your card', color: C.red };
  if (lic.ends_at) return { text: `Canceled: works until ${formatDate(lic.ends_at)}`, color: C.orange };
  if (lic.status === 'grace_period') return { text: `Grace period: ${lic.grace_days_remaining ?? 'a few'} days left`, color: C.orange };
  if (lic.renews_at) return { text: `Renews ${formatDate(lic.renews_at)}` };
  if (lic.status === 'comped') return { text: 'Active · no charge' };
  if (lic.status === 'active') return { text: 'Active' };
  return { text: lic.status || '—' };
}

// "SP-ABCD-EFGH-IJKL-7F3K" → "SP-••••-••••-••••-7F3K"
const maskKey = (key) => {
  if (!key) return '—';
  const parts = key.split('-');
  return parts.map((p, i) => (i === 0 || i === parts.length - 1) ? p : '••••').join('-');
};

function updateText(u) {
  if (!u) return '';
  switch (u.state) {
    case 'dev': return 'Only the installed app checks';
    case 'checking': return 'Checking for updates…';
    case 'downloading': return 'Downloading an update…';
    case 'ready': return `SpotPlot ${u.version || ''} is ready to install`.replace('  ', ' ');
    case 'up-to-date': return 'SpotPlot is up to date';
    case 'error': return 'Couldn’t check for updates';
    default: return u.auto ? 'Checks for updates automatically' : 'Automatic checks are off';
  }
}

const lastCheckedText = (iso) => {
  if (!iso) return 'Not checked yet';
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `Last checked ${today ? 'today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${time}`;
};

function Group({ title, children, footer }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: C.label1, margin: '0 4px 8px' }}>{title}</div>
      <div style={{ background: C.group, borderRadius: '10px', overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <div key={i} style={{ borderTop: i ? `1px solid ${C.separator}` : 'none', margin: '0 12px' }}>{row}</div>
        ))}
      </div>
      {footer && <div style={{ fontSize: '11px', color: C.label2, margin: '6px 4px 0', lineHeight: '14px' }}>{footer}</div>}
    </div>
  );
}

function Row({ label, children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', minHeight: '36px', padding: '6px 0' }}>
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: C.label1 }}>{label}</div>
        {hint && <div style={{ fontSize: '11px', color: C.label2, marginTop: '2px' }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 0, maxWidth: '62%', textAlign: 'right' }}>{children}</div>
    </div>
  );
}

const Value = ({ children, color, mono }) => (
  <div style={{ fontSize: '13px', color: color || C.label2, fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</div>
);

function Button({ children, onClick, disabled, kind }) {
  const filled = kind === 'primary' || kind === 'danger-filled';
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ height: '24px', padding: '0 10px', borderRadius: '6px', border: 'none', flexShrink: 0,
        background: kind === 'primary' ? C.accent : kind === 'danger-filled' ? C.red : 'rgba(255,255,255,0.08)',
        color: filled ? '#FFFFFF' : kind === 'danger' ? C.red : C.label1,
        fontSize: '13px', fontWeight: '500', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'inherit' }}>
      {children}
    </button>
  );
}

// A row that's a whole button: label on the left, ↗ for links that leave the app
function LinkRow({ label, onClick, external }) {
  return (
    <div onClick={onClick} role="button"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '36px', cursor: 'pointer', fontSize: '13px', color: C.label1 }}
      onMouseEnter={e => { e.currentTarget.style.color = C.accentText; }}
      onMouseLeave={e => { e.currentTarget.style.color = C.label1; }}>
      <span>{label}</span>
      <span style={{ color: C.label3, fontSize: '12px' }}>{external ? '↗' : '›'}</span>
    </div>
  );
}

function Switch({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} role="switch" aria-checked={on}
      style={{ width: '44px', height: '20px', borderRadius: '10px', background: on ? C.accent : 'rgba(255,255,255,0.10)', position: 'relative', flexShrink: 0, cursor: 'pointer', transition: 'background 0.15s' }}>
      <div style={{ position: 'absolute', top: '2px', left: on ? '16px' : '2px', width: '26px', height: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.85)', boxShadow: '0 3px 8px rgba(0,0,0,0.15)', transition: 'left 0.15s' }} />
    </div>
  );
}

export default function SettingsPanel({ onClose }) {
  const [lic, setLic] = useState(getCachedLicense());
  const [copied, setCopied] = useState(false);
  const [updates, setUpdates] = useState(() => ipcRenderer.sendSync('updates-get'));
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const version = ipcRenderer.sendSync('get-device-info')?.appVersion || '';

  // Refresh the account details each time Settings opens
  useEffect(() => {
    const cached = getCachedLicense();
    if (!cached?.license_key) return;
    validateLicense(cached.license_key).then(result => {
      if (result?.valid) {
        const fresh = { ...getCachedLicense(), ...result, valid: true, cached_at: new Date().toISOString() };
        setCachedLicense(fresh);
        setLic(fresh);
      }
    });
  }, []);

  useEffect(() => {
    const onStatus = (_e, status) => setUpdates({ ...status });
    ipcRenderer.on('updates-status', onStatus);
    const onKey = (e) => {
      if (e.key !== 'Escape' || confirmDeactivate) return;
      if (showWhatsNew) setShowWhatsNew(false); else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => { ipcRenderer.removeListener('updates-status', onStatus); window.removeEventListener('keydown', onKey); };
  }, [confirmDeactivate, showWhatsNew]);

  const copyKey = () => {
    if (!lic?.license_key) return;
    navigator.clipboard.writeText(lic.license_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const deactivate = async () => {
    setDeactivating(true);
    setDeactivateError(null);
    const ok = await deactivateLicense(lic?.license_key);
    setDeactivating(false);
    if (!ok) {
      setDeactivateError('Couldn’t reach the license server. Check the internet connection and try again.');
      return;
    }
    localStorage.removeItem('spotplot_license');
    window.location.reload();
  };

  const status = statusText(lic);
  const busy = updates?.state === 'checking' || updates?.state === 'downloading';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ width: '380px', background: C.window, borderLeft: `1px solid ${C.separator}`, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ height: '52px', padding: '0 16px', borderBottom: `1px solid ${C.separator}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: '15px', fontWeight: '600', color: C.label1 }}>Settings</span>
          <Button onClick={onClose}>Done</Button>
        </div>

        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <Group title="Account">
            <Row label="Email"><Value>{lic?.email || '—'}</Value></Row>
            <Row label="Plan"><Value>{planText(lic)}</Value></Row>
            <Row label="Status"><Value color={status.color}>{status.text}</Value></Row>
            <Row label="License Key">
              <Value mono>{maskKey(lic?.license_key)}</Value>
              <Button onClick={copyKey} disabled={!lic?.license_key}>{copied ? 'Copied' : 'Copy'}</Button>
            </Row>
            <Row label="Subscription" hint={lic?.manage_url ? 'Change plan, update your card or cancel' : 'Available when subscriptions start'}>
              <Button onClick={() => shell.openExternal(lic.manage_url)} disabled={!lic?.manage_url}>Manage…</Button>
            </Row>
            <Row label="This Mac" hint="Take this Mac off your license to use SpotPlot on another one">
              <Button kind="danger" onClick={() => { setDeactivateError(null); setConfirmDeactivate(true); }} disabled={!lic?.license_key}>Deactivate…</Button>
            </Row>
          </Group>

          <Group title="Updates" footer={updates?.state !== 'dev' ? lastCheckedText(updates?.lastChecked) : null}>
            <Row label="Check for updates automatically">
              <Switch on={!!updates?.auto} onChange={on => setUpdates(ipcRenderer.sendSync('updates-set-auto', on))} />
            </Row>
            <Row label={updateText(updates)} hint={updates?.state === 'error' ? 'Check the internet connection and try again' : null}>
              {updates?.state === 'ready'
                ? <Button kind="primary" onClick={() => ipcRenderer.send('updates-install')}>Restart to Update</Button>
                : <Button onClick={() => ipcRenderer.send('updates-check-now')} disabled={busy || updates?.state === 'dev'}>Check Now</Button>}
            </Row>
          </Group>

          <Group title="Help & Feedback">
            <LinkRow label="Contact Support…" onClick={() => ipcRenderer.send('email-support', 'support')} />
            <LinkRow label="Send Feedback…" onClick={() => ipcRenderer.send('email-support', 'feedback')} />
            <LinkRow label="SpotPlot Manual" external onClick={() => shell.openExternal('https://spotplotapp.com/manual.html')} />
            <LinkRow label="spotplotapp.com" external onClick={() => shell.openExternal('https://spotplotapp.com')} />
          </Group>

          <Group title="About">
            <Row label="Version"><Value>{version}{/^0\./.test(version) ? ' (Beta)' : ''}</Value></Row>
            <LinkRow label="What’s New in This Version" onClick={() => setShowWhatsNew(true)} />
          </Group>

          <div style={{ fontSize: '11px', color: C.label3, textAlign: 'center', marginTop: '8px' }}>© {new Date().getFullYear()} The Wheeler Moon Group</div>
        </div>
      </div>

      {showWhatsNew && <WhatsNew version={version} onClose={() => setShowWhatsNew(false)} />}
      {confirmDeactivate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ width: '260px', background: '#2A2A2A', borderRadius: '16px', padding: '16px', boxShadow: '0 18px 48px rgba(0,0,0,0.45)', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.label1, marginBottom: '6px' }}>Deactivate this Mac?</div>
            <div style={{ fontSize: '13px', color: C.label1, lineHeight: '16px', marginBottom: '12px' }}>
              This Mac comes off your license, so you can use SpotPlot on another Mac. Your shows stay here. To use SpotPlot on this Mac again, enter your license key.
            </div>
            {deactivateError && <div style={{ fontSize: '11px', color: C.red, marginBottom: '10px', lineHeight: '14px' }}>{deactivateError}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmDeactivate(false)} disabled={deactivating}
                style={{ flex: 1, height: '28px', borderRadius: '14px', border: 'none', background: 'rgba(255,255,255,0.08)', color: C.label1, fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={deactivate} disabled={deactivating}
                style={{ flex: 1, height: '28px', borderRadius: '14px', border: 'none', background: C.red, color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: 'pointer', opacity: deactivating ? 0.5 : 1, fontFamily: 'inherit' }}>
                {deactivating ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
