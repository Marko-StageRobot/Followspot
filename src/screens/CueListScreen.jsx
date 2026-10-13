import React, { useState, useEffect, useRef } from 'react';
import Tips from '../components/Tips';
import { TIPS } from '../tips';
import AppHeader from '../components/AppHeader';
import RichLine from '../components/RichLine';
import { cueFieldSettings } from '../cueFields';
import { irisSizeList } from '../irisSizes';
const { ipcRenderer } = window.require('electron');
const GEL_COLORS = {
  // ROSCO ROSCOLUX
  'R00': '#F8F8F8',
  'R01': '#F5DFA0', 'R02': '#F0C060', 'R03': '#F5E090', 'R04': '#EDB84A',
  'R05': '#F5C8C0', 'R06': '#FAEEC0', 'R07': '#FAEEC0', 'R08': '#F5D878',
  'R09': '#F0C050', 'R10': '#F5E060', 'R11': '#F5E8A0', 'R12': '#F5E060',
  'R13': '#FAEEC0', 'R14': '#F0D060', 'R15': '#E8B840', 'R16': '#F5C84A',
  'R17': '#F5A030', 'R18': '#F08020', 'R19': '#E06010', 'R20': '#E09030',
  'R21': '#E8A020', 'R22': '#D07010', 'R23': '#E07010', 'R24': '#D03020',
  'R25': '#E05020', 'R26': '#D04030', 'R27': '#C02020', 'R28': '#C01010',
  'R30': '#F5D0C0', 'R31': '#F0C0A0', 'R32': '#F0A8A0', 'R33': '#F5D0D0',
  'R34': '#F0C8B8', 'R35': '#F0C8B8', 'R36': '#F0A8A0', 'R37': '#F0C0C8',
  'R38': '#F0A0B0', 'R39': '#E890A0', 'R40': '#F0B090', 'R41': '#E8A080',
  'R42': '#E09080', 'R43': '#E870A0', 'R44': '#D06080', 'R45': '#C84070',
  'R46': '#C03070', 'R47': '#C0A0D0', 'R48': '#B080C0', 'R49': '#9060B0',
  'R50': '#C090B0', 'R51': '#F0D0E0', 'R52': '#D0C0E0', 'R53': '#E0D0F0',
  'R54': '#D8C8E8', 'R55': '#C8B0D8', 'R56': '#A870C0', 'R57': '#B0A0D0',
  'R58': '#9070B0', 'R59': '#503080', 'R60': '#D0E0F8', 'R61': '#C0D8F0',
  'R62': '#B0C8E8', 'R63': '#A0C0E8', 'R64': '#90B0D8', 'R65': '#6090C8',
  'R66': '#80B0D0', 'R67': '#70A8D0', 'R68': '#5090C0', 'R69': '#4878B0',
  'R70': '#60A0B8', 'R71': '#5090A8', 'R72': '#4080A0', 'R73': '#307898',
  'R74': '#203870', 'R75': '#304880', 'R76': '#6090A8', 'R77': '#508090',
  'R78': '#4878B0', 'R79': '#2040A0', 'R80': '#1030C0', 'R81': '#304880',
  'R82': '#2040B0', 'R83': '#3060A0', 'R84': '#2048A0', 'R85': '#102080',
  'R86': '#608050', 'R87': '#C0D880', 'R88': '#90C070', 'R89': '#708050',
  'R90': '#90A040', 'R91': '#208030', 'R92': '#308080', 'R93': '#206050',
  'R94': '#208030', 'R95': '#306040', 'R96': '#90C020', 'R97': '#C8C8C8',
  'R98': '#A0A0A0', 'R99': '#704030',
  // ROSCO 300-series
  'R303': '#F5D0A0', 'R304': '#F5C890', 'R305': '#F5C0A8', 'R310': '#F5E060',
  'R312': '#F5E040', 'R313': '#F5D840', 'R316': '#F0B060', 'R317': '#F0A860',
  'R318': '#F0907A', 'R321': '#E8A840', 'R324': '#D04020', 'R331': '#F0C8B0',
  'R332': '#F090B0', 'R333': '#F5C8C8', 'R336': '#F0B0C0', 'R339': '#D060A0',
  'R342': '#E060A0', 'R343': '#E050A0', 'R344': '#E860B0', 'R346': '#C040A0',
  'R347': '#A040A0', 'R348': '#806090', 'R349': '#C040A0', 'R351': '#D0C0E0',
  'R353': '#C0A8D8', 'R355': '#B0A0D0', 'R356': '#B098C8', 'R357': '#9878C0',
  'R358': '#8060A0', 'R359': '#6050A0', 'R360': '#D8E8F8', 'R362': '#90B8D8',
  'R363': '#90C8D0', 'R364': '#80B0D8', 'R365': '#6098C8', 'R366': '#70A8C8',
  'R367': '#6090B8', 'R369': '#4070B8', 'R370': '#3060A8', 'R371': '#A0C0E0',
  'R372': '#90B8D8', 'R373': '#80A8C8', 'R374': '#308898', 'R376': '#5090A8',
  'R377': '#9880C0', 'R378': '#8090C8', 'R382': '#1020A0', 'R383': '#3050A0',
  'R384': '#2038A0', 'R385': '#1830A0', 'R386': '#408040', 'R388': '#90A030',
  'R389': '#40A020', 'R392': '#308898', 'R393': '#208840', 'R395': '#308878',
  'R397': '#C0C8D0', 'R398': '#A8B0B8',
  // ROSCO Frosts & Diffusions - all appear as near-white/translucent
  'R100': '#F0F0F0', 'R101': '#F4F4F4', 'R102': '#F4F4F4', 'R103': '#EFEFEF',
  'R104': '#F2F2F2', 'R105': '#F0F0F0', 'R106': '#F4F4F4', 'R107': '#EBEBEB',
  'R108': '#F8F8F8', 'R109': '#F0F0F0', 'R110': '#F2F2F2', 'R111': '#EFEFEF',
  'R112': '#F2F2F2', 'R113': '#F0F0F0', 'R114': '#ECECEC', 'R115': '#C8E8C8',
  'R116': '#F8F8F8', 'R117': '#F5F5F5', 'R119': '#F0F0F0', 'R120': '#F0C8C8',
  'R121': '#C8D8F0', 'R122': '#C8E8C8', 'R124': '#E8B8B8', 'R125': '#B8C8E8',
  'R126': '#B8E0B8', 'R127': '#F0D8A0', 'R132': '#F4F4F4',
  // ROSCO Cinegel CTB
  'R3202': '#6090D0', 'R3203': '#7098C8', 'R3204': '#80A8D0', 'R3206': '#90B0D8',
  'R3208': '#A0C0E0', 'R3216': '#C0D8F0', 'R3220': '#4070C0',
  // ROSCO Cinegel CTO
  'R3401': '#E09030', 'R3407': '#E8A030', 'R3408': '#F0B848', 'R3409': '#F5CC70',
  'R3410': '#F8E098',
  // ROSCO Cinegel Plus/Minus Green
  'R3304': '#80C060', 'R3308': '#C080C0', 'R3313': '#D0A0D0', 'R3314': '#E0C0E0',
  'R3315': '#A0D080', 'R3316': '#C0E0A0',
  // ROSCO Cinegel Diffusions
  'R3000': '#EBEBEB', 'R3006': '#F0F0F0', 'R3007': '#F4F4F4', 'R3008': '#F8F8F8',
  'R3010': '#EFEFEF', 'R3012': '#F4F4F4', 'R3014': '#F0F0F0', 'R3020': '#F2F2F2',
  'R3021': '#F5F5F5', 'R3026': '#F0F0F0', 'R3027': '#ECECEC', 'R3028': '#E8E8E8',
  'R3029': '#F8F8F8', 'R3030': '#FFFFFF',
  // LEE FILTERS
  'L001': '#FAEEC0', 'L002': '#F5D890', 'L003': '#F5E090', 'L004': '#EDB84A',
  'L005': '#F5C8C0', 'L006': '#FAEEC0', 'L008': '#F5D878', 'L009': '#F0C050',
  'L010': '#F5E060', 'L013': '#FAEEC0', 'L015': '#E8B840', 'L016': '#F5C84A',
  'L017': '#F5A030', 'L018': '#F08020', 'L019': '#E06010', 'L020': '#E09030',
  'L021': '#E8A020', 'L022': '#D07010', 'L023': '#E07010', 'L024': '#D03020',
  'L025': '#E05020', 'L026': '#D04030', 'L027': '#C02020',
  'L030': '#F5D0C0', 'L031': '#F0C0A0', 'L032': '#F0A8A0', 'L033': '#F5D0D0',
  'L034': '#F0C8B8', 'L035': '#F0C8B8', 'L036': '#F0A8A0', 'L037': '#F0C0C8',
  'L038': '#F0A0B0', 'L039': '#E890A0', 'L040': '#F0B090', 'L041': '#E8A080',
  'L042': '#E09080', 'L043': '#E870A0', 'L044': '#D06080', 'L045': '#C84070',
  'L046': '#C03070', 'L047': '#C0A0D0', 'L048': '#B080C0', 'L049': '#9060B0',
  'L050': '#C090B0', 'L051': '#D0C0E0', 'L052': '#D0C0E0', 'L053': '#E0D0F0',
  'L054': '#D8C8E8', 'L055': '#C8B0D8', 'L057': '#B0A0D0', 'L058': '#9070B0',
  'L059': '#503080', 'L061': '#C0D8F0', 'L062': '#B0C8E8', 'L063': '#A0C0E8',
  'L064': '#90B0D8', 'L065': '#6090C8', 'L066': '#80B0D0', 'L067': '#70A8D0',
  'L068': '#5090C0', 'L069': '#4878B0', 'L070': '#60A0B8', 'L071': '#5090A8',
  'L072': '#4080A0', 'L073': '#307898', 'L074': '#203870', 'L075': '#304880',
  'L079': '#2040A0', 'L080': '#1030C0', 'L081': '#304880', 'L082': '#2040B0',
  'L083': '#3060A0', 'L085': '#102080', 'L086': '#608050', 'L088': '#90C070',
  'L089': '#708050', 'L091': '#208030', 'L092': '#308080', 'L094': '#208030',
  'L096': '#90C020', 'L099': '#704030',
  // LEE Frosts
  'L100': '#F0F0F0', 'L101': '#F4F4F4', 'L102': '#F4F4F4', 'L103': '#EFEFEF',
  'L104': '#F2F2F2', 'L105': '#F0F0F0', 'L106': '#F4F4F4', 'L107': '#EBEBEB',
  'L108': '#F8F8F8', 'L110': '#F0F0F0', 'L111': '#EFEFEF', 'L112': '#F2F2F2',
  'L113': '#F0F0F0', 'L114': '#ECECEC', 'L129': '#E8E8E8', 'L216': '#F8F8F8',
  'L220': '#F8F8F8', 'L226': '#F0F0F0', 'L227': '#F5F5F5', 'L228': '#F2F2F2',
  'L229': '#E8E8E8', 'L230': '#FFFFFF', 'L231': '#EBEBEB', 'L236': '#ECECEC',
  'L238': '#F2F2F2', 'L239': '#F0F0F0', 'L241': '#F0F0F0', 'L261': '#EFEFEF',
  'L262': '#F0F0F0',
  // LEE Color Corrections
  'L200': '#6090D0', 'L201': '#4070C0', 'L202': '#6090C8', 'L203': '#80B0D8',
  'L204': '#E09030', 'L205': '#F0B848', 'L206': '#F5CC70', 'L207': '#F8E090',
  'L109': '#C09060', 'L119': '#102080', 'L120': '#102060', 'L131': '#204060',
  'L134': '#E8A020', 'L147': '#F0B878', 'L148': '#E870A0', 'L149': '#D03020',
  'L150': '#B0D0F0', 'L156': '#704030', 'L157': '#F0A8A0', 'L158': '#D06010',
  'L160': '#7088B0', 'L161': '#6080A8', 'L162': '#F0C060', 'L164': '#D04020',
  'L165': '#5888B8', 'L170': '#9070B0', 'L172': '#3070A0', 'L176': '#E8A840',
  'L179': '#E07820', 'L180': '#8060A0', 'L181': '#101850', 'L182': '#D04030',
  'L183': '#3060A8', 'L193': '#E0A878', 'L194': '#F090B0', 'L195': '#2050A0',
  'L196': '#2048A0', 'L199': '#1828A0',
  // GAM GAMCOLOR
  'G100': '#C03070', 'G105': '#F0A0C0', 'G110': '#F0B0C0', 'G115': '#F0D0E0',
  'G120': '#E890A0', 'G125': '#F0A0B0', 'G130': '#E890A0', 'G135': '#D06080',
  'G140': '#F5D0E0', 'G145': '#F0C0D0', 'G150': '#E8A0C0', 'G155': '#D870A0',
  'G160': '#D04090', 'G165': '#C030A0', 'G170': '#D0C0E0', 'G175': '#E0D0F0',
  'G180': '#B0A0D0', 'G185': '#9070B0', 'G190': '#8060A0',
  'G200': '#D03020', 'G205': '#D04030', 'G210': '#C02020', 'G215': '#B01010',
  'G220': '#A01010', 'G225': '#900808', 'G230': '#F5D0C0', 'G235': '#F0C0A0',
  'G240': '#E8A880', 'G245': '#E09070', 'G250': '#F0C8B8', 'G255': '#F0C0C8',
  'G260': '#F0A0B0', 'G265': '#E890A0', 'G270': '#D06080', 'G275': '#C03060',
  'G280': '#A02050', 'G285': '#C040A0',
  'G300': '#FAEEC0', 'G305': '#F5E090', 'G310': '#F0C8B0', 'G315': '#F5C84A',
  'G320': '#E8A020', 'G325': '#D07010', 'G330': '#C06010', 'G335': '#E8A020',
  'G340': '#E07010', 'G345': '#D06010', 'G350': '#C05010', 'G355': '#F5A030',
  'G360': '#F08020', 'G365': '#F09050', 'G370': '#F0A060', 'G375': '#F0B878',
  'G380': '#F0B090', 'G385': '#F0A080', 'G390': '#F5C0A0',
  'G400': '#FAEEC0', 'G405': '#F5E8A0', 'G410': '#F5E060', 'G415': '#F0D840',
  'G420': '#E8C820', 'G425': '#E8A820', 'G430': '#F5D878', 'G435': '#F0C860',
  'G440': '#FAEEC0', 'G445': '#FAEEC0', 'G450': '#F0E840', 'G455': '#D8E040',
  'G500': '#D8E890', 'G505': '#C8E070', 'G510': '#B0D850', 'G515': '#90C030',
  'G520': '#80C020', 'G525': '#90D030', 'G530': '#70B828', 'G535': '#508040',
  'G540': '#608050', 'G545': '#707840', 'G550': '#909040',
  'G600': '#C0E8B0', 'G605': '#A0D890', 'G610': '#70C060', 'G615': '#50A840',
  'G620': '#308830', 'G625': '#207020', 'G630': '#208030', 'G635': '#209040',
  'G640': '#208878', 'G645': '#A0E0B0', 'G650': '#308080', 'G655': '#207040',
  'G660': '#186030', 'G665': '#208858',
  'G700': '#B0D8C0', 'G705': '#90C8A8', 'G710': '#60A888', 'G715': '#408878',
  'G720': '#307880', 'G725': '#286870', 'G730': '#90C8D0', 'G735': '#307898',
  'G740': '#3070A0', 'G745': '#5090A8', 'G750': '#40C0D0', 'G755': '#2090A0',
  'G800': '#C0D8F0', 'G805': '#A0C8E8', 'G810': '#70A8D0', 'G815': '#5090C0',
  'G820': '#6090C8', 'G825': '#6080B0', 'G830': '#3060A8', 'G835': '#2040A0',
  'G840': '#102080', 'G845': '#203870', 'G850': '#101850', 'G855': '#2038A0',
  'G860': '#1030C0', 'G865': '#304880', 'G870': '#C0D8F0', 'G875': '#B0D0F0',
  'G880': '#D0E0F8', 'G885': '#B0C8E8',
  'G900': '#B0A0D0', 'G905': '#C0B0D8', 'G910': '#9070B0', 'G915': '#8060A8',
  'G920': '#7050A0', 'G925': '#6040A0', 'G930': '#503080', 'G935': '#502878',
  'G940': '#C090B0', 'G945': '#B0A0D0', 'G950': '#C8B0D8', 'G955': '#B080C0',
  // GAM Diffusions
  'G1505': '#F4F4F4', 'G1510': '#F0F0F0', 'G1515': '#E8E8E8', 'G1520': '#F2F2F2',
  'G1525': '#F0F0F0', 'G1530': '#F4F4F4', 'G1535': '#F0F0F0', 'G1540': '#ECECEC',
  'G1545': '#F5F5F5', 'G1550': '#F0F0F0', 'G1555': '#E8E8E8', 'G1560': '#EBEBEB',
  'G1565': '#F5F5F5', 'G1570': '#E8E8E8', 'G1575': '#EFEFEF', 'G1580': '#E8E8E8',
  'G1585': '#F8F8F8', 'G1590': '#D8D8D8', 'G1595': '#F8F8F8', 'G1600': '#FFFFFF',
};

function getGelColor(gelNum) {
  if (!gelNum) return '#2a2a2a';
  const key = gelNum.split('+')[0].toUpperCase().replace(/\s/g, ''); // a frame with R02+R132 shows the first gel's color
  return GEL_COLORS[key] || '#2a2a2a';
}

const ACTIONS = [
  { name: 'Pick Up', short: 'Pick Up', color: '#30D158', intensityDefault: 'Full', timeDefault: null },
  { name: 'Fade Up', short: 'Fade Up', color: '#30D158', intensityDefault: null, timeDefault: null },
  { name: 'Fade Down', short: 'Fade Down', color: '#FF453A', intensityDefault: null, timeDefault: null },
  { name: 'Fade Out', short: 'Fade Out', color: '#FF453A', intensityDefault: 'Out', timeDefault: null },
  { name: 'Fade In Place', short: 'Fade In Plce', color: '#FF453A', intensityDefault: 'Out', timeDefault: null },
  { name: 'Bump Up', short: 'Bump Up', color: '#30D158', intensityDefault: 'Full', timeDefault: '0' },
  { name: 'Bump Out', short: 'Bump Out', color: '#FF453A', intensityDefault: 'Out', timeDefault: '0' },
  { name: 'Swap To', short: 'Swap To', color: '#64D2FF', intensityDefault: null, timeDefault: null },
  { name: 'Slide To', short: 'Slide To', color: '#64D2FF', intensityDefault: null, timeDefault: null },
  { name: 'Stay With', short: 'Stay With', color: '#64D2FF', intensityDefault: null, timeDefault: null },
  { name: 'Iris In', short: 'Iris In', color: '#5E5CE6', intensityDefault: null, timeDefault: null },
  { name: 'Iris Out', short: 'Iris Out', color: '#5E5CE6', intensityDefault: null, timeDefault: null },
  { name: 'Iris/Fade Up', short: 'Iris/Fade Up', color: '#5E5CE6', intensityDefault: null, timeDefault: null },
  { name: 'Iris/Fade Down', short: 'Iris/Fade Dn', color: '#5E5CE6', intensityDefault: null, timeDefault: null },
  { name: 'Iris/Fade Out', short: 'Iris/Fade Out', color: '#5E5CE6', intensityDefault: 'Out', timeDefault: null },
  { name: 'Up & Out', short: 'Up & Out', color: '#AC8E68', intensityDefault: 'Full', timeDefault: null },
  { name: 'Dump & Restore', short: 'Dump & Rest.', color: '#AC8E68', intensityDefault: null, timeDefault: null },
  { name: 'Bump Color', short: 'Bump Color', color: '#AC8E68', intensityDefault: null, timeDefault: '0' },
  { name: 'Roll Color', short: 'Roll Color', color: '#AC8E68', intensityDefault: null, timeDefault: null },
  { name: 'Ballyhoo', short: 'Ballyhoo', color: '#FF9F0A', intensityDefault: null, timeDefault: null },
  { name: 'Off', short: 'Off', color: '#444', intensityDefault: 'Out', timeDefault: null },
  { name: 'Tracked', short: 'TRK', color: '#555555' },
];

const INTENSITIES = ['Full','90%','80%','75%','70%','60%','50%','40%','30%','25%','20%','10%','Glow','Out'];
const TIMES = ['0','1','2','3','4','5','6','7','8','9','10','Custom'];
const IRIS_SIZES = ['Full Body', '3/4 Body', '1/2 Body', 'Head & Shoulders', 'Head', 'Custom'];

// Background for a highlighted When or Notes line (stronger than the whole-cell tint so a thin line reads)
const lineHighlightStyle = (color) => color === 'yellow' ? { background: 'rgba(255,214,10,0.25)', padding: '2px 4px' }
  : color === 'red' ? { background: 'rgba(255,69,58,0.25)', padding: '2px 4px' } : {};
const selectStyle = {
  width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none',
  borderRadius: '6px', color: 'rgba(255,255,255,0.62)', padding: '3px 6px',
  fontSize: '11px', outline: 'none',
};

function ActionIcon({ action, size = 20 }) {
  const s = size;
  switch (action) {
    case 'Pick Up': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,4 24,20 8,20" fill="#30D158"/><polygon points="16,14 22,26 10,26" fill="#6BD58A" opacity="0.5"/></svg>;
    case 'Fade Up': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,5 23,18 9,18" fill="#30D158"/></svg>;
    case 'Fade Down': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,27 23,14 9,14" fill="#FF453A"/></svg>;
    case 'Fade Out': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,28 24,12 8,12" fill="#FF453A"/><polygon points="16,18 22,6 10,6" fill="#FF6961" opacity="0.5"/></svg>;
    case 'Fade In Place': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#FF453A" strokeWidth="2"/><polygon points="16,27 23,14 9,14" fill="#FF453A"/></svg>;
    case 'Bump Up': return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="8" y="10" width="16" height="3" rx="1.5" fill="#30D158"/><rect x="10" y="15" width="12" height="3" rx="1.5" fill="#30D158" opacity="0.6"/><rect x="12" y="20" width="8" height="3" rx="1.5" fill="#30D158" opacity="0.3"/></svg>;
    case 'Bump Out': return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="8" y="19" width="16" height="3" rx="1.5" fill="#FF453A"/><rect x="10" y="14" width="12" height="3" rx="1.5" fill="#FF453A" opacity="0.6"/><rect x="12" y="9" width="8" height="3" rx="1.5" fill="#FF453A" opacity="0.3"/></svg>;
    case 'Swap To': return <svg width={s} height={s} viewBox="0 0 32 32"><path d="M10 10 C10 6 22 6 22 10 L22 16 C22 20 16 24 16 24 C16 24 10 20 10 16 Z" fill="none" stroke="#64D2FF" strokeWidth="2"/><path d="M20 20 L26 24 L22 26 L20 20Z" fill="#64D2FF"/></svg>;
    case 'Slide To': return <svg width={s} height={s} viewBox="0 0 32 32"><line x1="6" y1="16" x2="26" y2="16" stroke="#64D2FF" strokeWidth="2.5" strokeLinecap="round"/><polygon points="22,10 30,16 22,22" fill="#64D2FF"/><polygon points="10,10 2,16 10,22" fill="#64D2FF"/></svg>;
    case 'Stay With': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="9" fill="#D9F3FF" stroke="#64D2FF" strokeWidth="1.5"/><circle cx="12" cy="16" r="3" fill="#64D2FF"/><circle cx="20" cy="16" r="3" fill="#64D2FF"/></svg>;
    case 'Iris In': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#5E5CE6" strokeWidth="2"/><line x1="8" y1="16" x2="24" y2="16" stroke="#5E5CE6" strokeWidth="2" strokeLinecap="round"/><polygon points="10,12 6,16 10,20" fill="#5E5CE6"/><polygon points="22,12 26,16 22,20" fill="#5E5CE6"/></svg>;
    case 'Iris Out': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#5E5CE6" strokeWidth="2"/><line x1="8" y1="16" x2="24" y2="16" stroke="#5E5CE6" strokeWidth="2" strokeLinecap="round"/><polygon points="6,12 10,16 6,20" fill="#5E5CE6"/><polygon points="26,12 22,16 26,20" fill="#5E5CE6"/></svg>;
    case 'Iris/Fade Up': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="18" r="9" fill="none" stroke="#5E5CE6" strokeWidth="2"/><polygon points="16,4 22,14 10,14" fill="#30D158"/></svg>;
    case 'Iris/Fade Down': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="14" r="9" fill="none" stroke="#5E5CE6" strokeWidth="2"/><polygon points="16,28 22,18 10,18" fill="#FF453A"/></svg>;
    case 'Iris/Fade Out': return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="9" fill="none" stroke="#5E5CE6" strokeWidth="2"/><line x1="9" y1="16" x2="23" y2="16" stroke="#FF453A" strokeWidth="2"/><polygon points="11,12 7,16 11,20" fill="#FF453A"/><polygon points="21,12 25,16 21,20" fill="#FF453A"/></svg>;
    case 'Up & Out': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,4 22,14 10,14" fill="#30D158"/><polygon points="16,28 22,18 10,18" fill="#FF453A"/></svg>;
    case 'Dump & Restore': return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="10,4 22,4 16,14" fill="#FF453A"/><polygon points="16,18 22,28 10,28" fill="#30D158"/></svg>;
    case 'Bump Color': return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="9" y="8" width="14" height="16" rx="2" fill="none" stroke="#FF9F0A" strokeWidth="1.5"/><rect x="12" y="11" width="3" height="10" fill="#6BD58A"/><rect x="16" y="11" width="3" height="10" fill="#FF6961"/></svg>;
    case 'Roll Color': return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="9" y="8" width="14" height="16" rx="2" fill="none" stroke="#FF9F0A" strokeWidth="1.5"/><rect x="9" y="8" width="3.5" height="16" rx="1" fill="#FF6961"/><rect x="12.5" y="8" width="3.5" height="16" fill="#FFB340"/><rect x="16" y="8" width="3.5" height="16" fill="#6BD58A"/><rect x="19.5" y="8" width="3.5" height="16" rx="1" fill="#64D2FF"/></svg>;
    case 'Ballyhoo': return <svg width={s} height={s} viewBox="0 0 32 32"><path d="M8 16 C8 10 12 6 16 6 C20 6 24 10 24 16 C24 22 20 26 16 26 C12 26 8 22 8 16 Z" fill="none" stroke="#FF9F0A" strokeWidth="2.5"/><path d="M16 6 C16 6 20 16 16 26" fill="none" stroke="#FF9F0A" strokeWidth="2"/><path d="M16 6 C16 6 12 16 16 26" fill="none" stroke="#FF9F0A" strokeWidth="2"/></svg>;
    case 'Off': return <svg width={s} height={s} viewBox="0 0 32 32"><line x1="8" y1="8" x2="24" y2="24" stroke="#555" strokeWidth="2.5" strokeLinecap="round"/><line x1="24" y1="8" x2="8" y2="24" stroke="#555" strokeWidth="2.5" strokeLinecap="round"/></svg>;
    case 'Tracked': return <svg width={s} height={s} viewBox="0 0 32 32"><line x1="6" y1="16" x2="26" y2="16" stroke="#555" strokeWidth="2.5" strokeLinecap="round"/><polygon points="20,10 26,16 20,22" fill="#555"/></svg>;
    default: return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="#333"/></svg>;
  }
}

function ActionPicker({ value, onChange, onClose, pos, customActions }) {
  return (
    <div style={{ position: 'fixed', top: pos ? pos.top : 0, left: pos ? pos.left : 0, zIndex: 99999, background: '#2A2A2A', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '8px', width: '280px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '4px' }}>
      {[...ACTIONS, ...(customActions || []).map(a => ({ name: a.name, short: a.name.substring(0, 4), color: a.color || 'rgba(255,255,255,0.62)', icon: a.icon || null }))].map(a => (
        <div key={a.name} onClick={() => { onChange(a); onClose(); }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 4px', borderRadius: '6px', cursor: 'pointer', background: value === a.name ? 'rgba(10,132,255,0.16)' : 'transparent', border: value === a.name ? '1px solid #0A84FF' : '1px solid transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = value === a.name ? 'rgba(10,132,255,0.16)' : 'transparent'}>
          {a.icon ? <img src={(() => { try { const fs = window.require('fs'); const d = fs.readFileSync(a.icon); const ext = a.icon.split('.').pop().toLowerCase(); return `data:image/${ext};base64,${d.toString('base64')}`; } catch(e) { return ''; } })()} style={{ width: 28, height: 28, objectFit: 'contain' }} /> : <ActionIcon action={a.name} size={28} />}
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.62)', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>{a.name}</span>
        </div>
      ))}
    </div>
  );
}
// Iris chips in a sideways-scrolling strip; edges fade and an arrow appears when more sizes are hidden
function IrisStrip({ sizes, selected, onPick }) {
  const ref = useRef();
  const [more, setMore] = useState({ left: false, right: false });

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setMore({ left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Start with the chosen size in view
    const chip = el.querySelector('[data-selected="true"]');
    if (chip && (chip.offsetLeft + chip.offsetWidth > el.clientWidth)) el.scrollLeft = chip.offsetLeft - 8;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sizes.length]);

  const fade = `linear-gradient(to right, ${more.left ? 'transparent' : '#000'} 0, #000 ${more.left ? '16px' : '0'}, #000 calc(100% - ${more.right ? '16px' : '0px'}), ${more.right ? 'transparent' : '#000'} 100%)`;

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '2px' }}>
      {/* Arrows on either side show there are more sizes that way; click to scroll */}
      {more.left && (
        <div onClick={() => { ref.current.scrollLeft -= 80; }} title="Earlier iris sizes"
          style={{ flexShrink: 0, fontSize: '13px', fontWeight: '700', color: '#409CFF', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>‹</div>
      )}
      {/* Absolutely positioned so the chips never widen the table column; they scroll inside it instead */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', height: '20px' }}>
      <div ref={ref} className="no-scrollbar" onScroll={measure}
        onWheel={e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) ref.current.scrollLeft += e.deltaY; }}
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: '3px', overflowX: 'auto', scrollBehavior: 'smooth', WebkitMaskImage: fade, maskImage: fade }}>
        {sizes.map(iris => {
          const isSel = selected === iris.value;
          return (
            <div key={iris.value} data-selected={isSel} onClick={() => onPick(iris.value)} title={iris.value}
              style={{ flexShrink: 0, padding: '2px 6px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', background: isSel ? '#0A84FF' : '#2A2A2A', color: isSel ? '#FFFFFF' : 'rgba(255,255,255,0.28)', border: `1px solid ${isSel ? '#0A84FF' : 'rgba(255,255,255,0.1)'}` }}>
              {iris.label}
            </div>
          );
        })}
      </div>
      </div>
      {more.right && (
        <div onClick={() => { ref.current.scrollLeft += 80; }} title="More iris sizes"
          style={{ flexShrink: 0, fontSize: '13px', fontWeight: '700', color: '#409CFF', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>›</div>
      )}
    </div>
  );
}

function SpotCueCell({ spotCue, spot, cue, fieldsShown = {}, characters, colorSlots, onUpdate, onNewCustomCharacter, lqNumber, onDragStart, onDragOver, onDragLeave, onDrop, isDragTarget, onDoubleClick, irisSizes, customActions }) {
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [hoveredFrame, setHoveredFrame] = useState(null);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [showCustomChar, setShowCustomChar] = useState(!!spotCue?.custom_character);
  const customCharDone = useRef(false);
  const [customTimeVal, setCustomTimeVal] = useState('');
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const ref = useRef();
  const actionBtnRef = useRef();
  const isOff = spotCue?.action === 'Off' || !spotCue?.action;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowActionPicker(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!spotCue) return (
    <td
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        onDragOver(e);
        return false;
      }}
      onDragEnter={(e) => { e.preventDefault(); onDragOver(e); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) onDragLeave(e); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(e); }}
      onDoubleClick={onDoubleClick}
      style={{ padding: '8px 18px', borderRight: '1px solid rgba(255,255,255,0.12)', verticalAlign: 'top', minWidth: '260px', minHeight: '80px', background: isDragTarget ? 'rgba(10,132,255,0.16)' : '#191919', outline: isDragTarget ? '2px solid #0A84FF' : 'none', cursor: 'grab' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>—</div>
    </td>
  );

const actionDef = ACTIONS.find(a => a.name === spotCue?.action) || (customActions || []).find(a => a.name === spotCue?.action);
  const activeFrames = spotCue.active_frames ? spotCue.active_frames.split(',').filter(Boolean) : [];

  const handleActionSelect = (a) => {
    if (a.name === 'Tracked') {
      onUpdate(spotCue.id, 'action', '');
      onUpdate(spotCue.id, 'intensity', '');
      onUpdate(spotCue.id, 'fade_time', '');
      onUpdate(spotCue.id, 'description', '');
      onUpdate(spotCue.id, 'with_lq', 0);
      onUpdate(spotCue.id, 'when_highlight', null);
      onUpdate(spotCue.id, 'notes', '');
      onUpdate(spotCue.id, 'notes_highlight', null);
      setShowActionPicker(false);
      return;
    }
    onUpdate(spotCue.id, 'action', a.name);
    if (a.intensityDefault) onUpdate(spotCue.id, 'intensity', a.intensityDefault);
    if (a.timeDefault !== null) onUpdate(spotCue.id, 'fade_time', a.timeDefault);
  };

  // Finished typing a custom character name (Enter or clicking away). A name that is already a
  // character just links to it; a new one asks whether to add it to the show's characters.
  const commitCustomChar = (value) => {
    if (customCharDone.current) return;
    customCharDone.current = true;
    setShowCustomChar(false);
    const name = value.trim();
    const existing = name && characters.find(c => (c.name || '').trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      onUpdate(spotCue.id, 'character_id', existing.id);
      onUpdate(spotCue.id, 'custom_character', null);
      return;
    }
    onUpdate(spotCue.id, 'custom_character', value);
    if (name && name !== (spotCue.custom_character || '').trim()) onNewCustomCharacter(spotCue.id, name);
  };

  const toggleFrame = (frame) => {
    const current = spotCue.active_frames ? spotCue.active_frames.split(',').filter(Boolean) : [];
    const next = current.includes(frame) ? current.filter(f => f !== frame) : [...current, frame];
    onUpdate(spotCue.id, 'active_frames', next.join(','));
  };

  const withLQ = !!spotCue.with_lq;
  const toggleWLQ = () => onUpdate(spotCue.id, 'with_lq', withLQ ? 0 : 1);

  if (spotCue.action === 'Off') {
    return (
      <td
        draggable
        onDragStart={onDragStart}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(e); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) onDragLeave(e); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(e); }}
        style={{ padding: '8px 18px', borderRight: '1px solid rgba(255,255,255,0.12)', verticalAlign: 'top', minWidth: '260px', background: isDragTarget ? 'rgba(10,132,255,0.16)' : '#191919', outline: isDragTarget ? '2px solid #0A84FF' : 'none', position: 'relative' }}>
        <div ref={ref} style={{ position: 'relative', zIndex: showActionPicker ? 99999 : 'auto' }}>
          <div ref={actionBtnRef} data-tour="cue-action" onClick={() => {
            if (actionBtnRef.current) {
              const rect = actionBtnRef.current.getBoundingClientRect();
              const pickerHeight = 380;
              const spaceBelow = window.innerHeight - rect.bottom;
              const top = spaceBelow < pickerHeight ? rect.top - pickerHeight - 4 : rect.bottom + 4;
              setPickerPos({ top, left: rect.left });
            }
            setShowActionPicker(v => !v);
          }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 7px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
            <ActionIcon action="Off" size={16} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', fontWeight: '500' }}>Off</span>
          </div>
{showActionPicker && <ActionPicker value={spotCue.action} onChange={handleActionSelect} onClose={() => setShowActionPicker(false)} pos={pickerPos} customActions={customActions} />}
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.28)', marginTop: '6px', fontStyle: 'italic', textAlign: 'center', fontWeight: '600', pointerEvents: 'none' }}>spot inactive</div>
        </div>
      </td>
    );
  }

  return (
    <td
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(e); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) onDragLeave(e); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(e); }}
      onDoubleClick={onDoubleClick}
      data-tour="cue-cell"
      style={{ 
        padding: '8px 18px', 
        borderRight: '1px solid rgba(255,255,255,0.12)', 
        verticalAlign: 'top', 
        minWidth: '260px', 
        position: 'relative',
        outline: isDragTarget ? '2px solid #0A84FF' : 'none', 
        background: isDragTarget ? 'rgba(10,132,255,0.16)' : spotCue?.highlight === 'yellow' ? 'rgba(255,214,10,0.12)' : spotCue?.highlight === 'red' ? 'rgba(255,69,58,0.12)' : spotCue?.ignored ? 'rgba(255,69,58,0.08)' : 'transparent',
        cursor: 'grab',
        opacity: spotCue?.ignored ? 0.5 : 1,
        textDecoration: spotCue?.ignored ? 'line-through' : 'none',
      }}>
        {spotCue?.spot_note && (
        <div style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', borderRadius: '50%', background: '#FFD60A' }} />
      )}
      {isDragTarget && <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,132,255,0.3)', pointerEvents: 'none', zIndex: 5 }} />}
      <div ref={ref} style={{ position: 'relative', zIndex: showActionPicker ? 9999 : 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <div ref={actionBtnRef} data-tour="cue-action" onClick={() => {
            if (actionBtnRef.current) {
              const rect = actionBtnRef.current.getBoundingClientRect();
              const pickerHeight = 380;
              const spaceBelow = window.innerHeight - rect.bottom;
              const top = spaceBelow < pickerHeight ? rect.top - pickerHeight - 4 : rect.bottom + 4;
              setPickerPos({ top, left: rect.left });
            }
            setShowActionPicker(v => !v);
          }}
            style={{ display: fieldsShown.action === false ? 'none' : 'flex', alignItems: 'center', gap: '6px', height: '32px', boxSizing: 'border-box', padding: '0 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', flex: '1 1 0', minWidth: 0 }}>
            {spotCue.action ? (
              <>
                {(() => {
                  const customAction = (customActions || []).find(a => a.name === spotCue.action);
                  if (customAction?.icon) {
                    try {
                      const fs = window.require('fs');
                      const d = fs.readFileSync(customAction.icon);
                      const ext = customAction.icon.split('.').pop().toLowerCase();
                      const src = `data:image/${ext};base64,${d.toString('base64')}`;
                      return <img src={src} style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />;
                    } catch(e) {}
                  }
                  return <ActionIcon action={spotCue.action} size={20} />;
                })()}
                <span style={{ fontSize: '14px', color: actionDef ? actionDef.color : 'rgba(255,255,255,0.62)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spotCue.action}</span>
              </>
            ) : (
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.28)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Action...</span>
            )}
          </div>
{showActionPicker && <ActionPicker value={spotCue.action} onChange={handleActionSelect} onClose={() => setShowActionPicker(false)} pos={pickerPos} customActions={customActions} />}
                {showCustomChar ? (
                    <input
            autoFocus
            defaultValue={spotCue.custom_character || ''}
            onBlur={e => commitCustomChar(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitCustomChar(e.target.value); }}
            placeholder="Type character name..."
            style={{ ...selectStyle, display: fieldsShown.character === false ? 'none' : undefined, flex: '1 1 0', minWidth: 0, height: '32px', fontSize: '14px', fontWeight: '600', borderRadius: '6px', padding: '0 8px', color: '#FFFFFF' }}
          />
        ) : (
          <select value={spotCue.character_id || ''} onChange={e => {
            if (e.target.value === 'custom') {
              customCharDone.current = false;
              onUpdate(spotCue.id, 'character_id', null);
              setShowCustomChar(true);
            } else {
              onUpdate(spotCue.id, 'character_id', e.target.value ? parseInt(e.target.value) : null);
              onUpdate(spotCue.id, 'custom_character', null);
            }
          }} style={{ ...selectStyle, display: fieldsShown.character === false ? 'none' : undefined, flex: '1 1 0', minWidth: 0, height: '32px', fontSize: '14px', fontWeight: '600', borderRadius: '6px', padding: '0 8px', color: (spotCue.character_id || spotCue.custom_character) ? '#FFFFFF' : 'rgba(255,255,255,0.28)' }}>
            <option value="">{spotCue.custom_character || 'Character...'}</option>
            {characters.map(c => <option key={c.id} value={c.id}>{c.name}{c.actor_name ? ' (' + c.actor_name + ')' : ''}</option>)}
            <option value="custom">+ Type custom name...</option>
          </select>
        )}
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
          <select value={spotCue.intensity || ''} onChange={e => onUpdate(spotCue.id, 'intensity', e.target.value)}
            style={{ ...selectStyle, display: fieldsShown.intensity === false ? 'none' : undefined, flex: 1, color: spotCue.intensity ? '#FFFFFF' : 'rgba(255,255,255,0.28)' }}>
            <option value="">Int...</option>
            {INTENSITIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <div style={{ flex: 1, display: fieldsShown.time === false ? 'none' : undefined }}>
            {showCustomTime ? (
              <input autoFocus value={customTimeVal} onChange={e => setCustomTimeVal(e.target.value)}
                onBlur={() => { onUpdate(spotCue.id, 'fade_time', customTimeVal); setShowCustomTime(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { onUpdate(spotCue.id, 'fade_time', customTimeVal); setShowCustomTime(false); }}}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid #0A84FF', borderRadius: '6px', color: '#FFFFFF', padding: '3px 4px', fontSize: '11px', outline: 'none' }}
                placeholder="e.g. 2.5" />
            ) : (
              <select value={spotCue.fade_time || ''} onChange={e => { if (e.target.value === 'Custom') { setShowCustomTime(true); setCustomTimeVal(TIMES.includes(spotCue.fade_time) ? '' : (spotCue.fade_time || '')); } else onUpdate(spotCue.id, 'fade_time', e.target.value); }}
                style={{ ...selectStyle, color: spotCue.fade_time ? '#FFFFFF' : 'rgba(255,255,255,0.28)' }}>
                <option value="">Time...</option>
                {/* A typed custom time isn't in the list, so add it as its own choice to show it */}
                {spotCue.fade_time && !TIMES.includes(spotCue.fade_time) && <option value={spotCue.fade_time}>{spotCue.fade_time}s</option>}
                {TIMES.map(t => <option key={t} value={t}>{t === 'Custom' ? 'Custom...' : t + 's'}</option>)}
              </select>
            )}
          </div>
        </div>

<div data-tour="cue-look" style={{ display: 'flex', alignItems: 'center', marginBottom: '3px', gap: '8px' }}>
          {fieldsShown.iris === false ? <div style={{ flex: 1 }} /> : <IrisStrip sizes={irisSizes || []}
            selected={spotCue.frame_size}
            onPick={value => onUpdate(spotCue.id, 'frame_size', spotCue.frame_size === value ? '' : value)} />}
          <div style={{ display: fieldsShown.color === false ? 'none' : 'flex', gap: '3px', alignItems: 'center', flexShrink: 0 }}>
            <div
              onClick={() => {
                const isNC = spotCue.no_color === 1;
                onUpdate(spotCue.id, 'no_color', isNC ? 0 : 1);
                if (!isNC) onUpdate(spotCue.id, 'active_frames', '');
              }}
              style={{ padding: '2px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: spotCue.no_color ? '#AC8E68' : '#2A2A2A', color: spotCue.no_color ? '#FFFFFF' : 'rgba(255,255,255,0.45)', border: `1px solid ${spotCue.no_color ? '#AC8E68' : 'rgba(255,255,255,0.1)'}` }}>
              NC
            </div>
            {colorSlots.map(slot => {
              const isActive = activeFrames.includes('F' + slot.slot_number);
              const isHovered = hoveredFrame === slot.id;
              return (
                <div key={slot.id} style={{ position: 'relative' }}>
                  <div
                    onClick={() => toggleFrame('F' + slot.slot_number)}
                    onMouseEnter={() => setHoveredFrame(slot.id)}
                    onMouseLeave={() => setHoveredFrame(null)}
                    style={{ padding: '2px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: isActive ? '#0A84FF' : '#2A2A2A', color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.45)', border: `1px solid ${isActive ? '#0A84FF' : 'rgba(255,255,255,0.1)'}` }}>
                    F{slot.slot_number}
                  </div>
                  {isHovered && slot.gel_number && (
                    <div style={{ position: 'fixed', zIndex: 99999, transform: 'translateX(-50%)', marginTop: '4px', background: '#2A2A2A', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', padding: '8px 10px', pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', minWidth: '120px' }}
                      ref={el => {
                        if (el) {
                          const btn = el.previousSibling;
                          if (btn) {
                            const rect = btn.getBoundingClientRect();
                            el.style.top = (rect.bottom + 6) + 'px';
                            el.style.left = (rect.left + rect.width / 2) + 'px';
                          }
                        }
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: getGelColor(slot.gel_number), flexShrink: 0, border: '1px solid rgba(255,255,255,0.18)' }} />
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF' }}>{slot.gel_number}</div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.62)' }}>{slot.gel_name}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: fieldsShown.when === false ? 'none' : 'flex', gap: '4px', alignItems: 'center', marginBottom: '3px' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: '4px', alignItems: 'center', borderRadius: '6px', ...lineHighlightStyle(spotCue.when_highlight) }}>
          {withLQ && (
            <span style={{ fontSize: '12px', color: '#FFFFFF', whiteSpace: 'nowrap', padding: '2px 0' }}>
              w/ LQ {lqNumber || '?'}
            </span>
          )}
          <RichLine value={spotCue.description}
            onSave={html => onUpdate(spotCue.id, 'description', html)}
            placeholder={withLQ ? '' : 'When...'}
            style={{ flex: 1, minWidth: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.62)', padding: '2px 0', fontSize: '12px' }} />
          </div>
          <div data-tour="cue-wlq" onClick={toggleWLQ} role="switch" aria-checked={withLQ}
            title={withLQ ? 'Linked to this cue\'s LQ number — click to unlink' : 'Link to this cue\'s LQ number'}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ width: '44px', height: '20px', borderRadius: '10px', background: withLQ ? '#0A84FF' : 'rgba(255,255,255,0.10)', position: 'relative', transition: 'background 0.15s' }}>
              <div style={{ position: 'absolute', top: '2px', left: withLQ ? '16px' : '2px', width: '26px', height: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.85)', boxShadow: '0 3px 8px rgba(0,0,0,0.15)', transition: 'left 0.15s' }} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: withLQ ? '#409CFF' : 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>w/LQ</span>
          </div>
        </div>

        <RichLine value={spotCue.notes}
          onSave={html => onUpdate(spotCue.id, 'notes', html)}
          placeholder="Notes..."
          style={{ display: fieldsShown.notes === false ? 'none' : undefined, borderBottom: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: 'rgba(255,255,255,0.62)', padding: '2px 0', fontSize: '12px', ...lineHighlightStyle(spotCue.notes_highlight) }} />
      </div>
    </td>
  );
}

function InsertButton({ onInsert }) {
  const [hover, setHover] = useState(false);
  const insertRef = useRef(false);
  return (
    <tr style={{ height: hover ? '24px' : '4px', transition: 'height 0.1s' }}>
      <td colSpan={99}
        style={{ padding: 0, textAlign: 'center', verticalAlign: 'middle', overflow: 'visible', position: 'relative', zIndex: 0 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}>
        {hover ? (
          <div onClick={e => { 
            e.stopPropagation(); 
            if (insertRef.current) return;
            insertRef.current = true;
            onInsert();
            setTimeout(() => { insertRef.current = false; }, 500);
          }}
            style={{ fontSize: '10px', color: '#409CFF', cursor: 'pointer', padding: '2px 6px', background: 'rgba(10,132,255,0.16)', borderRadius: '6px', display: 'inline-block', position: 'relative', zIndex: 1 }}>
            + insert cue here
          </div>
        ) : (
          <div style={{ width: '100%', height: '4px', pointerEvents: 'none' }} />
        )}
      </td>
    </tr>
  );
}

function CueRow({ cue, isLastCue, fieldsShown, spots, spotCues, characters, colorSlotsBySpot, scenes, onUpdateCue, onUpdateSpotCue, onNewCustomCharacter, onDelete, onInsertAfter, dragSource, dragTarget, setDragSource, setDragTarget, setShowDragModal, onCueDoubleClick, irisSizes, customActions }) {
  const [editingLQ, setEditingLQ] = useState(false);
  const [lqVal, setLqVal] = useState(cue.lq_number || '');

  useEffect(() => { setLqVal(cue.lq_number || ''); }, [cue.lq_number]);

  const saveLQ = () => {
    setEditingLQ(false);
    onUpdateCue(cue.id, 'lq_number', lqVal);
  };

  return (
    <>
      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <td style={{ padding: '8px 6px', borderRight: '1px solid rgba(255,255,255,0.06)', verticalAlign: 'top', width: '90px', minWidth: '90px' }}>
          <div data-tour="cue-lq" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            {editingLQ ? (
              <input autoFocus value={lqVal} onChange={e => setLqVal(e.target.value)}
                onBlur={saveLQ} onKeyDown={e => e.key === 'Enter' && saveLQ()}
                style={{ width: '64px', background: 'rgba(255,255,255,0.05)', border: '1px solid #0A84FF', borderRadius: '6px', color: '#FFFFFF', padding: '3px 6px', fontSize: '16px', fontWeight: '700', textAlign: 'center', outline: 'none' }} />
            ) : (
              <div onClick={() => setEditingLQ(true)} style={{ fontSize: '20px', fontWeight: '700', color: lqVal ? '#FFFFFF' : 'rgba(255,255,255,0.28)', cursor: 'pointer', minHeight: '24px', fontVariantNumeric: 'tabular-nums' }}>
                {lqVal || '—'}
              </div>
            )}
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>T·{cue.track_number}</div>
            <select value={cue.scene_id || ''} onChange={e => onUpdateCue(cue.id, 'scene_id', e.target.value ? parseInt(e.target.value) : null)}
              style={{ width: '74px', height: '20px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.45)', padding: '0 4px', fontSize: '10px', outline: 'none', marginTop: '4px' }}>
              <option value="">No scene</option>
              {scenes.map(s => <option key={s.id} value={s.id}>{s.label}{s.song ? ' · ' + s.song : ''}</option>)}
            </select>
            <div onClick={() => { if (window.confirm('Delete this cue?')) onDelete(cue.id); }}
              style={{ fontSize: '10px', fontWeight: '500', color: '#FF453A', cursor: 'pointer', marginTop: '2px', padding: '1px 6px', borderRadius: '6px', opacity: 0.45 }}
              onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'rgba(255,69,58,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = 0.45; e.currentTarget.style.background = 'transparent'; }}>
              Delete
            </div>
          </div>
        </td>
        {spots.map(spot => {
          const sc = spotCues.find(sc => sc.spot_id === spot.id && sc.cue_id === cue.id);
          const slots = colorSlotsBySpot[spot.id] || [];
          return (
            <SpotCueCell key={spot.id} spotCue={sc} spot={spot} cue={cue} fieldsShown={fieldsShown}
              characters={characters} colorSlots={slots}
              onUpdate={onUpdateSpotCue} onNewCustomCharacter={onNewCustomCharacter} lqNumber={lqVal}
              onDragStart={() => setDragSource({ spotCue: sc, spot, cue })}
              onDragOver={(e) => { 
                e.preventDefault(); 
                e.stopPropagation();
                console.log('dragover', spot.spot_number, cue.lq_number);
                setDragTarget({ spotCue: sc, spot, cue }); 
              }}
              onDragLeave={(e) => { 
                if (!e.currentTarget.contains(e.relatedTarget)) setDragTarget(null); 
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('drop fired', sc);
                if (dragSource && !(dragSource.spot?.id === spot?.id && dragSource.cue?.id === cue?.id)) {
                  setDragTarget({ spotCue: sc, spot, cue });
                  setShowDragModal(true);
                }
              }}
              isDragTarget={dragTarget?.cue?.id === cue?.id && dragTarget?.spot?.id === spot?.id}
              irisSizes={irisSizes}
              customActions={customActions}
              onDoubleClick={() => onCueDoubleClick(cue, spot, sc)}
            />
          );
        })}
      </tr>
      {!isLastCue && <InsertButton onInsert={() => onInsertAfter(cue.id, cue.scene_id)} />}
    </>
  );
}

export default function CueListScreen({ show, navigate }) {
  const [data, setData] = useState({ spots: [], scenes: [], cues: [], spotCues: [] });
  const [characters, setCharacters] = useState([]);
  const [colorSlotsBySpot, setColorSlotsBySpot] = useState({});
  const [showSceneModal, setShowSceneModal] = useState(false);
  const [showCharModal, setShowCharModal] = useState(false);
  const [newSceneLabel, setNewSceneLabel] = useState('');
  const [newSceneSong, setNewSceneSong] = useState('');
  const [newCharName, setNewCharName] = useState('');
  const [newCharActor, setNewCharActor] = useState('');
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const scrollRef = useRef(null);
  // Sticky scene headers sit just under the sticky spot header
  const theadRef = useRef(null);
  const [theadHeight, setTheadHeight] = useState(48);
  // The pinned scene header whose first cue has scrolled past (shown in [brackets])
  const [continuedScene, setContinuedScene] = useState(null);
  useEffect(() => {
    if (!theadRef.current) return;
    const ro = new ResizeObserver(() => setTheadHeight(theadRef.current?.getBoundingClientRect().height || 48));
    ro.observe(theadRef.current);
    return () => ro.disconnect();
  });
  const updateContinuedScene = () => {
    const container = scrollRef.current;
    if (!container) return;
    let current = null;
    container.querySelectorAll('tr[data-scene-key]').forEach(row => {
      // Measure the header cell: it's what sticks (the row itself keeps its original place)
      const headerCell = row.firstElementChild;
      const firstCue = row.nextElementSibling;
      if (headerCell && firstCue && !firstCue.hasAttribute('data-scene-key') &&
          firstCue.getBoundingClientRect().top < headerCell.getBoundingClientRect().bottom - 1) {
        current = row.getAttribute('data-scene-key');
      }
    });
    setContinuedScene(current);
  };
  const [irisSizes, setIrisSizes] = useState([]);
  // Which cue fields this show shows on the cue list (Show Settings > Cue Settings)
  const [listFields, setListFields] = useState({});
  const [customActions, setCustomActions] = useState([]);
  const [dragSource, setDragSource] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [showDragModal, setShowDragModal] = useState(false);
  const [dragModalStep, setDragModalStep] = useState('action');
  const [cuePopup, setCuePopup] = useState(null);
  const undoStackRef = useRef([]);
  const [popupNote, setPopupNote] = useState('');

  // False until the cues have been read once, so the "No cues yet" screen never flashes while loading
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    const result = ipcRenderer.sendSync('db-get-cue-list', show.id);
    const safe = result && typeof result === 'object' ? result : { spots: [], scenes: [], cues: [], spotCues: [] };
    setData(safe);
    setLoaded(true);
    const chars = ipcRenderer.sendSync('db-get-characters', show.id);
    setCharacters(Array.isArray(chars) ? chars : []);
    const slotsBySpot = {};
    for (const spot of (safe.spots || [])) {
      const slots = ipcRenderer.sendSync('db-get-color-slots', spot.id);
      slotsBySpot[spot.id] = Array.isArray(slots) ? slots : [];
    }
    setColorSlotsBySpot(slotsBySpot);
    const updatedShow = ipcRenderer.sendSync('db-get-show', show.id);
    // The show's iris sizes in order (defaults, possibly renamed or moved, plus custom ones)
    setIrisSizes(irisSizeList(updatedShow?.iris_sizes));
    const customActionData = updatedShow?.custom_actions ? JSON.parse(updatedShow.custom_actions) : [];
    setCustomActions(customActionData);
    setListFields(Object.fromEntries(Object.entries(cueFieldSettings(updatedShow?.cue_fields)).map(([k, v]) => [k, v.list])));
    if (safe.scenes && safe.scenes.length > 0) {
      const savedScene = sessionStorage.getItem(`cueScene_${show.id}`);
      if (savedScene) {
        setSelectedSceneId(parseInt(savedScene));
      } else if (!selectedSceneId) {
        setSelectedSceneId(safe.scenes[0].id);
      }
    }
    setTimeout(() => {
      const savedScroll = sessionStorage.getItem(`cueScroll_${show.id}`);
      if (savedScroll && scrollRef.current) {
        scrollRef.current.scrollTop = parseInt(savedScroll);
      }
    }, 100);
  };

  useEffect(() => { load(); }, []);

    const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    const handler = () => {
      const cues = dataRef.current?.cues || [];
      if (cues.length > 0) {
        const lastCue = [...cues].sort((a, b) => a.sort_order - b.sort_order)[cues.length - 1];
        insertCueAfter(lastCue.id, lastCue.scene_id);
      } else {
        addCue();
      }
    };
    ipcRenderer.on('menu-add-cue', handler);
    return () => {
      ipcRenderer.removeListener('menu-add-cue', handler);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        (() => {
          if (undoStackRef.current.length === 0) return;
          const last = undoStackRef.current[undoStackRef.current.length - 1];
                    if (last.type === 'spot-cue') {
            ipcRenderer.sendSync('db-update-spot-cue', { spotCueId: last.spotCueId, field: last.field, value: last.oldValue });
            setData(d => ({ ...d, spotCues: (d?.spotCues || []).map(sc => sc.id === last.spotCueId ? { ...sc, [last.field]: last.oldValue } : sc) }));
            } else if (last.type === 'cue') {
            ipcRenderer.sendSync('db-update-cue', { cueId: last.cueId, field: last.field, value: last.oldValue });
            setData(d => ({ ...d, cues: (d?.cues || []).map(c => c.id === last.cueId ? { ...c, [last.field]: last.oldValue } : c) }));
          } else if (last.type === 'batch') {
            last.entries.forEach(entry => {
              if (entry.type === 'spot-cue') {
                ipcRenderer.sendSync('db-update-spot-cue', { spotCueId: entry.spotCueId, field: entry.field, value: entry.oldValue });
                setData(d => ({ ...d, spotCues: (d?.spotCues || []).map(sc => sc.id === entry.spotCueId ? { ...sc, [entry.field]: entry.oldValue } : sc) }));
              }
            });
          }
                    undoStackRef.current = undoStackRef.current.slice(0, -1);
        })();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addCue = () => {
    const lastCue = (data?.cues || [])[(data?.cues || []).length - 1];
    const sceneId = selectedSceneId || (lastCue ? lastCue.scene_id : null);
    ipcRenderer.sendSync('db-create-cue', { showId: show.id, sceneId });
    load();
  };

  const insertCueAfter = (afterCueId, sceneId) => {
    ipcRenderer.sendSync('db-create-cue', { showId: show.id, sceneId, afterCueId });
    load();
  };

    const updateCue = (cueId, field, value) => {
    const oldCue = (data?.cues || []).find(c => c.id === cueId);
    const oldValue = oldCue ? oldCue[field] : null;
    ipcRenderer.sendSync('db-update-cue', { cueId, field, value });
      undoStackRef.current = [...undoStackRef.current.slice(-49), { type: 'cue', cueId, field, oldValue, newValue: value }];
    if (field === 'scene_id') {
      load();
    } else {
      setData(d => ({ ...d, cues: (d?.cues || []).map(c => c.id === cueId ? { ...c, [field]: value } : c) }));
    }
  };

      const updateSpotCue = (spotCueId, field, value, skipUndo = false) => {
    const oldSpotCue = (data?.spotCues || []).find(sc => sc.id === spotCueId);
    const oldValue = oldSpotCue ? oldSpotCue[field] : null;
    ipcRenderer.sendSync('db-update-spot-cue', { spotCueId, field, value });
    setData(d => ({ ...d, spotCues: (d?.spotCues || []).map(sc => sc.id === spotCueId ? { ...sc, [field]: value } : sc) }));
    if (!skipUndo) {
      undoStackRef.current = [...undoStackRef.current.slice(-49), { type: 'spot-cue', spotCueId, field, oldValue, newValue: value }];
    }
  };
  const upsertSpotCue = (spotId, cueId, field, value) => {
    const result = ipcRenderer.sendSync('db-upsert-spot-cue', { spotId, cueId, field, value });
    if (result.success) {
      setData(d => {
        const existing = (d?.spotCues || []).find(sc => sc.spot_id === spotId && sc.cue_id === cueId);
        if (existing) {
          return { ...d, spotCues: d.spotCues.map(sc => sc.spot_id === spotId && sc.cue_id === cueId ? { ...sc, [field]: value } : sc) };
        } else {
          return { ...d, spotCues: [...(d.spotCues || []), { spot_id: spotId, cue_id: cueId, id: result.id, [field]: value }] };
        }
      });
    }
    return result;
  };
  const setPopupSpotCueField = (field, value) => {
    if (cuePopup.spotCue?.id) {
      updateSpotCue(cuePopup.spotCue.id, field, value);
      setCuePopup(p => ({ ...p, spotCue: { ...p.spotCue, [field]: value } }));
    } else {
      const result = upsertSpotCue(cuePopup.spot.id, cuePopup.cue.id, field, value);
      setCuePopup(p => ({ ...p, spotCue: { ...p.spotCue, spot_id: p.spot.id, cue_id: p.cue.id, id: result?.id, [field]: value } }));
    }
  };

  const deleteCue = (cueId) => {
    ipcRenderer.sendSync('db-delete-cue', cueId);
    load();
  };

  const addScene = () => {
    if (!newSceneLabel.trim()) return;
    const result = ipcRenderer.sendSync('db-create-scene', { showId: show.id, label: newSceneLabel, song: newSceneSong });
    if (result.success) { setSelectedSceneId(result.id); setNewSceneLabel(''); setNewSceneSong(''); setShowSceneModal(false); load(); }
  };

  // A new custom name was typed in a cue: optionally add it to the show's characters
  // (starts unticked for printing on the Characters sheet) and link the cue to it
  const addCustomCharacterToShow = (spotCueId, name) => {
    if (!ipcRenderer.sendSync('dialog-add-character', name)) return;
    const result = ipcRenderer.sendSync('db-create-character', { showId: show.id, name, actorName: '', printOnSheet: 0 });
    if (!result?.success) return;
    const chars = ipcRenderer.sendSync('db-get-characters', show.id);
    setCharacters(Array.isArray(chars) ? chars : []);
    updateSpotCue(spotCueId, 'character_id', result.id);
    updateSpotCue(spotCueId, 'custom_character', null);
  };

  const addCharacter = () => {
    if (!newCharName.trim()) return;
    ipcRenderer.sendSync('db-create-character', { showId: show.id, name: newCharName, actorName: newCharActor });
    setNewCharName(''); setNewCharActor(''); setShowCharModal(false);
    const chars = ipcRenderer.sendSync('db-get-characters', show.id);
    setCharacters(Array.isArray(chars) ? chars : []);
  };

// Renumber T· 1, 2, 3… top to bottom, exactly as the list shows (cues in a deleted scene, which the
  // list can't show, go last). Only the T· numbers change; cue order, scenes and LQs stay as they are.
  const renumberTracks = () => {
    const shown = groupedCues().flatMap(g => g.cues);
    const shownIds = new Set(shown.map(c => c.id));
    const rest = [...(data?.cues || [])].filter(c => !shownIds.has(c.id)).sort((a, b) => a.sort_order - b.sort_order);
    const ordered = [...shown, ...rest];
    if (!ordered.length) return;
    if (ordered.every((c, i) => c.track_number === i + 1)) { alert('T· numbers are already in order (1 to ' + ordered.length + ').'); return; }
    if (!window.confirm(`Renumber spot cues T·1 to T·${ordered.length}, top to bottom?\n\nT· numbers are the spot cue numbers operators use to keep their place, printed beside each LQ. Renumbering cleans them up after cues were inserted.\n\nThe order of your cues, their scenes and LQ numbers won't change. If you've already handed out sheets, reprint them so everyone's T· numbers match.`)) return;
    const result = ipcRenderer.sendSync('db-renumber-tracks', { showId: show.id, cueIds: ordered.map(c => c.id) });
    if (!result?.success) { alert('Could not renumber: ' + (result?.error || 'unknown error')); return; }
    load();
  };

const groupedCues = () => {
    const cues = data?.cues || [];
    const scenes = data?.scenes || [];
    const sorted = [...cues].sort((a, b) => a.sort_order - b.sort_order);
    const groups = [];

    const sceneOrder = scenes.map(s => s.id);
    const usedSceneIds = new Set();

    for (const sceneId of sceneOrder) {
      const sceneCues = sorted.filter(c => c.scene_id === sceneId);
      if (sceneCues.length === 0) continue;
      const scene = scenes.find(s => s.id === sceneId);
      groups.push({
        sceneId,
        sceneLabel: scene ? scene.label : 'Unknown',
        sceneSong: scene ? scene.song : '',
        actBreak: scene ? !!scene.act_break : false,
        cues: sceneCues,
      });
      usedSceneIds.add(sceneId);
    }

    const unassigned = sorted.filter(c => !c.scene_id);
    if (unassigned.length > 0) {
      groups.push({ sceneId: null, sceneLabel: 'Unassigned', sceneSong: '', cues: unassigned });
    }

    return groups;
  };

      return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1E1E1E' }}>
    <AppHeader title="Cue List" onBack={() => navigate('show', show)} backLabel={show.title}>
        <div style={{ flex: 1 }} />
         <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Jump to</span>
        <select value={selectedSceneId || ''} onChange={e => {
          const sceneId = e.target.value ? parseInt(e.target.value) : null;
          setSelectedSceneId(sceneId);
          if (sceneId && scrollRef.current) {
            const sceneRow = document.querySelector(`[data-scene-id="${sceneId}"]`);
            if (sceneRow && scrollRef.current) {
              const containerTop = scrollRef.current.getBoundingClientRect().top;
              const target = sceneRow.nextElementSibling || sceneRow;
              const headerHeight = sceneRow.getBoundingClientRect().height;
              const offset = target.getBoundingClientRect().top - containerTop;
              scrollRef.current.scrollBy({ top: offset - theadHeight - headerHeight, behavior: 'smooth' });
            }
          }
        }}
          style={{ height: '28px', maxWidth: '260px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px', color: '#FFFFFF', padding: '0 8px', fontSize: '13px', outline: 'none' }}>
          <option value="">Jump to scene...</option>
          {(data?.scenes || []).map(s => <option key={s.id} value={s.id}>{s.label}{s.song ? ' · ' + s.song : ''}</option>)}
        </select>
        <button onClick={renumberTracks} title="Renumber T· 1, 2, 3… top to bottom. Cue order doesn't change."
          style={{ height: '28px', padding: '0 12px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Renumber T·</button>
        <span data-tour="add-scene" style={{ display: 'inline-flex', gap: '12px' }}>
        <button onClick={() => setShowSceneModal(true)} style={{ height: '28px', padding: '0 12px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>+ Scene</button>
        <button onClick={() => setShowCharModal(true)} style={{ height: '28px', padding: '0 12px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>+ Character</button>
        </span>
      </AppHeader>

      <div ref={scrollRef} onScroll={() => {
        updateContinuedScene();
        if (scrollRef.current) {
          sessionStorage.setItem(`cueScroll_${show.id}`, scrollRef.current.scrollTop);
          sessionStorage.setItem(`cueScene_${show.id}`, selectedSceneId);
        }
      }} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        {!loaded ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
            Loading cues…
          </div>
        ) : (data?.cues || []).length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: '12px', color: 'rgba(255,255,255,0.28)' }}>
            <div style={{ fontSize: '36px' }}>✦</div>
            <div style={{ fontSize: '15px' }}>No cues yet</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)' }}>Add a scene first, then create your first cue</div>
            <button data-tour="first-cue" onClick={addCue} style={{ marginTop: '8px', padding: '8px 20px', background: '#0A84FF', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}>+ Add first cue</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', position: 'relative' }}>
            <thead ref={theadRef} style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: '#262626', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontWeight: '600', width: '90px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>CUE</th>
                {(data?.spots || []).map(spot => (
                  <th key={spot.id} style={{ padding: '8px 18px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.12)', minWidth: '260px', width: `${100 / (data?.spots || []).length}%` }}>
                    <div style={{ fontSize: '13px', color: '#409CFF', fontWeight: '700' }}>SPOT {spot.spot_number}</div>
                    {spot.operator_name && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.62)', fontWeight: '500', marginTop: '1px' }}>{spot.operator_name}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedCues().map((group, groupIndex, groups) => (
                <React.Fragment key={group.sceneId || 'unassigned'}>
                  <tr data-scene-id={group.sceneId} data-scene-key={group.sceneId || 'unassigned'}>
                    <td colSpan={(data?.spots || []).length + 1} style={{ position: 'sticky', top: theadHeight, zIndex: 6, padding: '7px 14px', textAlign: 'center', background: group.actBreak ? '#3E301B' : '#203A2A', borderTop: `1px solid ${group.actBreak ? 'rgba(255,159,10,0.35)' : 'rgba(48,209,88,0.32)'}`, borderBottom: `1px solid ${group.actBreak ? 'rgba(255,159,10,0.35)' : 'rgba(48,209,88,0.32)'}` }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: group.actBreak ? '#FF9F0A' : '#30D158', letterSpacing: '0.01em' }}>
                        {continuedScene === String(group.sceneId || 'unassigned') ? `[${group.sceneLabel}]` : group.sceneLabel}
                      </span>
                      {group.sceneSong && <span style={{ fontSize: '12px', color: group.actBreak ? 'rgba(255,159,10,0.75)' : 'rgba(48,209,88,0.72)', marginLeft: '8px' }}>{group.sceneSong}</span>}
                    </td>
                  </tr>
                  {group.cues.map((cue, cueIndex) => (
                    <CueRow key={cue.id} cue={cue} fieldsShown={listFields}
                      isLastCue={groupIndex === groups.length - 1 && cueIndex === group.cues.length - 1}
                      spots={data?.spots || []}
                      spotCues={data?.spotCues || []} characters={characters}
                      colorSlotsBySpot={colorSlotsBySpot} scenes={data?.scenes || []}
                      onUpdateCue={updateCue} onUpdateSpotCue={updateSpotCue} onNewCustomCharacter={addCustomCharacterToShow}
                      onDelete={deleteCue} onInsertAfter={insertCueAfter}
                      dragSource={dragSource} dragTarget={dragTarget}
                      setDragSource={setDragSource} setDragTarget={setDragTarget}
                      setShowDragModal={setShowDragModal}
                      irisSizes={irisSizes}
                      customActions={customActions}
                      onCueDoubleClick={(cue, spot, spotCue) => {
                      setCuePopup({ cue, spot, spotCue });
                       setPopupNote(spotCue?.spot_note || '');
               }}/>
                  ))}
                </React.Fragment>
              ))}
              <tr>
                <td colSpan={(data?.spots || []).length + 1} style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div
                    onClick={() => {
                      const cues = data?.cues || [];
                      if (cues.length > 0) {
                        const lastCue = [...cues].sort((a, b) => a.sort_order - b.sort_order)[cues.length - 1];
                        insertCueAfter(lastCue.id, lastCue.scene_id);
                      } else {
                        addCue();
                      }
                    }}
                    data-tour="add-cue-end"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', fontSize: '11px', fontWeight: '600' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,132,255,0.16)'; e.currentTarget.style.color = '#409CFF'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.28)'; }}>
                    + Add cue at end
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan={(data?.spots || []).length + 1} style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.28)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  — End of Show —
                </td>
              </tr>
            </tbody>
          </table>
        )}
        {cuePopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => {
            const ta = document.getElementById('popup-note-textarea');
            if (ta && cuePopup.spotCue?.id) updateSpotCue(cuePopup.spotCue.id, 'spot_note', ta.value);
            setCuePopup(null);
          }}>
          <div style={{ background: '#2A2A2A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '28px', width: '420px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>
                  LQ {cuePopup.cue.lq_number || '—'} · Spot {cuePopup.spot.spot_number}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                  {cuePopup.spot.operator_name || 'No operator'}
                </div>
              </div>
              <button onClick={() => {
                const ta = document.getElementById('popup-note-textarea');
                if (ta && cuePopup.spotCue?.id) updateSpotCue(cuePopup.spotCue.id, 'spot_note', ta.value);
                setCuePopup(null);
              }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => {
                  const newVal = cuePopup.spotCue?.ignored ? 0 : 1;
                  if (cuePopup.spotCue) {
                    updateSpotCue(cuePopup.spotCue.id, 'ignored', newVal);
                  } else {
                    upsertSpotCue(cuePopup.spot.id, cuePopup.cue.id, 'ignored', newVal);
                  }
                  setCuePopup(p => ({ ...p, spotCue: { ...p.spotCue, ignored: newVal } }));
                }}
                style={{ flex: 1, padding: '12px', background: cuePopup.spotCue?.ignored ? 'rgba(255,69,58,0.18)' : 'rgba(255,255,255,0.06)', border: `1px solid ${cuePopup.spotCue?.ignored ? '#FF453A' : 'rgba(255,255,255,0.14)'}`, borderRadius: '8px', color: cuePopup.spotCue?.ignored ? '#FF453A' : 'rgba(255,255,255,0.62)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
                  <div>{cuePopup.spotCue?.ignored ? 'Ignored' : 'Ignore cue'}</div>
                  <div style={{ fontSize: '11px', fontWeight: '400', marginTop: '2px', opacity: 0.7 }}>Cross out this cue without deleting</div>
                </button>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highlight</div>
                {[{ field: 'highlight', label: 'Whole cue' }, { field: 'when_highlight', label: 'When line' }, { field: 'notes_highlight', label: 'Notes line' }].map(({ field, label }) => (
                  <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ width: '80px', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>{label}</div>
                    <div style={{ flex: 1, display: 'flex', gap: '2px', padding: '2px', height: '28px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', borderRadius: '6px' }}>
                      {[{ value: null, text: 'None', color: '#FFFFFF', bg: 'rgba(255,255,255,0.14)' }, { value: 'yellow', text: 'Yellow', color: '#FFD60A', bg: 'rgba(255,214,10,0.30)' }, { value: 'red', text: 'Red', color: '#FF453A', bg: 'rgba(255,69,58,0.30)' }].map(opt => {
                        const selected = (cuePopup.spotCue?.[field] || null) === opt.value;
                        return (
                          <div key={opt.text} onClick={() => setPopupSpotCueField(field, opt.value)}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: selected ? opt.bg : 'transparent', color: selected ? opt.color : 'rgba(255,255,255,0.55)' }}>
                            {opt.text}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spot note</div>
              <textarea
                key={cuePopup.spotCue?.id}
                defaultValue={cuePopup.spotCue?.spot_note || ''}
                id="popup-note-textarea"
                onBlur={e => {
                  if (cuePopup.spotCue?.id) {
                    updateSpotCue(cuePopup.spotCue.id, 'spot_note', e.target.value);
                  }
                }}
                placeholder="Type a note for this spot operator..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFFFFF', padding: '10px 12px', fontSize: '13px', outline: 'none', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <button onClick={() => {
                const ta = document.getElementById('popup-note-textarea');
                if (ta && cuePopup.spotCue?.id) updateSpotCue(cuePopup.spotCue.id, 'spot_note', ta.value);
                setCuePopup(null);
              }} style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#0A84FF', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
        {showDragModal && dragSource && dragTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#2A2A2A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '28px', width: '400px' }}>
            {dragModalStep === 'action' ? (
              <>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px' }}>Move cue data</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.52)', marginBottom: '24px' }}>
                  What do you want to do with <span style={{ color: '#409CFF' }}>Spot {dragSource.spot.spot_number} / {dragSource.cue.lq_number || 'T·' + dragSource.cue.track_number}</span>?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={async () => {
                    const srcData = { ...dragSource.spotCue };
                    const tgtData = dragTarget.spotCue ? { ...dragTarget.spotCue } : {};
                    const fields = ['action','character_id','custom_character','frame_size','intensity','fade_time','active_frames','description','with_lq','notes','no_color'];

                    const swapUndoEntries = [];
                    if (dragSource.spotCue) {
                      fields.forEach(f => swapUndoEntries.push({ type: 'spot-cue', spotCueId: dragSource.spotCue.id, field: f, oldValue: srcData[f] || '', newValue: tgtData[f] || '' }));
                    }
                    if (dragTarget.spotCue) {
                      fields.forEach(f => swapUndoEntries.push({ type: 'spot-cue', spotCueId: dragTarget.spotCue.id, field: f, oldValue: tgtData[f] || '', newValue: srcData[f] || '' }));
                    }
                    undoStackRef.current = [...undoStackRef.current.slice(-49), { type: 'batch', entries: swapUndoEntries }];

                    if (dragSource.spotCue) {
                      fields.forEach(f => updateSpotCue(dragSource.spotCue.id, f, tgtData[f] !== undefined ? tgtData[f] : '', true));
                    } else {
                      fields.forEach(f => upsertSpotCue(dragSource.spot.id, dragSource.cue.id, f, srcData[f] || ''));
                    }
                    if (dragTarget.spotCue) {
                      fields.forEach(f => updateSpotCue(dragTarget.spotCue.id, f, srcData[f] !== undefined ? srcData[f] : '', true));
                    } else {
                      fields.forEach(f => upsertSpotCue(dragTarget.spot.id, dragTarget.cue.id, f, srcData[f] || ''));
                    }
                    load();
                    setShowDragModal(false);
                    setDragSource(null);
                    setDragTarget(null);
                    setDragModalStep('action');
                  }} style={{ padding: '12px', background: '#0A84FF', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
                    <div>Swap</div>
                    <div style={{ fontSize: '11px', fontWeight: '400', opacity: 0.7, marginTop: '2px' }}>Exchange data between both spots</div>
                  </button>
                  <button onClick={() => setDragModalStep('character')}
                    style={{ padding: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', color: '#FFFFFF', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
                    <div>Copy</div>
                    <div style={{ fontSize: '11px', fontWeight: '400', opacity: 0.7, marginTop: '2px' }}>Copy source data into target spot</div>
                  </button>
                  <button onClick={() => { setShowDragModal(false); setDragSource(null); setDragTarget(null); setDragModalStep('action'); }}
                    style={{ padding: '8px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px' }}>Copy character?</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.52)', marginBottom: '24px' }}>
                  Should the character name also be copied, or keep the existing character in the target spot?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => {
                    const srcData = { ...dragSource.spotCue };
                    const fields = ['action','character_id','frame_size','intensity','fade_time','active_frames','description','with_lq','notes'];
                    if (dragTarget.spotCue) {
                      fields.forEach(f => updateSpotCue(dragTarget.spotCue.id, f, srcData[f] || ''));
                    } else {
                      fields.forEach(f => upsertSpotCue(dragTarget.spot.id, dragTarget.cue.id, f, srcData[f] || ''));
                    }
                    setShowDragModal(false);
                    setDragSource(null);
                    setDragTarget(null);
                    setDragModalStep('action');
                  }} style={{ padding: '12px', background: '#0A84FF', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
                    <div>Copy everything including character</div>
                    <div style={{ fontSize: '11px', fontWeight: '400', opacity: 0.7, marginTop: '2px' }}>Target spot will have the same character</div>
                  </button>
                  <button onClick={() => {
                    const srcData = { ...dragSource.spotCue };
                    const fields = ['action','frame_size','intensity','fade_time','active_frames','description','with_lq','notes'];
                    if (dragTarget.spotCue) {
                      fields.forEach(f => updateSpotCue(dragTarget.spotCue.id, f, srcData[f] || ''));
                    } else {
                      fields.forEach(f => upsertSpotCue(dragTarget.spot.id, dragTarget.cue.id, f, srcData[f] || ''));
                    }
                    setShowDragModal(false);
                    setDragSource(null);
                    setDragTarget(null);
                    setDragModalStep('action');
                  }} style={{ padding: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', color: '#FFFFFF', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
                    <div>Copy everything except character</div>
                    <div style={{ fontSize: '11px', fontWeight: '400', opacity: 0.7, marginTop: '2px' }}>Keep the existing character in the target spot</div>
                  </button>
                  <button onClick={() => setDragModalStep('action')}
                    style={{ padding: '8px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer' }}>
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </div>

      {showSceneModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#2A2A2A', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px', padding: '24px', width: '360px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: '#FFFFFF' }}>Add Scene</div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.62)', display: 'block', marginBottom: '4px' }}>Scene label *</label>
              <input autoFocus value={newSceneLabel} onChange={e => setNewSceneLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addScene()}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFFFFF', padding: '7px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. Scene 1 - The Road" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.62)', display: 'block', marginBottom: '4px' }}>Song (optional)</label>
              <input value={newSceneSong} onChange={e => setNewSceneSong(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addScene()}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFFFFF', padding: '7px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. Time Is My Enemy" />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSceneModal(false)} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={addScene} style={{ padding: '7px 14px', background: '#0A84FF', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}>Add Scene</button>
            </div>
          </div>
        </div>
      )}

      {showCharModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#2A2A2A', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px', padding: '24px', width: '360px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: '#FFFFFF' }}>Add Character</div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.62)', display: 'block', marginBottom: '4px' }}>Character name *</label>
              <input autoFocus value={newCharName} onChange={e => setNewCharName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCharacter()}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFFFFF', padding: '7px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. MARIO" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.62)', display: 'block', marginBottom: '4px' }}>Actor name (optional)</label>
              <input value={newCharActor} onChange={e => setNewCharActor(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCharacter()}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFFFFF', padding: '7px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. John Smith" />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCharModal(false)} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={addCharacter} style={{ padding: '7px 14px', background: '#0A84FF', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}>Add Character</button>
            </div>
          </div>
        </div>
      )}
      <Tips steps={TIPS.cueList} watch={(data?.cues || []).length} />
    </div>
  );
}
