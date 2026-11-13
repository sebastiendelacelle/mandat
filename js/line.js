/* MANDAT — la ligne du parti : ce que disent et font les figures nationales, ce que le parti attend de vous,
   l'investiture expliquée, le changement de parti, et la progression d'un maire (intercommunalité, parrainages, partis). */
const LN = (() => {
  const S = () => G.S, P = () => G.S.p;
  const R = () => E.rnd(), clamp = (v, a, b) => E.clamp(v, a, b), pick = a => E.pick(a);
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  // une étiquette courte par question du questionnaire (même ordre que D.QUIZ_POOL)
  const K = ['le retour de l’impôt sur la fortune', 'la baisse des impôts des entreprises', 'le SMIC à 1 600 € net', 'la réduction du nombre de fonctionnaires', 'la renationalisation des autoroutes',
    'la retraite à 62 ans', 'le durcissement de l’assurance chômage', 'les heures d’activité en contrepartie du RSA', 'l’indexation des salaires sur l’inflation', 'l’exonération des successions jusqu’à 300 000 €',
    'l’aide active à mourir', 'la GPA encadrée', 'la légalisation du cannabis', 'l’interdiction du voile dans le sport', 'la privatisation de l’audiovisuel public',
    'les peines planchers', 'la majorité pénale à 16 ans', 'la reconnaissance faciale en temps réel', 'l’interdiction des LBD', 'la construction de 20 000 places de prison',
    'la priorité nationale', 'le retour d’une partie des immigrés installés', 'la suppression du droit du sol', 'la régularisation des travailleurs sans papiers', 'un référendum sur l’immigration',
    'la défense européenne commune', 'la primauté du droit français sur le droit européen', 'les livraisons d’armes à l’Ukraine', 'la sortie du commandement intégré de l’OTAN', 'l’entrée de l’Ukraine dans l’Union européenne',
    'la construction de nouveaux réacteurs nucléaires', 'le gel des éoliennes', 'le report de la fin des moteurs thermiques', 'l’interdiction des vols intérieurs courts', 'la suppression des ZFE',
    'la proportionnelle', 'le référendum d’initiative citoyenne', 'la VIe République', 'le retour du cumul député-maire', 'l’alliance de la droite avec le RN', 'la taxe Zucman', 'l’accord avec le Mercosur', 'la retraite par capitalisation', 'le retour sous 3 % de déficit'];
  const NATM = ['info24', 'quotlib', 'radio'];

  function st() { const s = S(); s.ln = s.ln || { feed: [], camp: {} }; return s.ln; }
  function me() { const p = P(); p.ln = p.ln || { def: 0, dis: 0, inco: 0, said: {}, last: null, switched: null, done: {} }; return p.ln; }
  const posOf = (party, qi) => { const j = D.QUIZ_P.indexOf(party); return j < 0 ? null : +D.QUIZ_POOL[qi].p[j] - 2; };
  // ce que pense le personnage : sa réponse au questionnaire, sinon une estimation à partir de ses axes
  function myView(qi) {
    const p = P(); if (p.quiz && p.quiz.qs) { const i = p.quiz.qs.indexOf(qi); if (i >= 0 && p.quiz.ans[i] != null && p.quiz.ans[i] !== 0) return p.quiz.ans[i]; }
    const q = D.QUIZ_POOL[qi]; let v = 0, n = 0; for (const k in q.w) { v += q.w[k] * p.ax[E.AXI[k]] / 100; n += Math.abs(q.w[k]); } return n ? clamp(Math.round(v / n * 3), -2, 2) : 0;
  }
  const leader = party => { const s = S(); return s.pnj[(s.national.leaders || {})[party]] || null; };
  const fed = () => S().pnj[P().fedId] || null;

  /* ---------- poids de la ligne selon la situation ---------- */
  function natCampaign() { const s = S(); return s.elections.find(e => ['pres', 'euro', 'leg'].includes(e.type) && e.status !== 'fini' && E.diffDays(s.date, e.d1) <= 100) || null; }
  function weight() {
    const p = P(); if (p.party === 'NEW') return { w: 0, l: 'aucun', why: 'Vous êtes sans parti : vous ne devez rien à personne.' };
    const ce = p.cand ? S().elections.find(e => e.id === p.cand.el) : null;
    if (ce && ['pres', 'euro', 'leg'].includes(ce.type)) return { w: 1, l: 'très fort', why: 'Candidat·e à une élection nationale sous l’étiquette du parti : vous portez son programme, ses têtes d’affiche parlent pour vous.' };
    if (natCampaign()) return { w: 0.7, l: 'fort', why: 'Une élection nationale approche : le parti attend de tous ses élus et militants qu’ils fassent campagne pour ses candidats.' };
    if (p.mandats.some(m => ['depute', 'senateur', 'meuro'].includes(m.type))) return { w: 0.6, l: 'fort', why: 'Parlementaire : vous votez avec votre groupe et on vous demande de défendre ses textes.' };
    if (ce && ce.type === 'mun' && E.myPetite()) return { w: 0.05, l: 'quasi nul', why: 'Liste sans étiquette dans une petite commune : personne ne vous demandera de défendre le programme national.' };
    if (p.mandats.length && p.mandats.every(m => ['maire', 'adjoint', 'conseiller_municipal', 'interco'].includes(m.type)) && E.myPetite()) return { w: 0.15, l: 'faible', why: 'Élu·e d’une petite commune : on vous sollicitera surtout pour les parrainages et les grandes campagnes.' };
    if (ce) return { w: 0.3, l: 'moyen', why: 'Campagne locale : vous avez de la marge, mais vos adversaires vous renverront aux positions de votre parti.' };
    return { w: 0.3, l: 'moyen', why: 'Militant·e ou élu·e local·e : la fédération compte sur vous pour relayer, sans exiger un alignement total.' };
  }

  /* ---------- l'actualité nationale des partis ---------- */
  function strongQs(party, want) { return D.QUIZ_POOL.map((q, i) => i).filter(i => { const v = posOf(party, i); return want === 'pro' ? v === 2 : want === 'con' ? v === -2 : Math.abs(v) === 2; }); }
  function addItem(party, kind) {
    const s = S(), L = st(); const ld = leader(party); if (!ld) return null; const pn = D.PARTIES[party].short;
    let qi, t;
    if (kind === 'ppl') { const qs = strongQs(party, 'pro'); if (!qs.length) return null; qi = pick(qs); t = 'Le groupe ' + pn + ' dépose une proposition de loi pour ' + K[qi] + '.'; }
    else if (kind === 'vote') { const qs = strongQs(party, 'con'); if (!qs.length) return null; qi = pick(qs); t = pn + ' fera bloc contre ' + K[qi] + ' : « ' + pick(['Ce serait une faute historique.', 'Nous ne laisserons pas faire.', 'C’est non, et ce sera non.']) + ' »'; }
    else { const qs = strongQs(party); qi = pick(qs); const v = posOf(party, qi); t = ld.name + ' (' + pn + '), ' + pick([(ld.g === 'F' ? 'invitée' : 'invité') + ' de la matinale', 'au journal de 20 h', 'dans un entretien au Quotidien libéral', 'en meeting']) + ' : « ' + (v > 0 ? pick(['Nous défendrons ' + K[qi] + ' jusqu’au bout.', 'Je m’engage pour ' + K[qi] + '.', 'Nous voulons ' + K[qi] + ', et nous ne lâcherons pas.']) : pick([cap(K[qi]) + ' ? Jamais.', 'Nous combattrons ' + K[qi] + '.', 'Il est hors de question d’accepter ' + K[qi] + '.'])) + ' »'; }
    const it = { id: E.uid('ln'), date: s.date, party, kind, qi, pos: posOf(party, qi), t, who: ld.id };
    L.feed.unshift(it); if (L.feed.length > 40) L.feed.length = 40;
    E.article(pick(NATM), t.length > 110 ? t.slice(0, 107) + '…' : t, 0, 'nat');
    return it;
  }
  function campItem(e) {
    const p = P(), L = st(); if (p.party === 'NEW' || L.camp[e.id + p.party]) return null; L.camp[e.id + p.party] = 1; const ld = leader(p.party); if (!ld) return null;
    const pr = strongQs(p.party, 'pro').sort(() => R() - 0.5).slice(0, 3).map(i => K[i]);
    const t = (e.type === 'pres' ? ld.name + ' lance sa campagne présidentielle' : e.type === 'euro' ? D.PARTIES[p.party].short + ' présente sa liste aux européennes, menée par ' + ld.name : D.PARTIES[p.party].short + ' lance sa campagne des législatives') + '. Priorités : ' + pr.join(', ') + '.';
    const it = { id: E.uid('ln'), date: S().date, party: p.party, kind: 'camp', qi: null, pos: null, t, who: ld.id, el: e.id }; L.feed.unshift(it); E.article('info24', t.slice(0, 110), 0.1, 'nat'); return it;
  }

  /* ---------- ce que le parti vous demande ---------- */
  function ask(it) {
    const p = P(), f = fed(); if (!f || !it) return; const W = weight().w; const ld = leader(p.party);
    let txt, rep;
    if (it.kind === 'camp' || it.kind === 'meeting') {
      txt = (ld ? ld.name : 'La direction') + ' vient en meeting à Grenoble jeudi. On veut tous nos élus et candidats sur scène, et des bus de militants. Tu en es ?';
      rep = [{ l: 'Monter sur scène et mobiliser (3 h)', hours: 3, rel: 5, ln: 'def:' + it.id }, { l: 'Y aller, au premier rang (1 h)', hours: 1, rel: 2, ln: 'relay:' + it.id }, { l: 'Je fais campagne sur mes propres thèmes', rel: -4, ln: 'dis:' + it.id }];
    } else {
      txt = pick(['Consigne de la direction : ', 'Message du national : ', 'La direction compte sur nous : ']) + (it.kind === 'ppl' ? 'notre proposition de loi sur ' + K[it.qi] + ' arrive en séance. Relaie-la et défends-la dans la presse locale.' : it.kind === 'vote' ? 'on combat ' + K[it.qi] + '. Il faut que nos élus le disent partout.' : 'tout le monde relaie l’intervention de ' + (ld ? ld.name : 'la direction') + ' sur ' + K[it.qi] + '.');
      rep = [{ l: 'La défendre publiquement (1 h)', hours: 1, rel: 4, ln: 'def:' + it.id }, { l: 'Partager, sans plus', rel: 1, ln: 'relay:' + it.id }, { l: 'Ne rien dire', rel: -2, ln: 'quiet:' + it.id }, { l: 'Dire publiquement mon désaccord', rel: -6, ln: 'dis:' + it.id }];
    }
    LF.sms(f.id, txt, rep); me().last = S().date; it.asked = true; it.w = W;
  }
  function fx(key, m) {
    const [k, id] = String(key).split(':'); const p = P(), m0 = me(); const it = st().feed.find(x => x.id === id); const W = it && it.w != null ? it.w : weight().w;
    const pn = D.PARTIES[p.party] ? D.PARTIES[p.party].short : ''; const ld = it ? S().pnj[it.who] : null;
    // les autres familles de messages
    if (k === 'inv') return invFx(id, m);
    if (k === 'par') return parFx(id, m);
    if (k === 'court') return courtFx(id, m);
    if (k === 'comite') { if (id === 'oui') { E.addStd(5); p.natSup = clamp((p.natSup || 0) + 4, 0, 100); E.addNoto('circo', 2); const ms = E.pnjList(x => x.role === 'maire' && x.party !== 'RN' && x.party !== 'LFI').slice(0, 3); ms.forEach(x => { x.known = true; x.rel = clamp(x.rel + 3, -100, 100); }); return 'Comité lancé : ' + (ms.length ? ms.map(x => x.name).join(', ') + ' ont accepté d’y figurer' : 'quelques élus vous suivent') + '. La direction nationale a noté votre nom.'; } if (id === 'noms') { E.addStd(1); return 'Merci, on les appelle.'; } return 'Dommage, on comptait sur toi.'; }
    if (k === 'vp') { if (id === 'oui') { const mm = p.mandats.find(x => x.type === 'interco'); if (mm) { const c = E.commune(); mm.label = 'Vice-président·e de l’intercommunalité' + (c.terr ? ' (' + c.terr + ')' : ''); mm.vp = true; } E.addNoto('circo', 4); p.prole = Math.max(p.prole || 0, 1); E.article('dauph', p.name + ' élu·e vice-président·e de l’intercommunalité', 0.2, 'pj'); return 'Élu·e vice-président·e. Vous siégez désormais au bureau de l’intercommunalité : routes, eau, déchets, développement économique. Les maires du secteur vous connaissent.'; } return 'Vous gardez votre énergie pour votre commune.'; }
    if (!it) return 'Ce n’est plus d’actualité.';
    const v = it.qi != null ? myView(it.qi) : null; const contra = v != null && it.pos != null && Math.abs(v - it.pos) >= 3; const agree = v != null && it.pos != null && Math.sign(v) === Math.sign(it.pos) && v !== 0;
    it.me = k;
    if (k === 'def') {
      E.addStd(1 + 3 * W); p.natSup = clamp((p.natSup || 0) + 2 * W, 0, 100); m0.def++;
      if (ld) ld.rel = clamp(ld.rel + 2, -100, 100);
      if (contra) { p.cred = clamp(p.cred - 2, 0, 100); m0.inco++; if (m0.said[it.qi] === 'contre') { p.cred = clamp(p.cred - 3, 0, 100); E.article('ventilo', 'Volte-face : ' + p.name + ' défend désormais ' + K[it.qi], -0.4, 'pj'); m0.said[it.qi] = 'pour'; return 'Vous défendez la ligne… que vous combattiez il y a peu. La presse a ressorti vos anciennes déclarations.'; } m0.said[it.qi] = it.pos > 0 ? 'pour' : 'contre'; return 'Vous défendez la position du parti, même si ce n’est pas la vôtre. La fédération apprécie ; vous, un peu moins.'; }
      if (it.qi != null) m0.said[it.qi] = it.pos > 0 ? 'pour' : 'contre';
      E.addImageAll(0.3 * W); if (it.kind === 'camp' || it.kind === 'meeting') { p.mom += 0.02 * W; E.addNoto(E.myPetite() ? 'commune' : 'circo', 2); }
      return agree ? 'Vous défendez une position qui est aussi la vôtre. Cohérent, et la direction l’a noté.' : 'Vous portez la ligne du parti. La direction l’a noté.';
    }
    if (k === 'relay') { E.addStd(0.5 + W); return 'Relayé. Le minimum syndical, mais c’est fait.'; }
    if (k === 'quiet') { E.addStd(-(0.5 + 1.5 * W)); p.natSup = clamp((p.natSup || 0) - W, 0, 100); return W >= 0.6 ? 'Votre silence a été remarqué à la fédération. En pleine campagne nationale, ça ne passe pas inaperçu.' : 'Personne ne vous en tiendra vraiment rigueur.'; }
    if (k === 'dis') {
      E.addStd(-(2 + 6 * W)); p.natSup = clamp((p.natSup || 0) - 3 * W, 0, 100); m0.dis++; E.addNoto(X.scopeOf(), 2); if (ld) ld.rel = clamp(ld.rel - 5, -100, 100);
      p.cred = clamp(p.cred + (v != null && it.pos != null && Math.abs(v - it.pos) >= 2 ? 1.5 : -1), 0, 100); if (it.qi != null) m0.said[it.qi] = it.pos > 0 ? 'contre' : 'pour';
      E.article(W >= 0.6 ? 'quotlib' : 'dauph', p.name + ' (' + pn + ') prend ses distances avec ' + (ld ? ld.name : 'la direction') + (it.qi != null ? ' sur ' + K[it.qi] : ''), 0, 'pj');
      if (m0.dis >= 6 && p.std <= 5) { const from = D.PARTIES[p.party].short; m0.switched = null; switchTo('NEW', 'Divers'); p.cred = clamp(p.cred + 2, 0, 100); E.article('dauph', p.name + ' exclu·e de ' + from + ' après des désaccords répétés', -0.1, 'pj'); E.log('Le parti vous exclut. Vous voilà sans étiquette.', 'bad'); return 'C’en est trop pour la direction : vous êtes exclu·e de ' + from + '. Vous voilà libre… et seul·e.'; }
      if (m0.dis >= 3 && W >= 0.5) { const f = fed(); if (f) LF.sms(f.id, 'Je te le dis en ami : à la direction, ton nom revient souvent. Encore une sortie comme ça et ton investiture sera discutée.', null); }
      return W >= 0.6 ? 'Votre désaccord fait les titres. Vous gagnez en indépendance, vous perdez du poids au parti, et vos adversaires s’en servent déjà.' : 'Votre désaccord est noté localement. Ça vous démarque, sans drame.';
    }
    return '';
  }

  /* ---------- investiture : proposition du parti ---------- */
  function invScan() {
    const s = S(), p = P(); if (p.party === 'NEW' || p.cand || (s.mp && typeof MP !== 'undefined' && MP.rivals().length)) return; p.preInv = p.preInv || {}; const L = st(); L.inv = L.inv || {};
    const e = s.elections.filter(x => ['mun', 'dep', 'leg'].includes(x.type) && x.status === 'futur').sort((a, b) => a.d1 < b.d1 ? -1 : 1)[0]; if (!e) return;
    const d = E.diffDays(s.date, e.d1); if (d > 300 || d < 30 || L.inv[e.id] || (p.rallied || {})[e.id]) return;
    const o = E.invOdds(e); if (!o || o.pre || o.union) return; const f = fed(); if (!f) return;
    if (o.pct >= 70) { L.inv[e.id] = 1; LF.sms(f.id, 'La commission d’investiture prépare les ' + e.label.toLowerCase() + '. Pour ' + E.unit(E.electionUnit(e.type)).name + ', c’est ton nom qui revient. On te propose l’étiquette. Partant·e ?', [{ l: 'Oui, j’y vais', rel: 5, ln: 'inv:' + e.id }, { l: 'Pas cette fois', rel: -2, ln: 'inv:non' }]); }
    else if (d <= 240 && !L.inv['w' + e.id]) { L.inv['w' + e.id] = 1; LF.sms(f.id, 'Pour les ' + e.label.toLowerCase() + ', la commission penche pour ' + (o.rival ? o.rival.name : 'un·e autre') + '. Ton score : ' + o.pct + ' % de chances. Regarde l’onglet Parti : je t’ai mis ce qui te manque.', null); }
  }
  function invFx(id) {
    const p = P(); if (id === 'non') return 'Compris. On garde ta candidature pour une autre fois.';
    const e = S().elections.find(x => x.id === id); if (!e) return 'Ce n’est plus d’actualité.';
    p.preInv = p.preInv || {}; p.preInv[id] = true; E.addStd(2);
    if (E.diffDays(S().date, e.d1) <= 210) { const r = E.declare(id, 'tete'); return r.msg || 'Candidature déclarée.'; }
    return 'C’est acté : l’investiture vous est réservée. Les candidatures s’ouvriront le ' + E.fmtDate(E.addDays(e.d1, -210)) + ' : il suffira de vous déclarer (onglet 🗳).';
  }

  /* ---------- changer de parti ---------- */
  function match(party) { const p = P(); if (p.quiz && p.quiz.qs) return D.quizMatch(p.quiz.qs, p.quiz.ans)[party] ?? null; return Math.max(0, Math.round(100 - E.wdist(p.ax, D.PARTIES[party].ax, E.W1))); }
  function canSwitch() { const p = P(), m0 = me(); if (m0.switched && E.diffDays(m0.switched, S().date) < 365) return { ok: false, msg: 'Vous avez changé de parti il y a moins d’un an. Un nouveau départ maintenant vous ferait passer pour une girouette.' }; return { ok: true }; }
  function switchTo(party, movement) {
    const s = S(), p = P(), m0 = me(); const c = canSwitch(); if (!c.ok) return c; const from = p.party; const fromS = from === 'NEW' ? (p.movement || 'votre mouvement') : D.PARTIES[from].short;
    const coherent = m0.dis >= 2 || (from !== 'NEW' && match(from) != null && match(party === 'NEW' ? from : party) > match(from) + 8);
    p.cred = clamp(p.cred + (coherent ? 1 : -4), 0, 100); E.addNoto(X.scopeOf(), 3); p.mom -= 0.02;
    if (from !== 'NEW') { const fd = s.pnj[p.fedId]; if (fd) fd.rel = clamp(fd.rel - 30, -100, 100); const ld = leader(from); if (ld) ld.rel = clamp(ld.rel - 15, -100, 100); }
    if (p.cand && p.cand.label && p.cand.label !== 'DIV' && !p.cand.sansEtiquette) { p.cand.label = 'DIV'; p.cand.invested = false; E.log('En quittant ' + fromS + ', vous perdez votre investiture.', 'bad'); }
    if (party === 'NEW') { p.party = 'NEW'; p.movement = movement || 'Indépendant·e'; p.std = 0; p.fedId = null; p.secId = null; }
    else {
      p.party = party; p.std = 18; p.prole = 0; p.fedRole = null; p.fedSup = 10; p.natSup = 5;
      const fedP = E.findPnj(x => x.party === party && x.role === 'federal') || E.mkPnj({ party, role: 'federal', territory: 'dept', mandat: 'Secrétaire fédéral·e (' + D.PARTIES[party].short + ' Isère)', noto: 35, std: 75 });
      const sec = E.findPnj(x => x.party === party && x.role === 'section' && x.territory === p.communeId) || E.mkPnj({ party, role: 'section', territory: p.communeId, mandat: 'Secrétaire de section (' + E.commune().name + ')', noto: 15, std: 45 });
      fedP.known = sec.known = true; fedP.rel = 15; p.fedId = fedP.id; p.secId = sec.id;
    }
    m0.switched = s.date; m0.dis = 0; m0.def = 0; m0.inco = 0; p.rallied = {}; p.preInv = {}; p.invLost = {};
    const to = party === 'NEW' ? p.movement : D.PARTIES[party].short;
    E.article('dauph', p.name + ' quitte ' + fromS + (party === 'NEW' ? ' et se lance en indépendant·e' : ' et rejoint ' + to), coherent ? 0 : -0.3, 'pj');
    E.log('Vous quittez ' + fromS + (party === 'NEW' ? '.' : ' pour ' + to + '.'), 'info');
    return { ok: true, msg: coherent ? 'Vos désaccords étaient connus : le départ paraît cohérent. Il faudra tout reconstruire dans votre nouvelle famille politique.' : 'Le départ surprend. On parle d’opportunisme ; il faudra le démentir par les actes, et reconstruire votre poids interne.' };
  }

  /* ---------- après la mairie : intercommunalité, partis, parrainages ---------- */
  function mayorTick() {
    const s = S(), p = P(), m0 = me(); const maire = p.mandats.find(m => m.type === 'maire'); if (!maire) { if (p.mandats.some(m => m.type === 'interco')) p.mandats = p.mandats.filter(m => m.type !== 'interco'); return; }
    const com = E.commune();
    if (!p.mandats.some(m => m.type === 'interco')) { p.mandats.push({ type: 'interco', label: 'Conseiller·ère communautaire' + (com.terr ? ' (' + com.terr + ')' : ''), since: s.date, ind: 0 }); E.log('Comme maire, vous siégez au conseil de l’intercommunalité.', 'info'); m0.done.interco = s.date; }
    if (!m0.done.vp && m0.done.interco && E.diffDays(m0.done.interco, s.date) > 200 && R() < 0.25) { m0.done.vp = s.date; LF.sms('Le président de l’intercommunalité', 'Il me faut un·e vice-président·e pour ' + pick(['les routes et la mobilité', 'l’eau et l’assainissement', 'les déchets', 'le développement économique', 'le tourisme']) + '. Tu as fait tes preuves dans ta commune. Ça t’intéresse ? C’est du travail, mais tu seras connu·e dans tout le secteur.', [{ l: 'Accepter', ln: 'vp:oui' }, { l: 'Refuser', ln: 'vp:non' }], { role: 'Intercommunalité' }); }
    // les partis viennent chercher les maires qui réussissent
    if ((p.noto.commune || 0) >= 35 && (!m0.done.court || E.diffDays(m0.done.court, s.date) > 240) && R() < 0.35) {
      m0.done.court = s.date;
      if (p.party !== 'NEW' && !m0.done.deleg && R() < 0.6) { m0.done.deleg = 1; const f = fed(); if (f) LF.sms(f.id, 'On a besoin de maires comme toi au parti. Je te propose de devenir délégué·e de circonscription : tu représentes le parti dans le secteur, tu siégeras au conseil fédéral.', [{ l: 'Accepter', rel: 6, ln: 'court:own' }, { l: 'Pas maintenant', rel: -1, ln: 'court:no' }]); }
      else { const cands = D.QUIZ_P.filter(k => k !== p.party).map(k => ({ k, m: match(k) })).sort((a, b) => b.m - a.m); const o = cands[0]; const fd = E.findPnj(x => x.party === o.k && x.role === 'federal') || E.mkPnj({ party: o.k, role: 'federal', territory: 'dept', mandat: 'Secrétaire fédéral·e (' + D.PARTIES[o.k].short + ' Isère)', noto: 35, std: 75 });
        fd.known = true; LF.sms(fd.id, 'On suit ce que vous faites dans votre commune. ' + D.PARTIES[o.k].name + ' cherche des élus de terrain : rejoignez-nous, et l’investiture aux prochaines départementales est pour vous.', [{ l: 'Rejoindre ' + D.PARTIES[o.k].short, ln: 'court:' + o.k }, { l: 'Décliner poliment', rel: 2, ln: 'court:no' }]); }
    }
    // parrainages pour la présidentielle
    const pres = s.elections.find(e => e.type === 'pres' && e.status === 'futur' && E.diffDays(s.date, e.d1) <= 120 && E.diffDays(s.date, e.d1) > 40);
    if (pres && !(m0.done.par === pres.id)) { m0.done.par = pres.id; parAsk(pres); }
  }
  function courtFx(id) {
    const p = P(); if (id === 'no') return 'La porte reste ouverte, vous a-t-on répondu.';
    if (id === 'own') { p.prole = Math.max(p.prole || 0, 1); E.addStd(6); return 'Vous voilà délégué·e de circonscription. Votre poids au parti grimpe, et on pensera à vous pour les prochaines investitures.'; }
    const r = switchTo(id); if (!r.ok) return r.msg; const e = S().elections.find(x => x.type === 'dep' && x.status === 'futur'); if (e) { p.preInv = p.preInv || {}; p.preInv[e.id] = true; } E.addStd(12); return r.msg + (e ? ' L’investiture aux ' + e.label.toLowerCase() + ' vous est promise.' : '');
  }
  function parAsk(e) {
    const s = S(), p = P(); const own = p.party !== 'NEW' ? leader(p.party) : null;
    const others = D.QUIZ_P.filter(k => k !== p.party).map(k => leader(k)).filter(Boolean).sort(() => R() - 0.5).slice(0, 2);
    const reps = (own ? [{ l: 'Parrainer ' + own.name + ' (' + D.PARTIES[p.party].short + ')', ln: 'par:' + own.id }] : []).concat(others.map(x => ({ l: 'Parrainer ' + x.name + ' (' + D.PARTIES[x.party].short + ')', ln: 'par:' + x.id }))).concat([{ l: 'Ne parrainer personne', ln: 'par:none' }]);
    LF.sms('Conseil constitutionnel', 'Votre formulaire de parrainage pour l’élection présidentielle est arrivé. Comme maire, vous pouvez présenter un·e candidat·e. Les parrainages sont publics. Plusieurs équipes de campagne vous ont déjà appelé.', reps, { role: 'Présidentielle' });
  }
  function parFx(id) {
    const s = S(), p = P(); if (id === 'none') return 'Vous ne parrainez personne. Comme une majorité de maires de petites communes.';
    const x = s.pnj[id]; if (!x) return ''; p.parrain = { to: id, date: s.date }; x.rel = clamp(x.rel + 12, -100, 100);
    if (x.party === p.party) { E.addStd(3); return 'Parrainage envoyé. ' + x.name + ' vous remercie personnellement : vous comptez parmi les premiers soutiens.'; }
    if (p.party !== 'NEW') { E.addStd(-6); E.article('dauph', 'Parrainages : ' + p.name + ' soutient ' + x.name + ' (' + D.PARTIES[x.party].short + '), pas le candidat de son parti', -0.1, 'pj'); return 'Parrainage publié au Journal officiel. Votre parti n’a pas apprécié.'; }
    E.addNoto('circo', 1); return 'Parrainage publié. Vous existez désormais aux yeux ' + E.de(x.name) + ' et de son équipe.';
  }

  /* ---------- tour de jeu ---------- */
  function tick(days) {
    const s = S(), p = P(), m0 = me(); const f = Math.min(1.5, days / 30);
    // actualité nationale : votre parti, et un autre
    if (p.party !== 'NEW' && R() < Math.min(0.9, 0.6 * f)) { const it = addItem(p.party, pick(['itw', 'itw', 'ppl', 'vote'])); const W = weight().w; if (it && W >= 0.1 && (!m0.last || E.diffDays(m0.last, s.date) >= (W >= 0.6 ? 10 : 35)) && R() < Math.min(0.85, 0.35 + 0.6 * W)) ask(it); }
    if (R() < 0.4 * f) addItem(pick(D.QUIZ_P.filter(k => k !== p.party)), 'itw');
    // pré-campagne présidentielle : le parti structure des comités de soutien ouverts au-delà des adhérents
    const pres = s.elections.find(e => e.type === 'pres' && e.status === 'futur' && E.diffDays(s.date, e.d1) <= 240 && E.diffDays(s.date, e.d1) > 60);
    if (pres && p.party !== 'NEW' && !m0.done['com' + pres.id] && weight().w >= 0.15 && R() < 0.5 * f) { m0.done['com' + pres.id] = 1; const f0 = fed(), ld = leader(p.party); if (f0 && ld) LF.sms(f0.id, 'On lance les comités de soutien à ' + ld.name + ' dans chaque circonscription. Pas une copie de nos sections : il faut des élus, des chefs d’entreprise, des présidents d’asso, au-delà du parti. Tu peux en animer un ?', [{ l: 'Oui : je démarche les élus du secteur (4 h)', hours: 4, rel: 6, ln: 'comite:oui' }, { l: 'Je donne quelques noms', rel: 2, ln: 'comite:noms' }, { l: 'Pas le temps', rel: -2, ln: 'comite:non' }]); }
    const ne = natCampaign(); if (ne && p.party !== 'NEW') { const it = campItem(ne); if (it && weight().w >= 0.3) { it.kind = 'camp'; ask(it); } }
    try { invScan(); } catch (e) { }
    try { mayorTick(); } catch (e) { }
  }

  /* ---------- carte « La ligne du parti » ---------- */
  function card() {
    const p = P(), m0 = me(); const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const W = weight(); let h = '<div class="card" style="margin-bottom:14px">';
    if (p.party === 'NEW') { h += '<h3>Sans parti</h3><p class="small" style="margin:0">' + esc(W.why) + '</p><div class="row" style="margin-top:10px"><button class="btn sm" id="ln-switch">Rejoindre un parti</button></div></div>'; return h; }
    const ld = leader(p.party); const mt = match(p.party);
    h += '<h3>La ligne de ' + esc(D.PARTIES[p.party].short) + '</h3><p class="small" style="margin:-2px 0 8px">' + (ld ? 'Direction nationale : <b>' + esc(ld.name) + '</b>. ' : '') + 'Poids de la ligne pour vous : <b>' + W.l + '</b>. ' + esc(W.why) + '</p>';
    h += '<div class="grid"><div class="c6"><div class="small muted">Accord avec le programme</div><b class="num big2">' + (mt != null ? mt + ' %' : '—') + '</b></div><div class="c6"><div class="small muted">Prises de distance publiques</div><b class="num big2">' + m0.dis + '</b></div></div>';
    const gaps = p.quiz && p.quiz.qs ? D.quizGaps(p.quiz.qs, p.quiz.ans, p.party) : [];
    if (gaps.length) h += '<details style="margin-top:8px"><summary class="small"><b>Vos désaccords avec le parti (' + gaps.length + ')</b></summary><ul class="small" style="margin:6px 0 0;padding-left:18px">' + gaps.map(g => '<li>' + esc(g.q) + ' <span class="muted">(vous : ' + (g.me > 0 ? 'pour' : 'contre') + ', le parti : ' + (g.line > 0 ? 'pour' : g.line < 0 ? 'contre' : 'partagé') + ')</span></li>').join('') + '</ul></details>';
    const feed = st().feed.filter(x => x.party === p.party).slice(0, 5); const ic = { itw: '🎙', ppl: '📜', vote: '🗳', camp: '📣', meeting: '📣' }; const tag = { def: '✓ défendu', relay: 'relayé', quiet: 'silence', dis: '✗ contesté' };
    h += '<div class="eyebrow" style="margin-top:12px">Ce que dit et fait le parti</div>' + (feed.length ? feed.map(x => '<div class="li"><div class="grow small">' + (ic[x.kind] || '•') + ' ' + esc(x.t) + '<div class="muted">' + E.fmtDate(x.date, true) + (x.me ? ' · vous : ' + tag[x.me] : '') + '</div></div></div>').join('') : '<p class="muted small" style="margin:4px 0 0">Rien de notable ces dernières semaines.</p>');
    h += '<div class="row" style="margin-top:10px"><button class="btn sm" id="ln-switch">Changer de parti…</button></div></div>';
    return h;
  }
  // jauge d'investiture pour la prochaine élection où l'on peut se présenter
  function invCard() {
    const s = S(), p = P(); if (p.party === 'NEW' || p.cand) return '';
    const e = s.elections.filter(x => ['mun', 'dep', 'leg'].includes(x.type) && x.status === 'futur').sort((a, b) => a.d1 < b.d1 ? -1 : 1)[0]; if (!e) return '';
    const o = E.invOdds(e); if (!o) return '';
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const col = o.pct >= 70 ? 'var(--good)' : o.pct >= 35 ? 'var(--warn)' : 'var(--bad)';
    let h = '<div class="card" style="margin-bottom:14px"><h3>Investiture · ' + esc(e.label) + '</h3>';
    if (o.pre) return h + '<p class="small" style="margin:0">✓ La fédération vous a réservé l’investiture. Il suffira de vous déclarer à l’ouverture des candidatures.</p></div>';
    if (o.union) return h + '<p class="small" style="margin:0">L’accord national de la gauche réserve cette circonscription à ' + esc(D.PARTIES[o.union].short) + '. Seul un fort ancrage local (notoriété, mandats) peut faire bouger la ligne.</p></div>';
    h += '<div class="row" style="align-items:baseline;gap:8px"><b class="num big2" style="color:' + col + '">' + o.pct + ' %</b><span class="small muted">de chances aujourd’hui, face à ' + esc(o.rival.name) + (o.rival.mandat ? ' (' + esc(o.rival.mandat) + ')' : '') + '</span></div>';
    h += '<div style="height:8px;border-radius:4px;background:var(--line);margin:6px 0 8px;overflow:hidden"><i style="display:block;height:100%;width:' + o.pct + '%;background:' + col + '"></i></div>';
    if (o.pct >= 70) h += '<p class="small" style="margin:0">Vous êtes en tête. La fédération devrait vous proposer l’étiquette d’elle-même.</p>';
    else { const n = o.need; const fd = fed(); h += '<p class="small" style="margin:0">Il vous manque environ <b>' + n + ' points</b> pour passer devant. Au choix, ou en combinant :</p><ul class="small" style="margin:4px 0 0;padding-left:18px"><li>+' + Math.ceil(n / 0.55) + ' de poids dans le parti (section, missions, contributions)</li><li>+' + Math.ceil(n / 0.35) + ' de notoriété ' + (o.scope === 'commune' ? 'dans la commune' : 'dans la circonscription') + ' (terrain, presse)</li><li>une meilleure relation avec ' + (fd ? esc(fd.name) + ', à la fédération' : 'la fédération') + ' (+10 de relation = +1 point)</li><li>une responsabilité au parti : +5 points par échelon</li></ul>' + (o.pct < 15 && o.rival.mandat ? '<p class="small muted" style="margin:6px 0 0">Face à un·e sortant·e de votre parti, l’investiture est presque impossible : rejoindre sa liste, viser une autre élection ou une autre circonscription sont des options.</p>' : ''); }
    return h + '</div>';
  }

  return { K, tick, fx, card, invCard, weight, match, switchTo, canSwitch, myView, addItem, me };
})();
if (typeof window !== 'undefined') window.LN = LN;
