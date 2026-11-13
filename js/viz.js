/* MANDAT — éléments visuels : icônes, jauges, anneaux, frise du calendrier. Sobres, lisibles, au service de la compréhension. */
window.VZ = (function () {
  const P = {
    // thèmes
    securite: '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/>',
    logement: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
    transports: '<rect x="5" y="4" width="14" height="13" rx="2"/><path d="M5 11h14M8 20v-3M16 20v-3"/><circle cx="8.5" cy="14" r=".8"/><circle cx="15.5" cy="14" r=".8"/>',
    sante: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
    education: '<path d="M3 6c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0zM21 6c-3-1.5-6-1.5-9 0v13c3-1.5 6-1.5 9 0z"/>',
    economie: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>',
    fiscalite: '<circle cx="12" cy="12" r="8.5"/><path d="M15 9a3.5 3.5 0 1 0 0 6M8 11h5M8 13h5"/>',
    ecologie: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19l8-8"/>',
    institutions: '<path d="M3 9 12 4l9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/>',
    pouvoir_achat: '<path d="M3 4h2l2.4 11h10.6l2-8H6.3"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    societe: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.3c3 .2 5.5 2.6 5.5 5.7"/>',
    agriculture: '<path d="M12 21V8"/><path d="M12 8c-2-1-3-3-3-5 2 1 3 3 3 5zM12 8c2-1 3-3 3-5-2 1-3 3-3 5zM12 13c-2.5-.8-4-2.8-4-5 2.5.8 4 2.8 4 5zM12 13c2.5-.8 4-2.8 4-5-2.5.8-4 2.8-4 5zM12 18c-2.5-.8-4-2.8-4-5 2.5.8 4 2.8 4 5zM12 18c2.5-.8 4-2.8 4-5-2.5.8-4 2.8-4 5z"/>',
    immigration: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.3 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.3-3.5-8.5s1-6 3.5-8.5z"/>',
    europe: '<circle cx="12" cy="12" r="8.5"/><path d="m12 8 1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z"/>',
    industrie: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    // familles d'actions et divers
    terrain: '<path d="M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    parti: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    medias: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>',
    propositions: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    reseau: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    tordus: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/><path d="M4 4l16 16"/>',
    mobiliser: '<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>',
    adversaires: '<path d="M5 5l6 6M19 5l-6 6M5 19l4-4M19 19l-4-4"/><path d="M4 8V4h4M20 8V4h-4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    vote: '<path d="M5 11h14v9H5z"/><path d="M9 11V4h6v7M10.5 7.5 12 9l2.5-3"/>',
    news: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 12h10M7 15h6"/>'
  };
  const FAM = { 'Sur le terrain': 'terrain', 'Parti': 'parti', 'Médias': 'medias', 'Propositions': 'propositions', 'Réseau': 'reseau', 'Équipe': 'societe', 'Coups tordus': 'tordus', 'Mobiliser': 'mobiliser', 'Face aux adversaires': 'adversaires', 'Moyens': 'fiscalite' };
  function icon(k, size, cls) { const d = P[k] || P[FAM[k]]; if (!d) return ''; return '<svg class="vi ' + (cls || '') + '" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  // jauge en demi-cercle ; v entre min et max ; centre = 0 si min < 0
  function ring(v, min, max, color, w) {
    w = w || 56; const t = (cl(v, min, max) - min) / (max - min) * 100; const ctr = min < 0;
    const col = color || (ctr ? (v >= 0 ? 'var(--good)' : 'var(--bad)') : 'var(--accent)');
    let arc;
    if (ctr) { const z = 50; const a = Math.min(t, z), b = Math.max(t, z); arc = '<path d="M5 30 A23 23 0 0 1 51 30" pathLength="100" stroke="' + col + '" stroke-dasharray="0 ' + a + ' ' + (b - a) + ' 100"/>'; }
    else arc = t < 1 ? '' : '<path d="M5 30 A23 23 0 0 1 51 30" pathLength="100" stroke="' + col + '" stroke-dasharray="' + t + ' 100"/>';
    return '<svg class="ring" width="' + w + '" height="' + Math.round(w * 34 / 56) + '" viewBox="0 0 56 34" fill="none" stroke-width="6" stroke-linecap="round" aria-hidden="true"><path d="M5 30 A23 23 0 0 1 51 30" stroke="#e3e7f0"/>' + arc + (ctr ? '<path d="M28 4v5" stroke="#9aa2b5" stroke-width="1.5"/>' : '') + '</svg>';
  }
  // anneau : parts [{v, color, l}]
  function donut(parts, size, center) {
    size = size || 92; const tot = parts.reduce((a, p) => a + Math.max(0, p.v), 0) || 1; let off = 0;
    const segs = parts.map(p => { const f = Math.max(0, p.v) / tot * 100; const s = '<circle cx="21" cy="21" r="15.9" pathLength="100" stroke="' + p.color + '" stroke-dasharray="' + f + ' ' + (100 - f) + '" stroke-dashoffset="' + (25 - off) + '"/>'; off += f; return s; }).join('');
    return '<div class="donut"><svg width="' + size + '" height="' + size + '" viewBox="0 0 42 42" fill="none" stroke-width="6" aria-hidden="true"><circle cx="21" cy="21" r="15.9" stroke="#e3e7f0"/>' + segs + '</svg>' + (center ? '<div class="dc">' + center + '</div>' : '') + '</div>';
  }
  function legend(parts) { return '<div class="lgd">' + parts.map(p => '<span><i style="background:' + p.color + '"></i>' + p.l + '</span>').join('') + '</div>'; }
  const LOCAL_T = ['mun', 'dep', 'reg', 'sen'];
  // frise verticale des prochaines élections
  function timeline(items) {
    return '<div class="tl">' + items.map(it => '<div class="tli' + (it.on ? ' on' : '') + (it.soon ? ' soon' : '') + '"><div class="tld"><b>' + it.day + '</b><span>' + it.year + '</span></div><div class="tlr"><i class="' + (LOCAL_T.includes(it.type) ? 'loc' : 'nat') + '"></i></div><div class="tlc"><b>' + it.label + '</b><span class="tlm">' + it.meta + '</span>' + (it.extra || '') + '</div></div>').join('') + '</div>';
  }
  return { icon, ring, donut, legend, timeline, FAM, P };
})();
