/* Mandat — débats et interviews en direct : échanges courts, perception mesurée au fil de l’eau */
const LV = (() => {
  const S = () => G.S, P = () => G.S.p, R = () => E.rnd();
  const pick = a => a[Math.floor(R() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SEGS = ['JUD', 'POP', 'RET', 'PERI', 'CAD', 'RUR'];
  const SHORT = { JUD: 'Jeunes dipl.', POP: 'Classes pop.', RET: 'Retraités', PERI: 'Périurbains', CAD: 'Cadres', RUR: 'Ruraux' };
  // types de réponse : effet par électorat, tension, variance
  const MOVES = {
    chiffres: { l: 'Chiffres', c: '#5a78c2', seg: { JUD: 0.8, POP: 0.4, RET: 1, PERI: 0.7, CAD: 1.3, RUR: 0.6 }, tens: -2, v: 0.3 },
    fond: { l: 'Fond', c: '#5a78c2', seg: { JUD: 0.9, POP: 0.6, RET: 0.9, PERI: 0.8, CAD: 1.1, RUR: 0.7 }, tens: -1, v: 0.35 },
    assumer: { l: 'Assumer', c: '#8a6fc2', seg: { JUD: 0.8, POP: 0.9, RET: 1, PERI: 0.9, CAD: 0.9, RUR: 1 }, tens: 2, v: 0.4 },
    nuance: { l: 'Nuance', c: '#4f9a74', seg: { JUD: 0.9, POP: 0.5, RET: 1.1, PERI: 0.7, CAD: 1.2, RUR: 0.7 }, tens: -4, v: 0.25 },
    emotion: { l: 'Émotion', c: '#c98b3a', seg: { JUD: 0.6, POP: 1.3, RET: 1.2, PERI: 1, CAD: 0.4, RUR: 1.2 }, tens: 1, v: 0.45 },
    punch: { l: 'Punchline', c: '#d9493b', seg: { JUD: 1.3, POP: 1.2, RET: 0.5, PERI: 1, CAD: 0.5, RUR: 0.9 }, tens: 4, v: 0.95 },
    attaque: { l: 'Attaque', c: '#d9493b', seg: { JUD: 0.9, POP: 1.1, RET: 0.6, PERI: 1, CAD: 0.8, RUR: 0.9 }, tens: 8, v: 0.55 },
    bluff: { l: 'Bluff', c: '#9b4a8a', seg: { JUD: 0.9, POP: 1.1, RET: 1, PERI: 1, CAD: 0.9, RUR: 1 }, tens: 1, v: 0.3 },
    esquive: { l: 'Esquive', c: '#6c737f', seg: { JUD: 0.6, POP: 0.6, RET: 0.8, PERI: 0.6, CAD: 0.5, RUR: 0.7 }, tens: -3, v: 0.2 },
    couper: { l: 'Couper la parole', c: '#d9493b', seg: { JUD: 1, POP: 1.1, RET: 0.4, PERI: 0.9, CAD: 0.5, RUR: 0.8 }, tens: 10, v: 0.6 },
    ecouter: { l: 'Laisser parler', c: '#4f9a74', seg: { JUD: 0.6, POP: 0.5, RET: 1.2, PERI: 0.6, CAD: 1.1, RUR: 0.8 }, tens: -5, v: 0.2 }
  };
  function moveOf(o) {
    if (o.move) return o.move; if (o.lie) return 'bluff'; if (o.punch) return 'punch'; if (o.attack) return 'attaque'; if (o.emo) return 'emotion';
    const ps = (o.posture || '').toLowerCase();
    if (/esquive|recentr|méthode|agacement/.test(ps)) return 'esquive'; if (/chiffre|faisab|proposition|relativ/.test(ps)) return 'chiffres';
    if (/nuance|évolution|oui, mais|sincér/.test(ps)) return 'nuance'; if (/assum|oui|non|ferm|solidar|position|constance/.test(ps)) return 'assumer';
    if (/attaque|accuse|charger|retourner|contre/.test(ps)) return 'attaque'; if (/humour/.test(ps)) return 'punch'; if (/dramatis|terrain|émotion/.test(ps)) return 'emotion';
    return 'fond';
  }

  function audience(dctx) {
    const p = P(); const u = E.unit(p.cand ? p.cand.key : 'c' + p.circo); const w = {};
    SEGS.forEach((g, i) => w[g] = (u.mix ? u.mix[i] : 1 / 6) * (dctx.reach ? 0.4 + (dctx.reach[g] || 0) * 2 : 1));
    const t = SEGS.reduce((a, g) => a + w[g], 0); SEGS.forEach(g => w[g] /= t); return w;
  }
  function start(dctx) {
    const p = P(); const iv = !!dctx.interview; const opp = iv ? null : (dctx.opponents || [])[0];
    const oppX = opp && opp.id ? S().pnj[opp.id] : null; const es = S().est;
    let bar = 50; if (!iv && es && opp) { const mine = es.pct || 0, th = (es.rows.find(r => r.id === opp.id) || {}).pct || mine; bar = clamp(50 + (mine - th) / 3, 38, 62); }
    const N = dctx.rounds || (iv ? 8 : 10);
    const plan = iv ? ['q', 'q', 'piege', 'q', 'q', 'piege', 'q', 'fin'] : ['q', 'atk', 'q', 'clash', 'q', 'atk', 'q', 'q', 'atk', 'fin'];
    while (plan.length < N) plan.splice(plan.length - 1, 0, plan.length % 3 ? 'q' : 'atk'); plan.length = N; plan[N - 1] = 'fin';
    return { dctx, iv, opp, oppX, N, i: 0, plan, bar, seg: Object.fromEntries(SEGS.map(g => [g, 0])), tension: clamp(25 + (50 - (p.traits.sangfroid ?? 50)) / 3, 10, 50), fact: 0, oppFact: 0, aud: audience(dctx), moves: [], lies: [], punches: [], stmts: [], feed: [], relance: null, used: [], best: null, worst: null, oppBluffs: [] };
  }

  /* ---- génération des échanges ---- */
  const segN = g => (D.SEGS.find(s => s.id === g) || { name: g }).name.toLowerCase();
  function question(st) {
    const q = typeof DP !== 'undefined' ? DP.fallbackQuestion(Object.assign({}, st.dctx, { opponents: st.iv ? [] : st.dctx.opponents }), st.i, st.used) : null;
    if (q) { const opts = q.opts.slice(0, 5).map(o => Object.assign({}, o, { move: moveOf(o) })); return { kind: 'q', who: st.dctx.host, text: q.question, theme: q.theme, opts }; }
    const th = Object.keys(D.THEMES).find(t => !st.used.includes('gq' + t)) || pick(Object.keys(D.THEMES)); st.used.push('gq' + th); const tl = D.THEMES[th].l.toLowerCase(); return { kind: 'q', who: st.dctx.host, theme: th, text: E.fresh('gq', ['Un mot sur ' + tl + ' : quelle est votre priorité ?', 'Sur ' + tl + ', qu’est-ce qui changera concrètement si vous êtes élu·e ?', 'Les habitants vous interpellent sur ' + tl + '. Que leur répondez-vous ?', tl.charAt(0).toUpperCase() + tl.slice(1) + ' : votre première mesure ?', 'On vous reproche d’être flou·e sur ' + tl + '. Précisez.', 'Sur ' + tl + ', qu’avez-vous à dire à ceux qui ne vous croient plus ?']), opts: [
      { posture: 'Proposition', texte: 'Ma priorité est claire, et elle est chiffrée.', q: 4, move: 'chiffres' }, { posture: 'Émotion', texte: 'Derrière ce sujet, il y a des familles qui souffrent.', q: 3, move: 'emotion' },
      { posture: 'Attaque', texte: 'Ceux qui gouvernent ont tout raté sur ce sujet.', q: 3, move: 'attaque' }, { posture: 'Esquive', texte: 'C’est un sujet complexe.', q: -5, move: 'esquive' }] };
  }
  function attack(st) {
    const p = P(); const x = st.oppX; const nm = st.opp ? st.opp.name : 'Votre adversaire'; const pre = x && x.nemesis && !st.used.includes('nem') ? (st.used.push('nem'), 'On se connaît bien, vous et moi. ') : '';
    const weak = p.prog.filter(m => m.status !== 'retiree' && (!m.fin || m.fin === 'aucun' || m.fin === 'dette'))[0];
    const fin = p.prog.filter(m => m.status !== 'retiree' && m.fin && !['aucun', 'dette', 'croissance'].includes(m.fin))[0];
    const cas = p.casseroles.filter(c => c.out)[0]; const ct = p.stmts.find(z => z.v && E.diffDays(z.date, S().date) > 30);
    const opts = [];
    let a;
    const brk = (p.promises || []).find(z => z.broken && !st.used.includes('pr' + z.id)); const bs = typeof GV !== 'undefined' ? GV.bilanScore() : 0; const inc = p.mandats.some(mm => ['maire', 'adjoint', 'depute', 'president', 'cd'].includes(mm.type));
    if (brk) { st.used.push('pr' + brk.id); a = { theme: 'institutions', text: nm + ' : « Vous aviez promis ' + brk.what + '. On attend toujours. Pourquoi vous croire cette fois ? »', truth: true };
      opts.push({ posture: 'Reconnaître', texte: 'Je n’ai pas pu le faire à temps, je l’assume. Mais je l’ai inscrit au budget et je le ferai.', q: 5, move: 'nuance' }, { posture: 'Nier', texte: 'C’est en cours, les travaux commencent bientôt.', q: 0, move: 'bluff', lie: true }); }
    else if (inc && !st.used.includes('bilan')) { st.used.push('bilan'); const good = bs > 10; a = { theme: 'institutions', text: nm + ' : « Parlons de votre bilan. ' + (good ? 'Beaucoup d’annonces, peu de résultats concrets.' : 'Il est mauvais, et tout le monde le sait.') + ' »', truth: !good };
      opts.push({ posture: 'Défendre mon bilan', texte: good ? 'Mon bilan, les habitants le voient : ' + (P().bilan || []).filter(b => b.v > 0).slice(-2).map(b => b.l.toLowerCase()).join(', ') + '.' : 'Nous avons fait ce que nous pouvions dans un contexte difficile.', q: good ? 11 : -1, move: good ? 'chiffres' : 'esquive' }); }
    else if (cas && !st.used.includes('cas')) { st.used.push('cas'); a = { theme: 'institutions', text: nm + ' : « Avant de donner des leçons, expliquez-nous ' + cas.label + '. »', truth: true };
      opts.push({ posture: 'Démentir', texte: 'C’est faux et vous le savez. Mes avocats s’en occupent.', q: 2, move: 'bluff', lie: true }, { posture: 'Assumer', texte: 'J’ai commis une erreur, je l’ai reconnue. Parlons de l’avenir des habitants.', q: 7, move: 'nuance' }); }
    else if (weak && !st.used.includes('w' + weak.id)) { st.used.push('w' + weak.id); a = { theme: weak.theme, text: nm + ' : « « ' + weak.resume + ' » : pas un euro de financement. C’est de la poudre aux yeux. »', truth: true };
      opts.push({ posture: 'Réfuter', texte: 'Le financement existe : des économies sur le train de vie et des redéploiements.', q: -2, move: 'bluff', lie: true }, { posture: 'Assumer', texte: 'C’est un investissement. Ce qui coûte cher, c’est de ne rien faire.', q: 4, move: 'assumer' }); }
    else if (ct && !st.used.includes('ct')) { st.used.push('ct'); a = { theme: ct.theme, text: nm + ' : « Il y a quelques mois, vous disiez exactement l’inverse. Les électeurs ont de la mémoire. »', truth: false };
      opts.push({ posture: 'Réfuter', texte: 'Je n’ai jamais changé de position. Vous déformez mes propos.', q: 7, move: 'chiffres' }); }
    else if (fin && !st.used.includes('f' + fin.id)) { st.used.push('f' + fin.id); a = { theme: fin.theme, text: nm + ' : « « ' + fin.resume + ' », c’est une usine à gaz que vous ne financerez jamais. »', truth: false };
      opts.push({ posture: 'Réfuter', texte: 'C’est financé : ' + (fin.finL || 'chaque euro est identifié').toLowerCase() + '. Lisez le programme avant de le critiquer.', q: 12, move: 'chiffres' }); }
    else { const noMandat = !p.mandats.length; a = { theme: 'institutions', text: nm + ' : « ' + (noMandat ? E.fresh('gatk0', ['Vous n’avez jamais rien géré. Les habitants méritent de l’expérience, pas un stage.', 'Votre seule expérience, ce sont les tracts.', 'Qui vous connaissait ici il y a deux ans ?', 'Vous découvrez les dossiers en même temps que nous.']) : E.fresh('gatk1', ['Votre bilan parle pour vous : rien n’a changé depuis votre élection.', 'Vous avez eu le pouvoir, qu’en avez-vous fait ?', 'Vos électeurs attendent encore vos promesses.', 'Vous étiez absent·e quand il fallait décider.'])) + ' »', truth: !noMandat && R() < 0.4 };
      opts.push({ posture: 'Réfuter', texte: noMandat ? 'L’expérience, vous l’avez : on en voit le résultat. Moi, j’apporte du neuf.' : 'Trois projets livrés, un budget tenu. Les faits sont têtus.', q: 6, move: noMandat ? 'punch' : 'chiffres' }); }
    if (pre) a.text = a.text.replace(nm + ' : « ', nm + ' : « ' + pre);
    opts.push({ posture: 'Retourner l’attaque', texte: x && (x.prog || [])[0] ? 'Venant de quelqu’un qui propose « ' + x.prog[0].label + ' » sans dire comment payer, c’est savoureux.' : 'Venant de vous, la leçon est savoureuse.', q: 5, move: 'attaque', attack: x && (x.prog || [])[0] ? { x: x.id, pr: x.prog[0].id, angle: 'cout' } : null });
    opts.push({ posture: 'Ironie', texte: E.fresh('iro', ['Vous avez répété cette phrase dans votre voiture ?', 'Quand on n’a pas d’idées, on a des attaques.', 'Je vous laisse les petites phrases, je garde les solutions.', 'Je note que vous n’avez toujours pas de programme.', 'C’est la seule phrase de votre fiche ?', 'Les électeurs méritent mieux qu’un sketch.']), q: R() * 16 - 6, move: 'punch' });
    opts.push({ posture: 'Ignorer', texte: 'Je ne répondrai pas aux attaques. Parlons de ce qui intéresse les habitants.', q: 1, move: 'esquive' });
    return { kind: 'atk', who: nm, text: a.text, theme: a.theme, opts: opts.slice(0, 5), truth: a.truth };
  }
  function clash(st) {
    const nm = st.opp ? st.opp.name : 'Votre adversaire'; const x = st.oppX; const th = pick(isLocal() ? (E.myPetite() ? VIL_TH : LOCAL_TH) : ['economie', 'securite', 'logement', 'sante', 'fiscalite']);
    const line = x && typeof DP !== 'undefined' && DP.oppLine ? DP.oppLine(x, th, E.myPetite() && isLocal()) : 'Ma proposition est la seule qui tienne la route.';
    return { kind: 'clash', who: nm, text: nm + ' déroule : « ' + line + ' » et déborde sur votre temps de parole.', theme: th, opts: [
      { posture: 'Laisser finir', texte: '(Vous attendez calmement votre tour.)', q: 2, move: 'ecouter' },
      { posture: 'Couper la parole', texte: 'Permettez ! Vous parlez depuis trois minutes pour ne rien dire.', q: 5, move: 'couper' },
      { posture: 'Ironie', texte: 'Continuez, vous faites ma campagne.', q: R() * 14 - 4, move: 'punch' },
      { posture: 'Prendre le public à témoin', texte: 'Les gens qui nous écoutent veulent des réponses, pas un monologue.', q: 4, move: 'emotion' }] };
  }
  function relance(st) {
    const r = st.relance; st.relance = null; const hard = st.iv && st.dctx.tone === 'hostile';
    return { kind: 'relance', who: st.dctx.host, theme: r.theme, text: (hard ? 'Vous n’avez pas répondu. Je repose la question, ' : 'Je me permets d’insister : ') + '« ' + r.text.replace(/^.*?« |»$/g, '').slice(0, 160) + ' »', opts: [
      { posture: 'Répondre enfin', texte: 'Très bien, je vais être précis·e : voici ce que je ferai, et dans quel délai.', q: 6, move: 'fond' },
      { posture: 'Esquiver encore', texte: 'Je crois avoir répondu. Passons à autre chose.', q: -9, move: 'esquive' },
      { posture: 'Mettre en cause la question', texte: 'Votre question est orientée, et vous le savez.', q: -2, move: 'attaque' },
      { posture: 'Avouer', texte: 'Je n’ai pas encore tous les éléments. Je reviendrai vers vous avec des chiffres.', q: 3, move: 'nuance' }] };
  }
  function factcheck(st) {
    const b = st.oppBluffs.shift(); const nm = st.opp ? st.opp.name : 'Votre adversaire';
    return { kind: 'fc', who: st.dctx.host, theme: b.theme, text: nm + ' vient d’affirmer : « ' + b.text + ' ». Le chiffre paraît douteux.', opts: [
      { posture: 'Dénoncer', texte: 'C’est faux. Les chiffres officiels disent l’inverse, et chacun peut le vérifier.', q: 11, move: 'chiffres' },
      { posture: 'Ironie', texte: 'Avec des chiffres pareils, vous devriez écrire des romans.', q: R() * 16 - 3, move: 'punch' },
      { posture: 'Laisser passer', texte: '(Vous ne relevez pas.)', q: -3, move: 'ecouter' }] };
  }
  function closing(st) {
    const p = P(); const lead = st.bar >= 52; const camp = !!(p.cand && (typeof HQ === 'undefined' || HQ.active())); const elu = p.mandats.some(m => ['maire', 'depute', 'cd', 'adjoint'].includes(m.type));
    return { kind: 'fin', who: st.dctx.host, theme: 'institutions', text: st.iv ? 'Un dernier mot pour nos auditeurs ?' : 'Votre mot de conclusion, une minute.', opts: [
      { posture: 'Rassembler', texte: camp ? 'Au-delà des étiquettes, je serai au service de tous. Rejoignez-nous.' : elu ? 'Je travaille pour tous les habitants, quelle que soit leur sensibilité. C’est ma seule boussole.' : 'Au-delà des étiquettes, ce qui compte, ce sont les solutions.', q: lead ? 7 : 4, move: 'nuance' },
      { posture: camp ? 'Mobiliser' : 'Rendre des comptes', texte: camp ? 'Rien n’est joué. Le jour du vote, chaque voix comptera. Allez voter.' : elu ? 'Jugez-nous sur les actes : je rendrai compte de chaque engagement.' : 'Je continuerai à porter ces sujets, sur le terrain.', q: 5, move: camp ? 'emotion' : 'fond' },
      { posture: 'Dernière attaque', texte: st.iv ? (camp ? 'Je ne laisserai pas les sortants abîmer encore notre territoire.' : 'Les critiques sont faciles ; les solutions, beaucoup moins.') : 'Vous avez entendu mon adversaire : beaucoup de critiques, aucune proposition.', q: lead ? 2 : 6, move: 'attaque' },
      { posture: 'Ma priorité', texte: (p.prog.find(m => m.phare) ? 'Une seule chose à retenir : « ' + p.prog.find(m => m.phare).resume + ' ».' : 'Une seule chose à retenir : je tiendrai parole.'), q: p.prog.find(m => m.phare) ? 8 : 3, move: 'fond' }] };
  }
  function next(st) {
    if (st.i >= st.N) return null;
    if (st.relance) return relance(st);
    let k = st.plan[st.i];
    if (k === 'atk' && st.iv) k = 'q'; if (k === 'clash' && st.iv) k = 'q';
    if (k === 'piege') k = 'q';
    if (k === 'q' && st.oppBluffs.length && R() < 0.6) return factcheck(st);
    return k === 'atk' ? attack(st) : k === 'clash' ? clash(st) : k === 'fin' ? closing(st) : question(st);
  }

  /* ---- prévision et résolution ---- */
  function skill(m) { const p = P(); let s = ((p.traits.sangfroid ?? 50) - 50) / 120 + (p.mediaTraining || 0) * 0.08 + ((p.cred || 40) - 50) / 200;
    if (['punch', 'emotion'].includes(m) && E.hasStaff('plume')) s += 0.2; if (['chiffres', 'fond'].includes(m) && E.hasStaff('juriste')) s += 0.1; if (E.hasStaff('com')) s += 0.06; return s; }
  function fitOf(o) { const v = o.ax ? E.vecFrom(o.ax) : null; const f = {}; SEGS.forEach(g => f[g] = v ? E.alignment(v, D.SEGS.find(s => s.id === g).ideal) : 0); return f; }
  function rep(st, m) { const n = st.moves.slice(-3).filter(x => x === m).length; return [1, 0.7, 0.45, 0.3][n]; }
  function predict(st, o) {
    const m = MOVES[o.move] || MOVES.fond; const t = ((o.q || 0) / 10 + skill(o.move) + (st.dctx.relBonus || 0) / 20) * rep(st, o.move); const fit = fitOf(o);
    const d = {}; SEGS.forEach(g => d[g] = t * 4 * m.seg[g] + fit[g] * 3); const risks = [];
    if (o.move === 'bluff') risks.push('Vérification des faits'); if (o.move === 'punch') risks.push('Quitte ou double');
    if (['attaque', 'couper', 'punch'].includes(o.move) && st.tension > 60) risks.push('Risque de dérapage'); if (o.move === 'esquive') risks.push('Relance probable');
    if (rep(st, o.move) < 1) risks.push('Déjà vu : le public se lasse');
    const ord = SEGS.slice().sort((a, b) => d[b] * st.aud[b] - d[a] * st.aud[a]); const plus = ord.filter(g => d[g] > 0.4).slice(0, 2); const minus = ord.slice().reverse().filter(g => d[g] < -0.5).slice(0, 1);
    return { d, plus, minus, risks, t };
  }
  const REAC = [[5, ['Applaudissements nourris.', 'La salle se lève à moitié.', 'Gros moment : ça applaudit fort.']], [2, ['Le public approuve.', 'Quelques applaudissements.', 'Hochements de tête dans la salle.']], [-1.5, ['Réaction mitigée.', 'Le public attend la suite.', 'Pas de réaction marquée.']], [-4, ['Murmures dans la salle.', 'Quelques soupirs.', 'Le public décroche.']], [-99, ['Huées.', 'Le public gronde.', 'Moment de malaise sur le plateau.']]];
  function reac(d) { for (const [th, L] of REAC) if (d >= th) return E.fresh('reac' + th, L); return 'Silence.'; }
  function resolve(st, beat, o) {
    const p = P(); const m = MOVES[o.move] || MOVES.fond; const pr = predict(st, o);
    let t = pr.t + E.gauss() * m.v; let slip = false;
    if (['attaque', 'couper', 'punch'].includes(o.move) && st.tension > 70 && R() < (st.tension - 60) / 80) { t = -1.6; slip = true; }
    if (beat.kind === 'atk' && beat.truth && o.move === 'chiffres') t -= 0.5;
    const segD = {}; SEGS.forEach(g => segD[g] = clamp(t * 4 * m.seg[g] + pr.d[g] - pr.t * 4 * m.seg[g] + (E.gauss() * 0.6), -9, 9));
    let barD = clamp(SEGS.reduce((a, g) => a + st.aud[g] * segD[g], 0) * 0.85, -6, 6);
    SEGS.forEach(g => st.seg[g] = clamp(st.seg[g] + segD[g], -40, 40));
    st.tension = clamp(st.tension + m.tens + (beat.kind === 'atk' ? 6 : 0) + (slip ? 12 : 0), 0, 100);
    if (o.move === 'bluff') { st.fact += 30; st.lies.push(o.texte); }
    if (o.move === 'punch' && t > 0.9) st.punches.push(o.texte);
    if (o.move === 'esquive' && beat.kind !== 'relance' && R() < (st.iv ? 0.85 : 0.6)) st.relance = { theme: beat.theme, text: beat.text };
    if (o.move === 'couper') st.couper = (st.couper || 0) + 1;
    if (o.attack && typeof DP !== 'undefined' && DP.attackProp && t > 0.6) { try { DP.attackProp(o.attack.x, o.attack.pr, o.attack.angle || 'cout'); } catch (e) { } }
    if (o.edl && typeof HQ !== 'undefined') HQ.edlUse(o.edl);
    st.moves.push(o.move); if (o.ax || beat.kind === 'q') st.stmts.push({ text: o.texte, theme: beat.theme, axes: o.ax });
    st.feed.push({ me: true, t: o.texte });
    const out = { segD, barD, reac: slip ? 'Dérapage : le ton monte, vous perdez vos nerfs.' : reac(barD), slip, opp: null };
    // l'adversaire (ou le journaliste) réagit
    if (!st.iv && !st.arena && st.oppX && beat.kind !== 'fin') {
      const x = st.oppX; const tr = x.traits || {}; const strength = (x.noto || 30) / 100 * 0.6 + ((tr.charisme ?? 50) - 50) / 150 + E.gauss() * 0.6 - (o.move === 'couper' ? 0.2 : 0);
      const bluff = (tr.scrupules ?? 50) < 40 && R() < 0.35; let txt;
      if (bluff) { txt = E.fresh('bluff', ['Sous ma responsabilité, la délinquance a baissé de 40 %.', 'Ma mesure ne coûte rien, elle est autofinancée.', 'Tous les experts sont d’accord avec moi.', 'Vous avez augmenté les impôts de 30 % !', 'Le chômage a doublé dans cette ville en cinq ans.', 'Neuf habitants sur dix soutiennent mon projet.']); st.oppBluffs.push({ text: txt, theme: beat.theme }); }
      else txt = typeof DP !== 'undefined' && DP.oppLine ? DP.oppLine(x, beat.theme, E.myPetite() && isLocal()) : 'Je ne partage pas cette analyse.';
      const od = clamp((strength - 0.25) * 2.5 + E.gauss() * 0.8 + (bluff ? 0.8 : 0), -3, 4);
      barD -= od; out.barD = barD; out.opp = { name: st.opp.name, txt, d: od };
      st.feed.push({ me: false, n: st.opp.name, t: txt });
    } else if (st.iv && beat.kind !== 'fin') {
      const j = S().pnj[(st.dctx.journalist || {}).id]; const hostile = st.dctx.tone === 'hostile';
      if (o.move === 'esquive' || (hostile && R() < 0.3)) { const jd = hostile ? 1.5 : 0.6; barD -= jd; out.barD = barD; out.opp = { name: st.dctx.host, txt: pick(['Ce n’est pas vraiment une réponse.', 'Nos auditeurs jugeront.', 'Vous êtes sûr·e de ce chiffre ?']), d: jd }; st.feed.push({ me: false, n: st.dctx.host, t: out.opp.txt }); }
    }
    if ((st.bar < 32 && barD < 0) || (st.bar > 68 && barD > 0)) barD *= 0.6; out.barD = barD;
    st.bar = clamp(st.bar + barD, 5, 95); st.i++;
    if (!st.best || barD > st.best.d) st.best = { d: barD, t: o.texte }; if (!st.worst || barD < st.worst.d) st.worst = { d: barD, t: o.texte };
    return out;
  }
  function finish(st) {
    const p = P(); const score = st.bar; const seg = {}; SEGS.forEach(g => seg[g] = clamp(st.seg[g] / 2.5, -15, 15));
    let caught = 0; st.lies.forEach(() => { if (R() < 0.55) caught++; });
    if (caught) { p.cred = clamp(p.cred - 4 * caught, 0, 100); E.article('revel', 'Vérification : ' + caught + ' affirmation(s) fausse(s) ' + E.de(p.name) + ' pendant le débat', -0.4, 'pj'); }
    if ((st.couper || 0) >= 2) E.addImage('RET', -1.5);
    return { oppId: st.opp && st.opp.id, iv: st.iv, score, segments: seg, lies: st.lies.filter((_, i) => i < st.lies.length - caught), punchlines: st.punches.slice(0, 2), stmts: st.stmts.slice(0, 4), caught, best: st.best, worst: st.worst };
  }

  /* ===== débat en direct (arène) ===== */
  function arenaStart(dctx) {
    const st = start(dctx); st.arena = true; st.talk = { me: 0, opp: 0 }; st.notes = []; st.pendingAtk = null; st.cuts = 0; st.bi = 0;
    const N = Math.max(6, Math.min(12, dctx.rounds || 10));
    const base = ['opp', 'me', 'clash', 'opp', 'me', 'opp', 'me', 'clash', 'opp', 'me', 'me', 'fin'];
    st.blocks = base.slice(0, N - 1).concat(['fin']); st.N = st.blocks.length; return st;
  }
  // Thème du prochain échange : en local, seulement des sujets locaux, en priorité ceux des programmes en présence
  const TH_SUR = { economie: 'l’emploi', pouvoir_achat: 'le pouvoir d’achat', securite: 'la sécurité', immigration: 'l’immigration', ecologie: 'l’écologie', sante: 'la santé', education: 'l’école', logement: 'le logement', transports: 'les transports', institutions: 'la démocratie locale', europe: 'l’Europe', agriculture: 'l’agriculture', industrie: 'l’industrie', fiscalite: 'les impôts', societe: 'les questions de société' };
  const deArt = x => x.startsWith('le ') ? 'du ' + x.slice(3) : x.startsWith('les ') ? 'des ' + x.slice(4) : 'de ' + x;
  const LOCAL_TH = ['securite', 'fiscalite', 'education', 'sante', 'economie', 'pouvoir_achat', 'ecologie', 'transports', 'logement', 'institutions'];
  const VIL_TH = ['fiscalite', 'education', 'sante', 'economie', 'ecologie', 'institutions', 'securite', 'transports'];
  function isLocal() { const p = P(); const e = p.cand ? S().elections.find(z => z.id === p.cand.el) : null; return !!e && ['mun', 'dep'].includes(e.type); }
  function elTypeNow() { const p = P(); const e = p.cand ? S().elections.find(z => z.id === p.cand.el) : null; return e ? e.type : null; }
  const TH_PICK = st => { const s = S(), p = P(); const loc = isLocal(); const cp = typeof TB !== 'undefined' ? TB.comp(elTypeNow(), E.myPetite()) : null; const allowed = cp ? cp.filter(t => D.THEMES[t]) : loc ? (E.myPetite() ? VIL_TH : LOCAL_TH) : Object.keys(D.THEMES);
    const progTh = [].concat((p.prog || []).filter(m => m.status !== 'retiree').map(m => m.th), st.oppX ? (st.oppX.prog || []).map(m => m.th) : []).filter(t => allowed.includes(t) && !st.used.includes('th' + t));
    const sal = Object.entries(s.national.salience).filter(([t]) => allowed.includes(t)).sort((a, b) => b[1] - a[1]).map(([t]) => t).filter(t => !st.used.includes('th' + t));
    const fresh = (progTh.length && R() < 0.7 ? pick(progTh) : sal[0]) || pick(allowed); st.used.push('th' + fresh); return fresh; };
  function oppSpeech(st) {
    const x = st.oppX; const t = TH_PICK(st); const tl = t === 'institutions' && !isLocal() ? 'les institutions' : TH_SUR[t] || D.THEMES[t].l.toLowerCase(); const host = st.dctx.host; const vil = E.myPetite() && isLocal();
    const q = E.fresh('oq', ['Quelle est votre priorité pour ' + tl + ' ?', 'Concrètement, sur ' + tl + ', que changez-vous la première année ?', 'Beaucoup d’habitants nous parlent ' + deArt(tl) + '. Que leur répondez-vous ?', 'Sur ' + tl + ', qu’est-ce qui vous distingue de votre adversaire ?', 'Votre premier engagement sur ' + tl + ' ?']);
    const S1 = []; const line = () => x && typeof DP !== 'undefined' ? DP.oppLine(x, t, vil) : E.fresh('gen', ['Je crois à des solutions simples et concrètes.', 'Les habitants méritent mieux que ce qu’on leur propose.', 'Il faut du courage pour dire la vérité.']);
    S1.push({ k: 'claim', t: line() });
    const pr = x && (x.prog || []).find(z => z.th === t); const weakFin = pr && ['aucun', 'dette', 'croissance'].includes(pr.fin);
    const r = R(); const tr = (x && x.traits) || {}; const loc0 = ['mun', 'dep', 'reg', 'sen'].includes(elTypeNow()) || (!elTypeNow() && isLocal());
    if ((tr.scrupules ?? 50) < 50 && r < 0.45) S1.push({ k: 'bluff', t: typeof TB !== 'undefined' ? E.fresh('bluff' + (loc0 ? 'l' : 'n'), TB.BLUFF[loc0 ? 'local' : 'national']) : E.fresh('bluff', ['Sous ma responsabilité, la délinquance a baissé de 40 %.', 'Ma mesure ne coûte rien, elle est autofinancée.', 'Tous les experts sont d’accord avec moi.', 'Le chômage a doublé ici en cinq ans.', 'Neuf habitants sur dix soutiennent mon projet.', 'Mon adversaire a voté contre toutes les baisses d’impôts.']) });
    else if (pr) S1.push(weakFin ? { k: 'weak', t: 'Pour « ' + pr.label + ' », le financement viendra ' + (pr.fin === 'dette' ? 'de l’emprunt, comme partout.' : pr.fin === 'aucun' ? 'tout seul : ça ne coûte presque rien.' : 'de la croissance que ça va créer.'), pr } : { k: 'strong', t: '« ' + pr.label + ' » : c’est chiffré, c’est financé, c’est prêt.' });
    else S1.push({ k: 'claim', t: line() });
    if (R() < 0.55 + ((tr.rancune ?? 50) - 50) / 200) { const a = attack(st); S1.push({ k: 'attack', t: a.text.replace(/^[^«]*« /, '').replace(/ »$/, ''), atk: a }); }
    S1.push({ k: 'claim', t: line() });
    return { theme: t, q, host, sents: S1 };
  }
  const CUT = { bluff: [4.5, 'C’est faux, et vous le savez. Les chiffres officiels disent l’inverse.'], weak: [3, 'Avec quel argent ? Vous ne répondez jamais à cette question.'], attack: [1.5, 'Je ne vous laisserai pas dire ça. C’est faux.'], claim: [-1.5, 'Permettez-moi…'], strong: [-3, 'Ce n’est pas sérieux !'] };
  function segFrom(d, mv) { const o = {}; SEGS.forEach(g => o[g] = d * (MOVES[mv] || MOVES.fond).seg[g]); return o; }
  function applyLive(st, d, mv, tens) {
    const seg = segFrom(d, mv); SEGS.forEach(g => st.seg[g] = clamp(st.seg[g] + seg[g], -40, 40));
    let bd = clamp(SEGS.reduce((a, g) => a + st.aud[g] * seg[g], 0), -6, 6); if ((st.bar < 32 && bd < 0) || (st.bar > 68 && bd > 0)) bd *= 0.6;
    st.bar = clamp(st.bar + bd, 5, 95); st.tension = clamp(st.tension + (tens || 0), 0, 100); return { segD: seg, barD: bd };
  }
  function cut(st, sent) {
    st.cuts++; const c = CUT[sent.k] || CUT.claim; let d = c[0] + skill('couper') * 2 + E.gauss() * 0.6; let line = c[1];
    if (st.cuts > 2) { d -= 2; line += ' (Le modérateur : « Laissez-le terminer, s’il vous plaît. »)'; }
    if (st.tension > 75 && R() < 0.3) { d = -3; line = 'Vous haussez le ton : le dérapage est filmé.'; }
    if (sent.k === 'attack') st.pendingAtk = null; if (sent.k === 'bluff') st.fact = Math.max(0, st.fact);
    st.talk.me += 6; const r = applyLive(st, d, 'couper', 9); st.feed.push({ me: true, t: line }); return Object.assign(r, { line, d });
  }
  function smile(st, sent) { const d = { attack: 1.4, bluff: 0.6, weak: 0.8, claim: 0.2, strong: -0.6 }[sent.k] || 0; const r = applyLive(st, d, 'ecouter', -2); if (sent.k === 'attack') st.pendingAtk = null; return Object.assign(r, { line: 'Vous souriez, impassible. La caméra vous cadre.', d }); }
  function note(st, sent) { st.notes.push(sent); if (sent.k === 'attack') st.pendingAtk = null; return { line: 'Vous notez sa phrase. Vous y reviendrez.' }; }
  function heard(st, sent) { const d0 = { claim: -0.6, strong: -1.6, weak: 0.4, bluff: -1.2, attack: -1.2 }[sent.k] || -0.5; const d = d0 < 0 ? d0 * (E.DF ? E.DF().opp : 1) : d0; st.talk.opp += 8; if (sent.k === 'attack') st.pendingAtk = sent; const r = applyLive(st, d * (0.7 + ((st.oppX && st.oppX.noto) || 30) / 100), 'fond', sent.k === 'attack' ? 4 : 0); return r; }
  function myQuestion(st) {
    const q = question(st); q.who = st.dctx.host; q.kind = 'me';
    st.notes.splice(0, 2).forEach(n => q.opts.unshift({ posture: 'Revenir sur sa phrase', texte: 'Avant de répondre : tout à l’heure, mon adversaire a dit « ' + n.t.slice(0, 90) + (n.t.length > 90 ? '…' : '') + ' ». ' + ({ bluff: 'C’est faux, et je vous mets au défi de le prouver.', weak: 'Vous n’avez toujours pas dit qui paiera.', attack: 'C’est faux, et vous le savez.', claim: 'Les habitants jugeront.', strong: 'Admettons. Mais rien sur le reste.' }[n.k] || ''), q: { bluff: 12, weak: 10, attack: 8, claim: 3, strong: -2 }[n.k] || 2, move: n.k === 'attack' ? 'attaque' : 'chiffres', fromNote: true }));
    if (st.pendingAtk) { q.opts.unshift({ posture: 'Répondre à son attaque', texte: 'Avant de répondre, un mot sur ce qu’a dit mon adversaire : c’est faux, et c’est indigne de ce débat.', q: 6, move: 'attaque', answersAtk: true }); }
    q.opts = q.opts.slice(0, 6); return q;
  }
  function interruptChance(st) { const tr = (st.oppX && st.oppX.traits) || {}; return clamp(0.18 + ((tr.rancune ?? 50) - 50) / 250 + (st.tension - 40) / 300, 0.08, 0.45); }
  const INTR = [{ l: '« Je n’ai pas terminé, laissez-moi finir ! »', d: 1.6, mv: 'couper', tens: 6 }, { l: 'Le laisser dire, puis : « Comme je le disais… »', d: 1, mv: 'ecouter', tens: -3 }, { l: '« Je vous gêne, visiblement. »', d: null, mv: 'punch', tens: 3 }];
  function interrupted(st, k) { const o = INTR[k]; let d = o ? (o.d == null ? E.gauss() * 2.2 + 1 : o.d + E.gauss() * 0.5) : -2.2; if (o && k === 0 && st.tension > 72 && R() < 0.35) d = -2.5; const r = applyLive(st, d, o ? o.mv : 'esquive', o ? o.tens : 2); return Object.assign(r, { line: o ? o.l : 'Vous vous laissez couper la parole.' }); }
  function myAnswer(st, beat, o) { if (o.answersAtk) st.pendingAtk = null; const out = resolve(st, beat, o); st.talk.me += 20; return out; }
  function endOppBlock(st) { if (st.pendingAtk && !st.blocks.slice(st.bi).includes('me')) { applyLive(st, -2, 'fond', 0); st.pendingAtk = null; } }
  const JABS = [
    ['Vous n’avez jamais rien géré !', 'J’ai géré des budgets, des équipes et des dossiers concrets. Je vous les détaille quand vous voulez.', 'Et vous, ce que vous avez géré, les habitants l’ont payé.', 'C’est vrai : je n’ai pas encore eu le temps de faire autant d’erreurs que vous.'],
    ['Votre programme, c’est du vent.', 'Chaque mesure est chiffrée et financée. Le document est en ligne, lisez-le.', 'Le vôtre n’a pas une ligne de financement. Qui fait du vent ?', 'Du vent ? Alors il souffle dans le bon sens.'],
    ['Vous changez d’avis comme de chemise.', 'Je n’ai jamais varié sur l’essentiel : je peux vous citer mes positions depuis le début.', 'Vous, vous avez changé de parti deux fois. Parlons-en.', 'Moi au moins, je change de chemise.'],
    ['Personne ne sait qui vous finance.', 'Mon compte de campagne est public et certifié. Tout est transparent.', 'Et vous, ces dîners avec les promoteurs, on en parle ?', 'Ma grand-mère et trois militants. Je vous donne leurs noms ?'],
    ['Vous êtes parachuté·e, vous ne connaissez rien ici.', 'J’habite ici, je travaille ici, mes enfants vont à l’école ici.', 'Vous, on ne vous voit qu’en période électorale.', 'Je connais au moins le nom des rues. Vous les avez appris pour la campagne ?'],
    ['Vous n’étiez même pas là au dernier conseil.', 'J’étais excusé·e, et j’ai voté par procuration, comme le règlement le permet.', 'Vous étiez là, vous. Pour voter quoi, déjà ?', 'J’ai lu le compte rendu : je n’ai rien raté.'],
    ['Vos amis ont tout raté pendant des années.', 'Je ne suis comptable que de mes propres engagements, et je les tiens.', 'Les vôtres sont au pouvoir depuis six ans. Le bilan, c’est le vôtre.', 'Mes amis vous saluent.'],
    ['Vous faites des promesses que vous ne tiendrez pas.', 'J’ai pris trois engagements, avec un calendrier. Jugez-moi dessus.', 'Les promesses non tenues, c’est votre spécialité. On fait la liste ?', 'Promis, je ne promettrai plus rien.']
  ];
  if (typeof TB !== 'undefined') TB.JABS.forEach(j => JABS.push(j));
  function clashJab(st) {
    const nm = st.opp ? st.opp.name : 'Votre adversaire'; const j = JABS[(st.jabI = ((st.jabI == null ? Math.floor(R() * JABS.length) : st.jabI + 3) % JABS.length))];
    return { who: nm, jab: j[0], opts: [{ l: '« ' + j[1] + ' »', tag: 'Réfuter', d: 1.4 + skill('fond'), mv: 'nuance', tens: -2 }, { l: '« ' + j[2] + ' »', tag: 'Contre-attaquer', d: 1 + E.gauss() * 1.2, mv: 'attaque', tens: 6 }, { l: '« ' + j[3] + ' »', tag: 'Ironie', d: E.gauss() * 2.4 + 0.6, mv: 'punch', tens: 2 }] };
  }
  function clashAnswer(st, o) { const r = applyLive(st, o ? o.d : -2, o ? o.mv : 'esquive', o ? o.tens : 3); if (o && o.mv === 'punch' && r.barD > 1.5) st.punches.push(o.l); return r; }
  /* ---- duels entre joueurs ---- */
  function duelBeats(n) {
    const th = Object.entries(S().national.salience).sort((a, b) => b[1] - a[1]).map(([t]) => t); const all = Object.keys(D.THEMES); const L = [];
    for (let i = 0; i < (n || 6); i++) { const t = th[i] || all[Math.floor(R() * all.length)]; const tl = D.THEMES[t].l.toLowerCase();
      L.push({ theme: t, text: pick(['Sur ' + tl + ', qu’est-ce qui vous distingue de votre adversaire ?', tl.charAt(0).toUpperCase() + tl.slice(1) + ' : que ferez-vous dès la première année ?', 'Les habitants nous écrivent beaucoup sur ' + tl + '. Votre réponse ?', 'Votre adversaire dit que vous n’avez rien proposé sur ' + tl + '. Que répondez-vous ?']),
        opts: [{ posture: 'Chiffres', texte: 'Ma proposition est chiffrée, financée, avec un calendrier précis.', q: 6, move: 'chiffres' }, { posture: 'Émotion', texte: 'Derrière ce sujet, il y a des familles qui n’en peuvent plus. Je les ai rencontrées.', q: 5, move: 'emotion' }, { posture: 'Attaque', texte: 'Mon adversaire n’a jamais rien proposé de sérieux sur ce sujet.', q: 4, move: 'attaque' }, { posture: 'Nuance', texte: 'Il n’y a pas de solution miracle, mais il y a une méthode, et je l’ai.', q: 4, move: 'nuance' }, { posture: 'Punchline', texte: pick(['Les slogans ne soignent personne.', 'Moi, je préfère les actes aux tweets.', 'On ne gouverne pas avec des promesses.']), q: Math.round(R() * 14 - 4), move: 'punch' }, { posture: 'Esquive', texte: 'C’est un sujet complexe, qui mérite mieux qu’une polémique.', q: -5, move: 'esquive' }] }); }
    return L;
  }
  function duelScore(beats, ansA, ansB, stA, stB, seedStr) {
    let h = 0; for (const c of String(seedStr)) h = (h * 31 + c.charCodeAt(0)) >>> 0; const rr = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
    const sk = st => ((st.cred || 50) - 50) / 150 + (st.mt || 0) * 0.06 + ((st.sf ?? 50) - 50) / 200;
    let bar = 0, best = null; const per = []; const mA = [], mB = [];
    beats.forEach((b, i) => { const oa = b.opts[ansA[i]] || b.opts[0], ob = b.opts[ansB[i]] || b.opts[0];
      const rep = (arr, mv) => [1, 0.75, 0.5, 0.35][arr.slice(-3).filter(x => x === mv).length];
      const va = (oa.q / 10 + sk(stA) + (rr() - 0.5) * (oa.move === 'punch' ? 1.8 : 0.8)) * rep(mA, oa.move); const vb = (ob.q / 10 + sk(stB) + (rr() - 0.5) * (ob.move === 'punch' ? 1.8 : 0.8)) * rep(mB, ob.move);
      mA.push(oa.move); mB.push(ob.move); const d = (va - vb) * 3.5; bar += d; per.push(Math.round(d * 10) / 10); if (!best || d > best.d) best = { d, t: oa.texte }; });
    return { scoreA: Math.max(5, Math.min(95, 50 + bar)), per, bestA: best && best.t };
  }
  return { arenaStart, oppSpeech, cut, smile, note, heard, myQuestion, interruptChance, INTR, interrupted, myAnswer, endOppBlock, clashJab, clashAnswer, closing, duelBeats, duelScore, MOVES, SHORT, SEGS, start, next, predict, resolve, finish, moveOf };
})();
if (typeof window !== 'undefined') window.LV = LV;
