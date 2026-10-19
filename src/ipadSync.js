// iPad Sync (docs/ipad-app-plan.md, protocol in docs/sync-protocol.md): a small web server on the local
// network that SpotPlot for iPad connects to. The Mac announces itself with Bonjour (macOS's dns-sd).
// Each show has its own "Let iPads connect" switch and 6-digit code: an iPad that enters a show's code
// gets that show only (its token unlocks nothing else), and only while that show's switch is on.
// iPads download the show (the same data as a .spotplot export) and its PDFs, and report in every few
// seconds so the iPad Sync tab can show who's online.
//
// Settings live on this Mac (userData/ipad-sync.json), keyed by show id, not inside any show file.

const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const DEFAULT_PORT = 47800;
const SERVICE_TYPE = '_spotplot._tcp';
const PROTOCOL = 2;
const ONLINE_SECONDS = 15;

let ctx = null;          // { app, getDb, exportShow, buildSheet, renderPDFBuffer }
let server = null;
let port = null;
let bonjour = null;      // dns-sd child process
const online = new Map(); // "showId:deviceId" -> { lastSeen, showId, role, spots, ip }
const failedPairs = [];  // timestamps of wrong codes, to slow down guessing

// ---- settings: per show { enabled, code, devices: [{ id, name, token, pairedAt }] } ----

const settingsFile = () => path.join(ctx.app.getPath('userData'), 'ipad-sync.json');
function loadSettings() {
  try {
    const s = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    // Version 1 had one switch and code for the whole Mac; its pairings don't carry over
    if (s.version === 2 && s.shows) return s;
  } catch (e) {}
  return { version: 2, shows: {} };
}
function saveSettings(s) { fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2)); }
// A code no other show is using
function newCode(s) {
  const used = new Set(Object.values(s.shows).map(x => x.code));
  let code;
  do { code = String(crypto.randomInt(0, 1000000)).padStart(6, '0'); } while (used.has(code));
  return code;
}
function showSettings(s, showId) {
  const key = String(showId);
  if (!s.shows[key]) s.shows[key] = { enabled: false, code: newCode(s), devices: [] };
  return s.shows[key];
}
const anyEnabled = (s) => Object.values(s.shows).some(x => x.enabled);

function computerName() {
  try { return execFileSync('/usr/sbin/scutil', ['--get', 'ComputerName'], { encoding: 'utf8' }).trim(); }
  catch (e) { return os.hostname().replace(/\.local$/, ''); }
}

// IPv4 addresses iPads can type in if Bonjour is blocked on the network
function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address);
}

// ---- show data ----

// A fingerprint of everything in a show (images aside), so an iPad can tell whether its copy is current
function showVersion(db, showId) {
  const q = (sql) => db.prepare(sql).all(showId);
  const rows = [
    q('SELECT * FROM shows WHERE id = ?'),
    q('SELECT * FROM spots WHERE show_id = ?'),
    q('SELECT * FROM color_slots WHERE spot_id IN (SELECT id FROM spots WHERE show_id = ?)'),
    q('SELECT * FROM scenes WHERE show_id = ?'),
    q('SELECT * FROM characters WHERE show_id = ?'),
    q('SELECT * FROM cues WHERE show_id = ?'),
    q('SELECT sc.* FROM spot_cues sc JOIN cues c ON sc.cue_id = c.id WHERE c.show_id = ?'),
  ];
  return crypto.createHash('sha1').update(JSON.stringify(rows)).digest('hex').slice(0, 16);
}

function showList(db) {
  return db.prepare('SELECT id, title, theatre, num_spots FROM shows ORDER BY created_at DESC').all()
    .map(s => ({ ...s, version: showVersion(db, s.id) }));
}

// ---- HTTP ----

function send(res, status, body, type = 'application/json') {
  const data = type === 'application/json' ? JSON.stringify(body) : body;
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(data), 'Cache-Control': 'no-store' });
  res.end(data);
}

function readJSON(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 64 * 1024) { reject(new Error('Too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// The show and device a token belongs to, or null
function authDevice(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  for (const [showId, x] of Object.entries(loadSettings().shows)) {
    const device = x.devices.find(d => d.token === token);
    if (device) return { showId: parseInt(showId, 10), enabled: !!x.enabled, device };
  }
  return null;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  if (parts[0] !== 'api') return send(res, 404, { error: 'Not found' });
  const route = `${req.method} /${parts.slice(1).join('/')}`;

  // Anyone on the network can see that this is SpotPlot (that's all Bonjour says too)
  if (route === 'GET /hello') {
    return send(res, 200, { app: 'SpotPlot', protocol: PROTOCOL, version: ctx.app.getVersion(), name: computerName() });
  }

  if (route === 'POST /pair') {
    const now = Date.now();
    while (failedPairs.length && now - failedPairs[0] > 60000) failedPairs.shift();
    if (failedPairs.length >= 5) return send(res, 429, { error: 'Too many wrong codes. Wait a minute and try again.' });
    const { code, deviceId, deviceName } = await readJSON(req);
    const s = loadSettings();
    // The code picks the show: only a show with iPad Sync on accepts its code
    const match = Object.entries(s.shows).find(([, x]) => x.enabled && x.code === String(code));
    const db = ctx.getDb();
    const show = match && db.prepare('SELECT id, title FROM shows WHERE id = ?').get(parseInt(match[0], 10));
    if (!show || !deviceId) {
      failedPairs.push(now);
      return send(res, 403, { error: 'That code doesn\'t match a show. Check the code in SpotPlot → Show Settings → iPad Sync, and that Let iPads connect is on for that show.' });
    }
    const x = match[1];
    const token = crypto.randomBytes(24).toString('hex');
    x.devices = x.devices.filter(d => d.id !== String(deviceId));
    x.devices.push({ id: String(deviceId), name: String(deviceName || 'iPad').slice(0, 80), token, pairedAt: new Date().toISOString() });
    saveSettings(s);
    return send(res, 200, { token, name: computerName(), showId: show.id, title: show.title });
  }

  const auth = authDevice(req);
  if (!auth) return send(res, 401, { error: 'This iPad isn\'t paired with this show. Enter the show\'s code again.' });
  if (!auth.enabled) return send(res, 403, { error: 'iPad Sync is off for this show on the Mac.' });
  const { device } = auth;
  const db = ctx.getDb();
  if (!db.prepare('SELECT id FROM shows WHERE id = ?').get(auth.showId)) return send(res, 404, { error: 'This show is no longer on the Mac.' });

  if (route === 'POST /presence') {
    const { role = null, spots = null } = await readJSON(req);
    online.set(`${auth.showId}:${device.id}`, { lastSeen: Date.now(), showId: auth.showId, role, spots, ip: req.socket.remoteAddress });
    return send(res, 200, { ok: true });
  }

  // Only the show this iPad paired with
  if (route === 'GET /shows') return send(res, 200, { shows: showList(db).filter(x => x.id === auth.showId) });

  if (parts[1] === 'shows' && parts[2] && req.method === 'GET') {
    const showId = parseInt(parts[2], 10);
    if (showId !== auth.showId) return send(res, 404, { error: 'Show not found' });

    if (parts.length === 3) {
      return send(res, 200, { ...ctx.exportShow(db, showId), sync_version: showVersion(db, showId) });
    }
    if (parts[3] === 'pdf') {
      // kind=spot&spotId=… or kind=caller
      const kind = url.searchParams.get('kind');
      if (!['spot', 'caller'].includes(kind)) return send(res, 400, { error: 'Unknown sheet' });
      const opts = { showId, label: '' };
      if (kind === 'spot') opts.spotId = parseInt(url.searchParams.get('spotId'), 10);
      const sheet = ctx.buildSheet(kind, opts);
      const pdf = await ctx.renderPDFBuffer(sheet.html, sheet);
      return send(res, 200, pdf, 'application/pdf');
    }
  }
  return send(res, 404, { error: 'Not found' });
}

// ---- start / stop ----

// A SpotPlot that crashed or was force-quit can leave its announcement running on its own (its parent
// becomes launchd, pid 1), so iPads see this Mac twice. Clear those before announcing.
function clearOrphanedAnnouncements() {
  try {
    const lines = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' }).split('\n');
    for (const line of lines) {
      const m = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
      if (m && m[2] === '1' && m[3].startsWith('/usr/bin/dns-sd -R') && m[3].includes(SERVICE_TYPE)) {
        try { process.kill(parseInt(m[1], 10)); } catch (e) {}
      }
    }
  } catch (e) {}
}

function announce() {
  stopAnnounce();
  clearOrphanedAnnouncements();
  // Registered with macOS's own Bonjour (mDNSResponder) for as long as this process runs
  bonjour = spawn('/usr/bin/dns-sd', ['-R', `SpotPlot on ${computerName()}`, SERVICE_TYPE, 'local', String(port), `protocol=${PROTOCOL}`], { stdio: 'ignore' });
  bonjour.on('error', e => console.error('Bonjour announce failed:', e.message));
}
function stopAnnounce() { if (bonjour) { bonjour.kill(); bonjour = null; } }

function startServer() {
  if (server) return Promise.resolve();
  return new Promise((resolve) => {
    const tryPort = (p, fallback) => {
      const srv = http.createServer((req, res) => handle(req, res).catch(e => { console.error('iPad Sync error:', e); if (!res.headersSent) send(res, 500, { error: e.message }); }));
      srv.once('error', (e) => {
        if (e.code === 'EADDRINUSE' && fallback) tryPort(0, false); // someone else has 47800: take any free port
        else { console.error('iPad Sync could not start:', e.message); resolve(); }
      });
      srv.listen(p, '0.0.0.0', () => { server = srv; port = srv.address().port; announce(); resolve(); });
    };
    tryPort(DEFAULT_PORT, true);
  });
}

function stopServer() {
  stopAnnounce();
  if (server) { server.close(); server = null; port = null; }
  online.clear();
}

// Called once from main.js when the app is ready
async function initIpadSync(context) {
  ctx = context;
  if (anyEnabled(loadSettings())) await startServer();
  ctx.app.on('will-quit', stopServer);
}

// ---- for the iPad Sync tab ----

// One show's iPad Sync: its switch, code and paired iPads (with who's online)
function syncState(showId) {
  const s = loadSettings();
  const isNew = !s.shows[String(showId)];
  const x = showSettings(s, showId);
  if (isNew) saveSettings(s); // a show gets its code the first time it's looked at
  const now = Date.now();
  return {
    enabled: !!x.enabled,
    running: !!server,
    port,
    name: computerName(),
    addresses: lanAddresses(),
    code: x.code,
    devices: x.devices.map(d => {
      const o = online.get(`${showId}:${d.id}`);
      return { id: d.id, name: d.name, pairedAt: d.pairedAt, online: !!o && now - o.lastSeen < ONLINE_SECONDS * 1000,
        lastSeen: o ? new Date(o.lastSeen).toISOString() : null, role: o?.role ?? null, spots: o?.spots ?? null };
    }),
  };
}

// The server runs while any show has iPad Sync on
async function setEnabled(showId, enabled) {
  const s = loadSettings(); showSettings(s, showId).enabled = !!enabled; saveSettings(s);
  if (anyEnabled(s)) await startServer(); else stopServer();
  return syncState(showId);
}
// A new code for new pairings; iPads already paired stay paired
function regenerateCode(showId) { const s = loadSettings(); showSettings(s, showId).code = newCode(s); saveSettings(s); return syncState(showId); }
function forgetDevice(showId, id) {
  const s = loadSettings(); const x = showSettings(s, showId); x.devices = x.devices.filter(d => d.id !== id); saveSettings(s);
  online.delete(`${showId}:${id}`);
  return syncState(showId);
}

module.exports = { initIpadSync, syncState, setEnabled, regenerateCode, forgetDevice };
