// .spotplot show files: a JSON copy of every row belonging to a show, plus the images it uses.
// Export copies whole rows (SELECT *) and import copies every column the local database has,
// so new columns come along automatically. Only ids and the links between rows are remapped.

const fs = require('fs');
const path = require('path');

const FORMAT_VERSION = '2.0';
// Actions renamed since older files were made (older SpotPlot called them Fade Up / Fade Down)
const RENAMED_ACTIONS = { 'Fade Up': 'Increase', 'Fade Down': 'Decrease' };

function parseJSON(text) {
  try { return JSON.parse(text || 'null'); } catch(e) { return null; }
}

// Every image path a show uses: logo, character photos, custom action icons
function imagePaths(show, characters) {
  const paths = [show.logo_path, ...characters.map(c => c.photo_path)];
  const actions = parseJSON(show.custom_actions);
  if (Array.isArray(actions)) actions.forEach(a => paths.push(a && a.icon));
  return [...new Set(paths.filter(Boolean))];
}

function exportShow(db, showId) {
  const show = db.prepare('SELECT * FROM shows WHERE id = ?').get(showId);
  if (!show) throw new Error('Show not found');
  const spots = db.prepare('SELECT * FROM spots WHERE show_id = ?').all(showId);
  const colorSlots = db.prepare('SELECT * FROM color_slots WHERE spot_id IN (SELECT id FROM spots WHERE show_id = ?)').all(showId);
  const scenes = db.prepare('SELECT * FROM scenes WHERE show_id = ? ORDER BY sort_order').all(showId);
  const characters = db.prepare('SELECT * FROM characters WHERE show_id = ? ORDER BY sort_order').all(showId);
  const cues = db.prepare('SELECT * FROM cues WHERE show_id = ? ORDER BY sort_order').all(showId);
  const spotCues = db.prepare('SELECT sc.* FROM spot_cues sc JOIN cues c ON sc.cue_id = c.id WHERE c.show_id = ?').all(showId);

  const images = {};
  for (const p of imagePaths(show, characters)) {
    try { images[p] = { ext: path.extname(p).slice(1).toLowerCase() || 'png', data: fs.readFileSync(p).toString('base64') }; }
    catch(e) { /* file missing: the show still exports, just without that image */ }
  }
  // Older SpotPlot versions only read the logo from here
  const logoBase64 = images[show.logo_path] ? { data: images[show.logo_path].data, ext: images[show.logo_path].ext } : null;

  return { version: FORMAT_VERSION, exported_at: new Date().toISOString(), show, spots, colorSlots, scenes, characters, cues, spotCues, images, logoBase64 };
}

// Creates a new show from exported data. imagesDir is where restored images are saved.
function importShow(db, data, { imagesDir }) {
  if (!data || !data.show) throw new Error('This file is not a SpotPlot show.');

  const columnCache = {};
  const columns = table => columnCache[table] ||
    (columnCache[table] = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)));
  // Inserts every field the local table knows about (the file may be from an older or newer SpotPlot)
  const insert = (table, row) => {
    const keys = Object.keys(row).filter(k => k !== 'id' && columns(table).has(k));
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    return db.prepare(sql).run(...keys.map(k => row[k] === undefined ? null : row[k])).lastInsertRowid;
  };

  const images = { ...(data.images || {}) };
  if (data.logoBase64 && data.show.logo_path && !images[data.show.logo_path]) images[data.show.logo_path] = data.logoBase64;
  const restored = {};
  const restoreImage = (oldPath) => {
    if (!oldPath) return oldPath;
    if (restored[oldPath]) return restored[oldPath];
    const img = images[oldPath];
    if (!img) return oldPath;
    fs.mkdirSync(imagesDir, { recursive: true });
    const dest = path.join(imagesDir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${img.ext || 'png'}`);
    fs.writeFileSync(dest, Buffer.from(img.data, 'base64'));
    return (restored[oldPath] = dest);
  };

  let showId;
  db.transaction(() => {
    const actions = parseJSON(data.show.custom_actions);
    const show = {
      ...data.show,
      title: data.show.title + ' (imported)',
      logo_path: restoreImage(data.show.logo_path),
      custom_actions: Array.isArray(actions)
        ? JSON.stringify(actions.map(a => a && a.icon ? { ...a, icon: restoreImage(a.icon) } : a))
        : data.show.custom_actions,
    };
    delete show.created_at; // new timestamps for the imported copy
    delete show.updated_at;
    showId = insert('shows', show);

    const spotMap = {}, sceneMap = {}, charMap = {}, cueMap = {};
    for (const spot of data.spots || []) spotMap[spot.id] = insert('spots', { ...spot, show_id: showId });
    for (const slot of data.colorSlots || []) {
      if (spotMap[slot.spot_id]) insert('color_slots', { ...slot, spot_id: spotMap[slot.spot_id] });
    }
    for (const scene of data.scenes || []) sceneMap[scene.id] = insert('scenes', { ...scene, show_id: showId });
    for (const c of data.characters || []) {
      charMap[c.id] = insert('characters', { ...c, show_id: showId, photo_path: restoreImage(c.photo_path) });
    }
    for (const cue of data.cues || []) {
      cueMap[cue.id] = insert('cues', { ...cue, show_id: showId, scene_id: sceneMap[cue.scene_id] || null });
    }
    for (const sc of data.spotCues || []) {
      if (!cueMap[sc.cue_id] || !spotMap[sc.spot_id]) continue;
      insert('spot_cues', { ...sc, action: RENAMED_ACTIONS[sc.action] || sc.action, cue_id: cueMap[sc.cue_id], spot_id: spotMap[sc.spot_id], character_id: charMap[sc.character_id] || null });
    }
  })();

  return { showId, title: data.show.title + ' (imported)' };
}

module.exports = { exportShow, importShow };
