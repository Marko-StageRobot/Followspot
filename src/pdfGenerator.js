const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { safeRich, escapeText } = require('./richText');
const { cueFieldSettings } = require('./cueFields');

// Style rules that hide the cue fields a show has unticked under "Show on print"
function hiddenFieldCSS(cueFields, selectors) {
  const f = cueFieldSettings(cueFields);
  return Object.entries(selectors)
    .filter(([key]) => key === 'intIris' ? (!f.intensity.print && !f.iris.print) : f[key] && !f[key].print)
    .map(([, sel]) => `${sel} { display: none !important; }`).join('\n');
}

// Background for a highlighted When or Notes line
function lineHighlightCSS(color) {
  if (color === 'yellow') return 'background:rgba(200,160,0,0.30);border-radius:3px;';
  if (color === 'red') return 'background:rgba(200,60,60,0.25);border-radius:3px;';
  return '';
}

// "When" text; a linked w/LQ always shows the cue's current LQ number
function whenText(sc, cue) {
  const desc = safeRich(sc.description);
  if (!sc.with_lq) return desc;
  return ['w/ LQ', escapeText(cue.lq_number), desc].filter(Boolean).join(' ');
}

function actionIconSVG(action, size = 28) {
  const s = size;
  const icons = {
    'Pick Up': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><polygon points="16,4 24,20 8,20" fill="#3B6D11"/><polygon points="16,14 22,26 10,26" fill="#639922" opacity="0.5"/></svg>`,
    'Fade Up': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><polygon points="16,5 23,18 9,18" fill="#3B6D11"/></svg>`,
    'Fade Down': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><polygon points="16,27 23,14 9,14" fill="#A32D2D"/></svg>`,
    'Fade Out': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><polygon points="16,28 24,12 8,12" fill="#A32D2D"/><polygon points="16,18 22,6 10,6" fill="#E24B4A" opacity="0.5"/></svg>`,
    'Fade In Place': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#A32D2D" stroke-width="2"/><polygon points="16,27 23,14 9,14" fill="#A32D2D"/></svg>`,
    'Bump Up': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><rect x="8" y="10" width="16" height="3" rx="1.5" fill="#3B6D11"/><rect x="10" y="15" width="12" height="3" rx="1.5" fill="#3B6D11" opacity="0.6"/><rect x="12" y="20" width="8" height="3" rx="1.5" fill="#3B6D11" opacity="0.3"/></svg>`,
    'Bump Out': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><rect x="8" y="19" width="16" height="3" rx="1.5" fill="#A32D2D"/><rect x="10" y="14" width="12" height="3" rx="1.5" fill="#A32D2D" opacity="0.6"/><rect x="12" y="9" width="8" height="3" rx="1.5" fill="#A32D2D" opacity="0.3"/></svg>`,
    'Swap To': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><path d="M10 10 C10 6 22 6 22 10 L22 16 C22 20 16 24 16 24 C16 24 10 20 10 16 Z" fill="none" stroke="#185FA5" stroke-width="2"/><path d="M20 20 L26 24 L22 26 L20 20Z" fill="#185FA5"/></svg>`,
    'Slide To': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><line x1="6" y1="16" x2="26" y2="16" stroke="#185FA5" stroke-width="2.5" stroke-linecap="round"/><polygon points="22,10 30,16 22,22" fill="#185FA5"/><polygon points="10,10 2,16 10,22" fill="#185FA5"/></svg>`,
    'Stay With': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="9" fill="#E6F1FB" stroke="#185FA5" stroke-width="1.5"/><circle cx="12" cy="16" r="3" fill="#185FA5"/><circle cx="20" cy="16" r="3" fill="#185FA5"/></svg>`,
    'Iris In': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#534AB7" stroke-width="2"/><line x1="8" y1="16" x2="24" y2="16" stroke="#534AB7" stroke-width="2" stroke-linecap="round"/><polygon points="10,12 6,16 10,20" fill="#534AB7"/><polygon points="22,12 26,16 22,20" fill="#534AB7"/></svg>`,
    'Iris Out': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#534AB7" stroke-width="2"/><line x1="8" y1="16" x2="24" y2="16" stroke="#534AB7" stroke-width="2" stroke-linecap="round"/><polygon points="6,12 10,16 6,20" fill="#534AB7"/><polygon points="26,12 22,16 26,20" fill="#534AB7"/></svg>`,
    'Iris/Fade Up': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><circle cx="16" cy="18" r="9" fill="none" stroke="#534AB7" stroke-width="2"/><polygon points="16,4 22,14 10,14" fill="#3B6D11"/></svg>`,
    'Iris/Fade Down': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><circle cx="16" cy="14" r="9" fill="none" stroke="#534AB7" stroke-width="2"/><polygon points="16,28 22,18 10,18" fill="#A32D2D"/></svg>`,
    'Iris/Fade Out': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="9" fill="none" stroke="#534AB7" stroke-width="2"/><line x1="9" y1="16" x2="23" y2="16" stroke="#A32D2D" stroke-width="2"/><polygon points="11,12 7,16 11,20" fill="#A32D2D"/><polygon points="21,12 25,16 21,20" fill="#A32D2D"/></svg>`,
    'Up & Out': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><polygon points="16,4 22,14 10,14" fill="#3B6D11"/><polygon points="16,28 22,18 10,18" fill="#A32D2D"/></svg>`,
    'Dump & Restore': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><polygon points="10,4 22,4 16,14" fill="#A32D2D"/><polygon points="16,18 22,28 10,28" fill="#3B6D11"/></svg>`,
    'Bump Color': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><rect x="9" y="8" width="14" height="16" rx="2" fill="none" stroke="#BA7517" stroke-width="1.5"/><rect x="12" y="11" width="3" height="10" fill="#639922"/><rect x="16" y="11" width="3" height="10" fill="#E24B4A"/></svg>`,
    'Roll Color': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><rect x="9" y="8" width="14" height="16" rx="2" fill="none" stroke="#BA7517" stroke-width="1.5"/><rect x="9" y="8" width="3.5" height="16" rx="1" fill="#E24B4A"/><rect x="12.5" y="8" width="3.5" height="16" fill="#EF9F27"/><rect x="16" y="8" width="3.5" height="16" fill="#639922"/><rect x="19.5" y="8" width="3.5" height="16" rx="1" fill="#185FA5"/></svg>`,
    'Ballyhoo': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><path d="M8 16 C8 10 12 6 16 6 C20 6 24 10 24 16 C24 22 20 26 16 26 C12 26 8 22 8 16 Z" fill="none" stroke="#D85A30" stroke-width="2.5"/><path d="M16 6 C16 6 20 16 16 26" fill="none" stroke="#D85A30" stroke-width="2"/><path d="M16 6 C16 6 12 16 16 26" fill="none" stroke="#D85A30" stroke-width="2"/></svg>`,
    'Off': `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><line x1="8" y1="8" x2="24" y2="24" stroke="#999" stroke-width="2.5" stroke-linecap="round"/><line x1="24" y1="8" x2="8" y2="24" stroke="#999" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  };
  return icons[action] || `<svg width="${s}" height="${s}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="#ccc"/></svg>`;
}
function getActionIconHTML(action, size, customActions) {
  const custom = (customActions || []).find(a => a.name === action);
  if (custom?.icon) {
    try {
      const fs = require('fs');
      const data = fs.readFileSync(custom.icon);
      const ext = custom.icon.split('.').pop().toLowerCase();
      const src = `data:image/${ext};base64,${data.toString('base64')}`;
      return `<img src="${src}" style="width:${size}px;height:${size}px;object-fit:contain;" />`;
    } catch(e) {}
  }
  return actionIconSVG(action, size);
}

// Cue ids where a spot's color (frames or NC) differs from the last color it had.
// Off cues and cues with no color set are skipped; the spot's first color is highlighted too.
function colorChangeCues(orderedCues, spotCuesForSpot) {
  const changed = new Set();
  let last = null;
  for (const cue of orderedCues) {
    const sc = spotCuesForSpot.find(x => x.cue_id === cue.id);
    if (!sc || sc.action === 'Off') continue;
    const frames = (sc.active_frames || '').split(',').filter(Boolean).sort().join(',');
    const color = sc.no_color ? 'NC' : frames;
    if (!color) continue;
    if (color !== last) changed.add(cue.id); // the spot's first color counts as a change too
    last = color;
  }
  return changed;
}
const COLOR_CHANGE_BG = '#FFE45C'; // yellow highlighter

// Small gray T· (spot cue / tracking number) under the LQ, for operators to reference
const trackHTML = (cue, show) => show && cue.track_number != null ? `<div class="track-num">T·${cue.track_number}</div>` : '';

function buildSpotSheetHTML({ cueFields, show, spot, colorSlots, cues, spotCues, characters, scenes, label, numSpots, hideOff, hideTracked, rangeStart, rangeEnd, customActions, showTracks = true }) {
  const isLandscape = false;
  let logoHTML = '<div class="header-logo-placeholder">LOGO</div>';
  if (show.logo_path) {
    try {
      const logoData = fs.readFileSync(show.logo_path);
      const ext = show.logo_path.split('.').pop().toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
      const base64 = logoData.toString('base64');
      logoHTML = `<img src="data:${mimeType};base64,${base64}" style="width:64px;height:64px;object-fit:contain;border-radius:8px;flex-shrink:0;align-self:flex-start;" />`;
    } catch(e) {
      console.error('Could not load logo:', e);
    }
  }
  const sceneMap = {};
  scenes.forEach(s => { sceneMap[s.id] = s; });
  const charMap = {};
  characters.forEach(c => { charMap[c.id] = c; });

const sceneOrderMap = {};
  scenes.forEach((s, i) => { sceneOrderMap[s.id] = i; });
  
  let sortedCues = [...cues].sort((a, b) => {
    const sceneA = sceneOrderMap[a.scene_id] ?? 999;
    const sceneB = sceneOrderMap[b.scene_id] ?? 999;
    if (sceneA !== sceneB) return sceneA - sceneB;
    return a.sort_order - b.sort_order;
  });
  const colorChanged = colorChangeCues(sortedCues, spotCues.filter(x => x.spot_id === spot.id));

  if (rangeStart !== null && rangeStart !== undefined) {
    sortedCues = sortedCues.filter(c => c.track_number >= rangeStart);
  }
  if (rangeEnd !== null && rangeEnd !== undefined) {
    sortedCues = sortedCues.filter(c => c.track_number <= rangeEnd);
  }
 if (hideOff) {
    sortedCues = sortedCues.filter(c => {
      const sc = spotCues.find(sc => sc.cue_id === c.id && sc.spot_id === spot.id);
      return sc && sc.action !== 'Off';
    });
  }

  if (hideTracked) {
    sortedCues = sortedCues.filter(c => {
      const sc = spotCues.find(sc => sc.cue_id === c.id && sc.spot_id === spot.id);
      return sc && sc.action && sc.action !== '';
    });
  }

  const gelFramesHTML = colorSlots.filter(s => !s.is_permanent).map(slot => `
    <div class="gel-slot">
      <span class="gel-num">${slot.gel_number || '—'}</span>
      <span class="gel-name">${slot.gel_name || 'Empty'}</span>
      <span class="gel-label">F${slot.slot_number}</span>
    </div>
  `).join('');

  const permSlot = colorSlots.find(s => s.is_permanent);
  const permHTML = permSlot && permSlot.gel_number ? `
    <div class="gel-slot perm">
      <span class="gel-num">${permSlot.gel_number}</span>
      <span class="gel-name">${permSlot.gel_name || ''}</span>
      <span class="gel-label">PERM</span>
    </div>
  ` : '';

  let rowsHTML = '';
  let currentSceneId = 'NONE';

  for (const cue of sortedCues) {
    const sc = spotCues.find(sc => sc.cue_id === cue.id && sc.spot_id === spot.id);
    if (!sc) continue;

    if (cue.scene_id !== currentSceneId) {
      currentSceneId = cue.scene_id;
      const scene = sceneMap[cue.scene_id];
      if (scene) {
        rowsHTML += `
          <tr class="scene-row">
            <td colspan="9">${scene.label}${scene.song ? ' · ' + scene.song : ''}</td>
          </tr>
        `;
      }
    }

    const char = charMap[sc.character_id];
    const activeFrames = sc.active_frames ? sc.active_frames.split(',').filter(Boolean).join(' + ') : '';
    const isOff = sc.action === 'Off';

    const isIgnored = sc.ignored === 1;
    const highlight = sc.highlight;
    let rowStyle = '';
    if (isIgnored) rowStyle = 'background: rgba(180,40,40,0.08);';
    if (highlight === 'yellow') rowStyle = 'background: rgba(200,160,0,0.15);';
    if (highlight === 'red') rowStyle = 'background: rgba(200,60,60,0.15);';

        rowsHTML += `
      <tr class="${isOff ? 'off-row' : ''}" style="${rowStyle}">
        <td class="lq-cell">${cue.lq_number || '—'}${trackHTML(cue, showTracks)}</td>
        ${isIgnored ? `
          <td colspan="7" style="position:relative;padding:0;">
            <table style="width:100%;opacity:0.2;">
              <tr>
                <td class="action-cell">
                  ${sc.action ? `<div class="action-inner">${getActionIconHTML(sc.action, 34, customActions)}<span class="action-name">${sc.action}</span></div>` : ''}
                </td>
                <td class="char-cell">${char ? char.name : sc.custom_character ? sc.custom_character : ''}</td>
                <td class="int-iris-cell">
                  <div class="int-val" style="font-size:11pt;font-weight:700;">${sc.intensity || ''}</div>
                  <div class="iris-val" style="font-size:10pt;">${sc.frame_size || ''}</div>
                </td>
                <td class="frames-cell"${colorChanged.has(cue.id) ? ` style="background:${COLOR_CHANGE_BG}"` : ''}>${sc.no_color ? 'NC' : (activeFrames || '')}</td>
                <td class="time-cell">${sc.fade_time ? sc.fade_time + 's' : ''}</td>
                <td class="when-cell" style="${lineHighlightCSS(sc.when_highlight)}">${whenText(sc, cue)}</td>
                <td class="notes-cell" style="${lineHighlightCSS(sc.notes_highlight)}">${safeRich(sc.notes)}</td>
              </tr>
            </table>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20pt;font-weight:900;color:#1a1a1a;letter-spacing:0.3em;">— IGNORE —</div>
          </td>
        ` : isOff ? `
          <td colspan="7" style="text-align:center;vertical-align:middle;padding:8px;font-size:11pt;font-weight:600;color:#aaa;">Off</td>
        ` : `
        <td class="action-cell">
          ${sc.action ? `
            <div class="action-inner">
              ${getActionIconHTML(sc.action, 34, customActions)}
              <span class="action-name">${sc.action}</span>
            </div>
          ` : '<span class="empty">—</span>'}
        </td>
        <td class="char-cell">${char ? char.name : sc.custom_character ? sc.custom_character : '—'}</td>
        <td class="int-iris-cell">
          <div class="int-val" style="font-size:11pt;font-weight:700;color:#1a1a1a;">${sc.intensity || '—'}</div>
          <div class="iris-val" style="font-size:10pt;color:#333;">${sc.frame_size || '—'}</div>
        </td>
        <td class="frames-cell"${colorChanged.has(cue.id) ? ` style="background:${COLOR_CHANGE_BG}"` : ''}>${sc.no_color ? 'NC' : (activeFrames || '—')}</td>
        <td class="time-cell">${sc.fade_time ? sc.fade_time + 's' : '—'}</td>
        <td class="when-cell" style="${lineHighlightCSS(sc.when_highlight)}">${whenText(sc, cue)}</td>
        <td class="notes-cell" style="${lineHighlightCSS(sc.notes_highlight)}">${safeRich(sc.notes)}</td>
        `}
      </tr>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
  
  @page {
    size: ${isLandscape ? '11in 8.5in' : '8.5in 11in'};
    margin: 0.45in 0.4in 0.4in 0.4in;
  }

  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 12pt;
    color: #1a1a1a;
    background: white;
  }

  .header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 2.5px solid #1a1a1a;
  }

  .header-logo-placeholder {
    width: 64px;
    height: 64px;
    background: #f0f0f0;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8pt;
    color: #999;
    flex-shrink: 0;
    align-self: flex-start;
  }

  .header-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .show-title {
    font-size: 22pt;
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1;
  }

  .header-team {
    font-size: 8.5pt;
    color: #555;
    line-height: 1.5;
  }

  .spot-card {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #f5f5f5;
    border: 1.5px solid #ddd;
    border-radius: 8px;
    padding: 6px 12px;
    margin-top: 2px;
  }

  .spot-number {
    font-size: 16pt;
    font-weight: 800;
    color: #1a1a1a;
    padding-right: 10px;
    border-right: 1.5px solid #ccc;
  }

  .spot-details {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .spot-operator {
    font-size: 11pt;
    font-weight: 700;
    color: #1a1a1a;
  }

  .spot-meta {
    font-size: 8pt;
    color: #666;
  }

  .header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
  }

  .print-label {
    font-size: 14pt;
    font-weight: 800;
    color: #1a1a1a;
  }

  .print-date {
    font-size: 8.5pt;
    color: #888;
  }

  .gel-frames {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .gel-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 3px 7px;
    min-width: 46px;
    max-width: 80px;
    overflow: hidden;
  }

  .gel-slot.perm {
    background: #fffbe6;
    border-color: #f0c040;
  }

  .gel-label {
    font-size: 7pt;
    color: #888;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .gel-num {
    font-size: 9.5pt;
    font-weight: 700;
    color: #1a1a1a;
  }

  .gel-name {
    font-size: 7pt;
    color: #555;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 74px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12pt;
  }

  thead th {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #555;
    padding: 5px 7px;
    border-bottom: 1.5px solid #1a1a1a;
    text-align: left;
    white-space: nowrap;
  }

  tbody tr {
    border-bottom: 0.75px solid #e0e0e0;
    /* A cue never splits across pages: if it doesn't fit, the whole cue moves to the next page */
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Keep a scene title with its first cue */
  tr.scene-row {
    break-after: avoid;
    page-break-after: avoid;
  }

  tbody tr:nth-child(even) {
    background: #fafafa;
  }

  tbody td {
    padding: 8px 7px;
    vertical-align: middle;
    line-height: 1.3;
  }

  .scene-row td {
    background: #1a1a1a;
    color: white;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 5px 10px;
  }

  .off-row td {
    background: #f2f2f2;
    color: #bbb;
  }

  .off-row .action-inner {
    opacity: 0.35;
  }

  .lq-cell {
    font-size: 16pt;
    font-weight: 800;
    color: #1a1a1a;
    width: 56px;
    white-space: nowrap;
  }

  .track-num { font-size: 7pt; font-weight: 600; color: #9a9a9a; line-height: 1.2; margin-top: 1px; }

  .action-cell {
    width: 130px;
  }

  .action-inner {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .action-name {
    font-size: 11pt;
    font-weight: 700;
    color: #1a1a1a;
  }

  .char-cell {
    font-size: 13pt;
    font-weight: 800;
    color: #1a1a1a;
    width: 120px;
  }

  .int-iris-cell {
    width: 72px;
    vertical-align: middle;
  }

  .frames-cell {
    font-size: 10pt;
    color: #333;
    width: 72px;
  }

  .time-cell {
    font-size: 11pt;
    font-weight: 700;
    width: 44px;
    color: #1a1a1a;
  }

  .when-cell {
    font-size: 10pt;
    color: #333;
    width: 120px;
  }

  .notes-cell {
    font-size: 10pt;
    color: #555;
    font-style: italic;
    min-width: 140px;
  }

  .empty { color: #ccc; }
  ${hiddenFieldCSS(cueFields, {
    action: '.action-cell, th.col-action', character: '.char-cell, th.col-char',
    intensity: '.int-val', iris: '.iris-val', intIris: '.int-iris-cell, th.col-intiris',
    color: '.frames-cell, th.col-color', time: '.time-cell, th.col-time',
    when: '.when-cell, th.col-when', notes: '.notes-cell, th.col-notes',
  })}
</style>
</head>
<body>
<div class="header">
  ${logoHTML}
  <div class="header-main">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;">
      <div class="show-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;">${show.title}</div>
      <div class="header-right" style="flex-shrink:0;">
        <div class="print-label">${label || 'Spot Sheet'}</div>
        <div class="print-date">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
      </div>
    </div>
    <div class="header-team" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">
      ${[
        show.designer ? `LD: ${show.designer}` : '',
        show.associate_ld ? `Assoc: ${show.associate_ld}` : '',
        show.assistant_ld ? `Asst: ${show.assistant_ld}` : '',
      ].filter(Boolean).join(' &nbsp;·&nbsp; ')}
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <div class="spot-card" style="flex-shrink:0;">
        <div class="spot-number">SPOT ${spot.spot_number}</div>
        <div class="spot-details">
          <div class="spot-operator">${spot.operator_name || 'Operator TBD'}</div>
          <div class="spot-meta">${[spot.location, spot.fixture_type].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <div class="gel-frames" style="flex:1;flex-wrap:nowrap;overflow:hidden;">
        ${gelFramesHTML}
        ${permHTML}
      </div>
    </div>
  </div>
</div>

  <table>
    <thead>
<tr>
        <th>LQ</th>
        <th class="col-action">Action</th>
        <th class="col-char">Character</th>
        <th class="col-intiris">${(() => { const f = cueFieldSettings(cueFields); return f.intensity.print && f.iris.print ? 'Int / Iris' : f.intensity.print ? 'Int' : 'Iris'; })()}</th>
        <th class="col-color">Color</th>
        <th class="col-time">Time</th>
        <th class="col-when">When</th>
        <th class="col-notes">Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>
</body>
</html>`;
}

function buildCallerSheetHTML({ cueFields, show, spots, colorSlotsBySpot, cues, spotCuesBySpot, characters, scenes, label, customActions, showTracks = true }) {
  let logoBase64 = '';
  if (show.logo_path) {
    try {
      const fs = require('fs');
      const data = fs.readFileSync(show.logo_path);
      const ext = show.logo_path.split('.').pop().toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      logoBase64 = `data:${mime};base64,${data.toString('base64')}`;
    } catch(e) {}
  }
  const isLandscape = spots.length > 2;
  const sceneMap = {};
  scenes.forEach(s => { sceneMap[s.id] = s; });
  const charMap = {};
  characters.forEach(c => { charMap[c.id] = c; });

  const sceneOrderMap = {};
  scenes.forEach((s, i) => { sceneOrderMap[s.id] = i; });
  
  const sortedCues = [...cues].sort((a, b) => {
    const sceneA = sceneOrderMap[a.scene_id] ?? 999;
    const sceneB = sceneOrderMap[b.scene_id] ?? 999;
    if (sceneA !== sceneB) return sceneA - sceneB;
    return a.sort_order - b.sort_order;
  });
  const colorChangedBySpot = {};
  for (const spot of spots) colorChangedBySpot[spot.id] = colorChangeCues(sortedCues, spotCuesBySpot[spot.id] || []);
  const printFields = cueFieldSettings(cueFields);

  const spotsHeaderHTML = spots.map(spot => {
    const slots = (colorSlotsBySpot[spot.id] || []).filter(s => !s.is_permanent);
    const perm = (colorSlotsBySpot[spot.id] || []).find(s => s.is_permanent && (s.gel_number || s.gel_name));
    const gelHTML = slots.map(slot => `
      <div class="gel-slot">
        <span class="gel-label">F${slot.slot_number}</span>
        <span class="gel-num">${slot.gel_number || '—'}</span>
      </div>
    `).join('') + (perm ? `
      <div class="gel-slot perm">
        <span class="gel-label">PERM</span>
        <span class="gel-num">${perm.gel_number || perm.gel_name}</span>
      </div>` : '');
    return `
      <div class="spot-header-card">
        <div class="spot-header-top">
          <span class="spot-number">SPOT ${spot.spot_number}</span>
          <span class="spot-operator">${spot.operator_name || 'TBD'}</span>
        </div>
        <div class="spot-meta">${[spot.location, spot.fixture_type].filter(Boolean).join(' · ')}</div>
        <div class="gel-frames">${gelHTML}</div>
      </div>
    `;
  }).join('');

  const colSpan = spots.length;

  let rowsHTML = '';
  let currentSceneId = 'NONE';

  for (const cue of sortedCues) {
    if (cue.scene_id !== currentSceneId) {
      currentSceneId = cue.scene_id;
      const scene = sceneMap[cue.scene_id];
      if (scene) {
        rowsHTML += `
          <tr class="scene-row">
            <td colspan="${colSpan + 1}">${scene.label}${scene.song ? ' · ' + scene.song : ''}</td>
          </tr>
        `;
      }
    }

    let spotCellsHTML = '';
    for (const spot of spots) {
      const spotCues = spotCuesBySpot[spot.id] || [];
      const sc = spotCues.find(sc => sc.cue_id === cue.id);
      const isOff = !sc || sc.action === 'Off';
      const char = sc ? charMap[sc.character_id] : null;
      const activeFrames = sc && sc.active_frames ? sc.active_frames.split(',').filter(Boolean).join('+') : '';

      if (isOff) {
        spotCellsHTML += `
          <td class="spot-cell off-cell">
            <div class="off-inner">
              ${actionIconSVG('Off', 18)}
              <span class="off-label">Off</span>
            </div>
          </td>
        `;
      } else {
        const isIgnored = sc.ignored === 1;
        const highlight = sc.highlight;
        let cellStyle = '';
        if (highlight === 'yellow') cellStyle = 'background:rgba(200,160,0,0.15);';
        if (highlight === 'red') cellStyle = 'background:rgba(200,60,60,0.15);';
        if (isIgnored) cellStyle = 'background:rgba(220,220,220,0.3);';

        spotCellsHTML += `
          <td class="spot-cell" style="${cellStyle}position:relative;">
            ${isIgnored ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14pt;font-weight:900;color:#1a1a1a;letter-spacing:0.2em;z-index:2;">— IGNORE —</div>` : ''}
            <div style="${isIgnored ? 'opacity:0.2;' : ''}">
              <div class="action-inner" style="margin-bottom:0;align-items:center;">
                ${getActionIconHTML(sc.action, 30, customActions)}
                <span class="action-name">${sc.action || '—'}</span>
                <span class="char-name" style="margin-left:4px;">${char ? char.name : sc.custom_character ? sc.custom_character : '—'}</span>
                <div class="intensity-badge" style="margin-left:auto;">${sc.intensity ? `<span style="font-size:11pt;font-weight:400;color:#666;">@</span>${sc.intensity}` : ''}</div>
              </div>
              ${(() => {
                // Iris / color / time in one labeled strip; fields hidden on print are left out entirely
                const colorText = sc.no_color ? 'NC' : activeFrames;
                const colorHL = colorChangedBySpot[spot.id].has(cue.id) ? `background:${COLOR_CHANGE_BG};` : '';
                const items = [
                  printFields.iris.print && sc.frame_size ? `<span class="detail-badge iris"><span class="lbl">Iris</span>${sc.frame_size}</span>` : '',
                  printFields.color.print && colorText ? `<span class="detail-badge color" style="${colorHL}"><span class="lbl">Color</span>${colorText}</span>` : '',
                  printFields.time.print && sc.fade_time ? `<span class="detail-badge time"><span class="lbl">Time</span>${sc.fade_time}s</span>` : '',
                ].filter(Boolean);
                return items.length ? `<div class="cue-details">${items.join('')}</div>` : '';
              })()}
              ${(() => {
                // When and Notes share one box, one labeled row each
                const rows = [
                  printFields.when.print && whenText(sc, cue) ? `<div class="say-row when-text" style="${lineHighlightCSS(sc.when_highlight)}"><span class="lbl">When</span><span>${whenText(sc, cue)}</span></div>` : '',
                  printFields.notes.print && safeRich(sc.notes) ? `<div class="say-row notes-text" style="${lineHighlightCSS(sc.notes_highlight)}"><span class="lbl">Note</span><span>${safeRich(sc.notes)}</span></div>` : '',
                ].filter(Boolean);
                return rows.length ? `<div class="say-box">${rows.join('')}</div>` : '';
              })()}
            </div>
          </td>
        `;
      }
    }

    rowsHTML += `
      <tr class="cue-row">
        <td class="lq-cell">${cue.lq_number || '—'}${trackHTML(cue, showTracks)}</td>
        ${spotCellsHTML}
      </tr>
    `;
  }

  const spotColHeaders = spots.map(spot => `
    <th class="spot-col-header" style="width:calc((100% - 48px) / ${spots.length})">SPOT ${spot.spot_number} · ${spot.operator_name || 'TBD'}</th>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: ${isLandscape ? '11in 8.5in' : '8.5in 11in'};
    margin: 0.3in 0.3in 0.3in 0.3in;
  }

  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    color: #1a1a1a;
    background: white;
  }

  .header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .header-logo {
    width: 52px;
    height: 52px;
    object-fit: contain;
    border-radius: 6px;
    flex-shrink: 0;
    align-self: flex-start;
  }

  .header-logo-placeholder {
    width: 52px;
    height: 52px;
    background: #f0f0f0;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .header-main { flex: 1; }

  .show-title {
    font-size: 18pt;
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1;
    margin-bottom: 2px;
  }

  .header-team {
    font-size: 8pt;
    color: #555;
  }

  .header-right { text-align: right; flex-shrink: 0; }

  .print-label {
    font-size: 13pt;
    font-weight: 800;
    color: #1a1a1a;
  }

  .print-date {
    font-size: 8pt;
    color: #888;
    margin-top: 2px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11pt;
    table-layout: fixed;
  }

  thead th {
    font-size: 8pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #fff;
    background: #1a1a1a;
    padding: 5px 8px;
    text-align: left;
  }

  thead th:first-child {
    width: 48px;
    text-align: center;
  }

  thead th.spot-col-header {
    width: calc((100% - 48px) / ${spots.length});
    border-left: 2px solid #444;
  }

  tbody tr {
    border-bottom: 1.5px solid #d0d0d0;
  }

  /* Keep a scene title with its first cue */
  tr.scene-row {
    break-after: avoid;
    page-break-after: avoid;
  }

  tbody tr:nth-child(even) { background: #f8f8f8; }

  .lq-cell {
    font-size: 13pt;
    font-weight: 900;
    color: #1a1a1a;
    width: 56px;
    min-width: 56px;
    max-width: 56px;
    padding: 5px 4px;
    vertical-align: middle;
    text-align: center;
    border-right: 2px solid #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
  }

  .track-num { font-size: 7pt; font-weight: 600; color: #9a9a9a; line-height: 1.2; margin-top: 1px; }

  .spot-cell {
    padding: 5px 8px;
    vertical-align: top;
    border-left: 2px solid #ddd;
  }

  tr.cue-row {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .off-cell {
    background: #f0f0f0;
    vertical-align: middle;
    text-align: center;
  }

  .off-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    opacity: 0.4;
  }

  .off-label {
    font-size: 13pt;
    font-weight: 700;
    color: #666;
  }

  .cell-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 4px;
  }

  .action-char { flex: 1; }

  .action-inner {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }

  .action-name {
    font-size: 11pt;
    font-weight: 800;
    color: #1a1a1a;
    line-height: 1;
  }

  .char-name {
    font-size: 13pt;
    font-weight: 900;
    color: #1a1a1a;
    line-height: 1;
    vertical-align: middle;
  }

  .intensity-badge {
    font-size: 16pt;
    font-weight: 900;
    color: #1a1a1a;
    white-space: nowrap;
    padding-left: 4px;
    line-height: 1;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  /* Small gray caps label in front of a value */
  .spot-cell .lbl {
    font-size: 6.5pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #8a8a8a;
    font-style: normal;
  }

  /* Iris / color / time: one white strip, items split by hairlines.
     Only a color change gets a fill, so it pops. */
  .cue-details {
    display: inline-flex;
    margin-top: 4px;
    background: #fff;
    border: 1px solid #bdbdbd;
    border-radius: 6px;
    overflow: hidden;
  }

  .detail-badge {
    display: flex;
    align-items: baseline;
    gap: 5px;
    padding: 1px 8px;
    font-size: 10.5pt;
    font-weight: 800;
    color: #1a1a1a;
  }

  .detail-badge + .detail-badge { border-left: 1px solid #dcdcdc; }

  /* When / Notes: one white box, a labeled row each */
  .say-box {
    margin-top: 4px;
    background: #fff;
    border: 1px solid #bdbdbd;
    border-radius: 6px;
    overflow: hidden;
  }

  .say-row {
    display: grid;
    grid-template-columns: 36px 1fr;
    align-items: baseline;
    padding: 1px 8px;
    font-size: 10pt;
    border-radius: 0 !important;
  }

  .say-row + .say-row { border-top: 1px solid #e3e3e3; }

  .when-text { font-weight: 700; color: #1a1a1a; }
  .notes-text { font-weight: 400; color: #333; }

  .scene-row td {
    background: #1a1a1a;
    color: white;
    font-size: 9pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 5px 10px;
  }

  /* Each spot's color load sits centered over its own column (first column = LQ) */
  .spots-header-row {
    display: grid;
    grid-template-columns: 48px repeat(${spots.length}, 1fr);
    column-gap: 0;
    margin-top: 6px;
    padding-bottom: 8px;
    margin-bottom: 8px;
    border-bottom: 3px solid #1a1a1a;
  }

  .spot-header-card {
    justify-self: center;
    max-width: calc(100% - 8px);
    background: #f5f5f5;
    border: 1.5px solid #ddd;
    border-radius: 6px;
    padding: 5px 8px;
  }

  .spot-header-top {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 2px;
  }

  .spot-number { font-size: 11pt; font-weight: 800; }
  .spot-operator { font-size: 10pt; font-weight: 600; color: #444; }
  .spot-meta { font-size: 7pt; color: #888; margin-bottom: 3px; }

  .gel-frames { display: flex; gap: 3px; flex-wrap: wrap; }

  .gel-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: white;
    border: 0.75px solid #ddd;
    border-radius: 3px;
    padding: 2px 4px;
    min-width: 32px;
  }

  .gel-slot.perm { border-color: #E3C04A; background: #FFF8DC; }
  .gel-label { font-size: 6pt; color: #aaa; font-weight: 700; }
  .gel-slot.perm .gel-label { color: #A8871E; }
  .gel-num { font-size: 8pt; font-weight: 800; color: #1a1a1a; }
  .gel-name { font-size: 6pt; color: #777; text-align: center; white-space: nowrap; overflow: hidden; max-width: 44px; text-overflow: ellipsis; }
  ${hiddenFieldCSS(cueFields, {
    action: '.spot-cell .action-inner > svg, .spot-cell .action-inner > img, .spot-cell .action-name',
    character: '.spot-cell .char-name', intensity: '.spot-cell .intensity-badge',
    iris: '.spot-cell .detail-badge.iris', color: '.spot-cell .detail-badge.color', time: '.spot-cell .detail-badge.time',
    when: '.spot-cell .when-text', notes: '.spot-cell .notes-text',
  })}
</style>
</head>
<body>
  <div class="header">
    ${show.logo_path ? `<img class="header-logo" src="${logoBase64}" />` : `<div class="header-logo-placeholder"></div>`}
    <div class="header-main">
      <div class="show-title">${show.title}</div>
      <div class="header-team" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${[
          show.designer ? `LD: ${show.designer}` : '',
          show.associate_ld ? `Assoc: ${show.associate_ld}` : '',
          show.assistant_ld ? `Asst: ${show.assistant_ld}` : '',
        ].filter(Boolean).join(' &nbsp;·&nbsp; ')}
      </div>
    </div>
    <div class="header-right">
      <div class="print-label">${label || 'Caller Sheet'}</div>
      <div class="print-date">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    </div>
  </div>
  <div class="spots-header-row">
    <div></div>
    ${spotsHeaderHTML}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:48px">LQ</th>
        ${spotColHeaders}
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>
</body>
</html>`;
}

function buildColorLoadHTML({ show, spots, colorSlotsBySpot, label }) {
  let logoBase64 = '';
  if (show.logo_path) {
    try {
      const fs = require('fs');
      const data = fs.readFileSync(show.logo_path);
      const ext = show.logo_path.split('.').pop().toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      logoBase64 = `data:${mime};base64,${data.toString('base64')}`;
    } catch(e) {}
  }
  const isLandscape = spots.length > 2;

  const GEL_COLORS = {
  // ROSCO ROSCOLUX
  'R00': '#F8F8F8',
  'R01': '#F5DFA0', 'R02': '#F0C060', 'R03': '#F5E090', 'R04': '#EDB84A',
  'R05': '#F5C8C0', 'R06': '#FAEEC0', 'R07': '#FAEEC0', 'R08': '#F5D878',
  'R09': '#F0C050', 'R10': '#F5E060', 'R11': '#F5E8A0', 'R12': '#F5E060',
  'R13': '#FAEEC0', 'R14': '#F0D060', 'R15': '#E8B840', 'R16': '#F5C84A',
  'R17': '#F5A030', 'R18': '#F08020', 'R19': '#E06010', 'R20': '#E09030',
  'R21': '#E8A020', 'R22': '#D07010', 'R23': '#E07010', 'R24': '#D03020',
  'R25': '#E05020', 'R26': '#D04030', 'R27': '#C02020', 'R28': '#C01010',
  'R30': '#F5D0C0', 'R31': '#F0C0A0', 'R32': '#F0A8A0', 'R33': '#F5D0D0',
  'R34': '#F0C8B8', 'R35': '#F0C8B8', 'R36': '#F0A8A0', 'R37': '#F0C0C8',
  'R38': '#F0A0B0', 'R39': '#E890A0', 'R40': '#F0B090', 'R41': '#E8A080',
  'R42': '#E09080', 'R43': '#E870A0', 'R44': '#D06080', 'R45': '#C84070',
  'R46': '#C03070', 'R47': '#C0A0D0', 'R48': '#B080C0', 'R49': '#9060B0',
  'R50': '#C090B0', 'R51': '#F0D0E0', 'R52': '#D0C0E0', 'R53': '#E0D0F0',
  'R54': '#D8C8E8', 'R55': '#C8B0D8', 'R56': '#A870C0', 'R57': '#B0A0D0',
  'R58': '#9070B0', 'R59': '#503080', 'R60': '#D0E0F8', 'R61': '#C0D8F0',
  'R62': '#B0C8E8', 'R63': '#A0C0E8', 'R64': '#90B0D8', 'R65': '#6090C8',
  'R66': '#80B0D0', 'R67': '#70A8D0', 'R68': '#5090C0', 'R69': '#4878B0',
  'R70': '#60A0B8', 'R71': '#5090A8', 'R72': '#4080A0', 'R73': '#307898',
  'R74': '#203870', 'R75': '#304880', 'R76': '#6090A8', 'R77': '#508090',
  'R78': '#4878B0', 'R79': '#2040A0', 'R80': '#1030C0', 'R81': '#304880',
  'R82': '#2040B0', 'R83': '#3060A0', 'R84': '#2048A0', 'R85': '#102080',
  'R86': '#608050', 'R87': '#C0D880', 'R88': '#90C070', 'R89': '#708050',
  'R90': '#90A040', 'R91': '#208030', 'R92': '#308080', 'R93': '#206050',
  'R94': '#208030', 'R95': '#306040', 'R96': '#90C020', 'R97': '#C8C8C8',
  'R98': '#A0A0A0', 'R99': '#704030',
  // ROSCO 300-series
  'R303': '#F5D0A0', 'R304': '#F5C890', 'R305': '#F5C0A8', 'R310': '#F5E060',
  'R312': '#F5E040', 'R313': '#F5D840', 'R316': '#F0B060', 'R317': '#F0A860',
  'R318': '#F0907A', 'R321': '#E8A840', 'R324': '#D04020', 'R331': '#F0C8B0',
  'R332': '#F090B0', 'R333': '#F5C8C8', 'R336': '#F0B0C0', 'R339': '#D060A0',
  'R342': '#E060A0', 'R343': '#E050A0', 'R344': '#E860B0', 'R346': '#C040A0',
  'R347': '#A040A0', 'R348': '#806090', 'R349': '#C040A0', 'R351': '#D0C0E0',
  'R353': '#C0A8D8', 'R355': '#B0A0D0', 'R356': '#B098C8', 'R357': '#9878C0',
  'R358': '#8060A0', 'R359': '#6050A0', 'R360': '#D8E8F8', 'R362': '#90B8D8',
  'R363': '#90C8D0', 'R364': '#80B0D8', 'R365': '#6098C8', 'R366': '#70A8C8',
  'R367': '#6090B8', 'R369': '#4070B8', 'R370': '#3060A8', 'R371': '#A0C0E0',
  'R372': '#90B8D8', 'R373': '#80A8C8', 'R374': '#308898', 'R376': '#5090A8',
  'R377': '#9880C0', 'R378': '#8090C8', 'R382': '#1020A0', 'R383': '#3050A0',
  'R384': '#2038A0', 'R385': '#1830A0', 'R386': '#408040', 'R388': '#90A030',
  'R389': '#40A020', 'R392': '#308898', 'R393': '#208840', 'R395': '#308878',
  'R397': '#C0C8D0', 'R398': '#A8B0B8',
  // ROSCO Frosts & Diffusions - all appear as near-white/translucent
  'R100': '#F0F0F0', 'R101': '#F4F4F4', 'R102': '#F4F4F4', 'R103': '#EFEFEF',
  'R104': '#F2F2F2', 'R105': '#F0F0F0', 'R106': '#F4F4F4', 'R107': '#EBEBEB',
  'R108': '#F8F8F8', 'R109': '#F0F0F0', 'R110': '#F2F2F2', 'R111': '#EFEFEF',
  'R112': '#F2F2F2', 'R113': '#F0F0F0', 'R114': '#ECECEC', 'R115': '#C8E8C8',
  'R116': '#F8F8F8', 'R117': '#F5F5F5', 'R119': '#F0F0F0', 'R120': '#F0C8C8',
  'R121': '#C8D8F0', 'R122': '#C8E8C8', 'R124': '#E8B8B8', 'R125': '#B8C8E8',
  'R126': '#B8E0B8', 'R127': '#F0D8A0', 'R132': '#F4F4F4',
  // ROSCO Cinegel CTB
  'R3202': '#6090D0', 'R3203': '#7098C8', 'R3204': '#80A8D0', 'R3206': '#90B0D8',
  'R3208': '#A0C0E0', 'R3216': '#C0D8F0', 'R3220': '#4070C0',
  // ROSCO Cinegel CTO
  'R3401': '#E09030', 'R3407': '#E8A030', 'R3408': '#F0B848', 'R3409': '#F5CC70',
  'R3410': '#F8E098',
  // ROSCO Cinegel Plus/Minus Green
  'R3304': '#80C060', 'R3308': '#C080C0', 'R3313': '#D0A0D0', 'R3314': '#E0C0E0',
  'R3315': '#A0D080', 'R3316': '#C0E0A0',
  // ROSCO Cinegel Diffusions
  'R3000': '#EBEBEB', 'R3006': '#F0F0F0', 'R3007': '#F4F4F4', 'R3008': '#F8F8F8',
  'R3010': '#EFEFEF', 'R3012': '#F4F4F4', 'R3014': '#F0F0F0', 'R3020': '#F2F2F2',
  'R3021': '#F5F5F5', 'R3026': '#F0F0F0', 'R3027': '#ECECEC', 'R3028': '#E8E8E8',
  'R3029': '#F8F8F8', 'R3030': '#FFFFFF',
  // LEE FILTERS
  'L001': '#FAEEC0', 'L002': '#F5D890', 'L003': '#F5E090', 'L004': '#EDB84A',
  'L005': '#F5C8C0', 'L006': '#FAEEC0', 'L008': '#F5D878', 'L009': '#F0C050',
  'L010': '#F5E060', 'L013': '#FAEEC0', 'L015': '#E8B840', 'L016': '#F5C84A',
  'L017': '#F5A030', 'L018': '#F08020', 'L019': '#E06010', 'L020': '#E09030',
  'L021': '#E8A020', 'L022': '#D07010', 'L023': '#E07010', 'L024': '#D03020',
  'L025': '#E05020', 'L026': '#D04030', 'L027': '#C02020',
  'L030': '#F5D0C0', 'L031': '#F0C0A0', 'L032': '#F0A8A0', 'L033': '#F5D0D0',
  'L034': '#F0C8B8', 'L035': '#F0C8B8', 'L036': '#F0A8A0', 'L037': '#F0C0C8',
  'L038': '#F0A0B0', 'L039': '#E890A0', 'L040': '#F0B090', 'L041': '#E8A080',
  'L042': '#E09080', 'L043': '#E870A0', 'L044': '#D06080', 'L045': '#C84070',
  'L046': '#C03070', 'L047': '#C0A0D0', 'L048': '#B080C0', 'L049': '#9060B0',
  'L050': '#C090B0', 'L051': '#D0C0E0', 'L052': '#D0C0E0', 'L053': '#E0D0F0',
  'L054': '#D8C8E8', 'L055': '#C8B0D8', 'L057': '#B0A0D0', 'L058': '#9070B0',
  'L059': '#503080', 'L061': '#C0D8F0', 'L062': '#B0C8E8', 'L063': '#A0C0E8',
  'L064': '#90B0D8', 'L065': '#6090C8', 'L066': '#80B0D0', 'L067': '#70A8D0',
  'L068': '#5090C0', 'L069': '#4878B0', 'L070': '#60A0B8', 'L071': '#5090A8',
  'L072': '#4080A0', 'L073': '#307898', 'L074': '#203870', 'L075': '#304880',
  'L079': '#2040A0', 'L080': '#1030C0', 'L081': '#304880', 'L082': '#2040B0',
  'L083': '#3060A0', 'L085': '#102080', 'L086': '#608050', 'L088': '#90C070',
  'L089': '#708050', 'L091': '#208030', 'L092': '#308080', 'L094': '#208030',
  'L096': '#90C020', 'L099': '#704030',
  // LEE Frosts
  'L100': '#F0F0F0', 'L101': '#F4F4F4', 'L102': '#F4F4F4', 'L103': '#EFEFEF',
  'L104': '#F2F2F2', 'L105': '#F0F0F0', 'L106': '#F4F4F4', 'L107': '#EBEBEB',
  'L108': '#F8F8F8', 'L110': '#F0F0F0', 'L111': '#EFEFEF', 'L112': '#F2F2F2',
  'L113': '#F0F0F0', 'L114': '#ECECEC', 'L129': '#E8E8E8', 'L216': '#F8F8F8',
  'L220': '#F8F8F8', 'L226': '#F0F0F0', 'L227': '#F5F5F5', 'L228': '#F2F2F2',
  'L229': '#E8E8E8', 'L230': '#FFFFFF', 'L231': '#EBEBEB', 'L236': '#ECECEC',
  'L238': '#F2F2F2', 'L239': '#F0F0F0', 'L241': '#F0F0F0', 'L261': '#EFEFEF',
  'L262': '#F0F0F0',
  // LEE Color Corrections
  'L200': '#6090D0', 'L201': '#4070C0', 'L202': '#6090C8', 'L203': '#80B0D8',
  'L204': '#E09030', 'L205': '#F0B848', 'L206': '#F5CC70', 'L207': '#F8E090',
  'L109': '#C09060', 'L119': '#102080', 'L120': '#102060', 'L131': '#204060',
  'L134': '#E8A020', 'L147': '#F0B878', 'L148': '#E870A0', 'L149': '#D03020',
  'L150': '#B0D0F0', 'L156': '#704030', 'L157': '#F0A8A0', 'L158': '#D06010',
  'L160': '#7088B0', 'L161': '#6080A8', 'L162': '#F0C060', 'L164': '#D04020',
  'L165': '#5888B8', 'L170': '#9070B0', 'L172': '#3070A0', 'L176': '#E8A840',
  'L179': '#E07820', 'L180': '#8060A0', 'L181': '#101850', 'L182': '#D04030',
  'L183': '#3060A8', 'L193': '#E0A878', 'L194': '#F090B0', 'L195': '#2050A0',
  'L196': '#2048A0', 'L199': '#1828A0',
  // GAM GAMCOLOR
  'G100': '#C03070', 'G105': '#F0A0C0', 'G110': '#F0B0C0', 'G115': '#F0D0E0',
  'G120': '#E890A0', 'G125': '#F0A0B0', 'G130': '#E890A0', 'G135': '#D06080',
  'G140': '#F5D0E0', 'G145': '#F0C0D0', 'G150': '#E8A0C0', 'G155': '#D870A0',
  'G160': '#D04090', 'G165': '#C030A0', 'G170': '#D0C0E0', 'G175': '#E0D0F0',
  'G180': '#B0A0D0', 'G185': '#9070B0', 'G190': '#8060A0',
  'G200': '#D03020', 'G205': '#D04030', 'G210': '#C02020', 'G215': '#B01010',
  'G220': '#A01010', 'G225': '#900808', 'G230': '#F5D0C0', 'G235': '#F0C0A0',
  'G240': '#E8A880', 'G245': '#E09070', 'G250': '#F0C8B8', 'G255': '#F0C0C8',
  'G260': '#F0A0B0', 'G265': '#E890A0', 'G270': '#D06080', 'G275': '#C03060',
  'G280': '#A02050', 'G285': '#C040A0',
  'G300': '#FAEEC0', 'G305': '#F5E090', 'G310': '#F0C8B0', 'G315': '#F5C84A',
  'G320': '#E8A020', 'G325': '#D07010', 'G330': '#C06010', 'G335': '#E8A020',
  'G340': '#E07010', 'G345': '#D06010', 'G350': '#C05010', 'G355': '#F5A030',
  'G360': '#F08020', 'G365': '#F09050', 'G370': '#F0A060', 'G375': '#F0B878',
  'G380': '#F0B090', 'G385': '#F0A080', 'G390': '#F5C0A0',
  'G400': '#FAEEC0', 'G405': '#F5E8A0', 'G410': '#F5E060', 'G415': '#F0D840',
  'G420': '#E8C820', 'G425': '#E8A820', 'G430': '#F5D878', 'G435': '#F0C860',
  'G440': '#FAEEC0', 'G445': '#FAEEC0', 'G450': '#F0E840', 'G455': '#D8E040',
  'G500': '#D8E890', 'G505': '#C8E070', 'G510': '#B0D850', 'G515': '#90C030',
  'G520': '#80C020', 'G525': '#90D030', 'G530': '#70B828', 'G535': '#508040',
  'G540': '#608050', 'G545': '#707840', 'G550': '#909040',
  'G600': '#C0E8B0', 'G605': '#A0D890', 'G610': '#70C060', 'G615': '#50A840',
  'G620': '#308830', 'G625': '#207020', 'G630': '#208030', 'G635': '#209040',
  'G640': '#208878', 'G645': '#A0E0B0', 'G650': '#308080', 'G655': '#207040',
  'G660': '#186030', 'G665': '#208858',
  'G700': '#B0D8C0', 'G705': '#90C8A8', 'G710': '#60A888', 'G715': '#408878',
  'G720': '#307880', 'G725': '#286870', 'G730': '#90C8D0', 'G735': '#307898',
  'G740': '#3070A0', 'G745': '#5090A8', 'G750': '#40C0D0', 'G755': '#2090A0',
  'G800': '#C0D8F0', 'G805': '#A0C8E8', 'G810': '#70A8D0', 'G815': '#5090C0',
  'G820': '#6090C8', 'G825': '#6080B0', 'G830': '#3060A8', 'G835': '#2040A0',
  'G840': '#102080', 'G845': '#203870', 'G850': '#101850', 'G855': '#2038A0',
  'G860': '#1030C0', 'G865': '#304880', 'G870': '#C0D8F0', 'G875': '#B0D0F0',
  'G880': '#D0E0F8', 'G885': '#B0C8E8',
  'G900': '#B0A0D0', 'G905': '#C0B0D8', 'G910': '#9070B0', 'G915': '#8060A8',
  'G920': '#7050A0', 'G925': '#6040A0', 'G930': '#503080', 'G935': '#502878',
  'G940': '#C090B0', 'G945': '#B0A0D0', 'G950': '#C8B0D8', 'G955': '#B080C0',
  // GAM Diffusions
  'G1505': '#F4F4F4', 'G1510': '#F0F0F0', 'G1515': '#E8E8E8', 'G1520': '#F2F2F2',
  'G1525': '#F0F0F0', 'G1530': '#F4F4F4', 'G1535': '#F0F0F0', 'G1540': '#ECECEC',
  'G1545': '#F5F5F5', 'G1550': '#F0F0F0', 'G1555': '#E8E8E8', 'G1560': '#EBEBEB',
  'G1565': '#F5F5F5', 'G1570': '#E8E8E8', 'G1575': '#EFEFEF', 'G1580': '#E8E8E8',
  'G1585': '#F8F8F8', 'G1590': '#D8D8D8', 'G1595': '#F8F8F8', 'G1600': '#FFFFFF',
};


  const getGelColor = (gelNum) => {
    if (!gelNum) return '#e0e0e0';
    const key = gelNum.split('+')[0].toUpperCase().replace(/\s/g, ''); // R02+R132 uses the first gel's color
    return GEL_COLORS[key] || '#d0d0d0';
  };

  const isDark = (hex) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return (r * 0.299 + g * 0.587 + b * 0.114) < 140;
  };

  const spotsHTML = spots.map(spot => {
    const slots = colorSlotsBySpot[spot.id] || [];
    const regularSlots = slots.filter(s => !s.is_permanent);
    const permSlot = slots.find(s => s.is_permanent);

    // One frame card. A frame with more than one gel (R02+R132) is split into stacked bands,
    // each in its own gel's color: the first gel on top, the next below, filling the same card.
    const frameCard = (slot, label, cls, emptyName) => {
      const nums = (slot.gel_number || '').split('+').map(x => x.trim()).filter(Boolean);
      const names = (slot.gel_name || '').split(' + ');
      const gels = nums.length > 1
        ? nums.map((n, i) => ({ num: n, name: names.length === nums.length ? names[i] : '' }))
        : [{ num: slot.gel_number || '—', name: slot.gel_name || emptyName }];
      const multi = gels.length > 1;
      const band = (g, i) => {
        const bg = getGelColor(multi ? g.num : slot.gel_number);
        const dark = isDark(bg);
        const sub = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
        const labelHTML = i === 0 ? `<div class="frame-label" style="color:${sub};">${label}</div>` : '';
        const num = `<div class="frame-gel-num" style="color:${dark ? '#ffffff' : '#1a1a1a'};">${g.num}</div>`;
        const name = `<div class="frame-gel-name" style="color:${sub};">${g.name || ''}</div>`;
        const check = i === gels.length - 1 ? `<div class="frame-check" style="border-color:${dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}"></div>` : '';
        // Several gels share one card: each band is a single line (number, name, and the checkbox on the last)
        return multi
          ? `<div class="frame-band" style="background:${bg};">${labelHTML}<div class="band-row">${num}${name}${check}</div></div>`
          : `<div class="frame-band" style="background:${bg};">${labelHTML}${num}${name}${check}</div>`;
      };
      return `<div class="${cls}${gels.length > 1 ? ' multi' : ''}">${gels.map(band).join('')}</div>`;
    };

    const framesHTML = regularSlots.map(slot => frameCard(slot, `Frame ${slot.slot_number}`, 'frame-card', 'Empty')).join('');
    const permHTML = permSlot && permSlot.gel_number ? frameCard(permSlot, 'Permanent', 'perm-card', '') : '';

    return `
      <div class="spot-card">
        <div class="spot-header">
          <div class="spot-left">
            <span class="spot-number">SPOT ${spot.spot_number}</span>
            <span class="spot-operator">${spot.operator_name || 'TBD'}</span>
          </div>
          <div class="spot-right">
            <div class="spot-detail">${spot.location || ''}</div>
            <div class="spot-detail">${spot.fixture_type || ''}</div>
          </div>
        </div>
        <div class="frames-grid">
          ${framesHTML}
          ${permHTML}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: ${isLandscape ? '11in 8.5in' : '8.5in 11in'}; margin: 0.45in 0.4in 0.4in 0.4in; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: white; }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2.5px solid #1a1a1a;
  }
  .${logoBase64 ? `<img style="width:56px;height:56px;object-fit:contain;border-radius:8px;flex-shrink:0;" src="${logoBase64}" />` : `<div style="width:56px;height:56px;background:#f0f0f0;border-radius:8px;flex-shrink:0;"></div>`}
    width: 60px; height: 60px; background: #f0f0f0;
    border-radius: 8px; display: flex; align-items: center;
    justify-content: center; font-size: 8pt; color: #999; flex-shrink: 0;
  }
  .header-main { flex: 1; }
  .show-title { font-size: 22pt; font-weight: 800; letter-spacing: -0.5px; line-height: 1; margin-bottom: 4px; }
  .header-team { font-size: 8.5pt; color: #555; margin-bottom: 2px; }
  .header-right { text-align: right; flex-shrink: 0; }
  .print-label { font-size: 14pt; font-weight: 800; color: #1a1a1a; }
  .print-sub { font-size: 8.5pt; color: #888; margin-top: 2px; }

  .spots-grid {
    display: grid;
    grid-template-columns: ${spots.length === 1 ? '1fr' : spots.length === 2 ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))'};
    gap: 16px;
  }

  .spot-card { border: 1.5px solid #ddd; border-radius: 10px; overflow: hidden; }

  .spot-header {
    display: flex; align-items: center; justify-content: space-between;
    background: #1a1a1a; color: white; padding: 10px 14px;
  }
  .spot-left { display: flex; align-items: baseline; gap: 8px; }
  .spot-number { font-size: 14pt; font-weight: 800; color: white; }
  .spot-operator { font-size: 11pt; font-weight: 600; color: #ccc; }
  .spot-right { text-align: right; }
  .spot-detail { font-size: 8pt; color: #aaa; line-height: 1.4; }

  .frames-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)); /* equal widths, even with long multi-gel names */
    gap: 0;
  }

  .frame-card, .perm-card {
    display: flex;
    flex-direction: column;
    border-right: 1px solid rgba(0,0,0,0.08);
    border-bottom: 1px solid rgba(0,0,0,0.08);
    min-height: 90px;
    justify-content: space-between;
  }

  .perm-card {
    border: 2px solid rgba(0,0,0,0.15);
    position: relative;
  }

  .frame-band { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 3px; }
  .multi .frame-band { padding: 6px 10px; justify-content: center; }
  .multi .frame-band + .frame-band { border-top: 1px solid rgba(0,0,0,0.12); }
  .band-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .multi .frame-gel-num { font-size: 12pt; flex-shrink: 0; }
  .multi .frame-gel-name { font-size: 7pt; line-height: 1.15; flex: 1; min-width: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .multi .frame-check { margin-top: 0; flex-shrink: 0; width: 14px; height: 14px; }
  .frame-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .frame-gel-num { font-size: 14pt; font-weight: 800; line-height: 1; }
  .frame-gel-name { font-size: 8pt; line-height: 1.3; }
  .frame-check {
    width: 16px; height: 16px;
    border: 1.5px solid;
    border-radius: 3px;
    margin-top: 4px;
  }
</style>
</head>
<body>
<div class="header">
    ${logoBase64 ? `<img style="width:56px;height:56px;object-fit:contain;border-radius:8px;flex-shrink:0;" src="${logoBase64}" />` : ''}
    <div class="header-left">
      <div class="show-title">${show.title}</div>
      <div class="header-team">${[show.designer ? 'LD: ' + show.designer : '', show.associate_ld ? 'Assoc: ' + show.associate_ld : '', show.assistant_ld ? 'Asst: ' + show.assistant_ld : ''].filter(Boolean).join(' · ')}</div>
    </div>
    <div class="header-right">
      <div class="print-label">${label || 'Color Load'}</div>
      <div class="print-sub">All Spots Color Load</div>
      <div class="print-sub">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    </div>
  </div>
  <div class="spots-grid">
    ${spotsHTML}
  </div>
</body>
</html>`;
}

function buildSpotNotesHTML({ show, spots, cues, scenes, spotCues, characters, label }) {
  let logoBase64 = '';
  if (show.logo_path) {
    try {
      const fs = require('fs');
      const data = fs.readFileSync(show.logo_path);
      const ext = show.logo_path.split('.').pop().toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      logoBase64 = `data:${mime};base64,${data.toString('base64')}`;
    } catch(e) {}
  }
  const sceneMap = {};
  scenes.forEach(s => { sceneMap[s.id] = s; });
  const charMap = {};
  characters.forEach(c => { charMap[c.id] = c; });
  const sceneOrderMap = {};
  scenes.forEach((s, i) => { sceneOrderMap[s.id] = i; });

  const notesForSpot = (spotId) => {
    return spotCues
      .filter(sc => sc.spot_id === spotId && sc.spot_note && sc.spot_note.trim())
      .map(sc => {
        const cue = cues.find(c => c.id === sc.cue_id);
        return { sc, cue };
      })
      .filter(({ cue }) => cue)
      .sort((a, b) => {
        const sceneA = sceneOrderMap[a.cue?.scene_id] ?? 999;
        const sceneB = sceneOrderMap[b.cue?.scene_id] ?? 999;
        if (sceneA !== sceneB) return sceneA - sceneB;
        return (a.cue?.sort_order || 0) - (b.cue?.sort_order || 0);
      });
  };

  const spotsHTML = spots.map(spot => {
    const notes = notesForSpot(spot.id);
    if (notes.length === 0) return '';
    return `
      <div class="spot-section">
        <div class="spot-header">SPOT ${spot.spot_number} · ${spot.operator_name || 'TBD'}</div>
        ${notes.map(({ sc, cue }) => {
          const scene = sceneMap[cue.scene_id];
          const char = charMap[sc.character_id];
          return `
            <div class="note-card ${sc.note_checked ? 'checked' : ''}">
              <div class="note-meta">
                <span class="lq">LQ ${cue.lq_number || '—'}</span>
                <span class="track">T·${cue.track_number}</span>
                ${scene ? `<span class="scene">${scene.label}</span>` : ''}
                ${sc.action ? `<span class="action">${sc.action}</span>` : ''}
                ${char ? `<span class="char">${char.name}</span>` : ''}
                ${sc.note_checked ? `<span class="done-badge">GIVEN</span>` : ''}
              </div>
              <div class="note-text">${sc.spot_note}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 8.5in 11in; margin: 0.5in; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: white; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2.5px solid #1a1a1a; }
  .show-title { font-size: 20pt; font-weight: 800; }
  .header-right { text-align: right; }
  .print-label { font-size: 13pt; font-weight: 800; }
  .print-date { font-size: 8pt; color: #888; margin-top: 2px; }
  .spot-section { margin-bottom: 24px; }
  .spot-header { font-size: 11pt; font-weight: 800; color: #fff; background: #1a1a1a; text-transform: uppercase; letter-spacing: 0.06em; padding: 6px 10px; margin-bottom: 10px; }
  .note-card { padding: 12px 14px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 8px; }
  .note-card.checked { background: #f9f9f9; opacity: 0.7; }
  .note-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
  .lq { font-size: 14pt; font-weight: 800; }
  .track { font-size: 9pt; color: #888; }
  .scene { font-size: 9pt; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.04em; }
  .action { font-size: 9pt; color: #555; background: #f0f0f0; padding: 1px 6px; border-radius: 4px; }
  .char { font-size: 10pt; font-weight: 700; }
  .done-badge { font-size: 8pt; font-weight: 800; color: #1D9E75; background: #e8f8f0; padding: 1px 6px; border-radius: 4px; margin-left: auto; }
  .note-text { font-size: 12pt; line-height: 1.5; color: #1a1a1a; white-space: pre-wrap; }
  .note-card.checked .note-text { text-decoration: line-through; color: #888; }
</style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:flex-start;gap:12px;flex:1;">
      ${logoBase64 ? `<img style="width:52px;height:52px;object-fit:contain;border-radius:6px;flex-shrink:0;" src="${logoBase64}" />` : ''}
      <div>
        <div class="show-title">${show.title}</div>
      <div style="font-size:8.5pt;color:#555;margin-top:3px;">${[show.designer ? 'LD: ' + show.designer : '', show.associate_ld ? 'Assoc: ' + show.associate_ld : '', show.assistant_ld ? 'Asst: ' + show.assistant_ld : ''].filter(Boolean).join(' · ')}</div>
    </div>
    </div>
    <div class="header-right">
      <div class="print-label">${label} — Spot Notes</div>
      <div class="print-date">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    </div>
  </div>
  ${spotsHTML}
</body>
</html>`;
}

// Cast grid: photo, character, actor and costume notes for every character, with the standard show header
function buildCharactersHTML({ show, characters, label, showCostumeNotes }) {
  const fs = require('fs');
  const imageData = (filePath) => {
    if (!filePath) return '';
    try {
      const ext = filePath.split('.').pop().toLowerCase();
      const mime = { png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' }[ext] || 'image/jpeg';
      return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
    } catch(e) { return ''; }
  };
  const logo = imageData(show.logo_path);
  const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  // Always one page: choose the column count whose cells come out closest to a portrait card,
  // then size text to the cell. Page content area is 7.7in x 10.1in (Letter minus margins).
  const GAP = 10, GRID_W = 7.7 * 96, GRID_H = 10.05 * 96 - 96; // minus ~1in for the header
  const n = Math.max(characters.length, 1);
  let best = null;
  for (let cols = 1; cols <= 8; cols++) {
    const rows = Math.ceil(n / cols);
    const cellW = (GRID_W - GAP * (cols - 1)) / cols;
    const cellH = (GRID_H - GAP * (rows - 1)) / rows;
    const emptyCells = cols * rows - n; // prefer grids without a ragged last row
    const score = Math.abs(Math.log((cellW / cellH) / 0.62)) + emptyCells / (cols * rows);
    if (!best || score < best.score) best = { cols, rows, cellW, cellH, score };
  }
  const k = Math.max(0.55, Math.min(1, best.cellW / 170));
  const noteLines = best.cellH > 300 ? 5 : best.cellH > 200 ? 3 : 2;

  const cardsHTML = characters.map(c => {
    const photo = imageData(c.photo_path);
    return `
      <div class="card">
        ${photo ? `<img class="photo" src="${photo}" />` : `<div class="photo placeholder">${escapeText(initials(c.name))}</div>`}
        <div class="card-body">
          <div class="char-name">${escapeText(c.name)}</div>
          ${c.actor_name ? `<div class="actor-name">${escapeText(c.actor_name)}</div>` : ''}
          ${showCostumeNotes && c.costume_notes ? `<div class="costume"><span class="costume-label">Costume</span>${escapeText(c.costume_notes)}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 8.5in 11in; margin: 0.5in 0.4in 0.4in 0.4in; }
  html, body { height: 10.05in; overflow: hidden; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: white; display: flex; flex-direction: column; }

  .header { flex-shrink: 0; display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 2.5px solid #1a1a1a; }
  .header-left { flex: 1; }
  .show-title { font-size: 22pt; font-weight: 800; letter-spacing: -0.5px; line-height: 1; margin-bottom: 4px; }
  .header-team { font-size: 8.5pt; color: #555; margin-bottom: 2px; }
  .header-right { text-align: right; flex-shrink: 0; }
  .print-label { font-size: 14pt; font-weight: 800; color: #1a1a1a; }
  .print-sub { font-size: 8.5pt; color: #888; margin-top: 2px; }

  .grid { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(${best.cols}, 1fr); grid-template-rows: repeat(${best.rows}, 1fr); gap: ${GAP}px; }
  .card { min-height: 0; display: flex; flex-direction: column; border: 1.5px solid #ddd; border-radius: ${Math.round(10 * k)}px; overflow: hidden; background: #fff; }
  .photo { display: block; width: 100%; flex: 1; min-height: 0; object-fit: cover; background: #f0f0f0; }
  .placeholder { display: flex; align-items: center; justify-content: center; font-size: ${(28 * k).toFixed(1)}pt; font-weight: 800; color: #c8c8c8; }
  .card-body { flex-shrink: 0; padding: ${Math.round(7 * k)}px ${Math.round(9 * k)}px ${Math.round(9 * k)}px; }
  .char-name { font-size: ${Math.max(7, 12 * k).toFixed(1)}pt; font-weight: 800; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .actor-name { font-size: ${Math.max(6.5, 9 * k).toFixed(1)}pt; color: #555; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .costume { font-size: ${Math.max(6, 8 * k).toFixed(1)}pt; color: #333; line-height: 1.35; margin-top: ${Math.round(5 * k)}px; padding-top: ${Math.round(5 * k)}px; border-top: 1px solid #eee; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${noteLines + 1}; overflow: hidden; }
  .costume-label { display: block; font-size: ${Math.max(5.5, 6.5 * k).toFixed(1)}pt; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1px; }
  .empty { color: #999; font-size: 11pt; padding: 40px 0; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img style="width:56px;height:56px;object-fit:contain;border-radius:8px;flex-shrink:0;" src="${logo}" />` : ''}
    <div class="header-left">
      <div class="show-title">${escapeText(show.title)}</div>
      <div class="header-team">${[show.designer ? 'LD: ' + show.designer : '', show.associate_ld ? 'Assoc: ' + show.associate_ld : '', show.assistant_ld ? 'Asst: ' + show.assistant_ld : ''].filter(Boolean).map(escapeText).join(' · ')}</div>
    </div>
    <div class="header-right">
      <div class="print-label">${escapeText(label || 'Characters')}</div>
      <div class="print-sub">Characters &amp; Cast · ${characters.length}</div>
      <div class="print-sub">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    </div>
  </div>
  ${characters.length ? `<div class="grid">${cardsHTML}</div>` : '<div class="empty">No characters yet. Add them on the Characters screen.</div>'}
</body>
</html>`;
}

// Page margins per sheet type (the sheets' HTML is laid out for these)
const PAGE_MARGINS = {
  spot: { top: '0.5in', right: '0.4in', bottom: '0.4in', left: '0.4in' },
  caller: { top: '0.4in', right: '0.35in', bottom: '0.35in', left: '0.35in' },
  color: { top: '0.5in', right: '0.4in', bottom: '0.4in', left: '0.4in' },
  notes: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
  characters: { top: '0.5in', right: '0.4in', bottom: '0.4in', left: '0.4in' },
};

// One headless Chrome is kept running between renders so live print previews stay fast
// (starting Chrome takes ~3s; a render with it already running takes ~0.25s)
let browserPromise = null;
async function getBrowser() {
  if (browserPromise) {
    const running = await browserPromise.catch(() => null);
    if (running && running.connected) return running;
  }
  browserPromise = puppeteer.launch({ headless: true, executablePath: global.chromiumPath || puppeteer.executablePath() });
  return browserPromise;
}
async function closeBrowser() {
  if (!browserPromise) return;
  const running = await browserPromise.catch(() => null);
  browserPromise = null;
  if (running) await running.close().catch(() => {});
}

// "Page 1 of 31" at the bottom of every printed page (Chrome fills in the numbers)
const PAGE_FOOTER = `<div style="width:100%;text-align:center;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:7.5pt;color:#888;">
  Page <span class="pageNumber"></span> of <span class="totalPages"></span>
</div>`;

// Renders a sheet's HTML as a Letter-size PDF and returns the bytes
async function renderPDFBuffer(html, { landscape, margin }) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return Buffer.from(await page.pdf({
      width: landscape ? '11in' : '8.5in',
      height: landscape ? '8.5in' : '11in',
      printBackground: true,
      margin,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: PAGE_FOOTER,
    }));
  } finally {
    await page.close().catch(() => {});
  }
}

// Saves a sheet's HTML as a Letter-size PDF
async function renderPDF(html, options, outputPath) {
  fs.writeFileSync(outputPath, await renderPDFBuffer(html, options));
  return outputPath;
}

function countPages(pdf) {
  return (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
}

module.exports = { buildSpotSheetHTML, buildCallerSheetHTML, buildColorLoadHTML, buildSpotNotesHTML, buildCharactersHTML, renderPDF, renderPDFBuffer, countPages, closeBrowser, PAGE_MARGINS };
