import React, { useState, useEffect, useRef } from 'react';
import AppHeader from '../components/AppHeader';
import Tips from '../components/Tips';
import { TIPS } from '../tips';
import CopyColorsSelect from '../components/CopyColorsSelect';
import { GelFramePicker } from '../components/GelPicker';
const { ipcRenderer } = window.require('electron');

import { FIXTURES } from '../fixtures';
// Picked images are shown from their file data (a plain file path doesn't load in the dev window)
const imageSrc = (filePath) => {
  try {
    const ext = filePath.split('.').pop().toLowerCase();
    const mime = { png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml' }[ext] || 'image/jpeg';
    return `data:${mime};base64,${window.require('fs').readFileSync(filePath).toString('base64')}`;
  } catch(e) { return ''; }
};
const labelStyle = { fontSize: '11px', color: 'rgba(255,255,255,0.62)', display: 'block', marginBottom: '4px', fontWeight: '500' };
const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFFFFF', padding: '7px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };

function newSpot(number) {
  return {
    spot_number: number,
    operator_name: '',
    location: '',
    fixture_type: '',
    fixture_other: '',
    gels: [1,2,3,4,5,6].map(slot => ({ slot, gel_number: '', gel_name: '' })),
    perm_gel_number: '',
    perm_gel_name: '',
  };
}

function SpotSetup({ spot, spotNumber, onChange, onRemove, otherSpots, onCopyColorsFrom }) {
  // Bumped after a copy so the gel pickers re-read their values
  const [copyCount, setCopyCount] = useState(0);
  const updateGel = (i, gelData) => {
    const newGels = [...spot.gels];
    newGels[i] = { ...newGels[i], ...gelData };
    onChange({ ...spot, gels: newGels });
  };

  return (
    <div style={{ background: '#2A2A2A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '15px', fontWeight: '600', color: '#409CFF' }}>Spot {spotNumber}</span>
        <div style={{ flex: 1 }} />
        <span data-tour="copy-colors"><CopyColorsSelect otherSpots={otherSpots} onPick={key => { if (onCopyColorsFrom(parseInt(key))) setCopyCount(c => c + 1); }} /></span>
        <button onClick={onRemove} style={{ background: 'rgba(255,69,58,0.14)', border: 'none', borderRadius: '6px', color: '#FF453A', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', marginLeft: '8px' }}>Remove</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>Operator name</label>
          <input style={inputStyle} value={spot.operator_name}
            onChange={e => onChange({ ...spot, operator_name: e.target.value })}
            placeholder="e.g. Lindsay" />
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input style={inputStyle} value={spot.location}
            onChange={e => onChange({ ...spot, location: e.target.value })}
            placeholder="e.g. FOH Left Booth" />
        </div>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Fixture type</label>
        {spot.fixture_type === 'Other' ? (
          <div>
            <input style={inputStyle} value={spot.fixture_other || ''}
              onChange={e => onChange({ ...spot, fixture_other: e.target.value })}
              placeholder="Enter fixture type..."
              autoFocus
            />
            <div onClick={() => onChange({ ...spot, fixture_type: '', fixture_other: '' })}
              style={{ fontSize: '11px', color: '#409CFF', cursor: 'pointer', marginTop: '4px' }}>
              Choose from list instead
            </div>
          </div>
        ) : (
          <select style={inputStyle} value={spot.fixture_type}
            onChange={e => onChange({ ...spot, fixture_type: e.target.value, fixture_other: '' })}>
            <option value="">Select fixture...</option>
            {FIXTURES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
      </div>
      <label style={{ ...labelStyle, marginBottom: '8px', display: 'block' }}>Color frames</label>
      <div key={copyCount} data-tour="spot-setup" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
        {spot.gels.map((gel, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px', fontWeight: '600' }}>Frame {gel.slot}</div>
            <GelFramePicker gelNumber={gel.gel_number} gelName={gel.gel_name}
              onChange={gelData => updateGel(i, gelData)}
              placeholder="Search gel..." />
          </div>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#FFFFFF', margin: '4px 0 8px' }}>
        <input type="checkbox" checked={!!(spot.perm_on || spot.perm_gel_number || spot.perm_gel_name)} onChange={e => onChange(e.target.checked ? { ...spot, perm_on: true } : { ...spot, perm_on: false, perm_gel_number: '', perm_gel_name: '' })}
          style={{ width: '15px', height: '15px', accentColor: '#0A84FF', cursor: 'pointer', margin: 0 }} />
        Permanent color
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>a gel that always stays in the fixture</span>
      </label>
      {(spot.perm_on || spot.perm_gel_number || spot.perm_gel_name) && (
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px', border: '1px solid rgba(255,214,10,0.25)' }}>
        <div style={{ fontSize: '10px', color: '#C8A26B', marginBottom: '6px', fontWeight: '600' }}>Permanent frame</div>
        <GelFramePicker key={copyCount} gelNumber={spot.perm_gel_number} gelName={spot.perm_gel_name}
          onChange={gelData => onChange({ ...spot, perm_gel_number: gelData.gel_number, perm_gel_name: gelData.gel_name })}
          placeholder="Search gel..." />
      </div>
      )}
    </div>
  );
}

export default function NewShowScreen({ navigate }) {
  const [form, setForm] = useState({
    title: '', theatre: '', producer: '', designer: '',
    associate_ld: '', assistant_ld: '', production_electrician: '', programmer: '',
  });
  const [spots, setSpots] = useState([newSpot(1), newSpot(2)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateForm = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const addSpot = () => { if (spots.length < 4) setSpots(s => [...s, newSpot(s.length + 1)]); };
  const removeSpot = (i) => setSpots(s => s.filter((_, idx) => idx !== i).map((sp, idx) => ({ ...sp, spot_number: idx + 1 })));
  const updateSpot = (i, data) => setSpots(s => s.map((sp, idx) => idx === i ? data : sp));
  const hasGels = sp => sp.gels.some(g => g.gel_number || g.gel_name) || sp.perm_gel_number || sp.perm_gel_name;
  const copyColors = (targetIdx, sourceIdx) => {
    const source = spots[sourceIdx];
    if (hasGels(spots[targetIdx]) && !window.confirm(`Replace Spot ${targetIdx + 1}'s colors and fixture with Spot ${sourceIdx + 1}'s?`)) return false;
    // The fixture type comes along with the gels
    updateSpot(targetIdx, { ...spots[targetIdx], gels: source.gels.map(g => ({ ...g })), perm_on: source.perm_on, perm_gel_number: source.perm_gel_number, perm_gel_name: source.perm_gel_name,
      fixture_type: source.fixture_type, fixture_other: source.fixture_other });
    return true;
  };

  const handleSave = () => {
    if (!form.title.trim()) { setError('Show title is required.'); return; }
    setSaving(true);
    if (!form.title.trim()) { setError('Show title is required.'); return; }
    setSaving(true);
    const result = ipcRenderer.sendSync('db-create-show', { form, spots });
    if (result.success) { navigate('home'); }
    else { setError('Error saving. Please try again.'); setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppHeader title="New Show" onBack={() => navigate('home')} backLabel="Back">
        <div style={{ flex: 1 }} />
        {error && <span style={{ fontSize: '12px', color: '#FF453A' }}>{error}</span>}
        <button data-tour="save-show" onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: '#0A84FF', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : 'Save Show'}
        </button>
      </AppHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>

          <div style={{ background: '#2A2A2A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Show info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {form.logo_path ? (
                    <img src={imageSrc(form.logo_path)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', textAlign: 'center', padding: '8px' }}>No logo</span>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Show logo</label>
                  <button
                    onClick={async () => {
                      const { ipcRenderer } = window.require('electron');
                      const result = ipcRenderer.sendSync('dialog-open-image');
                      if (result) updateForm('logo_path', result);
                    }}
                    style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.62)', fontSize: '12px', cursor: 'pointer', display: 'block', marginBottom: '4px' }}>
                    Choose image...
                  </button>
                  {form.logo_path && <div style={{ fontSize: '11px', color: '#409CFF', marginTop: '2px' }}>✓ Image selected</div>}
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', marginTop: '4px' }}>PNG, JPG or SVG</div>
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Show title *</label>
                <input style={{ ...inputStyle, fontSize: '15px' }} value={form.title}
                  onChange={e => updateForm('title', e.target.value)} placeholder="e.g. Hamilton" />
              </div>
              <div>
                <label style={labelStyle}>Theatre</label>
                <input style={inputStyle} value={form.theatre}
                  onChange={e => updateForm('theatre', e.target.value)} placeholder="e.g. Richard Rodgers Theatre" />
              </div>
              <div>
                <label style={labelStyle}>Producer</label>
                <input style={inputStyle} value={form.producer}
                  onChange={e => updateForm('producer', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ background: '#2A2A2A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lighting team</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                ['designer','Lighting designer'],
                ['associate_ld','Associate LD'],
                ['assistant_ld','Assistant LD'],
                ['production_electrician','Production electrician'],
                ['programmer','Programmer'],
              ].map(([field, label]) => (
                <div key={field}>
                  <label style={labelStyle}>{label}</label>
                  <input style={inputStyle} value={form[field]}
                    onChange={e => updateForm(field, e.target.value)} placeholder={label} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spots ({spots.length})</div>
              {spots.length < 4 && (
                <button onClick={addSpot} style={{ background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px', color: '#FFFFFF', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}>+ Add spot</button>
              )}
            </div>
            {spots.map((spot, i) => (
              <SpotSetup key={i} spot={spot} spotNumber={i + 1}
                onChange={data => updateSpot(i, data)}
                onRemove={() => removeSpot(i)}
                otherSpots={spots.map((_, j) => ({ key: j, label: 'Spot ' + (j + 1) })).filter(o => o.key !== i)}
                onCopyColorsFrom={j => copyColors(i, j)} />
            ))}
          </div>

        </div>
      </div>
      <Tips steps={TIPS.newShow} watch={spots.length} />
    </div>
  );
}