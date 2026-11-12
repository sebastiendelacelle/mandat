/* Mandat — équipe de campagne : militants, consignes, motivation, appui du parti */
const TM = (() => {
  const S = () => G.S, P = () => G.S.p;
  const R = () => E.rnd();
  const TASKS = {
    porte: { l: 'Porte-à-porte', d: 'Couvre le secteur prioritaire, gagne des électeurs un par un' },
    tract: { l: 'Tracts et marchés', d: 'Notoriété rapide, présence visible' },
    phoning: { l: 'Phoning', d: 'Fait voter vos sympathisants le jour J' },
    affiches: { l: 'Collage d’affiches', d: 'Visibilité ; accrochages possibles avec les colleurs adverses' },
    web: { l: 'Relais en ligne', d: 'Partages et vidéos : jeunes et actifs' }
  };
  const KEYS = Object.keys(TASKS);
  function team() {
    const p = P();
    if (!p.team) p.team = { motiv: 60, skill: 0, alloc: { porte: 40, tract: 30, phoning: 10, affiches: 10, web: 10 }, renforts: 0, renfortsUntil: null, renfortsAsked: null, rallonge: null, hist: [] };
    return p.team;
  }
  function active() { const p = P(); if (!p.cand) return false; const ph = E.phase().id; return ph === 'campagne' || ph === 'entre2' || E.daysLeft() <= 150; }
  function force() { const t = team(); return P().militants + (t.renforts || 0); }
  function notoKey() { const t = X.curType(); return t === 'mun' || t === 'dep' ? 'commune' : t === 'leg' ? 'circo' : t === 'pres' || t === 'euro' ? 'nat' : 'dept'; }
  function setAlloc(k, delta) {
    const a = team().alloc; const nv = Math.max(0, Math.min(100, a[k] + delta)); const d = nv - a[k]; if (!d) return;
    a[k] = nv; let rest = -d;
    const others = KEYS.filter(x => x !== k).sort((x, y) => d > 0 ? a[y] - a[x] : a[x] - a[y]);
    for (const o of others) { if (!rest) break; const take = rest < 0 ? Math.max(rest, -a[o]) : rest; a[o] += take; rest -= take; }
  }
  const PRESETS = {
    equilibre: { l: 'Équilibré', a: { porte: 40, tract: 30, phoning: 10, affiches: 10, web: 10 } },
    terrain: { l: 'Tout terrain', a: { porte: 60, tract: 30, phoning: 0, affiches: 10, web: 0 } },
    visibilite: { l: 'Se faire connaître', a: { porte: 10, tract: 40, phoning: 0, affiches: 30, web: 20 } },
    sprint: { l: 'Sprint final', a: { porte: 30, tract: 10, phoning: 50, affiches: 0, web: 10 } }
  };
  function preset(id) { team().alloc = Object.assign({}, PRESETS[id].a); }

  function tick(days) {
    const s = S(), p = P(); if (!active()) { if (p.team) p.team.renforts = 0; return; }
    const t = team(); const f = Math.min(2, days / 7); const camp = E.phase().id !== 'hors';
    if (t.renfortsUntil && s.date >= t.renfortsUntil) { t.renforts = 0; t.renfortsUntil = null; E.log('Les renforts de la fédération repartent.', 'info'); }
    const eff = (1 + t.skill / 200) * (E.hasStaff('terrain') ? 1.2 : 1) * (E.hasStaff('dircamp') ? 1.1 : 1) * (typeof HQ !== 'undefined' ? HQ.terrainK() : 1);
    const pw = force() * t.motiv / 100 * f * eff; const a = t.alloc; const nk = notoKey(); const nkf = { commune: 1, circo: 0.8, dept: 0.5, nat: 0.2 }[nk] || 1;
    const out = {};
    if (pw > 0) {
      // porte-à-porte : secteur prioritaire (ou le moins couvert)
      const zs = E.zonesFor(p.cand.key); const fp = pw * a.porte / 100;
      if (zs && fp > 0) { const z = zs.find(x => x.id === p.focusZone) || zs.slice().sort((x, y) => x.cover - y.cover)[0]; z.cover = E.clamp(z.cover + fp * 0.45 / Math.sqrt(Math.max(0.15, z.w) * 4), 0, 100); D.SEG_IDS.forEach((g, i) => { if (z.mix[i] > 0.12) E.addImage(g, Math.min(1.2, fp * 0.02) * z.mix[i]); }); out.porte = z.name; }
      p.camp.terrain += fp * 0.25;
      const ft = pw * a.tract / 100; if (ft > 0) { E.addNoto(nk, Math.min(2.5, ft * 0.05) * nkf); p.camp.terrain += ft * 0.15; }
      const fph = pw * a.phoning / 100; if (fph > 0) p.camp.mobil = (p.camp.mobil || 0) + fph * 0.5;
      const fa = pw * a.affiches / 100; if (fa > 0) { E.addNoto(nk, Math.min(1.5, fa * 0.04) * nkf); p.camp.medias += fa * 0.2;
        if (camp && R() < Math.min(0.25, 0.02 * fa)) { const rv = (s.rivals || []).map(id => s.pnj[id]).filter(Boolean)[0]; if (rv) { if (R() < 0.5) { t.motiv = E.clamp(t.motiv + 4, 0, 100); E.log('Nuit de collage tendue : vos militants recouvrent les affiches de ' + rv.name + '.', 'info'); } else { t.motiv = E.clamp(t.motiv - 5, 0, 100); rv.rel = E.clamp(rv.rel - 4, -100, 100); E.article('dauph', 'Altercation entre colleurs d’affiches de ' + p.name + ' et de ' + rv.name, -0.1, 'pj'); if (typeof LF !== 'undefined') LF.sms('Un militant', 'On s’est fait bousculer par l’équipe de ' + rv.name + ' cette nuit pendant le collage. Personne de blessé mais tout le monde est remonté.', [{ l: 'Porter plainte', cred: 0.5, mot: 6, res: 'Plainte déposée. La presse locale en parle.' }, { l: 'On calme le jeu', res: 'Vos militants auraient aimé plus de soutien.' }], { role: 'Militant' }); } } } }
      const fw = pw * a.web / 100; if (fw > 0) { p.camp.num += fw * 0.2; E.addImage('JUD', Math.min(0.8, fw * 0.015)); E.addImage('CAD', Math.min(0.5, fw * 0.01)); }
    }
    // motivation : élan, encadrement, fatigue
    const es = s.est; const hist = (s.hist || []).filter(x => es && x.el === es.el).map(x => x.est); const trend = hist.length > 1 ? hist[hist.length - 1] - hist[hist.length - 2] : 0;
    const base = 52 + trend * 4 + (E.hasStaff('dircamp') ? 8 : 0) + (E.hasStaff('terrain') ? 6 : 0) + ((p.traits.terrain ?? 50) - 50) / 6 + (p.mom || 0) * 30;
    const fatigue = camp ? (E.daysLeft() < 21 ? 1.4 : 0.8) : 0.3;
    t.motiv = E.clamp(t.motiv + ((base - t.motiv) * 0.08 - fatigue) * f, 5, 100);
    if (t.motiv < 30 && p.militants > 3) { const lost = Math.max(1, Math.round(p.militants * 0.05 * f)); p.militants -= lost; if (R() < 0.35 && typeof LF !== 'undefined') LF.sms('Une militante', pick(['On est épuisés. Trois week-ends de suite sur les marchés et personne ne nous dit merci.', 'Franchement, on ne sait plus où on va. Les consignes changent tout le temps.', 'Plusieurs d’entre nous ne viendront pas samedi. Le moral est au plus bas.']), [{ l: 'Organiser un pot pour remercier', cash: -200, mot: 10, res: 'Ça ne règle pas tout, mais ça aide.' }, { l: 'Promettre un point d’étape', mot: 3, res: 'Elle attend de voir.' }], { role: 'Militante' }); }
    else if (t.motiv > 72) p.militants += Math.round(p.militants * 0.025 * f + (R() < 0.4 * f ? 1 : 0));
    t.last = { pw: Math.round(pw), out };
  }
  const pick = a => a[Math.floor(R() * a.length)];

  // gestes du candidat
  function pay(h, cost) { const p = P(); if (p.hours < h) return 'Il faut ' + h + ' h.'; if (cost && !E.spend(cost, 'Vie militante')) return 'Pas assez d’argent.'; p.hours -= h; return null; }
  function pot() { const t0 = team(); if (t0.lastPot && E.diffDays(t0.lastPot, S().date) < 7) return { ok: false, msg: 'Le dernier pot date de moins d’une semaine.' }; const e = pay(2, 250); if (e) return { ok: false, msg: e }; const t = team(); t.lastPot = S().date; t.motiv = E.clamp(t.motiv + 12 * (110 - t.motiv) / 100, 0, 100); const n = R() < 0.6 ? 1 : 2; P().militants += n; return { ok: true, msg: 'Un pot au local : les langues se délient, l’ambiance remonte. ' + n + ' sympathisant(s) prennent leur carte de militant.' }; }
  function formation() { const e = pay(3, 0); if (e) return { ok: false, msg: e }; const t = team(); t.skill = Math.min(100, t.skill + 15); t.motiv = E.clamp(t.motiv + 3, 0, 100); return { ok: true, msg: 'Formation des militants : argumentaire, porte-à-porte, gestion des électeurs hostiles. Ils seront plus efficaces.' }; }
  function reunion() { const e = pay(2, 0); if (e) return { ok: false, msg: e }; const t = team(); const ch = ((P().traits.terrain ?? 50) - 50) / 10; t.motiv = E.clamp(t.motiv + (7 + ch) * (110 - t.motiv) / 100, 0, 100); return { ok: true, msg: 'Réunion de mobilisation : vous fixez le cap et remerciez chacun. Les militants repartent gonflés à bloc.' }; }
  function renforts() {
    const s = S(), p = P(), t = team(); if (p.party === 'NEW') return { ok: false, msg: 'Votre mouvement n’a pas de fédération : vos militants sont vos seules forces.' };
    if (!p.cand.invested) return { ok: false, msg: 'Candidat·e dissident·e : la fédération ne vous enverra personne.' };
    if (t.renfortsAsked && E.diffDays(t.renfortsAsked, s.date) < 30) return { ok: false, msg: 'Vous avez déjà demandé des renforts ce mois-ci.' };
    const e = pay(1, 0); if (e) return { ok: false, msg: e }; t.renfortsAsked = s.date;
    const sc = p.fedSup + (p.std || 0) / 2 + (R() - 0.5) * 30;
    if (sc < 35) { p.fedSup = E.clamp(p.fedSup - 2, 0, 100); return { ok: true, msg: 'La fédération répond qu’elle n’a personne à vous envoyer : les autres candidats sont prioritaires. Votre poids dans le parti ne suffit pas encore.' }; }
    const n = Math.round(4 + p.fedSup / 6 + D.PARTIES[p.party].wealth * 6); t.renforts = n; t.renfortsUntil = E.addDays(s.date, 21); E.addStd(-1);
    return { ok: true, msg: 'La fédération vous envoie ' + n + ' militants d’autres sections pour trois semaines.' };
  }
  function rallonge() {
    const s = S(), p = P(), t = team(); if (p.party === 'NEW' || !p.cand.invested) return { ok: false, msg: 'Seul un parti peut financer votre campagne : vous n’êtes pas investi·e.' };
    if (t.rallonge === p.cand.el) return { ok: false, msg: 'Le trésorier a déjà été sollicité pour cette campagne.' };
    const e = pay(1, 0); if (e) return { ok: false, msg: e }; t.rallonge = p.cand.el;
    const c = p.cand.compte; const sc = p.fedSup + (s.est ? s.est.pct : 10) + (R() - 0.5) * 30;
    if (sc < 45) return { ok: true, msg: 'Le trésorier national refuse : « Les sondages ne justifient pas d’investir davantage dans cette circonscription. »' };
    const amt = Math.round((c.plafond || 8000) * 0.12 * D.PARTIES[p.party].wealth * (sc > 70 ? 1.5 : 1)); c.aide += amt; c.recettes += amt; p.fedSup = E.clamp(p.fedSup - 3, 0, 100);
    return { ok: true, msg: 'Le parti verse une rallonge de ' + E.eur(amt) + ' sur votre compte de campagne.' };
  }
  return { TASKS, KEYS, PRESETS, team, active, force, setAlloc, preset, tick, pot, formation, reunion, renforts, rallonge };
})();
if (typeof window !== 'undefined') window.TM = TM;
