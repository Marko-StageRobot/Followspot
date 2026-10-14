// Gel colors for swatches and the color load, from the makers' own color for each gel (src/gels.json).
// A frame with several gels ("R02+R132") uses the first. A gel that isn't in the catalog
// (typed by hand) has no known color: gelColor returns null and callers draw it clear/white.
const GELS = require('./gels.json');

const COLORS = {};
for (const [, number, , color] of GELS) if (color) COLORS[number.toUpperCase()] = color;

function gelColor(gelNumber) {
  if (!gelNumber) return null;
  const first = String(gelNumber).split('+')[0].toUpperCase().replace(/\s/g, '');
  return COLORS[first] || null;
}

module.exports = { gelColor };
