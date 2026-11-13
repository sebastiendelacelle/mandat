/* Mandat — QG de campagne : directeur·rice de campagne, boucle d'équipe, ripostes, attaques,
   éléments de langage, projet de campagne, cabinet de mandat. */
const HQ = (() => {
  const S = () => G.S, P = () => G.S.p;
  const R = () => E.rnd(), clamp = (v, a, b) => E.clamp(v, a, b), pick = a => E.pick(a), rint = (a, b) => E.rint(a, b);
  const nm = g => (g === 'F' ? pick(D.FIRST_F) : pick(D.FIRST_M)) + ' ' + pick(D.LAST);

  function hq() {
    const p = P();
    if (!p.hq) p.hq = { trust: 60, dis: 0, moral: 65, core: [], boucle: [], edl: {}, cab: [], alumni: [], atk: {}, flags: {}, used: {}, pend: [], seen: null, camp: null };
    const h = p.hq; ['core', 'boucle', 'cab', 'alumni', 'pend'].forEach(k => h[k] = h[k] || []); ['edl', 'atk', 'flags', 'used'].forEach(k => h[k] = h[k] || {});
    return h;
  }
  function el() { const p = P(); return p.cand ? S().elections.find(e => e.id === p.cand.el) : null; }
  function active() { const e = el(); if (!e || e.status === 'fini') return false; if (e.status === 't1' && e.races) { const r = e.races[P().cand.key]; if (r && (r.done || !(r.t2 || []).includes('PJ'))) return false; } return true; }
  function leads() { const p = P(); if (!p.cand) return false; if (p.cand.mode === 'colistier') return false; if (p.cand.mode === 'liste') return p.cand.listPos === 1; return true; }
  function dc() { return P().staff.find(x => x.role === 'dircamp') || null; }
  const petite = () => typeof E !== 'undefined' && E.myPetite && E.myPetite() && el() && el().type === 'mun';
  function needDC() { return active() && leads() && !dc() && !petite(); }

  /* ---------- équipe : couloirs ---------- */
  const LANES = { com: ['com', 'cm', 'plume'], terrain: ['terrain'], orga: ['mandataire', 'juriste'] };
  const CORE_L = { com: 'Bénévole com & réseaux', terrain: 'Coordination militante', orga: 'Logistique & réglementaire' };
  function ensureCore() { const h = hq(); ['com', 'terrain', 'orga'].forEach(l => { if (!h.core.find(c => c.lane === l)) { const g = R() < 0.5 ? 'F' : 'M'; h.core.push({ id: E.uid('co'), lane: l, g, name: nm(g), lbl: CORE_L[l], comp: rint(38, 62), loy: rint(60, 85) }); } }); }
  function member(lane) {
    const d = dc(); if (lane === 'dc') return d ? { name: d.name, lbl: 'Direction de campagne', comp: d.comp } : member('orga');
    const st = P().staff.find(x => LANES[lane].includes(x.role) && x.role !== 'dircamp'); if (st) return { name: st.name, lbl: D.STAFF_ROLES[st.role].l, comp: st.comp };
    const c = hq().core.find(x => x.lane === lane); if (c) return { name: c.name, lbl: c.lbl, comp: c.comp };
    return d ? { name: d.name, lbl: 'Direction de campagne', comp: d.comp } : { name: 'L’équipe', lbl: '', comp: 45 };
  }
  function members() { const L = []; const d = dc(); if (d) L.push({ name: d.name, lbl: 'Direction de campagne' }); P().staff.filter(x => x.role !== 'dircamp').forEach(x => L.push({ name: x.name, lbl: D.STAFF_ROLES[x.role].l })); hq().core.forEach(c => { if (!L.some(y => y.name === c.name)) L.push({ name: c.name, lbl: c.lbl }); }); return L; }
  const dcStyle = () => { const d = dc(); return d ? d.style || 'terrain' : null; };
  const dcK = () => { const d = dc(); if (!d) return 0; return (d.comp / 100) * (0.55 + hq().trust / 220); };

  /* ---------- boucle ---------- */
  function post(lane, text, dec) {
    const h = hq(); const m = member(lane);
    const msg = { id: E.uid('b'), date: S().date, lane, name: m.name, lbl: m.lbl, t: text, read: false };
    if (dec) { msg.dec = Object.assign({ exp: S().date, done: null }, dec); if (dc() && msg.dec.rec == null) msg.dec.rec = recOf(msg.dec.opts); }
    h.boucle.unshift(msg);
    if (h.boucle.length > 90) { const keep = h.boucle.slice(0, 70); h.boucle = keep.concat(h.boucle.slice(70).filter(x => x.dec && x.dec.done == null)); }
    return msg;
  }
  function me(text) { const h = hq(); h.boucle.unshift({ id: E.uid('b'), date: S().date, lane: 'me', name: P().name, me: true, t: text, read: true }); }
  function recOf(opts) { const d = dc(); if (!d) return null; const noise = 1.3 - d.comp / 90; const st = d.style; let best = -1, bv = -1e9;
    opts.forEach((o, i) => { if (o.v == null) return; const v = o.v + (o.tag && o.tag === st ? 0.6 : 0) + E.gauss() * noise; if (v > bv) { bv = v; best = i; } }); return best < 0 ? null : best; }
  const unread = () => hq().boucle.filter(m => !m.read && !m.me).length;
  const pending = () => hq().boucle.filter(m => m.dec && m.dec.done == null);
  function markRead() { hq().boucle.forEach(m => m.read = true); }

  /* ---------- effets communs ---------- */
  const IM = (seg, d) => E.addImage(seg, d), IMA = d => E.addImageAll(d);
  const motiv = d => { if (typeof TM !== 'undefined') { const t = TM.team(); t.motiv = clamp(t.motiv + d, 0, 100); } };
  const moral = d => { const h = hq(); h.moral = clamp(h.moral + d, 0, 100); };
  const camp = (k, d) => { const p = P(); if (p.camp) p.camp[k] = Math.max(0, (p.camp[k] || 0) + d); };
  function spendC(amt, label) { const p = P(); const c = p.cand && p.cand.compte; if (c) return E.spend(amt, label); if (p.cash < amt) return false; p.cash -= amt; return true; }
  const cashOk = amt => { const p = P(); const c = p.cand && p.cand.compte; return c ? c.recettes - c.depenses >= amt : p.cash >= amt; };
  function rivals() { return (S().rivals || []).map(id => S().pnj[id]).filter(x => x && x.alive && !x.human); }
  function targets() { return active() ? rivals() : []; }
  function topRival() { const es = S().est; const rv = rivals(); if (es && es.rows) { const r = es.rows.find(x => rv.some(y => y.id === x.id)); if (r) return S().pnj[r.id]; } return rv[0] || null; }
  function supporter() { return E.pnjList(x => x.known && x.rel >= 28 && ['maire', 'depute', 'notable', 'federal', 'baron', 'leader', 'section', 'cadre'].includes(x.role) && !(S().rivals || []).includes(x.id) && (P().party === 'NEW' || x.party === P().party || D.PARTIES[x.party].bloc === D.PARTIES[P().party].bloc)).sort((a, b) => b.rel - a.rel)[0] || null; }
  const short = x => x ? D.PARTIES[x.party].short : '';
  const wpick = (L, f) => { const t = L.reduce((a, x) => a + Math.max(0, f(x)), 0); let r = R() * t; for (const x of L) { r -= Math.max(0, f(x)); if (r <= 0) return x; } return L[L.length - 1]; };

  /* ---------- éléments de langage ---------- */
  const EDL_TXT = {
    securite: ['Sur la sécurité, trois engagements précis : des effectifs, des moyens, des résultats mesurés chaque année. Pas de slogans.', 'La sécurité, c’est la première des libertés. Je propose des mesures concrètes, chiffrées, et je rendrai des comptes.'],
    pouvoir_achat: ['Le pouvoir d’achat, ce sont des factures qui baissent pour de vrai : énergie, cantine, transports. Voilà ce que je propose, poste par poste.', 'Les familles n’ont pas besoin de promesses, elles ont besoin de fin de mois moins difficiles. Mes mesures sont financées.'],
    economie: ['L’emploi local, ce sont nos entreprises : simplifier, accompagner, recruter ici. Mon plan tient en trois mesures.', 'Je ne promets pas des emplois, je crée les conditions pour qu’ils existent ici, avec les entreprises du territoire.'],
    sante: ['Les déserts médicaux ne sont pas une fatalité : maisons de santé, internes accueillis, transport pour les rendez-vous. C’est chiffré.', 'Se soigner près de chez soi, c’est mon combat. J’ai un plan, un calendrier et un financement.'],
    ecologie: ['L’écologie que je défends, c’est celle qui fait baisser les factures et protège nos paysages. Sans punir ceux qui n’ont pas le choix.', 'Transition oui, mais avec les habitants : rénovation, transports, circuits courts. Trois chantiers concrets.'],
    logement: ['Se loger dignement près de son travail : je propose de remettre sur le marché les logements vacants et de construire mieux.', 'Le logement est la première dépense des ménages. Mes mesures agissent sur l’offre, pas sur les slogans.'],
    transports: ['Pour ceux qui n’ont pas le choix de la voiture, je propose des solutions concrètes : cars, covoiturage, horaires adaptés.', 'Les transports, c’est l’égalité des chances. Mon plan est chiffré, ligne par ligne.'],
    education: ['L’école, c’est la promesse républicaine : des classes moins chargées, des locaux dignes, du soutien pour chaque élève.', 'Investir dans l’éducation, c’est investir dans les vingt prochaines années. Voilà mes priorités.'],
    immigration: ['Fermeté sur les règles, dignité dans l’accueil, intégration par le travail et la langue : c’est ma ligne, sans démagogie.', 'Sur ce sujet, je refuse les caricatures. Les règles doivent être appliquées, et l’intégration réussie.'],
    agriculture: ['Nos agriculteurs veulent vivre de leur travail : des prix justes, de l’eau, moins de paperasse. Je porte ces trois combats.', 'Sans agriculteurs, pas de territoire. Je propose des mesures concrètes sur l’eau, les prix et la transmission.'],
    fiscalite: ['Pas d’impôt nouveau sans contrepartie claire. Chaque euro dépensé sera justifié devant vous.', 'Je préfère une fiscalité juste et lisible à des promesses intenables. Mon programme est équilibré.'],
    industrie: ['Réindustrialiser, c’est possible : foncier disponible, formation, commande publique locale. J’ai un plan.', 'L’industrie, ce sont des emplois qu’on ne délocalise pas quand on se bat pour eux. Je m’y engage.'],
    europe: ['L’Europe doit protéger : nos industries, nos agriculteurs, nos frontières. C’est l’Europe que je défends.', 'Ni naïveté ni repli : une Europe qui protège et qui rend des comptes.'],
    institutions: ['Je m’engage sur la transparence : agenda public, bilan annuel, et des comptes rendus à chaque habitant.', 'La politique a besoin de confiance. Je rendrai des comptes, chaque année, sur chaque engagement.'],
    societe: ['Sur ces sujets, je défends la liberté de chacun et le respect de tous. Sans caricature.', 'La société avance quand on se parle. Je défends une ligne de respect et d’apaisement.']
  };
  function edlOf(t) { const e = hq().edl[t]; if (!e) return null; const age = E.diffDays(e.date, S().date); const q = e.q - Math.max(0, age - 20) / 3; if (q < 20 || e.uses <= 0) return null; return { q, uses: e.uses, date: e.date }; }
  const edlBonus = t => { const e = t && edlOf(t); return e ? e.q / 220 : 0; };
  function edlUse(t) { const e = hq().edl[t]; if (e) e.uses--; }
  function edlOpt(t) { const e = edlOf(t); if (!e) return null; const L = EDL_TXT[t] || EDL_TXT.institutions; return { posture: 'Éléments de langage', texte: L[(hq().used['edl' + t] = ((hq().used['edl' + t] || 0) + 1)) % L.length], q: 3 + e.q / 14, move: 'chiffres', edl: t }; }
  function edlList() { return Object.keys(hq().edl).map(t => ({ t, e: edlOf(t) })).filter(x => x.e); }
  function edlSuggest() {
    const s = S(), p = P(); const sal = s.national.salience || {}; const o = {};
    Object.keys(D.THEMES).forEach(t => o[t] = (sal[t] || 0) * 3);
    (concerns() || []).forEach((c, i) => o[c.t] = (o[c.t] || 0) + c.w * 4 + (i < 2 ? 1 : 0));
    hq().boucle.filter(m => m.dec && m.dec.data && m.dec.data.theme && m.dec.tpl === 'riposte' && E.diffDays(m.date, s.date) < 60).forEach(m => o[m.dec.data.theme] = (o[m.dec.data.theme] || 0) + 1.5);
    (p.prog || []).filter(m => m.phare && m.status !== 'retiree').forEach(m => o[m.theme] = (o[m.theme] || 0) + 1);
    return Object.entries(o).sort((a, b) => b[1] - a[1]).map(([t, v]) => ({ t, v, why: (sal[t] || 0) > 0.3 ? 'sujet chaud' : (concerns() || []).some(c => c.t === t) ? 'préoccupation locale' : (p.prog || []).some(m => m.phare && m.theme === t) ? 'votre mesure phare' : '' }));
  }
  function edlHours() { return P().staff.some(x => ['plume', 'com'].includes(x.role)) ? 1 : 2; }
  function prepEdl(t) {
    const p = P(); const h = edlHours(); if (p.hours < h) return { ok: false, msg: 'Il faut ' + h + ' h.' };
    p.hours -= h; const c = member('com').comp; const exp = ((p.expertise || {})[t] || 0);
    const has = (p.prog || []).some(m => m.theme === t && m.status !== 'retiree');
    const q = clamp(32 + c / 2.4 + exp * 7 + (has ? 10 : 0) + (dcStyle() === 'com' ? 6 : 0) + E.gauss() * 6, 25, 95);
    const ed = hq().edl; const ks = Object.keys(ed); if (ks.length >= 5 && !ed[t]) { const old = ks.sort((a, b) => ed[a].date < ed[b].date ? -1 : 1)[0]; delete ed[old]; }
    ed[t] = { q: Math.round(q), date: S().date, uses: 3 };
    const m = member('com'); post('com', 'Fiche « ' + D.THEMES[t].l + ' » prête 📎 ' + E.fresh('edlp', ['Trois messages, deux chiffres, une formule. Apprends-la par cœur.', 'Je l’ai partagée dans la boucle. Tout le monde parle pareil à partir de maintenant.', 'Version courte pour les plateaux, version longue pour la presse écrite.', 'Relue par toute l’équipe. On ne se fera pas surprendre.']));
    return { ok: true, msg: m.name + ' prépare vos éléments de langage sur ' + E.thArt(t) + ' (qualité ' + Math.round(q) + '/100). Ils servent en débat, en interview et pour les ripostes.' };
  }

  /* ---------- directeur·rice de campagne ---------- */
  const STYLE = { terrain: ['Homme ou femme de terrain', 'Militants plus motivés, porte-à-porte mieux ciblé'], com: ['Communicant·e', 'Ripostes et éléments de langage plus efficaces'], strat: ['Stratège', 'Meilleurs conseils, attaques mieux ajustées'], orga: ['Organisateur·rice', 'Aucune erreur administrative, une heure gagnée par tour'] };
  function dcCandidates() {
    const s = S(), p = P(); const L = []; const rv = new Set(s.rivals || []);
    const cur = dc(); if (cur) L.push({ src: 'equipe', name: cur.name, g: cur.g, comp: cur.comp, loy: cur.loy, amb: cur.amb, style: cur.style || 'terrain', sal: cur.sal, keep: cur.id, trust: Math.max(55, hq().trust) });
    E.pnjList(x => x.known && x.rel >= 30 && !rv.has(x.id) && !['journaliste', 'candidat', 'leader'].includes(x.role) && (p.party === 'NEW' || x.party === p.party || x.party === 'DIV')).sort((a, b) => b.rel - a.rel).slice(0, 2).forEach(x => {
      const t = x.traits || {}; L.push({ src: 'proche', pnj: x.id, name: x.name, g: x.g, comp: clamp(Math.round(32 + (x.noto || 20) / 2 + (t.charisme || 50) / 6 + E.gauss() * 6), 30, 85), loy: clamp(Math.round(55 + x.rel / 3), 40, 95), amb: t.ambition || 50, style: (t.charisme || 50) > 60 ? 'com' : (t.ambition || 50) > 65 ? 'strat' : 'terrain', sal: 0, trust: 72, note: (x.mandat || 'Proche') + ' · relation ' + Math.round(x.rel) + ' : connaît le territoire et vos réseaux' });
    });
    hq().alumni.filter(a => !p.staff.some(y => y.name === a.name)).sort((a, b) => b.loy - a.loy).slice(0, 1).forEach(a => L.push({ src: 'ancien', name: a.name, g: a.g, comp: clamp(a.comp + 6, 30, 90), loy: clamp(a.loy + 5, 40, 98), amb: rint(30, 60), style: a.lane === 'com' ? 'com' : a.lane === 'orga' ? 'orga' : 'terrain', sal: 0, trust: 70, note: 'Ancien·ne de votre campagne ' + (a.year || '') + ' : fidèle, connaît la maison' }));
    p.staff.filter(x => x.role !== 'dircamp').sort((a, b) => b.comp - a.comp).slice(0, 1).forEach(x => L.push({ src: 'promo', keep: x.id, name: x.name, g: x.g, comp: x.comp, loy: x.loy, amb: x.amb, style: x.role === 'com' || x.role === 'cm' || x.role === 'plume' ? 'com' : x.role === 'mandataire' || x.role === 'juriste' ? 'orga' : 'terrain', sal: x.sal, trust: 62, note: 'Promu·e depuis votre équipe (' + D.STAFF_ROLES[x.role].l.toLowerCase() + ') : son poste actuel restera vacant' }));
    if (p.party !== 'NEW') { const g = R() < 0.5 ? 'F' : 'M'; const comp = rint(68, 90); L.push({ src: 'parti', name: nm(g), g, comp, loy: rint(42, 60), amb: rint(50, 85), style: pick(['strat', 'orga']), sal: Math.round((1500 + comp * 12) / 50) * 50, trust: 48, note: 'Professionnel·le proposé·e par la fédération ' + D.PARTIES[p.party].short + ' : compétent·e, mais rend aussi compte au parti' }); }
    const g2 = R() < 0.5 ? 'F' : 'M'; L.push({ src: 'militant', name: nm(g2), g: g2, comp: rint(42, 60), loy: rint(70, 90), amb: rint(20, 50), style: 'terrain', sal: 0, trust: 66, note: 'Militant·e aguerri·e, bénévole : dévoué·e, moins expérimenté·e' });
    return L;
  }
  function setDC(c) {
    const p = P(), h = hq();
    if (c.keep) { const x = p.staff.find(y => y.id === c.keep); if (x) { const old = dc(); if (old && old.id !== x.id) p.staff = p.staff.filter(y => y.id !== old.id); x.role = 'dircamp'; x.style = c.style; if (c.src === 'promo') x.loy = clamp(x.loy + 10, 0, 100); } }
    else { const old = dc(); if (old) p.staff = p.staff.filter(y => y.id !== old.id); p.staff.push({ id: E.uid('st'), role: 'dircamp', g: c.g, name: c.name, comp: c.comp, loy: c.loy, amb: c.amb, disc: rint(40, 85), sal: c.sal, date: S().date, mission: 'veille', style: c.style, src: c.src, pnj: c.pnj || null }); }
    h.trust = c.trust; h.dis = 0; ensureCore(); initListe();
    if (c.pnj && S().pnj[c.pnj]) S().pnj[c.pnj].rel += 6;
    if (c.src === 'parti') { p.fedSup = clamp((p.fedSup || 0) + 4, 0, 100); }
    E.log('Direction de campagne : ' + c.name + ' (' + STYLE[c.style][0].toLowerCase() + ').', 'good');
    post('dc', E.fresh('dcin', ['Bon. On a ' + Math.max(1, Math.round(E.daysLeft())) + ' jours. Première règle : on ne découvre rien dans la presse, tout passe par cette boucle.', 'Merci pour la confiance. Je veux un point chaque semaine, et des décisions rapides. On y va.', 'Première chose : programme, équipe, terrain. Dans cet ordre. Je vous ai mis en place une boucle pour tout le monde.']));
    return c.name + ' dirige votre campagne.';
  }

  /* ---------- modèles de messages ---------- */
  const ORGAS = [['La FDSEA', 'RUR', 'agriculture', 'un débat sur les questions agricoles, dans une exploitation'], ['La CPME', 'CAD', 'economie', 'un petit-déjeuner débat sur l’emploi local'], ['Le collectif des parents d’élèves', 'PERI', 'education', 'une rencontre sur la cantine et les transports scolaires'], ['L’association des retraités', 'RET', 'sante', 'un débat sur l’accès aux soins'], ['Le conseil citoyen des quartiers', 'POP', 'securite', 'une réunion publique sur la sécurité et le logement'], ['Le collectif climat', 'JUD', 'ecologie', 'un grand oral sur la transition'], ['L’Union des commerçants', 'CAD', 'economie', 'un débat sur le centre-ville, le stationnement et les travaux'], ['La CCI', 'CAD', 'economie', 'une table ronde sur les zones d’activité'], ['L’union locale CGT', 'POP', 'industrie', 'une rencontre avec les salariés d’une usine menacée'], ['La fédération des chasseurs', 'RUR', 'agriculture', 'une soirée sur la ruralité et la cohabitation'], ['Le club de foot', 'PERI', 'education', 'un échange sur les équipements sportifs'], ['L’association des locataires', 'POP', 'logement', 'une visite d’un immeuble dégradé'], ['Le collectif des riverains de la nationale', 'PERI', 'transports', 'une réunion sur le bruit et la sécurité routière'], ['Les médecins du secteur', 'RET', 'sante', 'un débat sur les déserts médicaux'], ['Le conseil des jeunes', 'JUD', 'education', 'un débat sans langue de bois'], ['L’association des anciens combattants', 'RET', 'institutions', 'une rencontre sur le devoir de mémoire et les monuments']];
  const VPB = [['M. Chabert, au bout du chemin des Granges, se plaint des nids-de-poule : « J’ai écrit trois fois à la mairie, jamais de réponse. »', 'refaire les chemins communaux'], ['Une maman demande ce qu’on compte faire pour l’école : il ne reste que 14 élèves et on parle de fermer une classe.', 'défendre l’école du village'], ['Les agriculteurs du haut s’inquiètent du nouveau PLU : des terres agricoles pourraient devenir constructibles.', 'protéger les terres agricoles'], ['Les gens du lotissement disent qu’il n’y a plus de bus pour le collège le mercredi.', 'obtenir une navette avec l’intercommunalité'], ['La boulangère prend sa retraite et personne ne reprend. Plus de commerce au village.', 'sauver le dernier commerce'], ['Des habitants se plaignent des camions qui traversent le village à toute vitesse.', 'sécuriser la traversée du village'], ['Une habitante âgée vit seule et ne peut plus conduire. Elle demande qui l’emmènera chez le médecin.', 'organiser un transport solidaire']];
  const QUEST = [['Le collectif anti-éolien', 'êtes-vous pour ou contre le projet de parc éolien sur les hauteurs ?', 'pour le projet', 'contre le projet', ['JUD', 'RUR'], ['RUR', 'JUD']], ['L’association des parents', 'êtes-vous favorable à la cantine 100 % bio et locale, même si elle coûte plus cher ?', 'oui', 'non, priorité au prix', ['JUD', 'POP'], ['POP', 'JUD']], ['La fédération des chasseurs', 'soutenez-vous la chasse le dimanche ?', 'oui', 'non', ['RUR', 'JUD'], ['JUD', 'RUR']], ['L’Union des commerçants', 'êtes-vous pour la gratuité du stationnement en centre-ville ?', 'oui', 'non, priorité aux mobilités douces', ['CAD', 'JUD'], ['JUD', 'CAD']], ['Un collectif de riverains', 'acceptez-vous l’installation d’une antenne-relais près de l’école ?', 'oui, la couverture est indispensable', 'non', ['CAD', 'PERI'], ['PERI', 'CAD']], ['L’association de défense des animaux', 'interdirez-vous les cirques avec animaux sur la commune ?', 'oui', 'non', ['JUD', 'RUR'], ['RUR', 'JUD']], ['Le syndicat des policiers municipaux', 'armerez-vous la police municipale ?', 'oui', 'non', ['RET', 'JUD'], ['JUD', 'RET']]];
  const BOULETTES = ['a laissé « 1re circonscription de l’Ain » sur son tract : le modèle n’a pas été modifié 😂', 'illustre ses affiches avec un paysage… de Savoie 🏔️', 'cite un chiffre du chômage local qui date de 2012', 'a publié son programme avec le nom d’une autre commune dedans', 'confond les compétences de la mairie et du département dans sa profession de foi'];
  const T = {
    tribune: { cd: 9999, w: c => c.lead && c.dl > 4 && !c.t2 && !c.f('tribune') ? 1.3 : 0, mk: c => { const n = rint(6, 16); return { lane: 'terrain', t: 'Bonne nouvelle : ' + n + ' maires du secteur sont prêts à signer une tribune de soutien. Petite subtilité : ils demandent à n’apparaître QUE comme maires, pas avec leurs titres à l’interco.', data: { n }, opts: [{ l: 'Respecter leur demande : liste alphabétique des communes', h: 1, v: 2, k: 'ok', tag: 'orga' }, { l: 'Mettre tous les titres, ça pèse plus lourd', h: 1, v: 0.8, k: 'titres' }, { l: 'Pas de tribune, on n’a pas le temps', v: -1, k: 'non' }], def: 2 }; },
      res(k, d) { const p = P(); hq().flags.tribune = true;
        if (k === 'non') return { lane: 'terrain', t: 'Dommage 😕 Ils l’auraient fait de bon cœur.' };
        if (k === 'titres' && R() < 0.4) { IM('RUR', 0.6); E.article('dauph', 'Deux maires retirent leur signature d’une tribune pour ' + p.name, -0.15, 'pj'); return { lane: 'orga', t: 'Message de la secrétaire de mairie : « on avait demandé expressément à n’apparaître QUE comme maires ». Deux d’entre eux se retirent, vexés. Oupsss.' }; }
        const k2 = k === 'titres' ? 1.3 : 1; IM('RUR', 2.2 * k2); IM('RET', 1.4 * k2); E.addNoto(scopeKey(), 2); p.mom += 0.02 * k2; E.article('dauph', d.n + ' maires du secteur appellent à voter ' + p.name, 0.25, 'pj');
        if (R() < 0.3) hq().pend.push({ tpl: 'doublon', at: S().date });
        return { lane: 'orga', t: 'C’est parti à la presse 🚀 Encart réservé dans Le Dauphinois, et la version numérique suit.' }; } },
    doublon: { cd: 9999, w: () => 0, mk: c => { const r = c.rival; return { lane: 'orga', t: 'Heuuu… deux de nos signataires apparaissent AUSSI dans les soutiens de ' + (r ? r.name : 'l’adversaire') + ' sur X 😱 Là ça va pas le faire.', opts: [{ l: 'Les appeler pour clarifier (1 h)', h: 1, v: 2, k: 'appel', tag: 'strat' }, { l: 'Les retirer discrètement de notre liste', v: 1, k: 'retire', tag: 'orga' }, { l: 'Laisser courir', v: -1, k: 'rien' }], def: 2 }; },
      res(k) { if (k === 'appel') { if (R() < 0.6) return { lane: 'dc', t: 'Clarifié : ils ont signé chez l’autre sans lire. Ils publient un message pour dire qu’ils nous soutiennent, nous. Propre.' }; IM('RUR', -0.5); return { lane: 'dc', t: 'Un des deux assume de soutenir les deux camps « par amitié ». On fera avec.' }; }
        if (k === 'retire') return { lane: 'orga', t: 'Retirés. Personne ne l’a relevé.' };
        if (R() < 0.6) { IMA(-1.2); E.article('dauph', 'Les soutiens à géométrie variable ' + E.de(P().name), -0.3, 'pj'); return { lane: 'com', t: 'Le Dauphinois a repéré le doublon : « soutiens à géométrie variable ». Pas glorieux.' }; } return { lane: 'com', t: 'Personne n’a rien vu. On a eu de la chance.' }; } },
    invit: { cd: 18, w: c => c.lead && c.dl > 1 && c.dl < 60 ? 1 : 0, mk: c => { const o = pick(ORGAS); return { lane: 'terrain', t: o[0] + ' nous invite à ' + o[3] + ' avec tous les candidats, demain 11 h 30. Entre nous, c’est un peu le traquenard 😅 (mais il y a un buffet à la fin).', data: { o }, opts: [{ l: 'J’y vais moi-même (3 h)', h: 3, v: 1.8, k: 'go', tag: 'terrain' }, { l: 'J’envoie l’équipe me représenter', v: 0.9, k: 'equipe', tag: 'orga' }, { l: 'On décline poliment', v: -0.6, k: 'non' }], def: 2 }; },
      res(k, d) { const [org, seg, th] = d.o; const p = P();
        if (k === 'go') { const ok = R() < 0.5 + edlBonus(th) + ((p.image[seg] || 0) > 0 ? 0.1 : -0.1); E.addNoto(scopeKey(), 1.5); if (ok) { IM(seg, 3); return { lane: 'terrain', t: 'Tu as été très bien. Ils ont apprécié que tu viennes en personne, et le buffet était à la hauteur 😁' }; } IM(seg, -1.2); return { lane: 'terrain', t: 'Accueil glacial, comme prévu. Au moins tu étais là : les autres ne pourront pas dire que tu as fui.' }; }
        if (k === 'equipe') { IM(seg, 0.8); return { lane: 'com', t: 'Post publié : « À l’invitation de ' + org.toLowerCase().replace(/^la |^le |^l’/, m => m) + ', j’étais représenté·e par mon équipe pour écouter leurs revendications. » La structure a fait une story, les autres candidats rien.' }; }
        IM(seg, -1.2); const r = topRival(); if (r) r.mom += 0.01; return { lane: 'terrain', t: 'Noté. ' + (r ? r.name + ' y sera, lui·elle.' : 'Les autres y seront.') }; } },
    affiches: { cd: 25, w: c => c.lead && c.dl < 35 ? 1 : 0, mk: c => { const r = c.rival; return { lane: 'terrain', t: (r ? short(r) : 'L’adversaire') + ' a collé partout depuis ce matin. Et chez nous : affiches arrachées sur le panneau du bas, plus tous les affichages libres que j’ai croisés.', opts: [{ l: 'Tournée de recollage ce soir avec les militants', v: 1.8, k: 'recolle', tag: 'terrain' }, { l: 'Faire constater et le signaler en mairie (1 h)', h: 1, v: 1, k: 'constat', tag: 'orga' }, { l: 'Publier les photos : « ils arrachent, nous on convainc »', v: 0.6, k: 'photos', tag: 'com' }, { l: 'Laisser tomber', v: -1, k: 'rien' }], def: 3 }; },
      res(k) { if (k === 'recolle') { motiv(-3); camp('terrain', 5); IM('PERI', 1); return { lane: 'terrain', t: 'Petit tour dans la commune pour vérifier les affiches : jusqu’ici RAS 👍' }; }
        if (k === 'constat') { P().cred = clamp(P().cred + 1, 0, 100); return { lane: 'orga', t: 'Constat fait, photos datées, courrier en mairie. Si ça recommence, on a de quoi.' }; }
        if (k === 'photos') { if (R() < 0.5) { IM('JUD', 1.5); IM('POP', 1); return { lane: 'com', t: 'Gros partage, beaucoup de soutiens dans les commentaires 💪' }; } IMA(-0.6); return { lane: 'com', t: 'Mitigé : certains nous trouvent pleurnichards. On n’insiste pas.' }; }
        camp('terrain', -3); return { lane: 'terrain', t: 'Ok… mais du coup on n’est plus visibles nulle part.' }; } },
    boulette: { cd: 30, w: c => c.rival && c.dl < 50 ? 0.8 : 0, mk: c => ({ lane: 'com', t: 'Vous avez vu ? ' + c.rival.name + ' ' + pick(BOULETTES), data: { x: c.rival.id }, opts: [{ l: 'On le tacle : « Ne vous trompez pas dimanche… »', v: 1.4, k: 'tacle', tag: 'com' }, { l: 'On le lui fait savoir en privé, élégamment', v: 0.4, k: 'prive' }, { l: 'On reste au-dessus de ça', v: 0.3, k: 'rien', tag: 'strat' }], def: 2 }),
      res(k, d) { const x = S().pnj[d.x]; if (!x) return { lane: 'com', t: 'Ok.' };
        if (k === 'tacle') { if (R() < 0.72) { IM('JUD', 2); IM('CAD', 1); x.mom -= 0.03; E.addNoto(scopeKey(), 1); E.post(P().name, '@' + E.slug(P().name), 'Ne vous trompez pas dimanche : ici, c’est notre territoire, et on le connaît par cœur.', true, rint(150, 900)); return { lane: 'com', t: 'Ils viennent de corriger le visuel 😂 Ils ont trouvé tout seuls 🙏' }; } IM('RET', -1.5); return { lane: 'com', t: 'Ça a pris, mais une partie des commentaires nous trouvent mesquins. On en reste là.' }; }
        if (k === 'prive') { x.rel += 3; return { lane: 'com', t: 'Message envoyé à son équipe. Pas de réponse, mais ils ont corrigé.' }; }
        return { lane: 'dc', t: 'Bien vu. On garde nos munitions pour le fond.' }; } },
    sms: { cd: 40, w: c => c.rival && c.dl < 25 ? 0.7 : 0, mk: c => ({ lane: 'com', t: 'Après les SMS en masse, l’équipe ' + E.de(c.rival.name) + ' a sorti le drone 🚁 Ça inonde le territoire.', data: { x: c.rival.id }, opts: [{ l: 'Dénoncer le démarchage non sollicité', v: 0.8, k: 'denonce', tag: 'orga' }, { l: 'Lancer notre campagne numérique (1 500 €)', cost: 1500, v: 1.2, k: 'num', tag: 'com' }, { l: 'Laisser faire', v: 0, k: 'rien' }], def: 2 }),
      res(k, d) { const x = S().pnj[d.x]; if (k === 'denonce') { if (R() < 0.65) { P().cred = clamp(P().cred + 1.5, 0, 100); if (x) x.img -= 2; return { lane: 'com', t: 'La CNIL a été saisie par des habitants, l’info circule. Bien joué.' }; } IMA(-0.5); return { lane: 'com', t: 'On passe un peu pour des jaloux. Bof.' }; }
        if (k === 'num') { if (!spendC(1500, 'Campagne numérique')) return { lane: 'orga', t: 'Plus assez sur le compte de campagne. On oublie.' }; camp('num', 12); IM('JUD', 1.5); return { lane: 'com', t: 'Ciblage lancé sur les 25–45 ans. Premiers retours encourageants.' }; }
        if (x) x.mom += 0.01; return { lane: 'com', t: 'Ok. Ça marche un peu pour eux, quand même.' }; } },
    video: { cd: 30, w: c => c.lead && c.sup && c.dl < 40 ? 0.9 : 0, mk: c => ({ lane: 'com', t: 'On pourrait demander une vidéo de soutien à ' + c.sup.name + ' (' + (c.sup.mandat || 'soutien') + '). Je fais le montage avec le même bandeau : on garde la signature graphique.', data: { x: c.sup.id }, opts: [{ l: 'Je l’appelle (1 h)', h: 1, v: 1.8, k: 'appel', tag: 'com' }, { l: 'Pas maintenant', v: 0, k: 'non' }], def: 1 }),
      res(k, d) { const x = S().pnj[d.x]; if (k !== 'appel' || !x) return { lane: 'com', t: 'Ok, on garde l’idée sous le coude.' };
        if (R() < 0.45 + x.rel / 150) { E.addNoto(scopeKey(), 2); IMA(1); x.rel += 2; P().mom += 0.015; return { lane: 'com', t: 'Vidéo tournée, montée, publiée ✅ Belle portée.' }; } x.rel -= 1; return { lane: 'com', t: 'Pas de retour pour l’instant… Il·elle en a fait une pour un autre candidat, visiblement.' }; } },
    bilan: { cd: 35, w: c => c.lead && P().mandats.length && c.dl < 50 ? 0.7 : 0, mk: c => { const ths = (concerns() || []).slice(0, 3).map(x => x.t); while (ths.length < 3) { const t = pick(Object.keys(D.THEMES)); if (!ths.includes(t)) ths.push(t); } return { lane: 'com', t: 'Je propose une série de visuels « Qu’avons-nous fait ? » sur ton bilan, avec un bandeau. On commence par quoi ?', opts: ths.map(t => ({ l: D.THEMES[t].l, v: 1, k: t, tag: 'com' })).concat([{ l: 'Pas de bilan, on parle d’avenir', v: 0.5, k: 'non' }]), def: 3 }; },
      res(k) { if (k === 'non') return { lane: 'com', t: 'Ok, on reste sur le projet.' }; const bs = typeof GV !== 'undefined' ? GV.bilanScore() : 0; if (bs > 4) { IMA(1.2); P().cred = clamp(P().cred + 1, 0, 100); return { lane: 'com', t: 'Visuel « ' + D.THEMES[k].l + ' : qu’avons-nous fait ? » publié. Ça parle aux gens, il y a du concret.' }; } IMA(-0.8); return { lane: 'com', t: 'Retour de bâton : dans les commentaires, on nous renvoie à nos promesses non tenues 😬' }; } },
    recus: { cd: 9999, w: c => c.lead && P().cand.compte && !c.f('recus') ? 1.6 : 0, mk: () => ({ lane: 'orga', t: 'Est-ce qu’une liasse de reçus de dons a été demandée à la préfecture ? Les formules numérotées restent au format papier : le mandataire doit en faire la demande par mail, elles arrivent par courrier.', opts: [{ l: 'Le mandataire s’en occupe', v: 2, k: 'mand', need: 'mandataire', tag: 'orga' }, { l: 'Je m’en charge (1 h)', h: 1, v: 1.4, k: 'moi' }, { l: 'Plus tard', v: -1.5, k: 'tard' }], def: 2 }),
      res(k) { if (k === 'tard') { hq().pend.push({ tpl: 'recus2', at: S().date }); return { lane: 'orga', t: 'Ok, mais sans reçus on ne peut pas encaisser de dons proprement.' }; } hq().flags.recus = true; return { lane: 'orga', t: 'Demande envoyée au bureau des élections. On les aura sous trois jours.' }; } },
    recus2: { cd: 9999, w: () => 0, mk: () => ({ lane: 'orga', t: 'Toujours pas de reçus de dons… Trois donateurs ont renoncé cette semaine.', opts: [{ l: 'Je m’en occupe tout de suite (1 h)', h: 1, v: 2, k: 'moi', tag: 'orga' }, { l: 'Tant pis', v: -2, k: 'tard' }], def: 1 }),
      res(k) { if (k === 'moi') { hq().flags.recus = true; return { lane: 'orga', t: 'Enfin 🙏' }; } hq().flags.recusLost = (hq().flags.recusLost || 0) + 1; return { lane: 'orga', t: 'Ok. On perd des dons à chaque tour, je préfère que tu le saches.' }; } },
    geneur: { cd: 120, w: c => c.dl < 40 ? 0.35 : 0, mk: () => { const g = R() < 0.5 ? 'F' : 'M'; const n = nm(g); return { lane: 'orga', t: n + ' (militant·e historique) envoie des remarques désobligeantes dans la boucle depuis ce matin, sur tout le monde. On le·la débranche ?', data: { n }, opts: [{ l: 'Le·la sortir de la boucle', v: 0.8, k: 'sortir' }, { l: 'Lui répondre diplomatiquement : « Merci pour votre avis »', v: 1.5, k: 'diplo', tag: 'strat' }, { l: 'Laisser couler', v: -1, k: 'rien' }], def: 2 }; },
      res(k, d) { if (k === 'sortir') { moral(4); if (R() < 0.3) { IMA(-0.4); return { lane: 'com', t: d.n + ' raconte sur Facebook qu’on l’a « purgé·e ». Quelques likes, rien de grave.' }; } return { lane: 'orga', t: 'Fait. L’ambiance respire.' }; }
        if (k === 'diplo') { moral(2); return { lane: 'com', t: 'Diplomate 🙏 Il·elle s’est calmé·e.' }; } moral(-5); return { lane: 'terrain', t: 'Deux bénévoles m’ont dit qu’ils quittaient la boucle à cause de ça.' }; } },
    revue: { cd: 6, w: c => c.dl < 90 && S().news.length ? 0.6 : 0, mk: () => { const s = S(); const rv = new Set(s.rivals || []); const n = s.news.slice(0, 15).find(x => x.about === 'pnj' || x.about === 'nat') || s.news[0]; return { lane: 'com', t: 'Revue de presse : « ' + n.title + ' » (' + n.media + '). ' + E.fresh('revu', ['À lire, ça peut nous servir.', 'Vraiment du grand journalisme 🙄', 'Ça va faire réagir.', 'On en parle au point de ce soir ?', 'Intéressant de lire les réponses en dessous.']) }; } },
    soiree: { cd: 9999, w: c => c.lead && c.dl <= 3 && c.dl > 0 && !c.f('soiree' + c.round) ? 2 : 0, mk: c => ({ lane: 'com', t: 'La presse demande : « Bonjour, avez-vous un lieu de rassemblement de vos équipes et soutiens dimanche soir ? »', data: { r: c.round }, opts: [{ l: 'Au local de campagne, avec les militants', v: 1.8, k: 'local', tag: 'terrain' }, { l: 'Une salle avec les élus qui nous soutiennent (400 €)', cost: 400, v: 1.3, k: 'salle', tag: 'strat' }, { l: 'Pas de soirée publique', v: -1, k: 'non' }], def: 0 }),
      res(k, d) { hq().flags['soiree' + d.r] = true; hq().flags.soireeLieu = k; if (k === 'local') { moral(5); motiv(5); return { lane: 'terrain', t: 'Il faudrait qu’on dise aux collègues de l’équipe de venir du coup ? Je préviens tout le monde 🙌' }; } if (k === 'salle') { if (!spendC(400, 'Soirée électorale')) return { lane: 'orga', t: 'Plus assez sur le compte : on fera au local.' }; E.addNoto(scopeKey(), 1.5); P().mom += 0.01; return { lane: 'orga', t: 'Salle réservée, les élus sont prévenus.' }; } moral(-4); return { lane: 'terrain', t: 'Ok… les militants vont être déçus.' }; } },
    fin: { cd: 9999, w: c => c.lead && c.dl <= 2.6 && c.dl >= 1 && !c.f('fin' + c.round) ? 3 : 0, mk: c => ({ lane: 'orga', t: 'La campagne officielle s’arrête ce soir à minuit. Après : plus un tract, plus un post de campagne, c’est le silence. On publie le message de remerciements ?', data: { r: c.round }, opts: [{ l: 'Publier le message de fin de campagne', v: 2, k: 'msg', tag: 'com' }, { l: 'Un dernier tractage demain matin au marché', v: -2, k: 'tract' }, { l: 'Rien de spécial', v: 0, k: 'rien' }], def: 2 }),
      res(k, d) { hq().flags['fin' + d.r] = true; const p = P();
        if (k === 'msg') { p.mom += 0.01; moral(4); E.post(p.name, '@' + E.slug(p.name), 'La campagne prend fin ce soir à minuit. Merci aux élus, aux militants, aux sympathisants et à toute mon équipe, très mobilisée. L’avenir est désormais entre vos mains.', true, rint(200, 1500)); return { lane: 'com', t: 'Publié ❤️ Bonne soirée de fin de campagne à tous !! 🍻' }; }
        if (k === 'tract') { if (R() < 0.55) { p.cred = clamp(p.cred - 4, 0, 100); IMA(-1.5); E.article('dauph', 'Propagande pendant le silence électoral : l’équipe ' + E.de(p.name) + ' épinglée', -0.5, 'pj'); return { lane: 'orga', t: 'On s’est fait prendre au marché par l’équipe adverse. Ils ont saisi la préfecture. Je t’avais prévenu·e.' }; } camp('terrain', 3); return { lane: 'terrain', t: 'Fait, sans incident. Mais on a eu chaud.' }; }
        return { lane: 'orga', t: 'Ok. Rendez-vous dimanche.' }; } },
    procu: { cd: 9999, w: c => c.lead && (c.t2 || c.dl < 8) && !c.f('procu') ? 0.6 : 0, mk: () => ({ lane: 'dc', t: 'Depuis ce matin, trois personnes me disent avoir fait une procuration… jamais arrivée en mairie. Et une rumeur dit qu’un militant adverse aurait voté sept fois dans différents bureaux.', opts: [{ l: 'Récupérer les listes d’émargement et les procurations du REU (2 h)', h: 2, v: 1.8, k: 'verif', tag: 'orga' }, { l: 'Dénoncer publiquement une fraude', v: -1.5, k: 'denonce' }, { l: 'Ignorer', v: 0.2, k: 'rien' }], def: 2 }),
      res(k) { hq().flags.procu = true; const p = P();
        if (k === 'verif') { if (R() < 0.35) { const r = topRival(); if (r) p.dossiers.push({ id: E.uid('d'), on: r.id, label: 'procurations irrégulières', g: 1, date: S().date }); p.cred = clamp(p.cred + 1, 0, 100); return { lane: 'orga', t: 'Une anomalie réelle sur deux procurations : on a de quoi déposer un recours si le résultat est serré.' }; } p.cred = clamp(p.cred + 0.5, 0, 100); return { lane: 'orga', t: 'Vérifié : c’est dématérialisé, une seule procuration par personne, et tout est enregistré. Fausse alerte, mais on a bien fait.' }; }
        if (k === 'denonce') { if (R() < 0.7) { p.cred = clamp(p.cred - 4, 0, 100); IMA(-1.5); E.article('dauph', p.name + ' crie à la fraude sans preuve', -0.4, 'pj'); return { lane: 'dc', t: 'On n’avait rien de solide. On passe pour des mauvais perdants avant même le vote.' }; } E.addNoto(scopeKey(), 1); return { lane: 'com', t: 'Ça a fait du bruit, la préfecture promet des contrôles.' }; }
        return { lane: 'dc', t: 'Ok. On garde un œil dessus.' }; } },
    reports: { cd: 9999, w: c => c.lead && c.t2 && c.inT2 && !c.f('reports') ? 2 : 0, mk: () => ({ lane: 'com', t: 'Est-ce qu’on a les numéros des candidats éliminés ? Ça nous aiderait à connaître leurs consignes de report. La dernière fois, un petit candidat nous avait appelés pour connaître nos positions sur son sujet.', opts: [{ l: 'Je les appelle tous (2 h)', h: 2, v: 2, k: 'tous', tag: 'strat' }, { l: 'On cible les partis proches seulement', v: 1, k: 'proches' }, { l: 'Pas le temps', v: -0.5, k: 'non' }], def: 2 }),
      res(k) { hq().flags.reports = true; const p = P(); if (k === 'tous') { p.mom += 0.025; IMA(0.5); return { lane: 'com', t: 'Deux consignes en notre faveur, un « liberté de vote » plutôt bienveillant. Ça compte.' }; } if (k === 'proches') { p.mom += 0.01; return { lane: 'dc', t: 'Les états-majors se parlent. Il faudra un rendez-vous pour sceller ça.' }; } return { lane: 'dc', t: 'Dommage, il y avait des voix à aller chercher.' }; } },
    commission: { cd: 9999, w: c => c.lead && c.t2 && c.inT2 && !c.f('commission') ? 2.5 : 0, mk: () => ({ lane: 'orga', t: 'Bulletins et circulaires du second tour à livrer mercredi 10 h à la commission de propagande. L’imprimeur demande : on part sur 250 affiches ?', opts: [{ l: '250 affiches et les circulaires (1 800 €)', cost: 1800, v: 2, k: 'max', tag: 'terrain' }, { l: '120 affiches (900 €)', cost: 900, v: 1, k: 'mid', tag: 'orga' }, { l: 'On recycle celles du 1er tour', v: -0.5, k: 'min' }], def: 2 }),
      res(k) { hq().flags.commission = true; const p = P(); const amt = k === 'max' ? 1800 : k === 'mid' ? 900 : 0;
        if (amt && !spendC(amt, 'Impression second tour')) return { lane: 'orga', t: 'Le compte ne suit pas. On recycle.' };
        camp('terrain', k === 'max' ? 6 : k === 'mid' ? 3 : -2); if (k === 'max') p.mom += 0.01;
        const pro = dcStyle() === 'orga' || p.staff.some(x => ['mandataire', 'juriste'].includes(x.role));
        if (!pro && R() < 0.15) { p.mom -= 0.04; return { lane: 'orga', t: 'Catastrophe : livraison en retard à la commission. Nos circulaires ne seront pas dans toutes les enveloppes 😩' }; }
        return { lane: 'orga', t: 'Livré à la commission dans les temps ✅' }; } },
    apero: { cd: 45, w: c => (hq().moral < 52 ? 1.2 : 0.25) * (c.lead ? 1 : 0), mk: () => ({ lane: 'terrain', t: 'Et quand est-ce qu’on se fait un apéro d’équipe ? Les troupes en ont besoin 🍻', opts: [{ l: 'Ce soir, c’est moi qui offre (150 €)', v: 1.5, k: 'oui', tag: 'terrain' }, { l: 'Après l’élection', v: 0.4, k: 'apres' }], def: 1 }),
      res(k) { const p = P(); if (k === 'oui') { if (p.cash >= 150) p.cash -= 150; moral(12); motiv(6); return { lane: 'terrain', t: 'Merci infiniment pour ce soir, on a passé un super moment 🥰 Force et honneur pour la suite !' }; } moral(-2); return { lane: 'terrain', t: 'Ok, on le note. Mais on le fera, hein !' }; } },
    tracts: { cd: 12, w: c => c.lead && hq().tracts != null && hq().tracts < 400 && !hq().tractsDue ? 2.2 : 0, mk: () => ({ lane: 'terrain', t: 'Il ne reste que ' + Math.max(0, Math.round(hq().tracts)) + ' tracts chez moi. Au rythme où on va, on est à sec dans trois jours 😬', opts: [{ l: 'Commander 2 000 tracts à l’imprimeur (600 €, livrés au prochain tour)', cost: 600, v: 2, k: 'cmd', tag: 'orga' }, { l: 'Photocopies d’urgence (150 €)', cost: 150, v: 0.8, k: 'photo' }, { l: 'On fait sans', v: -1, k: 'rien' }], def: 2 }),
      res(k) { const h = hq(); if (k === 'cmd') { if (!spendC(600, 'Impression de tracts')) return { lane: 'orga', t: 'Le compte ne suit pas.' }; h.tractsDue = 2000; return { lane: 'orga', t: 'Commande passée à l’imprimeur, je récupère les cartons dès qu’ils sont prêts.' }; } if (k === 'photo') { if (!spendC(150, 'Photocopies')) return { lane: 'orga', t: 'Même pas de quoi faire des photocopies…' }; h.tracts += 500; IMA(-0.2); return { lane: 'terrain', t: 'C’est moche, mais ça dépanne.' }; } return { lane: 'terrain', t: 'Ok, les équipes feront du porte-à-porte sans rien à laisser.' }; } },
    coord: { cd: 35, w: c => c.lead && !c.f('coord') && dcStyle() !== 'terrain' && !P().staff.some(x => x.role === 'terrain') && c.dl < 70 ? 0.9 : 0, mk: () => { const z = weakZone(); return { lane: 'terrain', t: 'Deux équipes ont boîté la même rue ce week-end' + (z ? ', et le secteur « ' + z.name + ' » n’a jamais été fait' : '') + '. Il nous faut un coordinateur par secteur, sinon on gaspille nos forces.', opts: [{ l: 'Nommer un coordinateur par secteur (1 h)', h: 1, v: 2, k: 'ok', tag: 'orga' }, { l: 'Chacun fait au mieux', v: -0.5, k: 'non' }], def: 1 }; },
      res(k) { if (k === 'ok') { hq().flags.coord = true; motiv(3); return { lane: 'terrain', t: 'Tableau partagé en place : chaque secteur a son référent, on voit en temps réel ce qui est fait.' }; } motiv(-2); return { lane: 'terrain', t: 'Ok… on va continuer à se marcher dessus.' }; } },
    questionnaire: { cd: 30, w: c => c.lead && c.dl < 50 ? 0.8 : 0, mk: () => { const q = pick(QUEST); return { lane: 'orga', t: q[0] + ' envoie un questionnaire à tous les candidats : ' + q[1] + ' Les réponses seront publiées.', data: { q }, opts: [{ l: 'Répondre clairement : ' + q[2], v: 1, k: 'pour', tag: 'strat' }, { l: 'Répondre clairement : ' + q[3], v: 1, k: 'contre' }, { l: 'Une réponse prudente, sans s’engager', v: 0.6, k: 'flou', tag: 'com' }, { l: 'Ne pas répondre', v: -1, k: 'rien' }], def: 3 }; },
      res(k, d) { const [org, , , , sp, sc] = d.q; if (k === 'pour') { IM(sp[0], 2.2); IM(sp[1], -1.2); return { lane: 'com', t: 'Réponse publiée par ' + org + '. Ça a le mérite d’être clair.' }; } if (k === 'contre') { IM(sc[0], 2.2); IM(sc[1], -1.2); return { lane: 'com', t: 'Réponse publiée. On va recevoir des messages, dans les deux sens.' }; } if (k === 'flou') { P().cred = clamp(P().cred - 0.5, 0, 100); return { lane: 'com', t: org + ' classe notre réponse dans les « réponses évasives ». Pas dramatique.' }; } IMA(-0.6); return { lane: 'com', t: org + ' publie la liste des candidats qui n’ont pas répondu. On est dedans.' }; } },
    bourde: { cd: 70, w: c => c.lead && c.dl < 60 ? 0.45 : 0, mk: () => { const g = R() < 0.5 ? 'F' : 'M'; const n = nm(g); const what = pick(['a partagé un post complotiste il y a deux ans', 'a été filmé·e en train de s’énerver contre un commerçant', 'a liké une blague raciste sur Facebook', 'a publié une photo de la permanence avec des documents internes visibles']); return { lane: 'com', t: 'Problème : ' + n + ', de notre équipe, ' + what + '. Une capture circule.', data: { n }, opts: [{ l: 'L’écarter de la campagne, et le dire', v: 1.2, k: 'ecarte', tag: 'com' }, { l: 'Présenter des excuses publiques, il·elle reste', v: 0.6, k: 'excuses' }, { l: 'Faire le dos rond', v: -0.6, k: 'rien' }], def: 2 }; },
      res(k, d) { if (k === 'ecarte') { moral(-4); P().cred = clamp(P().cred + 1, 0, 100); return { lane: 'dc', t: 'Fait. Ça fait mal, mais l’affaire est close.' }; } if (k === 'excuses') { IMA(-0.5); moral(2); return { lane: 'com', t: 'Excuses publiées. Ça retombe doucement.' }; } if (R() < 0.55) { IMA(-1.8); E.article('dauph', 'Polémique dans l’équipe ' + E.de(P().name), -0.4, 'pj'); return { lane: 'com', t: 'Le Dauphinois a repris la capture. On aurait dû agir.' }; } return { lane: 'com', t: 'Ça n’a pas pris. Ouf.' }; } },
    ralliement: { cd: 60, w: c => c.lead && c.rival && c.dl < 80 ? 0.55 : 0, mk: c => { const g = R() < 0.5 ? 'F' : 'M'; const n = nm(g); return { lane: 'dc', t: n + ', ancien·ne colistier·ère ' + E.de(c.rival.name) + ', veut nous rejoindre et le dire publiquement. Il·elle a voté tout ce que nous critiquons depuis six ans, mais c’est un signal fort.', data: { x: c.rival.id, n }, opts: [{ l: 'Accueillir et annoncer le ralliement', v: 1.4, k: 'oui', tag: 'strat' }, { l: 'Accueillir discrètement, sans annonce', v: 0.8, k: 'discret' }, { l: 'Refuser poliment', v: 0.2, k: 'non' }], def: 1 }; },
      res(k, d) { const x = S().pnj[d.x]; if (k === 'oui') { if (x) { x.mom -= 0.03; x.img -= 1.5; } E.article('dauph', d.n + ' quitte ' + (x ? x.name : 'son camp') + ' pour rejoindre ' + P().name, 0.2, 'pj'); moral(-3); return { lane: 'terrain', t: 'Annoncé. Deux militants grognent (« on a passé six ans à les combattre »), mais dehors ça fait du bruit.' }; } if (k === 'discret') { if (x) x.mom -= 0.01; return { lane: 'dc', t: 'Il·elle nous ouvre son carnet d’adresses. Discrètement.' }; } return { lane: 'dc', t: 'Ok. Il·elle ira peut-être ailleurs.' }; } },
    don: { cd: 9999, w: c => c.lead && P().cand.compte && c.dl < 70 ? 0.4 : 0, mk: () => ({ lane: 'orga', t: 'Un chef d’entreprise du coin propose de « participer » : 5 000 €, versés par sa société. Je rappelle qu’un don de personne morale est interdit, et que le plafond est de 4 600 € par personne et par élection.', opts: [{ l: 'Refuser, mais lui proposer un don personnel plafonné', v: 2, k: 'perso', tag: 'orga' }, { l: 'Refuser tout net', v: 1, k: 'non' }, { l: 'Accepter en espèces, sans reçu', v: -3, k: 'oui', ill: 'Illégal : don d’entreprise et en espèces. Risque : rejet du compte, jusqu’à 3 ans d’inéligibilité' }], def: 1 }),
      res(k) { const p = P(); const c = p.cand.compte; if (k === 'perso') { const a = rint(1500, 4600); c.dons += a; c.recettes += a; return { lane: 'orga', t: 'Il a fait un don personnel de ' + E.eur(a) + ', avec reçu. Propre.' }; } if (k === 'non') return { lane: 'orga', t: 'Refusé. Il n’a pas apprécié, mais on dort tranquilles.' }; c.recettes += 5000; E.casserole('fin', 'Don en espèces d’une entreprise', 2, true, 0.06); return { lane: 'orga', t: 'Je ne veux pas en entendre parler. Si ça sort, c’est l’annulation du compte et l’inéligibilité.' }; } },
    tag: { cd: 9999, w: c => c.lead && c.dl < 40 ? 0.35 : 0, mk: () => ({ lane: 'terrain', t: 'La permanence a été taguée cette nuit, vitrine fissurée. Les militants sont choqués.', opts: [{ l: 'Porter plainte et communiquer', v: 1.4, k: 'plainte', tag: 'com' }, { l: 'Porter plainte, sans en faire un sujet', v: 1.2, k: 'discret', tag: 'orga' }, { l: 'Nettoyer et passer à autre chose', v: 0.3, k: 'rien' }], def: 1 }),
      res(k) { if (k === 'plainte') { if (R() < 0.7) { IMA(1); motiv(5); return { lane: 'com', t: 'Beaucoup de messages de soutien, y compris d’autres listes. Ça ressoude les troupes.' }; } IMA(-0.4); return { lane: 'com', t: 'Certains commentaires nous accusent de jouer les victimes.' }; } if (k === 'discret') { motiv(2); return { lane: 'orga', t: 'Plainte déposée au commissariat. On a fait réparer.' }; } motiv(-3); return { lane: 'terrain', t: 'Nettoyé. Mais les militants auraient aimé qu’on réagisse.' }; } },
    salle: { cd: 9999, w: c => c.lead && c.rival && ['maire', 'baron'].includes(c.rival.role) && c.dl < 60 ? 0.6 : 0, mk: c => ({ lane: 'orga', t: 'La mairie nous refuse la salle des fêtes pour notre réunion publique, « pour raisons de planning ». Bizarrement, ' + c.rival.name + ' l’a eue sans problème.', data: { x: c.rival.id }, opts: [{ l: 'Dénoncer publiquement l’inégalité de traitement', v: 1.2, k: 'denonce', tag: 'com' }, { l: 'Louer une salle privée (500 €)', cost: 500, v: 1, k: 'loue', tag: 'orga' }, { l: 'Faire la réunion en plein air, sur la place', v: 0.9, k: 'place', tag: 'terrain' }], def: 2 }),
      res(k, d) { const x = S().pnj[d.x]; if (k === 'denonce') { if (x) { x.img -= 1.5; x.rel -= 6; } E.article('dauph', 'Salle refusée : ' + P().name + ' dénonce une « inégalité de traitement »', 0.1, 'pj'); return { lane: 'com', t: 'Repris dans la presse. La mairie a « retrouvé un créneau » 😏' }; } if (k === 'loue') { if (!spendC(500, 'Location de salle')) return { lane: 'orga', t: 'Pas les moyens : on fera sur la place.' }; return { lane: 'orga', t: 'Salle réservée. Au moins on est tranquilles.' }; } camp('meet', 1); IM('POP', 1); return { lane: 'terrain', t: 'Réunion en plein air : du monde, des passants qui s’arrêtent. Belle image.' }; } },
    epuise: { cd: 50, w: c => c.lead && c.dl < 30 && hq().moral < 65 ? 0.7 : 0, mk: () => { const c0 = pick(hq().core.length ? hq().core : [{ name: nm('F') }]); return { lane: 'terrain', t: c0.name + ' m’a appelé en larmes : épuisé·e, veut tout arrêter. C’est un pilier de l’équipe.', data: { n: c0.name }, opts: [{ l: 'L’appeler moi-même et alléger sa charge (1 h)', h: 1, v: 2, k: 'appel', tag: 'terrain' }, { l: 'Répartir son travail sur les autres', v: 0.8, k: 'repartir' }, { l: 'Laisser partir', v: -1, k: 'partir' }], def: 1 }; },
      res(k, d) { if (k === 'appel') { moral(6); return { lane: 'terrain', t: d.n + ' reste. Ton coup de fil a tout changé 🙏' }; } if (k === 'repartir') { moral(-2); motiv(-2); return { lane: 'terrain', t: 'On s’organise, mais tout le monde est fatigué.' }; } moral(-7); const h = hq(); h.core = h.core.filter(z => z.name !== d.n); return { lane: 'terrain', t: d.n + ' quitte l’équipe. Ça va laisser un vide.' }; } },
    federation: { cd: 60, w: c => c.lead && P().party !== 'NEW' && c.dl < 70 ? 0.5 : 0, mk: () => ({ lane: 'dc', t: 'La fédération ' + D.PARTIES[P().party].short + ' veut le logo du parti en grand sur nos documents, et propose qu’un ténor national vienne nous soutenir.', opts: [{ l: 'Logo et ténor : on assume l’étiquette', v: 0.9, k: 'oui' }, { l: 'Le ténor oui, mais un logo discret', v: 1.4, k: 'mixte', tag: 'strat' }, { l: 'Campagne locale : ni logo ni ténor', v: 0.7, k: 'non' }], def: 1 }),
      res(k) { const p = P(); const cl = (S().national.climate || {})[p.party] || 0; if (k === 'oui') { p.fedSup = clamp((p.fedSup || 0) + 6, 0, 100); E.addStd(3); IMA(cl * 30); return { lane: 'dc', t: cl < 0 ? 'La fédé est ravie. Sur le terrain, l’étiquette pèse lourd en ce moment…' : 'La fédé est ravie, et l’étiquette porte plutôt bien.' }; } if (k === 'mixte') { p.fedSup = clamp((p.fedSup || 0) + 2, 0, 100); E.addNoto(scopeKey(), 1.5); return { lane: 'dc', t: 'Bon compromis. Le ténor vient jeudi.' }; } p.fedSup = clamp((p.fedSup || 0) - 5, 0, 100); IM('RUR', 0.8); IM('RET', 0.6); return { lane: 'dc', t: 'La fédé fait la tête. Mais localement, « pas d’étiquette » rassure.' }; } },
    espion: { cd: 25, w: c => c.lead && c.rival && c.dl < 50 ? 0.7 : 0, mk: c => ({ lane: 'dc', t: c.rival.name + ' tient sa réunion publique ce soir. On y envoie quelqu’un pour prendre la température ?', data: { x: c.rival.id }, opts: [{ l: 'Oui, deux personnes, discrètement', v: 1.5, k: 'oui', tag: 'strat' }, { l: 'Non, on a mieux à faire', v: 0, k: 'non' }], def: 1 }),
      res(k, d) { const x = S().pnj[d.x]; if (k !== 'oui' || !x) return { lane: 'dc', t: 'Ok.' }; const n = rint(30, 120); const weak = pick(['aucun chiffrage sur les finances', 'rien sur la sécurité', 'des propositions copiées sur les nôtres', 'une salle acquise, peu de nouveaux visages', 'un discours très long, la salle décroche']); hq().intel = Object.assign(hq().intel || {}, { [x.id]: { date: S().date, weak } }); hq().atk[x.id] = hq().atk[x.id] || { n: 0, date: S().date }; return { lane: 'terrain', t: 'Compte-rendu : environ ' + n + ' personnes, « grosso modo ». Point faible : ' + weak + '. C’est là qu’il faut appuyer.' }; } },
    debatrefus: { cd: 9999, w: c => c.lead && c.rival && rivals().length >= 2 && c.dl < 45 && c.dl > 7 ? 0.6 : 0, mk: c => ({ lane: 'dc', t: 'Débat public à toutes les têtes de liste, animé par un journaliste : tout le monde a dit oui sauf ' + c.rival.name + ', sans justification. On communique ?', data: { x: c.rival.id }, opts: [{ l: 'Communiqué commun avec les autres candidats', v: 1.6, k: 'commun', tag: 'strat' }, { l: 'Communiqué seul : c’était notre initiative', v: 1, k: 'seul', tag: 'com' }, { l: 'Organiser le débat sans lui·elle', v: 0.9, k: 'sans' }], def: 0 }),
      res(k, d) { const x = S().pnj[d.x]; if (!x) return { lane: 'dc', t: 'Ok.' }; if (k === 'commun') { x.img -= 2.5; x.mom -= 0.03; rivals().filter(y => y.id !== x.id).forEach(y => y.rel += 6); E.article('dauph', 'Débat public : ' + x.name + ' refuse, ses adversaires dénoncent un « signal inquiétant »', 0.1, 'pnj'); return { lane: 'com', t: 'Communiqué commun repris par la presse. Il·elle est isolé·e.' }; } if (k === 'seul') { x.img -= 1.2; E.addNoto(scopeKey(), 1.2); return { lane: 'com', t: 'Communiqué parti. Moins de reprise, mais c’est notre victoire.' }; } camp('meet', 1); E.addNoto(scopeKey(), 1.5); x.img -= 1; return { lane: 'dc', t: 'Débat sans lui·elle : un pupitre vide au milieu. L’image est cruelle.' }; } },
    portrait: { cd: 9999, w: c => c.lead && c.dl < 50 ? 0.4 : 0, mk: () => ({ lane: 'com', t: 'Le Dauphinois propose un portrait « intime » : chez toi, en famille, avec photos.', opts: [{ l: 'Accepter, en famille', v: 1, k: 'oui' }, { l: 'Accepter, mais sur le terrain, pas à la maison', v: 1.4, k: 'terrain', tag: 'com' }, { l: 'Décliner', v: 0, k: 'non' }], def: 1 }),
      res(k) { if (k === 'oui') { E.addNoto(scopeKey(), 2.5); IM('RET', 1.5); IM('PERI', 1); return { lane: 'com', t: 'Très beau papier. Les photos font leur effet.' }; } if (k === 'terrain') { E.addNoto(scopeKey(), 1.8); IM('POP', 1); return { lane: 'com', t: 'Portrait publié : « un·e candidat·e de terrain ». Ça nous va.' }; } return { lane: 'com', t: 'Ok. Ils feront peut-être le portrait d’un autre.' }; } },
    // ---- petites communes : la campagne au village ----
    voisin: { cd: 20, w: c => c.lead && petite() && c.dl < 120 ? 1.2 : 0, mk: () => { const q = pick(VPB); return { lane: 'terrain', t: q[0], data: { q }, opts: [{ l: 'Aller le voir chez lui, prendre le temps (2 h)', h: 2, v: 1.6, k: 'visite', tag: 'terrain' }, { l: 'L’inscrire dans le projet : « ' + q[1] + ' »', v: 1.2, k: 'projet', tag: 'strat' }, { l: 'Lui dire que ce sera vu après l’élection', v: -0.5, k: 'rien' }], def: 2 }; },
      res(k, d) { if (k === 'visite') { IM('RET', 1.5); IM('RUR', 1.5); camp('terrain', 3); E.addNoto('commune', 1); return { lane: 'terrain', t: 'Il a apprécié que tu passes. Il en parlera à tout le hameau, crois-moi.' }; } if (k === 'projet') { IMA(0.6); return { lane: 'terrain', t: 'Noté dans le projet. Pense à l’ajouter à la profession de foi (onglet Programme).' }; } IMA(-0.6); return { lane: 'terrain', t: 'Il m’a dit : « Ils viennent tous les six ans, et après plus personne. » Ça va tourner au village.' }; } },
    fete: { cd: 9999, w: c => c.lead && petite() && c.dl < 100 && c.dl > 5 ? 1 : 0, mk: () => ({ lane: 'terrain', t: 'Le comité des fêtes cherche des bras pour la ' + pick(['vogue', 'fête du four', 'brocante', 'fête de la soupe', 'matinée boudin']) + ' de samedi. Le maire sortant sera évidemment là.', opts: [{ l: 'Tenir la buvette toute la journée (4 h)', h: 4, v: 1.8, k: 'buvette', tag: 'terrain' }, { l: 'Passer serrer quelques mains (1 h)', h: 1, v: 1, k: 'passer', tag: 'terrain' }, { l: 'Pas le temps', v: -0.8, k: 'rien' }], def: 2 }),
      res(k) { if (k === 'buvette') { IMA(1.2); E.addNoto('commune', 3); motiv(3); return { lane: 'terrain', t: 'Tout le monde t’a vu derrière le comptoir. Même des gens qui ne te connaissaient pas sont venus discuter 🍺' }; } if (k === 'passer') { IMA(0.4); E.addNoto('commune', 1); return { lane: 'terrain', t: 'Tu as fait le tour des stands, c’est bien. On a quand même senti que tu étais pressé·e.' }; } IMA(-1); return { lane: 'terrain', t: 'Il y avait tout le village… sauf nous. Le maire sortant a fait le tour des tables.' }; } },
    secretaire: { cd: 9999, w: c => c.lead && petite() && c.dl < 90 ? 0.6 : 0, mk: () => ({ lane: 'orga', t: 'Je connais bien la secrétaire de mairie. Elle dit qu’elle travaillera avec n’importe quelle équipe, mais qu’elle aimerait savoir si on garde l’ouverture de la mairie le samedi matin.', opts: [{ l: 'Oui, on s’y engage', v: 1, k: 'oui', tag: 'orga' }, { l: 'On verra avec elle après l’élection', v: 0.6, k: 'apres' }], def: 1 }),
      res(k) { if (k === 'oui') { IM('RET', 1); IM('PERI', 1); return { lane: 'orga', t: 'Elle était contente. Et une mairie ouverte le samedi, ça parle aux gens qui travaillent.' }; } return { lane: 'orga', t: 'Elle a dit : « Comme vous voudrez. » Elle a vu passer plusieurs maires, tu sais.' }; } },
    bulletin: { cd: 9999, w: c => c.lead && petite() && c.dl < 45 && c.dl > 4 ? 1 : 0, mk: () => ({ lane: 'com', t: 'Pour la profession de foi : on fait une simple feuille recto verso glissée dans les boîtes, ou un vrai livret avec photos de toute l’équipe ?', opts: [{ l: 'Le livret avec toute l’équipe (400 €)', cost: 400, v: 1.4, k: 'livret', tag: 'com' }, { l: 'La feuille recto verso, distribuée à la main', v: 1.2, k: 'feuille', tag: 'terrain' }], def: 1 }),
      res(k) { if (k === 'livret') { spendC(400, 'Profession de foi'); IMA(0.8); camp('medias', 3); return { lane: 'com', t: 'Il a de l’allure. On voit qu’on est une vraie équipe, avec des gens que tout le monde connaît.' }; } camp('terrain', 4); IM('RUR', 0.6); return { lane: 'terrain', t: 'Distribuée boîte par boîte. Et on a discuté avec la moitié des gens au passage.' }; } },
    fusion: { cd: 0, w: () => 0, mk: o0 => o0.mk },
    parite: { cd: 12, w: c => { const l = P().cand && P().cand.liste; return c.lead && l && !l.closed && l.f < Math.ceil(l.need / 2) - 1 && l.n >= l.need * 0.6 ? 1.6 : 0; }, mk: () => { const l = P().cand.liste; return { lane: 'dc', t: '⚠️ Recrutement : ' + l.n + ' colistiers sur ' + l.need + ', mais seulement ' + l.f + ' femmes. La liste doit alterner femme-homme : il en manque ' + (Math.ceil(l.need / 2) - l.f) + '. C’est URGENT.', opts: [{ l: 'Activer mon réseau personnel (2 h)', h: 2, v: 2, k: 'reseau', tag: 'strat' }, { l: 'Demander à chaque colistier de proposer une candidate', v: 1.4, k: 'chacun', tag: 'terrain' }, { l: 'Ça viendra', v: -1, k: 'rien' }], def: 2 }; },
      res(k) { const l = P().cand.liste; if (k === 'reseau') { const n = rint(2, 4); l.f += n; l.n += n; return { lane: 'dc', t: n + ' femmes de plus sur la liste, dont une cheffe d’entreprise et une ancienne directrice d’école. On respire.' }; } if (k === 'chacun') { const n = rint(1, 3); l.f += n; l.n += n; moral(-1); return { lane: 'terrain', t: n + ' nouvelle(s) candidate(s). Et cinq refus en une journée…' }; } return { lane: 'dc', t: 'Le dépôt est le ' + E.fmtDate(l.dep) + '. Je compte les jours.' }; } },
    adjsortant: { cd: 9999, w: c => c.lead && P().cand.liste && !P().cand.liste.closed && c.rival && c.rival.role === 'maire' ? 0.8 : 0, mk: c => ({ lane: 'dc', t: 'Deux adjoints du maire sortant, ' + c.rival.name + ', veulent rejoindre notre liste. Ils ont porté une partie de ses réalisations : on pourra revendiquer ce bilan, et ça dira beaucoup de sa méthode.', data: { x: c.rival.id }, opts: [{ l: 'Les accueillir et l’annoncer', v: 1.8, k: 'oui', tag: 'strat' }, { l: 'Les accueillir en fin de liste, discrètement', v: 1, k: 'discret' }, { l: 'Refuser : on incarne le renouveau', v: 0.3, k: 'non' }], def: 1 }),
      res(k, d) { const x = S().pnj[d.x]; const l = P().cand.liste; if (k === 'non') return { lane: 'dc', t: 'Ok. Ils iront peut-être ailleurs.' }; l.n += 2; P().cred = clamp(P().cred + (k === 'oui' ? 3 : 1), 0, 100); if (x) { x.img -= k === 'oui' ? 3 : 1; x.mom -= k === 'oui' ? 0.04 : 0.01; } if (k === 'oui') { E.article('dauph', 'Deux adjoints de ' + (x ? x.name : 'la majorité') + ' rejoignent ' + P().name, 0.3, 'pj'); return { lane: 'com', t: 'Annonce faite. Argument tout trouvé : « ses réalisations, ce sont eux ».' }; } return { lane: 'dc', t: 'Bienvenue à eux. Discrètement.' }; } },
    pieces: { cd: 9999, w: c => { const l = P().cand && P().cand.liste; return c.lead && l && !l.closed && E.diffDays(S().date, l.dep) < 14 ? 2 : 0; }, mk: () => ({ lane: 'orga', t: 'Dépôt de la liste en préfecture le ' + E.fmtDate(P().cand.liste.dep) + '. Il manque encore des pièces : attestations d’inscription sur les listes électorales, CERFA avec la mention manuscrite, pièces d’identité.', opts: [{ l: 'Relancer tout le monde moi-même (1 h)', h: 1, v: 1.6, k: 'moi' }, { l: 'Laisser la logistique gérer', v: 1.2, k: 'orga', tag: 'orga' }], def: 1 }),
      res(k) { const l = P().cand.liste; if (k === 'moi' || dcStyle() === 'orga' || P().staff.some(x => ['mandataire', 'juriste'].includes(x.role)) || R() < 0.75) { l.pieces = true; return { lane: 'orga', t: 'Toutes les pièces sont là ✅ Rendez-vous en préfecture.' }; } l.pieces = false; return { lane: 'orga', t: 'Deux colistiers n’ont toujours rien envoyé. Si ça ne vient pas, il faudra les remplacer au dernier moment.' }; } },
    nuance: { cd: 9999, w: c => { const l = P().cand && P().cand.liste; return c.lead && l && !l.closed && P().party !== 'NEW' && E.diffDays(S().date, l.dep) < 10 ? 1.5 : 0; }, mk: () => ({ lane: 'dc', t: 'Pour le dépôt, quelle étiquette déclare-t-on ? La préfecture attribuera une nuance de toute façon. Certains colistiers ne veulent pas être « rangés » ' + D.PARTIES[P().party].short + '.', opts: [{ l: 'L’étiquette ' + D.PARTIES[P().party].short + ', on assume', v: 0.8, k: 'parti' }, { l: 'Sans étiquette : une liste d’intérêt local', v: 1.4, k: 'sans', tag: 'strat' }], def: 1 }),
      res(k) { const p = P(); p.cand.liste.nuance = k; if (k === 'parti') { p.fedSup = clamp((p.fedSup || 0) + 4, 0, 100); moral(-4); return { lane: 'terrain', t: 'Une colistière menace de partir : « je refuse d’être rangée sous cette bannière ». On la retient de justesse.' }; } p.fedSup = clamp((p.fedSup || 0) - 3, 0, 100); IM('RUR', 1); IM('RET', 0.8); return { lane: 'dc', t: 'Liste sans étiquette. La fédé râle, les électeurs s’en fichent.' }; } },
    point: { cd: 10, w: c => c.lead && dc() && c.dl > 1 ? 1.4 : 0, mk: c => pointMk(c), res: (k, d) => pointRes(k, d) },
    clash: { cd: 40, w: c => dc() && hq().trust < 35 && hq().dis >= 2 ? 3 : 0, mk: () => ({ lane: 'dc', t: 'Il faut qu’on parle. J’ai l’impression de ne servir à rien : tu ne suis aucune de mes recommandations. Soit tu me fais confiance, soit on arrête les frais.', opts: [{ l: 'Lui redonner la main sur l’organisation', v: 2, k: 'main' }, { l: 'Recadrer : c’est moi le·la candidat·e', v: 0, k: 'recadre' }, { l: 'Le·la remplacer', v: -1, k: 'remplace' }], def: 1, norec: true }),
      res(k) { const h = hq(); const d = dc();
        if (k === 'main') { h.trust = clamp(h.trust + 18, 0, 100); h.dis = 0; moral(3); return { lane: 'dc', t: 'Merci. On repart sur de bonnes bases.' }; }
        if (k === 'recadre') { h.trust = clamp(h.trust - 6, 0, 100); moral(-3); if (d && d.amb > 60 && R() < 0.4) { E.article('dauph', 'Tensions dans l’équipe ' + E.de(P().name), -0.25, 'pj'); return { lane: 'com', t: 'Ça a fuité : Le Dauphinois parle de « tensions dans l’équipe ». Super.' }; } return { lane: 'dc', t: 'Compris. Message reçu.' }; }
        return { act: 'dc', lane: 'dc', t: 'Très bien. Je vous laisse les dossiers en ordre.' }; } },
    analyse1: { cd: 9999, w: () => 0, mk: c => c.an },
    lendemain: { cd: 9999, w: () => 0, mk: () => ({ lane: 'orga', t: 'La lettre de préavis pour la permanence est partie 😢 État des lieux de sortie vendredi 9 h. Et certains d’entre nous vont devoir retrouver un boulot…', opts: [{ l: 'Activer mon réseau pour reclasser l’équipe (2 h)', h: 2, v: 2, k: 'reseau' }, { l: 'Un dernier pot pour remercier tout le monde (200 €)', v: 1.5, k: 'pot' }, { l: 'Tourner la page', v: 0, k: 'rien' }], def: 2, norec: true }),
      res(k) { const h = hq(); if (k === 'reseau') { h.alumni.forEach(a => a.loy = clamp(a.loy + 15, 0, 100)); return { lane: 'terrain', t: 'Merci du fond du cœur. On sera là la prochaine fois, compte sur nous 💪' }; } if (k === 'pot') { if (P().cash >= 200) P().cash -= 200; h.alumni.forEach(a => a.loy = clamp(a.loy + 8, 0, 100)); return { lane: 'com', t: 'Tchin-tchin 🥂 C’était une campagne extraordinaire, même si…' }; } h.alumni.forEach(a => a.loy = clamp(a.loy - 10, 0, 100)); return { lane: 'terrain', t: 'Ok. Bonne continuation à tous.' }; } },
    victoire: { cd: 9999, w: () => 0, mk: () => !posts().length ? ({ lane: 'terrain', t: 'On l’a fait !!! 🎉 Merci à toute la liste. Premier conseil municipal ce week-end pour t’élire maire et désigner les adjoints. Ensuite, place aux dossiers : retrouve-les dans ton Bureau.' }) : ({ lane: 'dc', t: 'On l’a fait !!! 🎉 Bravo à tous. Maintenant il faut composer le cabinet : plusieurs d’entre nous sont partants.', opts: [{ l: 'Composer mon cabinet', v: 2, k: 'cab' }, { l: 'Plus tard', v: 0, k: 'non' }], def: 1, norec: true }),
      res(k) { return k === 'cab' ? { act: 'cabinet', lane: 'dc', t: 'Je te prépare les profils.' } : { lane: 'dc', t: 'Pas trop tard quand même : les dossiers n’attendent pas.' }; } }
  };
  const scopeKey = () => { const e = el(); const t = e ? e.type : 'mun'; return t === 'mun' || t === 'dep' ? 'commune' : t === 'pres' || t === 'euro' ? 'nat' : t === 'reg' || t === 'sen' ? 'dept' : 'circo'; };

  /* point hebdomadaire de la direction de campagne */
  function weakZone() { const p = P(); const zs = p.cand && (S().zones || {})[p.cand.key]; if (!zs || !zs.length) return null; return zs.slice().sort((a, b) => (a.cover - b.cover) * 1 - (b.w - a.w) * 30)[0]; }
  function pointMk(c) {
    const p = P(), h = hq(); const d = dc(); const pr = projet(); const lv = lvl(); const n = (p.prog || []).filter(m => m.status !== 'retiree' && m.level === lv).length;
    const lead = c.est && c.est.rows ? c.est.rows[0] : null; const behind = c.rival && c.est && c.est.rank > 1;
    const L = [];
    if (!p.cand.projet && c.dl < 45) L.push({ w: 3, t: n < 3 ? 'On n’a que ' + n + ' proposition(s) au niveau de cette élection. Sans projet, on fait campagne sur des slogans : il nous faut un programme, et vite.' : 'Toujours pas de programme publié. Les électeurs ne votent pas pour un nom, ils votent pour un projet. On le sort ?', opts: [{ l: 'On s’y met (Programme)', v: 2, k: 'go:programme' }, { l: 'Pas encore', v: -1, k: 'non' }] });
    if (!p.cand.concerns) L.push({ w: 2, t: 'On ne sait pas vraiment ce qui préoccupe les gens ici. Je propose une consultation avant de figer le programme.', opts: [{ l: 'Lancer une consultation', v: 2, k: 'act:consult' }, { l: 'On connaît le terrain', v: -0.5, k: 'non' }] });
    const li = p.cand.liste; if (li && !li.closed && li.n < li.need * 0.85 && E.diffDays(S().date, li.dep) < 60) L.push({ w: 3.5, t: 'La liste : ' + li.n + ' noms sur ' + li.need + ', dépôt le ' + E.fmtDate(li.dep) + '. À ce rythme, on n’y arrivera pas. Une liste incomplète est irrecevable.', opts: [{ l: 'Je passe des coups de fil cette semaine (2 h)', v: 2.5, k: 'recruit', tag: 'strat' }, { l: 'L’équipe s’en charge', v: -0.5, k: 'non' }] });
    const z = weakZone(); if (z && z.cover < 25) L.push({ w: 2.2, t: 'Le secteur « ' + z.name + ' » n’est couvert qu’à ' + Math.round(z.cover) + ' %. Je mets les militants dessus cette semaine ?', data: { z: z.id }, opts: [{ l: 'Oui, cap sur ce secteur', v: 2, k: 'zone', tag: 'terrain' }, { l: 'Non, on garde la répartition', v: -0.5, k: 'non' }] });
    if (behind) L.push({ w: 1.8, t: c.rival.name + ' est devant. Il faut le·la faire descendre : on prépare une attaque sur son point faible ?', data: { x: c.rival.id }, opts: [{ l: 'Préparer l’attaque', v: 1.8, k: 'act:attack', tag: 'strat' }, { l: 'On reste positifs', v: 0, k: 'non' }] });
    const sug = edlSuggest().find(x => !edlOf(x.t)); if (sug && c.dl < 30) L.push({ w: 1.5, t: 'On n’a pas d’éléments de langage sur ' + E.thArt(sug.t) + (sug.why ? ' (' + sug.why + ')' : '') + '. Au prochain débat, on va se faire cueillir.', data: { t: sug.t }, opts: [{ l: 'Préparer la fiche', v: 1.6, k: 'edl', tag: 'com' }, { l: 'Plus tard', v: -0.3, k: 'non' }] });
    if (!L.length) L.push({ w: 1, t: E.fresh('dcok', ['Les chiffres sont bons. On ne relâche rien : terrain, terrain, terrain.', 'RAS. On tient le cap.', 'Ça avance. Je veux voir tout le monde sur le marché samedi.']) });
    const it = wpick(L, x => x.w);
    return { lane: 'dc', t: '📋 Point de la semaine. ' + it.t, data: it.data || {}, opts: it.opts };
  }
  function pointRes(k, d) {
    if (k === 'non') return { lane: 'dc', t: E.fresh('dcno', ['C’est toi qui vois.', 'Ok. Je note.', 'Je ne suis pas d’accord, mais c’est ta campagne.']) };
    if (k === 'recruit') { const r = recruit(false); return { lane: 'dc', t: r.ok ? r.msg : 'Il te faudra deux heures, cette semaine.' }; }
    if (k === 'zone') { P().focusZone = d.z; return { lane: 'terrain', t: 'Je réoriente les équipes de porte-à-porte dès demain 👍' }; }
    if (k === 'edl') return { act: 'edl:' + d.t, lane: 'com', t: 'Je m’y mets.' };
    if (k.startsWith('act:')) return { act: k.slice(4), lane: 'dc', t: 'Parfait.' };
    if (k.startsWith('go:')) return { act: k, lane: 'dc', t: 'Allons-y.' };
    return { lane: 'dc', t: 'Ok.' };
  }

  /* ---------- ripostes aux adversaires ---------- */
  function fromRival(q) {
    if (!active()) return false; const x = S().pnj[q.pnj]; if (!x) return false; const sup = supporter();
    const th = typeof A !== 'undefined' && A.themeOf ? A.themeOf(q.text || '') : 'institutions'; const has = !!p0().dossiers.find(dd => dd.on === x.id);
    const el2 = edlOf(th);
    if (q.type === 'attaque') {
      post('com', '🔴 ' + x.name + ' (' + short(x) + ') nous attaque sur X : « ' + q.text + ' » Il faut répondre avant ce soir, sinon ça va tourner.', { tpl: 'riposte', data: { q, theme: th },
        opts: [{ l: 'Riposte factuelle : communiqué rédigé par l’équipe', sub: el2 ? '📎 Éléments de langage prêts' : 'Pas d’éléments de langage sur ce thème', v: 1.4 + (el2 ? 0.8 : 0), k: 'fact', tag: 'com' },
          { l: 'Contre-attaque sur son bilan et ses contradictions', sub: has ? 'Vous avez un dossier sur lui·elle' : 'Risqué sans munitions', v: 0.9 + (has ? 0.7 : 0), k: 'contre', tag: 'strat' },
          sup ? { l: 'Faire riposter ' + sup.name, sub: 'Un soutien monte au créneau à votre place', v: 1.3, k: 'soutien', data: sup.id, tag: 'strat' } : null,
          { l: 'Répondre avec mes propres mots', v: null, k: 'write' },
          { l: 'Laisser couler', v: 0.2, k: 'ignore' }].filter(Boolean), def: -1 });
      return true;
    }
    if (q.type === 'rumeur') {
      post('dc', '⚠️ L’entourage ' + E.de(x.name) + ' fait courir le bruit que tu ' + q.text + '. Ça commence à remonter du terrain.', { tpl: 'rumeur', data: { q },
        opts: [{ l: 'Démentir publiquement', v: 1.2, k: 'dementi', tag: 'com' }, { l: 'Porter plainte en diffamation (2 500 €)', v: 0.6, k: 'plainte', tag: 'orga' }, sup ? { l: 'Faire témoigner ' + sup.name + ' en ma faveur', v: 1.4, k: 'soutien', data: sup.id, tag: 'strat' } : null, { l: 'Ignorer', v: 0.4, k: 'ignore' }].filter(Boolean), def: -1 });
      return true;
    }
    if (q.type === 'critique') {
      const m = p0().prog.find(z => z.id === q.mes); if (!m) return false; const e2 = edlOf(m.theme);
      post('com', '🔴 ' + x.name + ' démonte notre proposition « ' + m.resume + ' » : ' + q.text, { tpl: 'critique', data: { q, theme: m.theme },
        opts: [{ l: 'La défendre, chiffres à l’appui', sub: 'Crédibilité ' + Math.round(m.cred) + '/100' + (e2 ? ' · 📎 éléments de langage prêts' : ''), v: (m.cred - 45) / 20 + (e2 ? 0.8 : 0), k: 'chiffrer', tag: 'com' }, { l: 'La retirer', sub: 'Fin de la polémique, mais on recule', v: m.cred < 35 ? 1 : -0.5, k: 'retirer', tag: 'orga' }, { l: 'Laisser dire', v: 0.2, k: 'ignore' }], def: -1 });
      return true;
    }
    return false;
  }
  const p0 = () => P();
  function ripRes(tpl, k, d, o, late) {
    const s = S(), p = P(); const q = d.q; const x = s.pnj[q.pnj]; if (!x) return { lane: 'dc', t: 'Il·elle a disparu des radars.' };
    if (late) { const r = E.rivalResolve(q, 'ignore'); IMA(-0.4); return { lane: 'dc', t: 'Pas de réponse de notre part : ' + r.charAt(0).toLowerCase() + r.slice(1) + ' On a laissé passer la fenêtre.' }; }
    if (tpl === 'riposte') {
      if (k === 'ignore') { const r = E.rivalResolve(q, 'ignore'); return { lane: 'dc', t: r }; }
      if (k === 'write') return { act: 'write:' + q.pnj + ':' + encodeURIComponent(q.text), lane: 'com', t: 'Ok, à toi la plume ✍️' };
      if (k === 'fact') { const pr = 0.42 + member('com').comp / 260 + edlBonus(d.theme) + (p.cred - 50) / 250 + (dcStyle() === 'com' ? 0.08 : 0); edlUse(d.theme);
        if (R() < pr) { IMA(1.2); p.cred = clamp(p.cred + 1, 0, 100); x.mom -= 0.02; E.article('dauph', p.name + ' répond point par point à ' + x.name, 0.2, 'pj'); return { lane: 'com', t: 'Communiqué parti, repris par Le Dauphinois. Les chiffres sont de notre côté ✅' }; }
        IMA(-0.3); return { lane: 'com', t: 'Communiqué parti… mais personne ne l’a repris. Leur attaque a plus circulé que notre réponse.' }; }
      if (k === 'contre') { const dos = p.dossiers.find(dd => dd.on === x.id); const pr = 0.38 + dcK() * 0.25 + (dos ? 0.22 : 0) + (['maire', 'depute', 'baron'].includes(x.role) ? 0.1 : 0) + edlBonus(d.theme) * 0.5;
        x.rel -= 8; hq().atk[x.id] = { n: ((hq().atk[x.id] || {}).n || 0) + 1, date: s.date };
        if (R() < pr) { x.mom -= 0.04; x.img -= 2; E.addNoto(scopeKey(), 1.5); E.article('dauph', 'Passe d’armes : ' + p.name + ' renvoie ' + x.name + ' à son bilan', 0.15, 'pj'); return { lane: 'dc', t: 'Bien joué. Il·elle est sur la défensive maintenant.' }; }
        IMA(-1.2); return { lane: 'dc', t: 'On se roule dans la boue avec lui·elle. C’était ce qu’il·elle cherchait.' }; }
      if (k === 'soutien') { const sp = s.pnj[o.data]; if (sp && R() < 0.62 + sp.rel / 300) { IMA(0.9); x.mom -= 0.01; sp.rel -= 1; return { lane: 'com', t: sp.name + ' a répondu à notre place, et sèchement. Ça a du poids venant de lui·elle.' }; } return { lane: 'com', t: (sp ? sp.name : 'Notre soutien') + ' a trop tardé, ça n’a pas pris.' }; }
    }
    if (tpl === 'rumeur') {
      if (k === 'soutien') { const sp = s.pnj[o.data]; if (sp && R() < 0.6 + sp.rel / 250) { IMA(0.6); p.cred = clamp(p.cred + 1, 0, 100); return { lane: 'dc', t: sp.name + ' a démenti pour toi, la rumeur retombe.' }; } const r = E.rivalResolve(q, 'ignore'); return { lane: 'dc', t: 'Le témoignage n’a pas suffi. ' + r }; }
      return { lane: 'dc', t: E.rivalResolve(q, k) };
    }
    if (tpl === 'critique') {
      if (k === 'chiffrer') { const m = p.prog.find(z => z.id === q.mes); const e2 = edlOf(d.theme); if (m && e2) { m.cred = clamp(m.cred + e2.q / 6, 0, 100); edlUse(d.theme); } const r = E.rivalResolve(q, 'chiffrer'); if (m && e2) m.cred = clamp(m.cred - e2.q / 9, 0, 100); return { lane: 'com', t: r }; }
      return { lane: 'dc', t: E.rivalResolve(q, k) };
    }
    return { lane: 'dc', t: 'Ok.' };
  }

  /* ---------- trancher une décision ---------- */
  // mode : 'me' (le joueur), 'dc' (délégué à la direction de campagne), 'late' (personne n'a tranché)
  function decide(id, i, mode) {
    mode = mode || 'me'; const late = mode === 'late';
    const h = hq(), p = P(); const m = h.boucle.find(z => z.id === id); if (!m || !m.dec || m.dec.done != null) return { ok: false, msg: 'Déjà tranché.' };
    const dec = m.dec; let o = dec.opts[i]; if (!o) return { ok: false, msg: '' };
    if (mode === 'me') { if (o.h && p.hours < o.h) return { ok: false, msg: 'Il vous faut ' + o.h + ' h.' }; if (o.cost && !cashOk(o.cost)) return { ok: false, msg: 'Pas assez d’argent pour ça.' }; if (o.need && !p.staff.some(x => x.role === o.need)) return { ok: false, msg: 'Vous n’avez pas de ' + D.STAFF_ROLES[o.need].l.toLowerCase() + '.' }; if (o.h) p.hours -= o.h; }
    if (mode === 'dc' && ((o.cost && !cashOk(o.cost)) || (o.need && !p.staff.some(x => x.role === o.need)))) { i = dec.def >= 0 ? dec.def : dec.opts.length - 1; o = dec.opts[i]; }
    dec.done = i; dec.by = mode; m.read = true;
    if (mode === 'me') me(o.l);
    let r; const tpl = dec.tpl;
    if (tpl === 'riposte' || tpl === 'rumeur' || tpl === 'critique') r = ripRes(tpl, o.k, dec.data, o, late);
    else if (tpl === 'fusion') r = fusRes(o.k, dec.data, o);
    else { try { r = T[tpl] && T[tpl].res ? T[tpl].res(o.k, dec.data || {}, late) : { lane: 'dc', t: 'Ok.' }; } catch (e) { r = { lane: 'dc', t: 'Ce n’est plus d’actualité.' }; } }
    const d = dc(); let side = '';
    if (d && dec.rec != null && !dec.norec && mode === 'me') {
      if (dec.rec === i) { h.trust = clamp(h.trust + 3, 0, 100); h.dis = Math.max(0, h.dis - 0.5); }
      else { h.trust = clamp(h.trust - 4, 0, 100); h.dis += 1; if (R() < 0.5) side = E.fresh('dcig', ['Ok, c’est toi qui vois.', 'Je ne suis pas d’accord, mais on y va.', 'Je note.', 'Comme tu veux.']); }
    }
    if (r && r.t) post(r.lane || 'dc', r.t);
    if (side) post('dc', side);
    if (r && r.act && mode === 'me') S()._hqAct = r.act;
    return { ok: true, msg: r ? r.t : '' };
  }
  function expire(m) { const d = dc(); const dec = m.dec; if (d && !dec.norec && !dec.noauto && dec.rec != null && dec.opts[dec.rec] && dec.opts[dec.rec].v != null && !String(dec.opts[dec.rec].k).startsWith('act:') && !String(dec.opts[dec.rec].k).startsWith('go:')) return decide(m.id, dec.rec, 'dc'); return decide(m.id, dec.def >= 0 ? dec.def : dec.opts.length - 1, 'late'); }

  /* ---------- tick ---------- */
  function ctx() {
    const s = S(), p = P(); const e = el(); const dl = E.daysLeft(); const est = s.est && e && s.est.el === e.id ? s.est : null;
    let inT2 = false; if (e && e.status === 't1' && e.races && p.cand) { const r = e.races[p.cand.key]; inT2 = !!(r && (r.t2 || []).includes('PJ')); }
    return { s, p, el: e, dl, t2: e && e.status === 't1', inT2, round: e && e.status === 't1' ? 2 : 1, est, rival: topRival(), sup: supporter(), lead: leads(), f: k => !!hq().flags[k] };
  }
  function spawn(id, c, x) { const tp = T[id]; const o = tp.mk(x || c); if (!o) return; hq().used[id] = S().date; if (!o.opts) { post(o.lane, o.t); return; } post(o.lane, o.t, { tpl: id, data: o.data || {}, opts: o.opts, def: o.def == null ? o.opts.length - 1 : o.def, norec: o.norec, noauto: o.noauto }); }
  // Petite commune : peu de messages, que du concret (pas de presse, de fédération, de nuance politique…)
  const PETITE_OK = ['voisin', 'fete', 'secretaire', 'bulletin', 'apero', 'epuise', 'parite', 'pieces', 'soiree', 'fin', 'affiches', 'salle', 'tracts', 'adjsortant', 'victoire', 'lendemain'];
  function tick(days) {
    const s = S(), p = P(), h = hq();
    // expiration des décisions
    h.boucle.filter(m => m.dec && m.dec.done == null && m.dec.exp < s.date).forEach(expire);
    // nouvelle campagne ?
    if (p.cand && h.camp !== p.cand.el) { h.camp = p.cand.el; h.campKey = p.cand.key; h.flags = {}; h.dis = 0; h.year = s.date.slice(0, 4); ensureCore(); initListe(); const e0 = el(); if (petite() && leads()) villageIntro(e0); h.tracts = e0 && ['mun', 'dep'].includes(e0.type) ? (petite() ? Math.max(800, Math.round(E.commune().pop * 3)) : 2000) : 5000; h.tractsDue = 0; }
    if (active() && h.tracts != null) { if (h.tractsDue) { h.tracts += h.tractsDue; h.tractsDue = 0; } if (typeof TM !== 'undefined') { const a = TM.team().alloc; h.tracts = Math.max(0, h.tracts - TM.force() * Math.min(days, 14) * (a.tract * 1.2 + a.porte * 0.4 + a.affiches * 0.2) / 100 * 3 * (petite() ? 0.35 : 1)); } }
    // résultats
    const r0 = s.results[0]; const rk = r0 ? r0.el + ':' + r0.round + ':' + r0.date : null;
    if (r0 && rk !== h.seen && r0.el === h.camp) { h.seen = rk; if (!fusedResult(r0)) afterResults(r0); }
    // recrutement de la direction de campagne : relances
    if (active() && leads()) {
      const d = dc();
      if (d) { const f = days / 30;
        if (d.style === 'terrain') motiv(1.5 * f * dcK());
        h.trust = clamp(h.trust + (h.moral - 55) / 60 * f, 0, 100);
        moral(((s.est && s.estPrevBase && s.est.pct > s.estPrevBase.pct) ? 1.2 : -0.6) * f + (60 - h.moral) * Math.max(0.08, 0.3 * f)); h.trust = clamp(h.trust + (60 - h.trust) * 0.04 * f, 0, 100);
        if (typeof TM !== 'undefined') motiv((h.moral - 60) / 40 * f);
        if (h.trust < 14) { resign(d); }
      } else moral((60 - h.moral) * Math.max(0.08, 0.3 * days / 30));
      listeTick(days / 30); if (!p.cand) { cabTick(days); return; }
      if (h.flags && !h.flags.recus && h.flags.recusLost && p.cand.compte) { const lost = rint(300, 900); if (p.cand.compte.dons > lost) { p.cand.compte.dons -= lost; p.cand.compte.recettes -= lost; } }
      // messages de l'équipe
      const c = ctx(); let nd = 0, ni = 0; const maxD = c.dl < 10 ? 2 : 1; const isDec = id => id !== 'revue' && id !== 'analyse1'; const skipD = petite() && R() < 0.45;
      h.pend = h.pend.filter(x => { if (!T[x.tpl]) return false; if (nd >= maxD + 1) return true; spawn(x.tpl, c, x.mk ? x : null); nd++; return false; });
      const cands = Object.keys(T).filter(id => { const tp = T[id]; const last = h.used[id]; if (last && E.diffDays(last, s.date) < tp.cd) return false; if (petite() && !PETITE_OK.includes(id) && !(dc() && id === 'point')) return false; return tp.w(c) > 0; });
      while (cands.length) { const id = wpick(cands, k => T[k].w(c)); cands.splice(cands.indexOf(id), 1);
        if (isDec(id)) { if (nd >= maxD || pending().length >= (petite() ? 2 : 3) || skipD) continue; nd++; } else { if (ni >= 1) continue; ni++; }
        spawn(id, c); }
    }
    else if (h.pend.length) { const c = ctx(); h.pend = h.pend.filter(x => { if (T[x.tpl]) spawn(x.tpl, c, x.mk ? x : null); return false; }); }
    cabTick(days);
  }
  function villageIntro(e) {
    const p = P(), com = E.commune(); const m = S().pnj && Object.values(S().pnj).find(x => x.role === 'maire' && x.territory === p.communeId);
    const part = E.sortantPart(e, p.cand.key); const l = p.cand.liste;
    post('orga', '👋 Bienvenue dans la campagne ' + E.de(com.name) + ' (' + com.pop.toLocaleString('fr-FR') + ' habitants). Ici, pas de parti ni d’étiquette : une liste de ' + (l ? l.need : D.councilSize(com.pop)) + ' personnes du village, un projet simple, et beaucoup de porte-à-porte. ' + (part ? 'Grande nouvelle : ' + (m ? m.name : 'le maire') + ' ne se représente pas. Son premier adjoint reprend le flambeau, mais il est moins connu : la place est à prendre.' : (m ? m.name : 'Le maire sortant') + ' se représente. Tout le monde le connaît : il faudra aller chercher les habitants un par un.'));
  }
  function resign(d) {
    const p = P(), h = hq(); p.staff = p.staff.filter(x => x.id !== d.id); IMA(-2); moral(-20); p.mom -= 0.03;
    E.article('dauph', 'Le directeur de campagne ' + E.de(p.name) + ' claque la porte', -0.5, 'pj'); E.log(d.name + ' quitte la direction de votre campagne.', 'bad');
    h.boucle.unshift({ id: E.uid('b'), date: S().date, lane: 'dc', name: d.name, lbl: 'Direction de campagne', t: 'J’en ai tiré les conséquences : je quitte la direction de campagne. Bonne chance à tous.', read: false });
    if (d.pnj && S().pnj[d.pnj]) S().pnj[d.pnj].rel -= 20; h.trust = 50;
  }
  function afterResults(r0) {
    const s = S(), p = P(), h = hq(); const sn = r0.snapshot[0]; if (!sn) return; const row = (sn.rows || []).find(x => x.id === 'PJ'); if (!row) return;
    const u = E.unit(sn.key); const lab = row.party || (p.party === 'NEW' ? 'DIV' : p.party); const b0 = u && u.base ? (u.base[lab] || u.base[p.party] || 0) : 0; const base = b0 > 1 ? b0 : b0 * 100;
    const diff = base ? row.pct - base : 0; const elT = (S().elections.find(x => x.id === r0.el) || {}).type; const won = sn.winner === 'PJ' || (elT !== 'mun' && sn.seats && sn.seats.PJ); const oppSeats = elT === 'mun' && !won && sn.seats ? (sn.seats.PJ || 0) : 0; const inT2 = (sn.t2 || []).includes('PJ');
    if (r0.round === 1 && !won) {
      let t = 'Si on compare avec le socle habituel de notre famille politique ici (' + E.pct(base) + '), on fait ' + (diff >= 0 ? '+' : '') + diff.toFixed(1).replace('.', ',') + ' points. ';
      t += diff > 3 ? 'C’est très bien : ça démontre une campagne de terrain efficace, qui a porté ses fruits. ' : diff < -3 ? 'On n’a pas imprimé. Il faudra comprendre pourquoi. ' : 'Conforme à notre socle, ni plus ni moins. ';
      if (S().elections.find(x => x.id === r0.el)?.type === 'mun') fusionOffer(r0, sn);
      if (inT2) { const blocs = [...new Set(rivals().filter(x => !(sn.t2 || []).includes(x.id)).map(x => D.PARTIES[x.party].short))].slice(0, 2); t += 'Mais j’ai peur que ce levier ne suffise pas au second tour : il va falloir des tractations' + (blocs.length ? ' avec les ' + blocs.join(' et les ') : '') + ' pour qu’ils guident des voix. Haut les cœurs, on est encore là !'; }
      else t += 'C’est fini pour nous cette fois' + (oppSeats ? ', mais nous aurons ' + oppSeats + ' élu' + (oppSeats > 1 ? 's' : '') + ' d’opposition au conseil municipal' : '') + '. Merci à tous, vous avez été formidables.';
      post('dc', '📊 ' + t);
      if (!inT2 && !h.pend.some(x => x.tpl === 'fusion')) { dissolve(); h.pend.push({ tpl: 'lendemain', at: s.date }); }
    } else if (won) { post('dc', '🎉 ' + E.pct(row.pct) + ' ! ' + (diff > 3 ? 'Bien au-dessus de notre socle : le terrain a payé.' : 'Victoire. On savoure ce soir, on travaille demain.')); moral(20); h.pend.push({ tpl: 'victoire', at: s.date }); h.alumniNext = true; }
    else { const w = (sn.rows || [])[0]; const gap = w && w.votes && row.votes ? w.votes - row.votes : null; post('orga', '😪 ' + (w && S().pnj[w.id] ? S().pnj[w.id].name : 'L’adversaire') + ' l’emporte' + (gap ? ' avec ' + gap.toLocaleString('fr-FR') + ' voix d’écart' : '') + '. ' + E.fresh('lose2', ['Je retourne à ma grotte.', 'Quelle angoisse, jusqu’au bout.', 'On a tout donné.'])); dissolve(); h.pend.push({ tpl: 'lendemain', at: s.date }); moral(-15); }
  }
  function dissolve() { const h = hq(); h.core.forEach(c => { if (!h.alumni.some(a => a.name === c.name)) h.alumni.push({ name: c.name, g: c.g, lane: c.lane, comp: c.comp, loy: c.loy, year: h.year }); }); h.alumni = h.alumni.slice(-10); h.core = []; }

  /* ---------- constitution de la liste (municipales) ---------- */
  function initListe() { const p = P(), e = el(); if (!e || e.type !== 'mun' || !leads() || p.cand.liste) return; const com = E.commune(); const need = D.councilSize(com.pop) - (com.pop < 1000 ? 2 : 0); const net = clamp((p.noto.commune || 0) / 100 + (p.militants || 0) / 80 + (p.mandats.length ? 0.15 : 0), 0.1, 0.7); const n = Math.max(2, Math.round(need * net)); const dep = E.addDays(e.d1, -25); p.cand.liste = E.diffDays(S().date, dep) < 12 ? { need, n: need, f: Math.ceil(need / 2), dep, closed: true } : { need, n, f: Math.min(Math.ceil(need / 2), Math.round(n * 0.45)), dep, closed: false }; }
  // Recrutement de colistiers : la liste ne dépasse pas le nombre requis, et l'alternance femme-homme impose
  // de trouver autant de femmes que d'hommes (un profil qui ne rentre pas dans la parité est mis en réserve).
  const parT = l => [Math.ceil(l.need / 2), Math.floor(l.need / 2)];
  function fixListe(l) { const [wT, mT] = parT(l); l.f = clamp(l.f, 0, wT); l.n = clamp(l.n, l.f, Math.min(l.need, l.f + mT)); }
  function addPeople(l, k) { const [wT, mT] = parT(l); let got = 0, res = 0; for (let i = 0; i < k; i++) { if (l.n >= l.need) break; const m = l.n - l.f; const woman = R() < 0.42; if (woman && l.f < wT) { l.f++; l.n++; got++; } else if (!woman && m < mT) { l.n++; got++; } else if (l.f < wT && R() < 0.45) { l.f++; l.n++; got++; } else if (m < mT && R() < 0.45) { l.n++; got++; } else res++; } return [got, res]; }
  function parityNote(l) { const [wT, mT] = parT(l); const w = wT - l.f, m = mT - (l.n - l.f); if (l.n >= l.need) return 'Liste complète, alternance femme-homme respectée.'; if (w > m + 1) return 'Pour respecter l’alternance femme-homme, il manque surtout des candidates.'; if (m > w + 1) return 'Pour respecter l’alternance femme-homme, il manque surtout des candidats.'; return 'Alternance femme-homme : en bonne voie.'; }
  function recruit() { const p = P(); const l = p.cand && p.cand.liste; if (!l || l.closed) return { ok: false, msg: 'La liste est déjà déposée.' }; fixListe(l); if (l.n >= l.need) return { ok: false, msg: 'La liste est complète.' }; if (p.hours < 2) return { ok: false, msg: 'Il faut 2 h.' }; p.hours -= 2;
    const base = 1 + (p.noto.commune || 0) / 25 + (dcStyle() === 'strat' ? 1 : 0); const k = Math.max(1, Math.round(base + E.gauss())); const [got, res] = addPeople(l, k + 1); const refus = rint(0, 3);
    return { ok: true, msg: (got ? got + ' nouveau(x) colistier(s)' : 'Personne de plus cette fois') + (refus ? ', ' + refus + ' refus' : '') + (res ? ', ' + res + ' volontaire(s) en réserve (la parité est déjà atteinte de ce côté)' : '') + '. Liste : ' + l.n + '/' + l.need + '.' }; }
  function listeTick(f) {
    const p = P(); const l = p.cand && p.cand.liste; if (!l || l.closed) return; const g = (l.need * 0.022 + (p.noto.commune || 0) / 120) * f * 4 * (0.6 + hq().moral / 150) * (E.DF ? E.DF().recrue : 1);
    fixListe(l); const add = Math.max(0, Math.round(g + E.gauss() * 0.6)); addPeople(l, add);
    if (S().date >= l.dep) { l.closed = true; const [wT, mT] = parT(l); let miss = Math.max(0, l.need - l.n) + Math.max(0, wT - l.f) + Math.max(0, mT - (l.n - l.f)) + (l.pieces === false ? 2 : 0);
      if (!miss) { E.log('Liste déposée en préfecture : ' + l.need + ' candidats, parité respectée.', 'good'); post('orga', 'Liste déposée en préfecture ✅ ' + l.need + ' noms, alternance femme-homme respectée. Récépissé en poche.'); return; }
      if (l.n >= l.need * (E.DF ? E.DF().liste : 0.7)) { const pen = Math.min(6, 1 + miss / 3); p.cred = clamp(p.cred - pen, 0, 100); IMA(-pen / 3); moral(-5); E.article('dauph', 'La liste ' + E.de(p.name) + ' bouclée in extremis', -0.2, 'pj'); post('orga', 'On a bouclé à 17 h 55, avec ' + miss + ' noms trouvés dans la journée. Récépissé obtenu, mais ça s’est vu.'); l.n = Math.max(l.n, l.need); l.f = Math.max(l.f, wT); return; }
      E.article('dauph', 'Municipales : la liste ' + E.de(p.name) + ' déclarée irrecevable', -0.8, 'pj'); E.log('Liste incomplète ou non paritaire : candidature irrecevable.', 'bad'); p.irrec = (p.irrec || []).concat([p.cand.el]); post('orga', 'La préfecture refuse le dépôt : liste incomplète ou non paritaire. C’est fini pour cette élection 😩'); E.withdrawCand(); }
  }
  /* ---------- fusions de l'entre-deux-tours (communes de plus de 1 000 habitants) ---------- */
  function fusionOffer(r0, sn) {
    const s = S(), p = P(); const e = s.elections.find(x => x.id === r0.el); if (!e || e.type !== 'mun') return; const rows = sn.rows || []; const t2 = sn.t2 || []; const me = rows.find(x => x.id === 'PJ'); if (!me || me.pct < 5) return;
    const inT2 = t2.includes('PJ'); const ax = p.ax || [0, 0, 0, 0, 0, 0]; const close = x => { const pn = s.pnj[x.id]; return pn && Math.abs((pn.ax || D.PARTIES[pn.party].ax)[0] - ax[0]) < 70; };
    const opts = []; const dataO = { el: r0.el, key: sn.key, inT2 };
    rows.filter(x => x.id !== 'PJ' && !t2.includes(x.id) && x.pct >= 5 && s.pnj[x.id] && close(x)).slice(0, 1).forEach(x => opts.push({ l: 'Absorber la liste de ' + s.pnj[x.id].name + ' (' + E.pct(x.pct) + ')', sub: 'Ils demandent des places éligibles et qu’on reprenne leurs propositions phares', v: 1.6, k: 'abs:' + x.id + ':' + x.pct }));
    rows.filter(x => x.id !== 'PJ' && t2.includes(x.id) && s.pnj[x.id] && close(x) && x.id !== rows[0].id).slice(0, 1).forEach(x => { if (x.pct < me.pct && inT2) opts.push({ l: 'Proposer à ' + s.pnj[x.id].name + ' (' + E.pct(x.pct) + ') de se retirer et de nous rejoindre', sub: 'Il·elle exigera beaucoup de places', v: 1.2, k: 'abs2:' + x.id + ':' + x.pct }); else opts.push({ l: 'Fusionner derrière ' + s.pnj[x.id].name + ' (' + E.pct(x.pct) + ')', sub: 'Vous ne conduirez plus la liste, mais vous pouvez battre le sortant ensemble', v: x.pct > me.pct ? 1.4 : 0.6, k: 'join:' + x.id + ':' + me.pct }); });
    if (!opts.length) return;
    opts.push(inT2 ? { l: 'Se maintenir seul·e au second tour', v: 1, k: 'seul' } : { l: 'Pas de fusion : on s’arrête là', v: 0.5, k: 'seul' });
    hq().pend.push({ tpl: 'fusion', at: s.date, mk: { lane: 'dc', t: '🤝 Entre-deux-tours : les listes ont jusqu’à mardi 18 h pour déposer leur composition. Des fusions sont possibles. Certains points ne seront pas partageables, et des colistiers risquent de partir. On décide quoi ?', data: dataO, opts, def: opts.length - 1, noauto: true } });
  }
  function fusRes(k, d, o) {
    const s = S(), p = P(); const e = s.elections.find(x => x.id === d.el); const race = e && e.races && e.races[d.key]; if (!race || k === 'seul') { if (!d.inT2) { dissolve(); hq().pend.push({ tpl: 'lendemain', at: s.date }); } return { lane: 'dc', t: d.inT2 ? 'On y va seuls. On assume.' : 'Ok. On tourne la page.' }; }
    const [kind, id, pc] = k.split(':'); const x = s.pnj[id]; const pct = +pc || 0; const quit = rint(1, 4);
    moral(-8); if (p.cand && p.cand.liste) p.cand.liste.n -= quit;
    if (kind === 'abs' || kind === 'abs2') { if (kind === 'abs2') race.t2 = (race.t2 || []).filter(z => z !== id); p.mom += pct / 100 * 0.55; if (x) { x.rel += 10; } E.article('dauph', 'Second tour : ' + (x ? x.name : 'une liste') + ' fusionne avec ' + p.name, 0.2, 'pj'); return { lane: 'terrain', t: 'Fusion actée. ' + quit + ' colistier(s) refusent de figurer sur la liste fusionnée et quittent le groupe. On fait avec.' }; }
    if (kind === 'join') { race.t2 = (race.t2 || []).filter(z => z !== 'PJ'); if (x) { x.mom += pct / 100 * 0.55; x.rel += 15; } hq().fused = { x: id, el: d.el }; E.article('dauph', 'Second tour : ' + p.name + ' rejoint la liste de ' + (x ? x.name : 'son ancien adversaire'), 0.1, 'pj'); return { lane: 'terrain', t: 'Fusion décidée par la majorité de la liste. ' + quit + ' colistier(s) refusent de suivre. On rédige la nouvelle profession de foi chez nous ce soir.' }; }
    return { lane: 'dc', t: 'Ok.' };
  }
  function fusedResult(r0) {
    const h = hq(); const fu = h.fused; if (!fu || fu.el !== r0.el || r0.round !== 2) return false; h.fused = null; const sn = r0.snapshot[0]; const p = P(); const x = S().pnj[fu.x]; const com = E.commune();
    p.mandats = p.mandats.filter(m => !['maire', 'adjoint', 'conseiller_municipal'].includes(m.type));
    if (sn && sn.winner === fu.x) { p.mandats.push({ type: 'adjoint', label: 'Adjoint·e au maire ' + E.de(com.name), since: S().date, ind: D.adjIndemnity(com.pop), majority: true }); post('dc', '🎉 La liste fusionnée l’emporte ! Tu deviens adjoint·e au maire. Pas le premier rôle, mais une place au pouvoir.'); }
    else if (sn && sn.seats && (sn.seats[fu.x] || 0) > 0) { p.mandats.push({ type: 'conseiller_municipal', label: 'Conseiller·ère municipal·e d’opposition (' + com.name + ')', since: S().date, ind: 0, majority: false }); post('dc', '😪 Défaite au second tour, mais la liste fusionnée obtient ' + sn.seats[fu.x] + ' sièges : tu siégeras dans l’opposition. Le combat continue au conseil municipal.'); }
    else post('dc', 'Défaite au second tour. On a essayé ensemble.');
    dissolve(); return true;
  }

  /* ---------- attaques ---------- */
  const CHANNELS = { cp: { l: 'Communiqué de presse', h: 1, cost: 0, k: 1, segs: null, sub: 'Sérieux, repris par la presse locale' }, x: { l: 'Post sur X', h: 0, cost: 0, k: 0.85, segs: { JUD: 1.6, CAD: 1.2, POP: 0.8, PERI: 0.8, RET: 0.4, RUR: 0.5 }, sub: 'Immédiat, volatil, touche surtout les jeunes et les cadres' }, tract: { l: 'Tract ciblé dans les boîtes aux lettres', h: 2, cost: 400, k: 1.1, segs: { POP: 1.3, RUR: 1.3, PERI: 1.2, RET: 1.1, JUD: 0.5, CAD: 0.7 }, sub: 'Lent mais sûr, peu de risque de dérapage' }, meeting: { l: 'En réunion publique', h: 3, cost: 0, k: 1.25, segs: { RET: 1.4, POP: 1.2, RUR: 1.1, PERI: 1, JUD: 0.7, CAD: 0.8 }, sub: 'Fort impact, et ça mobilise vos troupes' } };
  function angles(xid) {
    const s = S(), p = P(); const x = s.pnj[xid]; if (!x) return []; const L = [];
    const weak = (x.prog || []).find(pr => ['aucun', 'dette', 'croissance'].includes(pr.fin)); const dos = p.dossiers.find(d => d.on === x.id && !d.used);
    if (['maire', 'depute', 'baron', 'leader', 'federal'].includes(x.role) || x.mandat) L.push({ k: 'bilan', l: 'Son bilan', sub: 'Ce qu’il·elle a fait (ou pas) de son mandat', base: 0.52, th: 'institutions' });
    if (weak) L.push({ k: 'prog', l: 'Sa proposition « ' + weak.label + ' »', sub: 'Pas de financement crédible', base: 0.6, th: weak.th || 'fiscalite', pr: weak.id });
    if (dos) L.push({ k: 'dossier', l: 'Le dossier : ' + dos.label, sub: 'Coup dur, mais risque de « coup bas »', base: 0.72, dirty: 0.28, th: 'institutions', d: dos.id });
    if ((x.noto || 30) < 40 || x.territory !== p.communeId) L.push({ k: 'absent', l: 'Son absence du terrain', sub: 'Inconnu·e ici, parachuté·e', base: 0.45, th: 'institutions' });
    if ((s.national.climate[x.party] || 0) < -0.02 || (s.national.gov || []).includes(x.party)) L.push({ k: 'etiquette', l: 'Son étiquette ' + short(x), sub: (s.national.gov || []).includes(x.party) ? 'Le bilan du gouvernement lui colle à la peau' : 'Son parti est au plus bas', base: 0.5, th: 'institutions' });
    L.push({ k: 'contra', l: 'Ses contradictions', sub: 'Ce qu’il·elle disait hier, ce qu’il·elle dit aujourd’hui', base: 0.42, th: pick(Object.keys(D.THEMES)) });
    return L;
  }
  function attackChance(xid, ang, ch) { const x = S().pnj[xid]; const a = hq().atk[xid]; const rep = a && E.diffDays(a.date, S().date) < 30 ? a.n : 0;
    return clamp(ang.base + (dcStyle() === 'strat' ? 0.08 : 0) + dcK() * 0.12 + edlBonus(ang.th) * 0.8 + (P().cred - 50) / 300 - rep * 0.1 - ((x.traits || {}).charisme - 50) / 400, 0.12, 0.88); }
  function attack(xid, ak, chk) {
    const s = S(), p = P(); const x = s.pnj[xid]; const ang = angles(xid).find(a => a.k === ak); const ch = CHANNELS[chk]; if (!x || !ang || !ch) return { ok: false, msg: '' };
    if (p.hours < ch.h) return { ok: false, msg: 'Il faut ' + ch.h + ' h.' }; if (ch.cost && !cashOk(ch.cost)) return { ok: false, msg: 'Pas assez d’argent.' };
    p.hours -= ch.h; if (ch.cost) spendC(ch.cost, 'Tract d’attaque');
    const pr = attackChance(xid, ang, ch); const ok = R() < pr; const k = ch.k; const a = hq().atk[xid] || { n: 0 }; hq().atk[xid] = { n: (E.diffDays(a.date || s.date, s.date) < 30 ? a.n : 0) + 1, date: s.date };
    x.rel -= 10; x.known = true; edlUse(ang.th); if (chk === 'meeting') camp('meet', 1);
    if (ang.k === 'dossier') { const d = p.dossiers.find(z => z.id === ang.d); if (d) d.used = true; }
    if (ang.k === 'prog' && typeof DP !== 'undefined' && DP.attackProp && ok) { try { DP.attackProp(x.id, ang.pr, 'cout'); } catch (e) { } }
    let msg;
    if (ok) { x.mom -= 0.03 * k; x.img -= 2.5 * k * (ang.k === 'dossier' ? 1.5 : 1); x.noto = clamp(x.noto + 0.5, 0, 100); D.SEG_IDS.forEach(g => IM(g, 0.9 * k * (ch.segs ? ch.segs[g] : 1))); E.addNoto(scopeKey(), 1);
      E.article(chk === 'x' ? 'ventilo' : 'dauph', p.name + ' charge ' + x.name + ' : ' + ang.l.charAt(0).toLowerCase() + ang.l.slice(1), 0.1, 'pj');
      msg = 'L’attaque porte : ' + x.name + ' est sur la défensive.'; if (active()) post('dc', E.fresh('atok', ['Touché. On a vu le message repris partout ce soir.', 'Ça a porté. Maintenant on attend sa riposte : préparez-vous.', 'Bien. Pas de deuxième salve tout de suite, on laisse infuser.'])); }
    else { D.SEG_IDS.forEach(g => IM(g, -1.2 * (ch.segs ? ch.segs[g] : 1))); p.cred = clamp(p.cred - 1, 0, 100); x.mom += 0.01;
      msg = 'L’attaque tombe à plat : on y voit surtout de l’acharnement.'; if (active()) post('dc', 'Ça n’a pas pris. On a eu l’air agressifs pour rien.'); }
    if (ang.dirty && R() < ang.dirty) { IMA(-2); E.article('dauph', 'Campagne : ' + p.name + ' accusé·e de coups bas', -0.4, 'pj'); msg += ' Et une partie de la presse parle de coup bas.'; }
    if (R() < 0.35 + (x.traits.rancune || 50) / 250) s.queue.push({ kind: 'rival', type: 'attaque', pnj: x.id, text: E.fresh('ripx', ['Mon adversaire n’a pas de projet, alors il attaque. Moi je parle aux habitants.', 'Quand on n’a rien à proposer, on salit. Les électeurs ne sont pas dupes.', 'Je ne répondrai pas aux attaques personnelles. Je parle de vos problèmes.', 'Ces attaques montrent surtout la fébrilité ' + E.de(p.name) + '.']) });
    return { ok: true, msg, hit: ok };
  }

  /* ---------- projet de campagne ---------- */
  const SEG_TH = { JUD: ['ecologie', 'logement', 'transports'], POP: ['pouvoir_achat', 'securite', 'sante'], RET: ['sante', 'securite', 'fiscalite'], PERI: ['transports', 'pouvoir_achat', 'education'], CAD: ['economie', 'fiscalite', 'education'], RUR: ['agriculture', 'transports', 'sante'] };
  function lvl() { const e = el(); return e && ['mun', 'dep', 'reg', 'sen'].includes(e.type) ? 'local' : 'national'; }
  function concernsTrue() {
    const s = S(), p = P(); if (!p.cand) return null; const u = E.unit(p.cand.key); const mix = u && u.mix ? u.mix : [1, 1, 1, 1, 1, 1]; const sal = s.national.salience || {}; const o = {};
    D.SEGS.forEach((g, i) => (SEG_TH[g.id] || []).forEach((t, j) => o[t] = (o[t] || 0) + mix[i] * [1, 0.7, 0.5][j]));
    for (const t in sal) o[t] = (o[t] || 0) + sal[t] * (lvl() === 'national' ? 1.4 : 0.7);
    let seed = 0; for (const ch of String(p.cand.key)) seed = (seed * 31 + ch.charCodeAt(0)) % 9973; Object.keys(o).forEach((t, i) => o[t] *= 0.85 + ((seed * (i + 7)) % 31) / 100);
    const L = Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 5); const tot = L.reduce((a, x) => a + x[1], 0) || 1; return L.map(([t, w]) => ({ t, w: w / tot }));
  }
  function concerns() { const p = P(); return p.cand && p.cand.concerns ? p.cand.concerns.list : null; }
  const CONSULT = { web: { l: 'Questionnaire en ligne', h: 1, cost: 300, n: 3, sub: '1 h · 300 € · 3 préoccupations révélées, échantillon biaisé' }, ecoute: { l: 'Porte-à-porte d’écoute dans tous les quartiers', h: 5, cost: 0, n: 5, sub: '5 h · tout le tableau, et les habitants s’en souviennent' }, atelier: { l: 'Ateliers citoyens', h: 4, cost: 400, n: 5, sub: '4 h · 400 € · tout le tableau, crédibilité accrue' } };
  function consult(k) {
    const p = P(); const c = CONSULT[k]; if (!p.cand) return { ok: false, msg: 'Il faut être candidat·e.' }; if (p.hours < c.h) return { ok: false, msg: 'Il faut ' + c.h + ' h.' }; if (c.cost && !cashOk(c.cost)) return { ok: false, msg: 'Pas assez d’argent.' };
    p.hours -= c.h; if (c.cost) spendC(c.cost, 'Consultation citoyenne');
    let L = concernsTrue(); if (k === 'web') { L = L.slice(0, 3); const jud = L.findIndex(x => x.t === 'ecologie'); if (jud < 0 && L.length) L[L.length - 1] = { t: 'ecologie', w: L[L.length - 1].w }; }
    p.cand.concerns = { list: L, date: S().date, depth: c.n };
    if (k === 'ecoute') { IM('POP', 1.5); IM('RUR', 1.5); IM('RET', 1); E.addNoto(scopeKey(), 1.5); }
    if (k === 'atelier') { p.cred = clamp(p.cred + 2, 0, 100); IM('CAD', 1); IM('JUD', 1); }
    post('dc', 'Résultats de la consultation : ' + L.map((x, i) => (i + 1) + '. ' + D.THEMES[x.t].l.toLowerCase() + ' (' + Math.round(x.w * 100) + ' %)').join(' · ') + '. Le programme doit répondre à ça.');
    return { ok: true, msg: 'Ce qui préoccupe les électeurs : ' + L.map(x => D.THEMES[x.t].l).join(', ') + '.' };
  }
  function partyLine() { const p = P(); const e = el(); return !!(e && ['leg', 'euro'].includes(e.type) && p.party !== 'NEW' && p.cand && p.cand.invested); }
  function projet() {
    const p = P(); if (!p.cand) return null; const lv = lvl(); const pl = partyLine();
    const live = (p.prog || []).filter(m => m.status !== 'retiree' && (m.level === lv || (pl && m.level === 'local')));
    const cs = concerns() || concernsTrue(); const known = !!concerns();
    const partyCov = pl ? 0.55 : 0; const cov = Math.min(1, partyCov + (1 - partyCov) * cs.reduce((a, c) => a + (live.some(m => m.theme === c.t) ? c.w : 0), 0));
    const cost = live.reduce((a, m) => a + Math.max(0, m.cout || 0), 0); const unf = live.filter(m => (m.cout > 0 || m.inv > 0) && (!m.fin || ['aucun', 'croissance', 'dette'].includes(m.fin))).reduce((a, m) => a + Math.max(0, m.cout || 0), 0);
    const fin = cost > 0 ? 1 - unf / cost : 1; const n = live.length; const ideal = pl ? [2, 5] : lv === 'local' ? [4, 9] : [5, 12]; const nf = n < ideal[0] ? n / ideal[0] : n > ideal[1] ? Math.max(0.5, 1 - (n - ideal[1]) / 10) : 1;
    const cred = n ? live.reduce((a, m) => a + (m.cred || 50), 0) / n : 0; const ph = live.filter(m => m.phare).length;
    let score = Math.round(100 * (0.42 * cov + 0.28 * fin + 0.18 * nf + 0.12 * cred / 100) * (n ? 1 : 0));
    if (pl) score = Math.round(30 + 0.7 * (n ? score : 100 * 0.42 * cov));
    const notes = [];
    const miss = cs.filter(c => !live.some(m => m.theme === c.t)); if (miss.length && !(pl && cov > 0.8)) notes.push({ k: 'miss', t: miss[0].t, txt: (pl ? 'Le programme du parti ne dit rien de précis sur ' + D.THEMES[miss[0].t].l.toLowerCase() + ' ici' : 'Rien sur ' + D.THEMES[miss[0].t].l.toLowerCase()) + (known ? ', alors que c’est ' + (cs.indexOf(miss[0]) === 0 ? 'la première préoccupation' : 'une des grandes préoccupations') + ' des électeurs.' : '. On ne sait même pas si ça compte ici : il faudrait consulter.') });
    const worst = live.filter(m => (m.cout > 0) && (!m.fin || ['aucun', 'croissance', 'dette'].includes(m.fin))).sort((a, b) => b.cout - a.cout)[0]; if (worst) notes.push({ k: 'unf', id: worst.id, txt: '« ' + worst.resume + ' » n’est pas financée. C’est la première chose que les adversaires vont attaquer.' });
    if (n > ideal[1]) notes.push({ k: 'trop', txt: n + ' propositions : trop. On noie le message, personne ne retiendra rien.' });
    if (n >= 2 && !ph) notes.push({ k: 'phare', id: live.slice().sort((a, b) => (b.visib || 0) - (a.visib || 0))[0].id, txt: pl ? 'Aucun engagement phare pour la circonscription : il faut un marqueur à vous, au-delà du programme du parti.' : 'Aucune mesure phare : il faut deux ou trois marqueurs que tout le monde retient.' });
    if (n < ideal[0]) notes.push({ k: 'peu', txt: pl ? 'Le programme national est fourni par le parti. Ajoutez au moins ' + ideal[0] + ' engagements pour la circonscription : c’est votre patte.' : 'Seulement ' + n + ' proposition(s). Un programme crédible en demande au moins ' + ideal[0] + '.' });
    return { lv, n, cov, known, fin, cost, unf, score, notes, cs, pub: p.cand.projet || null, ph, pl, min: pl || petite() ? 2 : 3 };
  }
  function publish() {
    const p = P(); const pj = projet(); if (!pj) return { ok: false, msg: '' }; if (pj.pub) return { ok: false, msg: 'Programme déjà publié.' }; if (pj.n < pj.min) return { ok: false, msg: pj.pl ? 'Ajoutez au moins deux engagements pour la circonscription avant de publier votre profession de foi.' : 'Il faut au moins trois propositions pour publier un programme.' }; if (p.hours < 3) return { ok: false, msg: 'Il faut 3 h.' };
    p.hours -= 3; p.cand.projet = { date: S().date, score: pj.score, n: pj.n };
    (p.prog || []).filter(m => m.status !== 'retiree' && m.level === pj.lv).forEach(m => m.visib = clamp((m.visib || 0) + 18 + pj.score / 8, 0, 100));
    const good = pj.score >= 60; E.addNoto(scopeKey(), 3); p.mom += good ? 0.03 : 0.005; p.cred = clamp(p.cred + (pj.fin > 0.7 ? 3 : -1.5), 0, 100);
    E.article('dauph', p.name + (pj.pl ? ' présente sa profession de foi : le programme ' + D.PARTIES[p.party].short + ' et ' + pj.n + ' engagements pour la circonscription' : ' présente son programme : ' + pj.n + ' propositions') + (pj.fin > 0.7 ? ', chiffrées et financées' : ' — mais le financement interroge'), good ? 0.3 : -0.1, 'pj');
    post('com', 'Programme en ligne 🎉 Dossier de presse envoyé, ' + (good ? 'les premiers retours sont bons.' : 'mais attendez-vous à des questions sur le financement.'));
    if (pj.unf > 0) { const r = topRival(); const worst = (p.prog || []).find(m => m.id === (pj.notes.find(n => n.k === 'unf') || {}).id); if (r && worst && R() < 0.6) S().queue.push({ kind: 'rival', type: 'critique', pnj: r.id, mes: worst.id, text: 'qui la paiera ? Ce programme est un catalogue sans financement.' }); }
    return { ok: true, msg: 'Votre programme est publié (qualité ' + pj.score + '/100). Ses propositions gagnent en visibilité.' };
  }
  function progK(lv) { const p = P(); if (!p.cand || !active()) return 1; if (lvl() !== lv) return 1; if (p.cand.projet) return 1 + 0.45 * (p.cand.projet.score / 100); return E.daysLeft() < 30 ? 0.8 : 1; }
  function atelier() {
    const p = P(); if (p.hours < 2) return { ok: false, msg: 'Il faut 2 h.' }; p.hours -= 2; const pj = projet();
    const m = member('com'); const d = dc(); const L = pj.notes.slice(0, 3);
    if (!L.length) { post('dc', 'Atelier programme : honnêtement, c’est solide. On peut publier.'); return { ok: true, notes: [], msg: 'Votre équipe ne voit rien à redire.' }; }
    post('dc', 'Atelier programme avec ' + (d ? d.name : 'l’équipe') + ' et ' + m.name + '. ' + L.map(x => '• ' + x.txt).join(' '));
    return { ok: true, notes: L };
  }
  function noteAct(n, follow) { const p = P(); if (dc()) { const h = hq(); h.trust = clamp(h.trust + (follow ? 2 : -1), 0, 100); }
    if (n.k === 'unf') { const m = p.prog.find(x => x.id === n.id); if (m) { m.status = 'retiree'; return '« ' + m.resume + ' » est retirée du programme.'; } }
    if (n.k === 'phare' && n.id) return X.setPhare(n.id);
    if (n.k === 'trop') { const live = p.prog.filter(m => m.status !== 'retiree' && m.level === lvl()).sort((a, b) => (a.visib || 0) - (b.visib || 0)); const k = Math.max(0, live.length - (lvl() === 'local' ? 9 : 12)); live.slice(0, k).forEach(m => m.status = 'retiree'); return k + ' proposition(s) secondaire(s) retirée(s).'; }
    return ''; }

  /* ---------- cabinet de mandat ---------- */
  const POSTS = { dircab: { l: 'Directeur·rice de cabinet', d: '+2 h par tour, majorité mieux tenue' }, chefcab: { l: 'Chef·fe de cabinet', d: 'Agenda, représentation : présence locale' }, comcab: { l: 'Conseiller·ère communication', d: 'Image et notoriété entretenues' }, collab_circo: { l: 'Collaborateur·rice en circonscription', d: 'Permanence, dossiers des habitants : proximité' }, collab_an: { l: 'Collaborateur·rice à l’Assemblée', d: 'Amendements, questions : crédibilité et travail parlementaire' }, attache: { l: 'Attaché·e parlementaire', d: 'Notes et expertise sur vos sujets' }, sg: { l: 'Secrétaire général·e', d: '+3 h par tour, appareil d’État tenu' }, dgs: { l: 'Directeur·rice général·e des services', d: 'L’administration municipale : chantiers moins en retard, dossiers mieux tenus' } };
  function posts() {
    const p = P(); const L = new Set(); p.mandats.forEach(m => {
      if (m.type === 'maire') { const pop = (E.commune() || {}).pop || 0; if (pop < 3500) return; L.add('dgs'); L.add('dircab'); if (pop >= 10000) L.add('chefcab'); if (pop >= 20000) L.add('comcab'); }
      if (m.type === 'depute' || m.type === 'senateur') { L.add('collab_circo'); L.add('collab_an'); L.add('attache'); }
      if (m.type === 'president') { L.add('sg'); L.add('dircab'); L.add('comcab'); }
      if (['cd', 'cr', 'meuro'].includes(m.type)) L.add('attache');
    }); return [...L];
  }
  function cabCands(post) {
    const p = P(), h = hq(); const used = new Set(h.cab.map(c => c.name)); const L = [];
    p.staff.filter(x => !used.has(x.name)).forEach(x => L.push({ name: x.name, g: x.g, comp: x.comp, loy: clamp(x.loy + 8, 0, 100), amb: x.amb || 50, from: 'campagne', note: (x.role === 'dircamp' ? 'Votre directeur·rice de campagne' : D.STAFF_ROLES[x.role].l) + ' · loyauté ' + Math.round(x.loy) }));
    h.core.concat(h.alumni).filter(x => !used.has(x.name) && !L.some(y => y.name === x.name)).slice(0, 3).forEach(x => L.push({ name: x.name, g: x.g, comp: clamp(x.comp + 4, 0, 95), loy: clamp(x.loy + 10, 0, 100), amb: rint(30, 60), from: 'campagne', note: 'De l’équipe de campagne (' + (CORE_L[x.lane] || 'bénévole').toLowerCase() + ')' }));
    for (let i = 0; i < 2; i++) { const g = R() < 0.5 ? 'F' : 'M'; L.push({ name: nm(g), g, comp: rint(66, 92), loy: rint(38, 60), amb: rint(45, 90), from: 'ext', note: i ? 'Haut fonctionnaire territorial, carnet d’adresses solide' : 'Profil expérimenté venu d’un autre cabinet' }); }
    return L;
  }
  function hireCab(post, c) { const h = hq(); h.cab = h.cab.filter(x => x.post !== post); h.cab.push({ post, name: c.name, g: c.g, comp: c.comp, loy: c.loy, amb: c.amb, from: c.from, since: S().date }); P().staff = P().staff.filter(x => x.name !== c.name || x.role === 'dircamp' && false); if (c.from === 'campagne') moral(4); E.log('Cabinet : ' + c.name + ', ' + POSTS[post].l.toLowerCase() + '.', 'good'); return c.name + ' devient ' + POSTS[post].l.toLowerCase() + '.'; }
  function fireCab(post) { const h = hq(); const c = h.cab.find(x => x.post === post); h.cab = h.cab.filter(x => x.post !== post); if (c && c.from === 'campagne' && c.loy > 60) { E.article('dauph', 'Départ fracassant au cabinet ' + E.de(P().name), -0.2, 'pj'); } return c ? c.name + ' quitte votre cabinet.' : ''; }
  function cabOf(post) { return hq().cab.find(x => x.post === post) || null; }
  function prepK() { if (!active() || !leads()) return 1; const p = P(); if (p.cand.projet) return 1; return petite() ? 0.8 : 0.6; }
  function terrainK() { if (!active() || !P().hq) return 1; const h = hq(); const c = member('terrain').comp + (dcStyle() === 'terrain' ? 20 : 0) + (h.flags.coord ? 15 : 0); return (0.62 + 0.43 * clamp(c / 90, 0, 1)) * (h.tracts != null && h.tracts <= 0 ? 0.7 : 1) * prepK(); }
  function hoursBonus() { if (!P().hq) return 0; let b = 0; const d = cabOf('dircab'); if (d) b += Math.round(1 + d.comp / 60); const sg = cabOf('sg'); if (sg) b += Math.round(1.5 + sg.comp / 50); if (active() && dcStyle() === 'orga') b += 1; return b; }
  function cabTick(days) {
    const p = P(), h = hq(); const f = Math.min(1.5, days / 30); const ps = new Set(posts()); if (!ps.size && h.cab.length) { h.cab.forEach(c => { if (!h.alumni.some(a => a.name === c.name)) h.alumni.push({ name: c.name, g: c.g, lane: 'orga', comp: c.comp, loy: c.loy, year: S().date.slice(0, 4) }); }); h.cab = []; return; }
    h.cab.forEach(c => { if (!ps.has(c.post)) return; const k = c.comp / 70 * f;
      if (c.post === 'dircab' && p.mairie) p.mairie.cohesion = clamp((p.mairie.cohesion ?? 70) + 1.5 * k, 0, 100);
      if (c.post === 'chefcab') { E.addNoto('commune', 0.8 * k); IM('RET', 0.4 * k); }
      if (c.post === 'comcab') { IMA(0.3 * k); E.addNoto(p.mandats.some(m => m.type === 'president') ? 'nat' : 'commune', 0.6 * k); }
      if (c.post === 'collab_circo') { E.addNoto('circo', 0.9 * k); IM('POP', 0.4 * k); IM('RUR', 0.4 * k); }
      if (c.post === 'collab_an') { p.cred = clamp(p.cred + 0.35 * k, 0, 100); if (p.depute && p.depute.rapport) p.depute.rapport.prog = Math.min(100, p.depute.rapport.prog + 3 * k); }
      if (c.post === 'attache') { const t = pick(Object.keys(D.THEMES)); (p.expertise = p.expertise || {})[t] = ((p.expertise || {})[t] || 0) + 0.15 * k; }
      c.loy = clamp(c.loy + (E.popularity() > 0 ? 0.3 : -0.4) * f, 0, 100);
      if (c.loy < 25 && c.amb > 60 && R() < 0.15 * f) { h.cab = h.cab.filter(y => y !== c); E.article('dauph', c.name + ' quitte le cabinet ' + E.de(p.name) + ' avec fracas', -0.3, 'pj'); E.log(c.name + ' quitte votre cabinet.', 'bad'); p.casseroles.filter(z => !z.out).forEach(z => z.risk += 0.03); }
    });
  }

  return { parityNote, petite, targets, prepK, recruit, initListe, partyLine, terrainK, hq, active, leads, dc, needDC, member, members, post, unread, pending, markRead, decide, tick, fromRival, dcCandidates, setDC, STYLE, edlOf, edlBonus, edlUse, edlOpt, edlList, edlSuggest, edlHours, prepEdl, angles, attackChance, attack, CHANNELS, concerns, concernsTrue, CONSULT, consult, projet, publish, progK, atelier, noteAct, POSTS, posts, cabCands, hireCab, fireCab, cabOf, hoursBonus, lvl, topRival, rivals };
})();
if (typeof window !== 'undefined') window.HQ = HQ;
