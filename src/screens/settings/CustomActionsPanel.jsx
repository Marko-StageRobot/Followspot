import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

const DEFAULT_ACTIONS = [
  { name: 'Pick Up', color: '#30D158' },
  { name: 'Increase', color: '#30D158' },
  { name: 'Decrease', color: '#FF453A' },
  { name: 'Fade Out', color: '#FF453A' },
  { name: 'Fade In Place', color: '#FF453A' },
  { name: 'Bump Up', color: '#30D158' },
  { name: 'Bump Out', color: '#FF453A' },
  { name: 'Swap To', color: '#409CFF' },
  { name: 'Slide To', color: '#409CFF' },
  { name: 'Stay With', color: '#409CFF' },
  { name: 'Iris In', color: '#409CFF' },
  { name: 'Iris Out', color: '#409CFF' },
  { name: 'Iris/Fade Up', color: '#409CFF' },
  { name: 'Iris/Fade Down', color: '#409CFF' },
  { name: 'Iris/Fade Out', color: '#409CFF' },
  { name: 'Up & Out', color: '#30D158' },
  { name: 'Dump & Restore', color: '#30D158' },
  { name: 'Bump Color', color: '#FF9F0A' },
  { name: 'Roll Color', color: '#FF9F0A' },
  { name: 'Ballyhoo', color: '#FF9F0A' },
  { name: 'Off', color: 'rgba(255,255,255,0.28)' },
  { name: 'Tracked', color: 'rgba(255,255,255,0.45)' },
];

function ActionIcon({ action, size = 28 }) {
  const s = size;
  switch (action) {
    case 'Pick Up': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,4 24,20 8,20" fill="#30D158"/><polygon points="16,14 22,26 10,26" fill="#6BD58A" opacity="0.5"/></svg>;
    case 'Increase': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,5 23,18 9,18" fill="#30D158"/></svg>;
    case 'Decrease': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,27 23,14 9,14" fill="#FF453A"/></svg>;
    case 'Fade Out': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,28 24,12 8,12" fill="#FF453A"/><polygon points="16,18 22,6 10,6" fill="#FF6961" opacity="0.5"/></svg>;
    case 'Fade In Place': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#FF453A" strokeWidth="2"/><polygon points="16,27 23,14 9,14" fill="#FF453A"/></svg>;
    case 'Bump Up': return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="8" y="10" width="16" height="3" rx="1.5" fill="#30D158"/><rect x="10" y="15" width="12" height="3" rx="1.5" fill="#30D158" opacity="0.6"/><rect x="12" y="20" width="8" height="3" rx="1.5" fill="#30D158" opacity="0.3"/></svg>;
    case 'Bump Out': return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="8" y="19" width="16" height="3" rx="1.5" fill="#FF453A"/><rect x="10" y="14" width="12" height="3" rx="1.5" fill="#FF453A" opacity="0.6"/><rect x="12" y="9" width="8" height="3" rx="1.5" fill="#FF453A" opacity="0.3"/></svg>;
    case 'Swap To': return <svg width={s} height={s} viewBox="0 0 32 32"><path d="M10 10 C10 6 22 6 22 10 L22 16 C22 20 16 24 16 24 C16 24 10 20 10 16 Z" fill="none" stroke="#64D2FF" strokeWidth="2"/><path d="M20 20 L26 24 L22 26 L20 20Z" fill="#64D2FF"/></svg>;
    case 'Slide To': return <svg width={s} height={s} viewBox="0 0 32 32"><line x1="6" y1="16" x2="26" y2="16" stroke="#64D2FF" strokeWidth="2.5" strokeLinecap="round"/><polygon points="22,10 30,16 22,22" fill="#64D2FF"/><polygon points="10,10 2,16 10,22" fill="#64D2FF"/></svg>;
    case 'Stay With': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="9" fill="#D9F3FF" stroke="#64D2FF" strokeWidth="1.5"/><circle cx="12" cy="16" r="3" fill="#64D2FF"/><circle cx="20" cy="16" r="3" fill="#64D2FF"/></svg>;
    case 'Iris In': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#5E5CE6" strokeWidth="2"/><line x1="8" y1="16" x2="24" y2="16" stroke="#5E5CE6" strokeWidth="2" strokeLinecap="round"/><polygon points="10,12 6,16 10,20" fill="#5E5CE6"/><polygon points="22,12 26,16 22,20" fill="#5E5CE6"/></svg>;
    case 'Iris Out': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#5E5CE6" strokeWidth="2"/><line x1="8" y1="16" x2="24" y2="16" stroke="#5E5CE6" strokeWidth="2" strokeLinecap="round"/><polygon points="6,12 10,16 6,20" fill="#5E5CE6"/><polygon points="26,12 22,16 26,20" fill="#5E5CE6"/></svg>;
    case 'Iris/Fade Up': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="18" r="9" fill="none" stroke="#5E5CE6" strokeWidth="2"/><polygon points="16,4 22,14 10,14" fill="#30D158"/></svg>;
    case 'Iris/Fade Down': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="14" r="9" fill="none" stroke="#5E5CE6" strokeWidth="2"/><polygon points="16,28 22,18 10,18" fill="#FF453A"/></svg>;
    case 'Iris/Fade Out': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="9" fill="none" stroke="#5E5CE6" strokeWidth="2"/><line x1="9" y1="16" x2="23" y2="16" stroke="#FF453A" strokeWidth="2"/><polygon points="11,12 7,16 11,20" fill="#FF453A"/><polygon points="21,12 25,16 21,20" fill="#FF453A"/></svg>;
    case 'Up & Out': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,4 22,14 10,14" fill="#30D158"/><polygon points="16,28 22,18 10,18" fill="#FF453A"/></svg>;
    case 'Dump & Restore': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="10,4 22,4 16,14" fill="#FF453A"/><polygon points="16,18 22,28 10,28" fill="#30D158"/></svg>;
    case 'Bump Color': return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="9" y="8" width="14" height="16" rx="2" fill="none" stroke="#FF9F0A" strokeWidth="1.5"/><rect x="12" y="11" width="3" height="10" fill="#6BD58A"/><rect x="16" y="11" width="3" height="10" fill="#FF6961"/></svg>;
    case 'Roll Color': return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="9" y="8" width="14" height="16" rx="2" fill="none" stroke="#FF9F0A" strokeWidth="1.5"/><rect x="9" y="8" width="3.5" height="16" rx="1" fill="#FF6961"/><rect x="12.5" y="8" width="3.5" height="16" fill="#FFB340"/><rect x="16" y="8" width="3.5" height="16" fill="#6BD58A"/><rect x="19.5" y="8" width="3.5" height="16" rx="1" fill="#64D2FF"/></svg>;
    case 'Ballyhoo': return <svg width={s} height={s} viewBox="0 0 32 32"><path d="M8 16 C8 10 12 6 16 6 C20 6 24 10 24 16 C24 22 20 26 16 26 C12 26 8 22 8 16 Z" fill="none" stroke="#FF9F0A" strokeWidth="2.5"/><path d="M16 6 C16 6 20 16 16 26" fill="none" stroke="#FF9F0A" strokeWidth="2"/><path d="M16 6 C16 6 12 16 16 26" fill="none" stroke="#FF9F0A" strokeWidth="2"/></svg>;
    case 'Off': return <svg width={s} height={s} viewBox="0 0 32 32"><line x1="8" y1="8" x2="24" y2="24" stroke="#555" strokeWidth="2.5" strokeLinecap="round"/><line x1="24" y1="8" x2="8" y2="24" stroke="#555" strokeWidth="2.5" strokeLinecap="round"/></svg>;
    case 'Tracked': return <svg width={s} height={s} viewBox="0 0 32 32"><line x1="6" y1="16" x2="26" y2="16" stroke="#555" strokeWidth="2.5" strokeLinecap="round"/><polygon points="20,10 26,16 20,22" fill="#555"/></svg>;
    default: return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="#333"/></svg>;
  }
}

export default function CustomActionsPanel({ show }) {
  const [customActions, setCustomActions] = useState([]);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');

  useEffect(() => {
    const updated = ipcRenderer.sendSync('db-get-show', show.id);
    const actions = updated?.custom_actions ? JSON.parse(updated.custom_actions) : [];
    setCustomActions(actions);
  }, []);

  const save = (actions) => {
    ipcRenderer.sendSync('db-update-show', { showId: show.id, custom_actions: JSON.stringify(actions) });
  };

  const addAction = () => {
    if (!newName.trim()) return;
    if (DEFAULT_ACTIONS.find(a => a.name === newName.trim())) return;
    const updated = [...customActions, { name: newName.trim(), color: 'rgba(255,255,255,0.62)', icon: newIcon || null }];
    setCustomActions(updated);
    save(updated);
    setNewName('');
    setNewIcon('');
  };

  const deleteAction = (index) => {
    const updated = customActions.filter((_, i) => i !== index);
    setCustomActions(updated);
    save(updated);
  };

  const chooseIcon = () => {
    const result = ipcRenderer.sendSync('dialog-open-image');
    if (result) setNewIcon(result);
  };

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

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
    color: '#FFFFFF', padding: '7px 10px', fontSize: '13px', outline: 'none',
  };

  return (
    <div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.52)', marginBottom: '16px' }}>
        Default actions cannot be deleted. Add custom actions specific to this show.
      </div>

      <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Default actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginBottom: '24px' }}>
        {DEFAULT_ACTIONS.map(a => (
          <div key={a.name} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <ActionIcon action={a.name} size={28} />
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', textAlign: 'center', lineHeight: 1.2 }}>{a.name}</div>
          </div>
        ))}
      </div>

      {customActions.length > 0 && (
        <>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custom actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginBottom: '24px' }}>
            {customActions.map((a, i) => (
              <div key={i} style={{ background: 'rgba(10,132,255,0.16)', border: '1px solid #0A84FF', borderRadius: '8px', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative' }}>
                <button onClick={() => deleteAction(i)}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', color: '#FF453A', fontSize: '14px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                {a.icon && getImageSrc(a.icon) ? (
                  <img src={getImageSrc(a.icon)} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                ) : (
                  <svg width="28" height="28" viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="#5E5CE6"/></svg>
                )}
                <div style={{ fontSize: '11px', color: '#FFFFFF', textAlign: 'center', lineHeight: 1.2 }}>{a.name}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', fontWeight: '600' }}>Add custom action</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', marginBottom: '4px' }}>Action name</div>
            <input style={{ ...inputStyle, width: '100%' }} value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAction()}
              placeholder="e.g. Tracking Iris" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', marginBottom: '4px' }}>Icon (optional)</div>
            <div onClick={chooseIcon} style={{ width: '38px', height: '38px', background: '#2A2A2A', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
              {newIcon && getImageSrc(newIcon) ? (
                <img src={getImageSrc(newIcon)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.28)' }}>+</span>
              )}
            </div>
          </div>
          <button onClick={addAction}
            style={{ padding: '7px 16px', background: '#0A84FF', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}