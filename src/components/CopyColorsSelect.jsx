import React from 'react';

// Pop-up button listing the other spots; picking one copies that spot's gels and fixture type into this spot
export default function CopyColorsSelect({ otherSpots, onPick }) {
  if (!otherSpots.length) return null;
  return (
    <select value="" onChange={e => { if (e.target.value !== '') onPick(e.target.value); }}
      title="Copy every color frame and the fixture type from another spot"
      style={{ height: '24px', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '12px', fontWeight: '500', padding: '0 8px', outline: 'none', cursor: 'pointer' }}>
      <option value="">Copy colors from…</option>
      {otherSpots.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
    </select>
  );
}
