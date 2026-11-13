/* MANDAT — moteur de simulation (sans DOM) */
window.G = window.G || { S: null };
window.E = (function () {
  const AXI = { eco: 0, soc: 1, aut: 2, souv: 3, ecol: 4, inst: 5 };
  const PIDS = D.PARTY_IDS;
  const SEGI = {}; D.SEG_IDS.forEach((s, i) => SEGI[s] = i);
  const S = () => G.S;

  /* ---------- utilitaires ---------- */
  function rnd() { const s = S(); let t = (s.rng = (s.rng + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function gauss() { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function hfrac(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }
  function wpick(items, wf) { const ws = items.map(wf); const t = ws.reduce((a, b) => a + b, 0); let r = rnd() * t; for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }
  const uid = p => p + '_' + (S().uid = (S().uid || 0) + 1);
  const toD = s => new Date(s + 'T12:00:00Z');
  const fromD = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = toD(s); d.setUTCDate(d.getUTCDate() + n); return fromD(d); };
  const diffDays = (a, b) => Math.round((toD(b) - toD(a)) / 86400000);
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function fmtDate(s, short) { const d = toD(s); return (short ? '' : d.getUTCDate() + ' ') + MOIS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  const eur = n => (Math.round(n)).toLocaleString('fr-FR') + ' €';
  const pct = n => (Math.round(n * 10) / 10).toLocaleString('fr-FR') + ' %';
  function lse(arr) { const m = Math.max(...arr); return m + Math.log(arr.reduce((a, v) => a + Math.exp(v - m), 0)); }
  const THART = { economie: 'l’économie et l’emploi', pouvoir_achat: 'le pouvoir d’achat', securite: 'la sécurité', immigration: 'l’immigration', ecologie: 'l’écologie', sante: 'la santé', education: 'l’éducation', logement: 'le logement', transports: 'les transports', institutions: 'les institutions', europe: 'l’Europe', agriculture: 'l’agriculture', industrie: 'l’industrie', fiscalite: 'la fiscalité', societe: 'les questions de société' };
  const thArt = th => THART[th] || (D.THEMES[th] ? D.THEMES[th].l.toLowerCase() : th);
  // « de » + nom propre : élision et contraction (d’Échirolles, du Bourg-d’Oisans, des Abrets, d’Aurélie)
  function deN(x) { x = String(x == null ? '' : x); if (/^Le [A-ZÉ]/.test(x)) return 'du ' + x.slice(3); if (/^Les [A-ZÉ]/.test(x)) return 'des ' + x.slice(4); if (/^[AEIOUYÂÉÈÊÎÔÛÆŒH]/.test(x) && !/^H[aâ]/.test(x)) return 'd’' + x; return 'de ' + x; }
  // Personnalités fictives : on écarte les combinaisons qui donnent une personne réelle connue
  const REAL_NAMES = new Set(['Sandrine Rousseau', 'Olivier Faure', 'Patrick Martin', 'Philippe Martin', 'Philippe Brun', 'Bruno Bernard', 'Élodie Jacquier', 'Pauline Martin', 'Nicolas Bernard', 'Laurent Martin', 'Pierre Durand', 'Christophe Martin', 'François Bonnet', 'Julien Bernard', 'Valérie Rossi']);
  function fullName(g) { let n = ''; for (let i = 0; i < 8; i++) { n = (g === 'F' ? pick(D.FIRST_F) : pick(D.FIRST_M)) + ' ' + pick(D.LAST); if (!REAL_NAMES.has(n)) break; } return n; }

  /* ---------- axes, distances ---------- */
  const W1 = [1, 1, 1, 1, 1, 1];
  function axW() {
    const sal = S() ? S().national.salience : {}; const w = W1.slice();
    for (const t in sal) { const th = D.THEMES[t]; if (!th) continue; for (const a in th.ax) w[AXI[a]] += sal[t] * Math.abs(th.ax[a]); }
    return w;
  }
  function wdist(a, b, w) { let s = 0, ws = 0; for (let i = 0; i < 6; i++) { s += w[i] * Math.abs(a[i] - b[i]); ws += w[i]; } return s / ws; }
  function bucketAx(bucket) { const a = [0, 0, 0, 0, 0, 0]; bucket.forEach(p => D.PARTIES[p].ax.forEach((v, i) => a[i] += v / bucket.length)); return a; }
  function vecFrom(obj) { const v = [0, 0, 0, 0, 0, 0]; for (const k in obj) if (k in AXI) v[AXI[k]] = obj[k]; return v; }

  /* ---------- unités électorales et calibrage ---------- */
  const cache = {};
  function mixFrom(mixOf) { const m = [0, 0, 0, 0, 0, 0]; for (const t in mixOf) D.TYPE_MIX[t].forEach((v, i) => m[i] += v * mixOf[t]); const s = m.reduce((a, b) => a + b); return m.map(v => v / s); }
  const TYPE_ADJ = {
    metro: { G: 1.2, GE: 1.2, C: 1.05, D: 0.8, ED: 0.7, DIV: 1 }, ville: { G: 1.05, GE: 1, C: 1, D: 0.95, ED: 1.05, DIV: 1 },
    periurbain: { G: 0.85, GE: 0.9, C: 1.05, D: 1.1, ED: 1.1, DIV: 1.1 }, bourg: { G: 0.9, GE: 1, C: 0.95, D: 1.15, ED: 1.05, DIV: 1.2 },
    rural: { G: 0.75, GE: 0.9, C: 0.9, D: 1.3, ED: 1.15, DIV: 1.4 }, montagne: { G: 0.85, GE: 1.05, C: 1, D: 1.2, ED: 0.95, DIV: 1.3 }
  };
  function norm(base) { const t = Object.values(base).reduce((a, b) => a + b, 0); const o = {}; for (const k in base) o[k] = base[k] / t * 100; return o; }
  function communeBase(com, muni) {
    const cb = D.CIRCOS[com.circo - 1].base; const adj = TYPE_ADJ[com.type]; const b = {};
    PIDS.forEach(p => b[p] = cb[p] * adj[D.PARTIES[p].bloc]);
    if (muni) { b.DIV += com.pop < 3500 ? 45 : com.pop < 10000 ? 28 : com.pop < 30000 ? 14 : 6; const M = { RN: 0.55, UDR: 0.6, REC: 0.45, LR: 1.4, PS: 1.15, PCF: 1.3, LFI: 0.8, ECO: 1.05, REN: 0.85, HOR: 1.1, MODEM: 1 }; PIDS.forEach(p => { if (M[p]) b[p] *= M[p]; }); const L = com.local || {}; for (const p in L) b[p] = (b[p] || 0) * L[p]; }
    return norm(b);
  }
  function segAffTable(w) { return D.SEGS.map(s => { const o = {}; PIDS.forEach(p => o[p] = -0.025 * wdist(D.PARTIES[p].ax, s.ideal, w)); return o; }); }
  function calibrate(u) {
    const aff = segAffTable(W1); const k = {}; PIDS.forEach(p => k[p] = Math.log(u.base[p] / 100 + 1e-4));
    for (let it = 0; it < 18; it++) {
      const tot = {}; PIDS.forEach(p => tot[p] = 0); let all = 0;
      D.SEGS.forEach((s, si) => { const wt = u.mix[si] * s.turnout; const ut = PIDS.map(p => k[p] + aff[si][p]); const L = lse(ut); PIDS.forEach((p, j) => { const v = wt * Math.exp(ut[j] - L); tot[p] += v; all += v; }); });
      PIDS.forEach(p => { k[p] += Math.log((u.base[p] / 100 + 1e-4) / (tot[p] / all + 1e-4)); });
    }
    u.k = k; return u;
  }
  function unit(key) {
    if (cache[key]) return cache[key];
    let u;
    if (key === 'nat') u = { key, name: 'France', pop: D.NATIONAL.pop, mix: mixFrom(D.NATIONAL.mixOf), base: norm(D.NATIONAL.base) };
    else if (/^c\d+$/.test(key)) { const c = D.CIRCOS[+key.slice(1) - 1]; u = { key, name: c.name + ' de l’Isère', pop: c.pop, mix: mixFrom(c.mixOf), base: norm(c.base) }; }
    else if (key === 'dep38' || key === 'sen38') {
      const tot = D.CIRCOS.reduce((a, c) => a + c.pop, 0); const mix = [0, 0, 0, 0, 0, 0]; const base = {}; PIDS.forEach(k => base[k] = 0);
      D.CIRCOS.forEach(c => { const m = mixFrom(c.mixOf); m.forEach((v, i) => mix[i] += v * c.pop / tot); PIDS.forEach(k => base[k] += c.base[k] * c.pop / tot); });
      if (key === 'sen38') { const adj = { DIV: 2.2, LR: 1.5, PS: 1.3, PCF: 1.2, RN: 0.45, REC: 0.3, LFI: 0.5, UDR: 0.5, ECO: 0.9, REN: 1, MODEM: 1.1, HOR: 1.1 }; PIDS.forEach(k => base[k] *= adj[k]); }
      u = { key, name: key === 'sen38' ? 'Collège des grands électeurs de l’Isère' : 'Auvergne-Rhône-Alpes · section de l’Isère', pop: key === 'sen38' ? 2600 / 0.73 : tot, mix, base: norm(base) };
    }
    else if (key.startsWith('com:')) { const com = D.com(key.slice(4)); u = { key, name: com.name, pop: com.pop, mix: mixFrom({ [com.type]: 1 }), base: communeBase(com, false) }; }
    else if (key.startsWith('mun:')) { const com = D.com(key.slice(4)); u = { key, name: com.name, pop: com.pop, mix: mixFrom({ [com.type]: 1 }), base: communeBase(com, true) }; }
    else if (key.startsWith('can:')) {
      const com = D.com(key.slice(4)); const c = D.CIRCOS[com.circo - 1];
      const pop = clamp(Math.round(com.pop * 2.4 + 15000), 22000, 70000);
      const mo = {}; mo[com.type] = 0.55; for (const t in c.mixOf) mo[t] = (mo[t] || 0) + c.mixOf[t] * 0.45;
      u = { key, name: 'Canton ' + deN(com.canton || com.terr || com.name), pop, mix: mixFrom(mo), base: communeBase(com, false) };
    }
    return (cache[key] = calibrate(u));
  }

  /* ---------- modèle de vote ---------- */
  const TMUL = { pres: 1.22, leg: 0.95, dep: 0.62, mun: 0.95, reg: 0.62, euro: 0.85, sen: 1.6 };
  const NOTO_K = { mun: 0.85, dep: 0.8, leg: 0.85, pres: 0.6, reg: 0.3, euro: 0.35, sen: 0.6 };
  function personal(c, si, w, type) {
    const ideal = D.SEGS[si].ideal;
    const dev = wdist(c.ax, ideal, w) - wdist(bucketAx(c.bucket), ideal, w);
    const aware = 0.3 + 0.7 * clamp(c.noto, 0, 100) / 100;
    const img = c.image ? (c.image[D.SEG_IDS[si]] || 0) : (c.img || 0);
    return -0.03 * (c.sansEt ? 0.25 : 1) * dev + (NOTO_K[type] || 0.6) * Math.log(aware / 0.65) + 0.6 * img / 100 + 0.5 * ((c.cred ?? 50) - 50) / 50 + (c.camp || 0) + (c.mom || 0) + (c.prog ? (c.prog[D.SEG_IDS[si]] || 0) : 0) + (c.field ? (c.field[D.SEG_IDS[si]] || 0) : 0) + (c.diff || 0) + (c.bilan || 0);
  }
  function pjTerms(c, key, type) {
    const u = unit(key); const w = axW(); const T = { ideo: 0, noto: 0, image: 0, cred: 0, camp: 0, mom: 0, prog: 0, field: 0 }; let tot = 0;
    D.SEGS.forEach((sg, si) => { const g = D.SEG_IDS[si]; const wt = u.mix[si] * sg.turnout; tot += wt; const dev = wdist(c.ax, sg.ideal, w) - wdist(bucketAx(c.bucket), sg.ideal, w); const aware = 0.3 + 0.7 * clamp(c.noto, 0, 100) / 100; const img = c.image ? (c.image[g] || 0) : 0;
      T.ideo += wt * -0.03 * (c.sansEt ? 0.25 : 1) * dev; T.noto += wt * (NOTO_K[type] || 0.6) * Math.log(aware / 0.65); T.image += wt * 0.6 * img / 100; T.cred += wt * 0.5 * ((c.cred ?? 50) - 50) / 50; T.camp += wt * (c.camp || 0); T.mom += wt * (c.mom || 0); T.prog += wt * (c.prog ? (c.prog[g] || 0) : 0); T.field += wt * (c.field ? (c.field[g] || 0) : 0); });
    for (const k in T) T[k] /= tot; T.nat = natTerm(c, type); T.bilan = c.bilan || 0; return T;
  }
  function fresh(key, pool) { const s = S(); s.recentTxt = s.recentTxt || {}; const used = s.recentTxt[key] || []; let c = pool.filter(x => !used.includes(x)); if (!c.length) { used.length = 0; c = pool; } const v = c[Math.floor(rnd() * c.length)]; used.push(v); while (used.length > Math.min(pool.length - 1, 24)) used.shift(); s.recentTxt[key] = used; return v; }
  const DIFF = { facile: { bonus: 0.1, hours: 1.15, rival: 0.9, camp: 1.1, opp: 0.8, heat: 0.8, liste: 0.55, recrue: 1.6, l: 'Facile' }, normal: { bonus: 0, hours: 1, rival: 1.42, camp: 1, opp: 1, heat: 1, liste: 0.7, recrue: 1.15, l: 'Normal' }, difficile: { bonus: -0.06, hours: 0.9, rival: 1.53, camp: 0.9, opp: 1.2, heat: 1.25, liste: 0.8, recrue: 1, l: 'Difficile' } };
  const DF = () => DIFF[(G.S && G.S.diff) || 'normal'] || DIFF.normal;
  function indicators() {
    const s = S(), p = s.p; const el = p.cand ? s.elections.find(e => e.id === p.cand.el) : nextElection(); const t = el ? el.type : 'mun';
    const scope = t === 'mun' || t === 'dep' ? 'commune' : t === 'pres' || t === 'euro' ? 'nat' : t === 'leg' ? 'circo' : 'dept';
    const u = unit(p.cand ? p.cand.key : (t === 'mun' ? 'mun:' + p.communeId : 'c' + p.circo)); let im = 0; D.SEG_IDS.forEach((g, i) => im += (u.mix ? u.mix[i] : 1 / 6) * (p.image[g] || 0));
    const h = (s.hist || []).filter(x => x.est != null && s.est && x.el === s.est.el); const tr = h.length > 1 ? h[h.length - 1].est - h[h.length - 2].est : 0;
    const app = p.party === 'NEW' ? clamp(p.militants / 3, 0, 100) : clamp((p.prole || 0) * 14 + (p.fedSup || 0) * 0.25 + (p.natSup || 0) * 0.15 + (p.std || 0) * 0.2, 0, 100);
    return { scope, noto: Math.round(p.noto[scope]), image: Math.round(im), dyn: Math.round(clamp(50 + (p.mom || 0) * 300 + tr * 6, 0, 100)), app: Math.round(app) };
  }
  const NATK = { mun: 0.8, dep: 1, reg: 1.1, leg: 1, pres: 1, euro: 1.3, sen: 0.5 };
  function natTerm(c, type) {
    const n = S().national; const k = c.climK ?? 1; let t = (n.climate[c.party] || 0) * (NATK[type] || 1) * k;
    if (n.gov.includes(c.party)) t += -((50 - (n.approval ?? 35)) / 100) * 0.45 * (['mun', 'dep', 'reg'].includes(type) ? 1.3 : type === 'euro' ? 1.5 : type === 'sen' ? 0.5 : 1) * k;
    return t;
  }
  function vote(key, cands, type, noiseSd, round, turnK) {
    const u = unit(key); const w = axW(); const aff = segAffTable(w);
    const inscrits = Math.round(u.pop * 0.73);
    const blocs = cands.map(c => (D.PARTIES[c.party] || {}).bloc); const edDuel = round === 2 && blocs.includes('ED') && blocs.some(b => b && b !== 'ED');
    const barrage = (c, si) => !edDuel || (D.PARTIES[c.party] || {}).bloc === 'ED' ? 0 : (['JUD', 'CAD', 'RET'].includes(D.SEG_IDS[si]) ? 0.45 : 0.2) * (type === 'pres' ? 1.25 : 1); // front républicain
    const sortant = c => type === 'mun' && !c.pj && S().pnj[c.id] && S().pnj[c.id].role === 'maire' && S().pnj[c.id].territory === key.slice(4) ? 0.32 : 0; // prime au maire sortant
    const tk = (turnK || 1) * (round === 2 ? (type === 'pres' ? 1.0 : type === 'mun' ? 0.94 : 0.97) : 1);
    if (typeof DP !== 'undefined') cands.forEach(c => { if (!c.pj && !c.prog && S().pnj[c.id] && S().pnj[c.id].prog) c.prog = DP.rivalProgEffect(S().pnj[c.id], type); });
    const noise = cands.map(() => gauss() * (noiseSd ?? 0.1));
    const votes = cands.map(() => 0); let votants = 0;
    D.SEGS.forEach((s, si) => {
      const inscr = inscrits * u.mix[si];
      const to = clamp(s.turnout * (TMUL[type] || 1) * tk * (1 + (S().national.mobil || 0)), 0.12, 0.95);
      const vt = inscr * to; votants += vt;
      const ut = cands.map((c, j) => lse(c.bucket.map(p => u.k[p] + aff[si][p])) + natTerm(c, type) + personal(c, si, w, type) + barrage(c, si) + sortant(c) + noise[j]);
      const L = lse(ut); ut.forEach((x, j) => votes[j] += vt * Math.exp(x - L));
    });
    const blancs = votants * 0.025; const expr = votants - blancs;
    const tot = votes.reduce((a, b) => a + b, 0);
    const rows = cands.map((c, j) => ({ id: c.id, name: c.name, party: c.party, label: c.label || D.PARTIES[c.party]?.short || c.party, color: c.color || D.PARTIES[c.party]?.color || '#999', pj: !!c.pj, votes: Math.round(votes[j] / tot * expr), pct: votes[j] / tot * 100 }));
    rows.sort((a, b) => b.votes - a.votes);
    return { inscrits, votants: Math.round(votants), exprimes: Math.round(expr), participation: votants / inscrits * 100, rows };
  }

  /* ---------- PNJ ---------- */
  function mkTraits() { return { ambition: rint(20, 95), loyaute: rint(15, 90), rancune: rint(10, 90), scrupules: rint(10, 90), charisme: rint(20, 90), competence: rint(25, 90) }; }
  function mkPnj(o) {
    const g = o.g || (rnd() < 0.45 ? 'F' : 'M');
    const ax = (o.ax || D.PARTIES[o.party || 'DIV'].ax).map(v => clamp(Math.round(v + gauss() * 12), -100, 100));
    const p = Object.assign({ id: uid('p'), g, name: fullName(g), age: rint(32, 68), party: 'DIV', ax, traits: mkTraits(), noto: 30, rel: 0, img: 0, secrets: rnd() < 0.35 ? rint(1, 3) : 0, std: rint(25, 70), mom: 0, role: 'cadre', territory: null, mandat: null, alive: true, enemy: false, known: false }, o, { ax });
    S().pnj[p.id] = p; return p;
  }
  const pnjList = f => Object.values(S().pnj).filter(p => p.alive && !p.human && (!f || f(p)));
  function findPnj(f) { return pnjList(f)[0]; }
  function cadre(party, territory, role) { return findPnj(p => p.party === party && p.territory === territory && p.role === (role || 'cadre')) || mkPnj({ party, territory, role: role || 'cadre', noto: rint(15, 40) }); }

  function initWorld() {
    const s = S();
    PIDS.filter(p => p !== 'DIV').forEach(party => mkPnj({ party, role: 'leader', territory: 'nat', noto: rint(70, 92), age: rint(38, 66), std: 90 }));
    const depParty = ['LFI', 'ECO', 'LFI', 'PS', 'ECO', 'RN', 'LR', 'REN', 'LFI', 'RN'];
    D.CIRCOS.forEach((c, i) => mkPnj({ party: depParty[i], role: 'depute', territory: 'c' + c.id, mandat: 'Député·e de la ' + c.name, noto: rint(50, 70), std: rint(50, 80) }));
    D.COMMUNES.forEach(com => {
      const b = communeBase(com, true); const party = wpick(PIDS, p => Math.pow(b[p], 2));
      mkPnj({ party, role: 'maire', territory: com.id, mandat: 'Maire ' + deN(com.name), noto: clamp(Math.round(40 + Math.log10(com.pop) * 8), 40, 80), std: rint(40, 75) });
    });
    const pc = commune();
    if (pc && !D.COMMUNES.includes(pc)) { const b = communeBase(pc, true); const party = wpick(PIDS, p => Math.pow(b[p], 2)); mkPnj({ party, role: 'maire', territory: pc.id, mandat: 'Maire ' + deN(pc.name), noto: clamp(Math.round(34 + Math.log10(pc.pop) * 9), 40, 66), std: rint(40, 75), age: rint(52, 74) }); }
    D.MEDIAS.forEach(m => mkPnj({ party: 'DIV', role: 'journaliste', territory: m.id, mandat: 'Journaliste, ' + m.name, ax: [rint(-30, 30), m.lean - 10, m.lean / 2, m.lean / 2, 0, -20], noto: 20, appetit: rint(30, 90) }));
    [['Promoteur immobilier', 'REN'], ['Patron de PME industrielle', 'LR'], ['Président du club de rugby', 'DIV'], ['Secrétaire départemental·e d’un syndicat', 'PCF'], ['Présidente d’une association de quartier', 'PS']]
      .forEach(([r, party]) => mkPnj({ party, role: 'notable', territory: s.p.communeId, mandat: r, noto: rint(20, 45) }));
    if (s.p.party && s.p.party !== 'NEW') {
      const fed = mkPnj({ party: s.p.party, role: 'federal', territory: 'dept', mandat: 'Secrétaire fédéral·e (' + D.PARTIES[s.p.party].short + ' Isère)', noto: 35, std: 75 });
      const sec = mkPnj({ party: s.p.party, role: 'section', territory: s.p.communeId, mandat: 'Secrétaire de section (' + commune().name + ')', noto: 15, std: 45 });
      fed.known = sec.known = true; s.p.fedId = fed.id; s.p.secId = sec.id;
    }
    const maire = mayorOf(s.p.communeId); if (maire) maire.known = true;
    const dep = findPnj(p => p.role === 'depute' && p.territory === 'c' + s.p.circo); if (dep) dep.known = true;
    s.national.leaders = {}; pnjList(p => p.role === 'leader').forEach(p => s.national.leaders[p.party] = p.id);
  }
  // Petites communes (< 3 500 hab.) : listes sans étiquette, pas d'investiture, règles simplifiées
  const petite = c => !!c && c.pop < 3500;
  const village = c => !!c && c.pop < 1000;
  const munKey = key => key && key.startsWith('mun:') ? D.com(key.slice(4)) : null;
  const petiteKey = key => petite(munKey(key));
  const myPetite = () => petite(commune());
  const sortantPart = (el, key) => petiteKey(key) && hfrac(el.id + key + 'ret' + (S().seed0 || 0)) < 0.4;
  const mayorOf = cid => findPnj(p => p.role === 'maire' && p.territory === cid);
  const commune = () => D.com(S().p.communeId);

  /* ---------- calendrier électoral ---------- */
  function initElections() {
    // Calendrier de jeu : on grandit d'un échelon à l'autre (municipales, puis présidentielle + législatives, puis départementales), puis le cycle se répète.
    S().elections = [
      mkEl('mun', 2027, '03-14', '03-21'), mkEl('pres', 2028, '04-09', '04-23'), mkEl('leg', 2028, '05-14', '05-21'), mkEl('dep', 2029, '03-18', '03-25'), mkEl('reg', 2029, '03-18', '03-25'), mkEl('euro', 2029, '06-10', '06-10'), mkEl('sen', 2029, '09-23', '09-23')
    ];
  }
  const TYPE_LABEL = { pres: 'Présidentielle', leg: 'Législatives', dep: 'Départementales', mun: 'Municipales', reg: 'Régionales', euro: 'Européennes', sen: 'Sénatoriales' };
  const LIST_T = ['reg', 'euro', 'sen'];
  function mkEl(type, y, m1, m2, label) { return { id: type + y + (label ? 'a' : ''), type, label: label || TYPE_LABEL[type] + ' ' + y, d1: y + '-' + m1, d2: y + '-' + m2, status: 'futur' }; }
  const CYCLE = { mun: 6, pres: 5, leg: 5, dep: 6, reg: 6, euro: 5, sen: 6 };
  function scheduleNext(el) {
    const s = S(); const y = +el.d1.slice(0, 4) + CYCLE[el.type];
    if (el.type === 'pres') { // la présidentielle entraîne les législatives, trois semaines après le second tour
      const np = mkEl('pres', y, el.d1.slice(5), el.d2.slice(5)); s.elections.push(np);
      const l1 = addDays(np.d2, 21); if (!s.elections.some(e => e.type === 'leg' && e.status === 'futur' && Math.abs(diffDays(e.d1, l1)) < 120)) s.elections.push({ id: 'leg' + y, type: 'leg', label: 'Législatives ' + y, d1: l1, d2: addDays(l1, 7), status: 'futur' });
      return;
    }
    if (el.type === 'leg') { if (!s.elections.some(e => e.type === 'leg' && e.status === 'futur')) { const pr = s.elections.find(e => e.type === 'pres' && e.status === 'futur'); if (pr) { const l1 = addDays(pr.d2, 21); s.elections.push({ id: 'leg' + pr.d1.slice(0, 4), type: 'leg', label: 'Législatives ' + pr.d1.slice(0, 4), d1: l1, d2: addDays(l1, 7), status: 'futur' }); } } return; }
    if (s.elections.some(e => e.type === el.type && e.status === 'futur')) return;
    let yy = y; const presY = s.elections.filter(e => e.type === 'pres').map(e => +e.d1.slice(0, 4)); const base = presY.length ? Math.max(...presY) : 2028;
    const clash = yr => [0, 5, 10, 15].some(k => base + k === yr || base - k === yr);
    if (clash(yy) && el.type !== 'euro' && el.type !== 'sen') { yy++; log('Les ' + TYPE_LABEL[el.type].toLowerCase() + ' de ' + y + ' sont reportées à ' + yy + ' pour ne pas télescoper la présidentielle.', 'event'); }
    const n = mkEl(el.type, yy, el.d1.slice(5), el.d2.slice(5)); if (el.type === 'pres' || el.type === 'leg') { /* dates de jeu */ }
    s.elections.push(n);
  }
  function electionUnit(type) { const p = S().p; return type === 'pres' || type === 'euro' ? 'nat' : type === 'leg' ? 'c' + p.circo : type === 'dep' ? 'can:' + p.communeId : type === 'reg' ? 'dep38' : type === 'sen' ? 'sen38' : 'mun:' + p.communeId; }
  function nextElection(f) { return S().elections.filter(e => e.status !== 'fini' && (!f || f(e))).sort((a, b) => (a.status === 't1' ? a.d2 : a.d1) < (b.status === 't1' ? b.d2 : b.d1) ? -1 : 1)[0]; }
  function nextDate(e) { return e.status === 't1' ? e.d2 : e.d1; }
  function natWindow() {
    const s = S(); const pres = s.elections.filter(e => e.type === 'pres').sort((a, b) => a.d1 < b.d1 ? -1 : 1).find(e => e.status !== 'fini' || diffDays(e.d2, s.date) < 40);
    if (!pres) return null; const leg = s.elections.find(e => e.type === 'leg' && e.status !== 'fini' && e.d1 > pres.d2 && diffDays(pres.d2, e.d1) <= 60);
    if (!leg) return null; const open = diffDays(s.date, pres.d1) <= 56 && s.date <= leg.d2; return { pres, leg, open };
  }
  function phase() {
    const s = S(); const nw = natWindow();
    if (nw && nw.open) {
      const cur = nw.pres.status !== 'fini' ? nw.pres : nw.leg; const d = diffDays(s.date, nextDate(cur)); const nm = cur.type === 'pres' ? 'de la présidentielle' : 'des législatives'; const nm1 = cur.type === 'pres' ? 'présidentielle' : 'législatives';
      const el = s.p.cand ? s.elections.find(x => x.id === s.p.cand.el) || cur : cur;
      return { id: cur.status === 't1' ? 'entre2' : 'campagne', nat: true, label: 'Campagne nationale · ' + (cur.status === 't1' ? 'second tour ' + nm : nm1) + ' J−' + d, el, days: diffDays(s.date, nextDate(el)), cur };
    }
    const e = s.p.cand ? s.elections.find(x => x.id === s.p.cand.el) : nextElection();
    if (!e) return { id: 'hors', label: 'Hors campagne', el: null };
    const d = diffDays(s.date, nextDate(e));
    if (e.status === 't1' && s.p.cand && s.p.cand.el === e.id && e.races) { const r = e.races[s.p.cand.key]; if (r && (r.done || !(r.t2 || []).includes('PJ'))) { const won = r.done && (r.winner === 'PJ' || (r.seats && r.seats.PJ && r.rows && r.rows[0] && r.rows[0].id === 'PJ')); return { id: 'attente', won, label: won ? 'Élu·e au premier tour' : 'Campagne terminée', el: e, days: d, done: true }; } }
    if (e.status === 't1') return { id: 'entre2', silence: d <= 1, label: (d <= 1 ? 'Veille du second tour · silence électoral' : 'Entre-deux-tours · ' + e.label + ' · J−' + d + (s.half ? ' · après-midi' : d <= 2 ? ' · matin' : '')), el: e, days: d };
    if (d <= 1 && d > 0 && e.status !== 't1') return { id: 'campagne', silence: true, label: 'Veille du scrutin · silence électoral', el: e, days: d };
    if (d <= 56) return { id: 'campagne', label: 'Campagne · ' + e.label + ' · J−' + d + (s.half ? ' · après-midi' : d <= 2 ? ' · matin' : ''), el: e, days: d };
    if (d <= 150) return { id: 'pre', label: 'Pré-campagne · ' + e.label + ' J−' + d, el: e, days: d };
    return { id: 'hors', label: 'Hors campagne', el: e, days: d };
  }
  // Le temps se resserre à l'approche du scrutin : mois, 14 j, 7 j, 3 j, 2 j, 1 j, demi-journées, puis veille (silence électoral)
  function daysLeft() { const s = S(); const e = nextElection(); return e ? diffDays(s.date, nextDate(e)) - (s.half ? 0.5 : 0) : 999; }
  function turnDays() {
    const s = S(); const d0 = toD(s.date); const toMonth = diffDays(s.date, fromD(new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1, 12))));
    const d = daysLeft(); if (d >= 999) return toMonth;
    const to2 = diffDays(s.date, fromD(new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 2, 1, 12))));
    let std = d > 300 && !s.p.cand ? to2 : d > 150 ? toMonth : d > 56 ? 14 : d > 21 ? 7 : d > 7 ? 3 : d > 3 ? 2 : d > 2 ? 1 : d > 1 ? 0.5 : 1;
    if (std > 1 && std > d - 1) std = Math.max(1, Math.floor(d - 1)); if (d > 150 && toMonth > d - 150 && d - 150 >= 7) std = Math.round(d - 150);
    if (!s.p.cand && d <= 150 && d > 1) std = d > 45 ? Math.min(toMonth, Math.floor(d - 1)) : Math.max(1, Math.floor(d - 1)); // pas candidat·e : pas de tours au jour le jour
    return std;
  }
  function silence() { const d = daysLeft(); return d <= 1 && d > 0; }
  function hoursFor(days) {
    const p = S().p; const met = D.METIERS.find(m => m.id === p.metier);
    let hpw = p.fullTime ? 50 : met.hpw + (p.mandats.length ? 3 : 0);
    const ph = phase(); const dl = daysLeft();
    if ((ph.id === 'campagne' || ph.id === 'entre2') && dl <= 7) return Math.round(days * (silence() ? 4 : p.cand ? 13 : 5) * (DIFF[S().diff || 'normal'] || DIFF.normal).hours); // en campagne, on pose ses congés, on rogne ses nuits : beaucoup plus de temps disponible
    if (ph.id === 'campagne' || ph.id === 'entre2') hpw = p.cand ? Math.max(hpw * 2.4, 30) : hpw * 1.6;
    else if (ph.id === 'pre') hpw = p.cand ? Math.max(hpw * 1.6, 18) : hpw * 1.2;
    else if (ph.nat && p.party !== 'NEW') hpw = hpw * 1.4;
    return Math.round(hpw * days / 7 * (DIFF[S().diff || 'normal'] || DIFF.normal).hours) + (typeof HQ !== 'undefined' && days >= 3 ? HQ.hoursBonus() : 0);
  }

  /* ---------- création de partie ---------- */
  function newGame(setup) {
    G.S = {
      v: 1, diff: setup.diff || 'normal', seed0: setup.seed || (Date.now() % 2147483647), rng: setup.seed || (Date.now() % 2147483647), uid: 0, date: '2026-06-15', turn: 1, pnj: {}, log: [], news: [], posts: [], polls: [], queue: [], results: [], trends: [],
      national: { approval: 29, climate: {}, salience: {}, president: null, gov: ['REN', 'MODEM', 'HOR', 'LR'], unionGauche: true, unionCentre: true, mobil: 0, assembly: null, lastDiss: '2024-06-09' },
      p: {
        name: setup.name, g: setup.g, age: setup.age, metier: setup.metier, communeId: setup.communeId, quiz: setup.quiz || null, circo: D.com(setup.communeId).circo,
        ax: setup.ax, traits: setup.traits, party: setup.party, movement: setup.movement || null, std: setup.party === 'NEW' ? 0 : 8, rank: setup.party === 'NEW' ? 'Fondateur·rice' : 'Adhérent·e',
        noto: { commune: 4, circo: 1, dept: 0, nat: 0 }, image: {}, cred: 40, militants: setup.party === 'NEW' ? 3 : 0, cash: 0, debt: 0, fullTime: false,
        hours: 0, hoursMax: 0, mandats: [], staff: [], casseroles: [], procs: [], dossiers: [], prog: [], stmts: [], accords: [], inelig: null, cand: null,
        camp: { terrain: 0, medias: 0, num: 0, meet: 0 }, mom: 0, followers: 40, soutiens: 0, parrainages: 0, factchecks: [], promises: [], mairie: null, mediaTraining: 0
      }
    };
    const s = G.S; const met = D.METIERS.find(m => m.id === setup.metier);
    s.p.cash = met.cash; D.SEG_IDS.forEach(id => s.p.image[id] = (met.seg[id] || 0)); s.p.cred = clamp(s.p.cred + (met.cred || 0), 0, 100); s.p.noto.commune += met.noto || 0; // métiers établis : crédibilité et réseau local
    PIDS.forEach(p => s.national.climate[p] = 0);
    initElections(); initWorld(); initParty(); rankUpdate();
    s.p.hoursMax = s.p.hours = hoursFor(turnDays());
    log('Vous prenez votre carte de militant·e à ' + commune().name + '. ' + (s.p.party === 'NEW' ? 'Vous lancez « ' + s.p.movement + ' » avec trois amis.' : 'Section ' + D.PARTIES[s.p.party].short + ' locale.'), 'start');
    article('dauph', 'Municipales de mars 2027 : à ' + commune().name + ', les listes commencent à se former', 0, 'nat');
    const e0 = EVENTS.find(x => x.id === 'budget'); s.national.salience[e0.th] = 0.6; s.recentEv = [{ id: e0.id, t: e0.t, d: e0.d, th: e0.th, date: s.date, custom: null }]; article('quotlib', e0.t, 0, 'nat', e0.d);
    genPosts(4); publishPolls(true);
    const es = estimate(); s.hist = [{ date: s.date, est: es ? Math.round(es.pct * 10) / 10 : null, el: es ? es.el : null, pop: 0 }];
    return s;
  }

  /* ---------- journal, presse, réseaux ---------- */
  function log(t, kind) { S().log.unshift({ date: S().date, t, kind: kind || 'info' }); if (S().log.length > 200) S().log.length = 200; }
  function article(mediaId, title, tone, about, body) {
    const m = D.MEDIAS.find(x => x.id === mediaId) || D.MEDIAS[0];
    S().news.unshift({ id: uid('a'), date: S().date, media: m.name, mediaId: m.id, title, tone: tone || 0, about: about || 'nat', body: body || '' });
    if (S().news.length > 90) S().news.length = 90;
  }
  const HANDLES = ['@citoyen38', '@grenoblois_en_colere', '@voironnaise', '@ParisAlpes', '@Isere_Info', '@papy_resistant', '@etudiante_UGA', '@lebarbudesalpes', '@NordIsereLibre', '@MamanDe3', '@ZadOuPas', '@JeanMi_38', '@laptitecaissiere', '@ingenieur_crolles'];
  function post(author, handle, text, pj, likes) {
    S().posts.unshift({ id: uid('x'), date: S().date, author, handle, text, pj: !!pj, likes: likes ?? rint(2, 300), rt: rint(0, 80) });
    if (S().posts.length > 80) S().posts.length = 80;
  }
  const CITIZEN_LINES = {
    securite: ['Encore un deal en bas de chez moi. Qui fait quoi ?', 'Arrêtez de nier l’insécurité, on la vit.'],
    pouvoir_achat: ['Le plein à 2 € et on nous parle de sobriété…', 'Mon salaire n’a pas bougé depuis 3 ans.'],
    ecologie: ['Plus de neige à 1 500 m, mais tout va bien.', 'La canicule, c’est maintenant.'],
    immigration: ['On ne parle que de ça sur les plateaux, et nous on parle de nos fins de mois.', 'Le sujet est explosif, personne n’ose le traiter sérieusement.'],
    logement: ['1 100 € pour un T2 à Grenoble. Bon courage les étudiants.', 'Le foncier dans le Grésivaudan devient délirant.'],
    sante: ['6 mois pour un ophtalmo dans le Nord-Isère.', 'Les urgences de Voiron saturées encore ce week-end.'],
    institutions: ['Ils votent quoi au juste à l’Assemblée ?', 'Référendum, on vous demande juste ça.'],
    economie: ['Encore une usine qui ferme dans le Nord-Isère.', 'Les PME croulent sous les normes.']
  };
  if (typeof TB !== 'undefined') for (const t in TB.CITIZEN) CITIZEN_LINES[t] = Array.from(new Set((CITIZEN_LINES[t] || []).concat(TB.CITIZEN[t])));
  function genPosts(n) {
    const sal = S().national.salience; const themes = Object.keys(CITIZEN_LINES);
    for (let i = 0; i < n; i++) { const t = wpick(themes, th => 1 + (sal[th] || 0) * 3); post('Citoyen', pick(HANDLES), pick(CITIZEN_LINES[t])); }
    const tr = Object.entries(sal).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => '#' + D.THEMES[t].l.replace(/[^A-Za-zÀ-ÿ]/g, ''));
    S().trends = tr.length ? tr : ['#Isère', '#Présidentielle2027', '#PouvoirDAchat'];
  }

  /* ---------- profil, image, statements ---------- */
  function addImage(seg, d) { const p = S().p; const cur = p.image[seg] || 0; const k = (d > 0) === (cur > 0) ? Math.max(0.1, 1 - Math.abs(cur) / 90) : 1; p.image[seg] = clamp(cur + d * k, -100, 100); }
  function addStd(d) { const p = S().p; p.std = clamp(p.std + (d > 0 ? d * Math.max(0.05, 1 - p.std / 110) : d), 0, 100); }
  function addImageAll(d, weights) { D.SEG_IDS.forEach(s => addImage(s, d * (weights ? (weights[s] ?? 1) : 1))); }
  function addNoto(scope, d) {
    const p = S().p; const order = ['commune', 'circo', 'dept', 'nat']; const spill = { commune: [1, 0.35, 0.08, 0], circo: [0.6, 1, 0.3, 0.02], dept: [0.4, 0.6, 1, 0.08], nat: [0.5, 0.5, 0.6, 1] }[scope];
    order.forEach((k, i) => p.noto[k] = clamp(p.noto[k] + d * spill[i] * (1 - p.noto[k] / 110), 0, 100));
  }
  function alignment(vec, ideal) { let s = 0, n = 0; for (let i = 0; i < 6; i++) if (vec[i]) { s += vec[i] * ideal[i]; n += Math.abs(vec[i]) * 100; } return n ? s / n : 0; }
  // Enregistre une prise de position ; gère cohérence, ligne du parti, image par segment.
  function statement(text, theme, vecObj, strength, src) {
    const s = S(), p = s.p; const v = vecFrom(vecObj || {}); const str = strength ?? 1;
    const noto = (p.noto.circo + p.noto.dept) / 2;
    D.SEGS.forEach(seg => addImage(seg.id, 4 * str * alignment(v, seg.ideal) * (0.5 + noto / 100)));
    let volte = null;
    const prev = p.stmts.filter(x => x.theme === theme && x.v);
    for (const x of prev.slice(0, 6).filter(x => E.diffDays(x.date, s.date) < 1100)) {
      let dot = 0, na = 0, nb = 0; for (let i = 0; i < 6; i++) { dot += x.v[i] * v[i]; na += x.v[i] ** 2; nb += v[i] ** 2; }
      if (na && nb && dot / Math.sqrt(na * nb) < -0.5) { volte = x; break; }
    }
    p.stmts.unshift({ date: s.date, text: (text || '').slice(0, 280), theme, v, src: src || 'déclaration' });
    if (p.stmts.length > 120) p.stmts.length = 120;
    if (volte) {
      const pen = Math.min(6, 2 + noto / 15); p.cred = clamp(p.cred - pen, 0, 100);
      article(rnd() < 0.5 ? 'ventilo' : 'dauph', p.name + ' : la volte-face sur « ' + (D.THEMES[theme]?.l || theme) + ' » que ses adversaires ressortent', -0.6, 'pj', 'Le ' + fmtDate(volte.date) + ', ' + p.name + ' déclarait : « ' + volte.text.slice(0, 120) + ' ».');
      log('Volte-face relevée par la presse sur ' + (D.THEMES[theme]?.l || theme) + ' : crédibilité −' + Math.round(pen), 'bad');
    }
    if (p.party && p.party !== 'NEW') {
      const pa = D.PARTIES[p.party].ax; let gap = 0, n = 0; for (let i = 0; i < 6; i++) if (v[i]) { gap += Math.sign(v[i]) * Math.sign(pa[i]) * Math.min(1, Math.abs(pa[i]) / 40); n++; }
      if (n) p.std = clamp(p.std + (gap / n) * 1.5, 0, 100);
    }
    return volte;
  }

  /* ---------- notions dérivées ---------- */
  function popularity() { const p = S().p; const u = unit('c' + p.circo); let s = 0; D.SEGS.forEach((g, i) => s += (p.image[g.id] || 0) * u.mix[i]); return s; }
  function hasStaff(role) { return S().p.staff.find(x => x.role === role); }
  function eff() { const ph = phase().id; let e = 1; if (hasStaff('dircamp') && ph !== 'hors') e += 0.2; return e; }
  function rankUpdate() {
    const p = S().p; if (p.party === 'NEW') return;
    if (p.prole == null) p.prole = 0; if (p.secLeader) p.prole = Math.max(p.prole, 2); else if (p.std >= 25) p.prole = Math.max(p.prole, 1);
    const old = p.rank; p.rank = PROLE[p.prole];
    if (old !== p.rank) log('Nouveau rang au parti : ' + p.rank, 'good');
  }
  function mandatLabel(m) { return m.label; }
  function hasMandat(t) { return S().p.mandats.find(m => m.type === t); }
  // Mode village : tant qu'on n'a pas d'ambition ni de mandat au-delà d'une commune de moins de 3 500 habitants, ni partis ni médias nationaux
  function villageScope() { const s = S(); if (!s || !s.p) return false; const p = s.p; const c = commune(); if (!c || c.pop >= 3500) return false;
    if (p.mandats.some(m => !['maire', 'adjoint', 'conseiller_municipal', 'interco'].includes(m.type))) return false;
    if (p.cand) { const e = s.elections.find(x => x.id === p.cand.el); if (e && e.type !== 'mun') return false; } return true; }
  /* ---------- non-cumul des mandats (loi organique de 2014, en vigueur) ---------- */
  const NATM = ['depute', 'senateur', 'meuro'], EXECM = ['maire', 'adjoint'];
  function cumulConflict() {
    const p = S().p; const T = p.mandats.map(m => m.type); const lab = t => (p.mandats.find(m => m.type === t) || {}).label || t;
    const nat = T.filter(t => NATM.includes(t)); if (nat.length > 1) return { kind: 'nat', opts: nat, why: 'Un même élu ne peut être à la fois ' + nat.map(lab).join(' et ') + '.' };
    const ex = T.filter(t => EXECM.includes(t));
    if (nat.length && ex.length) return { kind: 'exec', opts: [ex[0], nat[0]], why: 'Un parlementaire ne peut pas exercer de fonction exécutive locale (maire, adjoint).' };
    const muni = T.some(t => ['maire', 'adjoint', 'conseiller_municipal'].includes(t)) && commune().pop >= 1000; const loc = (muni ? ['municipal'] : []).concat(T.filter(t => ['cd', 'cr'].includes(t)));
    const max = nat.length ? 1 : 2; if (loc.length > max) return { kind: 'local', opts: loc, why: nat.length ? 'Un parlementaire ne peut détenir qu’un seul mandat local.' : 'On ne peut détenir plus de deux mandats locaux.' };
    return null;
  }
  function cumulLabel(t) { const p = S().p; if (t === 'municipal') return 'Mandat municipal (' + commune().name + ')'; const m = p.mandats.find(x => x.type === t); return m ? m.label : t; }
  function cumulCheck() { const s = S(), p = s.p; const c = cumulConflict(); if (!c) { p.cumul = null; return null; } if (!p.cumul) { p.cumul = { since: s.date, due: addDays(s.date, 30) }; s.queue.push({ kind: 'cumul' }); log('Non-cumul des mandats : ' + c.why + ' Vous avez 30 jours pour choisir le mandat auquel vous renoncez.', 'event'); } return c; }
  function resolveCumul(t, auto) {
    const s = S(), p = s.p; const c = cumulConflict(); if (!c) { p.cumul = null; return ''; } let msg = '';
    if (t === 'municipal' || (c.kind === 'local' && ['maire', 'adjoint', 'conseiller_municipal'].includes(t))) { p.mandats = p.mandats.filter(m => !['maire', 'adjoint', 'conseiller_municipal', 'interco'].includes(m.type)); p.mairie = null; msg = 'Vous démissionnez du conseil municipal.'; }
    else if (EXECM.includes(t)) { const m = p.mandats.find(x => x.type === t); p.mandats = p.mandats.filter(x => x.type !== t); if (!p.mandats.some(x => x.type === 'conseiller_municipal')) p.mandats.push({ type: 'conseiller_municipal', label: 'Conseiller·ère municipal·e (' + commune().name + ')', since: s.date, ind: 0, majority: true }); if (t === 'maire') p.mairie = null; msg = 'Vous quittez votre fonction de ' + (m ? m.label : t) + ' et restez conseiller·ère municipal·e.'; }
    else { const m = p.mandats.find(x => x.type === t); p.mandats = p.mandats.filter(x => x.type !== t); msg = 'Vous renoncez à votre mandat de ' + (m ? m.label : t) + '.'; }
    log((auto ? 'Délai de 30 jours écoulé : ' : 'Non-cumul : ') + msg, 'info'); p.cumul = null; const nx = cumulCheck(); return msg + (nx ? ' Un autre cumul reste à régler.' : '');
  }
  function cumulDefault() { // à défaut de choix : la fonction exécutive locale prend fin ; sinon le mandat le plus ancien
    const p = S().p; const c = cumulConflict(); if (!c) return null; if (c.kind === 'exec') return c.opts[0];
    const since = t => t === 'municipal' ? ((p.mandats.find(m => ['maire', 'adjoint', 'conseiller_municipal'].includes(m.type)) || {}).since || '0') : ((p.mandats.find(m => m.type === t) || {}).since || '0');
    return c.opts.slice().sort((a, b) => since(a) < since(b) ? -1 : 1)[0];
  }
  function indemnities() { return S().p.mandats.reduce((a, m) => a + (m.ind || 0), 0); }

  /* ---------- campagne ---------- */
  function plafond(type, pop) {
    if (type === 'leg') return 38000 + 0.15 * pop;
    if (type === 'dep') return 15300 + 0.15 * pop;
    if (type === 'pres') return 16851000;
    if (pop < 9000) return null;
    return 1.22 * Math.min(pop, 15000) + 1.07 * Math.max(0, Math.min(pop, 30000) - 15000) + 0.91 * Math.max(0, pop - 30000);
  }
  function spend(amount, label) {
    const p = S().p; amount = Math.round(amount);
    if (p.cand && p.cand.compte && phase().id !== 'hors') {
      const c = p.cand.compte; const bal = c.recettes - c.depenses;
      if (bal < amount) { const need = amount - bal; if (p.cash < need) return false; p.cash -= need; c.recettes += need; c.apport += need; }
      c.depenses += amount; c.lignes.push([label, amount]); return true;
    }
    if (p.cash < amount) return false; p.cash -= amount; return true;
  }
  const LIST_SEATS = { reg: 26, euro: 81, sen: 5 };
  function listPos(type) { const p = S().p; if (p.party === 'NEW') return 1;
    if (type === 'euro') return clamp(Math.round(70 - p.natSup * 0.6 - p.prole * 6 - p.noto.nat / 4 - (p.chef ? 60 : 0)), 1, 81);
    if (type === 'reg') return clamp(Math.round(24 - p.fedSup / 4 - p.prole * 2.5 - p.noto.dept / 12 - (p.fedRole ? 12 : 0)), 1, 26);
    return clamp(Math.round(7 - p.fedSup / 18 - p.mandats.length - (p.fedRole ? 2 : 0)), 1, 5); }
  function declare(elId, mode, target, opt) {
    const s = S(), p = s.p; const el = s.elections.find(e => e.id === elId);
    if (p.inelig && p.inelig > s.date) return { ok: false, msg: 'Vous êtes inéligible jusqu’au ' + fmtDate(p.inelig) + '.' };
    if ((p.irrec || []).includes(elId)) return { ok: false, msg: 'Votre liste a été déclarée irrecevable pour cette élection.' };
    if (p.mandats.some(m => m.type === 'president') && el && el.type !== 'pres') return { ok: false, msg: 'Président·e de la République, vous ne pouvez être candidat·e à aucun autre mandat.' };
    if ((p.rallied || {})[elId] && mode !== 'colistier') return { ok: false, msg: 'Vous vous êtes rangé·e derrière le candidat du parti pour cette élection.' };
    if (LIST_T.includes(el.type)) {
      const pos = listPos(el.type); p.cand = { el: elId, key: electionUnit(el.type), mode: 'liste', invested: true, label: p.party === 'NEW' ? 'DIV' : p.party, listPos: pos, compte: null, debates: 0 };
      const m = p.party === 'NEW' ? 'Vous conduisez la liste de « ' + p.movement + ' ».' : 'Le parti vous place en position ' + pos + ' sur la liste ' + D.PARTIES[p.party].short + (el.type === 'reg' ? ' (section de l’Isère)' : '') + '.' + (pos === 1 ? ' Vous êtes tête de liste.' : '');
      log(el.label + ' : ' + m, 'good'); article('dauph', el.label + ' : ' + p.name + ' en position ' + pos + ' sur la liste ' + (p.party === 'NEW' ? p.movement : D.PARTIES[p.party].short), 0.1, 'pj');
      return { ok: true, msg: m + (pos > 1 && p.party !== 'NEW' ? ' Pour une meilleure place, il faut plus de poids dans le parti.' : '') };
    }
    if (el.type === 'pres' && p.presDesig === el.id) { p.cand = { el: elId, key: 'nat', mode: 'tete', invested: true, label: p.party, listPos: null, listOf: null, compte: { plafond: plafond('pres'), recettes: Math.round(plafond('pres') * 0.35 * D.PARTIES[p.party].wealth), depenses: 0, apport: 0, dons: 0, aide: Math.round(plafond('pres') * 0.35 * D.PARTIES[p.party].wealth), lignes: [] }, debates: 0 }; log('Candidature à la présidentielle déposée, portée par ' + D.PARTIES[p.party].short + '.', 'good'); article('quotlib', p.name + ' candidat·e à l’élection présidentielle', 0.3, 'pj'); addNoto('nat', 15); return { ok: true, msg: 'Votre parti dépose votre candidature, parrainages compris.' }; }
    const key = electionUnit(el.type); const u = unit(key);
    p.cand = { el: elId, key, mode: mode || 'tete', invested: false, label: null, listPos: null, listOf: null, compte: null, debates: 0 };
    let msg = '';
    if (mode === 'colistier') {
      const head = s.pnj[target]; let pos = clamp(Math.round(14 - p.std / 9 - p.noto.commune / 12 - (head.rel + 20) / 25), 2, 25);
      if (opt && opt.nego) { const seats = D.councilSize(commune().pop); pos = Math.min(pos, Math.max(2, Math.round(seats * 0.25))); }
      p.cand.listOf = head.id; p.cand.listPos = pos; p.cand.label = head.party; head.rel += 5;
      msg = 'Vous rejoignez la liste ' + deN(head.name) + ' (' + D.PARTIES[head.party].short + ') en position ' + pos + '.';
      log(msg, 'good'); article('dauph', commune().name + ' : ' + p.name + ' rejoint la liste ' + deN(head.name), 0.1, 'pj');
      return { ok: true, msg };
    }
    if (el.type === 'mun' && myPetite()) {
      p.cand.label = 'DIV'; p.cand.invested = true; p.cand.sansEtiquette = true;
      msg = 'Vous conduisez une liste sans étiquette à ' + commune().name + '. Dans une commune de cette taille, pas besoin d’investiture : il faut surtout des colistiers et la confiance des habitants.';
    } else if (p.party === 'NEW' || mode === 'dissident') {
      p.cand.label = 'DIV'; p.cand.invested = p.party === 'NEW';
      if (mode === 'dissident' && p.party !== 'NEW') { p.std = clamp(p.std - (s.mp && typeof MP !== 'undefined' && MP.on() && MP.rivals().length ? 12 : 40), 0, 100); log('Candidature dissidente : votre parti vous suspend.', 'bad'); article('dauph', p.name + ' part en dissidence contre son propre parti', -0.2, 'pj'); }
    } else {
      const inv = investiture(el); if (!inv.ok) { p.cand = null; return inv; }
      p.cand.invested = true; p.cand.label = p.party; msg = inv.msg;
    }
    const pl = plafond(el.type, u.pop);
    p.cand.compte = { plafond: pl, recettes: 0, depenses: 0, apport: 0, dons: 0, aide: 0, lignes: [] };
    if (p.cand.invested && p.party !== 'NEW' && !p.cand.sansEtiquette) { const aide = Math.round((pl || 6000) * 0.22 * D.PARTIES[p.party].wealth * (1 + (p.prole || 0) * 0.12)); p.cand.compte.aide = aide; p.cand.compte.recettes += aide; msg += ' Le parti verse ' + eur(aide) + ' à votre compte de campagne.'; }
    log('Candidature déclarée : ' + el.label + ' (' + u.name + ').', 'good');
    article('dauph', p.name + ' officialise sa candidature : ' + el.label + ', ' + u.name, 0.2, 'pj');
    addNoto(el.type === 'mun' ? 'commune' : el.type === 'pres' ? 'nat' : 'circo', 6);
    if (el.type === 'mun' && typeof HQ !== 'undefined') { try { HQ.initListe(); } catch (e) { } }
    return { ok: true, msg: msg || 'Candidature déclarée.' };
  }
  function investiture(el) {
    const s = S(), p = s.p;
    if ((p.invLost || {})[el.id]) return { ok: false, refused: true, msg: 'La commission d’investiture a choisi ' + p.invLost[el.id] + '.' };
    if (s.mp && typeof MP !== 'undefined' && MP.on() && MP.rivals().length) { log('Investiture obtenue : le parti mise sur vous.', 'good'); return { ok: true, msg: 'Le parti vous investit : c’est vous qui porterez ses couleurs ici.' }; }
    if ((p.preInv || {})[el.id]) { log('Investiture confirmée par la commission.', 'good'); return { ok: true, msg: 'La commission d’investiture confirme votre candidature, comme convenu avec la fédération.' }; } const key = electionUnit(el.type); const terr = el.type === 'mun' ? p.communeId : el.type === 'pres' ? 'nat' : 'c' + p.circo;
    if (el.type === 'leg' && s.national.unionGauche && ['LFI', 'PCF', 'ECO', 'PS'].includes(p.party)) {
      const res = unionParty(['LFI', 'PCF', 'ECO', 'PS'], 'c' + p.circo); if (res !== p.party) { const clout = (p.noto.circo || 0) / 60 + (p.mandats.some(m => ['maire', 'cd', 'depute'].includes(m.type)) ? 0.35 : 0) + (p.prole || 0) * 0.08; if (!(rnd() < clout * 0.6)) { p.invLost = p.invLost || {}; p.invLost[el.id] = 'de réserver la circonscription au partenaire ' + D.PARTIES[res].short; return { ok: false, refused: true, final: true, msg: 'Accord national : la circonscription est réservée au partenaire ' + D.PARTIES[res].short + ' dans l’union de la gauche. Cette décision est définitive pour cette élection.' }; } log('Votre poids local convainc l’union de la gauche de vous laisser la circonscription.', 'good'); }
    }
    const b = invBase(el); const rival = b.rival;
    const sc = b.me + rnd() * 15, rs = b.riv + rnd() * 15;
    rival.known = true;
    if (sc >= rs) { log('Investiture obtenue face à ' + rival.name + '.', 'good'); rival.rel -= 15; return { ok: true, msg: 'La commission d’investiture vous choisit face à ' + rival.name + '.' }; }
    p.invLost = p.invLost || {}; p.invLost[el.id] = rival.name; p.invWin = p.invWin || {}; p.invWin[el.id] = rival.id;
    if (el.type === 'mun') { rival.role = 'candidat'; rival.territory = p.communeId; } else if (el.type === 'leg' || el.type === 'dep') { if (!['depute'].includes(rival.role)) rival.role = 'candidat'; rival.territory = el.type === 'leg' ? 'c' + p.circo : 'can' + p.communeId; }
    return { ok: false, refused: true, final: true, rival: rival.id, msg: 'La commission d’investiture préfère ' + rival.name + ' (' + Math.round(rs) + ' contre ' + Math.round(sc) + ' points). Sa décision est définitive pour cette élection.' };
  }
  // Investiture : le calcul, lisible (score de base sans le hasard, puis probabilité)
  function invBase(el) {
    const s = S(), p = s.p; const terr = el.type === 'mun' ? p.communeId : el.type === 'pres' ? 'nat' : 'c' + p.circo;
    let rival = findPnj(x => x.party === p.party && x.territory === terr && ['depute', 'maire'].includes(x.role));
    if (el.type === 'pres') rival = s.pnj[s.national.leaders[p.party]];
    if (!rival) rival = cadre(p.party, terr, 'cadre');
    if ((el.type === 'leg' || el.type === 'dep') && !['depute', 'maire'].includes(rival.role)) { // circonscription gagnable : un·e notable la convoite
      const u = unit(el.type === 'leg' ? 'c' + p.circo : 'can:' + p.communeId); const blocP = PIDS.filter(k => (D.PARTIES[k] || {}).bloc === (D.PARTIES[p.party] || {}).bloc); const share = blocP.reduce((t, k) => t + (u.base[k] || 0), 0);
      const wv = clamp((share - 15) / 20, 0, 1); if (!rival.notable && wv > 0.2) { rival.notable = true; rival.std = Math.max(rival.std, Math.round(45 + 35 * wv)); rival.noto = Math.max(rival.noto, Math.round(25 + 35 * wv)); if (!rival.mandat && wv > 0.5) rival.mandat = rnd() < 0.5 ? 'Conseiller·ère départemental·e' : 'Conseiller·ère régional·e'; } }
    const fed = s.pnj[p.fedId]; const scope = el.type === 'mun' ? 'commune' : el.type === 'pres' ? 'nat' : 'circo';
    const parts = { poids: p.std * 0.55, noto: (p.noto[scope] || 0) * 0.35, fed: ((fed ? fed.rel : 0) + 100) / 10, role: (p.prole || 0) * 5 + (p.fedRole && el.type !== 'pres' ? 30 : 0) + (p.chef ? 80 : 0) };
    const me = parts.poids + parts.noto + parts.fed + parts.role; const riv = rival.std * 0.55 + rival.noto * 0.35 + 10 + (rival.mandat ? 18 : 0);
    return { me, riv, rival, parts, scope };
  }
  function invOdds(el) {
    const p = S().p; if (!el || p.party === 'NEW' || ['euro', 'reg', 'sen'].includes(el.type) || (el.type === 'mun' && myPetite())) return null;
    if ((p.preInv || {})[el.id]) return { pct: 100, pre: true, rival: null, need: 0 };
    if (el.type === 'leg' && S().national.unionGauche && ['LFI', 'PCF', 'ECO', 'PS'].includes(p.party)) { const res = unionParty(['LFI', 'PCF', 'ECO', 'PS'], 'c' + p.circo); if (res !== p.party) return { pct: 0, union: res, rival: null, need: 0 }; }
    const b = invBase(el); const d = b.me - b.riv; const pr = d >= 15 ? 1 : d <= -15 ? 0 : d >= 0 ? 1 - (15 - d) ** 2 / 450 : (15 + d) ** 2 / 450;
    return { pct: Math.round(pr * 100), rival: b.rival, need: Math.max(0, Math.ceil(b.riv - b.me + 4)), parts: b.parts, scope: b.scope };
  }
  function unionParty(parties, key) { const sort = findPnj(x => x.role === 'depute' && x.territory === key && parties.includes(x.party)); if (sort) return sort.party; const u = unit(key); const W = { LFI: 1, PS: 1.3, ECO: 1.35, PCF: 1.05 }; const sc = k => (u.base[k] || 0) * (W[k] || 1) * (0.7 + 0.6 * idHash(key + k)); return parties.slice().sort((a, b) => sc(b) - sc(a))[0]; }
  function withdrawCand() { const p = S().p; if (!p.cand) return; log('Vous retirez votre candidature.', 'bad'); p.cand = null; p.camp = { terrain: 0, medias: 0, num: 0, meet: 0 }; }

  /* ---------- candidats d’une élection ---------- */
  function idHash(id) { let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 1000) / 1000; }
  function rivalCamp(pn) {
    const s = S(); const w = D.PARTIES[pn.party] ? D.PARTIES[pn.party].wealth : 0.3; const dl = daysLeft(); const prog = clamp(1 - dl / 120, 0, 1);
    const inc = ['maire', 'depute', 'leader'].includes(pn.role) ? 0.08 : 0; const es = s.est; const pjAhead = es && es.rows && es.rows.findIndex(r => r.pj) >= 0 && es.rows.findIndex(r => r.pj) < es.rows.findIndex(r => r.id === pn.id) ? 0.08 * prog : 0;
    return (0.12 + 0.15 * w + idHash(pn.id) * 0.08 + prog * (0.22 + 0.22 * w) + inc + pjAhead) * DF().rival;
  }
  const pjOr = (c, extra) => S().p.cand && S().elections.some(e => e.id === S().p.cand.el) ? Object.assign(pjCand(), { bucket: c.bucket }, extra || {}) : Object.assign({}, c, { id: 'PJ', pj: true }, extra || {});
  function pjCand() {
    const p = S().p; const el = S().elections.find(e => e.id === p.cand.el);
    const scope = el.type === 'mun' ? 'commune' : el.type === 'pres' || el.type === 'euro' ? 'nat' : el.type === 'dep' ? 'commune' : el.type === 'reg' || el.type === 'sen' ? 'dept' : 'circo';
    const noto = el.type === 'dep' ? (p.noto.commune * 0.5 + p.noto.circo * 0.5) : p.noto[scope];
    const lab = p.cand.label; const pet = el.type === 'mun' && petiteKey(p.cand.key); const bucket = pet ? PIDS.slice() : lab === 'DIV' ? ['DIV'] : [lab]; const sansEt = pet;
    const c = p.camp; const camp = DF().camp * (0.06 * Math.log(1 + c.terrain / 25) + 0.06 * Math.log(1 + c.medias / 15) + 0.05 * Math.log(1 + c.num / 15) + 0.09 * Math.log(1 + c.meet / 2) + Math.min(0.15, p.militants / 500) + Math.min(0.05, (c.mobil || 0) / 900));
    const lvl = ['mun', 'dep', 'reg', 'sen'].includes(el.type) ? 'local' : 'national'; const prog = progEffect(lvl);
    return { diff: (DIFF[S().diff || 'normal'] || DIFF.normal).bonus, bilan: typeof GV !== 'undefined' ? GV.bilanTerm(el.type) : 0, field: fieldEffect(p.cand.key), climK: 1 - 0.6 * (p.distance || 0), prog, sansEt, id: 'PJ', pj: true, name: p.name, party: lab, label: pet ? 'Liste ' + p.name.split(' ').slice(-1)[0] : lab === 'DIV' ? (p.movement || 'Divers') : D.PARTIES[lab].short, color: lab === 'DIV' ? '#8d939c' : D.PARTIES[lab].color, bucket, ax: p.ax, noto, image: p.image, cred: p.cred, camp, mom: p.mom };
  }
  function progEffect(lvl) {
    const o = {}; (S().p.prog || []).forEach(m => { if (m.status === 'retiree') return; const w = (m.phare ? 1 : 0.4) * (m.visib || 0) / 100 * (m.level === lvl ? 1 : 0.35) * (0.6 + (m.cred || 50) / 125) * (typeof HQ !== 'undefined' ? HQ.progK(m.level) : 1); if (m.segw) { for (const g in m.segw) o[g] = (o[g] || 0) + 0.035 * m.segw[g] * w; return; } (m.gagnants || []).forEach(g => o[g] = (o[g] || 0) + 0.1 * w); (m.perdants || []).forEach(g => o[g] = (o[g] || 0) - 0.06 * w); });
    for (const k in o) o[k] = clamp(o[k], -0.3, 0.4); return o;
  }
  function pnjCand(pn, bucket, extraNoto) {
    return { id: pn.id, name: pn.name, party: pn.party, bucket: bucket || [pn.party], ax: pn.ax, noto: clamp(pn.noto + (extraNoto || 0), 0, 100), img: pn.img, cred: 50, camp: rivalCamp(pn), mom: pn.mom || 0 };
  }
  function buildCands(el, key) {
    const s = S(), p = s.p; const terr = key === 'nat' ? 'nat' : key.startsWith('mun:') ? key.slice(4) : key.startsWith('can:') ? 'can' + key.slice(4) : key;
    const pjHere = p.cand && p.cand.el === el.id && p.cand.key === key && p.cand.mode !== 'colistier';
    const cands = []; const used = new Set();
    const forced = {}; // tête de liste imposée par parti : investi·e par la commission, ou liste rejointe par le joueur
    if (el.type !== 'pres' && p.party && p.party !== 'NEW' && (p.invWin || {})[el.id] && s.pnj[p.invWin[el.id]] && electionUnit(el.type) === key) forced[p.party] = p.invWin[el.id];
    if (p.cand && p.cand.mode === 'colistier' && p.cand.el === el.id && p.cand.key === key && s.pnj[p.cand.listOf]) forced[s.pnj[p.cand.listOf].party] = p.cand.listOf;
    const slot = (party, bucket, role) => {
      if (pjHere && p.cand.label !== 'DIV' && bucket.includes(p.cand.label)) { if (!used.has('PJ')) { const c = pjCand(); c.bucket = bucket; cands.push(c); used.add('PJ'); } return; }
      let pn = forced[party] && !used.has(forced[party]) ? s.pnj[forced[party]] : null;
      if (!pn) pn = findPnj(x => x.party === party && x.territory === terr && ['depute', 'maire', 'leader', 'candidat'].includes(x.role) && !used.has(x.id));
      if (el.type === 'pres') pn = s.pnj[s.national.leaders[party]];
      if (!pn) pn = mkPnj({ party, territory: terr, role: 'candidat', noto: el.type === 'pres' ? 70 : rint(18, 40) });
      if (p.cand && p.cand.mode === 'colistier' && p.cand.listOf === pn.id) pn._pjList = true;
      used.add(pn.id); cands.push(pnjCand(pn, bucket, el.type === 'pres' ? 0 : 0));
    };
    const ug = s.national.unionGauche, uc = s.national.unionCentre;
    if (el.type === 'pres') {
      ['LFI', 'PCF', 'ECO', 'PS'].forEach(x => slot(x, [x])); slot('HOR', uc ? ['HOR', 'REN', 'MODEM'] : ['HOR']); if (!uc) slot('REN', ['REN', 'MODEM']);
      slot('LR', ['LR']); slot('RN', ['RN', 'UDR']); slot('REC', ['REC']);
    } else if (LIST_T.includes(el.type)) {
      const pjList = p.cand && p.cand.el === el.id && p.cand.mode === 'liste';
      const lists = el.type === 'sen' ? [['PS', ['PS', 'PCF', 'ECO']], ['LFI', ['LFI']], ['REN', ['REN', 'MODEM', 'HOR']], ['LR', ['LR']], ['RN', ['RN', 'UDR']], ['DIV', ['DIV']]] : [['LFI', ['LFI']], ['PCF', ['PCF']], ['ECO', ['ECO']], ['PS', ['PS']], ['REN', uc ? ['REN', 'MODEM', 'HOR'] : ['REN', 'MODEM']], ['LR', ['LR']], ['RN', ['RN', 'UDR']], ['REC', ['REC']]];
      lists.forEach(([party, bucket]) => {
        if (pjList && p.party !== 'NEW' && bucket.includes(p.party) && p.cand.listPos === 1) { const c = pjCand(); c.bucket = bucket; c.party = party; cands.push(c); used.add('PJ'); return; }
        let pn = el.type === 'euro' ? s.pnj[s.national.leaders[party]] && findPnj(x => x.party === party && x.role === 'teteliste' && x.territory === terr) : findPnj(x => x.party === party && x.role === 'teteliste' && x.territory === terr);
        if (!pn) pn = mkPnj({ party, territory: terr, role: 'teteliste', noto: el.type === 'euro' ? rint(40, 70) : rint(25, 50), mandat: 'Tête de liste ' + D.PARTIES[party].short + ' (' + TYPE_LABEL[el.type].toLowerCase() + ')' });
        const c = pnjCand(pn, bucket); if (pjList && bucket.includes(p.party)) { c.pjList = true; c.camp += Math.min(0.15, p.noto[el.type === 'euro' ? 'nat' : 'dept'] / 400); } cands.push(c); used.add(pn.id);
      });
      if (pjList && p.party === 'NEW') cands.push(pjCand());
      return cands;
    } else if (el.type === 'leg' || el.type === 'dep') {
      if (ug) { const lp = unionParty(['LFI', 'PCF', 'ECO', 'PS'], /^c\d+$/.test(key) ? key : 'c' + p.circo); slot(lp, ['LFI', 'PCF', 'ECO', 'PS']); } else { slot('LFI', ['LFI', 'PCF']); slot('PS', ['PS']); slot('ECO', ['ECO']); }
      if (uc) { const cp = unionParty(['REN', 'MODEM', 'HOR'], /^c\d+$/.test(key) ? key : 'c' + p.circo); slot(cp, ['REN', 'MODEM', 'HOR']); } else { slot('REN', ['REN', 'MODEM']); slot('HOR', ['HOR']); }
      slot('LR', ['LR']); slot('RN', ['RN', 'UDR']); if (hfrac(el.id + key + 'REC') < 0.7) slot('REC', ['REC']); if (el.type === 'dep' || hfrac(el.id + key + 'DIV') < 0.5) slot('DIV', ['DIV']);
    } else if (petiteKey(key)) { // petite commune : listes sans étiquette
      const com = munKey(key); const all = PIDS.slice(); const cid = key.slice(4);
      const m0 = mayorOf(cid) || mkPnj({ party: 'DIV', role: 'maire', territory: cid, mandat: 'Maire ' + deN(com.name), noto: 50 });
      let maire = m0; if (sortantPart(el, key)) { maire = findPnj(x => x.territory === cid && x.role === 'candidat' && x.heir) || mkPnj({ party: m0.party, ax: m0.ax, territory: cid, role: 'candidat', heir: true, mandat: 'Premier·e adjoint·e ' + deN(com.name), noto: clamp(m0.noto - 14, 25, 60) }); }
      const tag = c => { c.sansEt = true; c.party = 'DIV'; c.label = 'Liste ' + c.name.split(' ').slice(-1)[0]; c.color = '#c9c2b0'; return c; };
      if (!(p.cand && p.cand.mode === 'colistier' && p.cand.listOf === maire.id && pjHere)) { if (p.cand && p.cand.mode === 'colistier' && p.cand.listOf === maire.id) maire._pjList = true; used.add(maire.id); cands.push(tag(pnjCand(maire, all))); }
      const n2 = com.pop < 1000 ? (hfrac(el.id + key + 'L2') < 0.2 ? 1 : 0) : (hfrac(el.id + key + 'L2') < 0.6 ? 1 : 0);
      for (let i = 0; i < n2; i++) { let pn = findPnj(x => x.territory === cid && x.role === 'candidat' && !used.has(x.id)); if (!pn) pn = mkPnj({ party: wpick(PIDS, q => unit(key).base[q]), territory: cid, role: 'candidat', noto: rint(22, 42) }); if (p.cand && p.cand.mode === 'colistier' && p.cand.listOf === pn.id) pn._pjList = true; used.add(pn.id); cands.push(tag(pnjCand(pn, all))); }
      if (pjHere) { cands.push(pjCand()); used.add('PJ'); }
      if (typeof MP !== 'undefined' && MP.inject) MP.inject(el, key, cands);
      return cands;
    } else { // municipales
      const u = unit(key); const sorted = PIDS.slice().sort((a, b) => u.base[b] - u.base[a]);
      const maire = mayorOf(key.slice(4)); const lists = new Set(); if (maire) lists.add(maire.party);
      sorted.slice(0, 5).forEach(x => lists.add(x));
      const blocsDone = {}; const final = [];
      [...lists].forEach(x => { const b = D.PARTIES[x].bloc; if (blocsDone[b] && x !== (maire && maire.party)) return; blocsDone[b] = true; final.push(x); });
      let lst = final.slice(0, 5); const unionOf = {};
      const must = []; if (key === 'mun:' + p.communeId && p.party && p.party !== 'NEW' && D.PARTIES[p.party] && !(pjHere)) must.push(p.party);
      Object.keys(forced).forEach(x => { if (!must.includes(x)) must.push(x); });
      must.forEach(x => { if (lst.includes(x) || !D.PARTIES[x]) return; const b = D.PARTIES[x].bloc; const host = lst.find(y => D.PARTIES[y].bloc === b);
        if (host && !forced[x] && ['G', 'GE', 'C'].includes(b) && (ug || hfrac(el.id + key + 'union' + x) < 0.5)) unionOf[host] = (unionOf[host] || []).concat([x]); // liste d'union derrière le partenaire
        else lst.push(x); });
      lst.forEach(x => { const b = D.PARTIES[x].bloc; const buck = b === 'G' || b === 'GE' ? (ug ? ['LFI', 'PCF', 'ECO', 'PS'].filter(y => y === x || hfrac(el.id + key + x + y) < 0.5) : [x]) : b === 'C' ? ['REN', 'MODEM', 'HOR'] : b === 'ED' ? ['RN', 'UDR'] : [x]; if (!buck.includes(x)) buck.push(x); (unionOf[x] || []).forEach(y => { if (!buck.includes(y)) buck.push(y); }); slot(x, buck); if (unionOf[x]) { const c = cands[cands.length - 1]; if (c && c.id !== 'PJ') c.union = [x].concat(unionOf[x]); } });
    }
    if (pjHere && !used.has('PJ')) cands.push(pjCand());
    if (typeof MP !== 'undefined' && MP.inject) MP.inject(el, key, cands);
    return cands;
  }

  /* ---------- tenue des élections ---------- */
  // ---- multijoueur : résultats partagés ----
  function peekDue() { const s = S(); const days = turnDays(); const nd = days === 0.5 ? (s.half ? addDays(s.date, 1) : s.date) : addDays(s.date, days); return s.elections.filter(e => e.status !== 'fini' && nextDate(e) <= nd).map(el => ({ el, round: el.status === 't1' ? 2 : 1 })); }
  function computeShared(el, key, round, myUid) {
    const s = S(); let cands;
    if (round === 1) cands = buildCands(el, key);
    else { const r1 = el.races[key]; const wd = typeof MP !== 'undefined' ? MP.withdrawn(el.id, key) : new Set(); cands = r1.t2.filter(id => !wd.has(id)).map(id => r1.cands.find(c => c.id === id)).filter(Boolean).map(c => c.pj ? pjOr(c, { mom: (c.mom || 0) + (typeof MP !== 'undefined' ? MP.endorseBonus(MP.uid()) : 0) }) : (c.human && typeof MP !== 'undefined' ? MP.freshCand(c) : c)); }
    if (el.turnK == null) el.turnK = 1; const r = vote(key, cands, el.type, round === 1 ? 0.12 : 0.06, round, el.turnK); const me = 'H_' + myUid; const nid = id => id === 'PJ' ? me : id;
    const out = JSON.parse(JSON.stringify({ inscrits: r.inscrits, votants: r.votants, exprimes: r.exprimes, participation: r.participation, rows: r.rows, cands }));
    out.rows.forEach(x => { x.id = nid(x.id); x.pj = false; }); out.cands.forEach(c => { if (c.id === 'PJ') c.human = true; c.id = nid(c.id); c.pj = false; if (c.pjList || c._pjList) { c.pjListOf = myUid; c.pjListK = c._pjList ? '_pjList' : 'pjList'; delete c.pjList; delete c._pjList; } });
    out.by = myUid; out.at = Date.now(); return out;
  }
  function localize(sh, key, el) {
    const s = S(); const me = 'H_' + (typeof MP !== 'undefined' ? MP.uid() : ''); const o = JSON.parse(JSON.stringify(sh)); const remap = {};
    const terr = key === 'nat' ? 'nat' : key.startsWith('mun:') ? key.slice(4) : key.startsWith('can:') ? 'can' + key.slice(4) : key;
    o.cands.forEach(c => {
      if (c.id === me || c.human) return;
      const loc = s.pnj[c.id];
      if (!loc || loc.name !== c.name) { const pn = loc ? mkPnj({ name: c.name, party: c.party, territory: terr, role: 'candidat', noto: c.noto || 30 }) : mkPnj({ id: c.id, name: c.name, party: c.party, territory: terr, role: 'candidat', noto: c.noto || 30 }); if (pn.id !== c.id) remap[c.id] = pn.id; }
    });
    o.cands.forEach(c => { if (remap[c.id]) c.id = remap[c.id]; });
    o.rows.forEach(x => { if (remap[x.id]) x.id = remap[x.id]; if (x.id === me) { x.id = 'PJ'; x.pj = true; } });
    const myU = me.slice(2); o.cands.forEach(c => { if (c.pjListOf != null) { if (c.pjListOf === myU) c[c.pjListK || 'pjList'] = true; delete c.pjListOf; delete c.pjListK; } });
    const pc = s.p.cand; if (el && LIST_T.includes(el.type) && pc && pc.el === el.id && pc.mode === 'liste' && !o.cands.some(c => c.id === me || c.pjList)) { const mine = o.cands.find(c => !c.human && c.bucket && c.bucket.includes(s.p.party)) || o.cands.find(c => !c.human && c.party === s.p.party); if (mine) mine.pjList = true; }
    const noCand = !(s.p.cand && el && s.p.cand.el === el.id); if (noCand) o.rows.forEach(x => { if (x.id === 'PJ') { x.id = me; x.pj = false; } }); const cands = o.cands.map(c => c.id === me ? (noCand ? c : pjOr(c)) : c);
    const r = { inscrits: o.inscrits, votants: o.votants, exprimes: o.exprimes, participation: o.participation, rows: o.rows, shared: true };
    return { r, cands };
  }
  function runElectionRound(el) {
    const s = S(), p = s.p; const round = el.status === 't1' ? 2 : 1; const out = { el: el.id, label: el.label, round, races: [] };
    let keys = [];
    if (el.type === 'pres') keys = ['nat'];
    else if (el.type === 'leg') keys = D.CIRCOS.map(c => 'c' + c.id);
    else if (el.type === 'dep') keys = ['can:' + p.communeId];
    else if (el.type === 'reg') keys = ['dep38'];
    else if (el.type === 'euro') keys = ['nat'];
    else if (el.type === 'sen') keys = ['sen38'];
    else { keys = D.COMMUNES.map(c => 'mun:' + c.id); if (commune() && !D.COMMUNES.includes(commune())) keys.push('mun:' + p.communeId); }
    if (round === 1) el.races = {};
    keys.forEach(key => {
      let r;
      const sh = typeof MP !== 'undefined' && MP.shared ? MP.shared(el.id, round, key) : null;
      if (round === 1) {
        let cands; if (sh) { const L = localize(sh, key, el); r = L.r; cands = L.cands; } else { cands = buildCands(el, key); if (el.turnK == null) el.turnK = clamp(1 + gauss() * 0.06 + (el.type === 'pres' ? 0 : (S().national.mobil || 0) * 0.5), 0.85, 1.15); r = vote(key, cands, el.type, 0.12, 1, el.turnK); }
        r.cands = cands; el.races[key] = r;
        decideRace(el, key, r, 1);
      } else {
        const r1 = el.races[key]; if (r1.done) return;
        if (sh) { const L = localize(sh, key, el); r = L.r; r.cands = L.cands; }
        else { const cands = r1.t2.map(id => r1.cands.find(c => c.id === id)).filter(Boolean).map(c => c.pj ? pjOr(c) : c); r = vote(key, cands, el.type, 0.06, 2, el.turnK); r.cands = cands; }
        r1.r2 = r; decideRace(el, key, r, 2);
      }
      out.races.push({ key, r: round === 1 ? el.races[key] : el.races[key].r2, name: unit(key).name });
    });
    if (round === 1) { el.status = Object.values(el.races).every(r => r.done) ? 'fini' : 't1'; }
    else el.status = 'fini';
    if (el.status === 'fini') finishElection(el);
    if (LIST_T.includes(el.type) && p.cand && p.cand.el === el.id) out.races.forEach(x => x.r.rows.forEach(row => { const c = x.r.cands.find(cc => cc.id === row.id); if (c && c.pjList) row.pj = true; }));
    s.results.unshift({ el: el.id, label: el.label, round, date: s.date, pjKey: p.cand && p.cand.el === el.id ? p.cand.key : electionUnit(el.type), snapshot: out.races.filter(x => x.key === (p.cand && p.cand.el === el.id ? p.cand.key : electionUnit(el.type))).map(x => ({ key: x.key, name: x.name, rows: x.r.rows, participation: x.r.participation, winner: x.r.winner, seats: x.r.seats, t2: x.r.t2 })) });
    if (s.results.length > 30) s.results.length = 30;
    if (s.results[0].snapshot.length) s.queue.push({ kind: 'results', el: el.id, round });
    return out;
  }
  function dhondt(rows, n, thr, prime, winId) {
    const elig = rows.filter(x => x.pct >= thr); const seats = {}; elig.forEach(x => seats[x.id] = 0); let rest = n;
    if (prime) { seats[winId] = (seats[winId] || 0) + prime; rest -= prime; }
    const q = {}; elig.forEach(x => q[x.id] = 0);
    for (let i = 0; i < rest; i++) { let best = null, bv = -1; elig.forEach(x => { const v = x.votes / (q[x.id] + 1); if (v > bv) { bv = v; best = x.id; } }); if (best) q[best]++; }
    for (const id in q) seats[id] = (seats[id] || 0) + q[id]; return seats;
  }
  // Entre-deux-tours : deux listes qualifiées du même bloc fusionnent le plus souvent (la plus faible rejoint la plus forte)
  function mergeT2(r, q) {
    const c = id => r.cands.find(x => x.id === id); const pct = id => (r.rows.find(x => x.id === id) || {}).pct || 0; const out = q.slice();
    ['G', 'GE', 'C', 'D', 'ED'].forEach(b => { const L = out.filter(id => { const x = c(id); return x && !x.pj && !x.pjList && !x.human && !x._pjList && (D.PARTIES[x.party] || {}).bloc === b; }).sort((a, z) => pct(z) - pct(a)); for (let i = 1; i < L.length; i++) { if (rnd() < ({ G: 0.8, GE: 0.8, C: 0.7, D: 0.5, ED: 0.6 })[b]) { const host = c(L[0]), g = c(L[i]); host.bucket = [...new Set(host.bucket.concat(g.bucket))]; out.splice(out.indexOf(L[i]), 1); } } });
    // gauche et écologistes se rassemblent aussi entre blocs voisins
    const left = out.filter(id => { const x = c(id); return x && !x.pj && !x.pjList && !x.human && ['G', 'GE'].includes((D.PARTIES[x.party] || {}).bloc); }).sort((a, z) => pct(z) - pct(a));
    if (left.length > 1 && rnd() < 0.75) { const host = c(left[0]); left.slice(1).forEach(id => { host.bucket = [...new Set(host.bucket.concat(c(id).bucket))]; out.splice(out.indexOf(id), 1); }); }
    return out.length >= 2 ? out : q.slice(0, 2);
  }
  function decideRace(el, key, r, round) {
    const s = S(), p = s.p; const rows = r.rows; const top = rows[0];
    if (el.type === 'reg' && round === 1 && top.pct <= 50) { // régionales : 2nd tour pour les listes à 10 %, fusions dès 5 %
      let q = rows.filter(x => x.pct >= 10).map(x => x.id); if (q.length < 2) q = rows.slice(0, 2).map(x => x.id);
      rows.filter(x => x.pct >= 5 && x.pct < 10).forEach(x => { const c = r.cands.find(cc => cc.id === x.id); if (!c || c.pjList || c.pj) return; const host = q.map(id => r.cands.find(cc => cc.id === id)).filter(h => h && !h.pj && (D.PARTIES[h.party] || {}).bloc === (D.PARTIES[c.party] || {}).bloc)[0]; if (host) host.bucket = [...new Set(host.bucket.concat(c.bucket))]; });
      q = mergeT2(r, q); r.t2 = q; r.done = false; return; }
    if (LIST_T.includes(el.type)) { r.done = true; r.winner = top.id; r.seats = el.type === 'reg' ? dhondt(rows, 26, 5, Math.round(26 / 4), top.id) : el.type === 'euro' ? dhondt(rows, 81, 5, 0) : dhondt(rows, 5, 0, 0); return; }
    if (el.type === 'mun') {
      const com = D.com(key.slice(4)); const n = D.councilSize(com.pop);
      if (round === 1 && top.pct > 50) { r.done = true; r.winner = top.id; r.seats = seatsMun(rows, n, top.id); }
      else if (round === 1) {
        let q = rows.filter(x => x.pct >= 10).map(x => x.id); if (q.length < 2) q = rows.slice(0, 2).map(x => x.id);
        // fusions des listes entre 5 et 10 %
        rows.filter(x => x.pct >= 5 && x.pct < 10 && !x.pj).forEach(x => { const c = r.cands.find(cc => cc.id === x.id); const host = q.map(id => r.cands.find(cc => cc.id === id)).filter(h => !h.pj && D.PARTIES[h.party].bloc === D.PARTIES[c.party].bloc)[0] || q.map(id => r.cands.find(cc => cc.id === id)).filter(h => !h.pj && Math.abs(D.PARTIES[h.party].ax[0] - D.PARTIES[c.party].ax[0]) < 50)[0]; if (host && rnd() < 0.7) host.bucket = [...new Set(host.bucket.concat(c.bucket))]; });
        q = mergeT2(r, q); r.t2 = q; r.done = false;
      } else { r.done = true; r.winner = top.id; r.seats = seatsMun(rows, n, top.id); el.races[key].winner = top.id; el.races[key].seats = r.seats; el.races[key].done = true; }
      return;
    }
    const absMaj = top.pct > 50 && top.votes >= r.inscrits * 0.25;
    if (round === 1 && el.type !== 'pres' && absMaj) { r.done = true; r.winner = top.id; return; }
    if (round === 1 && el.type === 'pres' && top.pct > 50) { r.done = true; r.winner = top.id; return; }
    if (round === 2) { r.done = true; r.winner = top.id; el.races[key].winner = top.id; el.races[key].done = true; return; }
    let q = el.type === 'pres' ? rows.slice(0, 2).map(x => x.id) : rows.filter(x => x.votes >= r.inscrits * 0.125).map(x => x.id);
    if (q.length < 2) q = rows.slice(0, 2).map(x => x.id);
    // désistements (front républicain, accords)
    if (q.length > 2) {
      const blocOf = id => D.PARTIES[r.cands.find(c => c.id === id).party]?.bloc || 'DIV';
      const top2 = q.slice(0, 2); const edTop = top2.some(id => blocOf(id) === 'ED');
      q = q.filter((id, i) => {
        if (i < 2) return true; if (id === 'PJ') return true; // le joueur décide lui-même
        const pn = s.pnj[id]; const acc = p.accords.find(a => a.with === id && a.status === 'actif' && a.clauses.includes('desistement'));
        if (acc && top2.includes('PJ')) { if (rnd() * 100 < pn.traits.loyaute + 20) { log(pn.name + ' respecte l’accord et se désiste en votre faveur.', 'good'); return false; } breachBy(pn, acc); return true; }
        const pr = edTop && blocOf(id) !== 'ED' ? 0.75 : blocOf(id) === 'ED' && edTop ? 0.25 : 0.35;
        return rnd() > pr;
      });
    }
    r.t2 = q; r.done = false;
    if (q.includes('PJ') && q.length > 2) s.queue.push({ kind: 't2choice', el: el.id, key });
    if (!q.includes('PJ') && r.rows.find(x => x.pj && x.pct >= 5)) s.queue.push({ kind: 't2consigne', el: el.id, key });
  }
  function seatsMun(rows, n, winId) {
    const prime = Math.ceil(n / 2); const elig = rows.filter(x => x.pct >= 5); const seats = {}; elig.forEach(x => seats[x.id] = 0);
    seats[winId] = (seats[winId] || 0) + prime; const q = {}; elig.forEach(x => q[x.id] = 0);
    for (let i = 0; i < n - prime; i++) { let best = null, bv = -1; elig.forEach(x => { const v = x.votes / (q[x.id] + 1); if (v > bv) { bv = v; best = x.id; } }); q[best]++; }
    for (const id in q) seats[id] = (seats[id] || 0) + q[id];
    return seats;
  }
  function finishElection(el) {
    const s = S(), p = s.p;
    for (const key in el.races) {
      const r = el.races[key]; const w = r.winner; if (!w) continue;
      const winC = ((r.r2 || r).cands || []).find(c => c.id === w) || (r.cands || []).find(c => c.id === w) || ((r.r2 || r).rows || []).find(c => c.id === w) || { id: w, party: 'DIV', name: 'Candidat·e' };
      if (w !== 'PJ' && !s.pnj[w] && !winC.pjList) s.pnj[w] = mkPnj({ id: w, name: winC.name || 'Candidat·e', party: winC.party || 'DIV', role: 'candidat', known: true }); // garde-fou : jamais de gagnant introuvable
      if (el.type === 'leg') { pnjList(x => x.role === 'depute' && x.territory === key).forEach(x => { if (x.id !== w) { x.role = 'cadre'; x.mandat = 'Ancien·ne député·e'; } }); if (w !== 'PJ') { const pn = s.pnj[w]; pn.role = 'depute'; pn.territory = key; pn.mandat = 'Député·e de la ' + D.CIRCOS[+key.slice(1) - 1].name; pn.noto = Math.max(pn.noto, 55); } }
      if (el.type === 'mun') { const cid = key.slice(4); const com = D.com(cid); pnjList(x => x.role === 'maire' && x.territory === cid).forEach(x => { if (x.id !== w) { x.role = 'cadre'; x.mandat = 'Ancien·ne maire'; } }); if (w !== 'PJ') { const pn = s.pnj[w]; pn.role = 'maire'; pn.territory = cid; pn.mandat = 'Maire ' + deN(com.name); pn.noto = Math.max(pn.noto, 50); } }
      if (el.type === 'pres' && p.party !== 'NEW' && w !== 'PJ') { const row = (r.r2 ? r : r).rows ? r.rows.find(x => s.pnj[x.id] && s.pnj[x.id].party === p.party) : null; if (row) { const d = clamp((row.pct - 15) / 250, -0.08, 0.12); p.mom += d; log('Le score de votre candidat·e à la présidentielle (' + row.pct.toFixed(1).replace('.', ',') + ' %) ' + (d >= 0 ? 'porte' : 'plombe') + ' votre camp pour les législatives.', d >= 0 ? 'good' : 'bad'); } }
      if (el.type === 'pres') { const name = w === 'PJ' ? p.name : s.pnj[w].name; const party = winC.party; s.national.president = { name, party, pj: w === 'PJ', since: s.date }; s.national.gov = govFor(party); s.national.approval = 56; s.national.climate[party] = (s.national.climate[party] || 0) + 0.15; log('Élection présidentielle : ' + name + ' (' + (D.PARTIES[party]?.short || party) + ') est élu·e.', w === 'PJ' ? 'good' : 'info'); article('quotlib', name + ' élu·e président·e de la République', 0, 'nat'); }
    }
    if (el.type === 'leg') { assembly(el); s.national.lastLeg = s.date; }
    // résultats du joueur
    const ally = (p.rallied || {})[el.id]; // multijoueur : rallié·e au vainqueur de la primaire
    if (ally && String(ally).startsWith('H_')) { const rk = el.races[electionUnit(el.type)]; if (rk && rk.winner === ally) { const com = commune(); const pn = (rk.cands || []).find(c => c.id === ally) || {};
      if (el.type === 'mun') { p.mandats = p.mandats.filter(m => !['maire', 'adjoint', 'conseiller_municipal'].includes(m.type)); p.mandats.push({ type: 'adjoint', label: 'Premier·e adjoint·e au maire ' + deN(com.name), since: s.date, ind: D.adjIndemnity(com.pop), majority: true }); log('La liste ' + deN(pn.name || 'votre allié·e') + ' l’emporte : vous devenez premier·e adjoint·e.', 'good'); }
      else if (el.type === 'dep') { p.mandats = p.mandats.filter(m => m.type !== 'cd'); p.mandats.push({ type: 'cd', label: 'Conseiller·ère départemental·e (' + unit(electionUnit('dep')).name + ')', since: s.date, ind: 2100, majority: true }); log('Votre binôme l’emporte : vous êtes élu·e conseiller·ère départemental·e.', 'good'); }
      else if (el.type === 'leg') { addStd(5); addNoto('circo', 8); log('Votre allié·e est élu·e député·e : vous êtes son ou sa suppléant·e.', 'good'); } } }
    const inThis = p.cand && (p.cand.el === el.id);
    if (inThis) pjOutcome(el);
    else if (el.type === 'mun' && p.cand && p.cand.mode === 'colistier') pjOutcome(el);
    // fin des fonctions municipales si l'on ne se représente pas
    if (el.type === 'mun' && !inThis && el.races['mun:' + p.communeId] && p.mandats.some(m => ['maire', 'adjoint', 'conseiller_municipal', 'interco'].includes(m.type))) { p.mandats = p.mandats.filter(m => !['maire', 'adjoint', 'conseiller_municipal', 'interco'].includes(m.type)); p.mairie = null; log('Fin de votre mandat municipal : vous ne vous êtes pas représenté·e.', 'info'); }
    cumulCheck();
    scheduleNext(el);
    // compte de campagne
    if (p.cand && p.cand.el === el.id && p.cand.compte) closeCompte(el);
    if (p.cand && p.cand.el === el.id) { p.cand = null; p.camp = { terrain: 0, medias: 0, num: 0, meet: 0 }; }
    // municipal colistier
    if (el.type === 'mun' && p.cand && p.cand.mode === 'colistier') p.cand = null;
    s.elections = s.elections.filter(e => e.status !== 'fini' || e.id === el.id);
    el.races = summarize(el.races);
  }
  function summarize(races) { const o = {}; for (const k in races) { const r = races[k]; o[k] = { winner: r.winner, seats: r.seats, rows: (r.r2 || r).rows.slice(0, 6), done: true, cands: (r.r2 || r).cands }; } return o; }
  function govFor(party) {
    const b = D.PARTIES[party]?.bloc || 'C';
    return { G: ['LFI', 'PCF', 'ECO', 'PS'], GE: ['PS', 'ECO', 'PCF'], C: ['HOR', 'REN', 'MODEM', 'LR'], D: ['LR', 'HOR', 'REN'], ED: ['RN', 'UDR'], DIV: ['REN', 'MODEM', 'HOR'] }[b];
  }
  function dissolution(d1, at) {
    const s = S(); const d2 = addDays(d1, 7); if (s.elections.some(e => e.id === 'leg' + d1.slice(0, 4) + 'a')) return false;
    if (S().p.cand && s.elections.find(e => e.id === S().p.cand.el && e.type === 'leg' && e.status === 'futur')) S().p.cand = null;
    s.elections = s.elections.filter(e => e.type !== 'leg' || e.status !== 'futur' || diffDays(s.date, e.d1) > 365);
    s.elections.push({ id: 'leg' + d1.slice(0, 4) + 'a', type: 'leg', label: 'Législatives anticipées ' + d1.slice(0, 4), d1, d2, status: 'futur' });
    s.national.lastDiss = at || s.date; s.national.dissList = (s.national.dissList || []).concat([{ d1, at: at || s.date }]).slice(-3);
    log('Dissolution de l’Assemblée nationale : législatives anticipées le ' + fmtDate(d1) + '.', 'event');
    article('quotlib', 'Coup de tonnerre : le président dissout l’Assemblée nationale', 0, 'nat');
  }
  function assembly(el) {
    const s = S(); const r = vote('nat', ['LFI', 'PS', 'HOR', 'LR', 'RN'].map(x => ({ id: x, name: x, party: x, bucket: x === 'LFI' ? ['LFI', 'PCF'] : x === 'PS' ? ['PS', 'ECO'] : x === 'HOR' ? ['HOR', 'REN', 'MODEM'] : x === 'RN' ? ['RN', 'UDR', 'REC'] : ['LR'], ax: D.PARTIES[x].ax, noto: 60 })), 'leg', 0.02);
    const sh = {}; r.rows.forEach(x => sh[x.id] = Math.pow(x.pct, 1.7) * (x.id === 'RN' ? 0.82 : 1)); const t = Object.values(sh).reduce((a, b) => a + b, 0);
    const seats = {}; for (const k in sh) seats[k] = Math.round(sh[k] / t * 577);
    s.national.assembly = seats; const lead = Object.entries(seats).sort((a, b) => b[1] - a[1])[0][0];
    s.national.gov = govFor(lead); log('Nouvelle Assemblée : ' + Object.entries(seats).map(([k, v]) => D.PARTIES[k].short + '+ ' + v).join(', ') + '. Majorité ' + (seats[lead] >= 289 ? 'absolue' : 'relative') + ' pour le bloc ' + D.PARTIES[lead].short + '.', 'event');
  }
  function pjOutcome(el) {
    const s = S(), p = s.p; const key = p.cand.key; const r = el.races[key];
    if (LIST_T.includes(el.type)) {
      const myId = p.party === 'NEW' ? 'PJ' : (r.cands.find(c => c.pj || c.pjList) || {}).id; const got = (r.seats || {})[myId] || 0; const pos = p.cand.listPos;
      const T = { reg: ['cr', 'Conseiller·ère régional·e (Auvergne-Rhône-Alpes)', 2100], euro: ['meuro', 'Député·e européen·ne', 6200], sen: ['senateur', 'Sénateur·rice de l’Isère', 5700] }[el.type];
      if (pos <= got) {
        /* non-cumul : choix du joueur, voir cumulCheck */
        p.mandats = p.mandats.filter(m => m.type !== T[0]); p.mandats.push({ type: T[0], label: T[1], since: s.date, ind: T[2], majority: r.winner === myId });
        addNoto(el.type === 'euro' ? 'nat' : 'dept', 12); addStd(6); log(el.label + ' : votre liste obtient ' + got + ' siège(s), vous êtes élu·e (position ' + pos + ').', 'good'); article('dauph', p.name + ' élu·e : ' + T[1], 0.4, 'pj');
      } else { p.mandats = p.mandats.filter(m => m.type !== T[0]); log(el.label + ' : votre liste obtient ' + got + ' siège(s) ; en position ' + pos + ', vous n’êtes pas élu·e.', 'bad'); }
      return;
    } const rows = (r.r2 || r).rows; const me = r.rows.find(x => x.pj) || rows.find(x => x.pj);
    const com = commune();
    const addM = m => { p.mandats = p.mandats.filter(x => x.type !== m.type || x.type === 'conseiller_municipal'); p.mandats.push(m); };
    if (el.type === 'mun') {
      const n = D.councilSize(com.pop);
      p.mandats = p.mandats.filter(m => !['maire', 'adjoint', 'conseiller_municipal'].includes(m.type)); p.mairie = null;
      if (p.cand.mode === 'colistier') {
        const seats = r.seats || {}; const ls = seats[p.cand.listOf] || 0; const won = r.winner === p.cand.listOf;
        if (p.cand.listPos <= ls) {
          if (won && p.cand.listPos <= Math.max(2, Math.floor(n * 0.3))) { addM({ type: 'adjoint', label: 'Adjoint·e au maire ' + deN(com.name), since: s.date, ind: D.adjIndemnity(com.pop), majority: true }); log('Élu·e adjoint·e au maire.', 'good'); }
          else { addM({ type: 'conseiller_municipal', label: 'Conseiller·ère municipal·e ' + (won ? 'de la majorité' : 'd’opposition'), since: s.date, ind: 0, majority: won }); log('Élu·e conseiller·ère municipal·e.', 'good'); }
          addNoto('commune', 10);
        } else log('Votre position sur la liste (' + p.cand.listPos + ') ne suffit pas pour siéger.', 'bad');
        return;
      }
      const seats = r.seats || {}; const mine = seats.PJ || 0;
      if (r.winner === 'PJ') { addM({ type: 'maire', label: 'Maire ' + deN(com.name), since: s.date, ind: D.mayorIndemnity(com.pop), majority: true }); p.mairie = mkMairie(com); addNoto('commune', 25); addNoto('circo', 8); log('Vous êtes élu·e maire ' + deN(com.name) + ' (' + mine + ' sièges sur ' + n + ').', 'good'); article('dauph', p.name + ' élu·e maire ' + deN(com.name), 0.5, 'pj'); }
      else if (mine > 0) { addM({ type: 'conseiller_municipal', label: 'Conseiller·ère municipal·e d’opposition (' + com.name + ')', since: s.date, ind: 0, majority: false }); addNoto('commune', 8); log('Votre liste obtient ' + mine + ' sièges : vous siégez dans l’opposition.', 'info'); }
      else log('Votre liste n’obtient aucun siège.', 'bad');
      if (me && me.pct >= 25) p.std = clamp(p.std + 8, 0, 100);
      return;
    }
    const won = r.winner === 'PJ';
    if (el.type === 'leg') {
      if (won) {
        p.mandats = p.mandats.filter(m => m.type !== 'depute');
        p.mandats.push({ type: 'depute', label: 'Député·e de la ' + D.CIRCOS[p.circo - 1].name + ' de l’Isère', since: s.date, ind: 5900, majority: s.national.gov.includes(p.cand.label) });
        addNoto('circo', 30); addNoto('nat', 12); p.std = clamp(p.std + 15, 0, 100);
        pnjList(x => x.role === 'depute' && x.territory === 'c' + p.circo).forEach(x => { x.role = 'cadre'; x.mandat = 'Ancien·ne député·e'; x.rel -= 20; });
        log('Vous êtes élu·e député·e !', 'good'); article('dauph', p.name + ' élu·e député·e de la ' + D.CIRCOS[p.circo - 1].name, 0.5, 'pj');
      } else { if (hasMandat('depute')) { p.mandats = p.mandats.filter(m => m.type !== 'depute'); log('Vous perdez votre siège de député·e.', 'bad'); } else log('Défaite aux législatives.', 'bad'); }
    }
    if (el.type === 'dep') {
      p.mandats = p.mandats.filter(m => m.type !== 'cd');
      if (won) { p.mandats.push({ type: 'cd', label: 'Conseiller·ère départemental·e (' + unit(key).name + ')', since: s.date, ind: 2100, majority: rnd() < 0.5 }); addNoto('circo', 15); addNoto('dept', 10); log('Élu·e conseiller·ère départemental·e avec votre binôme.', 'good'); article('dauph', 'Départementales : le binôme ' + deN(p.name) + ' l’emporte', 0.4, 'pj'); }
      else log('Défaite aux départementales.', 'bad');
    }
    if (el.type === 'pres') {
      if (won) { const left = p.mandats.filter(m => m.type !== 'president'); if (left.length) log('Élu·e à l’Élysée, vous abandonnez vos autres mandats : ' + left.map(m => m.label).join(', ') + '.', 'info'); p.mandats = p.mandats.filter(m => m.type === 'president'); if (p.mairie) p.mairie = null; p.mandats.push({ type: 'president', label: 'Président·e de la République', since: s.date, ind: 15000, majority: true }); addNoto('nat', 60); s.queue.push({ kind: 'info', title: 'Élysée', text: 'Vous êtes élu·e président·e de la République. Le jeu continue : il vous faut maintenant une majorité, et tenir le pays.' }); }
    }
    if (me && me.pct >= 12) p.std = clamp(p.std + 5, 0, 100);
    if (me) addNoto(el.type === 'pres' ? 'nat' : 'circo', me.pct / 4);
  }
  function closeCompte(el) {
    const p = S().p; const c = p.cand.compte; if (!c) return; const r = el.races[p.cand.key]; const me = r && r.rows ? r.rows.find(x => x.pj) : null;
    if (c.plafond && c.depenses > c.plafond) {
      log('La commission des comptes de campagne rejette votre compte : dépassement du plafond (' + eur(c.depenses) + ' pour ' + eur(c.plafond) + ').', 'bad');
      if (rnd() < 0.7) { const yrs = rint(1, 3); p.inelig = addDays(S().date, 365 * yrs); log('Le juge de l’élection prononce ' + yrs + ' an(s) d’inéligibilité.', 'bad'); article('revel', 'Comptes de campagne : ' + p.name + ' déclaré·e inéligible', -0.8, 'pj'); }
      return;
    }
    if (me && me.pct >= 5 && c.plafond) { const back = Math.min(c.apport, 0.475 * c.plafond); if (back > 0) { p.cash += back; log('Remboursement forfaitaire de l’État : ' + eur(back) + '.', 'good'); } }
    const left = c.recettes - c.depenses - (c.aide || 0); if (left > 0) { /* excédent dévolu */ }
  }
  function mkMairie(com) { return { cid: com.id, budget: Math.round(com.pop * 1350), invest: Math.round(com.pop * 320), dette: Math.round(com.pop * 900), tf: 38, projets: [], sat: 0, cohesion: 70 }; }

  /* ---------- conquête du parti ---------- */
  const PROLE = ['Adhérent·e', 'Militant·e actif·ve', 'Secrétaire de section', 'Premier·e fédéral·e', 'Membre du bureau national', 'Chef·fe du parti'];
  function initParty() {
    const s = S(), p = s.p; p.prole = 0; p.fedSup = p.party === 'NEW' ? 100 : 4; p.natSup = p.party === 'NEW' ? 100 : 0; p.fedRole = false; p.chef = p.party === 'NEW';
    if (p.party === 'NEW') { p.prole = 5; s.partyCal = []; return; }
    const ld = s.pnj[s.national.leaders[p.party]]; ld.natW = rint(36, 46);
    for (let i = 0; i < 3; i++) mkPnj({ party: p.party, role: 'baron', territory: 'nat', noto: rint(40, 68), std: rint(60, 85), natW: rint(9, 20), mandat: pick(['Ancien·ne ministre', 'Président·e de groupe à l’Assemblée', 'Maire d’une grande ville', 'Président·e de région', 'Sénateur·rice influent·e', 'Député·e européen·ne']) + ', ' + D.PARTIES[p.party].short });
    s.partyCal = [{ t: 'federal', d: '2027-10-03' }, { t: 'congres', d: '2027-11-21' }];
  }
  function partyTick(days) {
    const s = S(), p = s.p; if (p.party === 'NEW') return; const f = days / 30;
    p.natSup = clamp(p.natSup * Math.pow(0.97, f) + (p.noto.nat / 500 + (p.chef ? 1 : 0)) * f, 0, 100); p.fedSup = clamp(p.fedSup * Math.pow(0.985, f) + (p.fedRole ? 0.6 : 0) * f, 0, 100);
    s.partyCal.filter(c => c.d <= s.date).forEach(c => { s.queue.push({ kind: 'party', t: c.t, el: c.el }); c.done = true; if (c.t === 'designation') (s.desigDone = s.desigDone || []).push(c.el); if (c.t !== 'designation') s.partyCal.push({ t: c.t, d: addDays(c.d, 365 * 3) }); });
    s.partyCal = s.partyCal.filter(c => !c.done);
    const pr = s.elections.find(e => e.type === 'pres' && e.status === 'futur'); if (pr && !s.partyCal.some(c => c.t === 'designation' && c.el === pr.id) && !(s.desigDone || []).includes(pr.id)) s.partyCal.push({ t: 'designation', d: addDays(pr.d1, -280) < s.date ? addDays(s.date, 14) : addDays(pr.d1, -280), el: pr.id });
  }
  function partyFigures() { const p = S().p; return pnjList(x => x.party === p.party && (x.role === 'leader' || x.role === 'baron')).sort((a, b) => (b.natW || 0) - (a.natW || 0)); }
  function congressShares(pjMotion, backId) {
    const p = S().p; const figs = partyFigures(); const sh = {}; figs.forEach(x => sh[x.id] = (x.natW || 10) + (p.accords.some(a => a.with === x.id && a.status === 'actif') && pjMotion ? -(x.natW || 10) : 0));
    if (pjMotion) { sh.PJ = p.natSup * 0.9 + p.fedSup * 0.08 + p.prole * 2 + p.accords.filter(a => a.status === 'actif' && S().pnj[a.with] && S().pnj[a.with].party === p.party && ['baron', 'leader'].includes(S().pnj[a.with].role)).reduce((t, a) => t + (S().pnj[a.with].natW || 10), 0); }
    if (backId && sh[backId] != null) sh[backId] += p.natSup * 0.7 + 3;
    for (const k in sh) sh[k] = Math.max(0.5, sh[k] * (0.85 + rnd() * 0.3));
    const t = Object.values(sh).reduce((a, b) => a + b, 0); for (const k in sh) sh[k] = sh[k] / t * 100; return sh;
  }
  function partyResolve(q, choice, extra) {
    const s = S(), p = s.p; const fed = s.pnj[p.fedId]; const ld = s.pnj[s.national.leaders[p.party]]; let msg = '';
    if (q.t === 'federal') {
      if (choice === 'run') { const sc = p.fedSup + (rnd() - 0.5) * 22 + (p.secLeader ? 6 : 0) + p.militants / 10; if (sc > 50) { p.fedRole = true; p.prole = Math.max(p.prole, 3); addStd(12); if (fed) { fed.rel -= 30; fed.role = 'cadre'; fed.mandat = 'Ancien·ne premier·e fédéral·e'; } p.fedSup = clamp(p.fedSup + 20, 0, 100); addNoto('dept', 8); msg = 'Vous êtes élu·e premier·e fédéral·e de l’Isère (' + Math.round(clamp(sc, 50.5, 78)) + ' %). Vous tenez désormais les investitures du département.'; article('dauph', D.PARTIES[p.party].short + ' Isère : ' + p.name + ' prend la fédération', 0.3, 'pj'); } else { p.fedSup = clamp(p.fedSup - 6, 0, 100); if (fed) fed.rel -= 15; msg = 'Battu·e pour la fédération (' + Math.round(clamp(sc, 15, 49.5)) + ' %). ' + (fed ? fed.name + ' reste en place et s’en souviendra.' : ''); } }
      else { if (fed) fed.rel += 10; addStd(3); p.fedSup = clamp(p.fedSup + 2, 0, 100); msg = 'Vous soutenez la direction fédérale sortante.'; }
    }
    if (q.t === 'congres') {
      const own = choice === 'motion'; const back = choice === 'direction' ? ld.id : choice === 'challenger' ? extra : null;
      const sh = congressShares(own, back); let ranked = Object.entries(sh).sort((a, b) => b[1] - a[1]); let win = ranked[0][0]; let tour = '';
      if (ranked[0][1] < 50 && ranked.length > 1) { const a = ranked[0], b = ranked[1]; const sa = a[1] + (100 - a[1] - b[1]) * (0.35 + rnd() * 0.3); win = sa >= 50 ? a[0] : b[0]; tour = ' au second tour'; }
      const nm = id => id === 'PJ' ? 'votre motion' : s.pnj[id].name;
      const detail = ranked.slice(0, 4).map(([id, v]) => (id === 'PJ' ? 'Vous' : s.pnj[id].name) + ' ' + v.toFixed(1).replace('.', ',') + ' %').join(' · ');
      partyFigures().forEach(x => x.natW = Math.max(5, (x.natW || 10) + (x.id === win ? 6 : -1)));
      if (win === 'PJ') { p.chef = true; p.prole = 5; addStd(30); p.natSup = clamp(p.natSup + 25, 0, 100); addNoto('nat', 22); if (ld) { ld.role = 'baron'; ld.rel -= 25; ld.mandat = 'Ancien·ne chef·fe du parti'; } msg = 'Le congrès vous porte à la tête du parti' + tour + ' ! ' + detail; article('quotlib', 'Coup de tonnerre au congrès : ' + p.name + ' prend la tête de ' + D.PARTIES[p.party].short, 0.5, 'pj'); }
      else if (back && win === back) { p.prole = Math.max(p.prole, p.prole >= 2 ? 4 : p.prole); addStd(8); p.natSup = clamp(p.natSup + 5, 0, 100); s.pnj[win].rel += 15; msg = 'Votre camp l’emporte' + tour + ' : ' + nm(win) + '. ' + (p.prole >= 4 ? 'Vous entrez au bureau national.' : 'Vous gagnez du crédit à la direction.') + ' ' + detail; if (win !== ld.id) { ld.role = 'baron'; s.pnj[win].role = 'leader'; s.national.leaders[p.party] = win; } }
      else { addStd(own ? -8 : -4); s.pnj[win].rel -= own ? 25 : 10; msg = (own ? 'Votre motion est battue' : 'Votre camp perd') + tour + ' : ' + nm(win) + ' l’emporte. ' + detail; if (win !== ld.id && !p.chef) { ld.role = 'baron'; s.pnj[win].role = 'leader'; s.national.leaders[p.party] = win; } }
      if (p.chef && win !== 'PJ') p.chef = false;
    }
    if (q.t === 'designation') {
      if (choice === 'primaire' || choice === 'chef') {
        const rivals = partyFigures().filter(x => !p.chef || true).slice(0, 2); const deb = extra || 0;
        const me = p.natSup * 0.75 + p.noto.nat * 0.35 + popularity() / 3 + deb + (p.chef ? 25 : 0) + p.prole * 3;
        const sc = { PJ: Math.max(1, me) }; rivals.forEach(x => sc[x.id] = (x.natW || 10) * 1.3 + x.noto * 0.3 + rnd() * 10);
        const t = Object.values(sc).reduce((a, b) => a + b, 0); const ranked = Object.entries(sc).map(([k, v]) => [k, v / t * 100]).sort((a, b) => b[1] - a[1]);
        const detail = ranked.map(([k, v]) => (k === 'PJ' ? 'Vous' : s.pnj[k].name) + ' ' + v.toFixed(1).replace('.', ',') + ' %').join(' · ');
        if (ranked[0][0] === 'PJ') { p.presDesig = q.el; p.parrainages = Math.max(p.parrainages, 500); addNoto('nat', 18); addStd(10); msg = 'Vous êtes désigné·e candidat·e de ' + D.PARTIES[p.party].short + ' à la présidentielle. ' + detail; article('quotlib', p.name + ' remporte la primaire de ' + D.PARTIES[p.party].short, 0.5, 'pj'); }
        else { const w = s.pnj[ranked[0][0]]; s.national.leaders[p.party] = w.id; w.rel -= 5; addStd(-3); msg = w.name + ' remporte la désignation. ' + detail; }
      } else { const w = ld; w.rel += 10; addStd(4); msg = 'Vous soutenez ' + (w ? w.name : 'le candidat du parti') + ' pour la présidentielle.'; }
    }
    if (msg) log(msg, 'event'); rankUpdate(); return msg;
  }

  /* ---------- terrain : quartiers et communes ---------- */
  const ZMIX = { centre: [0.2, 0.1, 0.3, 0.1, 0.3, 0], qpv: [0.25, 0.55, 0.1, 0.1, 0, 0], resid: [0.05, 0.1, 0.35, 0.25, 0.25, 0], lotis: [0.05, 0.1, 0.15, 0.55, 0.15, 0], bourg: [0.05, 0.15, 0.4, 0.2, 0.1, 0.1], hameaux: [0, 0.05, 0.3, 0.15, 0.05, 0.45] };
  function zonesFor(key) {
    const s = S(); s.zones = s.zones || {}; if (s.zones[key]) return s.zones[key]; let z = null;
    const mk = (id, name, w, mix) => ({ id, name, w, mix, cover: 0 });
    if (key.startsWith('mun:') || key.startsWith('can:')) {
      const com = D.com(key.slice(4)); const can = key.startsWith('can:');
      if (['metro', 'ville'].includes(com.type)) z = [mk('z1', 'Centre-ville', 0.25, ZMIX.centre), mk('z2', 'Quartier prioritaire', 0.2, ZMIX.qpv), mk('z3', 'Quartiers résidentiels', 0.3, ZMIX.resid), mk('z4', 'Lotissements périphériques', 0.25, ZMIX.lotis)];
      else if (['periurbain', 'bourg'].includes(com.type)) z = [mk('z1', 'Centre-bourg', 0.35, ZMIX.bourg), mk('z2', 'Lotissements', 0.4, ZMIX.lotis), mk('z3', 'Hameaux', 0.25, ZMIX.hameaux)];
      else z = [mk('z1', 'Bourg', 0.5, ZMIX.bourg), mk('z2', 'Hameaux et vallons', 0.5, ZMIX.hameaux)];
      if (can) { z.forEach(x => x.w *= 0.55); z.push(mk('zc', 'Villages du canton', 0.45, ZMIX.hameaux)); }
    } else if (/^c\d+$/.test(key)) {
      const c = D.CIRCOS[+key.slice(1) - 1]; const coms = D.COMMUNES.filter(m => m.circo === c.id); const tot = c.pop; let used = 0;
      z = coms.map(m => { const w = Math.min(0.5, m.pop / tot); used += w; return mk('m_' + m.id, m.name, w, mixFrom({ [m.type]: 1 })); });
      z.push(mk('rest', 'Reste de la circonscription', Math.max(0.1, 1 - used), mixFrom(c.mixOf)));
    }
    if (z) { const t = z.reduce((a, x) => a + x.w, 0); z.forEach(x => x.w = x.w / t); } s.zones[key] = z; return z;
  }
  function fieldEffect(key) {
    const z = (S().zones || {})[key]; if (!z) return null; const o = {};
    D.SEG_IDS.forEach((g, i) => { let num = 0, den = 0; z.forEach(x => { num += x.w * x.mix[i] * x.cover / 100; den += x.w * x.mix[i]; }); o[g] = den ? 0.12 * num / den : 0; }); return o;
  }
  function zoneLean(x) { const p = S().p; let l = 0; D.SEG_IDS.forEach((g, i) => l += x.mix[i] * (p.image[g] || 0)); return l; }
  function canvass(zid, kind) {
    const p = S().p; const key = p.cand ? p.cand.key : electionUnit((nextElection(e => !LIST_T.includes(e.type) && e.type !== 'pres') || { type: 'mun' }).type); const z = zonesFor(key); if (!z) return null; const x = z.find(y => y.id === zid) || z[0];
    const e = eff() * (1 + ((p.traits.terrain ?? 50) - 50) / 150) * (hasStaff('terrain') ? 1.25 : 1); const amt = { porte: 11, tract: 5, reunion: 4, staff: 6 }[kind] * e / Math.sqrt(Math.max(0.15, x.w) * 4) * Math.max(0.25, 1 - x.cover / 110);
    x.cover = clamp(x.cover + amt, 0, 100); const im = { porte: 2.6, tract: 1.2, reunion: 2.4, staff: 1.4 }[kind] * e;
    D.SEG_IDS.forEach((g, i) => { if (x.mix[i] > 0.12) { const cur = p.image[g] || 0; addImage(g, im * x.mix[i] * 1.2 * Math.max(0.12, 1 - Math.max(0, cur) / 35)); } });
    return x;
  }

  /* ---------- estimation & adversaires ---------- */
  function estimate() {
    const s = S(), p = s.p; let el, key;
    if (p.cand) { el = s.elections.find(e => e.id === p.cand.el); key = p.cand.key; }
    else { el = s.elections.filter(e => e.status !== 'fini' && !LIST_T.includes(e.type) && (e.type !== 'pres' || p.noto.nat > 40 || p.presDesig === e.id)).sort((a, b) => nextDate(a) < nextDate(b) ? -1 : 1)[0]; if (!el) return null; key = electionUnit(el.type); }
    if (!el) return null;
    const st = s.rng; const saved = p.cand; const hypo = !saved || saved.mode === 'colistier';
    let hl = p.party === 'NEW' ? 'DIV' : p.party;
    if (el.type === 'leg' && s.national.unionGauche && ['LFI', 'PCF', 'ECO', 'PS'].includes(hl) && unionParty(['LFI', 'PCF', 'ECO', 'PS'], 'c' + p.circo) !== hl) hl = 'DIV';
    if (hypo) p.cand = { el: el.id, key, mode: 'tete', label: hl, invested: true };
    let cands = buildCands(el, key);
    if (el.status === 't1' && el.races && el.races[key] && el.races[key].t2) { const t2 = el.races[key].t2; const f2 = cands.filter(c => t2.includes(c.id) || (c.pj && t2.includes('PJ'))); if (f2.length >= 2) cands = f2; }
    const r = vote(key, cands, el.type, 0); p.cand = saved; s.rng = st;
    const me = r.rows.find(x => x.pj) || r.rows.find(row => cands.some(c => c.id === row.id && c.pjList));
    let seatsEst = null; if (LIST_T.includes(el.type) && me) { const st2 = dhondt(r.rows, LIST_SEATS[el.type], el.type === 'sen' ? 0 : 5, el.type === 'reg' ? Math.round(26 / 4) : 0, r.rows[0].id); seatsEst = st2[me.id] || 0; me.pj = true; }
    const est = { list: LIST_T.includes(el.type), seats: seatsEst, pos: p.cand && p.cand.listPos, el: el.id, label: el.label, unit: unit(key).name, pct: me ? me.pct : 0, rank: me ? r.rows.indexOf(me) + 1 : 0, n: r.rows.length, rows: r.rows.slice(0, 6), hypo, date: s.date };
    const meC = me && me.pj && !est.list ? cands.find(c => c.pj) : null; if (meC) est.terms = pjTerms(meC, key, el.type);
    s.est = est; s.rivals = r.rows.filter(x => !x.pj && s.pnj[x.id] && !s.pnj[x.id].human).slice(0, 3).map(x => x.id);
    s.rivals.forEach(id => s.pnj[id].known = true); if (typeof DP !== 'undefined') DP.ensureProgs();
    return est;
  }
  const ATT = {
    G: ['{P} fait le jeu des puissants, comme d’habitude.', 'Le programme de {P}, c’est l’austérité qui ne dit pas son nom.'],
    GE: ['{P} n’a aucune vision pour la transition écologique.', '{P} parle beaucoup, mais où sont les propositions sociales ?'],
    C: ['{P} promet tout et n’a rien chiffré.', 'Avec {P}, ce sont les impôts qui flamberont.'],
    D: ['{P} est {un amateur|une amatrice}. Notre territoire mérite mieux.', '{P} est laxiste sur la sécurité, les habitants le savent.'],
    ED: ['{P} est {le candidat|la candidate} d’un système qui vous a abandonnés.', '{P} ne vit pas dans le même monde que vous.'],
    DIV: ['Moi, je ne fais pas de politique politicienne, contrairement à {P}.', '{P} roule pour son parti, pas pour vous.']
  };
  // formulées à la 2e personne : « fait courir le bruit que vous… »
  const RUMEURS = ['ne paieriez pas vos impôts locaux', 'seriez {parachuté|parachutée} par la direction nationale', 'auriez des liens d’affaires avec un promoteur', 'vous apprêteriez à changer de parti après l’élection', 'auriez menti sur votre parcours professionnel'];
  const gtxt = (t, g) => t.replace(/\{([^|{}]*)\|([^{}]*)\}/g, (m, a, b) => g === 'F' ? b : a); // accord selon le genre
  const PROMESSES = { G: 'la gratuité de la cantine et des transports scolaires', GE: 'un grand plan vélo et zéro artificialisation des sols', C: 'un guichet unique pour les entreprises et les associations', D: 'une baisse de la taxe foncière dès la première année', ED: 'une police municipale armée et des caméras dans chaque quartier', DIV: 'un budget participatif de 10 % de l’investissement' };
  function rivalTick(days) {
    const s = S(), p = s.p; s.turnRival = []; const f = Math.min(1.5, days / 30); const ph = phase().id; const heat = (ph === 'campagne' || ph === 'entre2' ? 1.8 : ph === 'pre' ? 1.3 : 0.8) * DF().heat * (p.cand && petiteKey(p.cand.key) ? 0.6 : 1); const pet = !!(p.cand && petiteKey(p.cand.key));
    let asks = 0;
    (s.rivals || []).forEach((id, i) => {
      const x = s.pnj[id]; if (!x || !x.alive || x.human) return; const t = x.traits; const bloc = D.PARTIES[x.party].bloc;
      (x.prog || []).forEach(pr => pr.vis = clamp(pr.vis + 3 * f * heat, 0, 75));
      if (rnd() > Math.min(0.95, (0.55 - i * 0.12) * f * heat)) return;
      const opts = [['meeting', 20 + t.charisme / 3], ['programme', 18], ['attaque', (t.ambition + t.rancune) / 4 + (x.rel < 0 ? 20 : 0) - (x.rel > 30 ? 25 : 0)], ['defi', pet || !p.cand || !['campagne', 'entre2', 'pre'].includes(ph) || s.queue.some(q => q.type === 'defi') ? 0 : t.ambition / 4 + t.charisme / 5], ['alliance', pet ? 0 : x.rel > 5 ? 15 + x.rel / 4 : 4], ['rumeur', t.scrupules < 45 ? 25 - t.scrupules / 3 : 0], ['debauche', p.staff.some(y => y.loy < 50) ? 10 : 0], ['critique', (p.prog || []).some(m => m.status !== 'retiree' && (m.phare || m.visib > 25)) ? 26 : 0]];
      let act = wpick(opts, o => Math.max(0, o[1]))[0];
      if (['attaque', 'defi', 'alliance', 'rumeur', 'critique'].includes(act) && asks >= 2) act = 'meeting';
      if (villageScope() && ['attaque', 'defi', 'rumeur'].includes(act)) act = 'meeting';
      const nm = x.name; const tag = pet ? '' : ' (' + D.PARTIES[x.party].short + ')';
      if (act === 'meeting') { x.mom += 0.03; x.noto = clamp(x.noto + 2, 0, 100); s.turnRival.push(nm + tag + ' multiplie réunions publiques et porte-à-porte.'); if (rnd() < 0.5) article('dauph', nm + ' fait salle comble', 0.1, 'pnj'); }
      else if (act === 'programme') { x.mom += 0.02; const el2 = s.est ? s.elections.find(e => e.id === s.est.el) : null; const lv = el2 && ['mun', 'dep', 'reg', 'sen'].includes(el2.type) ? 'local' : 'national'; const np = typeof DP !== 'undefined' ? DP.genProp(x, lv) : null; if (np) { (x.prog = x.prog || []).push(np); s.turnRival.push(nm + tag + ' propose « ' + np.label + ' ».'); article('dauph', nm + ' propose : ' + np.label.charAt(0).toLowerCase() + np.label.slice(1), 0, 'pnj'); } else { const pr = typeof TB !== 'undefined' ? TB.promesse(bloc, lv, rnd) : (PROMESSES[bloc] || PROMESSES.DIV); s.turnRival.push(nm + tag + ' promet ' + pr + '.'); article('dauph', nm + ' promet ' + pr, 0, 'pnj'); } }
      else if (act === 'attaque') { asks++; const elT = s.est ? (s.elections.find(e => e.id === s.est.el) || {}).type : null; let txt, kind = 'fond'; if (typeof TB !== 'undefined') { s.recentTxt = s.recentTxt || {}; const seen = s.recentTxt.att = s.recentTxt.att || []; let a; for (let k = 0; k < 6; k++) { a = TB.attack(x, p, elT, rnd); if (!seen.includes(a.text)) break; } txt = a.text; kind = a.kind; seen.push(txt); if (seen.length > 40) seen.shift(); } else txt = gtxt(pick(ATT[bloc] || ATT.DIV), p.g).replace('{P}', p.name); const viral = rnd() < (kind === 'perso' ? 0.5 : 0.3); s.turnRival.push(nm + tag + ' vous attaque.'); post(nm, '@' + slug(nm), txt, false, viral ? rint(800, 4000) : rint(40, 600)); s.queue.push({ kind: 'rival', type: 'attaque', pnj: id, text: txt, viral, akind: kind }); }
      else if (act === 'defi') { asks++; s.turnRival.push(nm + tag + ' vous défie en débat.'); s.queue.push({ kind: 'rival', type: 'defi', pnj: id, media: pick(['radio', 'alpes3']) }); }
      else if (act === 'alliance') { asks++; const cl = (s.est && s.est.rank > 0 && s.est.rows.findIndex(r => r.id === id) > s.est.rank - 1) ? ['desistement'] : pick([['nonagression'], ['soutien'], ['desistement']]); s.turnRival.push(nm + tag + ' vous propose un accord.'); s.queue.push({ kind: 'rival', type: 'alliance', pnj: id, clauses: cl }); }
      else if (act === 'rumeur') { asks++; let ru = gtxt(pick(RUMEURS), p.g); if (typeof TB !== 'undefined') { s.recentTxt = s.recentTxt || {}; const seen = s.recentTxt.rum = s.recentTxt.rum || []; for (let k = 0; k < 6; k++) { ru = TB.rumeur(p, rnd); if (!seen.includes(ru)) break; } seen.push(ru); if (seen.length > 12) seen.shift(); } s.turnRival.push('L’entourage de ' + nm + ' fait courir une rumeur sur vous.'); s.queue.push({ kind: 'rival', type: 'rumeur', pnj: id, text: ru }); }
      else if (act === 'critique') { asks++; const ms = p.prog.filter(m => m.status !== 'retiree' && (m.phare || m.visib > 25)); const m = pick(ms); const angle = m.cout > 0 ? 'qui la paiera ? ' + (m.level === 'local' ? 'Les contribuables, avec ' + eur(m.cout) + ' par an.' : 'Les Français, avec ' + (m.cout / 1e9).toFixed(1).replace('.', ',') + ' milliards par an.') : (m.perdants && m.perdants.length ? 'elle sacrifie les ' + D.SEGS.find(g => g.id === m.perdants[0]).name.toLowerCase() + '.' : 'c’est un slogan, pas une politique.'); s.turnRival.push(nm + tag + ' démonte votre proposition « ' + m.resume + ' ».'); article(pick(['dauph', 'radio']), nm + ' attaque la proposition ' + deN(p.name) + ' : « ' + angle + ' »', -0.2, 'pj'); s.queue.push({ kind: 'rival', type: 'critique', pnj: id, mes: m.id, text: angle }); }
      else if (act === 'debauche') { const st = p.staff.filter(y => y.loy < 50).sort((a, b) => a.loy - b.loy)[0]; if (st && rnd() < 0.5) { p.staff = p.staff.filter(y => y.id !== st.id); s.turnRival.push(nm + tag + ' débauche votre collaborateur ' + st.name + '.'); log(nm + ' débauche ' + st.name + ' (' + D.STAFF_ROLES[st.role].l + ').', 'bad'); p.casseroles.filter(c => c.known.includes(st.id)).forEach(c => c.risk += 0.04); x.mom += 0.02; } else s.turnRival.push(nm + tag + ' tente de débaucher un membre de votre équipe, sans succès.'); }
    });
  }
  function rivalResolve(q, choice, extra) {
    const s = S(), p = s.p; const x = s.pnj[q.pnj]; const nm = x.name; let msg = '';
    if (q.type === 'attaque') {
      if (choice === 'ignore') { addImageAll(-1.2); x.mom += 0.02; msg = 'Vous ignorez l’attaque. Une partie de l’opinion y voit un aveu.'; }
      else if (choice === 'cinglant') { if (rnd() < 0.45 + (q.viral ? 0.12 : -0.05) + (q.akind === 'perso' ? 0.06 : q.akind === 'fond' ? -0.04 : 0) + (p.traits.sangfroid - 50) / 200 + p.mediaTraining * 0.08) { addImageAll(1.8); x.mom -= 0.03; x.rel -= 8; addNoto('circo', 2); msg = 'Votre réplique fait mouche et tourne en boucle.'; post(p.name, '@' + slug(p.name), fresh('ripc', ['Quand on n’a pas de bilan, on attaque. Moi, je travaille.', 'Je laisse ' + nm + ' aux insultes. Je garde les propositions.', 'Chaque fois que ' + nm + ' parle de moi, c’est qu’il n’a rien à dire sur le fond.'.replace('il n’a', x.g === 'F' ? 'elle n’a' : 'il n’a'), 'Les habitants méritent un débat, pas des caricatures.', 'Je préfère les chantiers aux règlements de comptes.', 'Attaquer, c’est facile. Proposer, c’est un métier.', 'Belle punchline. Et sinon, votre programme ?', 'On me reproche beaucoup de choses. Jamais d’avoir menti aux électeurs.']), true, rint(200, 1500)); } else { addImageAll(-1.5); x.rel -= 10; msg = 'Votre réplique tombe à plat, on vous trouve agressif·ve.'; } }
      else if (choice === 'fond') { // efficace contre une critique de fond, inaudible face à un buzz, et s'use si on ne fait que ça
        const used = (p.fondN || 0); const k = Math.pow(0.65, used) * (q.akind === 'perso' ? 0.75 : q.akind === 'fond' ? 1.15 : 1); p.fondN = used + 1; p.fondAt = s.date;
        if (q.viral) { addImageAll(-0.6); x.mom += 0.015; msg = 'Votre réponse posée passe inaperçue : l’attaque a déjà fait le buzz, votre mise au point ne circule pas.'; }
        else { p.cred = clamp(p.cred + 1.5 * k, 0, 100); x.rel -= 3; addImage('CAD', 1 * k); addImage('RET', 1 * k); msg = k > 0.6 ? 'Votre réponse argumentée rassure les électeurs les plus attentifs.' : 'Encore une mise au point calme : elle rassure, mais on ne l’écoute presque plus.'; } }
    }
    if (q.type === 'defi' && choice === 'refuse') { addImageAll(-1.5); x.mom += 0.03; article(q.media || 'radio', nm + ' : « Mon adversaire fuit le débat »', -0.3, 'pj'); msg = 'Vous déclinez. ' + nm + ' en fait un argument.'; }
    if (q.type === 'alliance') { if (choice === 'accept') { p.accords.push({ id: uid('acc'), with: x.id, clauses: q.clauses, date: s.date, status: 'actif' }); x.rel += 10; msg = 'Accord conclu avec ' + nm + ' : ' + q.clauses.map(c => CLAUSES[c]).join(', ') + '.'; log(msg, 'good'); if (q.clauses.includes('soutien')) addNoto('circo', x.noto / 10); } else { x.rel -= 6; msg = 'Vous refusez la main tendue de ' + nm + '.'; } }
    if (q.type === 'rumeur') {
      if (choice === 'ignore') { addImageAll(-2.2); p.cred = clamp(p.cred - 1, 0, 100); msg = 'La rumeur enfle faute de démenti.'; }
      else if (choice === 'dementi') { addImageAll(-0.6); p.cred = clamp(p.cred + 0.5, 0, 100); msg = 'Votre démenti limite la casse.'; article('dauph', p.name + ' dément les rumeurs : « des méthodes indignes »', 0, 'pj'); }
      else if (choice === 'plainte') { p.cash -= 2500; if (rnd() < 0.55) { x.img -= 10; x.mom -= 0.05; x.rel -= 30; addImageAll(1); msg = 'Plainte en diffamation : l’entourage de ' + nm + ' est désavoué publiquement.'; article('dauph', 'Rumeurs : ' + p.name + ' porte plainte, ' + nm + ' recule', 0.3, 'pj'); } else { addImageAll(-1); x.rel -= 20; msg = 'Votre plainte fait du bruit, mais la rumeur aussi.'; } }
    }
    if (q.type === 'critique') { const m = p.prog.find(z => z.id === q.mes); if (m) {
      if (choice === 'chiffrer') { const ok = rnd() < (m.cred || 50) / 100 + ((p.expertise || {})[m.theme] || 0) * 0.06 + (hasStaff('plume') ? 0.08 : 0); if (ok) { p.cred = clamp(p.cred + 2, 0, 100); m.visib = clamp((m.visib || 0) + 12, 0, 100); m.cred = clamp(m.cred + 4, 0, 100); x.mom -= 0.02; msg = 'Chiffres à l’appui, vous renvoyez ' + nm + ' dans les cordes. Votre proposition en sort renforcée.'; } else { p.cred = clamp(p.cred - 2, 0, 100); m.cred = clamp(m.cred - 6, 0, 100); msg = 'Votre défense peine à convaincre : le financement reste flou.'; } }
      else if (choice === 'retirer') { m.status = 'retiree'; m.phare = false; m.visib = 0; p.cred = clamp(p.cred - 2.5, 0, 100); x.mom += 0.02; msg = 'Vous retirez la proposition. ' + nm + ' crie victoire.'; article('dauph', p.name + ' renonce à sa proposition « ' + m.resume + ' »', -0.3, 'pj'); }
      else { m.visib = clamp((m.visib || 0) - 6, 0, 100); p.cred = clamp(p.cred - 1, 0, 100); msg = 'Vous laissez dire. Le doute s’installe sur votre proposition.'; } } }
    if (msg) log(msg, 'info'); return msg;
  }

  /* ---------- sondages ---------- */
  function trueIntentions(el) {
    const key = S().p.cand && S().p.cand.el === el.id ? S().p.cand.key : electionUnit(el.type);
    const cands = buildCandsPreview(el, key); return { key, r: vote(key, cands, el.type, 0) };
  }
  function buildCandsPreview(el, key) { const st = S().rng; const c = buildCands(el, key); S().rng = st; return c; }
  function publishPolls(force) {
    const s = S(); const pres = s.elections.find(e => e.type === 'pres' && e.status !== 'fini');
    if (pres && (force || rnd() < 0.8)) {
      const inst = pick(D.INSTITUTS); const { r } = trueIntentions(pres); const n = rint(900, 1500);
      const rows = r.rows.map(x => ({ name: x.name, label: x.label, color: x.color, pj: x.pj, pct: clamp(x.pct + (inst.house[x.party] || 0) + gauss() * Math.sqrt(x.pct * (100 - x.pct) / n) * 1.2, 0.3, 90) }));
      const t = rows.reduce((a, b) => a + b.pct, 0); rows.forEach(x => x.pct = x.pct / t * 100); rows.sort((a, b) => b.pct - a.pct);
      s.polls.unshift({ id: uid('s'), date: s.date, inst: inst.name, scope: 'France', label: 'Intentions de vote, 1er tour · ' + pres.label, n, rows, commande: false });
    }
    const ph = phase(); if (s.p.cand && ph.id !== 'hors' && ph.el && ph.el.type !== 'pres' && rnd() < 0.55) pollLocal(false);
    if (s.polls.length > 40) s.polls.length = 40;
  }
  function pollLocal(commande) {
    const s = S(); const el = s.elections.find(e => e.id === s.p.cand.el); const inst = pick(D.INSTITUTS);
    const { key, r } = trueIntentions(el); const n = commande ? 800 : rint(500, 700);
    const rows = r.rows.map(x => ({ name: x.name, label: x.label, color: x.color, pj: x.pj, pct: clamp(x.pct + (commande ? 0 : (inst.house[x.party] || 0)) + gauss() * Math.sqrt(x.pct * (100 - x.pct) / n), 0.3, 90) }));
    const t = rows.reduce((a, b) => a + b.pct, 0); rows.forEach(x => x.pct = x.pct / t * 100); rows.sort((a, b) => b.pct - a.pct);
    const extra = commande ? { noto: Math.round(s.p.noto[el.type === 'mun' ? 'commune' : 'circo']), image: Object.assign({}, s.p.image), part: Math.round(r.participation) } : null;
    s.polls.unshift({ id: uid('s'), date: s.date, inst: commande ? inst.name + ' (sondage commandé)' : inst.name, scope: unit(key).name, label: 'Intentions de vote, 1er tour · ' + el.label, n, rows, commande, extra });
  }

  /* ---------- événements ---------- */
  const EVENTS = [
    { id: 'greve', scope: 'nat', t: 'Grève reconductible dans les transports', d: 'Le pays est bloqué depuis cinq jours. Les usagers fulminent, les syndicats tiennent.', th: 'pouvoir_achat', sal: 0.6, cl: { LFI: 0.03, RN: 0.02, REN: -0.03 }, ch: [{ l: 'Soutenir les grévistes', v: { eco: -40, inst: 20 }, txt: 'Je soutiens les grévistes : leur colère est légitime.' }, { l: 'Dénoncer la prise d’otages des usagers', v: { eco: 30, aut: 20 }, txt: 'Les usagers ne doivent pas être pris en otage.' }] },
    { id: 'budget', scope: 'nat', t: 'Le gouvernement annonce 30 milliards d’économies', d: 'Collectivités, santé, aides sociales : le rabot touche tout le monde.', th: 'economie', sal: 0.5, cl: { REN: -0.04, HOR: -0.02, LFI: 0.02, RN: 0.02 }, ch: [{ l: 'Défendre la rigueur', v: { eco: 45 }, txt: 'La dette nous étrangle, la rigueur est une responsabilité.' }, { l: 'Dénoncer l’austérité', v: { eco: -45 }, txt: 'Cette austérité frappe les plus fragiles.' }] },
    { id: 'faitdivers', scope: 'loc', t: 'Fusillade sur un point de deal à Échirolles', d: 'Un adolescent blessé. Les habitants du quartier réclament des actes.', th: 'securite', sal: 0.9, cl: { RN: 0.03, LR: 0.02 }, ch: [{ l: 'Réclamer plus de police', v: { aut: 50 }, txt: 'Il faut des renforts de police, tout de suite.' }, { l: 'Appeler à la prévention et aux moyens sociaux', v: { aut: -30, eco: -20 }, txt: 'La répression seule ne suffit pas : il faut des éducateurs et de la prévention.' }] },
    { id: 'usine', scope: 'loc', t: 'Fermeture annoncée d’une usine du Nord-Isère', d: '320 emplois menacés. La direction invoque la concurrence asiatique.', th: 'industrie', sal: 0.8, cl: { RN: 0.02, LFI: 0.02, REN: -0.02 }, ch: [{ l: 'Exiger un protectionnisme européen', v: { souv: 20, eco: -10 }, txt: 'L’Europe doit enfin protéger son industrie.' }, { l: 'Exiger la nationalisation temporaire', v: { eco: -50, souv: 30 }, txt: 'L’État doit entrer au capital et sauver le site.' }, { l: 'Plaider pour baisser les impôts de production', v: { eco: 45 }, txt: 'Nos usines meurent de la fiscalité : baissons les impôts de production.' }] },
    { id: 'neige', scope: 'loc', t: 'Saison blanche : les petites stations sans neige', d: 'À Villard-de-Lans et en Chartreuse, les remontées restent fermées. Les saisonniers s’inquiètent.', th: 'ecologie', sal: 0.7, cl: { ECO: 0.03 }, ch: [{ l: 'Accélérer la diversification des stations', v: { ecol: -40 }, txt: 'Il faut sortir du tout-ski et accompagner la transition.' }, { l: 'Défendre la neige de culture et l’emploi', v: { ecol: 40 }, txt: 'Nos stations font vivre des vallées entières : sauvons-les.' }] },
    { id: 'crue', scope: 'loc', t: 'Crue de l’Isère : quartiers inondés', d: 'Des centaines de foyers évacués. Les assureurs traînent.', th: 'ecologie', sal: 0.6, cl: { ECO: 0.02 }, ch: [{ l: 'Mettre en cause l’artificialisation des sols', v: { ecol: -35 }, txt: 'On récolte des décennies de bétonnage.' }, { l: 'Exiger des digues et de l’argent, vite', v: { ecol: 10, eco: -15 }, txt: 'Les sinistrés veulent des digues, pas des discours.' }] },
    { id: 'immig', scope: 'nat', t: 'Projet de loi immigration : le débat s’enflamme', d: 'Le texte durcit les conditions de séjour. La rue et les plateaux s’embrasent.', th: 'immigration', sal: 0.9, cl: { RN: 0.03, REC: 0.02, LFI: 0.01 }, ch: [{ l: 'Soutenir le durcissement', v: { souv: 45, soc: 20 }, txt: 'Il faut reprendre le contrôle de nos frontières.' }, { l: 'Dénoncer un texte inhumain', v: { souv: -40, soc: -30 }, txt: 'Ce texte piétine nos valeurs d’accueil.' }] },
    { id: 'findevie', scope: 'nat', t: 'Aide à mourir : le Sénat bloque le texte', d: 'Les associations dénoncent une trahison, l’Église salue la décision.', th: 'societe', sal: 0.5, cl: {}, ch: [{ l: 'Défendre le droit à mourir dans la dignité', v: { soc: -45 }, txt: 'Chacun doit pouvoir choisir sa fin de vie.' }, { l: 'Saluer la prudence du Sénat', v: { soc: 40 }, txt: 'Développons d’abord les soins palliatifs.' }] },
    { id: 'energie', scope: 'int', t: 'Choc gazier : les factures s’envolent', d: 'Tensions géopolitiques à l’Est, le prix du gaz double en un mois.', th: 'pouvoir_achat', sal: 0.9, cl: { RN: 0.02, REN: -0.03 }, ch: [{ l: 'Bloquer les prix de l’énergie', v: { eco: -40 }, txt: 'Il faut bloquer les prix, c’est vital.' }, { l: 'Relancer le nucléaire massivement', v: { ecol: 35, souv: 15 }, txt: 'Notre souveraineté, c’est le nucléaire.' }] },
    { id: 'tarifs', scope: 'int', t: 'Guerre commerciale : Washington taxe l’acier européen', d: 'Les industriels de la vallée du Grésivaudan s’inquiètent pour leurs exportations.', th: 'europe', sal: 0.6, cl: { RN: 0.01, HOR: 0.01 }, ch: [{ l: 'Riposter par une Europe-puissance', v: { souv: -35 }, txt: 'Seule une Europe unie peut répondre.' }, { l: 'Reprendre notre souveraineté commerciale', v: { souv: 40 }, txt: 'Bruxelles nous a désarmés : reprenons la main.' }] },
    { id: 'hopital', scope: 'loc', t: 'Fermeture nocturne des urgences de Voiron', d: 'Faute de médecins, les urgences ferment la nuit. Pétition massive.', th: 'sante', sal: 0.8, cl: { REN: -0.02, LFI: 0.01, RN: 0.01 }, ch: [{ l: 'Exiger des moyens publics massifs', v: { eco: -40 }, txt: 'L’hôpital public doit être sanctuarisé.' }, { l: 'Proposer une régulation de l’installation des médecins', v: { aut: 20, eco: -10 }, txt: 'Il faut réguler l’installation des médecins.' }] },
    { id: 'loyers', scope: 'loc', t: 'Les loyers grenoblois atteignent un record', d: 'Étudiants et jeunes actifs fuient vers le Voironnais et le Grésivaudan.', th: 'logement', sal: 0.6, cl: { ECO: 0.01, LFI: 0.01 }, ch: [{ l: 'Encadrer davantage les loyers', v: { eco: -40 }, txt: 'L’encadrement des loyers doit être renforcé.' }, { l: 'Libérer le foncier et construire', v: { eco: 35, ecol: 20 }, txt: 'Il faut construire, et vite.' }] },
    { id: 'scandale_gov', scope: 'nat', t: 'Un ministre mis en examen', d: 'L’affaire éclabousse la majorité. La confiance s’effondre.', th: 'institutions', sal: 0.7, cl: {}, gov: -0.05, ch: [{ l: 'Exiger sa démission immédiate', v: { inst: 30 }, txt: 'Exemplarité : il doit démissionner.' }, { l: 'Rappeler la présomption d’innocence', v: { inst: -30 }, txt: 'La présomption d’innocence vaut pour tous.' }] },
    { id: 'agri', scope: 'loc', t: 'Les agriculteurs bloquent la rocade de Grenoble', d: 'Normes, prix, accords de libre-échange : la colère paysanne déborde.', th: 'agriculture', sal: 0.7, cl: { RN: 0.02, LR: 0.02, ECO: -0.01 }, ch: [{ l: 'Soutenir les agriculteurs contre les normes', v: { ecol: 35, souv: 25 }, txt: 'Nos paysans crèvent sous les normes.' }, { l: 'Défendre une transition agricole accompagnée', v: { ecol: -30 }, txt: 'La transition doit se faire avec eux, pas contre eux.' }] },
    { id: 'ia', scope: 'nat', t: 'Plan social : l’IA supprime 4 000 emplois de bureau', d: 'Une grande banque annonce l’automatisation de ses back-offices.', th: 'economie', sal: 0.5, cl: { LFI: 0.01, RN: 0.01 }, ch: [{ l: 'Taxer les robots', v: { eco: -40 }, txt: 'Taxons l’automatisation pour financer la reconversion.' }, { l: 'Miser sur l’innovation et la formation', v: { eco: 30, inst: -10 }, txt: 'On ne freine pas le progrès : on forme.' }] },
    { id: 'emeutes', scope: 'nat', t: 'Nuit d’émeutes dans plusieurs villes', d: 'Voitures brûlées, mairies attaquées. Le ministre parle de « reprise en main ».', th: 'securite', sal: 1, cl: { RN: 0.04, LR: 0.02, LFI: -0.02 }, ch: [{ l: 'Ordre et fermeté', v: { aut: 55 }, txt: 'L’ordre républicain doit être rétabli sans faiblesse.' }, { l: 'Pointer l’abandon des quartiers', v: { aut: -25, eco: -30 }, txt: 'Ces violences disent l’abandon des quartiers.' }] },
    { id: 'europe_dette', scope: 'int', t: 'Bruxelles place la France sous surveillance budgétaire', d: 'Le déficit dérape, la Commission exige un plan de redressement.', th: 'europe', sal: 0.6, cl: { RN: 0.02, REN: -0.02 }, ch: [{ l: 'Respecter nos engagements européens', v: { souv: -35, eco: 25 }, txt: 'La France doit tenir sa parole.' }, { l: 'Refuser le diktat de Bruxelles', v: { souv: 45 }, txt: 'Ce n’est pas à Bruxelles de décider de notre budget.' }] },
    { id: 'rer', scope: 'loc', t: 'Le RER métropolitain grenoblois reporté de cinq ans', d: 'L’État et la Région se renvoient la responsabilité.', th: 'transports', sal: 0.5, cl: {}, ch: [{ l: 'Exiger le financement immédiat', v: { ecol: -30, eco: -15 }, txt: 'Ce RER est vital pour les navetteurs du Voironnais.' }, { l: 'Prioriser les routes et le contournement', v: { ecol: 35 }, txt: 'Les gens ont besoin de routes qui fonctionnent.' }] },
    { id: 'drame_ecole', scope: 'loc', t: 'Agression d’une enseignante dans un collège de Bourgoin', d: 'Le corps enseignant est sous le choc. Le débat sur l’autorité revient.', th: 'education', sal: 0.7, cl: { RN: 0.01, LR: 0.01 }, ch: [{ l: 'Restaurer l’autorité à l’école', v: { aut: 40, soc: 25 }, txt: 'L’autorité des maîtres doit être restaurée.' }, { l: 'Plus d’adultes et de moyens dans les établissements', v: { eco: -30, aut: -10 }, txt: 'Il faut plus d’adultes dans les collèges.' }] },
    { id: 'chomage', scope: 'nat', t: 'Le chômage repasse au-dessus de 8 %', d: 'Mauvais chiffres pour l’exécutif.', th: 'economie', sal: 0.6, cl: {}, gov: -0.04, ch: null },
    { id: 'croissance', scope: 'nat', t: 'Embellie : la croissance surprend à la hausse', d: 'Le gouvernement savoure.', th: 'economie', sal: 0.2, cl: {}, gov: 0.03, ch: null },
    { id: 'jo2030', scope: 'loc', t: 'JO d’hiver 2030 : les surcoûts explosent dans les Alpes', d: 'Les budgets de la Haute-Savoie et de la Savoie dérapent, l’Isère s’inquiète pour ses sites.', th: 'fiscalite', sal: 0.4, cl: { ECO: 0.01 }, ch: [{ l: 'Défendre l’événement et ses retombées', v: { ecol: 30, eco: 15 }, txt: 'Les Jeux sont une chance pour nos vallées.' }, { l: 'Dénoncer un gouffre financier et écologique', v: { ecol: -35, inst: 15 }, txt: 'Ces Jeux sont un gouffre financier et écologique.' }] }
  ];
  if (typeof TB !== 'undefined') { EVENTS.forEach(e => Object.assign(e, TB.EV_META[e.id] || {})); TB.EVENTS.forEach(e => { if (!EVENTS.some(x => x.id === e.id)) EVENTS.push(e); }); }
  const ymOf = d => d.slice(0, 7);
  function evEligible(e, date, wk, last) {
    const m = +date.slice(5, 7); if (e.months && !e.months.includes(m)) return false;
    if (e.to && ymOf(date) > e.to) return false; if (e.from && ymOf(date) < e.from) return false;
    const l = last[e.id]; if (l != null && wk - l < (e.cool || 26)) return false; return true;
  }
  // actualité nationale déterministe : même graine (même partie multijoueur) = mêmes événements aux mêmes dates
  function hrand(seed, a, b) { let x = (seed ^ Math.imul(a + 1, 2654435761) ^ Math.imul(b + 7, 40503)) >>> 0; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0; x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
  // multijoueur : la dissolution spontanée tombe la même semaine pour tous les joueurs (même graine)
  function dissMP() { const s = S(); const wk = Math.floor(diffDays('2026-06-15', s.date) / 7); const from = s.dissWk == null ? wk - 1 : s.dissWk; s.dissWk = wk; for (let w = from + 1; w <= wk; w++) if (hrand(s.seed0 || 12345, w, 71) < 0.0011) return w; return null; }
  function rollEvents(days) {
    const s = S(); const seed = s.seed0 || 12345; const wk = Math.floor(diffDays('2026-06-15', s.date) / 7); if (s.evWeek == null) s.evWeek = wk - Math.max(1, Math.round(days / 7));
    const last = s.evLast = s.evLast || {};
    for (let w = s.evWeek + 1; w <= wk; w++) { const n = (hrand(seed, w, 1) < 0.15 ? 1 : 0) + (hrand(seed, w, 2) < 0.05 ? 1 : 0); const wd = addDays('2026-06-15', w * 7);
      const ym = wd.slice(0, 7); const cnt = s.evMonth = (s.evMonth && s.evMonth.ym === ym) ? s.evMonth : { ym, n: 0 };
      for (let i = 0; i < n && cnt.n < 2; i++) { const pool = EVENTS.filter(e => evEligible(e, wd, w, last)); if (!pool.length) break; cnt.n++; const e = pool[Math.floor(hrand(seed, w, 3 + i) * pool.length)]; last[e.id] = w; applyEvent(e); } }
    s.evWeek = wk;
  }
  function applyEvent(e) {
    const s = S(); const sal = s.national.salience; sal[e.th] = clamp((sal[e.th] || 0) + e.sal, 0, 2);
    for (const k in e.cl) s.national.climate[k] = (s.national.climate[k] || 0) + e.cl[k];
    if (e.gov) { s.national.gov.forEach(k => s.national.climate[k] += e.gov); s.national.approval = clamp((s.national.approval ?? 30) + e.gov * 100, 12, 72); }
    else if (e.scope !== 'loc') s.national.approval = clamp((s.national.approval ?? 30) - e.sal * 0.7, 12, 72);
    if (e.scope !== 'loc') { s.recentEv = (s.recentEv || []).filter(x => x.id !== e.id); s.recentEv.unshift({ id: e.id, t: e.t, d: e.d, th: e.th, date: s.date, custom: e.custom ? e : null }); s.recentEv = s.recentEv.slice(0, 6); }
    log('Actualité : ' + e.t, 'event');
    article(e.scope === 'loc' ? 'dauph' : e.scope === 'int' ? 'quotlib' : pick(['quotlib', 'info24', 'alpes3']), e.t, 0, 'nat', e.d);
    genPosts(2);
    if (e.ch && !(villageScope() && e.scope !== 'loc')) s.queue.push({ kind: 'event', ev: e.id, custom: e.custom ? e : null });
  }
  function evById(id, custom) { return custom || EVENTS.find(x => x.id === id); }
  function reactNational(evId, idx, custom, scope) {
    const s = S(), p = s.p; const e = evById(evId, custom); if (!e || !e.ch) return ''; const c = e.ch[idx]; const sal = s.national.salience[e.th] || 0.3;
    statement(c.txt, e.th, c.v, 1 + sal * 0.6, 'réaction à l’actualité nationale'); addNoto(scope || 'commune', 1.5 + sal * 2);
    const m = scope === 'commune' ? 'dauph' : pick(['dauph', 'radio', 'alpes3']);
    article(m, e.t + ' : ' + p.name + ' réagit depuis l’Isère', 0.1, 'pj', '« ' + c.txt + ' »'); post(p.name, '@' + slug(p.name), c.txt, true, rint(20, 200) + Math.round(p.followers / 15));
    if (p.party !== 'NEW') { const pa = D.PARTIES[p.party].ax; let al = 0; for (const k in c.v) al += Math.sign(c.v[k]) * Math.sign(pa[AXI[k]]); if (al < 0) { const ld = s.pnj[s.national.leaders[p.party]]; if (ld) ld.rel -= 4; p.distance = Math.min(1, (p.distance || 0) + 0.1); } }
    return 'Vous réagissez : « ' + c.txt + ' »';
  }
  function resolveEvent(evId, idx, custom) {
    const e = custom || EVENTS.find(x => x.id === evId); const p = S().p;
    if (idx < 0 || !e.ch) { log('Vous restez silencieux sur : ' + e.t, 'info'); return; }
    const c = e.ch[idx]; statement(c.txt, e.th, c.v, 0.8, 'réaction'); addNoto('circo', 1.5); p.followers += rint(5, 30);
    post(p.name, '@' + slug(p.name), c.txt, true, rint(10, 80) + Math.round(p.followers / 20));
    log('Vous réagissez : « ' + c.txt + ' »', 'info');
  }
  const slug = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').toLowerCase();

  /* ---------- PNJ autonomes ---------- */
  function pnjTick(days) {
    const s = S(), p = s.p; const f = days / 30; const pols = pnjList(x => !['journaliste', 'notable'].includes(x.role));
    // scandales des PNJ
    pols.forEach(x => {
      x.mom *= Math.pow(0.85, f);
      if (x.secrets > 0 && rnd() < 0.006 * f * x.secrets * (1 + (100 - x.traits.scrupules) / 100)) {
        x.secrets--; x.img -= 18; x.mom -= 0.15; x.noto = clamp(x.noto + 10, 0, 100);
        const typ = pick(['des notes de frais injustifiées', 'un emploi familial à la mairie', 'un marché public attribué à un proche', 'des propos racistes enregistrés en privé', 'une condamnation ancienne qu’il·elle avait cachée']);
        article(pick(['revel', 'ventilo', 'dauph']), x.name + ' (' + D.PARTIES[x.party].short + ') mis·e en cause pour ' + typ, -0.6, 'pnj');
        if (x.known) log('Scandale : ' + x.name + ' mis·e en cause pour ' + typ + '.', 'event');
      }
    });
    // transfuges
    pols.filter(x => x.role !== 'leader' && x.traits.ambition > 75 && x.traits.loyaute < 35 && rnd() < 0.01 * f).forEach(x => {
      if ((s.national.climate[x.party] || 0) > -0.05) return;
      const cands = PIDS.filter(k => k !== x.party && k !== 'DIV').sort((a, b) => (wdist(D.PARTIES[a].ax, x.ax, W1) - 30 * (s.national.climate[a] || 0)) - (wdist(D.PARTIES[b].ax, x.ax, W1) - 30 * (s.national.climate[b] || 0)));
      const old = x.party; x.party = cands[0]; article('dauph', x.name + ' quitte ' + D.PARTIES[old].short + ' et rejoint ' + D.PARTIES[x.party].short, 0, 'pnj');
      if (x.known) log('Transfuge : ' + x.name + ' passe de ' + D.PARTIES[old].short + ' à ' + D.PARTIES[x.party].short + '.', 'event');
    });
    // rivalités internes
    if (rnd() < 0.25 * f) { const a = pick(pols), b = pick(pols.filter(x => x.party === a.party && x.id !== a.id)); if (b && a.traits.ambition > 60) { article(pick(['dauph', 'ventilo']), D.PARTIES[a.party].short + ' : ' + a.name + ' et ' + b.name + ' se déchirent en coulisses', -0.2, 'pnj'); } }
    // vendettas et soutiens envers le joueur
    pols.filter(x => x.known).forEach(x => {
      if (x.rel <= -40 && x.traits.rancune > 55 && rnd() < 0.12 * f) {
        const m = pick(['dauph', 'info24', 'ventilo', 'radio']); addImageAll(-2.5); p.cred = clamp(p.cred - 1.5, 0, 100);
        article(m, x.name + ' attaque ' + p.name + ' : « ' + pick(['un opportuniste sans colonne vertébrale', 'un·e apprenti·e sorcier·ère', 'quelqu’un qui ment comme il·elle respire', 'le candidat des coups bas']) + ' »', -0.5, 'pj');
        log(x.name + ' vous attaque publiquement (rancune).', 'bad');
        if (p.casseroles.some(c => !c.out) && rnd() < 0.15) surface(pick(p.casseroles.filter(c => !c.out)), x.name + ' a transmis des éléments à la presse');
      }
      if (x.rel >= 45 && rnd() < 0.06 * f && !x._offered) { x._offered = true; s.queue.push({ kind: 'offer', type: 'soutien', pnj: x.id }); }
    });
    // offres de financement occulte
    if (rnd() < 0.05 * f && (p.cand || p.mandats.length)) s.queue.push({ kind: 'offer', type: 'enveloppe', pnj: (findPnj(x => x.role === 'notable' && x.traits.scrupules < 50) || mkPnj({ role: 'notable', territory: p.communeId, mandat: 'Homme d’affaires', noto: 25 })).id, amount: rint(8, 30) * 1000 });
  }

  /* ---------- casseroles et justice ---------- */
  function casserole(type, label, g, legal, risk) {
    const p = S().p; const c = { id: uid('k'), type, label, g, legal, risk, date: S().date, out: false, known: p.staff.filter(x => rnd() < 0.6).map(x => x.id) };
    p.casseroles.push(c); return c;
  }
  function surface(c, how) {
    const s = S(), p = s.p; if (!c || c.out) return; c.out = true; c.outDate = s.date;
    addImageAll(-3 * c.g); p.cred = clamp(p.cred - 4 * c.g, 0, 100); addNoto('dept', 6 + c.g * 2); p.mom -= 0.06 * c.g;
    const m = pick(['revel', 'ventilo', 'dauph']); article(m, 'Révélations sur ' + p.name + ' : ' + c.label, -0.9, 'pj', how || '');
    log('Une casserole sort dans la presse (' + D.MEDIAS.find(x => x.id === m).name + ') : ' + c.label + '.', 'bad');
    p.staff.forEach(x => x.loy -= c.g * 2);
    if (c.legal) { p.procs.push({ id: uid('j'), cas: c.id, label: c.label, g: c.g, stage: 'enquete', next: addDays(s.date, rint(60, 180)) }); log('Le parquet ouvre une enquête préliminaire.', 'bad'); }
    s.queue.push({ kind: 'info', title: 'Scandale', text: 'La presse révèle : ' + c.label + '. ' + (c.legal ? 'Une enquête judiciaire est ouverte.' : 'L’affaire reste politique, mais votre image en prend un coup.') });
  }
  function casseroleTick(days) {
    const p = S().p; const f = days / 30;
    const invest = pnjList(x => x.role === 'journaliste' && ['revel', 'ventilo'].includes(x.territory)).reduce((a, x) => a + x.appetit / 100, 0);
    p.casseroles.filter(c => !c.out).forEach(c => {
      let pr = c.risk * f * (1 + 0.4 * invest) * (1 - (hasStaff('com') ? 0.2 : 0));
      const leaker = p.staff.find(x => c.known.includes(x.id) && x.loy < 30); if (leaker) pr += 0.06 * f;
      if (rnd() < pr) { const friend = pnjList(y => y.role === 'journaliste' && y.rel >= 40)[0]; if (friend && !c.warned && rnd() < 0.7) { c.warned = true; S().queue.push({ kind: 'leakwarn', cas: c.id, j: friend.id }); } else surface(c, leaker ? 'Un proche de l’équipe aurait parlé.' : ''); }
    });
    // procédures
    p.procs.filter(j => j.stage !== 'clos' && j.next <= S().date).forEach(j => {
      if (j.stage === 'enquete') { j.stage = 'mise_en_examen'; j.next = addDays(S().date, rint(120, 300)); article('revel', p.name + ' mis·e en examen', -0.8, 'pj'); log('Vous êtes mis·e en examen (' + j.label + ').', 'bad'); addImageAll(-3); p.cred -= 4; }
      else if (j.stage === 'mise_en_examen') { j.stage = 'proces'; j.next = addDays(S().date, rint(200, 420)); log('Renvoi devant le tribunal correctionnel.', 'bad'); article('dauph', 'Procès ' + deN(p.name) + ' : l’audience est fixée', -0.4, 'pj'); }
      else if (j.stage === 'proces') {
        const prob = clamp(0.3 + 0.1 * j.g - (hasStaff('juriste') ? 0.18 : 0), 0.05, 0.9);
        if (rnd() < prob) {
          if (j.g >= 3 && rnd() < 0.65) { const yrs = rint(1, 5); const prov = rnd() < 0.5; j.verdict = 'Condamnation : ' + yrs + ' an(s) d’inéligibilité' + (prov ? ' avec exécution provisoire' : ', peine suspendue par votre appel'); if (prov) { p.inelig = addDays(S().date, 365 * yrs); p.mandats = []; p.mairie = null; if (p.cand && typeof MP !== 'undefined' && MP.on()) MP.setWithdraw(p.cand.el, p.cand.key, null); p.cand = null; log('Exécution provisoire : vous perdez tous vos mandats.', 'bad'); } else { j.appel = { yrs }; } }
          else { const am = rint(5, 30) * 1000; p.cash -= am; j.verdict = 'Condamnation : ' + eur(am) + ' d’amende et prison avec sursis'; }
          addImageAll(-4); article('revel', p.name + ' condamné·e', -0.9, 'pj');
        } else { j.verdict = 'Relaxe'; addImageAll(2); p.cred += 3; article('dauph', p.name + ' relaxé·e', 0.4, 'pj'); }
        log('Jugement : ' + j.verdict + '.', j.verdict === 'Relaxe' ? 'good' : 'bad'); j.stage = j.appel ? 'appel' : 'clos'; if (j.appel) j.next = addDays(S().date, rint(240, 420));
        S().queue.push({ kind: 'info', title: 'Jugement', text: j.verdict + '.' + (j.appel ? ' Vous restez éligible jusqu’à l’arrêt de la cour d’appel.' : '') });
      }
      else if (j.stage === 'appel') {
        if (rnd() < 0.65 - (hasStaff('juriste') ? 0.15 : 0)) { const yrs = j.appel.yrs; p.inelig = addDays(S().date, 365 * yrs); j.verdict = 'Condamnation confirmée en appel : ' + yrs + ' an(s) d’inéligibilité'; const had = p.mandats.length; p.mandats = []; p.mairie = null; if (p.cand && typeof MP !== 'undefined' && MP.on()) MP.setWithdraw(p.cand.el, p.cand.key, null); p.cand = null; addImageAll(-2); article('revel', 'Peine confirmée en appel pour ' + p.name, -0.8, 'pj'); log(j.verdict + (had ? ' : vous êtes déchu·e de vos mandats.' : '.'), 'bad'); }
        else { j.verdict = 'Relaxe en appel'; addImageAll(2.5); p.cred += 3; article('dauph', p.name + ' relaxé·e en appel', 0.4, 'pj'); log('La cour d’appel vous relaxe.', 'good'); }
        j.stage = 'clos'; S().queue.push({ kind: 'info', title: 'Cour d’appel', text: j.verdict + '.' });
      }
    });
    // fact-checks différés
    p.factchecks = p.factchecks.filter(fc => {
      if (fc.date > S().date) return true;
      if (rnd() < fc.prob) { p.cred = clamp(p.cred - 5 * fc.g, 0, 100); addImage('CAD', -4 * fc.g); addImage('JUD', -4 * fc.g); addImage('RET', -1.5 * fc.g); addImage('POP', -0.5 * fc.g); article('revel', 'Vérification : l’affirmation ' + deN(p.name) + ' est fausse', -0.6, 'pj', '« ' + fc.text.slice(0, 140) + ' »'); log('Fact-check : un de vos mensonges est démonté (« ' + fc.text.slice(0, 60) + '… »).', 'bad'); }
      return false;
    });
  }
  function lie(text, g) { const p = S().p; const att = (p.noto.circo + p.noto.nat) / 200; p.factchecks.push({ date: addDays(S().date, rint(2, 25)), prob: clamp(0.3 + 0.6 * att, 0.2, 0.9), g: g || 1, text }); }

  /* ---------- accords ---------- */
  const CLAUSES = { desistement: 'Désistement au second tour', soutien: 'Soutien public', place: 'Place sur une liste', poste: 'Poste promis', nonagression: 'Pacte de non-agression' };
  function proposeAccord(pnjId, clauses, offer) {
    const s = S(), p = s.p; const x = s.pnj[pnjId]; const dist = wdist(x.ax, p.ax, W1);
    const interest = (p.noto.circo - x.noto * 0.6) / 2 + (offer || 0) * 12;
    const score = x.rel * 0.6 + interest - dist * 0.35 + (x.traits.ambition > 60 && clauses.includes('poste') ? 15 : 0) + rnd() * 30 - 10;
    if (score > 5) { const a = { id: uid('acc'), with: pnjId, clauses, date: s.date, status: 'actif', offer: offer || 0 }; p.accords.push(a); x.rel += 8; x.known = true; log('Accord conclu avec ' + x.name + ' : ' + clauses.map(c => CLAUSES[c]).join(', ') + '.', 'good'); if (clauses.includes('soutien')) { addNoto('circo', x.noto / 10); p.std += 1; } return { ok: true, msg: x.name + ' accepte : ' + clauses.map(c => CLAUSES[c]).join(', ') + '.' }; }
    x.rel -= 3; return { ok: false, msg: x.name + ' décline poliment. Il faudrait une meilleure relation, plus de poids électoral ou une contrepartie.' };
  }
  function breachBy(pn, a) { a.status = 'rompu'; pn.rel -= 30; log(pn.name + ' trahit votre accord !', 'bad'); article('dauph', 'Coup de poignard : ' + pn.name + ' renie son accord avec ' + S().p.name, -0.2, 'pj'); }
  function betray(accId) {
    const s = S(), p = s.p; const a = p.accords.find(x => x.id === accId); if (!a) return; const x = s.pnj[a.with]; a.status = 'trahi';
    p.cred -= 3; const r = x.traits.rancune; const cyn = x.traits.scrupules < 35 && r < 50;
    x.rel -= cyn ? 25 : r > 65 ? 80 : 50; if (r > 65) x.enemy = true;
    article('dauph', p.name + ' rompt son accord avec ' + x.name, -0.3, 'pj');
    log('Vous rompez l’accord avec ' + x.name + '. ' + (cyn ? 'Il·elle hausse les épaules : les affaires continuent.' : r > 65 ? 'Il·elle jure de se venger.' : 'La relation est durablement abîmée.'), 'bad');
  }

  /* ---------- tour suivant ---------- */
  function endTurn() {
    { const p0 = S().p; if (p0.cumul && addDays(S().date, Math.max(1, Math.ceil(turnDays()))) > p0.cumul.due) { let g = 0; while (cumulConflict() && g++ < 4) resolveCumul(cumulDefault(), true); p0.cumul = null; } if (!p0.cumul) cumulCheck(); }
    const s = S(), p = s.p; s.estPrevBase = s.estBase || null; s.turnCnt = {}; const days = turnDays(); let newDate; if (days === 0.5) { if (s.half) { newDate = addDays(s.date, 1); } else newDate = s.date; } else newDate = addDays(s.date, days); const f = days / 30;
    // finances
    const met = D.METIERS.find(m => m.id === p.metier);
    p.cash += (p.fullTime ? 0 : met.income) * f + indemnities() * 0.2 * f;
    const sal = p.staff.reduce((a, x) => a + x.sal, 0) * f;
    if (sal > 0) { if (p.cand && p.cand.compte && phase().id !== 'hors') { if (!spend(sal, 'Salaires de l’équipe')) { p.staff.forEach(x => x.loy -= 6); log('Vous ne pouvez pas payer votre équipe : la loyauté chute.', 'bad'); } } else if (p.cash >= sal) p.cash -= sal; else { p.staff.forEach(x => x.loy -= 6); log('Salaires impayés : votre équipe gronde.', 'bad'); } }
    // érosion notoriété, image
    const floor = p.mandats.some(m => m.type === 'maire') ? 45 : p.mandats.length ? 25 : 0;
    ['commune', 'circo', 'dept', 'nat'].forEach(k => { p.noto[k] = Math.max(Math.min(p.noto[k], k === 'commune' ? floor : floor / 2), p.noto[k] * Math.pow(0.975, f)); });
    D.SEG_IDS.forEach(id => p.image[id] *= Math.pow(0.965, f));
    p.mom *= Math.pow(0.8, f); if (p.fondN) p.fondN = Math.max(0, p.fondN - 0.5 * f);
    (p.prog || []).forEach(m => m.visib = (m.visib || 0) * Math.pow(0.9, f));
    p.militants = Math.max(0, Math.round(p.militants * Math.pow(0.97, f) + (popularity() > 10 ? f : 0)));
    // climat national
    PIDS.forEach(k => { s.national.climate[k] = s.national.climate[k] * Math.pow(0.97, f) + gauss() * 0.02 * Math.sqrt(f); });
    s.national.gov.forEach(k => s.national.climate[k] -= 0.004 * f);
    s.national.approval = clamp((s.national.approval ?? 30) + (gauss() * 1.5 - 0.15 + (30 - (s.national.approval ?? 30)) * 0.04) * f, 12, 72);
    p.distance = Math.max(0, (p.distance || 0) - 0.02 * f);
    for (const t in s.national.salience) { s.national.salience[t] *= Math.pow(0.8, f); if (s.national.salience[t] < 0.05) delete s.national.salience[t]; }
    // monde
    rollEvents(days); pnjTick(days); rivalTick(days); partyTick(days); if (typeof DP !== 'undefined') DP.situationTick(days); if (typeof LF !== 'undefined') LF.tick(days); if (typeof GV !== 'undefined') { GV.arcTick(days); GV.govTick(days); } s.turns = (s.turns || 0) + 1; if (typeof TM !== 'undefined') TM.tick(days);
    for (const k in (s.zones || {})) (s.zones[k] || []).forEach(z => z.cover *= Math.pow(0.9, f));
    if (p.cand && p.focusZone && typeof TM === 'undefined') { const z = (s.zones || {})[p.cand.key]; const x = z && z.find(y => y.id === p.focusZone); if (x) x.cover = clamp(x.cover + p.militants * 0.35 * f / Math.sqrt(Math.max(0.15, x.w) * 4), 0, 100); } casseroleTick(days); staffTick(days);
    if (days === 0.5) s.half = s.half ? 0 : 1; else s.half = 0;
    s.date = newDate; s.turn++;
    // élections arrivées à échéance
    s.elections.slice().sort((a, b) => nextDate(a) < nextDate(b) ? -1 : 1).forEach(e => { if (e.status !== 'fini' && nextDate(e) <= s.date) runElectionRound(e); });
    // mandats : séances
    mandateTick(days); if (typeof HQ !== 'undefined') HQ.tick(days); if (typeof OF !== 'undefined') OF.tick(days); if (typeof LN !== 'undefined') { try { LN.tick(days); } catch (e) { console.error(e); } }
    const legF = s.elections.find(e => e.type === 'leg' && e.status === 'futur');
    const dW = s.mp ? dissMP() : null; // en multijoueur : semaine tirée de la graine commune, date du scrutin calée sur cette semaine
    if (legF && diffDays(s.date, legF.d1) > 400 && diffDays(s.national.lastDiss, s.date) > 365 && diffDays(s.national.lastLeg || '2024-07-07', s.date) > 365 && (s.mp ? dW != null : rnd() < 0.004 * f * (1 + Math.max(0, -(s.national.climate[s.national.gov[0]] || 0)) * 5))) { let d1 = s.mp ? addDays('2026-06-15', dW * 7 + 35) : addDays(s.date, 35); if (d1 <= addDays(s.date, 7)) d1 = addDays(s.date, 14); const dd = toD(d1); dd.setUTCDate(dd.getUTCDate() + (7 - dd.getUTCDay()) % 7); if (dissolution(fromD(dd)) !== false) s.queue.push({ kind: 'info', title: 'Dissolution', text: 'Le président dissout l’Assemblée nationale. Législatives anticipées le ' + fmtDate(fromD(dd)) + '.' }); }
    // investiture automatique hors parti : rappel
    const ph = phase(); const up = nextElection(e => e.status === 'futur'); if (up && !p.cand && diffDays(s.date, up.d1) <= 200 && diffDays(s.date, up.d1) > 180 - days && (!p.inelig || p.inelig < s.date)) s.queue.push({ kind: 'info', title: up.label, text: 'L’échéance approche (' + fmtDate(up.d1) + '). Vous pouvez déclarer votre candidature depuis le tableau de bord.' });
    // rang au parti, section
    rankUpdate();
    if (p.party !== 'NEW' && !p.secLeader && p.std >= 32 && rnd() < 0.15 * f) s.queue.push({ kind: 'section' });
    // présidentielle : parrainages
    if (s.date.slice(5, 7) === '01' || rnd() < 0.3 * f) publishPolls(); else if (phase().id !== 'hors' && (days >= 3 || rnd() < days / 4)) publishPolls();
    genPosts(rint(2, 4));
    p.hoursMax = p.hours = hoursFor(turnDays());
    const es = estimate(); s.estBase = es ? { el: es.el, pct: es.pct, terms: es.terms || null, ind: indicators() } : null; s.hist = s.hist || []; s.hist.push({ date: s.date, est: es ? Math.round(es.pct * 10) / 10 : null, el: es ? es.el : null, pop: Math.round(popularity()) }); if (s.hist.length > 120) s.hist.shift();
    if (false && !s.endShown) { s.endShown = true; s.queue.push({ kind: 'info', title: 'Bilan de mi-parcours', text: 'Le calendrier de cette version s’arrête après la présidentielle de 2032. La partie continue en bac à sable, sans nouvelle échéance programmée.' }); }
    return days;
  }
  const MISSIONS = {
    terrain: { l: 'Porte-à-porte en votre nom', fit: ['terrain', 'dircamp'], t: 'seg' },
    presse: { l: 'Entretenir la presse', fit: ['com'] },
    reseaux: { l: 'Animer vos réseaux sociaux', fit: ['cm', 'com'] },
    argu: { l: 'Préparer l’argumentaire d’une proposition', fit: ['plume', 'juriste'], t: 'mes' },
    veille: { l: 'Surveiller un adversaire', fit: ['dircamp', 'com'], t: 'rival' },
    fonds: { l: 'Lever des fonds', fit: ['mandataire'] },
    parti: { l: 'Vous représenter au parti', fit: ['dircamp', 'terrain'] },
    enquete: { l: 'Enquêter discrètement sur un rival', fit: ['juriste'], t: 'rival', dirty: true },
    repos: { l: 'Pas de mission', fit: [] }
  };
  function missionTick(days) {
    const s = S(), p = s.p; const f = Math.min(1.5, days / 30) * (phase().id === 'campagne' || phase().id === 'entre2' ? 1.6 : 1); s.turnStaff = [];
    p.staff.forEach(x => {
      const m = x.mission || 'repos'; if (m === 'repos') return; const M = MISSIONS[m]; const k = (x.comp / 70) * (M.fit.includes(x.role) ? 1.35 : 0.8) * f; let r = '';
      if (m === 'terrain' && x.mt && !D.SEG_IDS.includes(x.mt)) { const zz = canvass(x.mt, 'staff'); if (p.cand) p.camp.terrain += 3 * k; r = zz ? 'porte-à-porte : ' + zz.name : 'porte-à-porte'; }
      else if (m === 'terrain') { const seg = x.mt && D.SEG_IDS.includes(x.mt) ? x.mt : 'PERI'; addImage(seg, 2 * k); addNoto(p.cand && p.cand.el && /mun|dep/.test(p.cand.el) ? 'commune' : 'circo', 1.4 * k); if (p.cand) p.camp.terrain += 4 * k; if (rnd() < 0.3 * k) p.militants++; r = 'porte-à-porte auprès des ' + D.SEGS.find(g => g.id === seg).name.toLowerCase(); }
      if (m === 'presse') { const j = pick(pnjList(y => y.role === 'journaliste')); j.rel += 4 * k; j.known = true; if (rnd() < 0.3 * k) { article(j.territory, p.name + ' : l’entourage fait passer les messages', 0.15, 'pj'); addNoto('circo', 1.5); } p.cred = clamp(p.cred + 0.3 * k, 0, 100); r = 'relations presse (' + j.name + ')'; }
      if (m === 'reseaux') { p.followers += Math.round(rint(30, 120) * k); if (p.cand) p.camp.num += 4 * k; addImage('JUD', 1 * k); if (rnd() < 0.08 / k) { addImageAll(-1.5); r = 'réseaux sociaux : un message maladroit fait polémique'; } else r = 'animation des réseaux (+abonnés)'; }
      if (m === 'argu') { const ms = p.prog.find(z => z.id === x.mt) || p.prog.find(z => z.phare && z.status !== 'retiree') || p.prog[0]; if (ms) { ms.cred = clamp(ms.cred + 3 * k, 0, 95); ms.visib = clamp((ms.visib || 0) + 4 * k, 0, 100); (p.expertise = p.expertise || {})[ms.theme] = ((p.expertise || {})[ms.theme] || 0) + 0.3 * k; r = 'argumentaire chiffré sur « ' + ms.resume + ' »'; } else r = 'aucune proposition à documenter'; }
      if (m === 'veille') { const tg = s.pnj[x.mt] || s.pnj[(s.rivals || [])[0]]; if (tg) { tg.spied = s.date; x.intel = tg.name + ' : ambition ' + tg.traits.ambition + ', rancune ' + tg.traits.rancune + ', scrupules ' + tg.traits.scrupules + (tg.secrets ? ', a des choses à cacher' : '') + '.'; r = 'veille sur ' + tg.name; } }
      if (m === 'fonds') { const amt = Math.round((800 + p.noto.circo * 40 + p.militants * 20) * k * (0.6 + rnd() * 0.8)); if (p.cand && p.cand.compte && x.role === 'mandataire') { p.cand.compte.dons += amt; p.cand.compte.recettes += amt; r = 'collecte : ' + eur(amt) + ' de dons sur le compte de campagne'; } else { p.cash += Math.round(amt * 0.6); r = 'collecte : ' + eur(Math.round(amt * 0.6)) + ' pour le mouvement'; } }
      if (m === 'parti') { if (p.party !== 'NEW') { p.fedSup = clamp(p.fedSup + 0.8 * k, 0, 100); addStd(0.8 * k); r = 'présence dans les instances du parti'; } else { p.militants += Math.round(2 * k); r = 'structuration du mouvement'; } }
      if (m === 'enquete') { const tg = s.pnj[x.mt] || s.pnj[(s.rivals || [])[0]]; if (tg) { if (tg.secrets > 0 && rnd() < 0.25 * k + tg.secrets * 0.08) { const lab = pick(['notes de frais douteuses', 'emploi d’un proche', 'arriérés fiscaux', 'marché public attribué à un ami']); p.dossiers.push({ id: uid('d'), on: tg.id, label: lab, g: rint(1, 3), date: s.date }); r = 'enquête : un dossier sur ' + tg.name + ' (' + lab + ')'; } else r = 'enquête sur ' + tg.name + ' : rien pour l’instant'; if (rnd() < (100 - x.disc) / 400) { casserole('espionnage', 'une enquête clandestine sur ' + tg.name + ' menée par votre équipe', 2, true, 0.05); r += ' (des traces ont été laissées)'; } x.loy -= 1; } }
      if (r) s.turnStaff.push(x.name + ' — ' + r);
      x.loy = clamp(x.loy + (M.fit.includes(x.role) ? 0.3 : -0.4) * f, 0, 100);
    });
  }
  function staffTick(days) {
    const p = S().p; const f = days / 30; missionTick(days);
    p.staff.slice().forEach(x => {
      x.loy = clamp(x.loy + (popularity() > 0 ? 0.5 : -0.5) * f, 0, 100);
      if (x.loy < 22 && x.amb > 55 && rnd() < 0.25 * f) {
        p.staff = p.staff.filter(y => y.id !== x.id); const rival = pick(pnjList(y => ['depute', 'maire', 'candidat'].includes(y.role) && y.territory === 'c' + p.circo)) || null;
        log(x.name + ' (' + D.STAFF_ROLES[x.role].l + ') quitte votre équipe' + (rival ? ' pour rejoindre ' + rival.name : '') + '.', 'bad');
        if (rival) article('dauph', 'Mercato : ' + x.name + ' quitte ' + p.name + ' pour ' + rival.name, -0.2, 'pj');
        p.casseroles.filter(c => c.known.includes(x.id) && !c.out).forEach(c => c.risk += 0.05);
      }
    });
  }
  const COUNCIL = [
    ['Budget primitif : hausse de 2 % des tarifs de la cantine', { eco: 20 }, 'education'], ['Installation de 20 caméras de vidéoprotection', { aut: 40 }, 'securite'],
    ['Passage de 30 % des menus de cantine en bio et local', { ecol: -30 }, 'ecologie'], ['Vente d’un terrain communal à un promoteur', { eco: 35, ecol: 20 }, 'logement'],
    ['Création d’une police municipale armée', { aut: 50 }, 'securite'], ['Baisse de l’éclairage public la nuit', { ecol: -30 }, 'ecologie'],
    ['Subvention à une association d’aide aux migrants', { souv: -35 }, 'immigration'], ['Gel des impôts locaux', { eco: 25 }, 'fiscalite']
  ];
  const TEXTES = [
    ['Projet de loi de finances : tranche d’impôt supplémentaire sur les hauts revenus', { eco: -40 }, 'fiscalite'], ['Proposition de loi sur l’aide à mourir', { soc: -45 }, 'societe'],
    ['Projet de loi immigration et intégration', { souv: 45 }, 'immigration'], ['Report de l’âge légal de départ à 65 ans', { eco: 40 }, 'economie'],
    ['Loi d’urgence agricole : moratoire sur les normes environnementales', { ecol: 40 }, 'agriculture'], ['Loi de programmation de la sécurité intérieure', { aut: 45 }, 'securite'],
    ['Instauration du référendum d’initiative citoyenne', { inst: 45 }, 'institutions'], ['Loi climat : interdiction des chaudières fioul en 2030', { ecol: -45 }, 'ecologie']
  ];
  function mandateTick(days) {
    const p = S().p; if (rnd() > Math.min(1, days / 30)) return;
    if (typeof OF === 'undefined' && p.mandats.some(m => ['conseiller_municipal', 'adjoint', 'maire'].includes(m.type))) { const c = pick(COUNCIL); S().queue.push({ kind: 'vote', ctx: 'Conseil municipal', text: c[0], v: c[1], th: c[2] }); }
    if (typeof OF === 'undefined' && hasMandat('depute') && rnd() < 0.85) { const t = pick(TEXTES); const pa = p.party !== 'NEW' ? D.PARTIES[p.party].ax : null; let line = null; if (pa) { let d = 0; for (const k in t[1]) d += Math.sign(t[1][k]) * Math.sign(pa[AXI[k]]); line = d > 0 ? 'pour' : 'contre'; } S().queue.push({ kind: 'vote', ctx: 'Assemblée nationale', text: t[0], v: t[1], th: t[2], line }); }
    if (p.mairie) { const m = p.mairie; m.invest = Math.round(commune().pop * 320 * (1 + (m.tf - 38) / 40)); }
  }
  function resolveVote(q, choice) {
    const p = S().p; const sign = choice === 'pour' ? 1 : choice === 'contre' ? -1 : 0;
    if (sign) { const v = {}; for (const k in q.v) v[k] = q.v[k] * sign; statement((choice === 'pour' ? 'Vote pour : ' : 'Vote contre : ') + q.text, q.th, v, 0.6, q.ctx); }
    if (q.line && choice !== q.line) { p.std = clamp(p.std - 5, 0, 100); log('Vous votez contre la consigne de votre groupe : poids interne −5.', 'bad'); }
    else if (q.line) p.std = clamp(p.std + 1, 0, 100);
    addNoto(q.ctx === 'Assemblée nationale' ? 'circo' : 'commune', 1);
    log(q.ctx + ' : vote « ' + choice + ' » sur ' + q.text + '.', 'info');
  }

  return { villageScope, thArt, de: deN, gtxt, cumulConflict, cumulCheck, resolveCumul, cumulDefault, cumulLabel, invOdds, invBase, sortantPart, petite, village, petiteKey, myPetite, DF, fresh, DIFF, indicators, pjTerms, peekDue, computeShared, pjCand, nextDate, rnd, rint, pick, clamp, gauss, uid, addDays, diffDays, fmtDate, eur, pct, AXI, CLAUSES, EVENTS, unit, vote, mkPnj, pnjList, findPnj, cadre, mayorOf, commune, newGame, phase, turnDays, hoursFor, nextElection, nextDate, electionUnit, TYPE_LABEL, declare, withdrawCand, investiture, endTurn, resolveEvent, applyEvent, statement, addImage, addImageAll, addNoto, popularity, hasStaff, eff, spend, addStd, plafond, log, article, post, genPosts, casserole, surface, lie, proposeAccord, betray, pollLocal, trueIntentions, resolveVote, indemnities, wdist, vecFrom, alignment, slug, rankUpdate, W1, pjCand, buildCandsPreview, runElectionRound, dissolution, estimate, rivalResolve, progEffect, natWindow, MISSIONS, daysLeft, silence, toD, fromD, PIDS, zonesFor, fieldEffect, zoneLean, canvass, reactNational, evById, natTerm, partyResolve, partyFigures, PROLE, LIST_T, LIST_SEATS, listPos };
})();
