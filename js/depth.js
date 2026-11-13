/* MANDAT — profondeur : débats variés, programmes adverses, situations imprévues */
window.DP = (function () {
  const S = () => G.S, P = () => G.S.p;
  const R = () => E.rnd(); const pick = a => a[Math.floor(R() * a.length)]; const clamp = E.clamp;
  const segN = g => (D.SEGS.find(x => x.id === g) || { name: g }).name.toLowerCase();

  /* ===== Programmes des adversaires ===== */
  const FIN_BY_BLOC = { local: { G: ['taxe', 'redeploiement'], GE: ['subventions', 'taxe', 'redeploiement'], C: ['redeploiement', 'subventions'], D: ['redeploiement', 'emprunt'], ED: ['redeploiement', 'aucun'], DIV: ['subventions', 'redeploiement'] }, national: { G: ['riches'], GE: ['riches', 'dette'], C: ['economies', 'dette'], D: ['economies'], ED: ['economies', 'dette', 'croissance'], DIV: ['economies', 'dette'] } };
  function genProp(x, lvl) {
    const pa = D.PARTIES[x.party].ax; const bloc = D.PARTIES[x.party].bloc; const have = new Set((x.prog || []).map(p => p.lev));
    const NOVIL = ['pm', 'mediateurs', 'parking', 'hlm', 'velo']; const vil = lvl === 'local' && E.myPetite && E.myPetite(); const cands = L.LEVERS.filter(l => l.lvl === lvl && !have.has(l.id) && !(vil && NOVIL.includes(l.id))).map(l => { let dot = 0; for (const k in l.ax) dot += Math.sign(l.ax[k]) * pa[E.AXI[k]] / 100; return { l, dot }; }).filter(c => c.dot > 0.15).sort((a, b) => b.dot - a.dot);
    if (!cands.length) return null; const lev = pick(cands.slice(0, 5)).l;
    let v = lev.def + Math.round((R() - 0.4) * (lev.max - lev.min) / 4 / lev.step) * lev.step; v = clamp(v, lev.min, lev.max); if (lev.id === 'retraite') v = pa[0] < 0 ? 62 : pa[0] > 40 ? 65 : 64; if (lev.id === 'tf') v = pa[0] > 0 ? -2 : 1;
    const fin = pick(FIN_BY_BLOC[lvl][bloc] || ['redeploiement']); const ev = L.evaluate(lev, v, fin, E.commune());
    return { id: E.uid('rp'), lev: lev.id, lvl, v, fin, th: lev.th, label: ev.label, cost: ev.cost, inv: ev.inv, cred: clamp(ev.cred + (R() - 0.5) * 16, 15, 90), seg: ev.seg, gagnants: ev.gagnants, perdants: ev.perdants, vis: 35, hits: 0 };
  }
  function ensureProgs() {
    const s = S(); const el = s.est ? s.elections.find(e => e.id === s.est.el) : null; const lvl = el && ['mun', 'dep', 'reg', 'sen'].includes(el.type) ? 'local' : 'national';
    (s.rivals || []).forEach(id => { const x = s.pnj[id]; if (!x) return; x.prog = x.prog || []; if (!x.prog.some(p => p.lvl === lvl)) { for (let i = 0; i < 2; i++) { const pr = genProp(x, lvl); if (pr) x.prog.push(pr); } } });
  }
  function rivalProgEffect(x, type) {
    if (!x.prog || !x.prog.length) return null; const lvl = ['mun', 'dep', 'reg', 'sen'].includes(type) ? 'local' : 'national'; const o = {};
    x.prog.forEach(p => { const w = (p.vis / 100) * (p.lvl === lvl ? 1 : 0.35) * (0.6 + p.cred / 125); for (const g in p.seg) o[g] = (o[g] || 0) + 0.03 * p.seg[g] * w; });
    for (const k in o) o[k] = clamp(o[k], -0.3, 0.35); return o;
  }
  const ANGLES = {
    cout: { l: 'Le coût et le financement', d: 'Qui paiera ?' },
    faisa: { l: 'La faisabilité', d: 'Promesse impossible ou hors compétence' },
    perdants: { l: 'Les perdants', d: 'Parler à ceux qu’elle sacrifie' },
    alter: { l: 'Votre contre-proposition', d: 'Opposer votre propre mesure sur le même sujet' },
    ridicule: { l: 'La tourner en dérision', d: 'Une formule qui fait mouche… ou qui se retourne' }
  };
  function angleChance(x, pr, angle) {
    const p = P(); let c = 0.3 + (p.cred - 50) / 200 + (((p.expertise || {})[pr.th] || 0) * 0.05) + (E.hasStaff('plume') ? 0.06 : 0);
    const lvlT = X.curLevel();
    if (angle === 'cout') c += (pr.cost > 0 ? 0.08 : -0.2) + (['aucun', 'dette', 'croissance'].includes(pr.fin) ? 0.25 : 0) + (pr.cred < 55 ? 0.15 : 0);
    if (angle === 'faisa') c += (lvlT && lvlT !== pr.lvl ? 0.35 : 0) + (pr.inv > 0 ? 0.08 : 0) + (pr.cred < 45 ? 0.15 : -0.05);
    if (angle === 'perdants') c += Math.min(0.35, pr.perdants.length * 0.14) - (pr.perdants.length ? 0 : 0.25);
    if (angle === 'alter') { const mine = p.prog.filter(m => m.status !== 'retiree' && m.theme === pr.th).sort((a, b) => b.cred - a.cred)[0]; c += mine ? 0.15 + (mine.cred - pr.cred) / 120 : -0.3; }
    if (angle === 'ridicule') c += (p.traits.sangfroid - 50) / 200 + p.mediaTraining * 0.06 - 0.05;
    return clamp(c, 0.05, 0.92);
  }
  function attackProp(xid, pid, angle) {
    const s = S(), p = P(); const x = s.pnj[xid]; const pr = x.prog.find(z => z.id === pid); const ok = R() < angleChance(x, pr, angle); const sc = X.scopeOf();
    pr.hits++; let msg;
    if (ok) {
      pr.cred = clamp(pr.cred - 12, 5, 95); pr.vis = clamp(pr.vis - 14, 0, 100); x.mom -= 0.03; x.rel -= 6; E.addNoto(sc, 1.5); p.cred = clamp(p.cred + 1, 0, 100);
      if (angle === 'perdants') pr.perdants.forEach(g => E.addImage(g, 2.2)); if (angle === 'alter') { const mine = p.prog.filter(m => m.status !== 'retiree' && m.theme === pr.th).sort((a, b) => b.cred - a.cred)[0]; if (mine) mine.visib = clamp(mine.visib + 12, 0, 100); }
      if (angle === 'ridicule') { E.addImageAll(1); E.post(p.name, '@' + E.slug(p.name), '« ' + pr.label + ' » : ' + pick(['même ses amis n’y croient pas.', 'un slogan en quête de financement.', 'la promesse la plus chère de la campagne.']), true, E.rint(200, 2000)); }
      E.article(pick(['dauph', 'radio']), p.name + ' démonte la proposition ' + E.de(x.name) + ' (« ' + pr.label + ' »)', 0.2, 'pj');
      msg = 'L’attaque porte : la proposition ' + E.de(x.name) + ' perd en crédibilité, et vous marquez des points.';
    } else {
      p.cred = clamp(p.cred - 2, 0, 100); E.addImageAll(-1); x.mom += 0.02; x.rel -= 3; if (angle === 'ridicule') E.addImageAll(-1.5);
      E.article('dauph', 'La réplique ' + E.de(x.name) + ' à ' + p.name + ' : « des attaques sans fond »', -0.2, 'pj');
      msg = 'L’attaque tombe à plat : ' + x.name + ' retourne l’argument contre vous.';
    }
    E.log('Attaque contre « ' + pr.label + ' » (' + ANGLES[angle].l.toLowerCase() + ') — ' + msg, ok ? 'good' : 'bad'); return { ok, msg };
  }

  /* ===== Débats : banque de questions par angle, sans répétition ===== */
  const LOCALQ = {
    securite: ['Les cambriolages augmentent dans les lotissements. Que faites-vous la première année ?', 'Faut-il armer la police municipale ?', 'Les habitants d’un quartier ont peur de rentrer le soir. Que leur dites-vous ?'],
    logement: ['Un jeune couple ne trouve rien à moins de 900 € par mois. Votre réponse ?', 'Faut-il construire plus, quitte à bétonner ?', 'Les logements vacants du centre : on les réquisitionne ?'],
    transports: ['Le car pour Grenoble est toujours bondé. Que proposez-vous ?', 'Faut-il réduire la place de la voiture en centre-ville ?', 'Les navetteurs perdent deux heures par jour. Votre plan ?'],
    sante: ['Il faut six mois pour voir un ophtalmologiste. Que pouvez-vous faire, concrètement ?', 'Faut-il salarier des médecins à la mairie ?'],
    education: ['Une classe va fermer à la rentrée. Vous vous battez comment ?', 'Les écoles sont des fournaises l’été. Votre priorité ?'],
    economie: ['Deux usines ont annoncé des plans sociaux. Qu’est-ce qu’un élu local peut faire ?', 'Le centre-ville se vide de ses commerces. Votre plan ?'],
    fiscalite: ['Vous engagez-vous à ne pas augmenter les impôts locaux ?', 'Où feriez-vous des économies dans le budget ?'],
    ecologie: ['Faut-il renoncer au projet de zone commerciale pour protéger les terres agricoles ?', 'Que faites-vous contre les canicules en ville ?'],
    institutions: ['L’abstention dépasse 60 %. Comment redonner envie de voter ?', 'Seriez-vous prêt·e à soumettre les grands projets à référendum local ?']
  };
  const PERSOQ = [
    p => p.mandats.length ? null : 'Vous n’avez jamais exercé de mandat. Pourquoi vous ferait-on confiance ?',
    p => { const n = p.mandats.filter(m => m.type !== 'interco').length; return n > 1 ? 'Vous cumulez déjà ' + n + ' mandats. Vous aurez le temps de tout faire ?' : null; },
    p => p.party !== 'NEW' && (S().national.climate[p.party] || 0) < -0.05 ? 'Votre parti est au plus bas dans les sondages nationaux. Vous en êtes solidaire ?' : null,
    p => (p.distance || 0) > 0.3 ? 'Vous prenez vos distances avec votre parti. Simple calcul électoral ?' : null,
    p => p.casseroles.some(c => c.out) ? 'On a beaucoup parlé de « ' + p.casseroles.find(c => c.out).label + ' ». Vous voulez vous en expliquer ?' : null,
    p => p.party === 'NEW' ? 'Sans parti, sans réseau : vous n’êtes pas un peu seul·e ?' : null,
    p => p.fullTime ? 'Vous vivez de la politique. Vous comprenez encore les gens qui travaillent ?' : 'Vous avez un emploi à côté. Vous serez vraiment disponible ?'
  ];
  function rivalsOf(dctx) { return (dctx.opponents || []).map(o => S().pnj[o.id] || E.findPnj(x => x.name === o.name)).filter(Boolean); }
  function qKey(k) { const s = S(); s.qHist = s.qHist || []; return !s.qHist.includes(k); }
  function remember(k) { const s = S(); s.qHist = (s.qHist || []).concat([k]).slice(-160); }
  const ANG_ORDER = ['programme', 'adversaire', 'contradiction', 'local', 'national', 'valeurs', 'personnel', 'chiffres'];
  function angles(dctx) {
    if (dctx.focusM) return ['programme', 'programme', 'programme'];
    if (dctx.natHook) return ['national'].concat(ANG_ORDER.filter(a => a !== 'national').sort(() => R() - 0.5));
    return ANG_ORDER.slice().sort(() => R() - 0.5);
  }
  function stanceOpts(vec, th, base) { // propositions génériques à partir d’une direction
    return base;
  }
  function fallbackQuestion(dctx, round, used) {
    const p = P(), s = S(); const order = dctx._ang || (dctx._ang = angles(dctx)); const opps = rivalsOf(dctx);
    for (let tries = 0; tries < order.length * 2; tries++) {
      const ang = order[(round + tries) % order.length]; let q = null;
      if (ang === 'programme') {
        const ms = dctx.focusM ? [dctx.focusM] : p.prog.filter(m => m.status !== 'retiree').sort((a, b) => (b.phare - a.phare) || b.visib - a.visib);
        const VK = ['cost', 'losers', 'delay', 'why']; const m = ms.find(z => VK.some(k => qKey('pg' + z.id + k))); if (m) { const variants = [
          ['cost', 'Votre proposition « ' + m.resume + ' »' + (m.cout ? ' coûterait ' + (m.level === 'national' ? (m.cout / 1e9).toFixed(1).replace('.', ',') + ' Md€' : E.eur(m.cout)) + ' par an' : '') + '. Où trouvez-vous l’argent ?'],
          ['losers', '« ' + m.resume + ' » : qui seront les perdants, et que leur dites-vous ?'],
          ['delay', 'Combien de temps pour mettre en œuvre « ' + m.resume + ' », et comment mesurera-t-on le résultat ?'],
          ['why', 'Pourquoi faire de « ' + m.resume + ' » une priorité, plutôt que tout le reste ?']];
          const v = variants.find(x => qKey('pg' + m.id + x[0]));
          const rp = opps.flatMap(x => (x.prog || []).map(pr => ({ x, pr }))).find(z => z.pr.th === m.theme);
          q = { key: 'pg' + m.id + v[0], theme: m.theme, question: v[1], opts: [
            { posture: 'Chiffres', texte: (m.finL ? 'C’est financé : ' + m.finL.toLowerCase() + '. ' : 'Le financement est prévu, poste par poste. ') + (m.ind ? m.ind + '.' : ''), q: m.finL && m.fin !== 'aucun' ? 12 : -6, ax: m.axes },
            { posture: 'Assumer', texte: 'Oui, ' + (m.perdants && m.perdants.length ? 'les ' + m.perdants.map(segN).join(' et les ') + ' feront un effort' : 'il y aura des efforts') + ', mais l’intérêt général le commande.', q: 4, ax: m.axes, risk: 'perdants' },
            rp ? { posture: 'Contre-attaque', texte: 'Et ' + rp.x.name + ', avec « ' + rp.pr.label + ' » ? ' + (['aucun', 'dette', 'croissance'].includes(rp.pr.fin) ? 'Pas un euro de financement.' : 'Personne n’y croit.'), q: ['aucun', 'dette', 'croissance'].includes(rp.pr.fin) ? 10 : 2, attack: { x: rp.x.id, pr: rp.pr.id } } : null,
            { posture: 'Émotion', texte: 'J’ai rencontré des familles qui attendent ça depuis des années. Je ne les laisserai pas tomber.', q: 3, emo: true },
            { posture: 'Esquive', texte: 'Le vrai sujet, c’est la méthode : je réunirai tout le monde autour de la table.', q: -4 }].filter(Boolean) };
        }
      }
      if (ang === 'adversaire' && opps.length) {
        const all = opps.flatMap(x => (x.prog || []).map(pr => ({ x, pr }))); const z = all.find(t => qKey('adv' + t.pr.id)) || null;
        if (z) { const weak = ['aucun', 'dette', 'croissance'].includes(z.pr.fin);
          q = { key: 'adv' + z.pr.id, theme: z.pr.th, question: z.x.name + ' propose « ' + z.pr.label + ' ». Bonne ou mauvaise idée ?', opp: z.x.name + ' : « C’est la seule proposition sérieuse de ce débat. »', opts: [
            { posture: 'Attaque : coût', texte: 'Elle coûte ' + (z.pr.lvl === 'national' ? (z.pr.cost / 1e9).toFixed(1).replace('.', ',') + ' Md€' : E.eur(z.pr.cost)) + ' par an' + (weak ? ' et personne ne sait qui paiera.' : '. Mon adversaire oublie de dire que ce sont les contribuables.'), q: weak ? 14 : 3, attack: { x: z.x.id, pr: z.pr.id, angle: 'cout' } },
            { posture: 'Attaque : perdants', texte: z.pr.perdants.length ? 'Elle sacrifie les ' + z.pr.perdants.map(segN).join(' et les ') + '. Je ne l’accepterai pas.' : 'Elle ne règle rien pour ceux qui en ont le plus besoin.', q: z.pr.perdants.length ? 9 : 0, attack: { x: z.x.id, pr: z.pr.id, angle: 'perdants' } },
            { posture: 'Faisabilité', texte: X.curLevel() && X.curLevel() !== z.pr.lvl ? 'Ce n’est même pas de la compétence de ce mandat. C’est un tract, pas un programme.' : 'Sur le papier, pourquoi pas. Dans la réalité, c’est intenable.', q: X.curLevel() && X.curLevel() !== z.pr.lvl ? 13 : 2, attack: { x: z.x.id, pr: z.pr.id, angle: 'faisa' } },
            { posture: 'Nuance', texte: 'L’intention est bonne, je le reconnais. Mais ma proposition va plus loin, et elle est financée.', q: 6, rel: 4 },
            { posture: 'Punchline', texte: pick(['C’est le Père Noël en campagne électorale.', 'Une promesse, ça n’engage que ceux qui y croient.', 'On a déjà vu ce film, et la fin est toujours la même.']), q: E.rint(-8, 14), punch: true, attack: { x: z.x.id, pr: z.pr.id, angle: 'ridicule' } }] };
        }
      }
      if (ang === 'contradiction') {
        const st = p.stmts.filter(x => x.v && E.diffDays(x.date, s.date) > 20 && ['programme', 'post X', 'meeting', 'tribune', 'citation presse', 'mairie', 'QAG'].includes(x.src) && x.text.length >= 35).find(x => qKey('ct' + x.date + x.theme));
        if (st) q = { key: 'ct' + st.date + st.theme, theme: st.theme, question: 'Le ' + E.fmtDate(st.date) + ', vous déclariez : « ' + st.text.slice(0, 140) + ' ». Vous le maintenez ?', opts: [
          { posture: 'Assumer', texte: 'Je le maintiens, mot pour mot. La constance, c’est ma marque.', q: 10, ax: null },
          { posture: 'Évolution', texte: 'J’ai évolué, parce que la situation a changé. C’est ça, être responsable.', q: 2 },
          { posture: 'Nier', texte: 'Ce n’est pas ce que j’ai dit, mes propos ont été déformés.', q: 5, lie: true },
          { posture: 'Contre-attaque', texte: 'Venant de mes adversaires, qui ont changé d’avis dix fois, la question est savoureuse.', q: 4 },
          { posture: 'Humour', texte: 'Vous avez de bonnes archives ! Oui, et je pourrais même vous le chanter.', q: E.rint(-4, 10), punch: true }] };
      }
      if (ang === 'local') {
        const ths = Object.keys(LOCALQ).sort((a, b) => (s.national.salience[b] || 0) - (s.national.salience[a] || 0) + (R() - 0.5));
        for (const th of ths) { const qi = LOCALQ[th].findIndex((_, i) => qKey('lc' + th + i)); if (qi >= 0) { const mine = p.prog.find(m => m.theme === th && m.status !== 'retiree'); const ax = D.THEMES[th].ax; const k0 = Object.keys(ax)[0]; const sg = Math.sign(p.ax[E.AXI[k0]] || 1) * Math.sign(ax[k0]);
          q = { key: 'lc' + th + qi, theme: th, question: LOCALQ[th][qi], opts: [
            mine ? { posture: 'Proposition', texte: 'Je propose « ' + mine.resume + ' »' + (mine.finL ? ', financé par ' + mine.finL.toLowerCase() : '') + '.', q: 12, ax: mine.axes } : { posture: 'Proposition', texte: 'J’ai un plan précis, je le présenterai dans les prochains jours.', q: -3 },
            { posture: sg > 0 ? 'Fermeté' : 'Solidarité', texte: sg > 0 ? 'Il faut de l’ordre, des règles claires et les faire respecter.' : 'Il faut des moyens publics et ne laisser personne au bord du chemin.', q: 5, ax: { [k0]: 35 * sg * Math.sign(ax[k0]) } },
            { posture: 'Terrain', texte: 'Je connais ce problème : j’ai fait du porte-à-porte dans ce quartier la semaine dernière.', q: Math.min(12, p.camp.terrain / 10 + 2) },
            { posture: 'Attaque', texte: 'Ceux qui sont aux responsabilités depuis des années n’ont rien fait. Les habitants le savent.', q: 4 },
            { posture: 'Esquive', texte: 'C’est un sujet complexe, qui mérite mieux qu’une formule.', q: -5 }] }; break; } }
      }
      if (ang === 'national') {
        const evs = (s.recentEv || []).filter(e => qKey('nt' + e.id)); const rec = (dctx.natHook && qKey('nt' + dctx.natHook.id)) ? dctx.natHook : evs[0];
        const e = rec ? E.evById(rec.id, rec.custom) : null;
        if (e && e.ch) { const gov = s.national.gov.includes(p.party);
          q = { key: 'nt' + rec.id, theme: e.th, question: 'Actualité nationale : « ' + e.t + ' ». Votre position, et qu’est-ce que ça change ici ?', opts: e.ch.map(c => ({ posture: 'Position', texte: c.txt + ' Ici, dans l’Isère, cela touche directement les familles et les entreprises.', q: 6, ax: c.v })).concat([
            { posture: gov ? 'Défendre le gouvernement' : 'Charger le gouvernement', texte: gov ? 'Le gouvernement prend ses responsabilités, et je le soutiens.' : 'Encore une décision prise à Paris contre les territoires.', q: gov ? (s.national.approval > 40 ? 6 : -4) : (s.national.approval < 35 ? 9 : 3) },
            { posture: 'Recentrer', texte: 'Je préfère parler de ce qui relève de nous, ici et maintenant.', q: -2 }]) };
        }
      }
      if (ang === 'valeurs') {
        const qi = D.QUIZ_POOL.map((_, i) => i).sort(() => R() - 0.5).find(i => qKey('vl' + i)); if (qi != null) { const qq = D.QUIZ_POOL[qi]; const pos = {}; const neg = {}; for (const k in qq.w) { pos[k] = qq.w[k]; neg[k] = -qq.w[k]; }
          const th = Object.keys(qq.w)[0] === 'souv' ? 'immigration' : Object.keys(qq.w)[0] === 'aut' ? 'securite' : Object.keys(qq.w)[0] === 'ecol' ? 'ecologie' : Object.keys(qq.w)[0] === 'inst' ? 'institutions' : Object.keys(qq.w)[0] === 'eco' ? 'economie' : 'societe';
          q = { key: 'vl' + qi, theme: th, question: 'Question directe : « ' + qq.q + ' » Oui ou non ?', opts: [
            { posture: 'Oui', texte: 'Oui, clairement. Et je l’assume devant tous les électeurs.', q: 6, ax: pos },
            { posture: 'Non', texte: 'Non. Et je ne changerai pas d’avis pour plaire.', q: 6, ax: neg },
            { posture: 'Oui, mais', texte: 'Sur le principe oui, mais avec des garde-fous stricts.', q: 3, ax: Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, v / 2])) },
            { posture: 'Esquive', texte: 'Ce n’est pas l’enjeu de cette élection.', q: -6 },
            { posture: 'Retourner', texte: 'Posez plutôt la question à mon adversaire, qui n’ose jamais répondre.', q: 2 }] }; }
      }
      if (ang === 'personnel') {
        const fs = PERSOQ.map((f, i) => [i, f(p)]).filter(([i, t]) => t && qKey('ps' + i)); if (fs.length) { const [i, t] = pick(fs);
          q = { key: 'ps' + i, theme: 'institutions', question: t, opts: [
            { posture: 'Sincérité', texte: 'Je vais vous répondre franchement, sans langue de bois : je comprends la question, et voici ma réponse.', q: 7 + (p.traits.scrupules - 50) / 10 },
            { posture: 'Parcours', texte: 'Mon parcours parle pour moi : ' + D.METIERS.find(m => m.id === p.metier).label.toLowerCase() + ', engagé·e sur le terrain depuis des années.', q: 5 },
            { posture: 'Contre-attaque', texte: 'Ceux qui me posent cette question devraient regarder leur propre bilan.', q: 2 },
            { posture: 'Agacement', texte: 'C’est une question indigne, je ne répondrai pas.', q: -6 }] }; }
      }
      if (ang === 'chiffres') {
        const n = L.NAT.find(x => qKey('ch' + x.l)); const loc = L.local(E.commune()); const lr = loc.rows.find(r => qKey('chl' + r[1]));
        const useLoc = X.curLevel() === 'local' && lr; const lab = useLoc ? lr[1] + ' : ' + lr[2] : n ? n.l + ' : ' + n.v : null;
        if (lab) { const th = useLoc ? lr[0] : n.th; const mine = p.prog.find(m => m.theme === th && m.status !== 'retiree');
          q = { key: useLoc ? 'chl' + lr[1] : 'ch' + n.l, theme: th, question: 'Un chiffre : ' + lab + '. Que faites-vous avec ça ?', opts: [
            mine ? { posture: 'Proposition', texte: 'C’est exactement pour ça que je propose « ' + mine.resume + ' ».', q: 12, ax: mine.axes } : { posture: 'Proposition', texte: 'Il faut un plan, et je le mettrai sur la table.', q: -2 },
            { posture: 'Relativiser', texte: 'Ce chiffre ne dit pas tout : il cache des réalités très différentes selon les quartiers.', q: 3 },
            { posture: 'Dramatiser', texte: 'Ce chiffre est un scandale. Et personne n’en parle.', q: 5, emo: true },
            { posture: 'Accuser', texte: 'C’est le bilan de ceux qui gouvernent. Il faut que ça change.', q: 4 }] }; }
      }
      if (q) { remember(q.key); q.angle = ang; const op = opps[0]; q.adversaires = q.opp ? [{ nom: (op || {}).name || 'Adversaire', replique: q.opp.split(' : ').slice(1).join(' : ') || q.opp }] : opps.slice(0, 2).map(x => ({ nom: x.name, replique: oppLine(x, q.theme) })); q.propositions = q.opts.map(o => Object.assign({}, o)); return q; }
    }
    return null;
  }
  const OPPL = {
    G: ['Le problème, c’est l’argent qui manque aux services publics.', 'Les plus riches doivent enfin payer leur part.', 'Pendant qu’on parle, les hôpitaux ferment des lits.', 'Vous défendez les actionnaires, je défends les salariés.', 'Les fins de mois difficiles, ce n’est pas une abstraction.', 'Il faut reprendre le contrôle de ce qui nous appartient : l’eau, l’énergie, les transports.'],
    GE: ['Il faut une transition juste, pas des slogans.', 'On ne réglera rien sans les associations et les habitants.', 'Le climat n’attendra pas la prochaine élection.', 'Je propose des solutions qui protègent à la fois la planète et le porte-monnaie.', 'Votre modèle, c’est celui d’hier.', 'Les jeunes nous regardent, et ils ont raison d’être en colère.'],
    C: ['Soyons sérieux : des solutions qui marchent, financées.', 'Ni démagogie ni immobilisme.', 'Je préfère la méthode aux postures.', 'Les Français veulent des résultats, pas des polémiques.', 'On peut réformer sans brutaliser.', 'Votre programme, c’est un catalogue sans budget.'],
    D: ['Il faut de l’ordre et de la rigueur budgétaire.', 'Le travail doit payer plus que l’assistance.', 'On a trop dépensé, trop longtemps.', 'Les classes moyennes paient pour tout et ne reçoivent rien.', 'L’autorité, ce n’est pas un gros mot.', 'Moins de normes, plus de liberté pour ceux qui entreprennent.'],
    ED: ['Les Français ne se sentent plus chez eux.', 'Le système vous protège, nous on protège les Français.', 'Vous avez gouverné, vous avez échoué.', 'La sécurité d’abord, le reste suivra.', 'On ferme les yeux depuis trop longtemps.', 'Les élites ont abandonné nos territoires.']
  };
  // Lignes d'adversaire par thème et par sensibilité (gauche, centre, droite, liste locale sans étiquette)
  const TH_LINES = {
    securite: { g: ['La sécurité, c’est d’abord de la prévention : des éducateurs, de l’éclairage, des lieux pour les jeunes.', 'Plus de caméras ne remplacera jamais des humains sur le terrain.'], c: ['Il faut de la présence et de la méthode : police municipale et prévention, les deux.', 'Je veux des résultats mesurables, quartier par quartier.'], d: ['Les habitants veulent de l’ordre. Il faut une police municipale visible et des sanctions.', 'Les incivilités, on les laisse passer depuis trop longtemps.'], loc: ['Ici, la sécurité, c’est surtout la vitesse des voitures dans la traversée du village.', 'Je connais chaque rue : il faut des ralentisseurs et de l’éclairage là où c’est dangereux.'] },
    fiscalite: { g: ['Je préfère des services publics solides à une baisse d’impôt de quelques euros.', 'Chacun doit payer selon ses moyens, c’est une question de justice.'], c: ['Pas de hausse d’impôts : on peut faire mieux avec le même budget.', 'Chaque euro dépensé doit être justifié devant les habitants.'], d: ['La taxe foncière a trop augmenté. Je m’engage à la baisser.', 'Avant de demander plus aux habitants, la mairie doit faire des économies.'], loc: ['Pas un centime d’impôt en plus : on finance nos projets avec les subventions du Département et de la Région.', 'Les gens paient déjà assez. Il faut aller chercher les aides, pas augmenter les taux.'] },
    education: { g: ['L’école, c’est la priorité : des classes rénovées et une cantine accessible à tous.', 'On ne fermera pas une seule classe sans se battre.'], c: ['Je veux des écoles rénovées et un périscolaire qui aide vraiment les parents.', 'Investir dans l’école, c’est l’investissement le plus rentable.'], d: ['L’école doit retrouver de l’exigence et de la tranquillité.', 'Je veux des écoles sûres et bien tenues, avant de nouveaux gadgets.'], loc: ['Sans école, le village meurt. Je me battrai pour garder nos classes.', 'Il faut attirer des familles : cantine, garderie, et une école qui reste ouverte.'] },
    sante: { g: ['Il faut un centre de santé avec des médecins salariés.', 'La santé ne doit pas dépendre de l’endroit où l’on habite.'], c: ['Je veux attirer des médecins avec une maison de santé et un logement à disposition.', 'La santé, c’est aussi la prévention et le sport pour tous.'], d: ['On doit aller chercher les médecins avec des aides à l’installation.', 'Les habitants ne doivent plus attendre trois mois pour un rendez-vous.'], loc: ['Le médecin part à la retraite l’an prochain. Il faut trouver un remplaçant maintenant.', 'Une navette vers le cabinet médical du bourg, pour ceux qui ne conduisent plus.'] },
    economie: { g: ['Il faut soutenir les commerces de proximité, pas les grandes surfaces.', 'L’emploi local passe par la commande publique.'], c: ['Je veux faire revenir les commerces et accompagner ceux qui créent.', 'Une commune attractive, c’est une commune qui facilite la vie des entreprises.'], d: ['Moins de paperasse et plus de liberté pour ceux qui créent des emplois.', 'Les commerçants ont besoin qu’on les écoute, pas qu’on leur impose des règles.'], loc: ['Il faut sauver le dernier commerce : la commune peut racheter le local.', 'Nos artisans et nos agriculteurs doivent pouvoir travailler ici.'] },
    pouvoir_achat: { g: ['Je propose la gratuité de la cantine pour les familles modestes.', 'Les fins de mois difficiles, ce n’est pas une abstraction.'], c: ['Des aides ciblées, pour ceux qui en ont vraiment besoin.', 'On peut aider les familles sans creuser la dette.'], d: ['La meilleure aide au pouvoir d’achat, c’est de baisser les impôts locaux.', 'Il faut arrêter de faire payer toujours les mêmes.'], loc: ['Un transport scolaire gratuit, ça change la vie des familles ici.', 'Tout coûte plus cher quand on doit prendre la voiture pour tout.'] },
    ecologie: { g: ['La transition doit être juste : rénover les logements, c’est baisser les factures.', 'Le climat n’attendra pas la prochaine élection.'], c: ['Une écologie concrète : rénovation des bâtiments publics, cantine locale.', 'Je préfère des projets utiles aux grandes déclarations.'], d: ['L’écologie, oui, mais sans punir ceux qui ont besoin de leur voiture.', 'Pas d’écologie punitive pour les habitants.'], loc: ['Une cantine avec les produits de nos fermes : c’est bon pour tout le monde.', 'On peut rénover l’école et la mairie pour réduire les factures de la commune.'] },
    transports: { g: ['Des transports en commun plus fréquents et moins chers.', 'Il faut des pistes cyclables sûres pour les enfants.'], c: ['Il faut combiner voiture, bus et vélo, sans opposer les uns aux autres.', 'Je veux améliorer les liaisons avec la gare.'], d: ['Arrêtons la guerre contre la voiture.', 'Il faut fluidifier la circulation et créer du stationnement.'], loc: ['Sans voiture, ici, on est coincé. Il faut une navette vers le bourg.', 'Le car scolaire doit passer aussi par les hameaux.'] },
    logement: { g: ['Il faut des logements abordables pour que les jeunes puissent rester.', 'Je ferai respecter la loi sur les logements sociaux.'], c: ['Construire, oui, mais avec mesure et en concertation.', 'Je veux des logements pour les jeunes actifs et les seniors.'], d: ['Je refuse le bétonnage imposé par l’État.', 'Il faut d’abord rénover l’existant.'], loc: ['Les jeunes du village ne trouvent rien à louer. Il faut quelques logements communaux.', 'Pas de grand lotissement : quelques maisons, intégrées au village.'] },
    agriculture: { g: ['Il faut des prix justes pour les paysans, pas pour la grande distribution.', 'La cantine doit acheter aux fermes du coin, c’est bon pour tout le monde.'], c: ['Je veux aider les jeunes à s’installer et protéger les terres agricoles.', 'Moins de paperasse pour les agriculteurs, et des débouchés locaux.'], d: ['On étouffe nos agriculteurs sous les normes. Il faut les laisser travailler.', 'Nos paysans subissent une concurrence déloyale.'], loc: ['Les terres doivent rester aux agriculteurs, pas partir en lotissements.', 'Un marché de producteurs, c’est simple et ça fait vivre le village.'] },
    immigration: { g: ['L’accueil doit être digne, et l’intégration passe par le travail et la langue.', 'Ceux qui travaillent ici depuis des années doivent pouvoir être régularisés.'], c: ['Fermeté sur les règles, humanité dans l’accueil.', 'Il faut appliquer les décisions d’expulsion et mieux intégrer ceux qui restent.'], d: ['Il faut reprendre le contrôle de nos frontières.', 'L’immigration doit être choisie, et beaucoup plus limitée.'], loc: ['Ce n’est pas un sujet de mairie, mais l’intégration se joue aussi dans nos clubs et nos écoles.', 'Chacun doit respecter les règles de vie du village.'] },
    europe: { g: ['L’Europe doit protéger les salariés, pas seulement les marchés.', 'Je veux une Europe sociale et écologique.'], c: ['Face aux grandes puissances, l’Europe est notre force.', 'Une défense européenne, c’est notre sécurité.'], d: ['L’Europe doit respecter les choix des nations.', 'Moins de règles venues de Bruxelles, plus de décisions prises chez nous.'], loc: ['Les fonds européens peuvent financer nos projets : il faut aller les chercher.', 'L’Europe, ici, c’est surtout la politique agricole.'] },
    industrie: { g: ['Il faut empêcher les délocalisations et conditionner les aides publiques.', 'Reprenons le contrôle de nos industries stratégiques.'], c: ['Une énergie bon marché et moins d’impôts de production, c’est ça qui fait revenir les usines.', 'L’industrie de demain se construit avec la formation.'], d: ['Baissons les charges et les impôts de production, les usines reviendront.', 'Le nucléaire est notre meilleur atout industriel.'], loc: ['La zone d’activité doit accueillir des artisans et des PME.', 'Chaque emploi créé ici, c’est une famille qui reste.'] },
    societe: { g: ['Je veux une société plus égale, qui ne laisse personne de côté.', 'La culture et le sport doivent être accessibles à tous.'], c: ['Je veux apaiser, rassembler, sans brutalité.', 'Les associations sont le cœur de la vie locale : il faut les soutenir.'], d: ['Il faut retrouver le respect, l’autorité et nos repères.', 'La famille et le travail doivent être au cœur de la société.'], loc: ['Une salle des fêtes digne de ce nom, et un comité des fêtes soutenu.', 'Il faut que les nouveaux arrivants se sentent chez eux au village.'] },
    institutions: { g: ['Je veux associer les habitants à chaque grande décision.', 'Un budget participatif, pour que les habitants décident.'], c: ['Une mairie plus transparente, avec un compte rendu public de chaque décision.', 'Je rendrai des comptes chaque année devant les habitants.'], d: ['Moins de réunions, plus de décisions.', 'Les habitants veulent une mairie qui agit, pas qui consulte sans fin.'], loc: ['Une réunion publique par trimestre, et la mairie ouverte le samedi.', 'Ici, tout le monde doit pouvoir venir parler au maire.'] }
  };
  const SIDE = { G: 'g', GE: 'g', C: 'c', D: 'd', ED: 'd', DIV: 'c' };
  const lc = l => l.charAt(0).toLowerCase() + l.slice(1);
  function oppLine(x, th, villageMode) { const side = villageMode ? 'loc' : SIDE[D.PARTIES[x.party].bloc] || 'c';
    const mine = (x.prog || []).find(pr => pr.th === th);
    if (mine && R() < 0.5) return E.fresh('opp' + x.id, ['Ma proposition est claire : ' + lc(mine.label) + '.', 'Ce que je propose : ' + lc(mine.label) + '. C’est concret.', 'Avec « ' + mine.label + ' », on change la vie des gens.']);
    const T = TH_LINES[th]; if (T) return E.fresh('oppt' + x.id + th, T[side] || T.c);
    const L = OPPL[D.PARTIES[x.party].bloc] || OPPL.C; return E.fresh('oppl' + x.id, L);
  }
  function fallbackJudge(dctx, q, reply, chosen) {
    const p = P(); const o = chosen || {}; let sc = 48 + (o.q || 0) + p.mediaTraining * 3 + (p.traits.sangfroid - 50) / 8 + (E.rnd() * 16 - 8); if (!chosen) sc += Math.min(12, reply.length / 25) - 2;
    const seg = {}; const v = E.vecFrom(o.ax || {}); D.SEGS.forEach(g => seg[g.id] = Math.round(E.alignment(v, g.ideal) * 9 + (sc - 50) / 8 + (o.emo && ['RET', 'POP'].includes(g.id) ? 2 : 0)));
    let lie = !!o.lie; if (o.lie && q.angle === 'contradiction') sc += 4;
    const gaffe = sc < 22 || (o.punch && E.rnd() < 0.15);
    return { score: clamp(Math.round(sc), 5, 95), segments: seg, axes: o.ax || {}, mensonge: lie, affirmation: lie ? reply : null, punchline: o.punch && sc > 60 ? reply : (sc > 78 ? reply.split(/[.!?]/)[0] : null), gaffe, commentaire: sc > 68 ? pick(['Réponse percutante, l’adversaire accuse le coup.', 'Coup gagnant : le public réagit.', 'Précis et incisif.']) : sc > 48 ? pick(['Réponse solide, sans plus.', 'Correct, mais attendu.', 'Ça tient la route.']) : pick(['Réponse confuse, ça flotte.', 'L’adversaire a marqué un point.', 'Trop défensif.']), reaction: { nom: (dctx.opponents[0] || {}).name || 'Adversaire', texte: sc > 60 ? pick(['Facile à dire quand on n’a jamais été aux responsabilités.', 'Des mots, toujours des mots.', 'Vous esquivez la vraie question.']) : pick(['Vous voyez bien que ça ne tient pas.', 'Même vos amis n’y croient pas.', 'Les électeurs jugeront.']) } };
  }
  const RIPOSTES = [
    { id: 'chiffre', l: 'Insister, chiffres à l’appui', f: () => (P().cred - 45) / 3 + (((P().expertise || {})) ? 2 : 0) },
    { id: 'attaque', l: 'Attaquer sa proposition', f: (q, x) => { const pr = x && (x.prog || [])[0]; return pr ? (['aucun', 'dette', 'croissance'].includes(pr.fin) ? 9 : 3) + (pr.cred < 50 ? 4 : -2) : -3; } },
    { id: 'calme', l: 'Rester calme et laisser couler', f: () => 1 + (P().traits.sangfroid - 50) / 20 },
    { id: 'punch', l: 'Une formule qui claque', f: () => E.rint(-10, 14) + P().mediaTraining * 2 }
  ];

  /* ===== Situations imprévues ===== */
  const SIT = [
    { id: 'marche', c: () => true, t: 'Interpellé·e au marché, devant une caméra', d: 'Un commerçant vous prend à partie sur les charges et la paperasse. Un passant filme.', o: [
      ['Écouter longuement, promettre de revenir', () => { E.addImage('PERI', 2); E.addImage('RET', 1); return 'La vidéo montre un·e élu·e à l’écoute. Elle tourne bien.'; }],
      ['Répliquer sèchement', () => { if (E.rnd() < 0.5) { E.addImageAll(-2.5); E.article('info24', 'La vidéo ' + E.de(P().name) + ' qui s’emporte au marché', -0.5, 'pj'); return 'La vidéo devient virale, et pas en bien.'; } E.addImage('POP', 1.5); return 'Votre franchise plaît à certains.'; }],
      ['Lui proposer une réunion avec les commerçants', () => { E.addImage('PERI', 1.2); E.addImage('CAD', 1); P().hours = Math.max(0, P().hours - 2); return 'Réunion calée (2 h de votre temps), les commerçants apprécient.'; }]] },
    { id: 'ag', c: p => p.party !== 'NEW', t: 'Deux rendez-vous le même soir', d: 'L’assemblée générale d’une grosse association de quartier tombe le soir de la réunion de section.', o: [
      ['L’association', () => { E.addImage('POP', 2); E.addImage('RET', 1.5); E.addStd(-2); return 'Les habitants s’en souviendront. Le parti un peu moins bien.'; }],
      ['La section', () => { E.addStd(2.5); P().fedSup = clamp(P().fedSup + 1, 0, 100); return 'Les militants apprécient votre présence.'; }],
      ['Envoyer un collaborateur à l’association', p => { if (!p.staff.length) { E.addImage('POP', -1); return 'Personne à envoyer : l’association remarque votre absence.'; } E.addImage('POP', 1); E.addStd(2); return 'Compromis acceptable des deux côtés.'; }]] },
    { id: 'exclu', c: () => true, t: 'Un journaliste propose un marché', d: 'Il vous offre un portrait flatteur… contre une information sur les divisions de votre camp.', o: [
      ['Lâcher l’information', p => { const j = E.pick(E.pnjList(x => x.role === 'journaliste')); j.rel += 12; E.addNoto(X.scopeOf(), 5); E.addStd(-5); const a = E.pick(E.pnjList(x => x.party === p.party && x.known && x.role !== 'journaliste')); if (a) { a.rel -= 20; } E.article(j.territory, 'Portrait : ' + p.name + ', l’ambition sans complexe', 0.3, 'pj'); return 'Portrait publié. En interne, on cherche qui a parlé.'; }],
      ['Refuser poliment', () => { P().cred = clamp(P().cred + 1, 0, 100); return 'Le journaliste note votre loyauté. Pas de portrait.'; }]] },
    { id: 'societe', c: p => !!p.cand, t: 'Un chef d’entreprise veut « aider »', d: 'Il propose de financer vos tracts via sa société. Les dons des personnes morales sont interdits.', o: [
      ['Accepter, discrètement', p => { p.cash += 4000; E.casserole('occulte', 'des tracts payés par une entreprise (don de personne morale)', 2, true, 0.06); return '4 000 € de tracts en plus. Et une casserole.'; }],
      ['Refuser, mais lui proposer un don personnel plafonné', p => { if (p.cand && p.cand.compte) { p.cand.compte.dons += 1500; p.cand.compte.recettes += 1500; return 'Il verse 1 500 € à titre personnel, en toute légalité.'; } p.cash += 800; return 'Il soutient votre mouvement à titre personnel.'; }],
      ['Refuser sèchement', () => { P().cred = clamp(P().cred + 0.5, 0, 100); return 'Vous gardez les mains propres.'; }]] },
    { id: 'colistier', c: p => !!p.cand, t: 'Un passé encombrant dans votre équipe', d: 'Un militant vous signale qu’un de vos soutiens a été condamné pour violences il y a dix ans.', o: [
      ['L’écarter immédiatement', () => { P().cred = clamp(P().cred + 1.5, 0, 100); P().militants = Math.max(0, P().militants - 2); return 'Décision saluée, quelques militants grognent.'; }],
      ['Le garder : chacun a droit à une seconde chance', () => { if (E.rnd() < 0.4) { E.surface(E.casserole('entourage', 'un soutien condamné pour violences dans votre équipe', 1, false, 0), 'La presse a retrouvé le jugement.'); return 'La presse l’apprend.'; } return 'Personne n’en parle… pour l’instant.'; }]] },
    { id: 'video', c: () => true, t: 'Une vidéo coupée circule', d: 'Un extrait de 12 secondes vous fait dire l’inverse de ce que vous pensez.', o: [
      ['Publier la vidéo complète', () => { E.addImageAll(0.8); P().cred = clamp(P().cred + 1, 0, 100); return 'La manipulation est démontée, vous en sortez grandi·e.'; }],
      ['Porter plainte', p => { p.cash -= 1500; E.addImageAll(0.3); return 'Plainte déposée. L’affaire suivra son cours.'; }],
      ['Laisser courir', () => { E.addImageAll(-1.8); return 'L’extrait continue de circuler.'; }]] },
    { id: 'usine', c: () => true, t: 'Rassemblement devant une usine menacée', d: 'Les syndicats appellent à se rassembler devant un site qui pourrait fermer.', o: [
      ['Y aller, au milieu des salariés', () => { E.addImage('POP', 3); E.addImage('CAD', -1); E.addNoto(X.scopeOf(), 2); return 'Images fortes au journal régional.'; }],
      ['Un communiqué de soutien mesuré', () => { E.addImage('POP', 1); return 'Soutien noté, sans plus.'; }],
      ['Rencontrer la direction plutôt que les syndicats', () => { E.addImage('CAD', 2); E.addImage('POP', -1.5); return 'Une démarche jugée sérieuse par les uns, distante par les autres.'; }]] },
    { id: 'crue', c: () => true, t: 'Orages violents : un quartier sous l’eau', d: 'Caves inondées, routes coupées. Les secours sont sur place.', o: [
      ['Aller sur place, en bottes', () => { E.addImage('RET', 2); E.addImage('POP', 2); E.addNoto(X.scopeOf(), 3); return 'On vous voit aider les sinistrés. Ça compte.'; }],
      ['Dénoncer l’imprévoyance de la majorité', p => { if (p.mairie) { E.addImageAll(-1); return 'Difficile quand on est soi-même maire…'; } E.addImage('PERI', 1.5); E.addImage('RET', -1); return 'Polémique en pleine crise : ça divise.'; }],
      ['Rester discret, laisser travailler les secours', () => { P().cred = clamp(P().cred + 1, 0, 100); return 'Sobriété appréciée par certains, absence remarquée par d’autres.'; }]] },
    { id: 'influ', c: () => true, t: 'Un influenceur local vous invite en live', d: '45 000 abonnés, ton décontracté, questions imprévisibles.', o: [
      ['Accepter', p => { if (E.rnd() < 0.7) { E.addImage('JUD', 3); p.followers += E.rint(300, 1500); return 'Le live cartonne chez les jeunes.'; } E.addImageAll(-1.5); return 'Une question piège vous déstabilise en direct.'; }],
      ['Refuser', () => { E.addImage('JUD', -0.8); return 'Une occasion manquée auprès des jeunes.'; }]] },
    { id: 'baron', c: p => p.party !== 'NEW' && p.prole >= 1, t: 'Une proposition venue d’en haut', d: 'Un baron du parti vous propose son soutien au prochain congrès, contre votre loyauté sur un vote interne.', o: [
      ['Accepter le pacte', p => { const b = E.partyFigures().find(x => x.role === 'baron'); if (b) { b.rel += 15; p.accords.push({ id: E.uid('acc'), with: b.id, clauses: ['soutien'], date: S().date, status: 'actif' }); } p.natSup = clamp(p.natSup + 3, 0, 100); return 'Pacte conclu. Vous voilà lié·e.'; }],
      ['Refuser : je reste libre', p => { p.cred = clamp(p.cred + 0.5, 0, 100); const b = E.partyFigures().find(x => x.role === 'baron'); if (b) b.rel -= 6; return 'Indépendance préservée, un baron vexé.'; }]] },
    { id: 'fusion', c: p => !!p.cand && E.phase().id !== 'hors', t: 'Une petite liste propose de fusionner', d: 'Une liste citoyenne à 4 % vous propose de vous rejoindre contre deux places éligibles.', o: [
      ['Accepter', p => { p.mom += 0.03; p.militants += 6; E.addStd(-2); return 'Renfort bienvenu. Deux de vos fidèles reculent sur la liste et grincent.'; }],
      ['Refuser', p => { p.mom -= 0.01; return 'Ils maintiennent leur liste et grignoteront quelques voix.'; }]] },
    { id: 'classe', c: () => true, t: 'Une fermeture de classe annoncée', d: 'L’école du quartier perd une classe à la rentrée. Les parents se mobilisent.', o: [
      ['Lancer une pétition avec les parents', () => { E.addImage('CAD', 2); E.addImage('JUD', 2); return '1 200 signatures en une semaine.'; }],
      ['Écrire au rectorat, sans bruit', p => { if (p.mandats.length) { P().cred = clamp(P().cred + 1.5, 0, 100); return 'Le rectorat répond : on rouvre le dossier.'; } return 'Sans mandat, la lettre reste sans réponse.'; }],
      ['Ne pas s’en mêler', () => { E.addImage('CAD', -1); return 'Les parents remarquent votre silence.'; }]] },
    { id: 'sondfuite', c: p => !!p.cand, t: 'Un sondage interne a fuité', d: 'Votre sondage interne, plutôt mauvais, se retrouve dans la presse.', o: [
      ['Assumer : « on part de loin, on va remonter »', p => { p.cred = clamp(p.cred + 1, 0, 100); p.mom -= 0.01; return 'Lucidité saluée.'; }],
      ['Démentir son authenticité', p => { if (E.rnd() < 0.4) { p.cred = clamp(p.cred - 3, 0, 100); return 'Le sondeur confirme : vous voilà pris·e en défaut.'; } return 'Le doute s’installe sur le sondage.'; }],
      ['Chercher la fuite dans l’équipe', p => { p.staff.forEach(x => { x.audited = true; x.loy -= 3; }); return 'Ambiance pesante, mais vous savez maintenant qui est loyal.'; }]] },
    { id: 'debatpublic', c: () => true, t: 'Invitation à un débat public dans une salle des fêtes', d: 'Un collectif d’habitants organise une soirée questions-réponses. Ambiance chaude annoncée.', o: [
      ['Y aller', p => { const r = E.rnd(); if (r < 0.65) { E.addImageAll(1.5); E.addNoto('commune', 2.5); return 'Salle comble, vous tenez la soirée.'; } E.addImageAll(-1.5); return 'Une partie de la salle vous chahute.'; }],
      ['Décliner', () => { E.addImage('POP', -1); return 'Votre chaise vide est remarquée.'; }]] }
  ];
  function situationTick(days) {
    const s = S(), p = P(); const pr = Math.min(0.85, 0.45 * days / 14 + 0.06); if (E.rnd() > pr) return;
    s.sitDone = s.sitDone || []; const pool = SIT.filter(x => x.c(p) && !s.sitDone.slice(-8).includes(x.id)); if (!pool.length) return;
    const x = pick(pool); s.sitDone.push(x.id); s.queue.push({ kind: 'situation', id: x.id });
  }
  function situationResolve(id, idx) { const x = SIT.find(z => z.id === id); const msg = x.o[idx][1](P()); E.log(x.t + ' — ' + msg, 'event'); return msg; }

  return { TH_LINES, oppLine, ensureProgs, rivalProgEffect, genProp, ANGLES, angleChance, attackProp, fallbackQuestion, fallbackJudge, RIPOSTES, SIT, situationTick, situationResolve, remember };
})();
