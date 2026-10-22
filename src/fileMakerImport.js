// File → Import from FileMaker…: turns a FileMaker followspot show (the FileMaker paperwork
// template many LDs used before SpotPlot) into a SpotPlot show.
//
// That template keeps a show in FS_Track.fmp12 (cues, setup, characters) plus SceneList.fmp12 next to it.
// native/filemaker-reader/fmp2spotplot reads those files without FileMaker and prints them as JSON.
// Here that JSON becomes the same data a .spotplot file holds, and showFile.importShow saves it.
//
// Two steps, so the person can decide what the file's own actions and iris sizes become:
//   loadFileMakerShow(file)  → a summary, plus the actions and sizes that don't match SpotPlot's exactly
//   buildShowData(…)  → the show, using their choices (an existing action/size, or a new custom one)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DEFAULT_IRIS_SIZES } = require('./irisSizes');

// SpotPlot's built-in actions (the cue list's ACTIONS in src/screens/CueListScreen.jsx)
const SPOTPLOT_ACTIONS = ['Pick Up', 'Increase', 'Decrease', 'Fade Out', 'Fade In Place', 'Bump Up', 'Bump Out', 'Swap To', 'Slide To',
  'Stay With', 'Iris In', 'Iris Out', 'Iris/Fade Up', 'Iris/Fade Down', 'Iris/Fade Out', 'Up & Out', 'Dump & Restore', 'Bump Color',
  'Roll Color', 'Ballyhoo', 'Off', 'Tracked'];
// Actions after which the spot is out
const OUT_ACTIONS = new Set(['Fade Out', 'Fade In Place', 'Bump Out', 'Iris/Fade Out', 'Up & Out', 'Off']);

const norm = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

// Names in the file that are exactly a SpotPlot action, just spelled its own way
const ACTION_ALIASES = {
  fadeinplce: 'Fade In Place', dmpandrst: 'Dump & Restore', dmprst: 'Dump & Restore', dumpandrestore: 'Dump & Restore',
  irisfadedn: 'Iris/Fade Down', upandout: 'Up & Out',
  fadeup: 'Increase', fadedown: 'Decrease', fadedn: 'Decrease',   // older names for Increase / Decrease bumpcolour: 'Bump Color', rollcolour: 'Roll Color',
};
for (const a of SPOTPLOT_ACTIONS) ACTION_ALIASES[norm(a)] = a;
// Close guesses to start the menu on, for names that aren't an exact match (the person decides)
const ACTION_SUGGESTIONS = { intensityup: 'Increase', intensitydown: 'Decrease', hold: 'Tracked', crosfadeup: 'Increase', crossfadeup: 'Increase',
  crosfadedn: 'Decrease', crossfadedown: 'Decrease' };

const SIZE_ALIASES = {};
for (const s of DEFAULT_IRIS_SIZES) { SIZE_ALIASES[norm(s.label)] = s.value; SIZE_ALIASES[norm(s.value)] = s.value; }
Object.assign(SIZE_ALIASES, { '34': '3/4 Body', '12': '1/2 Body', hs: 'Head & Shoulders', hands: 'Head & Shoulders', h: 'Head' });
const SIZE_SUGGESTIONS = { hb: '1/2 Body' };

// The template's setup is often typed in capitals ("PHILIP ROSENBERG", "HOUSE R"). Text that's all capitals becomes
// Title Case; text with any lowercase is left as typed, and so are common theatre abbreviations.
const KEEP_CAPS = new Set(['LX', 'FOH', 'SR', 'SL', 'DS', 'US', 'CS', 'DSR', 'DSL', 'USR', 'USL', 'LD', 'ALD', 'PE', 'II', 'III', 'IV', 'NYC', 'UK', 'USA', 'TV', 'DMX', 'LED', 'HMI']);
function titleCase(s) {
  const text = String(s || '').trim();
  if (!text || /[a-z]/.test(text)) return text;
  return text.toLowerCase().replace(/[A-Za-z0-9'’]+/g, (w) => {
    if (KEEP_CAPS.has(w.toUpperCase())) return w.toUpperCase();
    if (/\d/.test(w)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
}

function readerPath(app) {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'fmp2spotplot')
    : path.join(app.getAppPath(), 'native', 'filemaker-reader', 'build', 'fmp2spotplot');
}

function readFmp(app, file) {
  let out;
  try {
    out = execFileSync(readerPath(app), [file], { maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    if (String(e.stderr || '').includes('encrypted')) {
      throw new Error('This FileMaker file is encrypted, so SpotPlot can’t read it. In FileMaker Pro, open it and use File → Save a Copy As… to make an unencrypted copy, then import that.');
    }
    throw new Error('SpotPlot couldn’t read this file. Make sure it’s the show’s FileMaker file (usually FS_Track.fmp12).');
  }
  const tables = {};
  for (const t of JSON.parse(out.toString('utf8')).tables || []) tables[t.name] = t;
  return tables;
}

const field = (row, name) => String((row && row[name]) || '').trim();
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

// Reads a FileMaker followspot show: FS_Track.fmp12, plus SceneList.fmp12 if it's in the same folder
function loadFileMakerShow(app, file) {
  const tables = readFmp(app, file);
  const tracking = tables['FS_Tracking Master'];
  if (!tracking) throw new Error('This doesn’t look like a followspot show SpotPlot can import. Choose the show’s FS_Track.fmp12 file.');

  const setupTable = tables['FS_Setup'] || { rows: [], globals: {} };
  const setup = { ...(setupTable.rows[0] || {}), ...setupTable.globals };   // the template keeps its setup in global fields

  const cues = tracking.rows
    .map((row, i) => ({ row, order: num(field(row, 'FS Q#')) ?? i }))
    .sort((a, b) => a.order - b.order)
    .map(c => c.row);

  let numSpots = Math.min(4, Math.max(1, num(field(setup, 'Number of Spots')) || 0));
  for (let s = 4; s > numSpots; s--) {
    if (cues.some(r => field(r, `S${s}Action`) || field(r, `S${s}Character`)) || field(setup, `Spot ${s} Op Name`)) { numSpots = s; break; }
  }

  const characters = ((tables['FS_Character Setup'] || {}).rows || [])
    .filter(r => field(r, 'Character Name'))
    .sort((a, b) => (num(field(a, 'Sort Number')) ?? 0) - (num(field(b, 'Sort Number')) ?? 0));

  let scenes = null;
  const sceneFile = path.join(path.dirname(file), 'SceneList.fmp12');
  if (fs.existsSync(sceneFile)) {
    try {
      const st = readFmp(app, sceneFile)['SceneList'];
      if (st) scenes = st.rows.filter(r => field(r, 'SceneLabel'))
        .sort((a, b) => (num(field(a, 'Sort#')) ?? 0) - (num(field(b, 'Sort#')) ?? 0));
    } catch (e) { scenes = null; /* scenes then come from the cues' scene names */ }
  }

  // Every action and iris size the show uses, with how often
  const used = { actions: new Map(), sizes: new Map() };
  for (const r of cues) {
    for (let s = 1; s <= numSpots; s++) {
      const a = field(r, `S${s}Action`), z = field(r, `S${s}Size`);
      if (a) used.actions.set(a, (used.actions.get(a) || 0) + 1);
      if (z) used.sizes.set(z, (used.sizes.get(z) || 0) + 1);
    }
  }
  const unmatched = (map, aliases, suggestions) => [...map.entries()]
    .filter(([name]) => !aliases[norm(name)])
    .map(([name, count]) => ({ name, count, suggestion: suggestions[norm(name)] || null }))
    .sort((a, b) => b.count - a.count);

  return {
    file, setup, cues, characters, scenes, numSpots,
    summary: {
      title: titleCase(field(setup, 'Show Title')) || path.basename(path.dirname(file)),
      venue: titleCase(field(setup, 'Venue')),
      numSpots, cueCount: cues.length, characterCount: characters.length,
      sceneCount: scenes ? scenes.length : new Set(cues.map(r => field(r, 'SceneSong')).filter(Boolean)).size,
      sceneFileFound: !!scenes,
      actions: unmatched(used.actions, ACTION_ALIASES, ACTION_SUGGESTIONS),
      sizes: unmatched(used.sizes, SIZE_ALIASES, SIZE_SUGGESTIONS),
      spotplotActions: SPOTPLOT_ACTIONS,
      spotplotSizes: DEFAULT_IRIS_SIZES.map(s => s.value),
    },
  };
}

// Frames in the file: "1+5" → "F1,F5"
function framesOf(text) {
  return String(text || '').split(/[+,&\s]+/).map(f => f.replace(/^F/i, '')).filter(f => /^[1-6]$/.test(f))
    .map(f => 'F' + f).filter((f, i, a) => a.indexOf(f) === i).join(',');
}
function intensityOf(text) {
  const t = String(text || '').trim();
  if (!t || /^off$/i.test(t)) return '';
  if (/^(fl|full|100%?)$/i.test(t)) return 'Full';
  if (/^0%?$/.test(t)) return 'Out';
  return t;
}
const timeOf = (text) => String(text || '').trim().replace(/\s*s(ec)?\.?$/i, '');

// choices: { actions: { [nameInFile]: { to } | { custom: true } }, sizes: { [nameInFile]: { to } | { custom: true } } }
function buildShowData(loaded, choices, gelName) {
  const { setup, cues: rows, characters: charRows, numSpots } = loaded;
  const choice = (kind, name) => (choices && choices[kind] && choices[kind][name]) || {};

  // Actions and sizes, and the custom ones the person asked for
  const customActions = [], customSizes = [];
  const actionFor = (name) => {
    const exact = ACTION_ALIASES[norm(name)];
    if (exact) return exact;
    const c = choice('actions', name);
    if (c.to) return c.to;
    if (!customActions.some(a => a.name === name)) customActions.push({ name, color: 'rgba(255,255,255,0.62)', icon: null });
    return name;
  };
  const sizeFor = (name) => {
    if (!name) return '';
    const exact = SIZE_ALIASES[norm(name)];
    if (exact) return exact;
    const c = choice('sizes', name);
    if (c.to) return c.to;
    if (!customSizes.some(s => s.value === name)) customSizes.push({ label: name, value: name, builtin: false });
    return name;
  };

  const show = {
    id: 1,
    title: titleCase(field(setup, 'Show Title')) || 'Imported Show',
    theatre: titleCase(field(setup, 'Venue')),
    producer: titleCase(field(setup, 'Producer')),
    designer: titleCase(field(setup, 'Lighting Designer')),
    associate_ld: titleCase(field(setup, 'Associate LD')),
    assistant_ld: titleCase(field(setup, 'Assistant LD')),
    production_electrician: titleCase(field(setup, 'Production Electrician')),
    programmer: titleCase(field(setup, 'Programmer')),
    num_spots: numSpots,
  };

  const spots = [], colorSlots = [];
  let slotId = 1;
  for (let s = 1; s <= numSpots; s++) {
    spots.push({ id: s, spot_number: s, operator_name: titleCase(field(setup, `Spot ${s} Op Name`)),
      location: titleCase(field(setup, `Spot ${s} Location`)), fixture_type: titleCase(field(setup, `Spot ${s} Type`)) });
    for (let f = 1; f <= 6; f++) {
      const gel = field(setup, `S${s}Col${f}`).replace(/\s+/g, '');
      // A frame with no gel that no cue uses is left out (SpotPlot spots can have fewer than six)
      if (!gel && !rows.some(r => framesOf(field(r, `S${s}Frame`)).split(',').includes('F' + f))) continue;
      colorSlots.push({ id: slotId++, spot_id: s, slot_number: f, is_permanent: 0, gel_number: gel, gel_name: gel ? gelName(gel) : '' });
    }
    const perm = field(setup, `S${s} Perm Color`).replace(/\s+/g, '');
    colorSlots.push({ id: slotId++, spot_id: s, slot_number: null, is_permanent: 1, gel_number: perm, gel_name: perm ? gelName(perm) : '' });
  }

  // Scenes: SceneList.fmp12 when it was found, else the scene names on the cues, in order.
  // "1-1b: "Maybe"" becomes label 1-1b and title Maybe.
  const scenes = [], sceneIdByLabel = {};
  const addScene = (label, actBreak) => {
    if (!label || sceneIdByLabel[label]) return;
    const m = label.match(/^(.{1,24}?):\s+(.+)$/);
    const id = scenes.length + 1;
    scenes.push({ id, sort_order: id, label: m ? m[1].trim() : label,
      song: m ? m[2].trim().replace(/^["“”']+|["“”']+$/g, '') : '', act_break: actBreak ? 1 : 0 });
    sceneIdByLabel[label] = id;
  };
  for (const r of loaded.scenes || []) addScene(field(r, 'SceneLabel'), /^y/i.test(field(r, 'Act Break?')));
  for (const r of rows) addScene(field(r, 'SceneSong'), false);

  const characters = charRows.map((r, i) => ({ id: i + 1, sort_order: i + 1, name: field(r, 'Character Name'),
    actor_name: field(r, 'Actor Name'), costume_notes: field(r, 'Costume Notes'), print_on_sheet: 1 }));
  const charIdByName = {};
  characters.forEach(c => { charIdByName[c.name.toLowerCase()] = c.id; });

  const cues = [], spotCues = [];
  const state = {};
  for (let s = 1; s <= numSpots; s++) state[s] = { on: false, character: '', frames: '' };
  rows.forEach((r, i) => {
    const cueId = i + 1;
    cues.push({ id: cueId, lq_number: field(r, 'LQ#'), track_number: num(field(r, 'FS Q#')) ?? cueId,
      scene_id: sceneIdByLabel[field(r, 'SceneSong')] || null, caller_notes: field(r, 'Caller Notes'),
      rehearsal_notes: field(r, 'Reh Note'), ignore: 0, sort_order: cueId * 1000, page: field(r, 'Page#') || null });

    for (let s = 1; s <= numSpots; s++) {
      const st = state[s];
      const rawAction = field(r, `S${s}Action`);
      const character = field(r, `S${s}Character`) || st.character;
      const frames = framesOf(field(r, `S${s}Frame`)) || st.frames;
      let action = rawAction ? actionFor(rawAction) : '';
      // No action: the spot carries on (Tracked) if it was on, unless the file says OFF
      if (!action) action = (st.on && !/^off$/i.test(field(r, `S${s}Intensity`))) ? 'Tracked' : 'Off';
      // Carrying on is stored as no action, like a cue someone inserted and didn't change for this spot
      const sc = { id: spotCues.length + 1, cue_id: cueId, spot_id: s, action: action === 'Tracked' ? '' : action };
      if (action !== 'Off') {
        Object.assign(sc, {
          character_id: charIdByName[character.toLowerCase()] || null,
          custom_character: charIdByName[character.toLowerCase()] ? null : (character || null),
          active_frames: frames,
        });
        if (action !== 'Tracked') Object.assign(sc, {
          frame_size: sizeFor(field(r, `S${s}Size`)),
          intensity: intensityOf(field(r, `S${s}Intensity`)),
          fade_time: timeOf(field(r, `S${s}Time`)),
          description: field(r, `S${s}Description`),
          // The file's per-cue location ("UC", "Up SL"): SpotPlot shows no location per cue, so it goes in Notes
          notes: field(r, `S${s}Location`),
        });
        sc.ignored = field(r, `S${s} Ignore`) ? 1 : 0;
      }
      spotCues.push(sc);
      if (action === 'Tracked') { st.character = character; st.frames = frames; }
      else if (action === 'Off') { st.on = false; }
      else { st.on = !OUT_ACTIONS.has(action); st.character = character; st.frames = frames; }
    }
  });

  if (customActions.length) show.custom_actions = JSON.stringify(customActions);
  if (customSizes.length) {
    show.iris_sizes = JSON.stringify([...DEFAULT_IRIS_SIZES.map(s => ({ ...s, builtin: true, key: s.value })), ...customSizes]);
  }

  return { version: '2.0', exported_at: new Date().toISOString(), show, spots, colorSlots, scenes, characters, cues, spotCues, images: {} };
}

module.exports = { loadFileMakerShow, buildShowData, titleCase };
