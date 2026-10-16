import React, { useState, useEffect } from 'react';
import SwapSpotsDialog from '../../components/SwapSpotsDialog';
import CopyColorsSelect from '../../components/CopyColorsSelect';
import { GelFramePicker } from '../../components/GelPicker';
import FrameGrid, { RemoveFrameDialog } from '../../components/FrameGrid';
const { ipcRenderer } = window.require('electron');

import { FIXTURES } from '../../fixtures';

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px', color: '#FFFFFF', padding: '7px 10px',
  fontSize: '13px', outline: 'none', boxSizing: 'border-box',
};

function SpotCard({ spot, spotNumbers, colorSlots, onUpdateSpot, onUpdateGel, onDelete, otherSpots, onCopyColorsFrom, onSetPermanent, onSlotsChanged }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The frame being removed when cues use it (asks what to do with those cues)
  const [removing, setRemoving] = useState(null);
  const removeFrame = (slot, replaceWith) => {
    const slots = ipcRenderer.sendSync('db-remove-frame', { spotId: spot.id, slotId: slot.id, replaceWith });
    if (Array.isArray(slots)) onSlotsChanged(spot.id, slots);
    setRemoving(null);
  };
  const askRemoveFrame = (slot) => {
    const cueCount = ipcRenderer.sendSync('db-frame-usage', { spotId: spot.id, slotNumber: slot.slot_number });
    if (cueCount > 0) setRemoving({ slot, cueCount });
    else removeFrame(slot, null);
  };
  const addFrame = () => {
    const slots = ipcRenderer.sendSync('db-add-frame', { spotId: spot.id });
    if (Array.isArray(slots)) onSlotsChanged(spot.id, slots);
  };
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
        <button onClick={() => setConfirmDelete(true)} style={{ background: 'rgba(255,69,58,0.14)', border: 'none', borderRadius: '6px', color: '#FF453A', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', marginLeft: '8px' }}>
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
      {confirmDelete && (
        <DeleteSpotDialog spotNumber={spot.spot_number} spotNumbers={spotNumbers}
          onCancel={() => setConfirmDelete(false)}
          onDelete={renumber => {
            ipcRenderer.sendSync('db-remove-spot', { spotId: spot.id, renumber });
            setConfirmDelete(false);
            onDelete();
          }} />
      )}
      <FrameGrid key={copyCount} cardBackground="#2A2A2A"
        frames={regularSlots.map(s => ({ key: s.id, slot: s.slot_number, gel_number: s.gel_number, gel_name: s.gel_name, row: s }))}
        onGelChange={(f, gel) => onUpdateGel(spot.id, f.row.id, gel)}
        onRemove={f => askRemoveFrame(f.row)}
        onAdd={addFrame} />
      {removing && (
        <RemoveFrameDialog slot={removing.slot.slot_number} cueCount={removing.cueCount}
          otherSlots={regularSlots.filter(s => s.id !== removing.slot.id).map(s => s.slot_number)}
          onCancel={() => setRemoving(null)}
          onRemove={replaceWith => removeFrame(removing.slot, replaceWith)} />
      )}
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

// Asks before deleting a spot: it's permanent, and the other spots can keep their numbers or be renumbered
function DeleteSpotDialog({ spotNumber, spotNumbers, onCancel, onDelete }) {
  const [renumber, setRenumber] = useState(false);
  const others = spotNumbers.filter(n => n !== spotNumber).sort((a, b) => a - b);
  const moves = others.map((n, i) => [n, i + 1]).filter(([from, to]) => from !== to);
  const list = (nums) => nums.length === 1 ? 'Spot ' + nums[0] : 'Spots ' + nums.slice(0, -1).join(', ') + ' and ' + nums[nums.length - 1];
  const btn = { flex: 1, height: '28px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer' };
  const option = (value, title, detail) => (
    <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '6px',
      background: renumber === value ? 'rgba(10,132,255,0.16)' : 'rgba(255,255,255,0.05)', border: '1px solid ' + (renumber === value ? 'rgba(10,132,255,0.5)' : 'transparent') }}>
      <input type="radio" checked={renumber === value} onChange={() => setRenumber(value)} style={{ margin: '2px 0 0', accentColor: '#0A84FF' }} />
      <span>
        <span style={{ display: 'block', fontSize: '13px', color: '#FFFFFF', fontWeight: '500' }}>{title}</span>
        <span style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '1px' }}>{detail}</span>
      </span>
    </label>
  );
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '320px', background: '#2A2A2A', borderRadius: '16px', padding: '16px', boxShadow: '0 18px 48px rgba(0,0,0,0.45)' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', marginBottom: '6px' }}>Delete Spot {spotNumber}?</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)', marginBottom: moves.length ? '12px' : '16px' }}>
          Everything this spot does in every cue, its colors and its notes are deleted. This can't be undone.
        </div>
        {moves.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            {option(false, 'Keep spot numbers', list(others) + ' stay as they are')}
            {option(true, 'Renumber spots', moves.map(([from, to]) => `Spot ${from} becomes Spot ${to}`).join(', '))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{ ...btn, background: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}>Cancel</button>
          <button onClick={() => onDelete(renumber)} style={{ ...btn, background: '#FF453A', color: '#FFFFFF' }}>Delete spot</button>
        </div>
      </div>
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
    // Frames the source has but the target was missing come along too (frames are never removed here)
    for (const sl of source.filter(sl => !sl.is_permanent && !target.some(t => !t.is_permanent && t.slot_number === sl.slot_number))) {
      target = ipcRenderer.sendSync('db-add-frame', { spotId: targetId, slotNumber: sl.slot_number }) || target;
    }
    setColorSlots(prev => ({ ...prev, [targetId]: target }));
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
          spotNumbers={spots.map(s => s.spot_number)}
          colorSlots={colorSlots[spot.id]}
          onUpdateSpot={updateSpot}
          onUpdateGel={updateGel}
          onDelete={() => load()}
          otherSpots={spots.filter(s => s.id !== spot.id).map(s => ({ key: s.id, label: 'Spot ' + s.spot_number }))}
          onCopyColorsFrom={sourceId => copyColors(spot.id, sourceId)}
          onSetPermanent={setPermanent}
          onSlotsChanged={(spotId, slots) => setColorSlots(prev => ({ ...prev, [spotId]: slots }))}
        />
      ))}
            {spots.length < 4 && (
        <button onClick={() => {
          // Fills the lowest missing number (Spots 1 and 3 get a Spot 2)
          let newSpotNumber = 1;
          while (spots.some(s => s.spot_number === newSpotNumber)) newSpotNumber++;
          const result = ipcRenderer.sendSync('db-add-spot', { showId: show.id, spotNumber: newSpotNumber });
          if (result.success) load();
        }} style={{ width: '100%', padding: '10px', background: 'none', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', color: '#409CFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
          + Add Spot
        </button>
      )}
    </div>
  );
}