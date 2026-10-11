import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');
import { getCachedLicense } from '../license';
import AppHeader from '../components/AppHeader';
import Tips from '../components/Tips';
import { TIPS } from '../tips';

const getImageSrc = (path) => {
  if (!path) return null;
  try {
    const fs = window.require('fs');
    const data = fs.readFileSync(path);
    const ext = path.split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch(e) { return null; }
};

export default function HomeScreen({ navigate }) {
  const [shows, setShows] = useState([]);
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const result = ipcRenderer.sendSync('db-get-shows');
    if (result) setShows(result);
  }, []);
    useEffect(() => {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.on('menu-new-show', () => navigate('new-show'));
    ipcRenderer.on('menu-import-show', () => {
      const result = ipcRenderer.sendSync('db-import-show');
      if (result.success) {
        const shows = ipcRenderer.sendSync('db-get-shows');
        if (shows) setShows(shows);
      }
    });
    // A .spotplot file was double-clicked in Finder and imported
    ipcRenderer.on('show-imported', () => {
      const shows = ipcRenderer.sendSync('db-get-shows');
      if (shows) setShows(shows);
    });
    return () => {
      ipcRenderer.removeAllListeners('menu-new-show');
      ipcRenderer.removeAllListeners('menu-import-show');
      ipcRenderer.removeAllListeners('show-imported');
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppHeader title="SpotPlot">
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowSettings(true)} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}>
          ⚙ Settings
        </button>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search shows..."
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFFFFF', padding: '6px 12px', fontSize: '13px', outline: 'none', width: '200px' }}
        />
        <button data-tour="import-show" onClick={() => {
          const result = ipcRenderer.sendSync('db-import-show');
          if (result.success) {
            alert('Show imported successfully!');
            const updated = ipcRenderer.sendSync('db-get-shows');
            setShows(Array.isArray(updated) ? updated : []);
          } else if (!result.cancelled) alert('Import failed: ' + result.error);
        }} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}>
          ↓ Import
        </button>
        <button data-tour="new-show" onClick={() => navigate('new-show')} style={{ padding: '8px 18px', background: '#0A84FF', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>+ New Show</button>
      </AppHeader>
      <div style={{ flex: 1, padding: '32px 24px', overflowY: 'auto' }}>
        {shows.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: '12px' }}>
            <div style={{ fontSize: '40px' }}>✦</div>
            <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.52)' }}>No shows yet</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.28)' }}>Create your first show to get started</div>
            <button onClick={() => navigate('new-show')} style={{ marginTop: '8px', padding: '10px 24px', background: '#0A84FF', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>+ New Show</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {shows.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || (s.theatre || '').toLowerCase().includes(search.toLowerCase())).map(show => (
              <div key={show.id} data-tour="show-card" onClick={() => navigate('show', show)}
                style={{ background: '#2A2A2A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#0A84FF'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  {show.logo_path && getImageSrc(show.logo_path) && (
                    <img src={getImageSrc(show.logo_path)} style={{ height: '36px', maxWidth: '60px', objectFit: 'contain', borderRadius: '6px' }} />
                  )}
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>{show.title}</div>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.52)', marginBottom: '12px' }}>{show.theatre || 'No theatre set'}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(255,255,255,0.1)',
                    borderRadius: '20px', color: 'rgba(255,255,255,0.62)' }}>{show.num_spots} spot{show.num_spots !== 1 ? 's' : ''}</span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${show.title}"? This cannot be undone.`)) {
                        ipcRenderer.sendSync('db-delete-show', show.id);
                        setShows(shows.filter(s => s.id !== show.id));
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#FF453A', fontSize: '11px', cursor: 'pointer', opacity: 0.4, padding: '2px 6px' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0.4}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowSettings(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ width: '340px', background: '#2A2A2A', borderLeft: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF' }}>Settings</span>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.52)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Account</div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '16px' }}>
                  {[
                    ['Email', getCachedLicense()?.email || '—'],
                    ['License key', getCachedLicense()?.license_key || '—'],
                    ['Plan', getCachedLicense()?.plan || '—'],
                    ['Status', getCachedLicense()?.status || '—'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginBottom: '3px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)', fontFamily: label === 'License key' ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>About SpotPlot</div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '16px' }}>
                  {[
                    ['Version', 'Beta 0.3.0'],
                    ['Built for', 'Broadway & theatre professionals'],
                    ['Support', 'wheeler@wheelermoon.com'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginBottom: '3px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Links</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    ['🌐 Visit spotplotapp.com', 'https://spotplotapp.com'],
                    ['📧 Contact support', 'mailto:wheeler@wheelermoon.com'],
                  ].map(([label, url]) => (
                    <button key={label} onClick={() => { const { shell } = window.require('electron'); shell.openExternal(url); }}
                      style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.62)', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }}
                style={{ width: '100%', padding: '10px', background: 'rgba(255,69,58,0.14)', border: 'none', borderRadius: '8px', color: '#FF453A', fontSize: '13px', cursor: 'pointer' }}>
                Sign out / Deactivate license
              </button>
            </div>
          </div>
        </div>
      )}
          </div>
        )}
      </div>
      <Tips steps={TIPS.home} watch={shows.length} />
    </div>
  );
}