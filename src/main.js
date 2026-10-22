const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const Database = require('better-sqlite3');
const { exportShow, importShow } = require('./showFile');
const ipadSync = require('./ipadSync');
const { initUpdates } = require('./updates');
const fileMaker = require('./fileMakerImport');
const { buildSpotSheetHTML, buildCallerSheetHTML, buildColorLoadHTML, buildSpotNotesHTML, buildCharactersHTML, buildActionKeyHTML, buildSceneListHTML, coverPageHTML, withCoverPage, renderPDF, renderPDFBuffer, countPages, closeBrowser, PAGE_MARGINS } = require('./pdfGenerator');

if (require('electron-squirrel-startup')) app.quit();

// Dev only: SPOTPLOT_USER_DATA=/some/folder npm start runs on a separate copy of the app's data
// (database, images, saved license), e.g. for a demo show, without touching your real shows.
if (!app.isPackaged && process.env.SPOTPLOT_USER_DATA) app.setPath('userData', process.env.SPOTPLOT_USER_DATA);

let db;

function getDb() {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'followspot.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

// SpotPlot keeps its own copy of every image the user adds (character photos, show logos,
// custom action icons), so moving or deleting the original file can't break it.
function imagesDir() {
  return path.join(app.getPath('userData'), 'images');
}
function storeImageCopy(srcPath) {
  if (!srcPath || srcPath.startsWith(imagesDir() + path.sep)) return srcPath;
  const fs = require('fs');
  fs.mkdirSync(imagesDir(), { recursive: true });
  const dest = path.join(imagesDir(), `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(srcPath).toLowerCase() || '.png'}`);
  fs.copyFileSync(srcPath, dest);
  return dest;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      theatre TEXT,
      producer TEXT,
      designer TEXT,
      associate_ld TEXT,
      assistant_ld TEXT,
      production_electrician TEXT,
      programmer TEXT,
      logo_path TEXT,
      num_spots INTEGER DEFAULT 2,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS spots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_id INTEGER NOT NULL,
      spot_number INTEGER NOT NULL,
      fixture_type TEXT,
      location TEXT,
      operator_name TEXT,
      FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS color_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spot_id INTEGER NOT NULL,
      slot_number INTEGER,
      is_permanent INTEGER DEFAULT 0,
      gel_number TEXT,
      gel_name TEXT,
      FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS scenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_id INTEGER NOT NULL,
      sort_order INTEGER,
      label TEXT NOT NULL,
      act_break INTEGER DEFAULT 0,
      song TEXT,
      FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_id INTEGER NOT NULL,
      sort_order INTEGER,
      name TEXT NOT NULL,
      actor_name TEXT,
      costume_notes TEXT,
      photo_path TEXT,
      FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS cues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_id INTEGER NOT NULL,
      lq_number TEXT,
      track_number INTEGER,
      scene_id INTEGER,
      caller_notes TEXT,
      rehearsal_notes TEXT,
      ignore INTEGER DEFAULT 0,
      sort_order INTEGER,
      FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE,
      FOREIGN KEY (scene_id) REFERENCES scenes(id)
    );
    CREATE TABLE IF NOT EXISTS spot_cues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cue_id INTEGER NOT NULL,
      spot_id INTEGER NOT NULL,
      action TEXT,
      character_id INTEGER,
      frame_size TEXT,
      intensity TEXT,
      fade_time TEXT,
      location TEXT,
      active_frames TEXT,
      description TEXT,
      notes TEXT,
      ignore INTEGER DEFAULT 0,
      FOREIGN KEY (cue_id) REFERENCES cues(id) ON DELETE CASCADE,
      FOREIGN KEY (spot_id) REFERENCES spots(id)
    );
    CREATE TABLE IF NOT EXISTS gels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manufacturer TEXT NOT NULL,
      gel_number TEXT NOT NULL,
      gel_name TEXT NOT NULL
    );
  `);
  seedGels();
  try { db.exec('ALTER TABLE characters ADD COLUMN photo_path TEXT'); } catch(e) {}
  try { db.exec('ALTER TABLE shows ADD COLUMN logo_path TEXT'); } catch(e) {}
  try { db.exec('ALTER TABLE spot_cues ADD COLUMN ignored INTEGER DEFAULT 0'); } catch(e) {}
  try { db.exec('ALTER TABLE spot_cues ADD COLUMN highlight TEXT DEFAULT NULL'); } catch(e) {}
  try { db.exec('ALTER TABLE spot_cues ADD COLUMN spot_note TEXT DEFAULT NULL'); } catch(e) {}
  try { db.exec('ALTER TABLE spot_cues ADD COLUMN no_color INTEGER DEFAULT 0'); } catch(e) {}
  try { db.exec('ALTER TABLE spot_cues ADD COLUMN note_checked INTEGER DEFAULT 0'); } catch(e) {}
  try { db.exec('ALTER TABLE spot_cues ADD COLUMN custom_character TEXT DEFAULT NULL'); } catch(e) {}
  try { db.exec("UPDATE gels SET gel_name = REPLACE(gel_name, 'Billinton', 'Billington') WHERE gel_name LIKE '%Billinton%'"); } catch(e) {}
  try { db.exec("ALTER TABLE shows ADD COLUMN iris_sizes TEXT DEFAULT NULL"); } catch(e) {}
  try { db.exec('ALTER TABLE spots ADD COLUMN display_order INTEGER DEFAULT NULL'); } catch(e) {}
  try { db.exec('ALTER TABLE shows ADD COLUMN custom_actions TEXT DEFAULT NULL'); } catch(e) {}
  try { db.exec('ALTER TABLE shows ADD COLUMN cue_fields TEXT DEFAULT NULL'); } catch(e) {} // hidden cue fields, see src/cueFields.js
  try { db.exec('ALTER TABLE spot_cues ADD COLUMN when_highlight TEXT DEFAULT NULL'); } catch(e) {}
  try { db.exec('ALTER TABLE characters ADD COLUMN print_on_sheet INTEGER DEFAULT 1'); } catch(e) {}
  try { db.exec('ALTER TABLE spot_cues ADD COLUMN notes_highlight TEXT DEFAULT NULL'); } catch(e) {}
  try { db.exec('ALTER TABLE cues ADD COLUMN page TEXT DEFAULT NULL'); } catch(e) {} // script page, cue list only
  try {
    db.exec('ALTER TABLE spot_cues ADD COLUMN with_lq INTEGER DEFAULT 0');
    // One-time: link "When" text that the old w/LQ button typed in for the cue's current number,
    // keeping any words after the number as the extra text
    db.exec(`
      UPDATE spot_cues SET with_lq = 1,
        description = TRIM(SUBSTR(description, LENGTH('w/ LQ ' || (SELECT lq_number FROM cues WHERE cues.id = spot_cues.cue_id)) + 1))
      WHERE description = 'w/ LQ ' || (SELECT lq_number FROM cues WHERE cues.id = spot_cues.cue_id)
         OR SUBSTR(description, 1, LENGTH('w/ LQ ' || (SELECT lq_number FROM cues WHERE cues.id = spot_cues.cue_id)) + 1) = 'w/ LQ ' || (SELECT lq_number FROM cues WHERE cues.id = spot_cues.cue_id) || ' '
    `);
  } catch(e) {}
  // One-time: When/Notes became formatted text (HTML with <b>/<i>/<u>). Escape & < > in existing
  // plain text so it still shows exactly as typed.
  if (db.pragma('user_version', { simple: true }) < 1) {
    db.transaction(() => {
      for (const col of ['description', 'notes']) {
        db.exec(`UPDATE spot_cues SET ${col} = REPLACE(REPLACE(REPLACE(${col}, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') WHERE ${col} LIKE '%&%' OR ${col} LIKE '%<%' OR ${col} LIKE '%>%'`);
      }
      db.pragma('user_version = 1');
    })();
  }
  // One-time: copy images that still exist into SpotPlot's own folder and point at the copies
  if (db.pragma('user_version', { simple: true }) < 2) {
    const fs = require('fs');
    const keep = p => { try { return p && fs.existsSync(p) ? storeImageCopy(p) : p; } catch(e) { return p; } };
    for (const show of db.prepare("SELECT id, logo_path, custom_actions FROM shows").all()) {
      const logo = keep(show.logo_path);
      let actions = show.custom_actions;
      try {
        const parsed = JSON.parse(actions || 'null');
        if (Array.isArray(parsed)) actions = JSON.stringify(parsed.map(a => a && a.icon ? { ...a, icon: keep(a.icon) } : a));
      } catch(e) {}
      db.prepare('UPDATE shows SET logo_path = ?, custom_actions = ? WHERE id = ?').run(logo, actions, show.id);
    }
    for (const c of db.prepare("SELECT id, photo_path FROM characters WHERE COALESCE(photo_path, '') <> ''").all()) {
      db.prepare('UPDATE characters SET photo_path = ? WHERE id = ?').run(keep(c.photo_path), c.id);
    }
    db.pragma('user_version = 2');
  }
  // One-time: the actions Fade Up and Fade Down were renamed Increase and Decrease
  if (db.pragma('user_version', { simple: true }) < 3) {
    db.transaction(() => {
      db.exec("UPDATE spot_cues SET action = 'Increase' WHERE action = 'Fade Up'");
      db.exec("UPDATE spot_cues SET action = 'Decrease' WHERE action = 'Fade Down'");
      db.pragma('user_version = 3');
    })();
  }
}

// The gel catalog comes from src/gels.json: [maker, number, name, color] for every gel the makers
// currently sell (Rosco/Roscolux/Cinegel/CalColor, Rosco E-Colour+, Lee, GAM GamColor), with each gel's
// color from the maker's website. When GEL_CATALOG_VERSION changes, the table is rebuilt from the file
// on launch. Shows aren't affected: color frames store their own gel number and name.
const GEL_CATALOG = require('./gels.json');
const GEL_CATALOG_VERSION = '2026-10-14';

function seedGels() {
  try { db.exec('ALTER TABLE gels ADD COLUMN color TEXT DEFAULT NULL'); } catch(e) {}
  db.exec('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT)');
  const current = db.prepare("SELECT value FROM app_meta WHERE key = 'gel_catalog'").get();
  if (current && current.value === GEL_CATALOG_VERSION) return;
  const insert = db.prepare('INSERT INTO gels (manufacturer, gel_number, gel_name, color) VALUES (?, ?, ?, ?)');
  db.transaction(() => {
    db.prepare('DELETE FROM gels').run();
    for (const [maker, number, name, color] of GEL_CATALOG) insert.run(maker, number, name, color || null);
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('gel_catalog', ?)").run(GEL_CATALOG_VERSION);
  })();
}

// Imports a .spotplot file as a new show (all or nothing). Returns { showId, title }.
function importShowFile(filePath) {
  const data = JSON.parse(require('fs').readFileSync(filePath, 'utf8'));
  return importShow(getDb(), data, { imagesDir: imagesDir() });
}

// Double-clicking a .spotplot file in Finder: import it and tell the user
app.on('will-quit', () => { closeBrowser(); });

let pendingOpenFile = null;
let windowReady = false;
function openShowFile(filePath) {
  const { dialog } = require('electron');
  try {
    const { showId, title } = importShowFile(filePath);
    mainWindow.webContents.send('show-imported', { showId });
    dialog.showMessageBox(mainWindow, { type: 'info', message: `Imported "${title}"`, detail: 'It\'s now in your show list.' });
  } catch(e) {
    console.error('Open file error:', e);
    dialog.showErrorBox('Could not open show file', `${require('path').basename(filePath)} could not be imported.\n\n${e.message}`);
  }
}
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow && !mainWindow.isDestroyed() && windowReady) {
    openShowFile(filePath);
  } else {
    pendingOpenFile = filePath;
    if (app.isReady() && (!mainWindow || mainWindow.isDestroyed())) createWindow();
  }
});

// Builds one printable sheet. kind: 'spot' | 'caller' | 'color' | 'notes' | 'characters'.
// The print preview and the PDF export both use this, so they always match.
function buildSheet(kind, opts) {
  const database = getDb();
  const show = database.prepare('SELECT * FROM shows WHERE id = ?').get(opts.showId);
  const spots = database.prepare('SELECT * FROM spots WHERE show_id = ? ORDER BY COALESCE(display_order, spot_number * 1000)').all(opts.showId);
  const cues = database.prepare('SELECT * FROM cues WHERE show_id = ? ORDER BY sort_order').all(opts.showId);
  const characters = database.prepare('SELECT * FROM characters WHERE show_id = ?').all(opts.showId);
  const scenes = database.prepare('SELECT * FROM scenes WHERE show_id = ? ORDER BY sort_order').all(opts.showId);
  const customActions = show.custom_actions ? JSON.parse(show.custom_actions) : [];
  const slotsFor = id => database.prepare('SELECT * FROM color_slots WHERE spot_id = ? ORDER BY is_permanent, slot_number').all(id);
  const label = opts.label || '';
  const labelPart = label || 'Sheet';
  const landscape = spots.length > 2;
  // Every action used in the show (for the action key and cover pages)
  const showSpotCues = () => database.prepare('SELECT sc.* FROM spot_cues sc JOIN cues c ON sc.cue_id = c.id WHERE c.show_id = ?').all(opts.showId);
  // Optional cover page in front of a spot or caller sheet, sized to the sheet's printable height
  // (spot sheets always print portrait; the caller sheet turns landscape for 3+ spots)
  const cover = (html, sheetName, coverSpots, margin, isLandscape) => {
    if (!opts.cover) return html;
    const colorSlotsBySpot = {};
    for (const sp of coverSpots) colorSlotsBySpot[sp.id] = slotsFor(sp.id);
    const pageHeightIn = (isLandscape ? 8.5 : 11) - parseFloat(margin.top) - parseFloat(margin.bottom) - 0.08;
    return withCoverPage(html, coverPageHTML({ show, label, sheetName, spots: coverSpots, colorSlotsBySpot, spotCues: showSpotCues(), customActions, pageHeightIn, landscape: isLandscape }));
  };

  if (kind === 'spot') {
    const spot = spots.find(s => s.id === opts.spotId);
    return {
      html: cover(buildSpotSheetHTML({
        cueFields: show.cue_fields, show, spot, colorSlots: slotsFor(spot.id), cues, characters, scenes, label, customActions,
        spotCues: database.prepare('SELECT * FROM spot_cues WHERE spot_id = ?').all(spot.id),
        numSpots: spots.length, hideOff: !!opts.hideOff, hideTracked: !!opts.hideTracked,
        rangeStart: opts.rangeStart ?? null, rangeEnd: opts.rangeEnd ?? null, showTracks: opts.showTracks !== false,
      }), `Spot ${spot.spot_number}${spot.operator_name ? ' · ' + spot.operator_name : ''}`, [spot], PAGE_MARGINS.spot, false),
      landscape, margin: PAGE_MARGINS.spot,
      fileName: `${show.title} - Spot ${spot.spot_number} - ${labelPart}.pdf`,
    };
  }
  if (kind === 'caller') {
    const colorSlotsBySpot = {}, spotCuesBySpot = {};
    for (const spot of spots) {
      colorSlotsBySpot[spot.id] = slotsFor(spot.id);
      spotCuesBySpot[spot.id] = database.prepare('SELECT * FROM spot_cues WHERE spot_id = ?').all(spot.id);
    }
    return {
      html: cover(buildCallerSheetHTML({ cueFields: show.cue_fields, show, spots, colorSlotsBySpot, cues, spotCuesBySpot, characters, scenes, label, customActions, showTracks: opts.showTracks !== false }),
        'Caller Sheet', spots, PAGE_MARGINS.caller, landscape),
      landscape, margin: PAGE_MARGINS.caller,
      fileName: `${show.title} - Caller Sheet - ${labelPart}.pdf`,
    };
  }
  if (kind === 'color') {
    const colorSlotsBySpot = {};
    for (const spot of spots) colorSlotsBySpot[spot.id] = slotsFor(spot.id);
    return {
      html: buildColorLoadHTML({ show, spots, colorSlotsBySpot, label }),
      landscape, margin: PAGE_MARGINS.color,
      fileName: `${show.title} - Color Load - ${labelPart}.pdf`,
    };
  }
  if (kind === 'notes') {
    const noteSpots = opts.spotId ? spots.filter(s => s.id === opts.spotId) : spots;
    const spotCues = database.prepare("SELECT sc.* FROM spot_cues sc JOIN cues c ON sc.cue_id = c.id WHERE c.show_id = ? AND sc.spot_note IS NOT NULL AND sc.spot_note != ''").all(opts.showId);
    return {
      html: buildSpotNotesHTML({ show, spots: noteSpots, cues, scenes, spotCues, characters, label }),
      landscape: false, margin: PAGE_MARGINS.notes,
      fileName: `${show.title} - Spot Notes - ${labelPart}.pdf`,
    };
  }
  if (kind === 'characters') {
    const cast = database.prepare('SELECT * FROM characters WHERE show_id = ? AND COALESCE(print_on_sheet, 1) = 1 ORDER BY sort_order, id').all(opts.showId);
    return {
      html: buildCharactersHTML({ show, characters: cast, label, showCostumeNotes: opts.showCostumeNotes !== false }),
      landscape: false, margin: PAGE_MARGINS.characters,
      fileName: `${show.title} - Characters - ${labelPart}.pdf`,
    };
  }
  if (kind === 'actions') {
    return {
      html: buildActionKeyHTML({ show, label, customActions, usedOnly: !!opts.usedOnly, spotCues: showSpotCues() }),
      landscape: false, margin: PAGE_MARGINS.actions,
      fileName: `${show.title} - Action Key - ${labelPart}.pdf`,
    };
  }
  if (kind === 'scenes') {
    return {
      html: buildSceneListHTML({ show, label, scenes, cues }),
      landscape: false, margin: PAGE_MARGINS.scenes,
      fileName: `${show.title} - Scene List - ${labelPart}.pdf`,
    };
  }
  throw new Error('Unknown sheet: ' + kind);
}

function setupIPC() {
  // iPad Sync tab (Show Settings): the local-network connection for SpotPlot for iPad
  // Each show has its own switch, code and paired iPads
  ipcMain.on('ipad-sync-state', (event, showId) => { event.returnValue = ipadSync.syncState(showId); });
  ipcMain.handle('ipad-sync-set-enabled', (event, { showId, enabled }) => ipadSync.setEnabled(showId, enabled));
  ipcMain.on('ipad-sync-new-code', (event, showId) => { event.returnValue = ipadSync.regenerateCode(showId); });
  ipcMain.on('ipad-sync-forget', (event, { showId, id }) => { event.returnValue = ipadSync.forgetDevice(showId, id); });
  // Live print preview: the real PDF, so page breaks show exactly as they'll print.
  // Async (invoke) so the screen stays responsive while it renders.
  ipcMain.handle('print-preview', async (event, { kind, ...opts }) => {
    try {
      const sheet = buildSheet(kind, opts);
      const pdf = await renderPDFBuffer(sheet.html, sheet);
      return { success: true, pdf, pages: countPages(pdf) };
    } catch(e) {
      console.error('Print preview error:', e);
      return { success: false, error: e.message };
    }
  });
  // Leaving the print screen: shut down the preview's background Chrome
  ipcMain.on('print-closed', () => { closeBrowser(); });
  ipcMain.on('print-export', async (event, { kind, ...opts }) => {
    try {
      const { dialog } = require('electron');
      const sheet = buildSheet(kind, opts);
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: sheet.fileName,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (!filePath) { event.returnValue = { success: false, cancelled: true }; return; }
      await renderPDF(sheet.html, sheet, filePath);
      event.returnValue = { success: true, path: filePath };
    } catch(e) {
      console.error('PDF export error:', e);
      event.returnValue = { success: false, error: e.message };
    }
  });
  // Right-click menus drawn by macOS. The renderer describes the items ({ id, label, enabled,
  // checked, submenu, type }); a click sends 'context-menu-action' back with the item's id, and
  // 'context-menu-closed' fires when the menu goes away either way.
  ipcMain.on('show-context-menu', (event, items) => {
    const { Menu } = require('electron');
    const toTemplate = (list) => (list || []).map(it => {
      if (it.type === 'separator') return { type: 'separator' };
      const entry = { label: it.label, enabled: it.enabled !== false };
      if (it.submenu) entry.submenu = toTemplate(it.submenu);
      else if (it.id) entry.click = () => event.sender.send('context-menu-action', it.id);
      if (it.checked !== undefined) { entry.type = 'checkbox'; entry.checked = !!it.checked; }
      return entry;
    });
    Menu.buildFromTemplate(toTemplate(items)).popup({
      window: BrowserWindow.fromWebContents(event.sender),
      callback: () => { if (!event.sender.isDestroyed()) event.sender.send('context-menu-closed'); },
    });
  });

  // Anonymous ID for this Mac (the license server allows each license on 2 Macs).
  // Random, created once, kept in SpotPlot's data folder: no names or hardware info.
  ipcMain.on('window-is-fullscreen', (event) => { event.returnValue = !!(mainWindow && mainWindow.isFullScreen()); });

  ipcMain.on('get-device-info', (event) => {
    const fs = require('fs');
    const file = path.join(app.getPath('userData'), 'device.json');
    let deviceId = null;
    try { deviceId = JSON.parse(fs.readFileSync(file, 'utf8')).device_id; } catch(e) {}
    if (!deviceId) {
      deviceId = require('crypto').randomUUID();
      try { fs.writeFileSync(file, JSON.stringify({ device_id: deviceId })); } catch(e) {}
    }
    event.returnValue = { deviceId, appVersion: app.getVersion() };
  });
  ipcMain.on('reveal-file', (event, filePath) => {
    require('electron').shell.showItemInFolder(filePath);
  });
  ipcMain.on('db-export-show', async (event, showId) => {
    try {
      const { dialog } = require('electron');
      const data = exportShow(getDb(), showId);
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: `${data.show.title}.spotplot`,
        filters: [{ name: 'SpotPlot Show', extensions: ['spotplot'] }],
      });
      if (!filePath) { event.returnValue = { success: false, cancelled: true }; return; }
      // The printed sheets ride along (base64 PDFs), so SpotPlot for iPad has the paperwork for a show
      // opened from this file. Other Macs ignore them on import. See docs/sync-protocol.md.
      data.sheets = { spot: {}, caller: null };
      for (const spot of data.spots) {
        try {
          const sheet = buildSheet('spot', { showId, spotId: spot.id, label: '' });
          data.sheets.spot[spot.id] = (await renderPDFBuffer(sheet.html, sheet)).toString('base64');
        } catch (e) { console.error('Export: spot sheet failed', e); }
      }
      try {
        const sheet = buildSheet('caller', { showId, label: '' });
        data.sheets.caller = (await renderPDFBuffer(sheet.html, sheet)).toString('base64');
      } catch (e) { console.error('Export: caller sheet failed', e); }
      require('fs').writeFileSync(filePath, JSON.stringify(data));
      event.returnValue = { success: true, path: filePath };
    } catch(e) {
      console.error('Export error:', e);
      event.returnValue = { success: false, error: e.message };
    }
  });

  ipcMain.on('db-import-show', async (event) => {
    try {
      const { dialog } = require('electron');
      const { filePaths } = await dialog.showOpenDialog({
        filters: [{ name: 'SpotPlot Show', extensions: ['spotplot'] }],
        properties: ['openFile'],
      });
      if (!filePaths || !filePaths[0]) { event.returnValue = { success: false, cancelled: true }; return; }
      const { showId } = importShowFile(filePaths[0]);
      event.returnValue = { success: true, showId };
    } catch(e) {
      console.error('Import error:', e);
      event.returnValue = { success: false, error: e.message };
    }
  });
  // File → Import from FileMaker…: pick FS_Track.fmp12, see what's in it and what needs matching,
  // then import with the person's choices (src/fileMakerImport.js)
  let pendingFileMaker = null;
  ipcMain.on('filemaker-choose', async (event) => {
    try {
      const { dialog } = require('electron');
      const { filePaths } = await dialog.showOpenDialog({
        title: 'Import from FileMaker',
        message: 'Choose the show’s FS_Track.fmp12 file. SceneList.fmp12 is read too if it’s in the same folder.',
        filters: [{ name: 'FileMaker', extensions: ['fmp12'] }],
        properties: ['openFile'],
      });
      if (!filePaths || !filePaths[0]) { event.returnValue = { success: false, cancelled: true }; return; }
      pendingFileMaker = fileMaker.loadFileMakerShow(app, filePaths[0]);
      event.returnValue = { success: true, summary: pendingFileMaker.summary };
    } catch(e) {
      console.error('FileMaker read error:', e);
      event.returnValue = { success: false, error: e.message };
    }
  });
  ipcMain.on('filemaker-import', (event, choices) => {
    try {
      if (!pendingFileMaker) throw new Error('Choose a FileMaker file first.');
      const findGel = getDb().prepare("SELECT gel_name FROM gels WHERE UPPER(REPLACE(gel_number, ' ', '')) = ?");
      const gelName = (number) => (findGel.get(number.toUpperCase()) || {}).gel_name || '';
      const data = fileMaker.buildShowData(pendingFileMaker, choices, gelName);
      const { showId } = importShow(getDb(), data, { imagesDir: imagesDir() });
      pendingFileMaker = null;
      event.returnValue = { success: true, showId };
    } catch(e) {
      console.error('FileMaker import error:', e);
      event.returnValue = { success: false, error: e.message };
    }
  });
  ipcMain.on('db-get-shows', (event) => {
    try {
      const shows = getDb().prepare('SELECT * FROM shows ORDER BY created_at DESC').all();
      event.returnValue = shows;
    } catch(e) { event.returnValue = []; }
  });
  ipcMain.on('db-get-show', (event, showId) => {
    try {
      const show = getDb().prepare('SELECT * FROM shows WHERE id = ?').get(showId);
      event.returnValue = show || null;
    } catch(e) { event.returnValue = null; }
  });
  ipcMain.on('db-get-spots', (event, showId) => {
    try {
      const spots = getDb().prepare('SELECT * FROM spots WHERE show_id = ? ORDER BY COALESCE(display_order, spot_number * 1000)').all(showId);
      event.returnValue = spots;
    } catch(e) { event.returnValue = []; }
  });
ipcMain.on('get-app-icon', (event) => {
    try {
      const fs = require('fs');
      const iconPaths = [
        path.join(__dirname, '../../src/icon.png'),
        path.join(process.resourcesPath || '', 'icon.png'),
        path.join(app.getAppPath(), 'src/icon.png'),
        path.join(__dirname, 'icon.png'),
      ];
      for (const iconPath of iconPaths) {
        if (fs.existsSync(iconPath)) {
          const data = fs.readFileSync(iconPath);
          event.returnValue = 'data:image/png;base64,' + data.toString('base64');
          return;
        }
      }
      event.returnValue = null;
    } catch(e) {
      console.error('Icon load error:', e);
      event.returnValue = null;
    }
  });
  ipcMain.on('db-get-color-slots-all', (event, spotId) => {
    try {
      const slots = getDb().prepare('SELECT * FROM color_slots WHERE spot_id = ? ORDER BY is_permanent, slot_number').all(spotId);
      event.returnValue = slots;
    } catch(e) { event.returnValue = []; }
  });

  ipcMain.on('db-update-spot', (event, data) => {
    try {
      const { spotId, ...fields } = data;
      const allowed = ['operator_name', 'fixture_type', 'location', 'display_order'];
      for (const [key, value] of Object.entries(fields)) {
        if (allowed.includes(key)) {
          getDb().prepare(`UPDATE spots SET ${key} = ? WHERE id = ?`).run(value || '', spotId);
        }
      }
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });

  // "Permanent color" checkbox: give a spot a permanent gel slot, or remove it. Returns the spot's slots.
  ipcMain.on('db-set-perm-slot', (event, { spotId, enabled }) => {
    try {
      const database = getDb();
      const existing = database.prepare('SELECT id FROM color_slots WHERE spot_id = ? AND is_permanent = 1').get(spotId);
      if (enabled && !existing) {
        database.prepare("INSERT INTO color_slots (spot_id, slot_number, is_permanent, gel_number, gel_name) VALUES (?, NULL, 1, '', '')").run(spotId);
      } else if (!enabled && existing) {
        database.prepare('DELETE FROM color_slots WHERE spot_id = ? AND is_permanent = 1').run(spotId);
      }
      event.returnValue = database.prepare('SELECT * FROM color_slots WHERE spot_id = ? ORDER BY is_permanent, slot_number').all(spotId);
    } catch(e) { console.error('Perm slot error:', e); event.returnValue = null; }
  });
  // Removable color frames (Spot Settings). Frames keep their numbers, so removing Frame 2 of 4
  // leaves Frames 1, 3, 4; "+ Add frame" brings back the lowest missing number (up to 6).
  const MAX_FRAMES = 6;
  const allSlots = (spotId) => getDb().prepare('SELECT * FROM color_slots WHERE spot_id = ? ORDER BY is_permanent, slot_number').all(spotId);
  const cuesUsingFrame = (spotId, slotNumber) => getDb().prepare('SELECT id, active_frames FROM spot_cues WHERE spot_id = ?').all(spotId)
    .filter(sc => (sc.active_frames || '').split(',').includes('F' + slotNumber));
  ipcMain.on('db-frame-usage', (event, { spotId, slotNumber }) => {
    try { event.returnValue = cuesUsingFrame(spotId, slotNumber).length; } catch(e) { event.returnValue = 0; }
  });
  // slotNumber: a particular frame to add (Copy colors); otherwise the lowest missing one
  ipcMain.on('db-add-frame', (event, { spotId, slotNumber }) => {
    try {
      const used = allSlots(spotId).filter(s => !s.is_permanent).map(s => s.slot_number);
      let n = slotNumber || 1;
      if (!slotNumber) while (used.includes(n)) n++;
      if (n <= MAX_FRAMES && !used.includes(n)) getDb().prepare("INSERT INTO color_slots (spot_id, slot_number, is_permanent, gel_number, gel_name) VALUES (?, ?, 0, '', '')").run(spotId, n);
      event.returnValue = allSlots(spotId);
    } catch(e) { console.error('Add frame error:', e); event.returnValue = null; }
  });
  // replaceWith: another frame number to switch the cues that used this frame to, or null to just take it out of them
  ipcMain.on('db-remove-frame', (event, { spotId, slotId, replaceWith }) => {
    try {
      const database = getDb();
      const slot = database.prepare('SELECT * FROM color_slots WHERE id = ? AND spot_id = ? AND is_permanent = 0').get(slotId, spotId);
      if (!slot) { event.returnValue = allSlots(spotId); return; }
      const from = 'F' + slot.slot_number, to = replaceWith ? 'F' + replaceWith : null;
      const update = database.prepare('UPDATE spot_cues SET active_frames = ? WHERE id = ?');
      database.transaction(() => {
        for (const sc of cuesUsingFrame(spotId, slot.slot_number)) {
          const frames = sc.active_frames.split(',').filter(Boolean).map(f => f === from ? to : f).filter(Boolean);
          update.run([...new Set(frames)].join(','), sc.id);
        }
        database.prepare('DELETE FROM color_slots WHERE id = ?').run(slotId);
      })();
      event.returnValue = allSlots(spotId);
    } catch(e) { console.error('Remove frame error:', e); event.returnValue = null; }
  });
  ipcMain.on('db-update-color-slot', (event, { slotId, gel_number, gel_name, gelNumber, gelName }) => {
    try {
      const gNum = gel_number !== undefined ? gel_number : gelNumber;
      const gName = gel_name !== undefined ? gel_name : gelName;
      getDb().prepare('UPDATE color_slots SET gel_number = ?, gel_name = ? WHERE id = ?').run(gNum || '', gName || '', slotId);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });

  ipcMain.on('db-add-spot', (event, { showId, spotNumber }) => {
    try {
      const database = getDb();
      const result = database.prepare('INSERT INTO spots (show_id, spot_number, operator_name, fixture_type, location) VALUES (?, ?, ?, ?, ?)').run(showId, spotNumber, '', '', '');
      const spotId = result.lastInsertRowid;
      for (let i = 1; i <= 6; i++) {
        database.prepare('INSERT INTO color_slots (spot_id, slot_number, is_permanent, gel_number, gel_name) VALUES (?, ?, 0, ?, ?)').run(spotId, i, '', '');
      }
      database.prepare('INSERT INTO color_slots (spot_id, slot_number, is_permanent, gel_number, gel_name) VALUES (?, NULL, 1, ?, ?)').run(spotId, '', '');
      database.prepare('UPDATE shows SET num_spots = (SELECT COUNT(*) FROM spots WHERE show_id = ?) WHERE id = ?').run(showId, showId);
      // Create spot_cue records for all existing cues
      const existingCues = database.prepare('SELECT * FROM cues WHERE show_id = ?').all(showId);
      for (const cue of existingCues) {
        database.prepare('INSERT OR IGNORE INTO spot_cues (cue_id, spot_id, action, character_id, frame_size, intensity, fade_time, active_frames, description, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(cue.id, spotId, 'Off', null, '', '', '', '', '', '');
      }
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });

  ipcMain.on('db-swap-spots', (event, { spotAId, spotBId }) => {
    // Swaps every cue's data between two spots; gels, operator and location stay with each spot
    try {
      const database = getDb();
      database.transaction(() => {
        database.prepare('UPDATE spot_cues SET spot_id = CASE spot_id WHEN @a THEN @b ELSE @a END WHERE spot_id IN (@a, @b)').run({ a: spotAId, b: spotBId });
      })();
      event.returnValue = { success: true };
    } catch(e) {
      console.error('Swap spots error:', e);
      event.returnValue = { success: false, error: e.message };
    }
  });
  // Delete a spot. The other spots keep their numbers (delete Spot 2 and the show has Spots 1 and 3)
  // unless renumber is set, which closes the gap in number order (Spot 3 becomes Spot 2).
  ipcMain.on('db-remove-spot', (event, arg) => {
    try {
      const { spotId, renumber } = typeof arg === 'object' ? arg : { spotId: arg, renumber: false };
      const database = getDb();
      const spot = database.prepare('SELECT * FROM spots WHERE id = ?').get(spotId);
      database.prepare('DELETE FROM spot_cues WHERE spot_id = ?').run(spotId);
      database.prepare('DELETE FROM color_slots WHERE spot_id = ?').run(spotId);
      database.prepare('DELETE FROM spots WHERE id = ?').run(spotId);
      const remaining = database.prepare('SELECT * FROM spots WHERE show_id = ? ORDER BY spot_number').all(spot.show_id);
      if (renumber) remaining.forEach((s, i) => database.prepare('UPDATE spots SET spot_number = ? WHERE id = ?').run(i + 1, s.id));
      database.prepare('UPDATE shows SET num_spots = ? WHERE id = ?').run(remaining.length, spot.show_id);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });
  ipcMain.on('db-update-show', (event, data) => {
    try {
      const database = getDb();
      const { showId, form, ...fields } = data;
      
      if (form) {
        // Legacy form-based update
        database.prepare(`
          UPDATE shows SET title = ?, theatre = ?, producer = ?, designer = ?,
          associate_ld = ?, assistant_ld = ?, production_electrician = ?, programmer = ?,
          logo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(form.title, form.theatre || '', form.producer || '', form.designer || '',
          form.associate_ld || '', form.assistant_ld || '', form.production_electrician || '',
          form.programmer || '', form.logo_path || '', showId);
      } else {
        // Field-by-field update
        const allowed = ['title','theatre','producer','designer','associate_ld','assistant_ld','production_electrician','programmer','logo_path','iris_sizes','custom_actions','cue_fields'];
        for (const [key, value] of Object.entries(fields)) {
          if (allowed.includes(key)) {
            database.prepare(`UPDATE shows SET ${key} = ? WHERE id = ?`).run(value, showId);
          }
        }
      }
      event.returnValue = { success: true };
    } catch(e) { 
      console.error('db-update-show error:', e);
      event.returnValue = { success: false }; 
    }
  });
  ipcMain.on('db-delete-show', (event, showId) => {
    try {
      getDb().prepare('DELETE FROM shows WHERE id = ?').run(showId);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });
  ipcMain.on('db-update-character', (event, { characterId, name, actorName, costumeNotes, photoPath }) => {
    try {
      getDb().prepare('UPDATE characters SET name = ?, actor_name = ?, costume_notes = ?, photo_path = ? WHERE id = ?').run(name, actorName || '', costumeNotes || '', photoPath || '', characterId);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });

  ipcMain.on('db-delete-character', (event, characterId) => {
    try {
      getDb().prepare('UPDATE spot_cues SET character_id = NULL WHERE character_id = ?').run(characterId);
      getDb().prepare('DELETE FROM characters WHERE id = ?').run(characterId);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });

  ipcMain.on('db-reorder-characters', (event, updates) => {
    try {
      const database = getDb();
      const stmt = database.prepare('UPDATE characters SET sort_order = ? WHERE id = ?');
      const update = database.transaction((updates) => {
        for (const u of updates) stmt.run(u.sort_order, u.id);
      });
      update(updates);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });
  ipcMain.on('db-update-scene', (event, { sceneId, label, song, actBreak }) => {
    try {
      getDb().prepare('UPDATE scenes SET label = ?, song = ?, act_break = ? WHERE id = ?').run(label, song || '', actBreak ? 1 : 0, sceneId);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });

  ipcMain.on('db-delete-scene', (event, sceneId) => {
    try {
      getDb().prepare('UPDATE cues SET scene_id = NULL WHERE scene_id = ?').run(sceneId);
      getDb().prepare('DELETE FROM scenes WHERE id = ?').run(sceneId);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });

  ipcMain.on('db-reorder-scenes', (event, updates) => {
    try {
      const database = getDb();
      const stmt = database.prepare('UPDATE scenes SET sort_order = ? WHERE id = ?');
      const update = database.transaction((updates) => {
        for (const u of updates) stmt.run(u.sort_order, u.id);
      });
      update(updates);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });
  ipcMain.on('dialog-open-image', (event) => {
    const { dialog } = require('electron');
    const result = dialog.showOpenDialogSync({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'gif'] }],
    });
    if (!result) { event.returnValue = null; return; }
    try { event.returnValue = storeImageCopy(result[0]); }
    catch(e) { console.error('Image copy error:', e); event.returnValue = result[0]; }
  });
  // Images dropped onto the window: keep our own copy, like the picker does
  ipcMain.on('store-image', (event, filePath) => {
    try { event.returnValue = storeImageCopy(filePath); }
    catch(e) { console.error('Image copy error:', e); event.returnValue = filePath; }
  });
  ipcMain.on('db-create-show', (event, { form, spots }) => {
    try {
      const database = getDb();
      const showStmt = database.prepare(`
        INSERT INTO shows (title, theatre, producer, designer, associate_ld,
          assistant_ld, production_electrician, programmer, num_spots, logo_path)
        VALUES (@title, @theatre, @producer, @designer, @associate_ld,
          @assistant_ld, @production_electrician, @programmer, @num_spots, @logo_path)
      `);
      const spotStmt = database.prepare(`
        INSERT INTO spots (show_id, spot_number, fixture_type, location, operator_name)
        VALUES (@show_id, @spot_number, @fixture_type, @location, @operator_name)
      `);
      const gelStmt = database.prepare(`
        INSERT INTO color_slots (spot_id, slot_number, is_permanent, gel_number, gel_name)
        VALUES (@spot_id, @slot_number, @is_permanent, @gel_number, @gel_name)
      `);
      const create = database.transaction(() => {
        const showResult = showStmt.run({ ...form, num_spots: spots.length, logo_path: form.logo_path || null });
        const showId = showResult.lastInsertRowid;
        for (const spot of spots) {
          const spotResult = spotStmt.run({
            show_id: showId,
            spot_number: spot.spot_number,
            fixture_type: (spot.fixture_type === 'Other' ? spot.fixture_other : spot.fixture_type) || '',
            location: spot.location || '',
            operator_name: spot.operator_name || '',
          });
          const spotId = spotResult.lastInsertRowid;
          for (const gel of spot.gels) {
            gelStmt.run({
              spot_id: spotId,
              slot_number: gel.slot,
              is_permanent: 0,
              gel_number: gel.gel_number || '',
              gel_name: gel.gel_name || '',
            });
          }
          if (spot.perm_gel_number || spot.perm_gel_name) {
            gelStmt.run({
              spot_id: spotId,
              slot_number: null,
              is_permanent: 1,
              gel_number: spot.perm_gel_number || '',
              gel_name: spot.perm_gel_name || '',
            });
          }
        }
      });
      create();
      event.returnValue = { success: true };
    } catch(e) {
      console.error(e);
      console.error('PDF generation error:', e);
      event.returnValue = { success: false, error: e.message };
    }
  });
  ipcMain.on('db-reorder-spots', (event, updates) => {
    try {
      const database = getDb();
      for (const u of updates) {
        database.prepare('UPDATE spots SET display_order = ? WHERE id = ?').run(u.display_order, u.id);
      }
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });
  ipcMain.on('db-search-gels', (event, query) => {
    try {
      // Exact number first ("R4615"), then numbers starting with what was typed, then name matches
      const t = String(query || '').trim();
      const q = '%' + t + '%';
      const results = getDb().prepare(`
        SELECT * FROM gels
        WHERE gel_number LIKE ? OR gel_name LIKE ?
        ORDER BY (UPPER(gel_number) = UPPER(?)) DESC, (gel_number LIKE ?) DESC, (gel_number LIKE ?) DESC,
                 LENGTH(gel_number), gel_number
        LIMIT 20
      `).all(q, q, t, t + '%', '_' + t + '%');
      event.returnValue = results;
    } catch(e) { event.returnValue = []; }
  });
  ipcMain.on('db-update-cue-scene', (event, { cueId, sceneId }) => {
    try {
      getDb().prepare('UPDATE cues SET scene_id = ? WHERE id = ?').run(sceneId, cueId);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });
ipcMain.on('db-get-show-stats', (event, showId) => {
    try {
      const database = getDb();
      const cues = database.prepare('SELECT COUNT(*) as c FROM cues WHERE show_id = ?').get(showId);
      const scenes = database.prepare('SELECT COUNT(*) as c FROM scenes WHERE show_id = ?').get(showId);
      const characters = database.prepare('SELECT COUNT(*) as c FROM characters WHERE show_id = ?').get(showId);
      const spots = database.prepare('SELECT * FROM spots WHERE show_id = ? ORDER BY COALESCE(display_order, spot_number * 1000)').all(showId);
      event.returnValue = { cues: cues.c, scenes: scenes.c, characters: characters.c, spots };
    } catch(e) { event.returnValue = { cues: 0, scenes: 0, characters: 0, spots: [] }; }
  });
 ipcMain.on('db-get-cue-list', (event, showId) => {
    try {
      const database = getDb();
      const spots = database.prepare('SELECT * FROM spots WHERE show_id = ? ORDER BY COALESCE(display_order, spot_number * 1000)').all(showId);
      const scenes = database.prepare('SELECT * FROM scenes WHERE show_id = ? ORDER BY sort_order').all(showId);
      const cues = database.prepare(`
        SELECT c.*, s.label as scene_label, s.song as scene_song
        FROM cues c
        LEFT JOIN scenes s ON c.scene_id = s.id
        WHERE c.show_id = ?
        ORDER BY c.sort_order, c.id
      `).all(showId);
      const spotCues = database.prepare(`
        SELECT sc.* FROM spot_cues sc
        JOIN cues c ON sc.cue_id = c.id
        WHERE c.show_id = ?
      `).all(showId);
      event.returnValue = { spots, scenes, cues, spotCues };
    } catch(e) { console.error(e); event.returnValue = { spots: [], scenes: [], cues: [], spotCues: [] }; }
  });

  ipcMain.on('db-get-color-slots', (event, spotId) => {
    try {
      const slots = getDb().prepare('SELECT * FROM color_slots WHERE spot_id = ? AND is_permanent = 0 ORDER BY slot_number').all(spotId);
      event.returnValue = slots;
    } catch(e) { event.returnValue = []; }
  });

  ipcMain.on('db-get-scenes', (event, showId) => {
    try {
      const scenes = getDb().prepare('SELECT * FROM scenes WHERE show_id = ? ORDER BY sort_order').all(showId);
      event.returnValue = scenes;
    } catch(e) { event.returnValue = []; }
  });

  ipcMain.on('db-create-scene', (event, { showId, label, song, actBreak }) => {
    try {
      const database = getDb();
      const maxSort = database.prepare('SELECT MAX(sort_order) as m FROM scenes WHERE show_id = ?').get(showId);
      const sort = (maxSort.m || 0) + 1;
      const result = database.prepare('INSERT INTO scenes (show_id, label, song, act_break, sort_order) VALUES (?, ?, ?, ?, ?)').run(showId, label, song || '', actBreak ? 1 : 0, sort);
      event.returnValue = { success: true, id: result.lastInsertRowid };
    } catch(e) { event.returnValue = { success: false }; }
  });

  // Renumber T· (track numbers) 1, 2, 3… in the order the cue list shows. cueIds is that order.
  // Only track_number changes: cue order (sort_order), scenes and LQ numbers are never touched.
  // Undo for Renumber T·: puts back each cue's previous T· number ([{ id, track_number }], this show's cues only)
  ipcMain.on('db-restore-tracks', (event, { showId, tracks }) => {
    try {
      const database = getDb();
      const setTrack = database.prepare('UPDATE cues SET track_number = ? WHERE id = ? AND show_id = ?');
      database.transaction(() => { tracks.forEach(t => setTrack.run(t.track_number, t.id, showId)); })();
      event.returnValue = { success: true };
    } catch(e) {
      event.returnValue = { success: false, error: e.message };
    }
  });
  ipcMain.on('db-renumber-tracks', (event, { showId, cueIds }) => {
    try {
      const database = getDb();
      const showCueIds = database.prepare('SELECT id FROM cues WHERE show_id = ?').all(showId).map(c => c.id);
      // Refuse unless the list is exactly this show's cues, each once
      if (cueIds.length !== showCueIds.length || new Set(cueIds).size !== cueIds.length || !cueIds.every(id => showCueIds.includes(id))) {
        event.returnValue = { success: false, error: 'The cue list changed. Reopen it and try again.' };
        return;
      }
      const setTrack = database.prepare('UPDATE cues SET track_number = ? WHERE id = ? AND show_id = ?');
      database.transaction(() => { cueIds.forEach((id, i) => setTrack.run(i + 1, id, showId)); })();
      event.returnValue = { success: true, count: cueIds.length };
    } catch(e) {
      event.returnValue = { success: false, error: e.message };
    }
  });

  // afterCueId puts the new cue after that one; beforeCueId (right-click Insert Cue Above) puts it before
  ipcMain.on('db-create-cue', (event, { showId, sceneId, afterCueId, beforeCueId }) => {
    try {
      const database = getDb();
      const maxTrack = database.prepare('SELECT MAX(track_number) as m FROM cues WHERE show_id = ?').get(showId);
      const trackNum = (maxTrack.m || 0) + 1;
      const spots = database.prepare('SELECT * FROM spots WHERE show_id = ? ORDER BY COALESCE(display_order, spot_number * 1000)').all(showId);

      const allCues = database.prepare('SELECT * FROM cues WHERE show_id = ? ORDER BY sort_order ASC, id ASC').all(showId);

      let insertIndex;
      let prevCueId = null;

      if (beforeCueId) {
        // Same as inserting after the cue before it; at the very top, insertIndex is -1
        insertIndex = allCues.findIndex(c => c.id === beforeCueId) - 1;
        prevCueId = insertIndex >= 0 ? allCues[insertIndex].id : null;
      } else if (afterCueId) {
        insertIndex = allCues.findIndex(c => c.id === afterCueId);
        prevCueId = afterCueId;
      } else {
        insertIndex = allCues.length - 1;
        prevCueId = allCues.length > 0 ? allCues[allCues.length - 1].id : null;
      }

            let newSortOrder;
      if (insertIndex >= 0 && insertIndex < allCues.length) {
        const afterCue = allCues[insertIndex];
        const nextCue = allCues[insertIndex + 1];
        if (nextCue) {
          newSortOrder = Math.round((afterCue.sort_order + nextCue.sort_order) / 2);
        } else {
          newSortOrder = afterCue.sort_order + 1000;
        }
      } else if (beforeCueId && allCues.length) {
        newSortOrder = allCues[0].sort_order - 500;
      } else {
        newSortOrder = (allCues.length + 1) * 1000;
      }

      const result = database.prepare('INSERT INTO cues (show_id, scene_id, track_number, sort_order, lq_number) VALUES (?, ?, ?, ?, ?)').run(showId, sceneId || null, trackNum, newSortOrder, '');
      const newCueId = result.lastInsertRowid;

      const allCuesAfterInsert = database.prepare('SELECT * FROM cues WHERE show_id = ? ORDER BY sort_order ASC, id ASC').all(showId);
      allCuesAfterInsert.forEach((c, i) => {
        database.prepare('UPDATE cues SET sort_order = ? WHERE id = ?').run((i + 1) * 1000, c.id);
      });

      let prevSpotCues = {};
      if (prevCueId) {
        const prevSCs = database.prepare('SELECT * FROM spot_cues WHERE cue_id = ?').all(prevCueId);
        prevSCs.forEach(sc => { prevSpotCues[sc.spot_id] = sc; });
      }

      for (const spot of spots) {
        const prevSpotCue = prevSpotCues[spot.id] || null;
        const prevAction = prevSpotCue ? prevSpotCue.action : '';
        const endsInOff = ['Fade Out', 'Bump Out', 'Fade In Place', 'Up & Out'].includes(prevAction);
        const wasOff = prevAction === 'Off';
        const startsOff = endsInOff || wasOff;

                database.prepare('INSERT INTO spot_cues (cue_id, spot_id, action, character_id, custom_character, intensity, fade_time, active_frames, description, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          newCueId,
          spot.id,
          startsOff ? 'Off' : '',
          startsOff ? null : (prevSpotCue ? prevSpotCue.character_id : null),
          startsOff ? null : (prevSpotCue ? prevSpotCue.custom_character : null),
          '',
          '',
          startsOff ? '' : (prevSpotCue ? prevSpotCue.active_frames : ''),
          '',
          ''
        );
      }

      event.returnValue = { success: true, id: newCueId, track_number: trackNum };
    } catch(e) {
      console.error(e);
      event.returnValue = { success: false };
    }
  });

  // Renaming an iris size (Show Settings → Iris Sizes) renames it in every cue of the show too
  ipcMain.on('db-rename-iris-size', (event, { showId, from, to }) => {
    try {
      const r = getDb().prepare('UPDATE spot_cues SET frame_size = ? WHERE frame_size = ? AND cue_id IN (SELECT id FROM cues WHERE show_id = ?)').run(to, from, showId);
      event.returnValue = { success: true, changed: r.changes };
    } catch(e) { event.returnValue = { success: false, error: e.message }; }
  });

  ipcMain.on('db-update-cue', (event, { cueId, field, value }) => {
    try {
      const safe = ['lq_number','scene_id','caller_notes','rehearsal_notes','ignore','sort_order','page'];
      if (!safe.includes(field)) { event.returnValue = { success: false }; return; }
      getDb().prepare(`UPDATE cues SET ${field} = ? WHERE id = ?`).run(value, cueId);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });

  ipcMain.on('db-update-spot-cue', (event, { spotCueId, field, value }) => {
    try {
      getDb().prepare(`UPDATE spot_cues SET ${field} = ? WHERE id = ?`).run(value, spotCueId);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });

  ipcMain.on('db-upsert-spot-cue', (event, { spotId, cueId, field, value }) => {
    try {
      const database = getDb();
      let sc = database.prepare('SELECT * FROM spot_cues WHERE spot_id = ? AND cue_id = ?').get(spotId, cueId);
      if (!sc) {
        database.prepare('INSERT INTO spot_cues (spot_id, cue_id, action, character_id, frame_size, intensity, fade_time, active_frames, description, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(spotId, cueId, '', null, '', '', '', '', '', '');
        sc = database.prepare('SELECT * FROM spot_cues WHERE spot_id = ? AND cue_id = ?').get(spotId, cueId);
      }
      database.prepare(`UPDATE spot_cues SET ${field} = ? WHERE id = ?`).run(value, sc.id);
      event.returnValue = { success: true, id: sc.id };
    } catch(e) { event.returnValue = { success: false }; }
  });

  ipcMain.on('db-get-characters', (event, showId) => {
    try {
      const chars = getDb().prepare('SELECT * FROM characters WHERE show_id = ? ORDER BY sort_order, name').all(showId);
      event.returnValue = chars;
    } catch(e) { event.returnValue = []; }
  });

  ipcMain.on('db-create-character', (event, { showId, name, actorName, printOnSheet = 1 }) => {
    try {
      const database = getDb();
      const maxSort = database.prepare('SELECT MAX(sort_order) as m FROM characters WHERE show_id = ?').get(showId);
      const sort = (maxSort.m || 0) + 1;
      const result = database.prepare('INSERT INTO characters (show_id, name, actor_name, sort_order, print_on_sheet) VALUES (?, ?, ?, ?, ?)').run(showId, name, actorName || '', sort, printOnSheet ? 1 : 0);
      event.returnValue = { success: true, id: result.lastInsertRowid };
    } catch(e) { event.returnValue = { success: false }; }
  });
  // Characters screen "Print" checkbox: whether the character appears on the Characters print sheet
  ipcMain.on('db-set-character-print', (event, { characterId, value }) => {
    try {
      getDb().prepare('UPDATE characters SET print_on_sheet = ? WHERE id = ?').run(value ? 1 : 0, characterId);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });
  // A new custom character name was typed in a cue: add it to the show's characters, or keep it custom?
  ipcMain.on('dialog-add-character', (event, name) => {
    const { dialog } = require('electron');
    event.returnValue = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      message: `Add "${name}" to this show's characters?`,
      detail: 'It will show on the Characters screen and in every cue\'s character list. Or keep it as a custom name for just this cue.',
      buttons: ['Add to Characters', 'Keep as Custom'],
      defaultId: 0,
      cancelId: 1,
    }) === 0;
  });

  ipcMain.on('db-delete-cue', (event, cueId) => {
    try {
      getDb().prepare('DELETE FROM cues WHERE id = ?').run(cueId);
      event.returnValue = { success: true };
    } catch(e) { event.returnValue = { success: false }; }
  });
}

let mainWindow;
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'SpotPlot',
    icon: path.join(__dirname, '../src/icons/mac/icon.icns'),
    // No grey title bar: the window buttons sit inside SpotPlot's own top bar (AppHeader), like
    // Apple's apps on current macOS. The top bar's empty space drags the window.
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 20, y: 19 },
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      contextIsolation: false,
      plugins: true, // built-in PDF viewer for the print preview
    },
  });

// Full screen hides the window buttons, so the top bar can use that space
  const sendFullScreen = () => mainWindow.webContents.send('window-fullscreen', mainWindow.isFullScreen());
  mainWindow.on('enter-full-screen', sendFullScreen);
  mainWindow.on('leave-full-screen', sendFullScreen);

mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    // Only SpotPlot's own pages; the built-in PDF viewer (print preview) loads internal pages
    // that break if their headers are replaced
    if (!/^(https?|file):/.test(details.url)) return callback({ responseHeaders: details.responseHeaders });
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' https://spotplot-server.onrender.com"],
        'Content-Type': ['text/html; charset=utf-8'],
      }
    });
  });

 mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  windowReady = false;
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.setTitle('SpotPlot');
    windowReady = true;
    if (pendingOpenFile) { const f = pendingOpenFile; pendingOpenFile = null; openShowFile(f); }
  });
  if (!app.isPackaged) mainWindow.webContents.openDevTools();
};

app.whenReady().then(async () => {
  getDb();
  setupIPC();
  ipadSync.initIpadSync({ app, getDb, exportShow, buildSheet, renderPDFBuffer });
    getDb();

  const { Menu, shell } = require('electron');
  // Help → Send Feedback / Contact Support: an email to support with the version details filled in,
  // so nobody has to look them up
  const emailSupport = (subject, prompt) => {
    const details = `SpotPlot ${app.getVersion()} · macOS ${process.getSystemVersion()} · ${process.arch === 'arm64' ? 'Apple silicon' : 'Intel'} Mac`;
    const body = `${prompt}\n\n\n\n---\n${details}`;
    shell.openExternal(`mailto:wheeler@wheelermoon.com?subject=${encodeURIComponent(subject + ' (' + app.getVersion() + ')')}&body=${encodeURIComponent(body)}`);
  };
  // Settings → Help & Feedback uses the same emails
  ipcMain.on('email-support', (event, kind) => {
    if (kind === 'feedback') emailSupport('SpotPlot feedback', 'What would you like to tell us? Ideas, bugs, anything.');
    else emailSupport('SpotPlot support', 'What happened, and what were you doing when it happened? A screenshot helps.');
  });
  const template = [
    {
      label: 'SpotPlot',
      submenu: [
        { label: 'About SpotPlot', role: 'about' },
        { type: 'separator' },
        { label: 'Check for Updates…', click: () => updates.check() },
        { type: 'separator' },
        { label: 'Hide SpotPlot', role: 'hide' },
        { label: 'Hide Others', role: 'hideOthers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit SpotPlot', role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'New Show', accelerator: 'CmdOrCtrl+N', click: () => { mainWindow.webContents.send('menu-new-show'); } },
        { label: 'Export Show', accelerator: 'CmdOrCtrl+E', click: () => { mainWindow.webContents.send('menu-export-show'); } },
        { label: 'Import Show', accelerator: 'CmdOrCtrl+I', click: () => { mainWindow.webContents.send('menu-import-show'); } },
        { label: 'Import from FileMaker…', click: () => { mainWindow.webContents.send('menu-import-filemaker'); } },
        { type: 'separator' },
        { label: 'Close Window', role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        { label: 'Select All', role: 'selectAll' },
        { type: 'separator' },
        { label: 'Add Cue', accelerator: 'CmdOrCtrl+=', click: () => { mainWindow.webContents.send('menu-add-cue'); } },
      ],
    },
    {
      label: 'View',
      submenu: [
        ...(!app.isPackaged ? [
          { label: 'Reload', role: 'reload' },
          { label: 'Toggle Developer Tools', role: 'toggleDevTools' },
          { type: 'separator' },
        ] : []),
        { label: 'Actual Size', role: 'resetZoom' },
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Full Screen', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', role: 'minimize' },
        { label: 'Zoom', role: 'zoom' },
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Show Tips Again', click: () => { mainWindow.webContents.send('menu-show-tips'); } },
        { type: 'separator' },
        { label: 'SpotPlot Website', click: () => { shell.openExternal('https://spotplotapp.com'); } },
        { label: 'Send Feedback…', click: () => emailSupport('SpotPlot feedback', 'What would you like to tell us? Ideas, bugs, anything.') },
        { label: 'Contact Support', click: () => emailSupport('SpotPlot support', 'What happened, and what were you doing when it happened? A screenshot helps.') },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  const updates = initUpdates({ app, getWindow: () => mainWindow });

 try {
    const puppeteer = require('puppeteer');
    const fs = require('fs');
    const path = require('path');
    
    if (app.isPackaged) {
      // Use bundled Chromium
      const bundledChrome = path.join(process.resourcesPath, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
      if (fs.existsSync(bundledChrome)) {
        global.chromiumPath = bundledChrome;
        console.log('Using bundled Chromium:', bundledChrome);
      } else {
        console.log('Bundled Chromium not found, falling back to download');
        global.chromiumPath = puppeteer.executablePath();
      }
    } else {
      // Dev mode: use the same pinned Chrome build the app bundles (src/chromeVersion.js),
      // downloading it once if missing, instead of fetching the latest stable on every update
      const { install, computeExecutablePath, detectBrowserPlatform } = require('@puppeteer/browsers');
      const { CHROME_BUILD } = require('./chromeVersion');
      const cacheDir = path.join(require('os').homedir(), '.cache', 'puppeteer');
      const pinned = computeExecutablePath({ browser: 'chrome', buildId: CHROME_BUILD, cacheDir });
      if (!fs.existsSync(pinned)) {
        console.log('Downloading Chrome for Testing ' + CHROME_BUILD + '...');
        await install({ browser: 'chrome', buildId: CHROME_BUILD, cacheDir, platform: detectBrowserPlatform() });
      }
      global.chromiumPath = pinned;
    }
  } catch(e) {
    console.log('Chromium setup error:', e.message);
  }

  createWindow();
});