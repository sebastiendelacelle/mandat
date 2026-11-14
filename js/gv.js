/* Mandat — progression (jalons, objectifs réalistes, guide), récit (mémoire, némésis, mentor, traître, promesses)
   et exercice du pouvoir (bilan, budget annuel, vote du budget de l’État, interpellations) */
const GV = (() => {
  const S = () => G.S, P = () => G.S.p, R = () => E.rnd();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = a => a[Math.floor(R() * a.length)];
  const cnt = k => ((S().cnt || {})[k] || 0);
  const hasM = t => P().mandats.some(m => m.type === t);

  /* ===== jalons ===== */
  const MS = [
    { id: 'terrain', t: 'Premier pas sur le terrain', x: 'Faites une action de terrain.', test: () => cnt('porte') + cnt('marche') + cnt('asso') + cnt('appart') > 0, rw: p => { p.militants += 2; return '+2 militants'; } },
    { id: 'presse', t: 'On parle de vous', x: 'Obtenez trois articles dans la presse.', test: () => S().news.filter(n => n.about === 'pj').length >= 3, rw: () => { E.addNoto('commune', 3); return '+3 notoriété locale'; } },
    { id: 'connu', t: 'Visage connu', x: 'Atteignez 20 de notoriété dans votre commune.', prog: () => P().noto.commune / 20, test: () => P().noto.commune >= 20, rw: () => { E.addStd(2); return 'Poids au parti +2'; } },
    { id: 'section', t: 'Pilier de section', x: 'Devenez militant·e actif·ve dans votre parti.', test: () => P().party !== 'NEW' && (P().prole || 0) >= 1, skip: () => P().party === 'NEW', rw: p => { p.cash += 500; return '+500 € de réseau'; } },
    { id: 'candidat', t: 'Dans l’arène', x: 'Déclarez votre première candidature.', test: () => !!P().cand || P().mandats.length > 0, rw: p => { p.militants += 3; return '+3 militants'; } },
    { id: 'eligible', t: 'Place éligible', x: 'Figurez en position éligible sur une liste, ou menez la vôtre.', test: () => { const c = P().cand; return !!c && (c.mode === 'tete' || (c.listPos && c.listPos <= 8)); }, rw: () => { E.addStd(3); return 'Poids au parti +3'; } },
    { id: 'debat', t: 'Bête de plateau', x: 'Gagnez un débat ou réussissez une interview.', test: () => cnt('debateWin') > 0, rw: p => { p.mediaTraining = (p.mediaTraining || 0) + 0.5; return 'Aisance médiatique +'; } },
    { id: 'objectif', t: 'Pari tenu', x: 'Atteignez votre objectif de score à une élection.', test: () => cnt('targetHit') > 0, rw: p => { p.mom += 0.03; return 'Dynamique +'; } },
    { id: 'dix', t: 'Barre des 10 %', x: 'Faites au moins 10 % à une élection.', test: () => (S().results || []).some(r => r.snapshot.some(sn => sn.rows.some(x => x.pj && x.pct >= 10))), rw: () => { E.addNoto('circo', 4); return '+4 notoriété dans la circonscription'; } },
    { id: 'elu', t: 'Premier mandat', x: 'Soyez élu·e, même conseiller·ère municipal·e.', test: () => P().mandats.length > 0, rw: p => { p.cred = clamp(p.cred + 5, 0, 100); return 'Crédibilité +5'; } },
    { id: 'cinquante', t: 'Une vraie équipe', x: 'Réunissez 50 militants.', prog: () => P().militants / 50, test: () => P().militants >= 50, rw: () => { E.addStd(2); return 'Poids au parti +2'; } },
    { id: 'secretaire', t: 'Secrétaire de section', x: 'Prenez la tête de votre section.', test: () => (P().prole || 0) >= 2, skip: () => P().party === 'NEW', rw: p => { p.militants += 5; return '+5 militants'; } },
    { id: 'maire', t: 'Le fauteuil de maire', x: 'Devenez maire.', test: () => hasM('maire'), rw: () => { E.addNoto('circo', 6); return '+6 notoriété dans la circonscription'; } },
    { id: 'promesse', t: 'Parole tenue', x: 'Tenez une promesse faite pendant une campagne.', test: () => (P().promises || []).some(x => x.kept), rw: p => { p.cred = clamp(p.cred + 4, 0, 100); return 'Crédibilité +4'; } },
    { id: 'federal', t: 'Patron·ne de la fédération', x: 'Devenez premier·ère fédéral·e.', test: () => (P().prole || 0) >= 3, skip: () => P().party === 'NEW', rw: () => { E.addNoto('dept', 6); return '+6 notoriété départementale'; } },
    { id: 'depute', t: 'Au Palais-Bourbon', x: 'Devenez député·e.', test: () => hasM('depute'), rw: () => { E.addNoto('nat', 6); return '+6 notoriété nationale'; } },
    { id: 'chef', t: 'Chef·fe de parti', x: 'Prenez la tête de votre parti.', test: () => (P().prole || 0) >= 5, skip: () => P().party === 'NEW', rw: () => { E.addNoto('nat', 8); return '+8 notoriété nationale'; } },
    { id: 'elysee', t: 'L’Élysée', x: 'Soyez élu·e président·e de la République.', test: () => hasM('president'), rw: () => 'Fin de partie ? À vous de durer.' }
  ];
  function msList() { const s = S(); s.ms = s.ms || {}; return MS.filter(m => !(m.skip && m.skip())).map(m => Object.assign({ done: !!s.ms[m.id], date: s.ms[m.id] }, m)); }
  function nextMs(n) { return msList().filter(m => !m.done).slice(0, n || 3); }
  function check() {
    const s = S(), p = P(); s.ms = s.ms || {}; const got = [];
    if (p.cand && !p.cand.target && s.est && s.est.el === p.cand.el && !s.est.hypo && p.cand.mode !== 'colistier') p.cand.target = Math.max(3, Math.round(s.est.pct + 2.5));
    MS.forEach(m => { if (s.ms[m.id] || (m.skip && m.skip())) return; let ok = false; try { ok = m.test(); } catch (e) { ok = false; } if (ok) { s.ms[m.id] = s.date; const r = m.rw(p); got.push({ t: m.t, r }); E.log('Objectif atteint : ' + m.t + ' (' + r + ').', 'good'); } });
    return got;
  }

  /* ===== guide du premier mois ===== */
  const START_L = { habitant: 'habitant·e engagé·e', militant: 'simple militant·e', adjoint: 'adjoint·e au maire', notable: 'personnalité locale', opposition: 'élu·e d’opposition' };
  const GUIDE = [
    { t: 'Le but du jeu', x: () => { const p = S().p; const c = E.commune(); const vil = c.pop < 3500; return 'Conquérir puis exercer le pouvoir, de la mairie jusqu’à l’Élysée. Vous démarrez comme ' + (START_L[vil && S().start === 'militant' ? 'habitant' : S().start] || 'militant·e') + ' à ' + c.name + (vil ? ' (' + c.pop.toLocaleString('fr-FR') + ' habitants). Première étape : devenir maire. Ici, règles simplifiées : pas d’investiture, pas d’étiquette, une liste d’habitants. Ensuite viendront le parti, les médias et les grandes élections.' : '.') + ' Le jeu alterne deux temps : la conquête (une campagne : équipe, programme, terrain, débats) et l’exercice (un mandat : dossiers, budget, votes).'; }, next: 'Compris' },
    { t: 'Votre prochain rendez-vous', x: () => { const e = E.nextElection(); if (!e) return 'Aucune élection en vue : construisez votre réseau et votre notoriété.'; const d = E.diffDays(S().date, e.d1); if (e.type === 'mun' && E.myPetite()) return e.label + ', dans ' + d + ' jours. D’ici là : faites-vous connaître des habitants (porte-à-porte, fêtes, marché), écrivez un projet simple pour le village, et préparez votre liste : ' + Math.max(5, D.councilSize(E.commune().pop) - (E.commune().pop < 1000 ? 2 : 0)) + ' noms au minimum, en alternant femmes et hommes. La candidature s’ouvre sept mois avant le scrutin, dans le deuxième onglet (🗳).'; return e.label + ', dans ' + d + ' jours. D’ici là : faites-vous connaître (terrain, presse, réseaux), gagnez du poids dans votre parti pour être investi·e, et préparez un programme. La candidature s’ouvre sept mois avant le scrutin, dans le deuxième onglet (🗳).'; }, next: 'Compris' },
    { t: 'Dépensez vos heures', x: 'Chaque tour vous donne des heures (en haut). Ouvrez le deuxième onglet et choisissez des actions, ou « Composer mon agenda » pour remplir la semaine d’un geste.', go: 'agir', done: () => Object.values(S().cnt || {}).some(v => v > 0) },
    { t: 'Passez au tour suivant', x: 'Quand vos heures sont dépensées, appuyez sur le gros bouton rouge en bas. Le temps avance, vos adversaires agissent, la presse réagit.', done: () => (S().turns || 0) >= 1 },
    { t: 'Le déroulé d’une partie', x: () => E.myPetite() ? '1. Faites-vous connaître au village (associations, marché, porte-à-porte). 2. Sept mois avant le scrutin, déclarez-vous dans l’onglet 🗳. 3. Montez votre liste et écrivez votre projet : la Feuille de route, sur l’accueil, vous guide pas à pas. 4. Campagne de terrain jusqu’au vote. 5. Élu·e maire, vous passez au Bureau : dossiers, budget, conseil municipal.' : '1. Faites-vous connaître et prenez du poids dans votre parti. 2. Sept mois avant le scrutin, déclarez-vous dans l’onglet 🗳 et obtenez l’investiture. 3. Choisissez une direction de campagne, publiez un programme : la Feuille de route, sur l’accueil, vous guide. 4. Campagne de terrain, presse, débats. 5. Élu·e, vous passez au Bureau : dossiers, budget, votes.', next: 'Compris' },
    { t: 'Comprendre ce qui bouge', x: 'La carte « Pourquoi ça bouge » détaille l’évolution de votre score : vos actions, le climat national, vos adversaires. Les objectifs de carrière en bas de l’accueil vous donnent des caps intermédiaires.', next: 'Terminer le guide' }
  ];
  function guide() { const s = S(); if (s.tuto == null) s.tuto = 0; if (s.tuto >= GUIDE.length) return null; const g = GUIDE[s.tuto]; if (g.done && g.done()) { s.tuto++; return guide(); } return Object.assign({ i: s.tuto, n: GUIDE.length }, g, { x: typeof g.x === 'function' ? g.x() : g.x }); }
  function guideNext(skip) { const s = S(); s.tuto = skip ? GUIDE.length : (s.tuto || 0) + 1; }

  /* ===== profils de départ ===== */
  function applyStart(start) {
    const s = S(), p = P(); const com = E.commune(); s.start = start || 'militant';
    if (com.pop < 3500) { p.noto.commune = Math.max(p.noto.commune, Math.round(34 - Math.log10(com.pop) * 4)); }
    if (start === 'adjoint') {
      if (p.party === 'NEW') { p.mandats.push({ type: 'conseiller_municipal', label: 'Conseiller·ère municipal·e d’opposition (' + com.name + ')', since: s.date, ind: 0, majority: false }); }
      else { p.mandats.push({ type: 'adjoint', label: 'Adjoint·e au maire ' + E.de(com.name), since: s.date, ind: D.adjIndemnity(com.pop), majority: true }); p.prole = Math.max(p.prole || 0, 1); }
      p.noto.commune = Math.max(p.noto.commune, 34); p.noto.circo = Math.max(p.noto.circo, 12); p.cred = clamp(p.cred + 6, 0, 100); E.addStd(6); D.SEG_IDS.forEach(g => E.addImage(g, 3));
      addBilan('Six ans d’adjoint·e : bilan contrasté', 2, 'mandat');
    } else if (start === 'opposition') {
      p.mandats.push({ type: 'conseiller_municipal', label: 'Conseiller·ère municipal·e d’opposition (' + com.name + '), chef·fe de file', since: s.date, ind: 0, majority: false }); p.oppLeader = true;
      p.noto.commune = Math.max(p.noto.commune, 30); p.noto.circo = Math.max(p.noto.circo, 8); p.cred = clamp(p.cred + 4, 0, 100); E.addStd(4); ['POP', 'PERI', 'JUD'].forEach(g => E.addImage(g, 2)); p.militants += 4;
      addBilan('Six ans d’opposition : des combats menés', 1, 'mandat');
    } else if (start === 'notable') {
      p.noto.commune = Math.max(p.noto.commune, 38); p.noto.circo = Math.max(p.noto.circo, 14); p.cash += 15000; p.cred = clamp(p.cred + 8, 0, 100); p.militants += 8;
      ['POP', 'RET', 'CAD'].forEach(g => E.addImage(g, 6)); p.notable = true;
    }
  }

  // La partie commence par la campagne : mode débutant (simplifié) ou expérimenté (complet)
  function startCampaign(mode) {
    const s = S(), p = P(); s.mode = mode === 'complet' ? 'complet' : 'simple'; E.fastForward();
    const el = E.nextElection(e => e.type === 'mun') || E.nextElection();
    if (s.mode === 'simple') {
      p.noto.commune = Math.max(p.noto.commune, 26); p.noto.circo = Math.max(p.noto.circo, 6); p.militants += 6; p.cred = clamp(p.cred + 4, 0, 100);
      if (el) { p.preInv = Object.assign({}, p.preInv, { [el.id]: true }); const r = E.declare(el.id, 'tete'); if (!p.cand) E.declare(el.id, 'dissident'); if (p.cand) p.cand.invested = true; }
      if (!p.staff.some(x => x.role === 'mandataire') && !E.myPetite()) { const g = E.rnd() < 0.5 ? 'F' : 'M'; p.staff.push({ id: E.uid('st'), role: 'mandataire', g, name: (g === 'F' ? E.pick(D.FIRST_F) : E.pick(D.FIRST_M)) + ' ' + E.pick(D.LAST), comp: 60, loy: 80, amb: 20, disc: 80, sal: 0, date: s.date, mission: 'veille' }); }
      if (typeof HQ !== 'undefined' && HQ.needDC && HQ.needDC()) { const L = HQ.dcCandidates(); const c = L.find(x => x.src === 'militant') || L[0]; if (c) HQ.setDC(c); }
    }
    p.hoursMax = p.hours = E.hoursFor(E.turnDays()); E.estimate(); return el;
  }
  const simple = () => (S() || {}).mode === 'simple';

  /* ===== mémoire et arcs ===== */
  function remember(id, t, d) { const x = S().pnj[id]; if (!x || x.human) return; x.mem = (x.mem || []).concat([{ date: S().date, t, d: d || 0 }]).slice(-8); }
  function lastMem(id, neg) { const x = S().pnj[id]; if (!x || !x.mem) return null; const L = x.mem.filter(m => neg ? m.d < 0 : true); return L[L.length - 1] || null; }
  function arcs() { const s = S(); s.arcs = s.arcs || {}; return s.arcs; }
  function setupArcs() {
    const s = S(), p = P(); const a = arcs();
    if (!a.mentor) { const m = s.pnj[p.fedId] || E.findPnj(x => x.party === p.party && ['maire', 'depute', 'baron', 'federal'].includes(x.role)) || E.findPnj(x => x.role === 'notable'); if (m) { a.mentor = m.id; a.mentorStep = 0; m.rel = Math.max(m.rel, 35); remember(m.id, 'Vous a pris·e sous son aile', 5); } }
    if (!a.nemesis && s.rivals && s.rivals[0]) { const n = s.pnj[s.rivals[0]]; if (n && !n.human) { a.nemesis = n.id; n.nemesis = true; n.traits = n.traits || {}; n.traits.rancune = Math.max(n.traits.rancune || 50, 70); remember(n.id, 'Vous a repéré·e comme rival·e', -3); } }
    if (!a.traitor) { const t = p.staff.find(x => (x.amb || 0) > 60) || (s.pnj[p.secId] && s.pnj[p.secId].id !== a.mentor ? s.pnj[p.secId] : null); if (t) { a.traitor = t.id; a.traitorStaff = !!p.staff.find(x => x.id === t.id); } }
  }
  const MENTOR = [
    { at: () => (P().prole || 0) >= 1 || cnt('section') > 1, txt: 'Je t’ai observé·e à la section. Tu as du potentiel. Viens dîner, je te présente deux ou trois personnes qui comptent.', ok: { l: 'Avec plaisir', fx: p => { p.fedSup = clamp((p.fedSup || 0) + 8, 0, 100); return 'La fédération vous regarde autrement.'; } } },
    { at: () => !!P().cand, txt: 'Candidat·e ! Un conseil : ne promets rien que tu ne pourras pas tenir. Et prends un bon mandataire. Je te prête mon carnet d’adresses pour les dons.', ok: { l: 'Merci, j’en ferai bon usage', fx: p => { if (p.cand && p.cand.compte) { p.cand.compte.dons += 2500; p.cand.compte.recettes += 2500; } else p.cash += 1500; return 'Quelques chèques arrivent grâce à son réseau.'; } } },
    { at: () => P().mandats.length > 0, txt: 'Te voilà élu·e. Le plus dur commence : tenir ses promesses et durer. Méfie-toi de ceux qui te sourient trop.', ok: { l: 'Je m’en souviendrai', fx: p => { p.cred = clamp(p.cred + 3, 0, 100); return 'Un conseil précieux.'; } } },
    { at: () => (P().prole || 0) >= 3 || P().noto.nat > 30, txt: 'Tu me dépasses déjà. Si un jour tu vises plus haut, je te soutiendrai publiquement. Ne me déçois pas.', ok: { l: 'Compter sur vous', fx: p => { E.addStd(4); return 'Son soutien public pèse dans le parti.'; } } }
  ];
  function arcTick(days) {
    const s = S(), p = P(); setupArcs(); const a = arcs();
    // mentor
    const m = s.pnj[a.mentor]; if (m && m.alive && m.rel > 0 && a.mentorStep < MENTOR.length && (!a.mentorAt || E.diffDays(a.mentorAt, s.date) > 60)) { const st = MENTOR[a.mentorStep]; if (st.at()) { a.mentorStep++; a.mentorAt = s.date; LF.sms(m.id, st.txt, [{ l: st.ok.l, rel: 4, gvfx: 'mentor:' + (a.mentorStep - 1), res: '' }, { l: 'Je préfère tracer ma route seul·e', rel: -12, res: 'Votre mentor prend ses distances.' }], { role: 'Votre mentor' }); } }
    // némésis : vous suit de scrutin en scrutin
    const n = s.pnj[a.nemesis]; if (n && n.alive && p.cand && n.territory !== p.cand.key && !['depute', 'maire', 'leader'].includes(n.role)) { const key = p.cand.key; n.territory = key.startsWith('mun:') || key.startsWith('can:') ? key.slice(4) : key; n.role = 'candidat'; }
    // traître : bascule quand vous montez
    const t = s.pnj[a.traitor] || p.staff.find(x => x.id === a.traitor); const rising = p.mandats.length > 0 || (s.est && s.est.pct >= 18);
    if (t && !a.betrayed && rising && (t.loy ?? (t.rel + 50)) < 55 && R() < 0.12 * Math.min(1, days / 14)) {
      a.betrayed = s.date; const nm = t.name; const c = p.casseroles.find(k => !k.out);
      if (c) { c.out = true; E.article('revel', 'Un proche ' + E.de(p.name) + ' balance : ' + c.label, -0.6, 'pj'); E.addImageAll(-2.5); }
      else { E.article('dauph', nm + ', proche ' + E.de(p.name) + ', passe chez l’adversaire', -0.4, 'pj'); E.addStd(-3); p.militants = Math.max(0, p.militants - Math.round(p.militants * 0.15)); }
      if (a.traitorStaff) p.staff = p.staff.filter(x => x.id !== t.id);
      LF.sms(a.traitorStaff ? 'Ancien collaborateur' : t.id, 'Rien de personnel. Tu ne m’as jamais laissé ma place. Bonne chance pour la suite.', [{ l: 'Ne pas répondre', res: 'La trahison laisse des traces.' }], { role: 'Traître' });
      if (s.pnj[t.id]) remember(t.id, 'Vous a trahi·e', -20);
    }
    // promesses : échéance pendant un mandat
    (p.promises || []).forEach(pr => { if (pr.kept || pr.broken) return; if (!pr.due) pr.due = E.addDays(pr.date, 365); if (p.mandats.length && s.date > pr.due) { pr.broken = s.date; E.addImageAll(-1.2); addBilan('Promesse non tenue : ' + pr.what, -8, 'promesse'); E.article('dauph', p.name + ' avait promis ' + pr.what + '. Un an après, rien.', -0.3, 'pj'); } });
  }
  function mentorFx(i) { const st = MENTOR[i]; return st ? st.ok.fx(P()) : ''; }
  function keepPromise(id) {
    const p = P(), s = S(); const pr = (p.promises || []).find(x => x.id === id || x.date + x.what === id); if (!pr) return { ok: false, msg: 'Promesse introuvable.' };
    if (p.hours < 3) return { ok: false, msg: 'Il faut 3 h.' }; const cost = p.mairie ? 60000 : 800;
    if (p.mairie) { if (p.mairie.invest < cost) return { ok: false, msg: 'Budget d’investissement insuffisant.' }; p.mairie.invest -= cost; } else { if (p.cash < cost) return { ok: false, msg: 'Il faut ' + E.eur(cost) + '.' }; p.cash -= cost; }
    p.hours -= 3; pr.kept = s.date; addBilan('Promesse tenue : ' + pr.what, 8, 'promesse'); p.cred = clamp(p.cred + 2, 0, 100); E.addImageAll(0.8); if (pr.to && s.pnj[pr.to]) { s.pnj[pr.to].rel = clamp(s.pnj[pr.to].rel + 15, -100, 100); remember(pr.to, 'Vous avez tenu parole', 10); }
    E.article('dauph', p.name + ' tient sa promesse : ' + pr.what, 0.3, 'pj'); return { ok: true, msg: 'Promesse tenue : ' + pr.what + '. On vous le reconnaîtra en campagne.' };
  }

  /* ===== bilan ===== */
  function addBilan(l, v, type) { const p = P(); p.bilan = (p.bilan || []).concat([{ date: S().date, l, v, type }]).slice(-40); }
  function bilanScore(years) { const s = S(); return (P().bilan || []).filter(b => E.diffDays(b.date, s.date) < 365 * (years || 6)).reduce((a, b) => a + b.v, 0); }
  function incumbentFor(type) { const p = P(); if (type === 'mun') return p.mandats.some(m => ['maire', 'adjoint'].includes(m.type)); if (type === 'leg') return p.mandats.some(m => m.type === 'depute'); if (type === 'pres') return p.mandats.some(m => m.type === 'president'); if (type === 'dep') return p.mandats.some(m => m.type === 'cd'); return false; }
  function bilanTerm(type) { if (!incumbentFor(type)) return 0; return clamp(bilanScore() / 160, -0.25, 0.25); }

  /* ===== sessions et interpellations ===== */
  function govTick(days) {
    const s = S(), p = P(); const md = s.date.slice(5, 10); const y = s.date.slice(0, 4); s.gov = s.gov || {};
    if (p.mairie && md >= '03-01' && md <= '04-10' && s.gov.budget !== y) { s.gov.budget = y; s.queue.push({ kind: 'budget' }); }
    if (hasM('depute') && md >= '10-15' && md <= '12-10' && s.gov.plf !== y) { s.gov.plf = y; s.queue.push({ kind: 'plf' }); }
    if (p.mairie && (!s.gov.interp || E.diffDays(s.gov.interp, s.date) > 110) && R() < 0.25 * Math.min(1, days / 14)) { s.gov.interp = s.date; s.queue.push({ kind: 'interp' }); }
  }
  const PRIOS = [['ecoles', 'Écoles et petite enfance', { JUD: 3, POP: 1.5 }], ['securite', 'Sécurité et tranquillité', { RET: 3, PERI: 2 }], ['voirie', 'Voirie et transports', { PERI: 3, RUR: 2 }], ['culture', 'Sport, culture et associations', { POP: 2.5, JUD: 2 }], ['transition', 'Rénovation énergétique', { JUD: 2.5, CAD: 2 }]];
  function budgetSession(tf, prio, subv) {
    const p = P(), m = p.mairie; if (!m) return 'Vous n’êtes plus aux commandes de la mairie : le budget sera voté sans vous.'; const com = E.commune(); let msg = []; const coh = m.cohesion ?? 70;
    const adopt = R() < 0.55 + coh / 200; if (!adopt) { E.addImageAll(-1.5); addBilan('Budget ' + S().date.slice(0, 4) + ' rejeté par le conseil', -10, 'budget'); m.cohesion = clamp(coh - 10, 20, 95); E.article('dauph', com.name + ' : le budget rejeté, camouflet pour ' + p.name, -0.5, 'pj'); return 'Votre majorité se fissure : le budget est rejeté. Le préfet réglera les comptes. Un camouflet.'; }
    if (tf < 0) { m.tf -= 1; m.budget *= 0.985; E.addImage('POP', 1.5); E.addImage('RET', 1.5); E.addImage('PERI', 1); addBilan('Baisse de la taxe foncière', 4, 'budget'); msg.push('Taxe foncière en baisse : les propriétaires apprécient, les marges se réduisent.'); }
    if (tf > 0) { m.tf += 1; m.budget *= 1.015; m.invest += 300000; E.addImage('POP', -1.5); E.addImage('RET', -2); addBilan('Hausse de la taxe foncière', -5, 'budget'); msg.push('Taxe foncière en hausse : impopulaire, mais vous dégagez de quoi investir.'); }
    const P0 = PRIOS.find(x => x[0] === prio); if (P0) { for (const g in P0[2]) E.addImage(g, P0[2][g]); m.invest -= 200000; addBilan('Priorité budgétaire : ' + P0[1].toLowerCase(), 5, 'budget'); msg.push('Priorité affichée : ' + P0[1].toLowerCase() + '.'); }
    if (subv > 0) { E.addImage('POP', 1); E.addImage('JUD', 0.8); m.budget *= 0.995; p.militants += 2; msg.push('Les associations saluent la hausse des subventions.'); }
    if (subv < 0) { E.addImage('POP', -1.2); m.budget *= 1.01; addBilan('Baisse des subventions aux associations', -3, 'budget'); msg.push('Les associations protestent contre la baisse des subventions.'); }
    m.cohesion = clamp(coh + (tf > 0 ? -5 : 2), 20, 95); E.article('dauph', com.name + ' : le budget ' + S().date.slice(0, 4) + ' adopté', 0.1, 'pj');
    return 'Budget adopté. ' + msg.join(' ');
  }
  function plfVote(v, amend) {
    const s = S(), p = P(); const maj = s.national.gov.includes(p.party); let msg = '';
    if (v === 'pour') { if (maj) { E.addStd(2); msg = 'Vous votez le budget avec la majorité. Discipline appréciée.'; } else { E.addStd(-4); p.cred = clamp(p.cred + 1, 0, 100); msg = 'Vous votez le budget du gouvernement contre votre groupe. Remarqué, et pas apprécié.'; } }
    if (v === 'contre') { if (maj) { E.addStd(-5); E.addImageAll(0.6); msg = 'Vous votez contre le budget de votre propre camp. Les électeurs aiment l’indépendance, le groupe beaucoup moins.'; } else { E.addStd(1.5); msg = 'Vous votez contre, avec votre groupe.'; } }
    if (v === 'abst') { msg = 'Vous vous abstenez. Ni pour, ni contre : personne n’est content.'; E.addImageAll(-0.3); }
    if (amend) { if (p.hours >= 3) p.hours -= 3; const ok = R() < 0.3 + (maj ? 0.25 : 0) + (p.expertise ? 0.1 : 0); if (ok) { E.addImageAll(1.2); E.addNoto('circo', 3); addBilan('Amendement adopté : crédits pour la circonscription', 6, 'loi'); msg += ' Votre amendement pour la circonscription est adopté !'; E.article('dauph', 'Budget : l’amendement ' + E.de(p.name) + ' adopté', 0.3, 'pj'); } else msg += ' Votre amendement est rejeté.'; }
    return msg;
  }
  function opposant() { const s = S(), p = P(); const com = p.communeId; const el = s.elections.filter(e => e.type === 'mun' && e.races).slice(-1)[0]; const r = el && el.races['mun:' + com]; const row = r && (r.r2 || r).rows.find(x => !x.pj && s.pnj[x.id]); return row ? s.pnj[row.id] : E.findPnj(x => x.territory === com && x.role !== 'journaliste'); }
  function interpOutcome(sum) { const sc = sum.score; addBilan('Conseil municipal : ' + (sc >= 55 ? 'vous dominez l’opposition' : sc < 45 ? 'l’opposition marque des points' : 'échange équilibré'), sc >= 55 ? 3 : sc < 45 ? -3 : 0, 'conseil'); }
  return { startCampaign, simple, MS, msList, nextMs, check, guide, guideNext, GUIDE, applyStart, remember, lastMem, arcs, setupArcs, arcTick, mentorFx, keepPromise, addBilan, bilanScore, bilanTerm, incumbentFor, govTick, PRIOS, budgetSession, plfVote, opposant, interpOutcome };
})();
if (typeof window !== 'undefined') window.GV = GV;
