import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

// iPad Sync for this show: its own switch and 6-digit code. An iPad that enters this show's code gets
// this show only. Lists the iPads paired with this show and which are online (they report every few seconds).
export default function IpadSyncPanel({ show }) {
  const [state, setState] = useState(() => ipcRenderer.sendSync('ipad-sync-state', show.id));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setState(ipcRenderer.sendSync('ipad-sync-state', show.id)), 2000);
    return () => clearInterval(timer);
  }, [show.id]);

  const toggle = async () => {
    setBusy(true);
    setState(await ipcRenderer.invoke('ipad-sync-set-enabled', { showId: show.id, enabled: !state.enabled }));
    setBusy(false);
  };

  const sectionLabel = { fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.55)', margin: '0 0 6px 14px' };
  const group = { background: '#2A2A2A', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' };
  const row = (i) => ({ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '44px', padding: '8px 14px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' });
  const hint = { fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: '17px' };
  const smallButton = { height: '24px', padding: '0 10px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '12px', fontWeight: '500', cursor: 'pointer' };

  const roleText = (d) => {
    if (!d.role) return 'Choosing a role';
    if (d.role === 'caller') return `Caller${d.spots?.length ? ' (Spots ' + d.spots.join(', ') + ')' : ''}`;
    return `Spot ${d.spots?.[0] ?? '?'}`;
  };
  const lastSeenText = (d) => {
    if (!d.lastSeen) return 'Not connected';
    const t = new Date(d.lastSeen);
    return 'Last seen ' + t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '16px', lineHeight: '18px' }}>
        Send this show to your spot operators' iPads over the local network. No internet needed: the Mac and iPads just need to be on the same network. Each show has its own code, so iPads only ever see the shows you give them the code for.
      </div>

      <div style={group}>
        <div style={row(0)}>
          <div style={{ flex: 1 }} onClick={!busy ? toggle : undefined}>
            <div style={{ fontSize: '13px', color: '#FFFFFF', cursor: 'pointer' }}>Let iPads connect to this show</div>
            <div style={hint}>
              {state.enabled
                ? (state.running ? `iPads see this Mac as "SpotPlot on ${state.name}".` : 'Starting…')
                : 'Turn on to pair iPads and send them this show. Off hides this show from iPads, even ones paired before.'}
            </div>
          </div>
          <div onClick={!busy ? toggle : undefined} role="switch" aria-checked={state.enabled}
            style={{ width: '54px', height: '24px', borderRadius: '12px', background: state.enabled ? '#0A84FF' : 'rgba(255,255,255,0.10)', position: 'relative', cursor: 'pointer', flexShrink: 0, opacity: busy ? 0.5 : 1, transition: 'background 0.15s' }}>
            <div style={{ position: 'absolute', top: '2px', left: state.enabled ? '20px' : '2px', width: '32px', height: '20px', borderRadius: '10px', background: 'rgba(255,255,255,0.85)', boxShadow: '0 3px 8px rgba(0,0,0,0.15)', transition: 'left 0.15s' }} />
          </div>
        </div>
      </div>

      {state.enabled && state.running && (
        <>
          <div style={sectionLabel}>Pair an iPad</div>
          <div style={group}>
            <div style={{ ...row(0), alignItems: 'flex-start', padding: '16px 14px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#FFFFFF', marginBottom: '4px' }}>In SpotPlot for iPad, tap Add Show, choose this Mac and enter this show's code:</div>
                <div style={{ fontSize: '34px', fontWeight: '700', letterSpacing: '0.18em', color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', margin: '4px 0 8px' }}>
                  {state.code.slice(0, 3)} {state.code.slice(3)}
                </div>
                <div style={hint}>
                  Can't find this Mac on the iPad? Enter its address instead:{' '}
                  <span style={{ color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
                    {state.addresses.length ? state.addresses.map(a => `${a}:${state.port}`).join(' or ') : 'not connected to a network'}
                  </span>
                </div>
              </div>
              <button onClick={() => setState(ipcRenderer.sendSync('ipad-sync-new-code', show.id))} title="A new code for new iPads. iPads already paired stay paired." style={smallButton}>New code</button>
            </div>
          </div>
        </>
      )}

      <div style={sectionLabel}>iPads with this show</div>
      <div style={group}>
        {state.devices.length === 0 ? (
          <div style={{ ...row(0), ...hint, fontSize: '13px' }}>No iPads paired with this show yet.</div>
        ) : state.devices.map((d, i) => (
          <div key={d.id} style={row(i)}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.online ? '#30D158' : 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: '#FFFFFF' }}>{d.name}</div>
              <div style={hint}>{d.online ? roleText(d) : lastSeenText(d)}</div>
            </div>
            <button onClick={() => { if (window.confirm(`Forget "${d.name}"? It will need the pairing code to connect again.`)) setState(ipcRenderer.sendSync('ipad-sync-forget', { showId: show.id, id: d.id })); }}
              style={{ ...smallButton, color: '#FF453A', background: 'rgba(255,69,58,0.14)' }}>Forget</button>
          </div>
        ))}
      </div>
    </div>
  );
}
