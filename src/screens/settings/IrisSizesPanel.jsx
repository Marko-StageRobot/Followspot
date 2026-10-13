import React, { useState, useRef } from 'react';
import { irisSizeList, DEFAULT_IRIS_SIZES } from '../../irisSizes';
const { ipcRenderer } = window.require('electron');

// The show's iris sizes, in the order they appear on the cue list. Every size can be renamed and
// moved; the five defaults can't be deleted. Renaming a size's full name renames it in every cue too.
export default function IrisSizesPanel({ show }) {
  const load = () => irisSizeList(ipcRenderer.sendSync('db-get-show', show.id)?.iris_sizes);
  const [sizes, setSizes] = useState(load);
  const saved = useRef(sizes); // what's stored, to tell what a rename changed
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [message, setMessage] = useState('');

  const save = (list) => {
    ipcRenderer.sendSync('db-update-show', { showId: show.id, iris_sizes: JSON.stringify(list) });
    saved.current = list;
    setSizes(list);
  };

  const edit = (i, field, value) => setSizes(sizes.map((s, j) => j === i ? { ...s, [field]: value } : s));

  // Called when leaving a field: tidy, check, store, and carry a renamed full name into the cues
  const commit = (i) => {
    const before = saved.current[i];
    const size = { ...sizes[i], label: sizes[i].label.trim(), value: sizes[i].value.trim() };
    if (!size.value) { setSizes(saved.current); return; }
    if (!size.label) size.label = size.value;
    const clash = sizes.some((s, j) => j !== i && s.value.trim().toLowerCase() === size.value.toLowerCase());
    if (clash) { alert(`There's already an iris size called "${size.value}".`); setSizes(saved.current); return; }
    const list = sizes.map((s, j) => j === i ? size : s);
    if (before && before.value !== size.value) {
      const r = ipcRenderer.sendSync('db-rename-iris-size', { showId: show.id, from: before.value, to: size.value });
      setMessage(r?.changed ? `Renamed "${before.value}" to "${size.value}" in ${r.changed} cue${r.changed === 1 ? '' : 's'}.` : '');
    }
    save(list);
  };

  // Drag a row by its handle to reorder. Rows only become draggable while the handle is held,
  // so the text boxes still work normally.
  const [dragArmed, setDragArmed] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const drop = (to) => {
    if (dragFrom !== null && dragFrom !== to) {
      const list = [...sizes];
      const [moved] = list.splice(dragFrom, 1);
      list.splice(to, 0, moved);
      save(list);
    }
    setDragFrom(null); setDragOver(null); setDragArmed(null);
  };

  const remove = (i) => save(sizes.filter((_, j) => j !== i));

  // A renamed built-in size can go back to its original name (cues using it follow, like any rename)
  const original = (s) => s.builtin && DEFAULT_IRIS_SIZES.find(d => d.value === s.key);
  const isChanged = (s) => { const o = original(s); return !!o && (s.label !== o.label || s.value !== o.value); };
  const reset = (i) => {
    const o = original(sizes[i]);
    if (!o) return;
    if (sizes.some((s, j) => j !== i && s.value.toLowerCase() === o.value.toLowerCase())) {
      alert(`Another iris size is already called "${o.value}". Rename it first.`); return;
    }
    const current = saved.current[i];
    if (current.value !== o.value) {
      const r = ipcRenderer.sendSync('db-rename-iris-size', { showId: show.id, from: current.value, to: o.value });
      setMessage(r?.changed ? `Reset "${current.value}" to "${o.value}" in ${r.changed} cue${r.changed === 1 ? '' : 's'}.` : '');
    }
    save(sizes.map((s, j) => j === i ? { ...s, label: o.label, value: o.value } : s));
  };

  const addSize = () => {
    const label = newLabel.trim(), value = newValue.trim();
    if (!value) return;
    if (sizes.some(s => s.value.toLowerCase() === value.toLowerCase())) { alert(`There's already an iris size called "${value}".`); return; }
    save([...sizes, { label: label || value, value, builtin: false }]);
    setNewLabel(''); setNewValue('');
  };

  const field = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFFFFF', padding: '5px 8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
  const colHead = { fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.55)' };

  return (
    <div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '16px', lineHeight: '18px' }}>
        These are the iris buttons on the cue list, in this order; drag ⠿ to reorder. The button label is the short text on the button; the full name is what's saved in each cue and printed. Renaming a full name updates every cue that uses it, and Reset puts a built-in size back to its original name.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px 6px 48px' }}>
        <div style={{ ...colHead, width: '72px' }}>Button</div>
        <div style={{ ...colHead, flex: 1 }}>Full name</div>
      </div>
      <div style={{ background: '#2A2A2A', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
        {sizes.map((s, i) => (
          <div key={i}
            draggable={dragArmed === i}
            onDragStart={e => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={e => { e.preventDefault(); setDragOver(i); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => { e.preventDefault(); drop(i); }}
            onDragEnd={() => { setDragFrom(null); setDragOver(null); setDragArmed(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', padding: '6px 14px', borderTop: i ? '1px solid rgba(255,255,255,0.07)' : 'none',
              background: dragOver === i && dragFrom !== i ? 'rgba(10,132,255,0.16)' : 'transparent', boxShadow: dragOver === i && dragFrom !== i ? 'inset 0 0 0 1px #0A84FF' : 'none', opacity: dragFrom === i ? 0.5 : 1 }}>
            <div title="Drag to reorder" onMouseDown={() => setDragArmed(i)} onMouseUp={() => setDragArmed(null)}
              style={{ width: '24px', textAlign: 'center', fontSize: '15px', color: 'rgba(255,255,255,0.35)', cursor: 'grab', userSelect: 'none' }}>⠿</div>
            <input value={s.label} onChange={e => edit(i, 'label', e.target.value)} onBlur={() => commit(i)}
              onKeyDown={e => e.key === 'Enter' && e.target.blur()} style={{ ...field, width: '72px', fontWeight: '600' }} />
            <input value={s.value} onChange={e => edit(i, 'value', e.target.value)} onBlur={() => commit(i)}
              onKeyDown={e => e.key === 'Enter' && e.target.blur()} style={{ ...field, flex: 1 }} />
            {s.builtin
              ? (isChanged(saved.current[i] || s)
                  ? <button onClick={() => reset(i)} title={`Back to "${original(s)?.label} · ${original(s)?.value}"`}
                      style={{ width: '56px', height: '24px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '12px', cursor: 'pointer' }}>Reset</button>
                  : <span style={{ width: '56px' }} />)
              : <button onClick={() => remove(i)} style={{ width: '56px', height: '24px', background: 'rgba(255,69,58,0.14)', border: 'none', borderRadius: '6px', color: '#FF453A', fontSize: '12px', cursor: 'pointer' }}>Delete</button>}
          </div>
        ))}
      </div>
      <div style={{ fontSize: '12px', color: '#30D158', minHeight: '18px', margin: '0 0 16px 14px' }}>{message}</div>

      <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.55)', margin: '0 0 6px 14px' }}>Add a size</div>
      <div style={{ background: '#2A2A2A', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input style={{ ...field, width: '72px' }} value={newLabel} onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSize()} placeholder="Ks" />
        <input style={{ ...field, flex: 1 }} value={newValue} onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSize()} placeholder="Full name, e.g. Knees" />
        <button onClick={addSize}
          style={{ height: '28px', padding: '0 16px', background: '#0A84FF', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Add</button>
      </div>
    </div>
  );
}
