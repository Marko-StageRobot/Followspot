import React, { useState, useEffect, useRef } from 'react';
import Tips from '../components/Tips';
import { TIPS } from '../tips';
import AppHeader from '../components/AppHeader';
const { ipcRenderer } = window.require('electron');

const sectionLabel = { fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' };
const fieldStyle = { width: '100%', boxSizing: 'border-box', height: '28px', background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '6px', color: '#FFFFFF', padding: '0 10px', fontSize: '13px', outline: 'none' };

function Switch({ on, onChange, label, hint }) {
  return (
    <div onClick={() => onChange(!on)} role="switch" aria-checked={on}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '12px' }}>
      <div style={{ width: '44px', height: '20px', borderRadius: '10px', background: on ? '#0A84FF' : 'rgba(255,255,255,0.10)', position: 'relative', flexShrink: 0, transition: 'background 0.15s' }}>
        <div style={{ position: 'absolute', top: '2px', left: on ? '16px' : '2px', width: '26px', height: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.85)', boxShadow: '0 3px 8px rgba(0,0,0,0.15)', transition: 'left 0.15s' }} />
      </div>
      <div>
        <div style={{ fontSize: '13px', color: '#FFFFFF' }}>{label}</div>
        {hint && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>{hint}</div>}
      </div>
    </div>
  );
}

// The real PDF in the built-in viewer: scroll to see every page and exactly where it breaks
function PdfPreview({ preview, updating }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([preview.pdf], { type: 'application/pdf' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [preview]);

  return (
    <div data-tour="print-preview" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#161616' }}>
      <div style={{ flexShrink: 0, height: '32px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.10)', fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
        <span>{preview.pages} page{preview.pages === 1 ? '' : 's'}</span>
        {updating && <span style={{ color: '#409CFF' }}>Updating…</span>}
      </div>
      {url && <iframe key={url} src={url + '#toolbar=0&navpanes=0&view=FitH'} title="Print preview" style={{ flex: 1, width: '100%', border: 'none' }} />}
    </div>
  );
}

export default function PrintScreen({ show, navigate }) {
  const [spots, setSpots] = useState([]);
  const [selected, setSelected] = useState(null); // item from the "what to print" list
  const [label, setLabel] = useState('');
  const [hideOff, setHideOff] = useState(false);
  const [hideTracked, setHideTracked] = useState(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [notesSpotId, setNotesSpotId] = useState(null); // null = all spots
  const [showCostumeNotes, setShowCostumeNotes] = useState(true);
  const [showTracks, setShowTracks] = useState(true); // T· numbers under each LQ (spot and caller sheets)
  const [coverPage, setCoverPage] = useState(false); // cover page in front of a spot or caller sheet
  const [usedOnly, setUsedOnly] = useState(false); // action key: only the actions this show uses
  const [preview, setPreview] = useState(null); // { pdf, pages }
  const [updating, setUpdating] = useState(false);
  const latestRequest = useRef(0);
  const [previewError, setPreviewError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text, path }

  useEffect(() => {
    const result = ipcRenderer.sendSync('db-get-spots', show.id);
    setSpots(Array.isArray(result) ? result : []);
  }, []);

  const items = [
    ...spots.map(s => ({ key: 'spot-' + s.id, kind: 'spot', spotId: s.id, title: 'Spot ' + s.spot_number, sub: s.operator_name || 'Spot sheet' })),
    { key: 'caller', kind: 'caller', title: 'Caller sheet', sub: 'All spots side by side' },
    { key: 'color', kind: 'color', title: 'Color load', sub: 'Gel frames for every spot' },
    { key: 'notes', kind: 'notes', title: 'Spot notes', sub: 'Notes for operators' },
    { key: 'characters', kind: 'characters', title: 'Characters', sub: 'Cast photos, actors & costumes' },
    { key: 'scenes', kind: 'scenes', title: 'Scene list', sub: 'Scenes, songs, cues and pages' },
    { key: 'actions', kind: 'actions', title: 'Action key', sub: 'What every action symbol means' },
  ];

  const request = () => {
    if (!selected) return null;
    const req = { kind: selected.kind, showId: show.id, label };
    if (selected.kind === 'spot') {
      Object.assign(req, { spotId: selected.spotId, hideOff, hideTracked,
        rangeStart: rangeStart ? parseInt(rangeStart) : null, rangeEnd: rangeEnd ? parseInt(rangeEnd) : null });
    }
    if (selected.kind === 'spot' || selected.kind === 'caller') Object.assign(req, { showTracks, cover: coverPage });
    if (selected.kind === 'actions') req.usedOnly = usedOnly;
    if (selected.kind === 'notes') req.spotId = notesSpotId;
    if (selected.kind === 'characters') req.showCostumeNotes = showCostumeNotes;
    return req;
  };

  // Re-render the preview PDF whenever the sheet or an option changes (short pause so typing stays smooth).
  // Only the newest request's result is shown.
  useEffect(() => {
    const req = request();
    if (!req) { setPreview(null); setUpdating(false); return; }
    const id = ++latestRequest.current;
    setUpdating(true);
    const t = setTimeout(async () => {
      const result = await ipcRenderer.invoke('print-preview', req);
      if (id !== latestRequest.current) return;
      setUpdating(false);
      if (result?.success) { setPreview(result); setPreviewError(''); }
      else setPreviewError(result?.error || 'Could not build the preview.');
    }, 250);
    return () => clearTimeout(t);
  }, [selected?.key, label, hideOff, hideTracked, rangeStart, rangeEnd, notesSpotId, showCostumeNotes, showTracks, coverPage, usedOnly]);

  // Leaving the print screen: let the app shut down the preview's background Chrome
  useEffect(() => () => ipcRenderer.send('print-closed'), []);

  const exportPDF = () => {
    const req = request();
    if (!req) return;
    setExporting(true);
    setMessage(null);
    // Let the "Saving…" state paint before the save dialog blocks
    setTimeout(() => {
      const result = ipcRenderer.sendSync('print-export', req);
      setExporting(false);
      if (result?.success) setMessage({ ok: true, text: 'PDF saved.', path: result.path });
      else if (!result?.cancelled) setMessage({ ok: false, text: 'Could not save the PDF: ' + (result?.error || 'unknown error') });
    }, 30);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1E1E1E', overflow: 'hidden' }}>
      <AppHeader title="Print" onBack={() => navigate('show', show)} backLabel={show.title}>
        <div style={{ flex: 1 }} />
        {message && (
          <span style={{ fontSize: '13px', color: message.ok ? '#30D158' : '#FF453A', marginRight: '12px' }}>
            {message.text}
            {message.path && (
              <span onClick={() => ipcRenderer.send('reveal-file', message.path)}
                style={{ color: '#409CFF', cursor: 'pointer', marginLeft: '8px' }}>Show in Finder</span>
            )}
          </span>
        )}
        <button data-tour="print-export" onClick={exportPDF} disabled={!selected || exporting}
          style={{ height: '28px', padding: '0 16px', background: '#0A84FF', border: 'none', borderRadius: '14px', color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: selected && !exporting ? 'pointer' : 'default', opacity: selected && !exporting ? 1 : 0.5 }}>
          {exporting ? 'Saving…' : 'Export PDF…'}
        </button>
      </AppHeader>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* What to print + its options */}
        <div style={{ width: '260px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.10)', overflowY: 'auto', padding: '20px 16px' }}>
          <div style={sectionLabel}>What do you want to print?</div>
          <div data-tour="print-items" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '24px' }}>
            {items.map(item => {
              const isSel = selected?.key === item.key;
              return (
                <div key={item.key} onClick={() => { setSelected(item); setMessage(null); }}
                  style={{ padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', background: isSel ? 'rgba(10,132,255,0.30)' : 'transparent' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: isSel ? '#FFFFFF' : '#FFFFFF' }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>{item.sub}</div>
                </div>
              );
            })}
          </div>

          {selected && (
            <>
              <div style={sectionLabel}>Label</div>
              <input data-tour="print-label" value={label} onChange={e => setLabel(e.target.value)} placeholder='e.g. "2-24 Dress Run"' style={fieldStyle} />
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', margin: '4px 0 20px' }}>Appears in the page header</div>

              {selected.kind === 'spot' && (
                <>
                  <div style={sectionLabel}>Options</div>
                  <Switch on={hideOff} onChange={setHideOff} label="Hide Off cues" hint="Skip cues where this spot is off" />
                  <Switch on={hideTracked} onChange={setHideTracked} label="Hide Tracked cues" hint="Only cues where something changes" />
                  <Switch on={showTracks} onChange={setShowTracks} label="T· numbers" hint="Small spot cue numbers under each LQ" />
                  <Switch on={coverPage} onChange={setCoverPage} label="Cover page" hint="Logo, team, this spot's colors and an action key" />
                  <div style={{ ...sectionLabel, marginTop: '8px' }}>Cue range</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input value={rangeStart} onChange={e => setRangeStart(e.target.value.replace(/\D/g, ''))} placeholder="From T·" style={fieldStyle} />
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>
                    <input value={rangeEnd} onChange={e => setRangeEnd(e.target.value.replace(/\D/g, ''))} placeholder="To T·" style={fieldStyle} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '4px' }}>Tracking numbers (T·1, T·2…). Leave blank for all.</div>
                </>
              )}

              {selected.kind === 'caller' && (
                <>
                  <div style={sectionLabel}>Options</div>
                  <Switch on={showTracks} onChange={setShowTracks} label="T· numbers" hint="Small spot cue numbers under each LQ" />
                  <Switch on={coverPage} onChange={setCoverPage} label="Cover page" hint="Logo, team, every spot's colors and an action key" />
                </>
              )}

              {selected.kind === 'actions' && (
                <>
                  <div style={sectionLabel}>Options</div>
                  <Switch on={usedOnly} onChange={setUsedOnly} label="Only this show's actions" hint="Leave out actions no cue uses" />
                </>
              )}

              {selected.kind === 'characters' && (
                <>
                  <div style={sectionLabel}>Options</div>
                  <Switch on={showCostumeNotes} onChange={setShowCostumeNotes} label="Costume notes" hint="Show each character's costume notes" />
                </>
              )}

              {selected.kind === 'notes' && (
                <>
                  <div style={sectionLabel}>Which spot</div>
                  <select value={notesSpotId ?? ''} onChange={e => setNotesSpotId(e.target.value ? parseInt(e.target.value) : null)} style={fieldStyle}>
                    <option value="">All spots</option>
                    {spots.map(s => <option key={s.id} value={s.id}>Spot {s.spot_number}{s.operator_name ? ' (' + s.operator_name + ')' : ''}</option>)}
                  </select>
                </>
              )}
            </>
          )}
        </div>

        {/* Live preview */}
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#161616', color: 'rgba(255,255,255,0.55)', fontSize: '15px' }}>
            Select what you want to print
          </div>
        ) : previewError ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#161616', color: '#FF453A', fontSize: '13px' }}>
            {previewError}
          </div>
        ) : preview ? (
          <PdfPreview preview={preview} updating={updating} />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#161616', color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>
            Preparing preview…
          </div>
        )}
      </div>
      <Tips steps={TIPS.print} watch={selected ? (preview ? 2 : 1) : 0} />
    </div>
  );
}
