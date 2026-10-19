const { ipcRenderer } = window.require('electron');

const LICENSE_CACHE_KEY = 'spotplot_license';
const SERVER_URL = 'https://spotplot-server.onrender.com';

export function getCachedLicense() {
  try {
    const cached = localStorage.getItem(LICENSE_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch(e) { return null; }
}

export function setCachedLicense(data) {
  try {
    localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify({
      ...data,
      cached_at: new Date().toISOString(),
    }));
  } catch(e) {}
}

export function isCacheValid(cached) {
  if (!cached) return false;
  const cachedAt = new Date(cached.cached_at);
  const now = new Date();
  const daysSinceCached = (now - cachedAt) / (1000 * 60 * 60 * 24);
  if (daysSinceCached > 7) return false;
  return cached.valid === true;
}

// This Mac's anonymous ID and SpotPlot version, sent with every license check (2-Mac limit)
let deviceInfo = null;
function device() {
  if (!deviceInfo) {
    const info = ipcRenderer.sendSync('get-device-info');
    deviceInfo = { device_id: info.deviceId, app_version: info.appVersion };
  }
  return deviceInfo;
}

export async function validateLicense(licenseKey) {
  try {
    const response = await fetch(SERVER_URL + '/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: licenseKey, ...device() }),
    });
    return await response.json();
  } catch(e) {
    console.error('Validation error:', e);
    return null;
  }
}

export async function activateLicense(licenseKey, email) {
  try {
    const response = await fetch(SERVER_URL + '/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: licenseKey, email, ...device() }),
    });
    const data = await response.json();
    return data;
  } catch(e) {
    return null;
  }
}
// Settings → Deactivate This Mac: takes this Mac off the license on the server, so its slot is
// free for another Mac. Returns true only when the server confirmed it.
export async function deactivateLicense(licenseKey) {
  try {
    const response = await fetch(SERVER_URL + '/deactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: licenseKey, device_id: device().device_id }),
    });
    const data = await response.json();
    return !!data?.success;
  } catch(e) {
    return false;
  }
}
