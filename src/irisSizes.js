// A show's iris sizes, in order. Stored on the show as JSON in shows.iris_sizes.
// Each size: { label, value, builtin?, key? }. Built-in sizes keep `key`, their original full name,
// so a renamed one can be reset. `label` is the short button text on the cue list (e.g. "FB");
// `value` is the full name saved in cues and printed (e.g. "Full Body").
//
// Older shows stored only their custom sizes (no `builtin` entries). Those still load as
// the defaults followed by the customs. Saved lists are always a plain array so older
// SpotPlot versions can still read them.

const DEFAULT_IRIS_SIZES = [
  { label: 'FB', value: 'Full Body' },
  { label: '3/4', value: '3/4 Body' },
  { label: '1/2', value: '1/2 Body' },
  { label: 'H&S', value: 'Head & Shoulders' },
  { label: 'Hd', value: 'Head' },
];

function irisSizeList(json) {
  let saved = null;
  try { saved = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { saved = null; }
  if (!Array.isArray(saved)) saved = [];
  const sizes = saved.filter(s => s && s.value);
  if (sizes.some(s => s.builtin)) {
    return sizes.map(s => {
      const out = { label: s.label || s.value, value: s.value, builtin: !!s.builtin };
      if (s.builtin) {
        const original = DEFAULT_IRIS_SIZES.find(d => d.value === s.key) || DEFAULT_IRIS_SIZES.find(d => d.value === s.value || d.label === s.label);
        if (original) out.key = original.value;
      }
      return out;
    });
  }
  // Older format: only custom sizes were saved
  return [...DEFAULT_IRIS_SIZES.map(s => ({ ...s, builtin: true, key: s.value })), ...sizes.map(s => ({ label: s.label || s.value, value: s.value, builtin: false }))];
}

module.exports = { DEFAULT_IRIS_SIZES, irisSizeList };
