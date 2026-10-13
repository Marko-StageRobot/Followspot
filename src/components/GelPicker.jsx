import React, { useState, useEffect, useRef } from 'react';
const { ipcRenderer } = window.require('electron');

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px', color: '#FFFFFF', padding: '5px 8px',
  fontSize: '11px', outline: 'none', boxSizing: 'border-box',
};

// Search box for one gel from the catalog (or any typed name)
export function GelPicker({ value, onChange, placeholder }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    const r = ipcRenderer.sendSync('db-search-gels', query);
    setResults(r || []);
    setOpen((r || []).length > 0);
  }, [query]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (gel) => {
    setQuery(gel.gel_number + ' ' + gel.gel_name);
    onChange({ gel_number: gel.gel_number, gel_name: gel.gel_name });
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input style={inputStyle}
        value={query}
        placeholder={placeholder || 'Search gel...'}
        onChange={e => { setQuery(e.target.value); onChange({ gel_number: '', gel_name: e.target.value }); }}
        onFocus={() => query.length > 0 && results.length > 0 && setOpen(true)} />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: '#2A2A2A', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '6px', maxHeight: '180px', overflowY: 'auto', marginTop: '2px', minWidth: '220px' }}>
          {results.map((gel, i) => (
            <div key={i} onMouseDown={() => select(gel)}
              style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ color: '#409CFF', fontWeight: '600', minWidth: '50px' }}>{gel.gel_number}</span>
              <span style={{ color: 'rgba(255,255,255,0.78)' }}>{gel.gel_name}</span>
              <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: 'auto' }}>{gel.manufacturer}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// A frame can hold more than one gel (e.g. R02+R132). They're stored together in the frame's
// gel_number ("R02+R132") and gel_name ("Bastard Amber + Light Hamburg"), so prints, exports and
// the iPad app need no changes.
const splitFrame = (gelNumber, gelName) => {
  const nums = (gelNumber || '').split('+').map(s => s.trim()).filter(Boolean);
  const names = (gelName || '').split(' + ').map(s => s.trim());
  if (nums.length <= 1) return [{ gel_number: nums[0] || '', gel_name: gelName || '' }];
  return nums.map((n, i) => ({ gel_number: n, gel_name: names.length === nums.length ? names[i] : (i === 0 ? gelName : '') }));
};
const joinFrame = (gels) => {
  const used = gels.filter(g => g.gel_number || g.gel_name);
  return { gel_number: used.map(g => g.gel_number).filter(Boolean).join('+'), gel_name: used.map(g => g.gel_name).filter(Boolean).join(' + ') };
};

export function GelFramePicker({ gelNumber, gelName, onChange, placeholder }) {
  const [gels, setGels] = useState(() => splitFrame(gelNumber, gelName));
  const update = (next) => { setGels(next); onChange(joinFrame(next)); };
  const hasFirst = gels[0] && (gels[0].gel_number || gels[0].gel_name);
  const link = { fontSize: '11px', color: '#409CFF', cursor: 'pointer', background: 'none', border: 'none', padding: 0 };

  return (
    <div>
      {gels.map((g, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: i ? '4px' : 0 }}>
          {i > 0 && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', width: '10px', textAlign: 'center' }}>+</span>}
          <GelPicker value={g.gel_number ? g.gel_number + ' ' + g.gel_name : g.gel_name}
            onChange={gel => update(gels.map((x, j) => j === i ? gel : x))}
            placeholder={i ? 'Add gel...' : placeholder} />
          {i > 0 && (
            <button onClick={() => update(gels.filter((_, j) => j !== i))} title="Remove this gel"
              style={{ ...link, color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}>×</button>
          )}
        </div>
      ))}
      {hasFirst && (
        <button onClick={() => setGels([...gels, { gel_number: '', gel_name: '' }])} style={{ ...link, marginTop: '5px' }}>+ Add gel</button>
      )}
    </div>
  );
}
