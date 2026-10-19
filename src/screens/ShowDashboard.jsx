import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');
import AppHeader from '../components/AppHeader';
import ShowSettingsModal from './ShowSettingsModal';
import Tips from '../components/Tips';
import { TIPS } from '../tips';
const getImageSrc = (path) => {
  if (!path) return null;
  try {
    const fs = window.require('fs');
    const data = fs.readFileSync(path);
    const ext = path.split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch(e) { return null; }
};

export default function ShowDashboard({ show: initialShow, navigate }) {
  const [currentShow, setCurrentShow] = React.useState(initialShow);
  const show = currentShow;

  const reloadShow = () => {
    const updated = ipcRenderer.sendSync('db-get-show', initialShow.id);
    if (updated) setCurrentShow(updated);
  };
  const [stats, setStats] = useState({ cues: 0, scenes: 0, characters: 0, spots: [] });
  const [editing, setEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // false, or the settings tab to open
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const reloadStats = () => {
    const result = ipcRenderer.sendSync('db-get-show-stats', show.id);
    if (result) setStats(result);
  };

  useEffect(() => {
    reloadStats();
  }, [show.id]);

  // iPad Sync dots: how many iPads are connected to this show right now
  const [ipadsOnline, setIpadsOnline] = useState(0);
  useEffect(() => {
    const check = () => {
      const st = ipcRenderer.sendSync('ipad-sync-state', show.id);
      setIpadsOnline(st.devices.filter(d => d.online).length);
    };
    check();
    const timer = setInterval(check, 3000);
    return () => clearInterval(timer);
  }, [show.id]);
const startEdit = () => {
    setEditForm({
      title: show.title || '',
      theatre: show.theatre || '',
      producer: show.producer || '',
      designer: show.designer || '',
      associate_ld: show.associate_ld || '',
      assistant_ld: show.assistant_ld || '',
      production_electrician: show.production_electrician || '',
      programmer: show.programmer || '',
    });
    setEditing(true);
  };
    useEffect(() => {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.on('menu-export-show', () => {
      const result = ipcRenderer.sendSync('db-export-show', show.id);
      if (result.success) alert('Show exported successfully!');
      else if (!result.cancelled) alert('Export failed: ' + result.error);
    });
    return () => {
      ipcRenderer.removeAllListeners('menu-export-show');
    };
  }, []);

  const saveEdit = () => {
    setSaving(true);
    const result = ipcRenderer.sendSync('db-update-show', { showId: show.id, form: editForm });
    if (result.success) {
      Object.assign(show, editForm);
      setEditing(false);
    }
    setSaving(false);
  };

  const updateEdit = (field, value) => setEditForm(f => ({ ...f, [field]: value }));
  // Small white glyphs for the System Settings-style icon tiles
  const Glyph = ({ name }) => {
    const p = { fill: 'none', stroke: '#fff', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
    const icons = {
      list: <><path d="M8 6h10M8 12h10M8 18h10" {...p} /><circle cx="4.5" cy="6" r="1" fill="#fff" /><circle cx="4.5" cy="12" r="1" fill="#fff" /><circle cx="4.5" cy="18" r="1" fill="#fff" /></>,
      scenes: <><rect x="3.5" y="5" width="17" height="14" rx="2" {...p} /><path d="M3.5 9h17M8 5v4M13 5v4" {...p} /></>,
      person: <><circle cx="12" cy="8" r="3.5" {...p} /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" {...p} /></>,
      note: <><path d="M6 4h9l4 4v12H6z" {...p} /><path d="M9 12h7M9 16h5" {...p} /></>,
      print: <><path d="M7 9V4h10v5" {...p} /><rect x="3.5" y="9" width="17" height="8" rx="2" {...p} /><path d="M7 14h10v6H7z" {...p} /></>,
    };
    return <svg width="16" height="16" viewBox="0 0 24 24">{icons[name]}</svg>;
  };
  const navRows = [
    { label: 'Cue List', icon: 'list', tint: '#0A84FF', dest: 'cue-list', detail: `${stats.cues} cues` },
    { label: 'Scenes', icon: 'scenes', tint: '#30D158', dest: 'scenes', detail: `${stats.scenes} scenes` },
    { label: 'Characters', icon: 'person', tint: '#FF9F0A', dest: 'characters', detail: `${stats.characters} characters` },
    { label: 'Spot Notes', icon: 'note', tint: '#FFD60A', dest: 'spot-notes', detail: '' },
    { label: 'Print', icon: 'print', tint: '#8E8E93', dest: 'print', detail: '' },
  ];
  // Apple grouped list pieces
  const sectionLabel = { fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.55)', margin: '0 0 6px 14px' };
  const group = { background: '#2A2A2A', borderRadius: '10px', overflow: 'hidden', marginBottom: '28px' };
  const row = (i) => ({ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '44px', padding: '0 14px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1E1E1E' }}>
           <AppHeader title={show.title} onBack={() => navigate('home')} backLabel="All shows">
        <div style={{ flex: 1 }} />
        <button data-tour="export-show" onClick={() => {
          const result = ipcRenderer.sendSync('db-export-show', show.id);
          if (result.success) alert(`Show exported successfully!`);
          else if (!result.cancelled) alert('Export failed: ' + result.error);
        }} style={{ height: '28px', padding: '0 12px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          ↑ Export
        </button>
        <button data-tour="open-cues" onClick={() => navigate('cue-list', show)} style={{ height: '28px', padding: '0 14px', background: '#0A84FF', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          Open Cue List
        </button>
      </AppHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: '36px 24px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>

          <div style={{ marginBottom: '28px' }}>
            {editing ? (
              <div style={{ background: '#2A2A2A', border: '1px solid #0A84FF', borderRadius: '12px', padding: '20px', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#409CFF', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Edit show info</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', marginBottom: '4px' }}>Show title</div>
                    <input value={editForm.title} onChange={e => updateEdit('title', e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFFFFF', padding: '7px 10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', marginBottom: '4px' }}>Theatre</div>
                    <input value={editForm.theatre} onChange={e => updateEdit('theatre', e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFFFFF', padding: '7px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', marginBottom: '4px' }}>Producer</div>
                    <input value={editForm.producer} onChange={e => updateEdit('producer', e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFFFFF', padding: '7px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lighting team</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  {[
                    ['designer', 'Lighting designer'],
                    ['associate_ld', 'Associate LD'],
                    ['assistant_ld', 'Assistant LD'],
                    ['production_electrician', 'Production electrician'],
                    ['programmer', 'Programmer'],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', marginBottom: '4px' }}>{label}</div>
                      <input value={editForm[field]} onChange={e => updateEdit(field, e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFFFFF', padding: '7px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditing(false)} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveEdit} disabled={saving} style={{ padding: '7px 14px', background: '#0A84FF', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
                <div style={{ gridColumn: '1 / -1', marginBottom: '4px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', marginBottom: '6px' }}>Show logo (optional)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#0A84FF'; }}
                      onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                      onDrop={e => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        const file = e.dataTransfer.files[0];
                        if (file && file.type.startsWith('image/')) {
                          const result = ipcRenderer.sendSync('dialog-open-image');
                          if (result) updateEdit('logo_path', result);
                        }
                      }}
                      onClick={() => {
                        const result = ipcRenderer.sendSync('dialog-open-image');
                        if (result) updateEdit('logo_path', result);
                      }}
                      style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
                      {editForm.logo_path ? (
                        <img src={getImageSrc(editForm.logo_path)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '8px' }}>
                          <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.28)' }}>+</div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)' }}>Drop or click</div>
                        </div>
                      )}
                    </div>
                    {editForm.logo_path && (
                      <button onClick={() => updateEdit('logo_path', '')}
                        style={{ padding: '5px 10px', background: 'rgba(255,69,58,0.14)', border: 'none', borderRadius: '6px', color: '#FF453A', fontSize: '11px', cursor: 'pointer' }}>
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                {show.logo_path && getImageSrc(show.logo_path) && (
                  <img src={getImageSrc(show.logo_path)} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '14px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '26px', fontWeight: '700', color: '#FFFFFF', lineHeight: 1.15 }}>{show.title}</div>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginTop: '3px' }}>{show.theatre}{show.producer ? ` · ${show.producer}` : ''}</div>
                </div>
                {/* iPad Sync: one green dot per connected iPad (past 6, one dot and the number); grey when none */}
                <button onClick={() => setShowSettings('ipad-sync')} title={ipadsOnline ? `${ipadsOnline} iPad${ipadsOnline === 1 ? '' : 's'} connected` : 'iPad Sync'}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: 'pointer', flexShrink: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    {Array.from({ length: ipadsOnline > 6 ? 1 : Math.max(ipadsOnline, 1) }).map((_, i) => (
                      <span key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: ipadsOnline ? '#30D158' : 'rgba(255,255,255,0.35)' }} />
                    ))}
                    {ipadsOnline > 6 && <span style={{ fontSize: '12px', fontWeight: '600', color: '#30D158', marginLeft: '2px', fontVariantNumeric: 'tabular-nums' }}>{ipadsOnline}</span>}
                  </span>
                  iPad Sync
                </button>
                <button data-tour="show-settings" onClick={() => setShowSettings('show-info')}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '28px', padding: '0 12px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: 'pointer', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px' }}>⚙︎</span> Show Settings
                </button>
              </div>
            )}
          </div>

          <div data-tour="show-nav" style={group}>
            {navRows.map((r, i) => (
              <div key={r.dest} onClick={() => navigate(r.dest, show)}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                style={{ ...row(i), cursor: 'pointer' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: r.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Glyph name={r.icon} />
                </div>
                <div style={{ flex: 1, fontSize: '14px', color: '#FFFFFF' }}>{r.label}</div>
                {r.detail && <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontVariantNumeric: 'tabular-nums' }}>{r.detail}</div>}
                <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.28)', lineHeight: 1, marginTop: '-2px' }}>›</div>
              </div>
            ))}
          </div>

          <div style={sectionLabel}>Spots</div>
          <div style={group}>
            {/* Always in spot-number order here, whatever order is set in Show Settings → Spot Order */}
            {[...stats.spots].sort((a, b) => a.spot_number - b.spot_number).map((spot, i) => (
              <div key={spot.id} style={row(i)}>
                <div style={{ width: '52px', fontSize: '13px', fontWeight: '600', color: '#409CFF', flexShrink: 0 }}>Spot {spot.spot_number}</div>
                <div style={{ flex: 1, fontSize: '14px', color: spot.operator_name ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }}>{spot.operator_name || 'No operator'}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', textAlign: 'right' }}>
                  {[spot.location, spot.fixture_type].filter(Boolean).join(' · ') || 'No location or fixture'}
                </div>
              </div>
            ))}
          </div>

          {[show.designer, show.associate_ld, show.assistant_ld, show.production_electrician, show.programmer].some(Boolean) && (
            <>
              <div style={sectionLabel}>Lighting Team</div>
              <div style={group}>
                {[
                  ['Lighting Designer', show.designer],
                  ['Associate LD', show.associate_ld],
                  ['Assistant LD', show.assistant_ld],
                  ['Production Electrician', show.production_electrician],
                  ['Programmer', show.programmer],
                ].filter(([, val]) => val).map(([label, val], i) => (
                  <div key={label} style={row(i)}>
                    <div style={{ flex: 1, fontSize: '14px', color: '#FFFFFF' }}>{label}</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>{val}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {!showSettings && <Tips steps={TIPS.dashboard} watch={editing} />}
      {showSettings && (
        <ShowSettingsModal
          show={show}
          initialSection={showSettings}
          onClose={() => { setShowSettings(false); reloadStats(); }}
          onShowUpdate={(updated) => { setCurrentShow(updated); }}
        />
      )}
    </div>
  );
}