// iPad Sync (Phase 1 of docs/ipad-app-plan.md): a small web server on the local network that
// SpotPlot for iPad connects to. The Mac announces itself with Bonjour (macOS's dns-sd), iPads pair
// with a 6-digit code, then download shows (the same data as a .spotplot export) and their PDFs.
// iPads report in every few seconds so the iPad Sync tab can show who's online.
//
// Pairing and settings are per Mac (userData/ipad-sync.json), not part of any show.

const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const DEFAULT_PORT = 47800;
const SERVICE_TYPE = '_spotplot._tcp';
const PROTOCOL = 1;
const ONLINE_SECONDS = 15;

let ctx = null;          // { app, getDb, exportShow, buildSheet, renderPDFBuffer }
let server = null;
let port = null;
let bonjour = null;      // dns-sd child process
const online = new Map(); // deviceId -> { lastSeen, showId, role, spots, ip }
const failedPairs = [];  // timestamps of wrong codes, to slow down guessing

// ---- settings (enabled, pairing code, paired devices) ----

const settingsFile = () => path.join(ctx.app.getPath('userData'), 'ipad-sync.json');
function loadSettings() {
  try { return { enabled: false, devices: [], ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; }
  catch (e) { return { enabled: false, devices: [] }; }
}
function saveSettings(s) { fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2)); }
const newCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

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

function authDevice(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  return loadSettings().devices.find(d => d.token === token) || null;
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
    if (!s.code || String(code) !== s.code || !deviceId) {
      failedPairs.push(now);
      return send(res, 403, { error: 'That code doesn\'t match. Check the code in SpotPlot → Show Settings → iPad Sync.' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    s.devices = s.devices.filter(d => d.id !== deviceId);
    s.devices.push({ id: String(deviceId), name: String(deviceName || 'iPad').slice(0, 80), token, pairedAt: new Date().toISOString() });
    saveSettings(s);
    return send(res, 200, { token, name: computerName() });
  }

  const device = authDevice(req);
  if (!device) return send(res, 401, { error: 'This iPad isn\'t paired with this Mac. Pair it again.' });
  const db = ctx.getDb();

  if (route === 'POST /presence') {
    const { showId = null, role = null, spots = null } = await readJSON(req);
    online.set(device.id, { lastSeen: Date.now(), showId, role, spots, ip: req.socket.remoteAddress });
    return send(res, 200, { ok: true });
  }

  if (route === 'GET /shows') return send(res, 200, { shows: showList(db) });

  if (parts[1] === 'shows' && parts[2] && req.method === 'GET') {
    const showId = parseInt(parts[2], 10);
    if (!db.prepare('SELECT id FROM shows WHERE id = ?').get(showId)) return send(res, 404, { error: 'Show not found' });

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

function announce() {
  stopAnnounce();
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
  const s = loadSettings();
  if (!s.code) { s.code = newCode(); saveSettings(s); }
  if (s.enabled) await startServer();
  ctx.app.on('will-quit', stopServer);
}

// ---- for the iPad Sync tab ----

function syncState() {
  const s = loadSettings();
  const now = Date.now();
  return {
    enabled: !!s.enabled,
    running: !!server,
    port,
    name: computerName(),
    addresses: lanAddresses(),
    code: s.code,
    devices: s.devices.map(d => {
      const o = online.get(d.id);
      return { id: d.id, name: d.name, pairedAt: d.pairedAt, online: !!o && now - o.lastSeen < ONLINE_SECONDS * 1000,
        lastSeen: o ? new Date(o.lastSeen).toISOString() : null, showId: o?.showId ?? null, role: o?.role ?? null, spots: o?.spots ?? null };
    }),
  };
}

async function setEnabled(enabled) {
  const s = loadSettings(); s.enabled = !!enabled; saveSettings(s);
  if (enabled) await startServer(); else stopServer();
  return syncState();
}
function regenerateCode() { const s = loadSettings(); s.code = newCode(); saveSettings(s); return syncState(); }
function forgetDevice(id) {
  const s = loadSettings(); s.devices = s.devices.filter(d => d.id !== id); saveSettings(s);
  online.delete(id);
  return syncState();
}

module.exports = { initIpadSync, syncState, setEnabled, regenerateCode, forgetDevice };
