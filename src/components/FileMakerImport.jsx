import React, { useState } from 'react';
const { ipcRenderer } = window.require('electron');

// Import from FileMaker: what's in the file, then a menu for each action or iris size in the file that
// isn't exactly one of SpotPlot's (pick the SpotPlot one it means, or make it a custom one).
// Exact matches, including the file's own spellings like "Fade in Plce", go in without asking.

const C = {
  panel: '#2A2A2A', group: 'rgba(255,255,255,0.05)', separator: 'rgba(255,255,255,0.10)',
  label1: '#FFFFFF', label2: 'rgba(255,255,255,0.55)', label3: 'rgba(255,255,255,0.25)', accent: '#0A84FF', orange: '#FF9F0A',
};
const CUSTOM = '__custom__';

function MatchList({ title, hint, items, options, customLabel, value, onChange }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: C.label1, margin: '0 4px 2px' }}>{title}</div>
      <div style={{ fontSize: '11px', color: C.label2, margin: '0 4px 8px', lineHeight: '14px' }}>{hint}</div>
      <div style={{ background: C.group, borderRadius: '10px' }}>
        {items.map((item, i) => (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', minHeight: '36px', margin: '0 12px', borderTop: i ? `1px solid ${C.separator}` : 'none' }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '13px', color: C.label1 }}>{item.name}</span>
              <span style={{ fontSize: '11px', color: C.label2, marginLeft: '6px' }}>{item.count} cue{item.count === 1 ? '' : 's'}</span>
            </div>
            <select value={value[item.name]} onChange={e => onChange(item.name, e.target.value)}
              style={{ height: '24px', maxWidth: '220px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', color: C.label1, fontSize: '13px', padding: '0 6px', outline: 'none', fontFamily: 'inherit' }}>
              <option value={CUSTOM}>{customLabel(item.name)}</option>
              <option disabled>──────────</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FileMakerImport({ summary, onCancel, onImported }) {
  const start = (items) => Object.fromEntries(items.map(i => [i.name, i.suggestion || CUSTOM]));
  const [actions, setActions] = useState(() => start(summary.actions));
  const [sizes, setSizes] = useState(() => start(summary.sizes));
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const doImport = () => {
    setImporting(true);
    setError(null);
    const toChoices = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v === CUSTOM ? { custom: true } : { to: v }]));
    // Let the button show "Importing…" before the (synchronous) import starts
    setTimeout(() => {
      const result = ipcRenderer.sendSync('filemaker-import', { actions: toChoices(actions), sizes: toChoices(sizes) });
      setImporting(false);
      if (result.success) onImported(result.showId);
      else setError(result.error || 'The import didn’t work.');
    }, 30);
  };

  const s = summary;
  const facts = [
    `${s.numSpots} spot${s.numSpots === 1 ? '' : 's'}`, `${s.cueCount} cues`, `${s.sceneCount} scenes`, `${s.characterCount} characters`,
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: C.panel, borderRadius: '16px', boxShadow: '0 18px 48px rgba(0,0,0,0.45)' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.separator}` }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: C.label1 }}>Import from FileMaker</div>
          <div style={{ fontSize: '13px', color: C.label2, marginTop: '2px' }}>
            <span style={{ color: C.label1 }}>{s.title}</span>{s.venue ? ` · ${s.venue}` : ''} · {facts.join(' · ')}
          </div>
        </div>

        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          {!s.sceneFileFound && (
            <div style={{ fontSize: '12px', color: C.orange, lineHeight: '16px', marginBottom: '14px' }}>
              SceneList.fmp12 wasn’t in the same folder, so scenes come from the scene names on the cues (no act breaks). To bring the scene list, put it next to FS_Track.fmp12 and import again.
            </div>
          )}
          <MatchList title="Actions" items={s.actions} value={actions}
            hint="These actions in the file aren’t exactly one of SpotPlot’s. Choose the SpotPlot action each one means, or keep it as a custom action (you can give it a symbol later in Show Settings → Custom Actions)."
            options={s.spotplotActions} customLabel={name => `New custom action “${name}”`}
            onChange={(name, v) => setActions(a => ({ ...a, [name]: v }))} />
          <MatchList title="Iris sizes" items={s.sizes} value={sizes}
            hint="These iris sizes in the file aren’t one of SpotPlot’s. Choose the size each one means, or keep it as a custom size for this show."
            options={s.spotplotSizes} customLabel={name => `New custom size “${name}”`}
            onChange={(name, v) => setSizes(z => ({ ...z, [name]: v }))} />
          {!s.actions.length && !s.sizes.length && (
            <div style={{ fontSize: '13px', color: C.label2 }}>Every action and iris size matches SpotPlot’s. Ready to import.</div>
          )}
          <div style={{ fontSize: '11px', color: C.label3, lineHeight: '14px', marginTop: '4px' }}>
            Your FileMaker file isn’t changed. Logos, photos and action symbol pictures don’t come across; add them in SpotPlot.
          </div>
          {error && <div style={{ fontSize: '12px', color: '#FF453A', marginTop: '10px' }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.separator}`, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onCancel} disabled={importing}
            style={{ height: '28px', padding: '0 16px', borderRadius: '14px', border: 'none', background: 'rgba(255,255,255,0.08)', color: C.label1, fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={doImport} disabled={importing}
            style={{ height: '28px', padding: '0 16px', borderRadius: '14px', border: 'none', background: C.accent, color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: 'pointer', opacity: importing ? 0.5 : 1, fontFamily: 'inherit' }}>
            {importing ? 'Importing…' : 'Import Show'}
          </button>
        </div>
      </div>
    </div>
  );
}
