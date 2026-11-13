/* MANDAT — profondeur : débats variés, programmes adverses, situations imprévues */
window.DP = (function () {
  const S = () => G.S, P = () => G.S.p;
  const R = () => E.rnd(); const pick = a => a[Math.floor(R() * a.length)]; const clamp = E.clamp;
  const segN = g => (D.SEGS.find(x => x.id === g) || { name: g }).name.toLowerCase();

  /* ===== Programmes des adversaires ===== */
  const weakF = pr => !!pr && ['aucun', 'dette', 'croissance'].includes(pr.fin) && ((pr.cost || 0) > 0 || (pr.inv || 0) > 0);
  const FIN_BY_BLOC = { local: { G: ['taxe', 'redeploiement'], GE: ['subventions', 'taxe', 'redeploiement'], C: ['redeploiement', 'subventions'], D: ['redeploiement', 'emprunt'], ED: ['redeploiement', 'aucun'], DIV: ['subventions', 'redeploiement'] }, national: { G: ['riches'], GE: ['riches', 'dette'], C: ['economies', 'dette'], D: ['economies'], ED: ['economies', 'dette', 'croissance'], DIV: ['economies', 'dette'] } };
  // Mesures emblématiques de chaque parti (choisies en priorité) et mesures qu’il ne proposerait jamais
  const SIG = {
    LFI: ['smic', 'retraite', 'isf', 'superprofits', 'loyers', 'regul', 'vert', 'rail', 'ric', 'cantine_soc', 'transco', 'medecins', 'hlm', 'bp', 'mediateurs', 'csdep', 'cantcol', 'ter', 'tarifjeunes', 'smiceu', 'ttf', 'pac', 'formation', 'jeunes', 'mutuelle'],
    PCF: ['smic', 'retraite', 'isf', 'soignants', 'construire', 'prixagri', 'nucleaire', 'rail', 'medecins', 'hlm', 'mutuelle', 'cantine_soc', 'transco', 'csdep', 'apa', 'cantcol', 'ter', 'pac', 'smiceu', 'reindus', 'formation', 'aines', 'dgf'],
    ECO: ['vert', 'renov', 'jets', 'rail', 'velo', 'bio', 'arbres', 'solaire', 'renovpub', 'terres', 'marche', 'voiesvertes', 'enr', 'ter', 'tarifjeunes', 'mfac', 'pac', 'eurodette', 'regul', 'loyers', 'aidemourir', 'eclairage', 'primeveh', 'agrijeunes'],
    PS: ['construire', 'loyers', 'medreg', 'enseignants', 'salprofs', 'patrimoine', 'hlm', 'creches', 'ecoles', 'perisco', 'medecins', 'csdep', 'apa', 'college', 'ase', 'lycees', 'ter', 'defeur', 'ukraine', 'smiceu', 'aidemourir', 'mfac', 'garderie'],
    REN: ['production', 'chargesbas', 'depenses', 'nucleaire', 'ptz', 'policiers', 'defeur', 'ukraine', 'achatfr', 'eurodette', 'reindus', 'formation', 'commerces', 'cam', 'proprete', 'internes', 'unanimite', 'mfac', 'reseaux', 'college'],
    MODEM: ['proportionnelle', 'depenses', 'ptz', 'chargesbas', 'defeur', 'dgf', 'statut', 'ecoles', 'commerces', 'maison_sante', 'internes', 'reunions', 'medreg', 'unanimite', 'apa', 'agrijeunes'],
    HOR: ['depenses', 'prisons', 'production', 'chargesbas', 'nucleaire', 'chomage', 'policiers', 'cam', 'pm', 'tf', 'college', 'rsa15', 'reindus', 'defeur', 'formation', 'statut', 'pompiers'],
    LR: ['depenses', 'prisons', 'peines', 'policiers', 'chargesbas', 'heritage', 'titres', 'ame', 'chomage', 'uniforme', 'nucleaire', 'normes', 'pm', 'cam', 'tf', 'rsa15', 'route90', 'portiques', 'secugares', 'frontex', 'dgf', 'zan', 'pompiers', 'stations', 'parking'],
    UDR: ['heritage', 'depenses', 'titres', 'ame', 'peines', 'prisons', 'tva', 'normes', 'nucleaire', 'thermique', 'pm', 'cam', 'tf', 'mna', 'route90', 'frontex', 'contrib', 'parking', 'zan'],
    RN: ['tva', 'titres', 'ame', 'peines', 'prisons', 'retraite', 'nucleaire', 'mercosur', 'contrib', 'uniforme', 'ric', 'proportionnelle', 'pm', 'cam', 'tf', 'parking', 'mna', 'route90', 'portiques', 'secugares', 'frontex', 'normes', 'thermique', 'superprofits', 'policiers'],
    REC: ['titres', 'ame', 'peines', 'prisons', 'heritage', 'depenses', 'nucleaire', 'uniforme', 'pm', 'cam', 'tf', 'mna', 'frontex', 'contrib', 'thermique', 'parking'],
    DIV: ['ralentir', 'ecole_v', 'garderie', 'maison_sante', 'multiple', 'chemins', 'salle', 'reunions', 'proprete', 'eclairage', 'tf', 'commerces', 'parking', 'internes', 'aines', 'tad', 'voisins', 'dgf', 'statut', 'zan']
  };
  const RIGHT_BAN = ['bp', 'regul', 'cannabis', 'isf', 'loyers', 'vert', 'jets', 'eurodette', 'ttf', 'smiceu', 'unanimite', 'mediateurs', 'aidemourir'];
  const BAN = {
    LFI: ['nucleaire', 'titres', 'ame', 'peines', 'prisons', 'depenses', 'chomage', 'heritage', 'production', 'cam', 'pm', 'parking', 'chargesbas', 'defeur', 'thermique', 'route90', 'portiques', 'secugares', 'frontex', 'mna', 'tf', 'achatfr', 'rsa15', 'stations', 'zan', 'unanimite', 'eurodette'],
    PCF: ['titres', 'ame', 'peines', 'depenses', 'chomage', 'heritage', 'production', 'tf', 'chargesbas', 'cannabis', 'frontex', 'mna', 'rsa15', 'achatfr', 'eurodette'],
    ECO: ['nucleaire', 'titres', 'ame', 'peines', 'prisons', 'parking', 'thermique', 'heritage', 'production', 'chomage', 'route90', 'cam', 'stations', 'tva', 'zan', 'frontex', 'mna', 'normes', 'rsa15'],
    PS: ['titres', 'ame', 'peines', 'chomage', 'depenses', 'heritage', 'production', 'thermique', 'mna', 'normes', 'frontex', 'tva', 'zan', 'route90'],
    REN: ['cannabis', 'isf', 'retraite', 'smic', 'ric', 'tva', 'titres', 'ame', 'contrib', 'superprofits', 'mna', 'prixagri', 'ttf'],
    MODEM: ['cannabis', 'isf', 'retraite', 'smic', 'ric', 'tva', 'titres', 'ame', 'contrib', 'mna', 'thermique'],
    HOR: ['cannabis', 'isf', 'smic', 'retraite', 'superprofits', 'patrimoine', 'loyers', 'ric', 'ttf', 'smiceu', 'tva', 'regul', 'jets', 'bp'],
    LR: RIGHT_BAN.concat(['smic', 'retraite', 'superprofits', 'patrimoine', 'medreg', 'ric', 'proportionnelle', 'construire', 'hlm', 'medecins', 'csdep']),
    UDR: RIGHT_BAN.concat(['smic', 'retraite', 'construire', 'hlm', 'medecins', 'csdep', 'superprofits', 'patrimoine', 'defeur', 'ukraine', 'achatfr', 'mfac', 'velo']),
    RN: RIGHT_BAN.concat(['defeur', 'ukraine', 'achatfr', 'mfac', 'velo', 'chomage', 'depenses', 'hlm', 'creches']),
    REC: RIGHT_BAN.concat(['smic', 'retraite', 'construire', 'hlm', 'medecins', 'csdep', 'superprofits', 'patrimoine', 'defeur', 'ukraine', 'achatfr', 'mfac', 'velo', 'creches']),
    DIV: ['cannabis', 'isf', 'regul', 'titres', 'ame', 'mna', 'ttf', 'eurodette']
  };
  // financement plausible : pas d’emprunt ni de subvention pour des dépenses courantes, rien à financer si la mesure ne coûte rien
  function finFor(lev, v, bloc, lvl) { const c0 = lev.cost(v, (E.commune() || { pop: 20000 }).pop), i0 = lev.inv(v, (E.commune() || { pop: 20000 }).pop);
    if (c0 <= 0 && i0 <= 0) return 'aucun';
    let opts = (FIN_BY_BLOC[lvl][bloc] || ['redeploiement']).slice();
    if (lvl === 'local') { if (c0 > i0 / 10) opts = opts.filter(f => f !== 'emprunt' && f !== 'subventions'); if (lev.scale && opts.includes('taxe') && bloc !== 'G') opts = opts.filter(f => f !== 'taxe'); if (!opts.length) opts = ['redeploiement']; }
    return pick(opts); }
  function genProp(x, lvl, t) {
    const pa = D.PARTIES[x.party].ax; const bloc = D.PARTIES[x.party].bloc; const s = S(); const have = new Set((x.prog || []).map(p => p.lev));
    const taken = new Set((s.rivals || []).flatMap(id => ((s.pnj[id] || {}).prog || []).map(p => p.lev)));
    const NOVIL = ['pm', 'mediateurs', 'parking', 'hlm', 'velo']; const vil = lvl === 'local' && E.myPetite && E.myPetite(); const pop = (E.commune() || { pop: 20000 }).pop;
    const ban = new Set(BAN[x.party] || []); const sig = SIG[x.party] || [];
    const pool0 = (L.leversFor ? L.leversFor(lvl, null, pop, t) : L.LEVERS.filter(l => l.lvl === lvl)).filter(l => !have.has(l.id) && !ban.has(l.id) && !(vil && NOVIL.includes(l.id)));
    const fresh = l => !taken.has(l.id) || R() < 0.25;
    const sigPool = pool0.filter(l => sig.includes(l.id) && fresh(l));
    const cands = pool0.filter(fresh).map(l => { let dot = 0; for (const k in l.ax) dot += Math.sign(l.ax[k]) * pa[E.AXI[k]] / 100; return { l, dot }; }).filter(c => c.dot > 0.25).sort((a, b) => b.dot - a.dot);
    let lev = sigPool.length && (R() < 0.8 || !cands.length) ? pick(sigPool) : cands.length ? pick(cands.slice(0, 4)).l : null; if (!lev) return null;
    let v = lev.def + Math.round((R() - 0.4) * (lev.max - lev.min) / 4 / lev.step) * lev.step; v = clamp(v, lev.min, lev.max); if (lev.id === 'retraite') v = pa[0] < 0 ? 62 : pa[0] > 40 ? 65 : 64; if (lev.id === 'tf') v = ['G', 'GE'].includes(bloc) ? 1 : -2;
    const fin = finFor(lev, v, bloc, lev.lvl); const ev = L.evaluate(lev, v, fin, E.commune());
    return { id: E.uid('rp'), lev: lev.id, lvl: lev.lvl, cp: lev.cp, v, fin, th: lev.th, label: ev.label, cost: ev.cost, inv: ev.inv, cred: clamp(ev.cred + (R() - 0.5) * 16, 15, 90), seg: ev.seg, gagnants: ev.gagnants, perdants: ev.perdants, vis: 35, hits: 0 };
  }
  function ensureProgs() {
    const s = S(); const el = s.est ? s.elections.find(e => e.id === s.est.el) : null; const t = el ? el.type : null; const lvl = t && ['mun', 'dep', 'reg', 'sen'].includes(t) ? 'local' : 'national';
    (s.rivals || []).forEach(id => { const x = s.pnj[id]; if (!x) return; x.prog = x.prog || []; const fits = x.prog.filter(p => (t ? (p.cp ? L.inComp(p.cp, t) : p.lvl === lvl) : p.lvl === lvl));
      if (!fits.length) { for (let i = 0; i < 2; i++) { const pr = genProp(x, lvl, t); if (pr) x.prog.push(pr); } } });
  }
  function rivalProgEffect(x, type) {
    if (!x.prog || !x.prog.length) return null; const lvl = ['mun', 'dep', 'reg', 'sen'].includes(type) ? 'local' : 'national'; const o = {};
    x.prog.forEach(p => { const w = (p.vis / 100) * ((p.cp ? L.inComp(p.cp, type) : p.lvl === lvl) ? 1 : 0.35) * (0.6 + p.cred / 125); for (const g in p.seg) o[g] = (o[g] || 0) + 0.03 * p.seg[g] * w; });
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
    if (angle === 'cout') c += (pr.cost > 0 ? 0.08 : -0.2) + (weakF(pr) ? 0.25 : 0) + (pr.cred < 55 ? 0.15 : 0);
    const horsC = X.curType() ? (pr.cp ? !L.inComp(pr.cp, X.curType()) : lvlT !== pr.lvl) : false;
    if (angle === 'faisa') c += (horsC ? 0.35 : 0) + (pr.inv > 0 ? 0.08 : 0) + (pr.cred < 45 ? 0.15 : -0.05);
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
    (p, t) => p.fullTime ? 'Vous vivez de la politique. Vous comprenez encore les gens qui travaillent ?' : ['retraite', 'etudiant'].includes(p.metier) ? null : ['leg', 'pres', 'euro'].includes(t) ? 'Si vous êtes élu·e, vous quitterez votre emploi ?' : 'Vous avez un emploi à côté. Vous serez vraiment disponible ?',
    p => (p.exParties || []).length ? 'Vous avez changé de parti. Qu’est-ce qui nous garantit que vous ne changerez pas encore ?' : null,
    p => p.age && p.age < 31 ? 'Vous avez ' + p.age + ' ans. Ce n’est pas un peu tôt pour exercer de telles responsabilités ?' : null,
    p => p.age && p.age > 66 ? 'Vous avez ' + p.age + ' ans. Ne faudrait-il pas laisser la place à une nouvelle génération ?' : null,
    (p, t) => ['leg', 'pres', 'euro'].includes(t) ? ({ cadre: 'Vous venez de l’entreprise. L’État, ce n’est pas une société : vous le savez ?', fonctionnaire: 'Vous êtes fonctionnaire. Vous croyez vraiment pouvoir réformer l’administration ?', avocat: 'Vous êtes avocat·e. Comment éviter les conflits d’intérêts au Parlement ?', agriculteur: 'Vous êtes agriculteur·rice. Vous défendrez l’intérêt général ou la profession agricole ?', enseignant: 'Vous êtes enseignant·e. Vous serez le porte-parole de votre corporation ?', independant: 'Vous êtes commerçant·e ou artisan·e. Vous connaissez les dossiers nationaux ?', etudiant: 'Vous êtes encore étudiant·e. Qu’avez-vous à apprendre aux électeurs ?', retraite: 'Vous êtes à la retraite. Pourquoi revenir maintenant ?', ouvrier: 'Vous êtes ouvrier·ère. Les dossiers techniques ne vont pas vous dépasser ?', salarie: 'Si vous êtes élu·e, vous quitterez votre poste ?' })[p.metier] || null : ({ avocat: 'Vous êtes avocat·e. Vous allez continuer à plaider pendant votre mandat ? Risque de conflit d’intérêts ?', enseignant: 'Vous êtes enseignant·e. Qui fera cours à vos élèves pendant la campagne ?', independant: 'Vous êtes commerçant·e ou artisan·e. Comment éviter le mélange des genres avec vos clients ?', agriculteur: 'Vous êtes agriculteur·rice. Vous défendrez les habitants ou la profession agricole ?', cadre: 'Vous venez de l’entreprise. Une collectivité, ce n’est pas une société : vous le savez ?', fonctionnaire: 'Vous êtes fonctionnaire territorial·e. Vous allez contrôler une administration dont vous venez ?', etudiant: 'Vous êtes encore étudiant·e. Qu’avez-vous à apprendre aux habitants ?', retraite: 'Vous êtes à la retraite. Pourquoi revenir maintenant ?', ouvrier: 'Vous êtes ouvrier·ère. Les dossiers techniques ne vont pas vous dépasser ?', salarie: 'Votre employeur vous laissera-t-il le temps d’exercer ce mandat ?' })[p.metier] || null,
    p => p.mandats.some(m => (m.ind || 0) > 0) ? 'Combien touchez-vous d’indemnités par mois, et trouvez-vous ça normal ?' : null,
    p => p.mandats.some(m => ['maire', 'adjoint'].includes(m.type)) ? 'Vous êtes déjà dans l’exécutif local. Quelle est la promesse que vous n’avez pas tenue ?' : null,
    p => (p.accords || []).some(a => a.status === 'actif') ? 'Vous avez passé des accords avec d’autres candidats. Qu’avez-vous promis en échange ?' : null,
    p => p.cash < 0 || (p.debt || 0) > 0 ? 'Votre campagne est-elle endettée ? Qui va payer ?' : null,
    p => (p.followers || 0) > 2000 ? 'Vous êtes très présent·e sur les réseaux sociaux. La politique, ce n’est pas un concours de likes ?' : null,
    p => p.party === 'NEW' || p.party === 'DIV' ? null : S().national.gov.includes(p.party) ? 'Votre parti gouverne. Vous assumez tout son bilan ?' : 'Votre parti n’est pas au gouvernement. Que feriez-vous différemment, concrètement ?'
  ];
  // banque de questions adaptée à l’élection en jeu (ou au média, hors campagne)
  function bankKeyOf(dctx) {
    if (typeof TB === 'undefined') return 'mun'; const vil = !!(E.myPetite && E.myPetite()); let t = (dctx && dctx.elType) || X.curType();
    if (!t) { const j = dctx && dctx.journalist ? S().pnj[dctx.journalist.id] : null; t = j && ['quotlib', 'info24'].includes(j.territory) ? 'leg' : 'mun'; }
    return TB.bankKey(t, vil) || 'mun';
  }
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
  /* ---- cohérence, pertinence et vérification des faits ---- */
  const gz = t => { const g = (P() || {}).g; return String(t).replace(/([A-Za-zÀ-ÿ]+)·([a-zà-ÿ]+)/g, (m, b, x) => g !== 'F' ? b : x === 'ère' ? b.replace(/ier$/, 'ière') : x === 'rice' ? b.replace(/eur$/, 'rice') : x === 've' && /f$/.test(b) ? b.slice(0, -1) + 've' : x === 'se' && /x$/.test(b) ? b.slice(0, -1) + 'se' : b + x); };
  const hasPL = () => typeof PL !== 'undefined';
  const isNatBk = bk => bk === 'nat' || bk === 'euro';
  const BLOC_OPP = { G: 'ED', GE: 'ED', C: 'G', D: 'G', ED: 'G', DIV: 'G' };
  const SIDE_OPP = { g: 'd', c: 'g', d: 'g', loc: 'g' };
  const eurOf = (v, lvl) => lvl === 'national' ? (Math.abs(v) / 1e9).toFixed(1).replace('.', ',') + ' Md€' : E.eur(Math.abs(v));
  const DEP_PUB = 1700e9; // dépenses publiques totales, ordre de grandeur
  // mesure pertinente pour une question précise (mots-clés par levier), sinon seulement même thème
  const REL = { pm: /polic|sécur|cambriol|peur|délinqu|incivil|armer/i, cam: /caméra|vidéo|cambriol|délinqu|sécur/i, mediateurs: /jeune|quartier|prévention|peur|soir/i, ecoles: /école|classe|fournaise|cour/i, ecole_v: /école|classe/i, bio: /cantine|bio|repas/i, creches: /crèche|enfant|garde|famille/i, velo: /vélo|cycl|voiture|circul/i, parking: /stationnement|voiture|commerce|centre/i, hlm: /logement|loyer|couple|construire|SRU|social/i, logcom: /logement|loyer|couple/i, medecins: /médecin|santé|ophtalm|généraliste/i, maison_sante: /médecin|santé/i, internes: /médecin|santé|interne/i, tf: /impôt|fiscal|taxe|économi|budget/i, commerces: /commerce|centre-ville|boutique|vide/i, multiple: /commerce|épicerie|village|vide/i, bp: /abstention|référendum|démocratie|particip|consult|décision/i, reunions: /abstention|démocratie|particip|écout/i, arbres: /canicule|chaleur|fournaise|bitume|climat/i, renovpub: /énergie|chaleur|climat|facture/i, solaire: /énergie|solaire|climat/i, eclairage: /énergie|lumière|éclairage|nuit/i, ralentir: /vitesse|voiture|km\/h|traversée|route|accident/i, voisins: /cambriol|sécur|voisin/i, proprete: /propre|déchet|dépôt|incivil/i, transco: /car|bus|scolaire|transport/i, tad: /car|bus|navette|isol|transport/i, chemins: /route|chemin|voirie/i, cantine_soc: /cantine|repas|famille|modeste/i, mutuelle: /santé|mutuelle|soins/i, jeunes: /jeune|soir|quartier/i, aines: /âgé|isol|aîné|canicule/i, garderie: /garderie|parent|école|périscolaire/i, perisco: /périscolaire|parent|école/i, primeveh: /voiture|véhicule|pollution|ZFE/i, marche: /producteur|agricult|marché|local/i, terres: /terre|agricol|bétonn|zone commerciale/i, installation: /agricult|jeune|ferme/i, assos: /association|bénévol/i, salle: /salle|fête|association/i };
  function relevance(m, qtext, th) { if (!m || m.theme !== th) return 0; const r = m.lever && REL[m.lever]; return !r ? 1 : r.test(qtext) ? 2 : 1; }
  // position de référence du joueur : son parti (table réelle) ou, sans parti, ses propres axes
  function supOf(o, party, key) {
    if (!hasPL()) return null; const p = P(); const realP = party && party !== 'NEW' && party !== 'DIV';
    if (key) { let s = null; if (key.ev) s = PL.evSup(party, key.ev, key.i); else if (key.quiz != null) s = PL.quizSup(party, key.quiz); else if (key.valq) s = PL.valqSup(party, key.valq[0], key.valq[1]); if (s != null && key.neg) s = 4 - s; if (s != null && key.half) s = Math.round((s + 2) / 2); if (s != null) return s; }
    if (!o.ax) return null; return realP ? PL.axisSup(party, o.ax) : PL.axisSup(null, o.ax, p.ax);
  }
  // contradiction avec une mesure de son propre programme sur le même thème
  function progClash(o, th) { if (!o.ax) return null; const v = E.vecFrom(o.ax); return P().prog.filter(m => m.status !== 'retiree' && m.theme === th && m.axes).find(m => { const w = E.vecFrom(m.axes); let d = 0; for (let i = 0; i < 6; i++) d += v[i] * w[i]; return d < -600; }) || null; }
  function finalize(q) {
    const p = P(); const realP = p.party !== 'NEW' && p.party !== 'DIV';
    q.opts.forEach(o => {
      if (o.pos) { const s = supOf(o, p.party, o.key); if (s != null) { o.sup = s; o.q = (o.q || 0) + (s - 2) * 4; o.coh = realP ? PL.supLabel(s) : (s >= 3 ? 'cohérent avec vos positions' : s <= 1 ? 'contraire à vos positions' : ''); } }
      const cl = o.pos ? progClash(o, q.theme) : null; if (cl) { o.q = (o.q || 0) - 5; o.clash = cl.resume; o.coh = (o.coh ? o.coh + ' · ' : '') + 'contredit votre programme'; }
      o.texte = gz(o.texte);
    });
    q.question = gz(q.question); return q;
  }
  function fcProg(m) {
    const lvl = m.level || 'local'; const loc = lvl === 'local' ? L.local(E.commune()) : null;
    let t = 'Vérification : « ' + m.resume + ' » coûte environ ' + (m.cout ? eurOf(m.cout, lvl) + ' par an' : 'peu en fonctionnement') + (m.inv ? ', plus ' + eurOf(m.inv, lvl) + ' d’investissement' : '');
    if (loc && m.cout > 0) t += ' (' + (m.cout / loc.budget * 100).toFixed(1).replace('.', ',') + ' % du budget de fonctionnement)';
    t += '. Financement : ' + (m.finL ? m.finL.toLowerCase() : 'non précisé') + '. Crédibilité estimée : ' + Math.round(m.cred || 50) + '/100.';
    return { t, ok: (m.cred || 50) >= 55 && !!m.finL && m.fin !== 'aucun' };
  }
  function fcRival(pr) {
    if (pr.cost < 0) return { t: 'Repère : ' + eurOf(pr.cost, pr.lvl) + ' d’économies représentent ' + (pr.lvl === 'national' ? 'environ ' + (Math.abs(pr.cost) / DEP_PUB * 100).toFixed(1).replace('.', ',') + ' % des dépenses publiques (≈ 1 700 Md€ par an)' : 'une part du budget communal') + '. Aucun poste précis n’est cité.', ok: true };
    const weak = weakF(pr); const lv0 = L.LEVERS.find(z => z.id === pr.lev); const f = { l: L.finLabel(lv0 || { lvl: pr.lvl }, pr.fin) || 'aucun' };
    return { t: 'Vérification : « ' + pr.label + ' » coûte environ ' + eurOf(pr.cost, pr.lvl) + ' par an' + (pr.inv ? ' plus ' + eurOf(pr.inv, pr.lvl) + ' d’investissement' : '') + '. Financement annoncé : ' + (f ? f.l.toLowerCase() : 'aucun') + '.', ok: weak };
  }
  function defLine(x, pr) { // un adversaire défend sa propre mesure
    const lv0 = L.LEVERS.find(z => z.id === pr.lev); const f = { l: L.finLabel(lv0 || { lvl: pr.lvl }, pr.fin) }; const g = (pr.gagnants || []).slice(0, 1).map(segN)[0];
    if (pr.cost < 0) return '« ' + pr.label + ' » : c’est le courage de dire qu’on ne peut plus dépenser sans compter.';
    if (!pr.cost && !pr.inv) return '« ' + pr.label + ' » ne coûte presque rien et change la vie des gens.';
    return '« ' + pr.label + ' » : ' + eurOf(pr.cost || pr.inv, pr.lvl) + (pr.cost ? ' par an' : '') + (f && pr.fin !== 'aucun' ? ', financés par ' + f.l.charAt(0).toLowerCase() + f.l.slice(1) : '') + (g ? ', et les ' + g + ' en seront les premiers gagnants' : '') + '.';
  }
  // ligne d’un parti sur un thème, au niveau du scrutin
  function partyLine(party, th, bk, side) {
    if (bk === 'euro' && th === 'securite') th = 'europe';
    const nat = isNatBk(bk); if (hasPL()) { const l = nat ? PL.natLine(party, th) : PL.locLine(party, th); if (l) return l; }
    const bloc = (D.PARTIES[party] || {}).bloc || 'DIV';
    if (nat && typeof TB !== 'undefined') { const NL = TB.natLine(bloc, th); if (NL) return pick(NL); }
    const T = TH_LINES[th]; if (T) { let Ls = T[side || SIDE[bloc] || 'c'] || T.c; if (['dep', 'reg', 'sen'].includes(bk)) { const f = Ls.filter(l => !NOLOC.test(l)); if (f.length) Ls = f; } return pick(Ls); }
    return null;
  }
  function oppositeLine(party, th, bk) { const bloc = (D.PARTIES[party] || {}).bloc || 'DIV'; const ob = BLOC_OPP[bloc] || 'G'; const op = { G: 'LFI', ED: 'RN', GE: 'ECO', C: 'REN', D: 'LR' }[ob] || 'LFI'; const nat = isNatBk(bk);
    if (nat) return partyLine(op, th, bk); const T = TH_LINES[th]; const side = SIDE_OPP[SIDE[bloc] || 'c'] || 'g'; return T ? pick(T[side] || T.c) : partyLine(op, th, bk); }
  const THS = { economie: 'l’emploi', pouvoir_achat: 'le pouvoir d’achat', securite: 'la sécurité', immigration: 'l’immigration', ecologie: 'l’écologie', sante: 'la santé', education: 'l’école', logement: 'le logement', transports: 'les transports', institutions: 'la démocratie', europe: 'l’Europe', agriculture: 'l’agriculture', industrie: 'l’industrie', fiscalite: 'les impôts', societe: 'les questions de société' };
  const QTH = { eco: 'economie', social: 'pouvoir_achat', societe: 'societe', securite: 'securite', immig: 'immigration', europe: 'europe', ecologie: 'ecologie', institutions: 'institutions' };
  const EUN = [{ th: 'europe', l: 'Budget de l’Union européenne', v: 'environ 190 Md€ par an, soit près de 1 % du revenu national brut européen', s: 'Cadre financier pluriannuel 2021-2027' }, { th: 'europe', l: 'Contribution nette de la France au budget européen', v: 'de l’ordre de 10 Md€ par an', s: 'Cour des comptes ; Commission européenne' }, { th: 'agriculture', l: 'Part de la politique agricole commune', v: 'environ un tiers du budget européen', s: 'Commission européenne' }, { th: 'economie', l: 'Chômage dans la zone euro', v: 'environ 6 %', s: 'Eurostat, 2025' }, { th: 'institutions', l: 'Députés européens élus en France', v: '81 sur 720', s: 'Parlement européen, 2024' }];

  function fallbackQuestion(dctx, round, used) {
    const p = P(), s = S(); const order = dctx._ang || (dctx._ang = angles(dctx)); const opps = rivalsOf(dctx); const bk = bankKeyOf(dctx); const natL = isNatBk(bk);
    const party = p.party; const elT = (dctx && dctx.elType) || X.curType();
    for (let tries = 0; tries < order.length * 2; tries++) {
      const ang = order[(round + tries) % order.length]; let q = null;
      if (ang === 'programme') {
        const ms = dctx.focusM ? [dctx.focusM] : p.prog.filter(m => m.status !== 'retiree').sort((a, b) => (b.phare - a.phare) || b.visib - a.visib);
        const offM = elT && L.inComp ? ms.find(z => !L.inComp(z, elT) && qKey('pgc' + z.id)) : null;
        if (offM) { q = { key: 'pgc' + offM.id, theme: offM.theme, question: '« ' + offM.resume + ' » relève de ' + L.whoDecides(offM) + '. Pourquoi la mettre en avant dans cette élection ?', opts: [
          { posture: 'Reconnaître', texte: 'Vous avez raison : ce n’est pas la compétence de ce mandat. Je la porterai par d’autres moyens, et je me concentre ici sur ce que je peux faire.', q: 8, move: 'nuance', fc: { t: 'Vérification : « ' + offM.resume + ' » relève de ' + L.whoDecides(offM) + '.', ok: true } },
          { posture: 'Assumer', texte: 'C’est un combat qui dépasse ce mandat, et je le mènerai quand même.', q: -1, move: 'assumer' },
          { posture: 'Bluff', texte: 'Si, si : c’est tout à fait dans nos compétences.', q: -8, lie: true, move: 'bluff', fc: { t: 'Vérification : c’est faux, la mesure relève de ' + L.whoDecides(offM) + '.', ok: false } },
          { posture: 'Esquive', texte: 'L’important, c’est la direction que l’on donne.', q: -9, move: 'esquive' }] }; }
        const VK = ['cost', 'losers', 'delay', 'why']; const m = q ? null : ms.find(z => VK.some(k => qKey('pg' + z.id + k)));
        if (m) { const lvl = m.level || 'local'; const k = VK.find(x => qKey('pg' + m.id + x)); const rp = opps.flatMap(x => (x.prog || []).map(pr => ({ x, pr }))).find(z => z.pr.th === m.theme);
          const counter = rp ? { posture: 'Contre-attaque', texte: 'Et ' + rp.x.name + ', avec « ' + rp.pr.label + ' » ? ' + (weakF(rp.pr) ? 'Pas un euro de financement.' : 'On attend toujours le détail.'), q: weakF(rp.pr) ? 9 : 1, attack: { x: rp.x.id, pr: rp.pr.id }, move: 'attaque' } : null;
          const pers = (m.perdants || []).map(segN);
          if (k === 'cost') { const fc = fcProg(m); q = { key: 'pg' + m.id + k, theme: m.theme, question: m.cout < 0 ? 'Votre proposition « ' + m.resume + ' » rapporterait ' + eurOf(m.cout, lvl) + ' par an selon vous. Ce chiffre est-il crédible ?' : 'Votre proposition « ' + m.resume + ' »' + (m.cout ? ' coûterait ' + eurOf(m.cout, lvl) + ' par an' : '') + '. Où trouvez-vous l’argent ?', opts: [
            m.finL && m.fin !== 'aucun' ? { posture: 'Chiffres', texte: 'C’est financé : ' + m.finL.toLowerCase() + '.' + (m.ind ? ' ' + m.ind + '.' : ''), q: fc.ok ? 12 : 4, move: 'chiffres', fc } : { posture: 'Chiffres', texte: 'Le financement sera précisé dans le budget, poste par poste.', q: -6, move: 'bluff', lie: true, fc },
            { posture: 'Assumer', texte: 'Oui, cela a un coût' + (pers.length ? ', et les ' + pers.join(' et les ') + ' feront un effort' : '') + '. Ne rien faire coûterait plus cher.', q: 4, move: 'assumer' },
            counter, { posture: 'Esquive', texte: 'Le vrai sujet, c’est la méthode : je réunirai tout le monde autour de la table.', q: -10, move: 'esquive' }].filter(Boolean) }; }
          else if (k === 'losers') q = { key: 'pg' + m.id + k, theme: m.theme, question: '« ' + m.resume + ' » : qui seront les perdants, et que leur dites-vous ?', opts: [
            pers.length ? { posture: 'Nommer les perdants', texte: 'Les ' + pers.join(' et les ') + ' y perdront un peu. Je le dis franchement, et je prévois un accompagnement.', q: 10, move: 'nuance' } : { posture: 'Nommer les perdants', texte: 'Personne ne sera vraiment perdant : c’est une mesure d’intérêt général.', q: 6, move: 'fond' },
            pers.length ? { posture: 'Nier', texte: 'Il n’y aura aucun perdant.', q: -4, move: 'bluff', lie: true, fc: { t: 'Vérification : cette mesure pèse d’abord sur les ' + pers.join(' et les ') + '.', ok: false } } : null,
            { posture: 'Émotion', texte: 'Les perdants, aujourd’hui, ce sont les familles qui attendent cette mesure.', q: 3, emo: true, move: 'emotion' }, counter,
            { posture: 'Esquive', texte: 'Ce n’est pas comme ça qu’il faut poser le problème.', q: -10, move: 'esquive' }].filter(Boolean) };
          else if (k === 'delay') q = { key: 'pg' + m.id + k, theme: m.theme, question: 'Combien de temps pour mettre en œuvre « ' + m.resume + ' », et comment mesurera-t-on le résultat ?', opts: [
            { posture: 'Calendrier', texte: (lvl === 'national' ? 'Un texte déposé dans les six premiers mois, ' : 'Une délibération dans les six premiers mois, ') + 'et un indicateur public : ' + (m.ind ? m.ind.charAt(0).toLowerCase() + m.ind.slice(1) : 'le nombre de bénéficiaires, publié chaque année') + '.', q: m.ind ? 11 : 6, move: 'chiffres' },
            { posture: 'Promesse', texte: 'Dès la première semaine. Vous verrez la différence immédiatement.', q: -3, move: 'bluff', lie: true, fc: { t: 'Vérification : une telle mesure demande en pratique plusieurs mois (vote, budget, recrutements ou marchés publics).', ok: false } },
            { posture: 'Nuance', texte: 'Il faudra un ou deux ans pour en voir les effets. Je préfère le dire maintenant.', q: 7, move: 'nuance' },
            { posture: 'Esquive', texte: 'Le temps qu’il faudra, mais nous irons jusqu’au bout.', q: -8, move: 'esquive' }] };
          else q = { key: 'pg' + m.id + k, theme: m.theme, question: 'Pourquoi faire de « ' + m.resume + ' » une priorité, plutôt que tout le reste ?', opts: [
            { posture: 'Priorité', texte: 'Parce que c’est la première préoccupation des habitants que je rencontre sur ' + (THS[m.theme] || 'ce sujet') + ', et que ' + (m.cout ? 'c’est chiffré' : 'cela ne coûte presque rien') + '.', q: 8, move: 'fond' },
            { posture: 'Émotion', texte: 'J’ai rencontré des familles qui attendent ça depuis des années. Je ne les laisserai pas tomber.', q: 4, emo: true, move: 'emotion' }, counter,
            { posture: 'Esquive', texte: 'Tout est prioritaire, et nous ferons tout.', q: -10, move: 'esquive' }].filter(Boolean) };
        }
      }
      if (ang === 'adversaire' && opps.length) {
        const all = opps.flatMap(x => (x.prog || []).map(pr => ({ x, pr }))); const z = all.find(t => qKey('adv' + t.pr.id)) || null;
        if (z) { const weak = weakF(z.pr); const sav = z.pr.cost < 0; const hors = X.curType() ? (z.pr.cp ? !L.inComp(z.pr.cp, X.curType()) : X.curLevel() !== z.pr.lvl) : false; const fc = fcRival(z.pr);
          q = { key: 'adv' + z.pr.id, theme: z.pr.th, question: z.x.name + ' propose « ' + z.pr.label + ' ». Bonne ou mauvaise idée ?', oppN: z.x.name, opp: z.x.name + ' : ' + defLine(z.x, z.pr), opts: [
            sav ? { posture: 'Attaque : où couper ?', texte: eurOf(z.pr.cost, z.pr.lvl) + ' d’économies : sur quoi ? Les hôpitaux, les écoles, les retraites ? Personne ne le dit.', q: 9, attack: { x: z.x.id, pr: z.pr.id, angle: 'cout' }, fc, move: 'attaque' } : { posture: 'Attaque : coût', texte: 'Elle coûte ' + eurOf(z.pr.cost, z.pr.lvl) + ' par an' + (weak ? ' et personne ne sait qui paiera.' : '. Et ce sont les contribuables qui paieront.'), q: weak ? 13 : 2, attack: { x: z.x.id, pr: z.pr.id, angle: 'cout' }, fc, move: 'chiffres' },
            { posture: 'Attaque : perdants', texte: z.pr.perdants.length ? 'Elle sacrifie les ' + z.pr.perdants.map(segN).join(' et les ') + '. Je ne l’accepterai pas.' : 'Elle ne règle rien pour ceux qui en ont le plus besoin.', q: z.pr.perdants.length ? 8 : -1, attack: { x: z.x.id, pr: z.pr.id, angle: 'perdants' }, move: 'attaque' },
            { posture: 'Faisabilité', texte: hors ? 'Ce n’est même pas la compétence de ce mandat. C’est un tract, pas un programme.' : 'Sur le papier, pourquoi pas. Dans la réalité, les délais et les moyens ne suivront pas.', q: hors ? 13 : 1, attack: { x: z.x.id, pr: z.pr.id, angle: 'faisa' }, move: 'chiffres', fc: hors ? { t: 'Vérification : « ' + z.pr.label + ' » relève de ' + L.whoDecides(z.pr.cp || (z.pr.lvl === 'national' ? ['etat'] : ['com'])) + ', pas du mandat en jeu.', ok: true } : null },
            { posture: 'Nuance', texte: 'L’intention est bonne, je le reconnais. Mais ma proposition va plus loin, et elle est financée.', q: 5, rel: 4, move: 'nuance' },
            { posture: 'Punchline', texte: pick(['C’est le Père Noël en campagne électorale.', 'Une promesse, ça n’engage que ceux qui y croient.', 'On a déjà vu ce film, et la fin est toujours la même.']), q: E.rint(-6, 12), punch: true, attack: { x: z.x.id, pr: z.pr.id, angle: 'ridicule' }, move: 'punch' }] };
        }
      }
      if (ang === 'contradiction') {
        const st = p.stmts.filter(x => x.v && E.diffDays(x.date, s.date) > 20 && ['programme', 'post X', 'meeting', 'tribune', 'citation presse', 'mairie', 'QAG'].includes(x.src) && x.text.length >= 35).find(x => qKey('ct' + x.date + x.theme));
        if (st) q = { key: 'ct' + st.date + st.theme, theme: st.theme, question: 'Le ' + E.fmtDate(st.date) + ', vous déclariez : « ' + st.text.slice(0, 140) + ' ». Vous le maintenez ?', opts: [
          { posture: 'Assumer', texte: 'Je le maintiens, mot pour mot. La constance, c’est ma marque.', q: 10, move: 'assumer' },
          { posture: 'Évolution', texte: 'J’ai évolué, parce que la situation a changé. Je l’explique : les faits ne sont plus les mêmes.', q: 3, move: 'nuance' },
          { posture: 'Nier', texte: 'Ce n’est pas ce que j’ai dit, mes propos ont été déformés.', q: -2, lie: true, move: 'bluff', fc: { t: 'Vérification : la citation est exacte et datée.', ok: false } },
          { posture: 'Contre-attaque', texte: 'Venant de mes adversaires, qui ont changé d’avis dix fois, la question est savoureuse.', q: 2, move: 'attaque' }] };
      }
      if (ang === 'local') {
        const BQ = (typeof TB !== 'undefined' && TB.Q[bk]) || LOCALQ; const pre = 'lc' + (BQ === LOCALQ ? '' : bk);
        const thU = dctx._thU || (dctx._thU = []); const ths = Object.keys(BQ).map(t => [t, (s.national.salience[t] || 0) * 0.8 + R() - (thU.includes(t) ? 3 : 0)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
        for (const th of ths) { const ordr = BQ[th].map((_, i) => i).sort(() => R() - 0.5); const qi = ordr.find(i => qKey(pre + th + i)); if (qi == null) continue; const qtext = BQ[th][qi];
          const cands = p.prog.filter(m => m.status !== 'retiree' && (m.level || 'local') === (natL ? 'national' : 'local') && (!elT || !L.inComp || L.inComp(m, elT))).map(m => [m, relevance(m, qtext, th)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]); const mine = cands[0];
          const pl = party !== 'NEW' && party !== 'DIV' ? partyLine(party, th, bk) : null; const ctr = oppositeLine(party === 'NEW' || party === 'DIV' ? 'REN' : party, th, bk);
          const thL = THS[th] || 'ce sujet';
          thU.push(th); q = { key: pre + th + qi, theme: th, question: qtext, opts: [
            mine ? (mine[1] === 2 ? { posture: 'Proposition', texte: 'Je propose « ' + mine[0].resume + ' »' + (mine[0].finL ? ', financé par ' + mine[0].finL.toLowerCase() : '') + '.', q: 12, ax: mine[0].axes, pos: true, move: 'chiffres', fc: mine[0].cout ? fcProg(mine[0]) : null }
              : { posture: 'Proposition', texte: 'Sur ' + thL + ', mon programme prévoit « ' + mine[0].resume + ' ». Ce n’est pas toute la réponse, mais c’est concret.', q: 1, ax: mine[0].axes, pos: true, move: 'fond' })
              : { posture: 'Proposition', texte: 'Je n’ai pas encore de mesure chiffrée sur ce point. Je la présenterai avant le vote.', q: -4, move: 'nuance' },
            pl ? { posture: 'Ligne du parti', texte: pl, q: 2, pos: true, key: { line: true }, sup0: 4, move: 'assumer' } : null,
            ctr && ctr !== pl ? { posture: 'Contre-pied', texte: ctr, q: 2, pos: true, sup0: 0, move: 'assumer' } : null,
            { posture: 'Terrain', texte: natL ? 'Je le vois chaque semaine sur le terrain : les gens attendent des actes, pas des slogans.' : bk === 'dep' ? 'Je connais ce dossier : je l’ai vu dans chaque commune du canton.' : bk === 'reg' ? 'Je l’entends dans toutes les vallées du département.' : 'Je connais ce problème : j’ai fait du porte-à-porte dans ce quartier la semaine dernière.', q: Math.min(10, p.camp.terrain / 10 + 1), move: 'emotion' },
            { posture: 'Esquive', texte: 'C’est un sujet complexe, qui mérite mieux qu’une formule.', q: -10, move: 'esquive' }].filter(Boolean) }; break; }
      }
      if (ang === 'national') {
        const evs = (s.recentEv || []).filter(e => qKey('nt' + e.id)); const rec = (dctx.natHook && qKey('nt' + dctx.natHook.id)) ? dctx.natHook : evs[0];
        const e = rec ? E.evById(rec.id, rec.custom) : null;
        if (e && e.ch) { const gov = s.national.gov.includes(party); const cx = hasPL() ? PL.ctxOf(e.id) : null; const here = !['pres', 'euro'].includes(elT) && e.scope !== 'int';
          q = { key: 'nt' + rec.id, theme: e.th, question: 'Actualité ' + (e.scope === 'int' ? 'internationale' : 'nationale') + ' : « ' + e.t + ' ». Votre position' + (here ? ', et qu’est-ce que ça change ici ?' : ' ?'), opts: e.ch.map((c, i) => ({ posture: 'Position', texte: c.txt + (here ? pick([' Et ici, chez nous, les familles le vivent déjà.', ' Ici aussi, on en voit les effets.', '']) : ''), q: 6, ax: c.v, pos: true, key: { ev: e.id, i }, move: 'assumer', fc: cx ? { t: 'Repère : ' + (cx.fx || cx.c) + (cx.s ? ' (' + cx.s + ')' : ''), ok: true } : null })).concat([
            { posture: gov ? 'Défendre le gouvernement' : 'Charger le gouvernement', texte: gov ? 'Le gouvernement prend ses responsabilités, et je le soutiens.' : 'Encore une décision prise à Paris, loin des réalités.', q: gov ? (s.national.approval > 40 ? 6 : -2) : (s.national.approval < 35 ? 8 : 3), move: gov ? 'assumer' : 'attaque' },
            { posture: 'Recentrer', texte: 'Je préfère parler de ce qui relève de ce mandat, ici et maintenant.', q: here ? -3 : -6, move: 'esquive' }]) };
        }
      }
      if (ang === 'valeurs') {
        const VP = typeof TB === 'undefined' ? null : bk === 'mun' || bk === 'vil' ? TB.VALQ.mun : bk === 'dep' ? TB.VALQ.dep : null; const skipV = typeof TB !== 'undefined' && (bk === 'reg' || bk === 'sen');
        const POOL = VP || D.QUIZ_POOL; const vpre = VP ? 'vl' + bk : 'vl'; const okQ = i => VP || bk !== 'euro' || ['europe', 'ecologie', 'immig'].includes(POOL[i].t);
        const qi = skipV ? null : POOL.map((_, i) => i).sort(() => R() - 0.5).find(i => okQ(i) && qKey(vpre + i)); if (qi != null) { const qq = POOL[qi]; const pos = {}; const neg = {}; for (const k in qq.w) { pos[k] = qq.w[k]; neg[k] = -qq.w[k]; }
          const th = qq.th ? qq.th : QTH[qq.t] || 'societe'; const key = VP ? { valq: [bk === 'vil' ? 'mun' : bk, qi] } : { quiz: qi };
          const ctx = VP ? (hasPL() ? (PL.VQ_CTX[bk === 'vil' ? 'mun' : bk] || [])[qi] : '') : qq.ctx; const fc = ctx ? { t: 'Repère : ' + ctx, ok: true } : null;
          q = { key: vpre + qi, theme: th, question: 'Question directe : « ' + qq.q + ' » Oui ou non ?', opts: [
            { posture: 'Oui', texte: 'Oui, clairement. Et je l’assume devant tous les électeurs.', q: 5, ax: pos, pos: true, key, move: 'assumer', fc },
            { posture: 'Non', texte: 'Non. Et je ne changerai pas d’avis pour plaire.', q: 5, ax: neg, pos: true, key: Object.assign({ neg: true }, key), move: 'assumer', fc },
            { posture: 'Oui, mais', texte: 'Sur le principe oui, mais avec des garde-fous stricts.', q: 3, ax: Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, v / 2])), pos: true, key: Object.assign({ half: true }, key), move: 'nuance' },
            { posture: 'Esquive', texte: 'Ce n’est pas l’enjeu de cette élection.', q: -10, move: 'esquive' },
            { posture: 'Retourner', texte: 'Posez plutôt la question à mon adversaire, qui n’ose jamais répondre.', q: 0, move: 'attaque' }] }; }
      }
      if (ang === 'personnel') {
        const fs = PERSOQ.map((f, i) => [i, f(p, elT)]).filter(([i, t]) => t && qKey('ps' + i)); if (fs.length) { const [i, t] = pick(fs);
          q = { key: 'ps' + i, theme: 'institutions', question: t, opts: [
            { posture: 'Sincérité', texte: 'Je vais vous répondre franchement : la question est légitime. Voici ce que je ferai, et je m’y engage publiquement.', q: 6 + (p.traits.scrupules - 50) / 10, move: 'nuance' },
            { posture: 'Parcours', texte: 'Mon parcours parle pour moi : ' + D.METIERS.find(m => m.id === p.metier).label.toLowerCase() + ', engagé·e sur le terrain depuis des années.', q: 5, move: 'fond' },
            { posture: 'Contre-attaque', texte: 'Ceux qui me posent cette question devraient regarder leur propre bilan.', q: 1, move: 'attaque' },
            { posture: 'Agacement', texte: 'C’est une question indigne, je ne répondrai pas.', q: -9, move: 'esquive' }] }; }
      }
      if (ang === 'chiffres') {
        if (['dep', 'reg', 'sen'].includes(bk)) continue;
        const pool = bk === 'euro' ? EUN : L.NAT; const n = pool.find(x => qKey('ch' + x.l)); const loc = L.local(E.commune()); const lr = loc.rows.find(r => qKey('chl' + r[1]));
        const useLoc = X.curLevel() === 'local' && lr; const lab = useLoc ? lr[1] + ' : ' + lr[2] : n ? n.l + ' : ' + n.v : null;
        if (lab) { const th = useLoc ? lr[0] : n.th; const mine = p.prog.find(m => m.theme === th && m.status !== 'retiree' && (m.level || 'local') === (useLoc ? 'local' : 'national'));
          const fc = !useLoc && n.s ? { t: 'Source : ' + n.s + '.', ok: true } : null;
          const rv = mine ? relevance(mine, lab, th) : 0;
          q = { key: useLoc ? 'chl' + lr[1] : 'ch' + n.l, theme: th, question: 'Un chiffre : ' + lab + '. Que faites-vous avec ça ?', opts: [
            mine ? { posture: 'Proposition', texte: (rv === 2 ? 'C’est exactement pour ça que je propose « ' : 'C’est l’une des raisons pour lesquelles je propose « ') + mine.resume + ' ».', q: rv === 2 ? 11 : 3, ax: mine.axes, pos: true, move: 'chiffres', fc } : { posture: 'Proposition', texte: 'Il faut un plan, et je le mettrai sur la table.', q: -3, move: 'nuance' },
            { posture: 'Relativiser', texte: useLoc ? 'Ce chiffre ne dit pas tout : il cache des réalités très différentes selon les quartiers.' : 'Ce chiffre ne dit pas tout : il cache des écarts énormes entre territoires.', q: 3, move: 'nuance', fc },
            { posture: 'Dramatiser', texte: 'Ce chiffre est un scandale. Et personne n’en parle.', q: 3, emo: true, move: 'emotion' },
            { posture: 'Accuser', texte: 'C’est le bilan de ceux qui gouvernent. Il faut que ça change.', q: s.national.gov.includes(party) ? -6 : 4, move: 'attaque' }] }; }
      }
      if (q) { remember(q.key); q.angle = ang; q.opts.forEach(o => { if (o.sup0 != null && o.key && o.key.line) { o.key = null; } }); q.opts.forEach(o => { if (o.sup0 != null) { o.pos = false; const realP = party !== 'NEW' && party !== 'DIV'; if (realP) { o.sup = o.sup0; o.q += (o.sup0 - 2) * 4; o.coh = PL.supLabel(o.sup0); } } });
        finalize(q); const op = opps[0];
        q.adversaires = q.opp ? [{ nom: q.oppN || (op || {}).name || 'Adversaire', replique: q.opp.split(' : ').slice(1).join(' : ') || q.opp }] : opps.slice(0, 2).map(x => ({ nom: x.name, replique: oppLine(x, q.theme) })); q.propositions = q.opts.map(o => Object.assign({}, o)); return q; }
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
  if (typeof TB !== 'undefined') for (const b in TB.OPPL) OPPL[b] = (OPPL[b] || []).concat(TB.OPPL[b]);
  const NOLOC = /mairie|municipal|commune|village|cantine|taxe foncière|conseil municipal|maire/i;
  const lc = l => l.charAt(0).toLowerCase() + l.slice(1);
  function oppLine(x, th, villageMode) { const side = villageMode ? 'loc' : SIDE[D.PARTIES[x.party].bloc] || 'c';
    const mine = (x.prog || []).find(pr => pr.th === th);
    if (mine && R() < 0.5) return E.fresh('opp' + x.id, ['Ma proposition est claire : ' + lc(mine.label) + '.', 'Ce que je propose : ' + lc(mine.label) + '. C’est concret.', 'Avec « ' + mine.label + ' », on change la vie des gens.']);
    const bk = bankKeyOf(null); const bloc = D.PARTIES[x.party].bloc; if (bk === 'euro' && th === 'securite') th = 'europe';
    if (!villageMode && hasPL()) { const l = isNatBk(bk) ? PL.natLine(x.party, th) : PL.locLine(x.party, th); if (l && R() < 0.75) return l; }
    if (!villageMode && typeof TB !== 'undefined' && isNatBk(bk)) { const NL = TB.natLine(bloc, th); if (NL) return E.fresh('oppn' + x.id + th, NL); }
    const T = TH_LINES[th]; if (T) { let Ls = T[side] || T.c; if (!villageMode && ['dep', 'reg', 'sen'].includes(bk)) { const f = Ls.filter(l => !NOLOC.test(l)); Ls = f.length ? f : (typeof TB !== 'undefined' && TB.natLine(bloc, th)) || Ls; } return E.fresh('oppt' + x.id + th, Ls); }
    const L0 = OPPL[D.PARTIES[x.party].bloc] || OPPL.C; return E.fresh('oppl' + x.id, L0);
  }
  // pourquoi les électorats ont réagi ainsi (une ligne)
  function whySeg(seg, o) {
    const v = o && o.ax ? E.vecFrom(o.ax) : null; const fit = g => v ? E.alignment(v, D.SEGS.find(z => z.id === g).ideal) : 0;
    const ids = Object.keys(seg).sort((a, b) => seg[b] - seg[a]); const up = ids.filter(g => seg[g] > 0.6)[0], dn = ids.slice().reverse().filter(g => seg[g] < -0.6)[0];
    const mv = o ? (o.move || '') : ''; const nm = g => segN(g);
    const rU = g => fit(g) > 0.2 ? 'votre position rejoint leurs attentes' : mv === 'chiffres' ? 'ils apprécient la précision' : mv === 'emotion' || o.emo ? 'ils sont sensibles à l’émotion' : mv === 'punch' ? 'la formule leur plaît' : 'la réponse les convainc';
    const rD = g => fit(g) < -0.2 ? 'votre position heurte leurs attentes' : mv === 'esquive' ? 'ils n’aiment pas l’esquive' : mv === 'punch' || mv === 'attaque' ? 'le ton les agace' : mv === 'bluff' ? 'ils doutent de vos chiffres' : 'ils restent sceptiques';
    const out = []; if (up) out.push('▲ ' + D.SEGS.find(z => z.id === up).name + ' : ' + rU(up)); if (dn) out.push('▼ ' + D.SEGS.find(z => z.id === dn).name + ' : ' + rD(dn));
    if (o && o.sup != null && o.sup <= 1 && P().party !== 'NEW' && P().party !== 'DIV') out.push('Votre parti n’apprécie pas cette prise de position.');
    return out.join(' · ');
  }
  function fallbackJudge(dctx, q, reply, chosen) {
    const p = P(); const o = chosen || {}; let sc = 48 + (o.q || 0) * 1.25 + p.mediaTraining * 3 + (p.traits.sangfroid - 50) / 8 + (E.rnd() * 6 - 3); if (!chosen) sc += Math.min(12, reply.length / 25) - 2;
    const seg = {}; const v = E.vecFrom(o.ax || {}); D.SEGS.forEach(g => seg[g.id] = Math.round(E.alignment(v, g.ideal) * 9 + (sc - 50) / 8 + (o.emo && ['RET', 'POP'].includes(g.id) ? 2 : 0)));
    let lie = !!o.lie; if (o.lie && q.angle === 'contradiction') sc += 4;
    const gaffe = sc < 22 || (o.punch && E.rnd() < 0.15);
    return { fact: o.fc || null, why: whySeg(seg, o), coh: o.coh || '', score: clamp(Math.round(sc), 5, 95), segments: seg, axes: o.ax || {}, mensonge: lie, affirmation: lie ? reply : null, punchline: o.punch && sc > 60 ? reply : (sc > 78 ? reply.split(/[.!?]/)[0] : null), gaffe, commentaire: sc > 68 ? pick(['Réponse percutante, l’adversaire accuse le coup.', 'Coup gagnant : le public réagit.', 'Précis et incisif.']) : sc > 48 ? pick(['Réponse solide, sans plus.', 'Correct, mais attendu.', 'Ça tient la route.']) : pick(['Réponse confuse, ça flotte.', 'L’adversaire a marqué un point.', 'Trop défensif.']), reaction: { nom: (dctx.opponents[0] || {}).name || 'Adversaire', texte: sc > 60 ? pick(['Facile à dire quand on n’a jamais été aux responsabilités.', 'Des mots, toujours des mots.', 'Vous esquivez la vraie question.']) : pick(['Vous voyez bien que ça ne tient pas.', 'Même vos amis n’y croient pas.', 'Les électeurs jugeront.']) } };
  }
  const RIPOSTES = [
    { id: 'chiffre', l: 'Insister, chiffres à l’appui', f: () => (P().cred - 45) / 3 + (((P().expertise || {})) ? 2 : 0) },
    { id: 'attaque', l: 'Attaquer sa proposition', f: (q, x) => { const pr = x && (x.prog || [])[0]; return pr ? (weakF(pr) ? 9 : 3) + (pr.cred < 50 ? 4 : -2) : -3; } },
    { id: 'calme', l: 'Rester calme et laisser couler', f: () => 1 + (P().traits.sangfroid - 50) / 20 },
    { id: 'punch', l: 'Une formule qui claque', f: () => E.rint(-10, 14) + P().mediaTraining * 2 }
  ];

  /* ===== Situations imprévues ===== */
  const SIT = [
    { id: 'marche', c: () => true, t: 'Interpellé·e au marché, devant une caméra', d: 'Un commerçant vous prend à partie sur les charges et la paperasse. Un passant filme.', o: [
      ['Écouter longuement, promettre de revenir', () => { E.addImage('PERI', 2); E.addImage('RET', 1); return 'La vidéo montre un·e élu·e à l’écoute. Elle tourne bien.'; }],
      ['Répliquer sèchement', () => { if (E.rnd() < 0.5) { E.addImageAll(-2.5); E.article('info24', 'La vidéo ' + E.de(P().name) + ' qui s’emporte au marché', -0.5, 'pj'); return 'La vidéo devient virale, et pas en bien.'; } E.addImage('POP', 1.5); return 'Votre franchise plaît à certains.'; }],
      ['Lui proposer une réunion avec les commerçants', () => { E.addImage('PERI', 1.2); E.addImage('CAD', 1); P().hours = Math.max(0, P().hours - 2); return 'Réunion calée (2 h de votre temps), les commerçants apprécient.'; }]] },
    { id: 'ag', vil: false, c: p => p.party !== 'NEW', t: 'Deux rendez-vous le même soir', d: 'L’assemblée générale d’une grosse association de quartier tombe le soir de la réunion de section.', o: [
      ['L’association', () => { E.addImage('POP', 2); E.addImage('RET', 1.5); E.addStd(-2); return 'Les habitants s’en souviendront. Le parti un peu moins bien.'; }],
      ['La section', () => { E.addStd(2.5); P().fedSup = clamp(P().fedSup + 1, 0, 100); return 'Les militants apprécient votre présence.'; }],
      ['Envoyer un collaborateur à l’association', p => { if (!p.staff.length) { E.addImage('POP', -1); return 'Personne à envoyer : l’association remarque votre absence.'; } E.addImage('POP', 1); E.addStd(2); return 'Compromis acceptable des deux côtés.'; }]] },
    { id: 'exclu', vil: false, c: () => true, t: 'Un journaliste propose un marché', d: 'Il vous offre un portrait flatteur… contre une information sur les divisions de votre camp.', o: [
      ['Lâcher l’information', p => { const j = E.pick(E.pnjList(x => x.role === 'journaliste')); j.rel += 12; E.addNoto(X.scopeOf(), 5); E.addStd(-5); const a = E.pick(E.pnjList(x => x.party === p.party && x.known && x.role !== 'journaliste')); if (a) { a.rel -= 20; } E.article(j.territory, 'Portrait : ' + p.name + ', l’ambition sans complexe', 0.3, 'pj'); return 'Portrait publié. En interne, on cherche qui a parlé.'; }],
      ['Refuser poliment', () => { P().cred = clamp(P().cred + 1, 0, 100); return 'Le journaliste note votre loyauté. Pas de portrait.'; }]] },
    { id: 'societe', c: p => !!p.cand, t: 'Un chef d’entreprise veut « aider »', d: 'Il propose de financer vos tracts via sa société. Les dons des personnes morales sont interdits.', o: [
      ['Accepter, discrètement', p => { p.cash += 4000; E.casserole('occulte', 'des tracts payés par une entreprise (don de personne morale)', 2, true, 0.06); return '4 000 € de tracts en plus. Et une casserole.'; }, 'Illégal : don d’entreprise interdit. Risque : rejet du compte, jusqu’à 3 ans d’inéligibilité'],
      ['Refuser, mais lui proposer un don personnel plafonné', p => { if (p.cand && p.cand.compte) { p.cand.compte.dons += 1500; p.cand.compte.recettes += 1500; return 'Il verse 1 500 € à titre personnel, en toute légalité.'; } p.cash += 800; return 'Il soutient votre mouvement à titre personnel.'; }],
      ['Refuser sèchement', () => { P().cred = clamp(P().cred + 0.5, 0, 100); return 'Vous gardez les mains propres.'; }]] },
    { id: 'colistier', c: p => !!p.cand, t: 'Un passé encombrant dans votre équipe', d: 'Un militant vous signale qu’un de vos soutiens a été condamné pour violences il y a dix ans.', o: [
      ['L’écarter immédiatement', () => { P().cred = clamp(P().cred + 1.5, 0, 100); P().militants = Math.max(0, P().militants - 2); return 'Décision saluée, quelques militants grognent.'; }],
      ['Le garder : chacun a droit à une seconde chance', () => { if (E.rnd() < 0.4) { E.surface(E.casserole('entourage', 'un soutien condamné pour violences dans votre équipe', 1, false, 0), 'La presse a retrouvé le jugement.'); return 'La presse l’apprend.'; } return 'Personne n’en parle… pour l’instant.'; }]] },
    { id: 'video', c: () => true, t: 'Une vidéo coupée circule', d: 'Un extrait de 12 secondes vous fait dire l’inverse de ce que vous pensez.', o: [
      ['Publier la vidéo complète', () => { E.addImageAll(0.8); P().cred = clamp(P().cred + 1, 0, 100); return 'La manipulation est démontée, vous en sortez grandi·e.'; }],
      ['Porter plainte', p => { p.cash -= 1500; E.addImageAll(0.3); return 'Plainte déposée. L’affaire suivra son cours.'; }],
      ['Laisser courir', () => { E.addImageAll(-1.8); return 'L’extrait continue de circuler.'; }]] },
    { id: 'usine', vil: false, c: () => true, t: 'Rassemblement devant une usine menacée', d: 'Les syndicats appellent à se rassembler devant un site qui pourrait fermer.', o: [
      ['Y aller, au milieu des salariés', () => { E.addImage('POP', 3); E.addImage('CAD', -1); E.addNoto(X.scopeOf(), 2); return 'Images fortes au journal régional.'; }],
      ['Un communiqué de soutien mesuré', () => { E.addImage('POP', 1); return 'Soutien noté, sans plus.'; }],
      ['Rencontrer la direction plutôt que les syndicats', () => { E.addImage('CAD', 2); E.addImage('POP', -1.5); return 'Une démarche jugée sérieuse par les uns, distante par les autres.'; }]] },
    { id: 'crue', c: () => true, t: 'Orages violents : caves inondées, routes coupées', d: 'Les secours sont sur place. Les habitants attendent les élus.', o: [
      ['Aller sur place, en bottes', () => { E.addImage('RET', 2); E.addImage('POP', 2); E.addNoto(X.scopeOf(), 3); return 'On vous voit aider les sinistrés. Ça compte.'; }],
      ['Dénoncer l’imprévoyance de la majorité', p => { if (p.mairie) { E.addImageAll(-1); return 'Difficile quand on est soi-même maire…'; } E.addImage('PERI', 1.5); E.addImage('RET', -1); return 'Polémique en pleine crise : ça divise.'; }],
      ['Rester discret, laisser travailler les secours', () => { P().cred = clamp(P().cred + 1, 0, 100); return 'Sobriété appréciée par certains, absence remarquée par d’autres.'; }]] },
    { id: 'influ', vil: false, c: () => true, t: 'Un influenceur local vous invite en live', d: '45 000 abonnés, ton décontracté, questions imprévisibles.', o: [
      ['Accepter', p => { if (E.rnd() < 0.7) { E.addImage('JUD', 3); p.followers += E.rint(300, 1500); return 'Le live cartonne chez les jeunes.'; } E.addImageAll(-1.5); return 'Une question piège vous déstabilise en direct.'; }],
      ['Refuser', () => { E.addImage('JUD', -0.8); return 'Une occasion manquée auprès des jeunes.'; }]] },
    { id: 'baron', vil: false, c: p => p.party !== 'NEW' && p.prole >= 1, t: 'Une proposition venue d’en haut', d: 'Un baron du parti vous propose son soutien au prochain congrès, contre votre loyauté sur un vote interne.', o: [
      ['Accepter le pacte', p => { const b = E.partyFigures().find(x => x.role === 'baron'); if (b) { b.rel += 15; p.accords.push({ id: E.uid('acc'), with: b.id, clauses: ['soutien'], date: S().date, status: 'actif' }); } p.natSup = clamp(p.natSup + 3, 0, 100); return 'Pacte conclu. Vous voilà lié·e.'; }],
      ['Refuser : je reste libre', p => { p.cred = clamp(p.cred + 0.5, 0, 100); const b = E.partyFigures().find(x => x.role === 'baron'); if (b) b.rel -= 6; return 'Indépendance préservée, un baron vexé.'; }]] },
    { id: 'fusion', c: p => !!p.cand && E.phase().id !== 'hors', t: 'Une petite liste propose de fusionner', d: 'Une liste citoyenne à 4 % vous propose de vous rejoindre contre deux places éligibles.', o: [
      ['Accepter', p => { p.mom += 0.03; p.militants += 6; E.addStd(-2); return 'Renfort bienvenu. Deux de vos fidèles reculent sur la liste et grincent.'; }],
      ['Refuser', p => { p.mom -= 0.01; return 'Ils maintiennent leur liste et grignoteront quelques voix.'; }]] },
    { id: 'classe', c: () => true, t: 'Une fermeture de classe annoncée', d: 'L’école perd une classe à la rentrée. Les parents se mobilisent.', o: [
      ['Lancer une pétition avec les parents', () => { E.addImage('CAD', 2); E.addImage('JUD', 2); return '1 200 signatures en une semaine.'; }],
      ['Écrire au rectorat, sans bruit', p => { if (p.mandats.length) { P().cred = clamp(P().cred + 1.5, 0, 100); return 'Le rectorat répond : on rouvre le dossier.'; } return 'Sans mandat, la lettre reste sans réponse.'; }],
      ['Ne pas s’en mêler', () => { E.addImage('CAD', -1); return 'Les parents remarquent votre silence.'; }]] },
    { id: 'sondfuite', vil: false, c: p => !!p.cand, t: 'Un sondage interne a fuité', d: 'Votre sondage interne, plutôt mauvais, se retrouve dans la presse.', o: [
      ['Assumer : « on part de loin, on va remonter »', p => { p.cred = clamp(p.cred + 1, 0, 100); p.mom -= 0.01; return 'Lucidité saluée.'; }],
      ['Démentir son authenticité', p => { if (E.rnd() < 0.4) { p.cred = clamp(p.cred - 3, 0, 100); return 'Le sondeur confirme : vous voilà pris·e en défaut.'; } return 'Le doute s’installe sur le sondage.'; }],
      ['Chercher la fuite dans l’équipe', p => { p.staff.forEach(x => { x.audited = true; x.loy -= 3; }); return 'Ambiance pesante, mais vous savez maintenant qui est loyal.'; }]] },
    { id: 'debatpublic', c: () => true, t: 'Invitation à un débat public dans une salle des fêtes', d: 'Un collectif d’habitants organise une soirée questions-réponses. Ambiance chaude annoncée.', o: [
      ['Y aller', p => { const r = E.rnd(); if (r < 0.65) { E.addImageAll(1.5); E.addNoto('commune', 2.5); return 'Salle comble, vous tenez la soirée.'; } E.addImageAll(-1.5); return 'Une partie de la salle vous chahute.'; }],
      ['Décliner', () => { E.addImage('POP', -1); return 'Votre chaise vide est remarquée.'; }]] }
  ];
  /* ----- situations supplémentaires ----- */
  const MO = () => +S().date.slice(5, 7); const cr = d => { P().cred = clamp(P().cred + d, 0, 100); };
  const hrs = h => { P().hours = Math.max(0, P().hours - h); };
  SIT.push(
    { id: 'anciens', c: () => true, t: 'Le repas des anciens', d: 'Le club des aînés vous invite à son repas annuel. Deux cents convives, un micro, et beaucoup d’attentes.', o: [
      ['Servir à table avec les bénévoles', () => { E.addImage('RET', 2.5); hrs(2); return 'Vous passez de table en table, l’assiette à la main. On en parlera au marché.'; }],
      ['Faire un discours', () => { E.addNoto(X.scopeOf(), 1.5); E.addImage('RET', 1); return 'Un discours court et chaleureux. Applaudissements polis.'; }],
      ['Décliner, l’agenda est plein', () => { E.addImage('RET', -1.2); return 'Votre absence est remarquée par ceux qui votent le plus.'; }]] },
    { id: 'harcel', c: p => p.followers > 120, t: 'Une campagne de haine en ligne', d: 'Des dizaines de comptes vous insultent et menacent vos proches depuis trois jours.', o: [
      ['Porter plainte et le dire publiquement', p => { p.cash -= 800; E.addImageAll(1); cr(1); E.article('dauph', p.name + ' porte plainte après une vague de menaces en ligne', 0.3, 'pj'); return 'Vague de soutiens, y compris chez vos adversaires.'; }],
      ['Couper les réseaux quelques jours', p => { p.followers = Math.max(0, p.followers - E.rint(10, 60)); return 'Vous respirez. Le flot finit par se tarir.'; }],
      ['Répondre avec ironie', p => { if (R() < 0.5) { E.addImage('JUD', 2); p.followers += E.rint(80, 400); return 'Votre réponse fait le tour des réseaux : les rieurs sont de votre côté.'; } E.addImageAll(-1); return 'L’ironie est mal prise, la meute redouble.'; }]] },
    { id: 'deepfake', vil: false, c: () => true, t: 'Un faux enregistrement circule', d: 'Un audio généré par intelligence artificielle vous fait tenir des propos insultants sur les habitants d’un quartier.', o: [
      ['Faire expertiser le trucage', p => { p.cash -= 1800; cr(2); E.addImageAll(0.6); E.article('info24', 'Faux audio : l’expertise innocente ' + p.name, 0.3, 'pj'); return 'L’expertise démontre le trucage. Vous passez pour la victime que vous êtes.'; }],
      ['Démentir sobrement', () => { E.addImageAll(-0.8); return 'Le démenti limite les dégâts, mais le doute reste chez certains.'; }],
      ['Ne rien dire', () => { E.addImageAll(-2); E.addImage('POP', -1.5); return 'L’audio continue de tourner dans les groupes de messagerie.'; }]] },
    { id: 'agressmil', c: p => !!p.cand, t: 'Un militant agressé pendant le collage', d: 'Un de vos colleurs d’affiches a été frappé la nuit dernière. Il a deux côtes cassées.', o: [
      ['Porter plainte et dénoncer la violence', p => { E.addNoto(X.scopeOf(), 2); E.addImageAll(0.8); p.militants += 2; return 'Rassemblement de soutien, la presse relaie. Vos militants serrent les rangs.'; }],
      ['Appeler au calme', () => { cr(1); return 'Votre appel au calme est salué, y compris par vos adversaires.'; }],
      ['Accuser le camp adverse', p => { if (R() < 0.4) { p.mom += 0.02; E.addImage('POP', 1); return 'L’enquête oriente vers des militants adverses. Le coup porte.'; } E.addImageAll(-2); cr(-2); return 'Aucune preuve. On vous reproche une récupération indécente.'; }]] },
    { id: 'affiches', c: p => !!p.cand && E.phase().id !== 'hors', t: 'Vos affiches recouvertes chaque nuit', d: 'Sur les panneaux officiels, vos affiches disparaissent sous celles d’un concurrent.', o: [
      ['Recoller la nuit avec les militants', p => { hrs(2); p.camp.terrain += 3; if (p.militants > 3 && R() < 0.3) { p.militants--; return 'Vos affiches tiennent, mais un militant épuisé jette l’éponge.'; } return 'Vos affiches tiennent. Les militants ont l’impression de mener une vraie campagne.'; }],
      ['Faire constater par un huissier', p => { p.cash -= 500; cr(0.5); return 'Constat dressé. Un signalement est envoyé à la préfecture.'; }],
      ['Laisser faire', () => { E.addNoto(X.scopeOf(), -1); return 'Votre visage disparaît des murs.'; }]] },
    { id: 'pompiers', c: () => MO() === 12, t: 'La Sainte-Barbe des pompiers', d: 'La caserne vous invite à sa cérémonie. Les volontaires ont des choses à dire sur leurs conditions.', o: [
      ['Y aller et écouter les volontaires', () => { E.addImage('RUR', 2); E.addImage('RET', 1); E.addImage('PERI', 1); hrs(2); return 'Vous repartez avec une liste de revendications, et beaucoup de sympathie.'; }],
      ['Envoyer un message', () => 'Votre message est lu au micro. Personne ne le retiendra.'],
      ['Décliner', () => { E.addImage('RUR', -1); return 'Les pompiers ont la mémoire longue.'; }]] },
    { id: 'terrasse', c: p => !!p.mairie, t: 'La terrasse de la discorde', d: 'Un bar de la place demande d’agrandir sa terrasse jusqu’à minuit. Les riverains ont signé une pétition.', o: [
      ['Accorder l’extension', () => { E.addImage('JUD', 1.5); E.addImage('CAD', 0.5); E.addImage('RET', -1.5); return 'La place s’anime. Les riverains vous écrivent des lettres recommandées.'; }],
      ['Refuser', () => { E.addImage('RET', 1.5); E.addImage('JUD', -1); return 'Le gérant affiche votre refus en vitrine.'; }],
      ['Une extension jusqu’à 22 h, à l’essai', () => { hrs(2); E.addImageAll(0.4); return 'Compromis accepté du bout des lèvres par tout le monde.'; }]] },
    { id: 'expulsion', c: () => true, t: 'Une famille menacée d’expulsion', d: 'Une mère seule et ses deux enfants doivent quitter leur logement vendredi. Elle frappe à votre porte.', o: [
      ['Intervenir auprès du bailleur', () => { E.addImage('POP', 2); hrs(2); return 'Le bailleur accorde un délai de trois mois. La famille ne l’oubliera pas.'; }],
      ['L’orienter vers les services sociaux', () => 'Vous l’orientez vers le CCAS. C’est la procédure, sans plus.'],
      ['Médiatiser son cas', p => { E.addNoto(X.scopeOf(), 1.5); if (R() < 0.35) { E.addImage('CAD', -1); cr(-1); return 'Le bailleur rappelle des loyers impayés depuis un an : on vous accuse d’instrumentaliser.'; } E.addImage('POP', 2.5); return 'L’article émeut, la préfecture trouve une solution.'; }]] },
    { id: 'sexisme', c: p => p.party !== 'NEW', t: 'Des propos sexistes dans votre camp', d: 'En réunion publique, un élu de votre parti a lancé une remarque déplacée à une adjointe. La vidéo circule.', o: [
      ['Le condamner publiquement', () => { cr(1.5); E.addImage('JUD', 2); E.addImage('CAD', 1); E.addStd(-2); return 'Votre réaction est saluée. Le concerné ne vous parle plus.'; }],
      ['Lui en parler en privé', () => { E.addStd(1); if (R() < 0.35) { E.addImageAll(-1.5); return 'Votre silence public est relevé par la presse.'; } return 'Il présente des excuses. L’affaire retombe.'; }],
      ['Minimiser : « une maladresse »', () => { E.addImage('JUD', -3); E.addImage('CAD', -1.5); E.addStd(1.5); return 'Votre réaction choque bien au-delà de votre camp.'; }]] },
    { id: 'rondpoint', c: () => [1, 2, 3, 11].includes(MO()), t: 'Les agriculteurs bloquent le rond-point', d: 'Tracteurs, palettes et pneus : ils vous demandent de venir les écouter.', o: [
      ['Y aller avec des croissants', () => { E.addImage('RUR', 3); E.addImage('PERI', 0.5); E.addImage('JUD', -0.5); hrs(2); return 'Une heure de discussion franche autour d’un brasero.'; }],
      ['Un communiqué de soutien', () => { E.addImage('RUR', 0.8); return 'Soutien noté, mais on attendait votre présence.'; }],
      ['Refuser de cautionner un blocage', () => { E.addImage('RUR', -2.5); E.addImage('CAD', 1); return 'Les agriculteurs vous le rendront dans les urnes.'; }]] },
    { id: 'antenne', c: () => true, t: 'Une antenne-relais près de l’école', d: 'Des parents s’inquiètent d’un projet d’antenne 5G à cent mètres de l’école.', o: [
      ['Soutenir les parents', () => { E.addImage('PERI', 1.5); E.addImage('RET', 1); cr(-1); return 'Les parents vous remercient. Les experts sanitaires froncent les sourcils.'; }],
      ['Rappeler les avis scientifiques', () => { cr(1.5); E.addImage('PERI', -1); return 'Votre position est jugée sérieuse, mais un peu froide.'; }],
      ['Organiser une réunion avec l’opérateur', () => { hrs(2); E.addImageAll(0.5); return 'L’opérateur accepte de déplacer l’antenne de deux cents mètres.'; }]] },
    { id: 'aid', vil: false, c: () => true, t: 'Invitation à la fête de l’Aïd', d: 'Une association culturelle du quartier vous invite à la fête de fin du ramadan.', o: [
      ['Y aller', () => { E.addImage('POP', 2); E.addImage('RET', -0.8); return 'Accueil chaleureux. Quelques commentaires acerbes sur les réseaux.'; }],
      ['Envoyer un message de vœux', () => { E.addImage('POP', 0.5); return 'Votre message est apprécié.'; }],
      ['Décliner', () => { E.addImage('POP', -1.2); return 'L’association en prend note.'; }]] },
    { id: 'stagiaire', c: () => true, t: 'Un étudiant veut gérer vos réseaux', d: 'Un étudiant en communication propose de s’occuper gratuitement de vos réseaux sociaux.', o: [
      ['Accepter', p => { p.followers += E.rint(60, 300); E.addImage('JUD', 1); if (R() < 0.18) { E.addImageAll(-1.5); return 'Une publication maladroite à 23 h vous vaut une polémique. Vous reprenez la main.'; } return 'Vos comptes reprennent vie, les jeunes vous suivent.'; }],
      ['Refuser', () => 'Vous gardez la main sur ce qui sort en votre nom.']] },
    { id: 'enveloppe', c: p => !!p.cand, t: 'Une enveloppe sans nom', d: 'Une enveloppe de 2 000 € en liquide a été glissée sous la porte de votre permanence. Aucun nom.', o: [
      ['La remettre au commissariat', () => { cr(1.5); return 'Geste salué discrètement par votre mandataire financier.'; }],
      ['La verser au compte de campagne', p => { p.cash += 2000; E.casserole('occulte', 'un don anonyme en espèces de 2 000 € (dons en liquide limités à 150 €)', 2, true, 0.05); return '2 000 € de plus. Et une irrégularité grave dans vos comptes.'; }, 'Illégal : don en espèces au-delà de 150 €. Risque : rejet du compte, inéligibilité'],
      ['La garder pour les petits frais', p => { p.cash += 2000; E.casserole('occulte', 'de l’argent liquide non déclaré dans la campagne', 2, true, 0.07); return 'Personne n’en saura rien. Peut-être.'; }, 'Illégal : recette cachée au compte de campagne. Risque : amende, prison, jusqu’à 3 ans d’inéligibilité']] },
    { id: 'qecrite', c: p => p.mandats.some(m => m.type === 'depute'), t: 'Un maire vous sollicite', d: 'Le maire d’un village de la circonscription vous demande d’interpeller le gouvernement sur la fermeture de sa gare.', o: [
      ['Déposer une question écrite', () => { E.addImage('RUR', 1.5); cr(0.5); hrs(1); return 'Question déposée. Le maire la diffuse dans son bulletin.'; }],
      ['Organiser une réunion avec la SNCF', () => { E.addImage('RUR', 2.5); hrs(3); return 'La SNCF accepte un horaire supplémentaire. Petite victoire, grande reconnaissance.'; }],
      ['Lui répondre que ce n’est pas prioritaire', () => { E.addImage('RUR', -1.5); return 'Le maire le fera savoir.'; }]] },
    { id: 'ehpadvisite', c: () => true, t: 'Alerte sur un EHPAD', d: 'Une fille de résidente vous écrit : sa mère n’est levée qu’une fois par jour, faute de personnel.', o: [
      ['Faire une visite inopinée', p => { E.addImage('RET', 2.5); E.addNoto(X.scopeOf(), 1.5); hrs(3); if (p.mandats.some(m => ['depute', 'senateur'].includes(m.type))) { cr(1); return 'Votre droit de visite de parlementaire fait trembler la direction.'; } return 'La direction vous reçoit, gênée. L’ARS est prévenue.'; }],
      ['Saisir l’Agence régionale de santé', () => { cr(1); return 'L’ARS annonce une inspection.'; }],
      ['Lui répondre que vous n’y pouvez rien', () => { E.addImage('RET', -1.5); return 'La lettre se retrouve sur un groupe local.'; }]] },
    { id: 'plateau', vil: false, c: p => p.noto.dept > 25, t: 'Un plateau d’info en continu', d: 'Une chaîne nationale vous invite ce soir à 22 h face à un polémiste connu pour ses dérapages.', o: [
      ['Accepter', p => { if (R() < 0.5 + (p.mediaTraining || 0) * 0.1 + (p.traits.sangfroid - 50) / 200) { E.addNoto('nat', 4); E.addImageAll(0.8); return 'Vous tenez tête au polémiste : l’extrait fait 400 000 vues.'; } E.addNoto('nat', 2); E.addImageAll(-1.8); return 'Piégé·e sur un chiffre, vous perdez pied en direct.'; }],
      ['Refuser', () => 'Vous préférez la presse régionale. Prudent, mais discret.']] },
    { id: 'conflit', vil: false, c: p => p.staff.length >= 2, t: 'Votre équipe se déchire', d: 'Deux de vos collaborateurs ne se parlent plus et se plaignent l’un de l’autre.', o: [
      ['Trancher en faveur du plus ancien', p => { const st = p.staff.slice().sort((a, b) => (a.since || '') < (b.since || '') ? 1 : -1)[0]; if (st) st.loy -= 12; return 'L’autorité est rétablie. Le perdant rumine.'; }],
      ['Prendre le temps d’une médiation', p => { hrs(2); p.staff.forEach(x => x.loy += 3); return 'Une soirée de mise à plat. L’équipe repart.'; }],
      ['Laisser faire', p => { p.staff.forEach(x => x.loy -= 4); return 'L’ambiance se dégrade.'; }]] },
    { id: 'fatigue', c: p => p.fullTime || p.mandats.length >= 2, t: 'Le corps dit stop', d: 'Votre médecin vous recommande une semaine de repos. Vous dormez quatre heures par nuit.', o: [
      ['Prendre une semaine', p => { hrs(8); p.traits.sangfroid = clamp((p.traits.sangfroid ?? 50) + 4, 0, 100); return 'Une semaine loin de tout. Vous revenez plus lucide.'; }],
      ['Continuer coûte que coûte', p => { if (R() < 0.35) { E.addImageAll(-2); return 'Épuisé·e, vous vous emportez en public. La vidéo circule.'; } return 'Vous tenez. Pour l’instant.'; }]] },
    { id: 'famille', c: p => p.mandats.length > 0 || !!p.cand, t: 'Les reproches de la famille', d: 'À la maison, on vous reproche de n’être jamais là. Les week-ends sont tous pris.', o: [
      ['Bloquer un week-end sur deux', () => { hrs(4); return 'Moins d’heures pour la politique, mais la paix à la maison.'; }],
      ['Associer la famille à la campagne', () => { E.addImage('RET', 0.8); E.addImage('PERI', 0.8); return 'Les photos de famille au marché plaisent. Les enfants un peu moins.'; }],
      ['Promettre que ça ira mieux après', () => 'Promesse de campagne. On verra.']] },
    { id: 'rachat', vil: false, c: () => true, t: 'Le journal local change de mains', d: 'Le quotidien régional est racheté par un industriel proche de vos adversaires.', o: [
      ['Dénoncer la concentration des médias', p => { cr(0.5); E.addImage('JUD', 1); const j = E.pnjList(x => x.role === 'journaliste' && x.territory === 'dauph')[0]; if (j) j.rel -= 5; return 'Votre tribune est reprise au niveau national. La rédaction locale apprécie moins.'; }],
      ['Ne rien dire', () => 'Vous gardez de bonnes relations avec la nouvelle direction.']] },
    { id: 'tract', c: p => !!p.cand && E.phase().id !== 'hors', t: 'Une erreur dans votre tract', d: 'Votre adversaire relève un chiffre faux dans votre tract : la dette de la commune y est doublée.', o: [
      ['Corriger et reconnaître l’erreur', p => { p.cash -= 600; cr(0.5); return 'Vous réimprimez. L’erreur est oubliée en trois jours.'; }],
      ['Maintenir', () => { cr(-2.5); return 'Votre adversaire en fait un argument : « même ses chiffres sont faux ».'; }],
      ['Contre-attaquer sur ses propres erreurs', p => { if (R() < 0.45) { p.mom += 0.01; return 'Vous trouvez deux erreurs dans son programme. Match nul.'; } cr(-1.5); return 'La diversion ne prend pas.'; }]] },
    { id: 'meres', vil: false, c: () => true, t: 'Le collectif des mères du quartier', d: 'Des mères de famille veulent vous parler de la sécurité de leurs enfants sur le chemin de l’école.', o: [
      ['Les rencontrer chez l’une d’elles', () => { E.addImage('POP', 3); hrs(2); return 'Deux heures autour d’un thé. Vous repartez avec des idées précises.'; }],
      ['Les recevoir dans un bureau', () => { E.addImage('POP', 1); return 'Rencontre utile, un peu protocolaire.'; }],
      ['Leur conseiller d’écrire au commissariat', () => { E.addImage('POP', -1.5); return 'Elles se sentent éconduites.'; }]] },
    { id: 'epandage', c: () => [3, 4, 5, 9, 10].includes(MO()), t: 'Épandage : agriculteur contre riverains', d: 'Des néo-ruraux accusent un céréalier d’épandre trop près de leurs maisons. Le ton monte.', o: [
      ['Soutenir l’agriculteur', () => { E.addImage('RUR', 2.5); E.addImage('CAD', -1); return 'Le monde agricole apprécie. Les nouveaux habitants beaucoup moins.'; }],
      ['Soutenir les riverains', () => { E.addImage('CAD', 1.5); E.addImage('PERI', 1); E.addImage('RUR', -2.5); return 'Les riverains vous remercient, la FDSEA vous classe parmi ses adversaires.'; }],
      ['Proposer une charte de bon voisinage', () => { hrs(2); E.addImage('RUR', 1); E.addImage('PERI', 1); cr(0.5); return 'Réunion tendue, mais un accord : prévenir 48 h avant chaque épandage.'; }]] },
    { id: 'prof', vil: false, c: () => [9, 10, 11, 12, 1, 2, 3, 4, 5, 6].includes(MO()), t: 'Un professeur agressé', d: 'Un enseignant a été frappé par un parent d’élève devant un collège.', o: [
      ['Participer au rassemblement de soutien', () => { E.addImage('CAD', 1.5); E.addImage('JUD', 1); return 'Vous êtes au premier rang, aux côtés des enseignants.'; }],
      ['Réclamer des agents aux abords des collèges', () => { E.addImage('RET', 2); E.addImage('PERI', 1); E.addImage('JUD', -1); return 'Votre demande divise, mais elle est entendue.'; }],
      ['Un communiqué', () => 'Votre communiqué rejoint la pile des autres.']] },
    { id: 'transfuge', c: p => !!p.cand && (S().rivals || []).length > 0, t: 'Un transfuge frappe à la porte', d: 'Un colistier d’un adversaire veut vous rejoindre, avec son carnet d’adresses, contre une bonne place.', o: [
      ['L’accueillir', p => { p.mom += 0.02; const x = S().pnj[(S().rivals || [])[0]]; if (x) { x.mom -= 0.02; x.rel -= 10; } E.addStd(-1); return 'Prise de guerre médiatisée. Vos fidèles grincent un peu.'; }],
      ['Refuser : pas de mercato', () => { cr(0.5); return 'Vous gardez votre équipe soudée.'; }]] },
    { id: 'loupsit', c: p => { const c = E.commune(); return c.pop < 6000 || ['rural', 'bourg'].includes(c.type); }, t: 'Les brebis égorgées', d: 'Un éleveur vous montre les bêtes tuées par le loup la nuit dernière. Il est à bout.', o: [
      ['Réclamer des tirs de défense', () => { E.addImage('RUR', 3); E.addImage('JUD', -1.5); return 'L’éleveur vous serre la main longuement.'; }],
      ['Plaider pour mieux financer la protection des troupeaux', () => { E.addImage('RUR', 1); E.addImage('JUD', 0.5); return 'Une réponse jugée raisonnable, sans plus.'; }],
      ['Rappeler que le loup est une espèce protégée', () => { E.addImage('JUD', 1.5); E.addImage('RUR', -3); return 'L’éleveur vous tourne le dos. La vallée le saura.'; }]] },
    { id: 'factcheck', vil: false, c: p => p.stmts.length > 4, t: 'Épinglé·e par un service de vérification', d: 'Un média de vérification juge « trompeuse » une de vos affirmations récentes.', o: [
      ['Reconnaître et préciser', () => { cr(1); return 'Votre honnêteté est notée. L’erreur est vite oubliée.'; }],
      ['Contester, sources à l’appui', () => { if (R() < 0.5) { cr(1); return 'Vos sources tiennent : le média corrige son article.'; } cr(-2.5); return 'Vos sources ne tiennent pas. Double peine.'; }],
      ['Ignorer', () => { cr(-1); return 'L’article reste en ligne, et vos adversaires le partagent.'; }]] },
    { id: 'mouvement', c: p => p.party !== 'NEW' && p.std < 40, t: 'La tentation de l’indépendance', d: 'Des militants vous poussent à quitter le parti pour lancer une liste citoyenne locale.', o: [
      ['Refuser fermement', () => { E.addStd(2); return 'Le parti apprécie votre loyauté.'; }],
      ['Laisser planer le doute', p => { E.addStd(-2); p.mom += 0.01; return 'La presse locale s’en fait l’écho. Le parti s’inquiète.'; }]] },
    { id: 'canicule_vol', c: () => [6, 7, 8].includes(MO()), t: 'Canicule : les aînés seuls chez eux', d: 'La chaleur est écrasante. Beaucoup de personnes âgées vivent seules, volets fermés.', o: [
      ['Organiser des visites avec vos militants', p => { E.addImage('RET', 2.5); p.militants += 1; hrs(2); return 'Trois cents portes, des bouteilles d’eau, quelques situations urgentes signalées.'; }],
      ['Relayer le numéro de la mairie', () => { E.addImage('RET', 0.5); return 'Un relais utile, discret.'; }]] },
    { id: 'jeunesse', vil: false, c: () => true, t: 'Les jeunes du city-stade', d: 'Les jeunes du quartier vous interpellent : « Vous venez nous voir que pendant les élections. »', o: [
      ['Rester jouer un match avec eux', p => { E.addImage('JUD', 1.5); E.addImage('POP', 2); hrs(1); return 'Vous perdez 10 à 3, mais la vidéo fait sourire tout le quartier.'; }],
      ['Leur promettre une salle pour se réunir', () => { E.addImage('POP', 1); cr(-0.5); return 'Ils notent la promesse. Ils s’en souviendront, dans un sens ou dans l’autre.'; }],
      ['Leur répondre que vous êtes là toute l’année', () => { E.addImage('POP', -1); return 'Ils haussent les épaules.'; }]] },
    { id: 'chasse', c: p => { const c = E.commune(); return c.pop < 10000 && [9, 10, 11, 12, 1, 2].includes(MO()); }, t: 'L’assemblée générale des chasseurs', d: 'L’ACCA vous invite. Sujet brûlant : un randonneur blessé lors d’une battue dans le département.', o: [
      ['Y aller et défendre la chasse encadrée', () => { E.addImage('RUR', 2.5); E.addImage('JUD', -1); return 'Les chasseurs vous applaudissent. Les randonneurs du Vercors un peu moins.'; }],
      ['Y aller et plaider pour un dimanche sans chasse', () => { E.addImage('JUD', 1.5); E.addImage('CAD', 0.5); E.addImage('RUR', -2); return 'Silence glacial dans la salle.'; }],
      ['Décliner', () => { E.addImage('RUR', -0.8); return 'Votre absence est commentée au bar du village.'; }]] }
  );
  function situationTick(days) {
    const s = S(), p = P(); const pr = Math.min(0.85, 0.45 * days / 14 + 0.06); if (E.rnd() > pr) return;
    s.sitDone = s.sitDone || []; const vil = E.villageScope(); const pool = SIT.filter(x => x.c(p) && !(vil && x.vil === false) && !s.sitDone.slice(-8).includes(x.id)); if (!pool.length) return;
    const x = pick(pool); s.sitDone.push(x.id); s.queue.push({ kind: 'situation', id: x.id });
  }
  function situationResolve(id, idx) { const x = SIT.find(z => z.id === id); const msg = x.o[idx][1](P()); E.log(x.t + ' — ' + msg, 'event'); return msg; }

  return { whySeg, partyLine, gz, TH_LINES, oppLine, ensureProgs, rivalProgEffect, genProp, ANGLES, angleChance, attackProp, fallbackQuestion, fallbackJudge, RIPOSTES, SIT, situationTick, situationResolve, remember };
})();
