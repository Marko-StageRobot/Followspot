// Round-trip test for .spotplot export/import (src/showFile.js).
// Works on a COPY of the local SpotPlot database, never the real one. For every show it exports,
// re-imports, and checks that every column of every row (spots, gels incl. permanent, scenes,
// characters, cues, every cue cell) and every image came back identical.
//
// Run from the project folder (uses Electron's Node so better-sqlite3 loads):
//   ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron scripts/test-show-roundtrip.js
// Optional: pass a database path as the first argument.
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { exportShow, importShow } = require('../src/showFile');

const source = process.argv[2] || path.join(os.homedir(), 'Library/Application Support/SpotPlot/followspot.db');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'spotplot-roundtrip-'));
const dbPath = path.join(work, 'followspot.db');
fs.copyFileSync(source, dbPath);
const imagesDir = path.join(work, 'images');
const db = new Database(dbPath);
// The app renames these when it opens a database (main.js initSchema) and when it imports an older file,
// so bring the copy up to date first, the same way
db.exec("UPDATE spot_cues SET action = 'Increase' WHERE action = 'Fade Up'");
db.exec("UPDATE spot_cues SET action = 'Decrease' WHERE action = 'Fade Down'");

// Links between rows are compared by position instead of id
const SKIP = new Set(['id', 'show_id', 'spot_id', 'cue_id', 'scene_id', 'character_id', 'created_at', 'updated_at']);
const same = (a, b) => (a ?? null) === (b ?? null);
const sameImage = (a, b) => {
  if (!a && !b) return null;
  if (!a || !b) return `${a} → ${b}`;
  if (!fs.existsSync(a)) return b === a ? null : 'original missing but path changed';
  if (!b.startsWith(imagesDir)) return 'not restored into images folder';
  return Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)) === 0 ? null : 'image bytes differ';
};
function compareRows(label, orig, copy, special = {}) {
  const problems = [];
  if (orig.length !== copy.length) problems.push(`${label}: ${orig.length} rows → ${copy.length}`);
  orig.forEach((o, i) => {
    const c = copy[i]; if (!c) return;
    for (const k of Object.keys(o)) {
      if (SKIP.has(k)) continue;
      const msg = special[k] ? special[k](o[k], c[k]) : (same(o[k], c[k]) ? null : `${JSON.stringify(o[k])} → ${JSON.stringify(c[k])}`);
      if (msg) problems.push(`${label}[${i}].${k}: ${msg}`);
    }
  });
  return problems;
}
const indexOf = rows => Object.fromEntries(rows.map((r, i) => [r.id, i]));
const cellKey = d => { const c = indexOf(d.cues), s = indexOf(d.spots); return sc => `${String(c[sc.cue_id]).padStart(6)}/${s[sc.spot_id]}`; };
const sortCells = d => [...d.spotCues].sort((a, b) => cellKey(d)(a).localeCompare(cellKey(d)(b)));
const slotKey = d => { const s = indexOf(d.spots); return x => `${s[x.spot_id]}/${x.is_permanent ? 'P' : String(x.slot_number).padStart(3)}`; };
const sortSlots = d => [...d.colorSlots].sort((a, b) => slotKey(d)(a).localeCompare(slotKey(d)(b)));
const links = (d, rows, fk, target) => rows.map(r => r[fk] == null ? null : indexOf(d[target])[r[fk]]);

let failures = 0;
for (const { id, title } of db.prepare('SELECT id, title FROM shows ORDER BY id').all()) {
  const exported = JSON.parse(JSON.stringify(exportShow(db, id))); // through JSON, like a real file
  const { showId } = importShow(db, exported, { imagesDir });
  const back = exportShow(db, showId);
  const problems = [
    ...compareRows('show', [exported.show], [back.show], {
      title: (a, b) => b === a + ' (imported)' ? null : `${a} → ${b}`,
      logo_path: sameImage,
      custom_actions: (a, b) => {
        const pa = JSON.parse(a || 'null'), pb = JSON.parse(b || 'null');
        if (!Array.isArray(pa)) return same(a, b) ? null : 'changed';
        return pa.map((x, i) => x && x.icon ? sameImage(x.icon, pb[i] && pb[i].icon) : JSON.stringify(x) === JSON.stringify(pb[i]) ? null : 'action changed').find(Boolean) || null;
      },
    }),
    ...compareRows('spots', exported.spots, back.spots),
    ...compareRows('colorSlots', sortSlots(exported), sortSlots(back)),
    ...compareRows('scenes', exported.scenes, back.scenes),
    ...compareRows('characters', exported.characters, back.characters, { photo_path: sameImage }),
    ...compareRows('cues', exported.cues, back.cues),
    ...compareRows('spotCues', sortCells(exported), sortCells(back)),
  ];
  for (const [name, a, b] of [
    ['cue→scene', links(exported, exported.cues, 'scene_id', 'scenes'), links(back, back.cues, 'scene_id', 'scenes')],
    ['gel→spot', links(exported, sortSlots(exported), 'spot_id', 'spots'), links(back, sortSlots(back), 'spot_id', 'spots')],
    ['cell→character', links(exported, sortCells(exported), 'character_id', 'characters'), links(back, sortCells(back), 'character_id', 'characters')],
  ]) if (JSON.stringify(a) !== JSON.stringify(b)) problems.push(`links ${name} differ`);

  const perm = exported.colorSlots.filter(s => s.is_permanent && (s.gel_number || s.gel_name)).length;
  console.log(`${problems.length ? '✗' : '✓'} ${title}: ${exported.spots.length} spots, ${exported.colorSlots.length} gel slots (${perm} permanent gels), ${exported.cues.length} cues, ${exported.spotCues.length} cells, ${Object.keys(exported.images).length} images`);
  problems.slice(0, 10).forEach(p => console.log('    ' + p));
  failures += problems.length;
}
fs.rmSync(work, { recursive: true, force: true });
console.log(failures ? `\nFAILED: ${failures} differences` : '\nPASSED: every field of every row survived export → import.');
process.exit(failures ? 1 : 0);
