// App updates (update.electronjs.org, from the GitHub releases of wheeler-moon/Followspot).
// Settings → General shows what's happening and lets people turn automatic checks off.
// The choice is kept per Mac in userData/settings.json.
const { autoUpdater, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const RECHECK_HOURS = 4;

function initUpdates({ app, getWindow }) {
  const settingsFile = path.join(app.getPath('userData'), 'settings.json');
  const readSettings = () => { try { return JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch (e) { return {}; } };
  const writeSettings = (patch) => { try { fs.writeFileSync(settingsFile, JSON.stringify({ ...readSettings(), ...patch }, null, 2)); } catch (e) {} };

  // state: idle | checking | downloading | up-to-date | ready | error | dev
  const status = {
    auto: readSettings().autoUpdate !== false,
    state: app.isPackaged ? 'idle' : 'dev',
    lastChecked: readSettings().lastUpdateCheck || null,
    version: null,
    error: null,
  };
  const publish = (patch) => {
    Object.assign(status, patch);
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send('updates-status', status);
  };

  const check = () => {
    if (!app.isPackaged) { publish({ state: 'dev' }); return; }
    if (status.state === 'checking' || status.state === 'downloading' || status.state === 'ready') return;
    const now = new Date().toISOString();
    writeSettings({ lastUpdateCheck: now });
    publish({ state: 'checking', lastChecked: now, error: null });
    try { autoUpdater.checkForUpdates(); } catch (e) { publish({ state: 'error', error: e.message }); }
  };

  ipcMain.on('updates-get', (event) => { event.returnValue = status; });
  ipcMain.on('updates-check-now', () => check());
  ipcMain.on('updates-set-auto', (event, on) => {
    writeSettings({ autoUpdate: !!on });
    publish({ auto: !!on });
    event.returnValue = status;
  });
  ipcMain.on('updates-install', () => { if (status.state === 'ready') autoUpdater.quitAndInstall(); });

  if (!app.isPackaged) return { check };

  autoUpdater.setFeedURL({
    url: `https://update.electronjs.org/wheeler-moon/Followspot/${process.platform}/${app.getVersion()}`,
  });
  autoUpdater.on('update-available', () => publish({ state: 'downloading' }));
  autoUpdater.on('update-not-available', () => publish({ state: 'up-to-date' }));
  autoUpdater.on('error', (err) => { console.error('Updater error:', err); publish({ state: 'error', error: err?.message || String(err) }); });
  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    publish({ state: 'ready', version: releaseName || null });
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `SpotPlot ${releaseName} is ready to install.`,
      buttons: ['Install Now', 'Later'],
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  // First check shortly after opening, then every few hours while the app stays open
  setTimeout(() => { if (status.auto) check(); }, 10000);
  setInterval(() => { if (status.auto) check(); }, RECHECK_HOURS * 60 * 60 * 1000);

  return { check };
}

module.exports = { initUpdates };
