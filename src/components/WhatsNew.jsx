import React from 'react';
import changelog from '../../CHANGELOG.md';

// What's New: this version's section of CHANGELOG.md, built into the app (no internet needed).
// Opens by itself the first time SpotPlot starts after an update, and from Settings → About.
// At release time the Unreleased section becomes "## X.Y.Z (date)", and that's what people see here.

const LAST_VERSION_KEY = 'spotplot_last_seen_version';

// { date, body } for one version, or null if the changelog has no section for it
export function releaseNotes(version) {
  const lines = changelog.replace(/\r/g, '').split('\n');
  const start = lines.findIndex(l => l.startsWith(`## ${version} `) || l.trim() === `## ${version}`);
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  const body = lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
  const date = (lines[start].match(/\((\d{4}-\d{2}-\d{2})\)/) || [])[1] || null;
  return body ? { date, body } : null;
}

// True once per update: the version changed since SpotPlot last opened. A first install doesn't count.
export function justUpdated(version) {
  let last = null;
  try { last = localStorage.getItem(LAST_VERSION_KEY); localStorage.setItem(LAST_VERSION_KEY, version); } catch (e) {}
  return !!last && last !== version && !!releaseNotes(version);
}

const formatDate = (ymd) => new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// "**Cue list**" → bold pieces, without putting any HTML on the page
const inline = (text) => text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
  part.startsWith('**') && part.endsWith('**') ? <strong key={i} style={{ fontWeight: '600' }}>{part.slice(2, -2)}</strong> : part);

// A short line on its own is a section name ("Cue list"), "- " lines are items, anything longer is a paragraph
function Notes({ body }) {
  const out = [];
  let items = [];
  const flush = () => {
    if (!items.length) return;
    out.push(
      <ul key={out.length} style={{ margin: '0 0 14px', paddingLeft: '18px' }}>
        {items.map((t, i) => <li key={i} style={{ fontSize: '13px', lineHeight: '18px', color: '#FFFFFF', marginBottom: '6px' }}>{inline(t)}</li>)}
      </ul>);
    items = [];
  };
  body.split('\n').map(l => l.trim()).forEach(line => {
    if (!line) return;
    if (/^[-*•] /.test(line)) { items.push(line.slice(2)); return; }
    flush();
    const heading = line.length < 40 && !/[.:]$/.test(line);
    out.push(heading
      ? <div key={out.length} style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF', margin: '4px 0 8px' }}>{inline(line.replace(/^#+\s*/, ''))}</div>
      : <p key={out.length} style={{ fontSize: '13px', lineHeight: '18px', color: '#FFFFFF', margin: '0 0 12px' }}>{inline(line)}</p>);
  });
  flush();
  return out;
}

export default function WhatsNew({ version, onClose }) {
  const notes = releaseNotes(version);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '480px', maxHeight: '72vh', display: 'flex', flexDirection: 'column', background: '#2A2A2A', borderRadius: '16px', boxShadow: '0 18px 48px rgba(0,0,0,0.45)' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF' }}>What’s New in SpotPlot {version}</div>
          {notes?.date && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>{formatDate(notes.date)}</div>}
        </div>
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          {notes ? <Notes body={notes.body} /> : <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>No notes for this version.</div>}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.10)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ height: '28px', padding: '0 16px', borderRadius: '14px', border: 'none', background: '#0A84FF', color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
