import React, { useState, useEffect } from 'react';
import SwapSpotsDialog from '../../components/SwapSpotsDialog';
import CopyColorsSelect from '../../components/CopyColorsSelect';
import { GelFramePicker } from '../../components/GelPicker';
const { ipcRenderer } = window.require('electron');

import { FIXTURES } from '../../fixtures';

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px', color: '#FFFFFF', padding: '7px 10px',
  fontSize: '13px', outline: 'none', boxSizing: 'border-box',
};

function SpotCard({ spot, colorSlots, onUpdateSpot, onUpdateGel, onDelete, otherSpots, onCopyColorsFrom, onSetPermanent }) {
  const [permJustOn, setPermJustOn] = useState(false);
  // Bumped after a copy so the gel pickers re-read their values
  const [copyCount, setCopyCount] = useState(0);
  const isCustomFixture = spot.fixture_type && !FIXTURES.includes(spot.fixture_type);
  const [showCustomFixture, setShowCustomFixture] = useState(isCustomFixture);
  // A typed fixture can arrive from Copy colors, so switch to the text box when needed
  useEffect(() => { if (isCustomFixture) setShowCustomFixture(true); }, [spot.fixture_type]);
  const slots = colorSlots || [];
  const regularSlots = slots.filter(s => !s.is_permanent);
  const permSlot = slots.find(s => s.is_permanent);

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#409CFF' }}>
          Spot {spot.spot_number}
        </div>
        <div style={{ flex: 1 }} />
        <CopyColorsSelect otherSpots={otherSpots} onPick={key => { if (onCopyColorsFrom(parseInt(key))) setCopyCount(c => c + 1); }} />
        <button onClick={() => {
          if (window.confirm('Delete Spot ' + spot.spot_number + '? All cues and data for this spot will be permanently deleted and cannot be recovered.')) {
            ipcRenderer.sendSync('db-remove-spot', spot.id);
            onDelete();
            onUpdateSpot(spot.id, '_deleted', true);
          }
        }} style={{ background: 'rgba(255,69,58,0.14)', border: 'none', borderRadius: '6px', color: '#FF453A', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', marginLeft: '8px' }}>
          Delete spot
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', marginBottom: '4px' }}>Operator name</div>
          <input style={inputStyle} defaultValue={spot.operator_name || ''}
            onBlur={e => onUpdateSpot(spot.id, 'operator_name', e.target.value)}
            placeholder="e.g. Lindsay" />
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', marginBottom: '4px' }}>Location</div>
          <input style={inputStyle} defaultValue={spot.location || ''}
            onBlur={e => onUpdateSpot(spot.id, 'location', e.target.value)}
            placeholder="e.g. FOH Left Booth" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', marginBottom: '4px' }}>Fixture type</div>
          {showCustomFixture ? (
            <div>
              <input key={spot.fixture_type || ''} style={inputStyle} defaultValue={spot.fixture_type || ''}
                onBlur={e => onUpdateSpot(spot.id, 'fixture_type', e.target.value)}
                placeholder="Enter fixture type..." />
              <div onClick={() => { onUpdateSpot(spot.id, 'fixture_type', ''); setShowCustomFixture(false); }}
                style={{ fontSize: '11px', color: '#409CFF', cursor: 'pointer', marginTop: '4px' }}>
                Choose from list instead
              </div>
            </div>
          ) : (
            <select style={inputStyle} value={spot.fixture_type || ''}
              onChange={e => {
                if (e.target.value === 'Other') { setShowCustomFixture(true); }
                else onUpdateSpot(spot.id, 'fixture_type', e.target.value);
              }}>
              <option value="">Select fixture...</option>
              {FIXTURES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          )}
        </div>
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', marginBottom: '8px' }}>Color frames</div>
      <div key={copyCount} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
        {regularSlots.map(slot => (
          <div key={slot.id} style={{ background: '#2A2A2A', borderRadius: '8px', padding: '8px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px', fontWeight: '600' }}>Frame {slot.slot_number}</div>
            <GelFramePicker gelNumber={slot.gel_number} gelName={slot.gel_name}
              onChange={gel => onUpdateGel(spot.id, slot.id, gel)}
              placeholder="Search gel..." />
          </div>
        ))}
      </div>
      {/* Checked when the spot has a permanent gel (or the box was just ticked) */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#FFFFFF', margin: '4px 0 8px' }}>
        <input type="checkbox" checked={!!(permSlot && (permJustOn || permSlot.gel_number || permSlot.gel_name))} onChange={e => { setPermJustOn(e.target.checked); onSetPermanent(spot.id, e.target.checked); }}
          style={{ width: '15px', height: '15px', accentColor: '#0A84FF', cursor: 'pointer', margin: 0 }} />
        Permanent color
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>a gel that always stays in the fixture</span>
      </label>
      {permSlot && (permJustOn || permSlot.gel_number || permSlot.gel_name) && (
        <div style={{ background: '#2A2A2A', borderRadius: '8px', padding: '8px', border: '1px solid rgba(255,214,10,0.25)' }}>
          <div style={{ fontSize: '10px', color: '#C8A26B', marginBottom: '6px', fontWeight: '600' }}>Permanent frame</div>
          <GelFramePicker key={copyCount} gelNumber={permSlot.gel_number} gelName={permSlot.gel_name}
            onChange={gel => onUpdateGel(spot.id, permSlot.id, gel)}
            placeholder="Search gel..." />
        </div>
      )}
    </div>
  );
}

export default function SpotSettingsPanel({ show }) {
  const [spots, setSpots] = useState([]);
  const [colorSlots, setColorSlots] = useState({});
  const [showSwap, setShowSwap] = useState(false);

  const load = () => {
    const s = ipcRenderer.sendSync('db-get-spots', show.id);
    setSpots(Array.isArray(s) ? s : []);
    const slotMap = {};
    for (const spot of (Array.isArray(s) ? s : [])) {
      const slots = ipcRenderer.sendSync('db-get-color-slots-all', spot.id);
      slotMap[spot.id] = Array.isArray(slots) ? slots : [];
    }
    setColorSlots(slotMap);
  };

  useEffect(() => { load(); }, []);

  const updateSpot = (spotId, field, value) => {
    ipcRenderer.sendSync('db-update-spot', { spotId, [field]: value });
    setSpots(s => s.map(sp => sp.id === spotId ? { ...sp, [field]: value } : sp));
  };

  const updateGel = (spotId, slotId, gel) => {
    ipcRenderer.sendSync('db-update-color-slot', { slotId, gel_number: gel.gel_number, gel_name: gel.gel_name });
    setColorSlots(prev => ({
      ...prev,
      [spotId]: (prev[spotId] || []).map(sl => sl.id === slotId ? { ...sl, gel_number: gel.gel_number, gel_name: gel.gel_name } : sl)
    }));
  };

  const setPermanent = (spotId, enabled) => {
    const slots = ipcRenderer.sendSync('db-set-perm-slot', { spotId, enabled });
    if (Array.isArray(slots)) setColorSlots(prev => ({ ...prev, [spotId]: slots }));
    return slots;
  };

  const copyColors = (targetId, sourceId) => {
    let target = colorSlots[targetId] || [];
    const source = colorSlots[sourceId] || [];
    const sourcePerm = source.find(sl => sl.is_permanent);
    const targetSpot = spots.find(s => s.id === targetId), sourceSpot = spots.find(s => s.id === sourceId);
    if (target.some(sl => sl.gel_number || sl.gel_name) &&
        !window.confirm(`Replace Spot ${targetSpot?.spot_number}'s colors and fixture with Spot ${sourceSpot?.spot_number}'s?`)) return false;
    // Same gels usually means the same fixture, so the fixture type comes along
    if (sourceSpot) updateSpot(targetId, 'fixture_type', sourceSpot.fixture_type || '');
    // The permanent color comes along too: give the target a permanent slot if it needs one
    if (sourcePerm && (sourcePerm.gel_number || sourcePerm.gel_name) && !target.some(sl => sl.is_permanent)) {
      target = setPermanent(targetId, true) || target;
    }
    for (const slot of target) {
      const match = source.find(sl => !!sl.is_permanent === !!slot.is_permanent && (slot.is_permanent || sl.slot_number === slot.slot_number));
      updateGel(targetId, slot.id, { gel_number: match?.gel_number || '', gel_name: match?.gel_name || '' });
    }
    return true;
  };

  return (
    <div>
      {spots.length >= 2 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button onClick={() => setShowSwap(true)} style={{ height: '28px', padding: '0 14px', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '14px', color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
            ⇄ Swap spots
          </button>
        </div>
      )}
      {showSwap && <SwapSpotsDialog spots={spots} onClose={() => setShowSwap(false)} />}
      {spots.map(spot => (
        <SpotCard
          key={spot.id}
          spot={spot}
          colorSlots={colorSlots[spot.id]}
          onUpdateSpot={updateSpot}
          onUpdateGel={updateGel}
          onDelete={() => load()}
          otherSpots={spots.filter(s => s.id !== spot.id).map(s => ({ key: s.id, label: 'Spot ' + s.spot_number }))}
          onCopyColorsFrom={sourceId => copyColors(spot.id, sourceId)}
          onSetPermanent={setPermanent}
        />
      ))}
            {spots.length < 4 && (
        <button onClick={() => {
          const newSpotNumber = spots.length + 1;
          const result = ipcRenderer.sendSync('db-add-spot', { showId: show.id, spotNumber: newSpotNumber });
          if (result.success) load();
        }} style={{ width: '100%', padding: '10px', background: 'none', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', color: '#409CFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
          + Add Spot
        </button>
      )}
    </div>
  );
}