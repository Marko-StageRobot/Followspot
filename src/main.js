const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const Database = require('better-sqlite3');
const { exportShow, importShow } = require('./showFile');
const { buildSpotSheetHTML, buildCallerSheetHTML, buildColorLoadHTML, buildSpotNotesHTML, buildCharactersHTML, renderPDF, renderPDFBuffer, countPages, closeBrowser, PAGE_MARGINS } = require('./pdfGenerator');

if (require('electron-squirrel-startup')) app.quit();
const { autoUpdater } = require('electron');

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
}

// The gel catalog. Gels added to this list later are added to existing databases too
// (anything missing is inserted on launch), so new gels reach everyone.
function seedGels() {
  const count = db.prepare('SELECT COUNT(*) as c FROM gels').get();
  if (count.c < 500) db.prepare('DELETE FROM gels').run(); // an old, incomplete catalog: start fresh
  const exists = db.prepare('SELECT 1 FROM gels WHERE manufacturer = ? AND gel_number = ?');
  const insert = db.prepare('INSERT INTO gels (manufacturer, gel_number, gel_name) VALUES (?, ?, ?)');
  const insertMissing = db.transaction((gels) => {
    for (const g of gels) if (!exists.get(g[0], g[1])) insert.run(g[0], g[1], g[2]);
  });
  insertMissing([
    // ROSCO ROSCOLUX - Colors
    ['Rosco','R00','Clear'],
    ['Rosco','R01','Light Bastard Amber'],['Rosco','R02','Bastard Amber'],
    ['Rosco','R03','Dark Bastard Amber'],['Rosco','R04','Medium Bastard Amber'],
    ['Rosco','R05','Rose Tint'],['Rosco','R06','No Color Straw'],
    ['Rosco','R07','Pale Yellow'],['Rosco','R08','Pale Gold'],
    ['Rosco','R09','Pale Amber Gold'],['Rosco','R10','Medium Yellow'],
    ['Rosco','R11','Light Straw'],['Rosco','R12','Straw'],
    ['Rosco','R13','Straw Tint'],['Rosco','R14','Medium Straw'],
    ['Rosco','R15','Deep Straw'],['Rosco','R16','Light Amber'],
    ['Rosco','R17','Light Flame'],['Rosco','R18','Flame'],
    ['Rosco','R19','Fire'],['Rosco','R20','Medium Amber'],
    ['Rosco','R21','Golden Amber'],['Rosco','R22','Deep Amber'],
    ['Rosco','R23','Orange'],['Rosco','R24','Scarlet'],
    ['Rosco','R25','Orange Red'],['Rosco','R26','Light Red'],
    ['Rosco','R27','Medium Red'],['Rosco','R28','Bright Red'],
    ['Rosco','R29','Plasa Red'],['Rosco','R30','Light Salmon Pink'],
    ['Rosco','R31','Salmon Pink'],['Rosco','R32','Medium Salmon Pink'],
    ['Rosco','R33','No Color Pink'],['Rosco','R34','Floral Pink'],
    ['Rosco','R35','Light Pink'],['Rosco','R36','Medium Pink'],
    ['Rosco','R37','Pale Rose Pink'],['Rosco','R38','Light Rose'],
    ['Rosco','R39','Skelton Exotic Sangria'],['Rosco','R40','Light Salmon'],
    ['Rosco','R41','Salmon'],['Rosco','R42','Deep Salmon'],
    ['Rosco','R43','Deep Pink'],['Rosco','R44','Middle Rose'],
    ['Rosco','R45','Rose'],['Rosco','R46','Magenta'],
    ['Rosco','R47','Light Rose Purple'],['Rosco','R48','Rose Purple'],
    ['Rosco','R49','Medium Purple'],['Rosco','R50','Mauve'],
    ['Rosco','R51','Surprise Pink'],['Rosco','R52','Light Lavender'],
    ['Rosco','R53','Pale Lavender'],['Rosco','R54','Special Lavender'],
    ['Rosco','R55','Lilac'],['Rosco','R56','Dark Amethyst'],
    ['Rosco','R57','Lavender'],['Rosco','R58','Deep Lavender'],
    ['Rosco','R59','Indigo'],['Rosco','R60','No Color Blue'],
    ['Rosco','R61','Mist Blue'],['Rosco','R62','Booster Blue'],
    ['Rosco','R63','Pale Blue'],['Rosco','R64','Light Steel Blue'],
    ['Rosco','R65','Daylight Blue'],['Rosco','R66','Cool Blue'],
    ['Rosco','R67','Light Sky Blue'],['Rosco','R68','Sky Blue'],
    ['Rosco','R69','Brilliant Blue'],['Rosco','R70','Nile Blue'],
    ['Rosco','R71','Sea Blue'],['Rosco','R72','Azure Blue'],
    ['Rosco','R73','Peacock Blue'],['Rosco','R74','Night Blue'],
    ['Rosco','R75','Twilight Blue'],['Rosco','R76','Light Green Blue'],
    ['Rosco','R77','Green Blue'],['Rosco','R78','Trudy Blue'],
    ['Rosco','R79','Bright Blue'],['Rosco','R80','Primary Blue'],
    ['Rosco','R81','Urban Blue'],['Rosco','R82','Surprise Blue'],
    ['Rosco','R83','Medium Blue'],['Rosco','R84','Zephyr Blue'],
    ['Rosco','R85','Deep Blue'],['Rosco','R86','Pea Green'],
    ['Rosco','R87','Pale Yellow Green'],['Rosco','R88','Light Green'],
    ['Rosco','R89','Moss Green'],['Rosco','R90','Dark Yellow Green'],
    ['Rosco','R91','Primary Green'],['Rosco','R92','Turquoise'],
    ['Rosco','R93','Blue Green'],['Rosco','R94','Kelly Green'],
    ['Rosco','R95','Medium Green'],['Rosco','R96','Lime'],
    ['Rosco','R97','Light Grey'],['Rosco','R98','Medium Grey'],
    ['Rosco','R99','Chocolate'],
    // ROSCO 300-series
    ['Rosco','R302','Pale Bastard Amber'],
    ['Rosco','R303','Warm Peach'],['Rosco','R304','Pale Apricot'],
    ['Rosco','R305','Rose Gold'],['Rosco','R310','Daffodil'],
    ['Rosco','R312','Canary'],['Rosco','R313','Light Relief Yellow'],
    ['Rosco','R316','Gallo Gold'],['Rosco','R317','Apricot'],
    ['Rosco','R318','Mayan Sun'],['Rosco','R321','Soft Golden Amber'],
    ['Rosco','R324','Cherry Red'],['Rosco','R331','Shell Pink'],
    ['Rosco','R332','Cherry Rose'],['Rosco','R333','Blush Pink'],
    ['Rosco','R336','Billington Pink'],['Rosco','R339','Broadway Pink'],
    ['Rosco','R342','Rose Pink'],['Rosco','R343','Neon Pink'],
    ['Rosco','R344','Follies Pink'],['Rosco','R346','Tropical Magenta'],
    ['Rosco','R347','Belladonna Rose'],['Rosco','R348','Purple Jazz'],
    ['Rosco','R349','Fischer Fuchsia'],['Rosco','R351','Lavender Mist'],
    ['Rosco','R353','Lilly Lavender'],['Rosco','R355','Pale Violet'],
    ['Rosco','R356','Middle Lavender'],['Rosco','R357','Royal Lavender'],
    ['Rosco','R358','Rose Indigo'],['Rosco','R359','Medium Violet'],
    ['Rosco','R360','Clearwater'],['Rosco','R362','Tipton Blue'],
    ['Rosco','R363','Aquamarine'],['Rosco','R364','Blue Bell'],
    ['Rosco','R365','Tharon Delft Blue'],['Rosco','R366','Jordan Blue'],
    ['Rosco','R367','Slate Blue'],['Rosco','R369','Tahitian Blue'],
    ['Rosco','R370','Italian Blue'],['Rosco','R371','Theatre Booster 1'],
    ['Rosco','R372','Theatre Booster 2'],['Rosco','R373','Theatre Booster 3'],
    ['Rosco','R374','Sea Green'],['Rosco','R376','Bermuda Blue'],
    ['Rosco','R377','Iris Purple'],['Rosco','R378','Alice Blue'],
    ['Rosco','R382','Congo Blue'],['Rosco','R383','Sapphire Blue'],
    ['Rosco','R384','Midnight Blue'],['Rosco','R385','Royal Blue'],
    ['Rosco','R386','Leaf Green'],['Rosco','R388','Gaslight Green'],
    ['Rosco','R389','Chroma Green'],['Rosco','R392','Pacific Green'],
    ['Rosco','R393','Emerald Green'],['Rosco','R395','Teal Green'],
    ['Rosco','R397','Pale Grey'],['Rosco','R398','Neutral Grey'],
    // ROSCO Diffusions & Frosts
    ['Rosco','R100','Frost'],['Rosco','R101','Light Frost'],
    ['Rosco','R102','Light Tough Frost'],['Rosco','R103','Tough Frost'],
    ['Rosco','R104','Tough Silk'],['Rosco','R105','Tough Spun'],
    ['Rosco','R106','Light Tough Spun'],['Rosco','R107','Tough Rolux'],
    ['Rosco','R108','Hilite'],['Rosco','R109','Opal Frost'],
    ['Rosco','R110','Opal'],['Rosco','R111','Tough Opal'],
    ['Rosco','R112','Tough Silk'],['Rosco','R113','Matte Silk'],
    ['Rosco','R114','Hamburg Frost'],['Rosco','R115','Tough Booster Green'],
    ['Rosco','R116','Tough White Diffusion'],['Rosco','R117','Half Tough White Diffusion'],
    ['Rosco','R119','Light Hamburg Frost'],['Rosco','R120','Red Diffusion'],
    ['Rosco','R121','Blue Diffusion'],['Rosco','R122','Green Diffusion'],
    ['Rosco','R124','Red Cyc Silk'],['Rosco','R125','Blue Cyc Silk'],
    ['Rosco','R126','Green Cyc Silk'],['Rosco','R127','Amber Cyc Silk'],
    ['Rosco','R132','Quarter Hamburg Frost'],
    // ROSCO Cinegel - Diffusions
    ['Rosco','R3000','Cinegel Tough Rolux'],['Rosco','R3006','Cinegel Tough Spun'],
    ['Rosco','R3007','Cinegel Light Spun'],['Rosco','R3008','Cinegel Hilite'],
    ['Rosco','R3010','Cinegel Tough Frost'],['Rosco','R3012','Cinegel Light Frost'],
    ['Rosco','R3014','Cinegel Opal Frost'],['Rosco','R3015','Cinegel Light Grid Cloth'],
    ['Rosco','R3016','Cinegel Grid Cloth'],['Rosco','R3017','Cinegel Tough Grid Cloth'],
    ['Rosco','R3018','Cinegel Silent Grid Cloth'],['Rosco','R3019','Cinegel Silent Light Grid'],
    ['Rosco','R3020','Cinegel Tough Silk'],['Rosco','R3021','Cinegel Soft Frost'],
    ['Rosco','R3026','Cinegel Light Hamburg Frost'],['Rosco','R3027','Cinegel Hamburg Frost'],
    ['Rosco','R3028','Cinegel Heavy Frost'],['Rosco','R3029','Cinegel Tough White Diffusion'],
    ['Rosco','R3030','Cinegel Ultra Bounce'],['Rosco','R3031','Cinegel Full Bounce'],
    ['Rosco','R3032','Cinegel Light Grid Cloth'],
    // ROSCO Cinegel - Color Corrections (CTB)
    ['Rosco','R3202','Full Blue CTB'],['Rosco','R3203','3/4 Blue CTB'],
    ['Rosco','R3204','Half Blue CTB'],['Rosco','R3206','Third Blue CTB'],
    ['Rosco','R3208','Quarter Blue CTB'],['Rosco','R3216','Eighth Blue CTB'],
    ['Rosco','R3220','Double Blue CTB'],
    // ROSCO Cinegel - Color Corrections (CTO)
    ['Rosco','R3401','Sun 85 CTO'],['Rosco','R3407','Full CTO'],
    ['Rosco','R3408','Half CTO'],['Rosco','R3409','Quarter CTO'],
    ['Rosco','R3410','Eighth CTO'],
    // ROSCO Cinegel - Plus/Minus Green
    ['Rosco','R3304','Full Plus Green'],['Rosco','R3308','Full Minus Green'],
    ['Rosco','R3313','Half Minus Green'],['Rosco','R3314','Quarter Minus Green'],
    ['Rosco','R3315','Half Plus Green'],['Rosco','R3316','Quarter Plus Green'],
    // ROSCO Cinegel - Neutral Density
    ['Rosco','R3401','ND 0.3 (1 Stop)'],['Rosco','R3402','ND 0.6 (2 Stop)'],
    ['Rosco','R3403','ND 0.9 (3 Stop)'],['Rosco','R3404','ND 1.2 (4 Stop)'],
    ['Rosco','R3405','ND 1.5 (5 Stop)'],
    // LEE FILTERS - Colors
    ['Lee','L001','Pale Yellow'],['Lee','L002','Pale Amber'],
    ['Lee','L003','Straw'],['Lee','L004','Medium Bastard Amber'],
    ['Lee','L005','Rose Tint'],['Lee','L006','No Color Straw'],
    ['Lee','L007','Pale Rose'],['Lee','L008','Pale Gold'],
    ['Lee','L009','Pale Amber Gold'],['Lee','L010','Medium Yellow'],
    ['Lee','L011','Light Straw'],['Lee','L013','Straw Tint'],
    ['Lee','L015','Deep Straw'],['Lee','L016','Light Amber'],
    ['Lee','L017','Light Flame'],['Lee','L018','Flame'],
    ['Lee','L019','Fire'],['Lee','L020','Medium Amber'],
    ['Lee','L021','Gold Amber'],['Lee','L022','Deep Amber'],
    ['Lee','L023','Orange'],['Lee','L024','Scarlet'],
    ['Lee','L025','Sunset Red'],['Lee','L026','Bright Red'],
    ['Lee','L027','Medium Red'],['Lee','L029','Plasa Red'],
    ['Lee','L030','Light Salmon Pink'],['Lee','L031','Salmon Pink'],
    ['Lee','L032','Medium Salmon Pink'],['Lee','L033','No Color Pink'],
    ['Lee','L034','Flesh Pink'],['Lee','L035','Light Pink'],
    ['Lee','L036','Medium Pink'],['Lee','L037','Pale Rose Pink'],
    ['Lee','L038','Light Rose'],['Lee','L039','Pink'],
    ['Lee','L040','Light Salmon'],['Lee','L041','Salmon'],
    ['Lee','L042','Deep Salmon'],['Lee','L043','Deep Pink'],
    ['Lee','L044','Middle Rose'],['Lee','L045','Rose'],
    ['Lee','L046','Magenta'],['Lee','L047','Light Rose Purple'],
    ['Lee','L048','Rose Purple'],['Lee','L049','Medium Purple'],
    ['Lee','L050','Mauve'],['Lee','L051','Surprise Pink'],
    ['Lee','L052','Light Lavender'],['Lee','L053','Pale Lavender'],
    ['Lee','L054','Special Lavender'],['Lee','L055','Lilac'],
    ['Lee','L056','Gypsy Lavender'],['Lee','L057','Lavender'],
    ['Lee','L058','Deep Lavender'],['Lee','L059','Indigo'],
    ['Lee','L061','Mist Blue'],['Lee','L062','Booster Blue'],
    ['Lee','L063','Pale Blue'],['Lee','L064','Light Steel Blue'],
    ['Lee','L065','Daylight Blue'],['Lee','L066','Cool Blue'],
    ['Lee','L067','Light Sky Blue'],['Lee','L068','Sky Blue'],
    ['Lee','L069','Brilliant Blue'],['Lee','L070','Nile Blue'],
    ['Lee','L071','Sea Blue'],['Lee','L072','Azure Blue'],
    ['Lee','L073','Peacock Blue'],['Lee','L074','Night Blue'],
    ['Lee','L075','Evening Blue'],['Lee','L079','Bright Blue'],
    ['Lee','L080','Primary Blue'],['Lee','L081','Urban Blue'],
    ['Lee','L082','Surprise Blue'],['Lee','L083','Medium Blue'],
    ['Lee','L085','Deep Blue'],['Lee','L086','Pea Green'],
    ['Lee','L088','Light Green'],['Lee','L089','Moss Green'],
    ['Lee','L091','Primary Green'],['Lee','L092','Turquoise'],
    ['Lee','L094','Kelly Green'],['Lee','L096','Lime'],
    ['Lee','L099','Chocolate'],['Lee','L100','Frost'],
    ['Lee','L101','Light Frost'],['Lee','L102','Light Tough Frost'],
    ['Lee','L103','Tough Frost'],['Lee','L104','Tough Silk'],
    ['Lee','L105','Tough Spun'],['Lee','L106','Light Tough Spun'],
    ['Lee','L107','Tough Rolux'],['Lee','L108','Hilite'],
    ['Lee','L109','Light Brown'],['Lee','L110','Opal Frost'],
    ['Lee','L111','Tough Opal'],['Lee','L112','Silk'],
    ['Lee','L113','Matte Silk'],['Lee','L114','Hamburg Frost'],
    ['Lee','L115','Tough Booster Green'],['Lee','L116','Tough Booster Blue'],
    ['Lee','L117','Steel Blue'],['Lee','L118','Antique Rose'],
    ['Lee','L119','Dark Blue'],['Lee','L120','Deep Blue'],
    ['Lee','L121','LEE Green'],['Lee','L122','Fern Green'],
    ['Lee','L124','Dark Green'],['Lee','L126','Mauve'],
    ['Lee','L127','Smoky Pink'],['Lee','L128','Broadcast Pink'],
    ['Lee','L129','Heavy Frost'],['Lee','L130','Clear'],
    ['Lee','L131','Marine Blue'],['Lee','L132','Medium Blue Green'],
    ['Lee','L134','Golden Amber'],['Lee','L135','Deep Golden Amber'],
    ['Lee','L136','Pale Lavender'],['Lee','L137','Special Lavender'],
    ['Lee','L138','Pale Green'],['Lee','L139','Primary Green'],
    ['Lee','L140','Summer Blue'],['Lee','L141','Bright Blue'],
    ['Lee','L142','Pale Violet'],['Lee','L143','Pale Navy Blue'],
    ['Lee','L144','No Color Blue'],['Lee','L147','Apricot'],
    ['Lee','L148','Bright Rose'],['Lee','L149','Scarlet'],
    ['Lee','L150','Ice Blue'],['Lee','L151','Gold Tint'],
    ['Lee','L152','Pale Gold'],['Lee','L153','Pale Salmon'],
    ['Lee','L154','Pale Rose'],['Lee','L156','Chocolate'],
    ['Lee','L157','Pink'],['Lee','L158','Deep Orange'],
    ['Lee','L159','No Color Pink'],['Lee','L160','Slate Blue'],
    ['Lee','L161','Slate Blue'],['Lee','L162','Bastard Amber'],
    ['Lee','L163','Aquamarine'],['Lee','L164','Flame Red'],
    ['Lee','L165','Daylight Blue'],['Lee','L166','Pale Red'],
    ['Lee','L167','Pale Yellow'],['Lee','L169','Lilac Tint'],
    ['Lee','L170','Deep Lavender'],['Lee','L172','Lagoon Blue'],
    ['Lee','L174','Dark Bastard Amber'],['Lee','L176','Loving Amber'],
    ['Lee','L177','Myrt'],['Lee','L178','Alice Blue'],
    ['Lee','L179','Chrome Orange'],['Lee','L180','Dark Lavender'],
    ['Lee','L181','Congo Blue'],['Lee','L182','Light Red'],
    ['Lee','L183','Moonlight Blue'],['Lee','L184','Cosmetic Peach'],
    ['Lee','L185','Cosmetic Silver Rose'],['Lee','L186','Cosmetic Aqua Rose'],
    ['Lee','L187','Cosmetic Highlight'],['Lee','L188','Cosmetic Silver Moss'],
    ['Lee','L190','Cosmetic Peach'],['Lee','L192','Flesh Pink'],
    ['Lee','L193','Rosy Amber'],['Lee','L194','Surprise Pink'],
    ['Lee','L195','Zenith Blue'],['Lee','L196','True Blue'],
    ['Lee','L197','Alice Blue'],['Lee','L198','Palace Blue'],
    ['Lee','L199','Regal Blue'],['Lee','L200','Double CT Blue'],
    ['Lee','L201','Full CT Blue'],['Lee','L202','Half CT Blue'],
    ['Lee','L203','Quarter CT Blue'],['Lee','L204','Full CT Orange'],
    ['Lee','L205','Half CT Orange'],['Lee','L206','Quarter CT Orange'],
    ['Lee','L207','Full CT Straw'],['Lee','L208','Half CT Straw'],
    ['Lee','L209','Full Minus Green'],['Lee','L210','Half Minus Green'],
    ['Lee','L211','Quarter Minus Green'],['Lee','L212','Full Plus Green'],
    ['Lee','L213','Half Plus Green'],['Lee','L214','Quarter Plus Green'],
    ['Lee','L218','Eighth CT Blue'],['Lee','L219','Eighth CT Orange'],
    ['Lee','L220','White Diffusion'],['Lee','L221','Silver Diffusion'],
    ['Lee','L222','Quarter White Diffusion'],['Lee','L223','Quarter Silver Diffusion'],
    ['Lee','L224','Eighth White Diffusion'],['Lee','L225','Quarter Quarter White Diffusion'],
    ['Lee','L226','Tough Spun'],['Lee','L227','Soft Frost'],
    ['Lee','L228','Brushed Silk'],['Lee','L229','Heavy Frost'],
    ['Lee','L230','Super White Frost'],['Lee','L231','Tough Rolux'],
    ['Lee','L232','Ultra Bounce'],['Lee','L236','Hamburg Frost'],
    ['Lee','L238','Tough Silk'],['Lee','L239','Opal Frost'],
    ['Lee','L241','Lee Frost'],['Lee','L242','Opal Diffusion'],
    ['Lee','L250','Half White Diffusion'],['Lee','L251','Half Silver Diffusion'],
    ['Lee','L252','Half Tough Spun'],['Lee','L253','Grid Cloth'],
    ['Lee','L254','Quarter Tough Spun'],['Lee','L256','Gridcloth'],
    ['Lee','L257','Mirror Silver'],['Lee','L258','Quarter Hampshire Frost'],
    ['Lee','L259','Half Hampshire Frost'],['Lee','L260','Hampshire Frost'],
    ['Lee','L261','Tough Opal'],['Lee','L262','Frost'],
    ['Lee','L263','Toughscreen'],
    // GAM GAMCOLOR - Magentas (100s)
    ['GAM','G100','Magenta'],['GAM','G105','Rose Pink'],
    ['GAM','G110','English Rose'],['GAM','G115','Surprise Pink'],
    ['GAM','G120','Rose'],['GAM','G125','Carnation'],
    ['GAM','G130','Rose'],['GAM','G135','Deep Rose'],
    ['GAM','G140','Pale Pink'],['GAM','G145','Light Pink'],
    ['GAM','G150','Pink'],['GAM','G155','Deep Pink'],
    ['GAM','G160','Hot Pink'],['GAM','G165','Fuschia'],
    ['GAM','G170','Special Lavender'],['GAM','G175','Pale Lavender'],
    ['GAM','G180','Lavender'],['GAM','G185','Deep Lavender'],
    ['GAM','G190','Dark Lavender'],
    // GAM GAMCOLOR - Reds (200s)
    ['GAM','G200','Scarlet'],['GAM','G205','Light Red'],
    ['GAM','G210','Red'],['GAM','G215','Medium Red'],
    ['GAM','G220','Deep Red'],['GAM','G225','Dark Red'],
    ['GAM','G230','Pale Salmon'],['GAM','G235','Light Salmon'],
    ['GAM','G240','Salmon'],['GAM','G245','Deep Salmon'],
    ['GAM','G250','Flesh Pink'],['GAM','G255','Pale Rose Pink'],
    ['GAM','G260','Light Rose'],['GAM','G265','Rose'],
    ['GAM','G270','Deep Rose'],['GAM','G275','Cherry'],
    ['GAM','G280','Ruby'],['GAM','G285','Magenta Rose'],
    // GAM GAMCOLOR - Oranges (300s)
    ['GAM','G300','Pale Straw'],['GAM','G305','Straw'],
    ['GAM','G310','English Rose'],['GAM','G315','Light Amber'],
    ['GAM','G320','Amber'],['GAM','G325','Medium Amber'],
    ['GAM','G330','Deep Amber'],['GAM','G335','Golden Amber'],
    ['GAM','G340','Orange'],['GAM','G345','Deep Orange'],
    ['GAM','G350','Dark Orange'],['GAM','G355','Light Flame'],
    ['GAM','G360','Flame'],['GAM','G365','Sunset'],
    ['GAM','G370','Apricot'],['GAM','G375','Peach'],
    ['GAM','G380','Salmon Pink'],['GAM','G385','Coral'],
    ['GAM','G390','Warm Peach'],
    // GAM GAMCOLOR - Yellows (400s)
    ['GAM','G400','Pale Yellow'],['GAM','G405','Light Yellow'],
    ['GAM','G410','Yellow'],['GAM','G415','Medium Yellow'],
    ['GAM','G420','Deep Yellow'],['GAM','G425','Gold'],
    ['GAM','G430','Pale Gold'],['GAM','G435','Light Gold'],
    ['GAM','G440','Gold Tint'],['GAM','G445','Pale Straw'],
    ['GAM','G450','Lemon'],['GAM','G455','Lime Yellow'],
    // GAM GAMCOLOR - Yellow Greens (500s)
    ['GAM','G500','Pale Yellow Green'],['GAM','G505','Light Yellow Green'],
    ['GAM','G510','Yellow Green'],['GAM','G515','Medium Yellow Green'],
    ['GAM','G520','Lime'],['GAM','G525','Bright Yellow Green'],
    ['GAM','G530','Spring Green'],['GAM','G535','Leaf Green'],
    ['GAM','G540','Moss Green'],['GAM','G545','Olive Green'],
    ['GAM','G550','Yellow Olive'],
    // GAM GAMCOLOR - Greens (600s)
    ['GAM','G600','Pale Green'],['GAM','G605','Light Green'],
    ['GAM','G610','Green'],['GAM','G615','Medium Green'],
    ['GAM','G620','Deep Green'],['GAM','G625','Dark Green'],
    ['GAM','G630','Primary Green'],['GAM','G635','Emerald Green'],
    ['GAM','G640','Teal'],['GAM','G645','Mint Green'],
    ['GAM','G650','Turquoise'],['GAM','G655','Rich Green'],
    ['GAM','G660','Forest Green'],['GAM','G665','Jade Green'],
    // GAM GAMCOLOR - Blue Greens (700s)
    ['GAM','G700','Pale Blue Green'],['GAM','G705','Light Blue Green'],
    ['GAM','G710','Blue Green'],['GAM','G715','Medium Blue Green'],
    ['GAM','G720','Teal Blue'],['GAM','G725','Deep Blue Green'],
    ['GAM','G730','Aquamarine'],['GAM','G735','Peacock Blue'],
    ['GAM','G740','Lagoon Blue'],['GAM','G745','Sea Blue'],
    ['GAM','G750','Cyan'],['GAM','G755','Deep Cyan'],
    // GAM GAMCOLOR - Blues (800s)
    ['GAM','G800','Pale Blue'],['GAM','G805','Light Blue'],
    ['GAM','G810','Sky Blue'],['GAM','G815','Medium Blue'],
    ['GAM','G820','Daylight Blue'],['GAM','G825','Steel Blue'],
    ['GAM','G830','Deep Blue'],['GAM','G835','Royal Blue'],
    ['GAM','G840','Dark Blue'],['GAM','G845','Night Blue'],
    ['GAM','G850','Congo Blue'],['GAM','G855','Sapphire Blue'],
    ['GAM','G860','Primary Blue'],['GAM','G865','Urban Blue'],
    ['GAM','G870','Mist Blue'],['GAM','G875','Ice Blue'],
    ['GAM','G880','No Color Blue'],['GAM','G885','Booster Blue'],
    // GAM GAMCOLOR - Violets (900s)
    ['GAM','G900','Pale Violet'],['GAM','G905','Light Violet'],
    ['GAM','G910','Violet'],['GAM','G915','Medium Violet'],
    ['GAM','G920','Deep Violet'],['GAM','G925','Purple'],
    ['GAM','G930','Indigo'],['GAM','G935','Dark Purple'],
    ['GAM','G940','Mauve'],['GAM','G945','Lavender'],
    ['GAM','G950','Lilac'],['GAM','G955','Rose Purple'],
    // GAM Diffusions
    ['GAM','G1505','Diffusion - Light Frost'],
    ['GAM','G1510','Diffusion - Frost'],
    ['GAM','G1515','Diffusion - Heavy Frost'],
    ['GAM','G1520','Diffusion - Tough Silk'],
    ['GAM','G1525','Diffusion - Tough Spun'],
    ['GAM','G1530','Diffusion - Light Tough Spun'],
    ['GAM','G1535','Diffusion - Opal Frost'],
    ['GAM','G1540','Diffusion - Hamburg Frost'],
    ['GAM','G1545','Diffusion - Light Diffusion'],
    ['GAM','G1550','Diffusion - Medium Diffusion'],
    ['GAM','G1555','Diffusion - Heavy Diffusion'],
    ['GAM','G1560','Diffusion - Rolux'],
    ['GAM','G1565','Diffusion - Soft Frost'],
    ['GAM','G1570','Diffusion - Grid Cloth'],
    ['GAM','G1575','Diffusion - Light Grid Cloth'],
    ['GAM','G1580','Diffusion - Tough Grid Cloth'],
    ['GAM','G1585','Diffusion - White Diffusion'],
    ['GAM','G1590','Diffusion - Silver Diffusion'],
    ['GAM','G1595','Diffusion - Ultra Bounce'],
    ['GAM','G1600','Diffusion - Bounce Board'],
  ]);
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

  if (kind === 'spot') {
    const spot = spots.find(s => s.id === opts.spotId);
    return {
      html: buildSpotSheetHTML({
        cueFields: show.cue_fields, show, spot, colorSlots: slotsFor(spot.id), cues, characters, scenes, label, customActions,
        spotCues: database.prepare('SELECT * FROM spot_cues WHERE spot_id = ?').all(spot.id),
        numSpots: spots.length, hideOff: !!opts.hideOff, hideTracked: !!opts.hideTracked,
        rangeStart: opts.rangeStart ?? null, rangeEnd: opts.rangeEnd ?? null, showTracks: opts.showTracks !== false,
      }),
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
      html: buildCallerSheetHTML({ cueFields: show.cue_fields, show, spots, colorSlotsBySpot, cues, spotCuesBySpot, characters, scenes, label, customActions, showTracks: opts.showTracks !== false }),
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
  throw new Error('Unknown sheet: ' + kind);
}

function setupIPC() {
  // iPad Sync tab (Show Settings): the local-network connection for SpotPlot for iPad
  ipcMain.on('ipad-sync-state', (event) => { event.returnValue = ipadSync.syncState(); });
  ipcMain.handle('ipad-sync-set-enabled', (event, enabled) => ipadSync.setEnabled(enabled));
  ipcMain.on('ipad-sync-new-code', (event) => { event.returnValue = ipadSync.regenerateCode(); });
  ipcMain.on('ipad-sync-forget', (event, id) => { event.returnValue = ipadSync.forgetDevice(id); });
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
  // Anonymous ID for this Mac (the license server allows each license on 2 Macs).
  // Random, created once, kept in SpotPlot's data folder: no names or hardware info.
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
      require('fs').writeFileSync(filePath, JSON.stringify(data, null, 2));
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
      database.prepare('UPDATE shows SET num_spots = ? WHERE id = ?').run(spotNumber, showId);
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
  ipcMain.on('db-remove-spot', (event, spotId) => {
    try {
      const database = getDb();
      const spot = database.prepare('SELECT * FROM spots WHERE id = ?').get(spotId);
      database.prepare('DELETE FROM spot_cues WHERE spot_id = ?').run(spotId);
      database.prepare('DELETE FROM color_slots WHERE spot_id = ?').run(spotId);
      database.prepare('DELETE FROM spots WHERE id = ?').run(spotId);
      const remaining = database.prepare('SELECT * FROM spots WHERE show_id = ? ORDER BY COALESCE(display_order, spot_number * 1000)').all(spot.show_id);
      remaining.forEach((s, i) => database.prepare('UPDATE spots SET spot_number = ? WHERE id = ?').run(i + 1, s.id));
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
      const q = '%' + query + '%';
      const results = getDb().prepare(`
        SELECT * FROM gels
        WHERE gel_number LIKE ? OR gel_name LIKE ?
        ORDER BY manufacturer, gel_number
        LIMIT 20
      `).all(q, q);
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

  ipcMain.on('db-create-cue', (event, { showId, sceneId, afterCueId }) => {
    try {
      const database = getDb();
      const maxTrack = database.prepare('SELECT MAX(track_number) as m FROM cues WHERE show_id = ?').get(showId);
      const trackNum = (maxTrack.m || 0) + 1;
      const spots = database.prepare('SELECT * FROM spots WHERE show_id = ? ORDER BY COALESCE(display_order, spot_number * 1000)').all(showId);

      const allCues = database.prepare('SELECT * FROM cues WHERE show_id = ? ORDER BY sort_order ASC, id ASC').all(showId);

      let insertIndex;
      let prevCueId = null;

      if (afterCueId) {
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
      const safe = ['lq_number','scene_id','caller_notes','rehearsal_notes','ignore','sort_order'];
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
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      contextIsolation: false,
      plugins: true, // built-in PDF viewer for the print preview
    },
  });

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
  const template = [
    {
      label: 'SpotPlot',
      submenu: [
        { label: 'About SpotPlot', role: 'about' },
        { type: 'separator' },
        { label: 'Check for Updates...', click: () => { if (app.isPackaged) autoUpdater.checkForUpdates(); } },
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
        { label: 'Contact Support', click: () => { shell.openExternal('mailto:wheeler@wheelermoon.com'); } },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
 if (app.isPackaged) {
    autoUpdater.setFeedURL({
      url: `https://update.electronjs.org/wheeler-moon/Followspot/${process.platform}/${app.getVersion()}`,
    });
    autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
      const { dialog } = require('electron');
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `SpotPlot ${releaseName} is ready to install.`,
        buttons: ['Install Now', 'Later'],
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
    });
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
    });
    autoUpdater.on('update-available', () => {
      console.log('Update available');
    });
    autoUpdater.on('update-not-available', () => {
      console.log('No update available');
    });
    autoUpdater.on('error', (err) => {
      console.error('Updater error:', err);
    });
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 10000);
  }

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