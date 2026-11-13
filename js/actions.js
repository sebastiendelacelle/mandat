/* MANDAT — actions du joueur et résolution des décisions */
window.X = (function () {
  const S = () => G.S; const P = () => G.S.p;
  const { rnd, rint, pick, clamp, eur } = E;
  const ph = () => E.phase().id;
  const inCampaign = () => !!P().cand && ph() !== 'hors';
  const trait = t => P().traits[t] ?? 50;
  const scopeOf = () => { const c = P().cand; if (!c) return 'commune'; const t = S().elections.find(e => e.id === c.el)?.type; return t === 'mun' || t === 'dep' ? 'commune' : t === 'pres' ? 'nat' : 'circo'; };
  const hasM = t => P().mandats.some(m => m.type === t);
  const anyM = () => P().mandats.length > 0;
  const journalists = () => E.pnjList(x => x.role === 'journaliste');

  const ACTIONS = [
    // Terrain
    { id: 'porte', cat: 'Terrain', l: 'Porte-à-porte', h: 6, d: 'Le plus efficace : quartier par quartier, couverture et image auprès des habitants.', input: 'zone',
      run(o) { o = o || {}; if (o.zone) { const z = E.canvass(o.zone, 'porte'); E.addNoto(scopeOf(), 2); if (rnd() < 0.35) P().militants++; if (inCampaign()) P().camp.terrain += 6 * E.eff(); return 'Porte-à-porte : ' + z.name + ' (couverture ' + Math.round(z.cover) + ' %).'; } if (!D.SEGS.some(x => x.id === o.seg)) o.seg = D.SEGS[0].id; const e = E.eff() * (1 + (trait('terrain') - 50) / 150) * (E.hasStaff('terrain') ? 1.25 : 1); E.addNoto(scopeOf(), 2.4 * e); E.addImage(o.seg, 2.2 * e); if (rnd() < 0.35) P().militants++; if (inCampaign()) P().camp.terrain += 6 * e; return 'Vous frappez à une centaine de portes (' + D.SEGS.find(s => s.id === o.seg).name.toLowerCase() + ').'; } },
    { id: 'marche', cat: 'Terrain', l: 'Tractage', h: 3, cost: 60, d: 'Visibilité rapide sur un marché, une sortie d’école, une gare.', input: 'zone',
      run(o) { if (o.zone) { const z = E.canvass(o.zone, 'tract'); E.addNoto(scopeOf(), 1.5); if (inCampaign()) P().camp.terrain += 3; return 'Tractage : ' + z.name + '.'; } const e = E.eff(); E.addNoto(scopeOf(), 1.5 * e); E.addImage('RET', 0.8 * e); E.addImage('PERI', 0.8 * e); if (inCampaign()) P().camp.terrain += 3 * e; return 'Tracts distribués, quelques échanges vifs au stand du fromager.'; } },
    { id: 'appart', cat: 'Terrain', l: 'Réunion d’appartement', h: 4, d: 'Convaincre en petit comité ; recrute des militants.', input: 'zone',
      run(o) { if (o.zone) { const z = E.canvass(o.zone, 'reunion'); P().militants += rint(1, 3); if (inCampaign()) P().camp.terrain += 3; return 'Réunion chez des habitants : ' + z.name + '. Deux personnes s’engagent.'; } const e = E.eff(); E.addImage(o.seg, 2.8 * e); P().militants += rint(1, 3); if (inCampaign()) P().camp.terrain += 3; return 'Une douzaine de voisins autour d’un café : deux s’engagent avec vous.'; } },
    { id: 'asso', cat: 'Terrain', l: 'Bénévolat associatif', h: 5, d: 'Crédibilité et ancrage, auprès des classes populaires et des retraités.',
      run() { E.addImage('POP', 1.5); E.addImage('RET', 1.2); P().cred = clamp(P().cred + 1, 0, 100); E.pnjList(x => x.role === 'notable').forEach(x => x.rel += 1); return 'Vous tenez la distribution alimentaire du samedi.'; } },
    // Parti
    { id: 'section', cat: 'Parti', l: 'Réunion de section', h: 3, d: 'Poids interne au parti.', cond: () => P().party !== 'NEW' || 'Vous n’êtes membre d’aucun parti.',
      run() { E.addStd(1.6 * (1 + trait('loyaute') / 150)); P().fedSup = clamp(P().fedSup + 0.7 * (1 - P().fedSup / 100), 0, 100); if (rnd() < 0.3) P().militants++; const sec = S().pnj[P().secId]; if (sec) sec.rel += 1; E.rankUpdate(); return 'Réunion de section : motion adoptée, vous prenez la parole.'; } },
    { id: 'mission', cat: 'Parti', l: 'Mission pour la fédération', h: 5, d: 'Fort gain de poids interne, relation avec la fédération.', cond: () => P().party !== 'NEW' || 'Vous n’êtes membre d’aucun parti.',
      run() { E.addStd(2.8); P().fedSup = clamp(P().fedSup + 1 * (1 - P().fedSup / 100), 0, 100); P().natSup = clamp(P().natSup + 0.2, 0, 100); const f = S().pnj[P().fedId]; if (f) f.rel += 3; E.rankUpdate(); return 'Vous organisez la venue d’un cadre national. La fédération apprécie.'; } },
    { id: 'reseau', cat: 'Parti', l: 'Monter un réseau interne', h: 6, d: 'Poids interne durable, mais la direction se méfie.', cond: () => (P().party !== 'NEW' && P().std >= 25) || 'Il faut un poids interne d’au moins 25.',
      run() { E.addStd(3.2); P().fedSup = clamp(P().fedSup + 1.6 * (1 - P().fedSup / 100), 0, 100); P().natSup = clamp(P().natSup + 0.3, 0, 100); const f = S().pnj[P().fedId]; if (f) f.rel -= 3; E.rankUpdate(); return 'Dîners, textos, motion de courant : votre réseau grossit.'; } },
    { id: 'tournee', cat: 'Parti', l: 'Tournée des fédérations', h: 6, cost: 450, d: 'Courir la France des sections : soutiens nationaux pour le congrès et la primaire.', cond: () => P().party === 'NEW' ? 'Réservé aux membres d’un parti.' : ((P().prole >= 2 || P().noto.nat >= 10) ? true : 'Il faut être secrétaire de section ou un peu connu·e nationalement.'),
      run() { const p = P(); const g = (1.2 + p.noto.nat / 40 + p.prole * 0.3) * (1 - p.natSup / 100); p.natSup = clamp(p.natSup + g, 0, 100); E.addNoto('nat', 0.8); E.addStd(1.5); const ld = S().pnj[S().national.leaders[p.party]]; if (ld && p.natSup > 15) ld.rel -= 2; return 'Six fédérations visitées, des militants conquis : soutien national +' + g.toFixed(1).replace('.', ',') + ' pt.'; } },
    { id: 'contribution', cat: 'Parti', l: 'Publier une contribution interne', h: 4, d: 'Un texte d’orientation pour le parti. Évalué, il peut fédérer un courant.', input: 'text', ai: 'contribution', cond: () => P().party === 'NEW' ? 'Réservé aux membres d’un parti.' : true },
    { id: 'mouvement', cat: 'Parti', l: 'Structurer votre mouvement', h: 6, cost: 300, d: 'Militants et soutiens pour votre mouvement.', cond: () => P().party === 'NEW' || 'Réservé aux fondateurs de mouvement.',
      run() { P().militants += rint(2, 6); E.addNoto(scopeOf(), 1.2); return 'Statuts, site, première assemblée générale de « ' + P().movement + ' ».'; } },
    // Médias
    { id: 'dej', cat: 'Médias', l: 'Déjeuner avec un journaliste', h: 2, cost: 70, d: 'Relation avec un·e journaliste ; parfois un portrait.', input: 'journalist',
      run(o) { const j = S().pnj[o.pnj]; j.known = true; j.rel += rint(5, 11); let m = 'Déjeuner avec ' + j.name + ' (' + j.mandat.replace('Journaliste, ', '') + ').'; if (j.rel > 20 && rnd() < 0.4) { E.article(j.territory, 'Portrait : ' + P().name + ', une ambition qui monte', 0.4, 'pj'); E.addNoto(scopeOf(), 4); m += ' Un portrait flatteur paraît.'; } return m; } },
    { id: 'post', cat: 'Médias', l: 'Publier sur X', h: 1, d: 'Votre message est évalué : portée, bad buzz, cohérence.', input: 'text', ai: 'post' },
    { id: 'tribune', cat: 'Médias', l: 'Écrire une tribune', h: 4, d: 'Une prise de position argumentée publiée dans un journal.', input: 'text', ai: 'tribune' },
    { id: 'interview', cat: 'Médias', l: 'Accorder une interview', h: 2, d: 'Choisissez le média et le journaliste : l’audience et le ton en dépendent.', ai: 'interview' },
    { id: 'actu', cat: 'Médias', l: 'Réagir à l’actualité nationale', h: 2, d: 'Prendre position localement sur un sujet national : visibilité, mais aussi cohérence avec votre camp.', input: 'natev', cond: () => (S().recentEv || []).length ? true : 'Pas d’actualité nationale récente.' },
    { id: 'figure', cat: 'Campagne', l: 'Faire venir une figure nationale', h: 4, cost: 1500, d: 'Meeting avec un ténor du parti : notoriété et élan, mais vous épousez le climat national de votre camp.', cond: () => { if (P().party === 'NEW') return 'Votre mouvement n’a pas de ténors nationaux.'; if (!inCampaign()) return 'Pendant une campagne.'; return true; },
      run() { const p = P(); const figs = E.partyFigures(); const x = figs.find(y => y.rel > -20) || figs[0]; const cl = S().national.climate[p.party] || 0; const govP = S().national.gov.includes(p.party) ? -((50 - (S().national.approval ?? 35)) / 100) * 0.4 : 0;
        E.addNoto(scopeOf(), 4 + (x ? x.noto / 15 : 2)); p.mom += 0.03 + (cl + govP) * 0.4; p.distance = Math.max(0, (p.distance || 0) - 0.35); p.camp.meet += 1; if (x) { x.rel += 4; x.known = true; }
        E.article('dauph', (x ? x.name : 'Un ténor') + ' en meeting aux côtés ' + E.de(p.name), 0.2, 'pj');
        return (x ? x.name : 'Une figure nationale') + ' vient vous soutenir. ' + (cl + govP < -0.05 ? 'Mais l’impopularité nationale de votre camp vous colle désormais à la peau.' : 'L’élan national de votre camp vous porte.'); } },
    { id: 'distance', cat: 'Parti', l: 'Prendre ses distances avec la direction nationale', h: 2, d: 'Vous vous démarquez de votre camp : le climat national pèse moins sur vous, mais le parti grince.', cond: () => P().party === 'NEW' ? 'Vous n’avez pas de direction nationale.' : ((P().distance || 0) > 0.85 ? 'Déjà très en retrait.' : true),
      run() { const p = P(); p.distance = Math.min(1, (p.distance || 0) + 0.35); E.addStd(-5); p.natSup = clamp(p.natSup - 2, 0, 100); const ld = S().pnj[S().national.leaders[p.party]]; if (ld) ld.rel -= 8; E.addNoto('circo', 1.5); E.article('dauph', p.name + ' prend ses distances avec la direction nationale de ' + D.PARTIES[p.party].short, 0, 'pj'); return 'Vous jouez la carte locale. La direction nationale le note.'; } },
    { id: 'off', cat: 'Médias', l: 'Confier un « off » à un journaliste', h: 1, d: 'Information, confidence ou demande de couverture : la relation se travaille et se monnaie.', input: 'off' },
    { id: 'training', cat: 'Médias', l: 'Media training', h: 5, cost: 1200, d: 'Meilleure tenue en débat et en interview.',
      run() { P().mediaTraining = Math.min(3, P().mediaTraining + 1); return 'Une ancienne journaliste vous fait répéter vos éléments de langage.'; } },
    // Réseau
    { id: 'rdv', cat: 'Réseau', l: 'Rendez-vous avec une personnalité', h: 3, d: 'Conversation libre : gagner un soutien, sonder, négocier.', input: 'pnj', ai: 'dialogue' },
    { id: 'defier', cat: 'Réseau', l: 'Défier un adversaire en débat', h: 4, d: 'Un face-à-face à la radio. Votre adversaire peut se dérober.', input: 'rival', ai: 'defi', cond: () => (S().rivals && S().rivals.length) ? true : 'Aucun adversaire identifié.' },
    { id: 'accord', cat: 'Réseau', l: 'Proposer un accord', h: 2, d: 'Désistement, soutien, place sur une liste, poste promis…', input: 'accord' },
    { id: 'soutiens', cat: 'Réseau', l: 'Démarcher des élus', h: 4, d: 'Soutiens d’élus ; indispensables pour les 500 parrainages.',
      run() { const g = Math.round((1 + P().noto.dept / 15 + P().std / 25) * E.eff() * (0.6 + rnd())); P().soutiens += g; P().parrainages += Math.round(g * (P().noto.nat / 25 + 0.4)); return g + ' élu·e·s vous assurent de leur soutien.'; } },
    // Programme
    { id: 'mesure', cat: 'Programme', l: 'Proposer une mesure', h: 3, d: 'Catalogue ou texte libre, locale ou nationale. Chiffrée et évaluée.', input: 'measure' },
    { id: 'defendre', cat: 'Programme', l: 'Défendre une proposition sur le terrain', h: 3, d: 'Tracts, réunions, réseaux : la proposition devient visible et pèse dans le vote.', input: 'mes',
      cond: () => P().prog.some(m => m.status !== 'retiree') || 'Aucune proposition à défendre.',
      run(o) { return defendMeasure(o.mes); } },
    { id: 'conference', cat: 'Programme', l: 'Conférence de presse sur une proposition', h: 3, d: 'Deux journalistes vous cuisinent sur votre proposition.', input: 'mes', ai: 'conference', cond: () => P().prog.some(m => m.status !== 'retiree') || 'Aucune proposition à présenter.' },
    { id: 'appliquer', cat: 'Programme', l: 'Mettre en œuvre une proposition', h: 5, d: 'Maire : la réaliser. Député : déposer une proposition de loi. Élu local : présenter un vœu.', input: 'mesapp',
      cond: () => (P().mandats.some(m => ['maire', 'depute', 'cd', 'conseiller_municipal', 'adjoint'].includes(m.type)) ? (P().prog.some(m => !m.status || m.status === 'proposee') ? true : 'Aucune proposition à mettre en œuvre.') : 'Il faut un mandat.'),
      run(o) { return applyInOffice(o.mes); } },
    { id: 'dossier_tech', cat: 'Programme', l: 'Travailler un dossier', h: 5, d: 'Maîtrise d’un thème : crédibilité.', input: 'theme',
      run(o) { P().cred = clamp(P().cred + 2.5, 0, 100); P().expertise = P().expertise || {}; P().expertise[o.theme] = (P().expertise[o.theme] || 0) + 1; return 'Vous maîtrisez mieux le dossier « ' + D.THEMES[o.theme].l + ' ».'; } },
    // Campagne
    { id: 'meeting', cat: 'Campagne', l: 'Organiser un meeting', h: 8, cost: () => ({ mun: 900, dep: 1200, leg: 2500, pres: 150000 }[curType()] || 1500), d: 'Votre discours est évalué ; mobilise et donne de l’élan.', cond: () => inCampaign() || 'Disponible en pré-campagne et en campagne.', input: 'text', ai: 'speech' },
    { id: 'presi', cat: 'Campagne', l: 'Faire campagne pour la présidentielle', h: 4, d: 'Animer la campagne de votre candidat·e dans la circonscription : poids au parti, visibilité, et un élan pour les législatives.',
      cond: () => { const nw = E.natWindow(); if (!nw || !nw.open || nw.pres.status === 'fini') return 'Pendant la campagne présidentielle uniquement.'; if (P().party === 'NEW') return 'Votre mouvement n’a pas de candidat·e à la présidentielle.'; return true; },
      run() { const p = P(); const ld = S().pnj[S().national.leaders[p.party]]; E.addStd(2.5); E.addNoto('circo', 1.8); p.mom += 0.012; S().national.climate[p.party] += 0.003; if (ld) { ld.rel += 5; ld.known = true; } if (rnd() < 0.3) E.article('dauph', (ld ? ld.name : 'Le candidat') + ' en meeting dans l’Isère aux côtés ' + E.de(p.name), 0.2, 'pj'); return 'Vous animez la campagne présidentielle' + (ld ? ' ' + E.de(ld.name) : '') + ' dans votre circonscription.'; } },
    { id: 'affiches', cat: 'Campagne', l: 'Campagne d’affichage', h: 2, cost: () => ({ mun: 700, dep: 1000, leg: 2400, pres: 400000 }[curType()] || 1500), d: 'Notoriété dans la circonscription.', cond: () => inCampaign() || 'Disponible en pré-campagne et en campagne.',
      run() { E.addNoto(scopeOf(), 4 * E.eff()); P().camp.medias += 4; return 'Vos affiches couvrent les panneaux (et quelques-unes sont déjà taguées).'; } },
    { id: 'parrainages', cat: 'Campagne', l: 'Démarcher des maires pour les parrainages', h: 6, d: 'Il faut 500 signatures d’élus, venues d’au moins 30 départements, pour être candidat·e à la présidentielle.', cond: () => { const c = P().cand; const el = c && S().elections.find(e => e.id === c.el); return el && el.type === 'pres' && !c.parrOk ? true : 'Seulement pendant la collecte des parrainages pour la présidentielle.'; }, run() { return E.parrAction(); } },
    { id: 'phoning', cat: 'Campagne', l: 'Phoning et mobilisation', h: 4, d: 'Mobilise vos sympathisants le jour du vote.', cond: () => inCampaign() || 'Disponible en pré-campagne et en campagne.',
      run() { const e = E.eff() * (1 + P().militants / 60); P().camp.terrain += 5 * e; P().mom += 0.01; return 'Vos militants appellent ' + Math.round(300 * e) + ' sympathisants.'; } },
    { id: 'numerique', cat: 'Campagne', l: 'Campagne numérique ciblée', h: 2, cost: () => ({ mun: 400, dep: 600, leg: 1500, pres: 200000 }[curType()] || 800), d: 'Vidéos et publicités ciblées : jeunes et actifs.', cond: () => inCampaign() || 'Disponible en pré-campagne et en campagne.', input: 'seg',
      run(o) { const e = E.eff() * (E.hasStaff('cm') ? 1.3 : 1); E.addImage(o.seg, 1.8 * e); P().camp.num += 5 * e; P().followers += rint(40, 160); return 'Vos vidéos tournent auprès des ' + D.SEGS.find(s => s.id === o.seg).name.toLowerCase() + '.'; } },
    { id: 'levee', cat: 'Campagne', l: 'Levée de fonds', h: 4, d: 'Dons plafonnés à 4 600 € par personne. Mandataire obligatoire.', cond: () => (P().cand && P().cand.compte) ? (E.hasStaff('mandataire') ? true : 'Recrutez d’abord un mandataire financier.') : 'Déclarez d’abord une candidature.',
      run() { const met = D.METIERS.find(m => m.id === P().metier); const donors = rint(4, 10) + Math.round(P().noto[scopeOf()] / 8 + P().militants / 10); const avg = 120 + met.net * 40 + Math.max(0, P().image.CAD) * 6 + rnd() * 200; const tot = Math.round(donors * Math.min(4600, avg)); const c = P().cand.compte; c.dons += tot; c.recettes += tot; return donors + ' donateurs, ' + eur(tot) + ' versés sur le compte de campagne.'; } },
    { id: 'sondage', cat: 'Campagne', l: 'Commander un sondage', h: 1, cost: () => ({ mun: 3500, dep: 4500, leg: 7500, pres: 15000 }[curType()] || 5000), d: 'Intentions de vote sans biais d’institut, image par segment.', cond: () => P().cand ? true : 'Déclarez d’abord une candidature.',
      run() { E.pollLocal(true); return 'Le sondage commandé est disponible dans l’onglet Opinion.'; } },
    { id: 'conges', cat: 'Campagne', l: 'Poser des congés', h: 0, d: '+20 h ce tour, mais vous perdez 500 € de revenus.', cond: () => (inCampaign() && !P().fullTime && !P().congesTurn) || 'Disponible une fois par tour en campagne, si vous avez un emploi.',
      run() { P().hours += 20; P().hoursMax += 20; P().cash -= 500; P().congesTurn = S().turn; return 'Congés posés : 20 heures de plus cette période.'; } },
    // Coups tordus
    { id: 'enquete', cat: 'Coups tordus', l: 'Enquêter sur un rival', h: 4, cost: 1500, d: 'Un détective privé fouille le passé d’un rival.', input: 'pnjrival',
      run(o) { const x = S().pnj[o.pnj]; if (x.secrets > 0 && rnd() < 0.55 + x.secrets * 0.12) { const lab = pick(['emploi fictif de son conjoint', 'prêt immobilier consenti par un promoteur', 'arriérés d’impôts', 'liaison avec une collaboratrice', 'notes de frais douteuses', 'marché public attribué à un ami']); P().dossiers.push({ id: E.uid('d'), on: x.id, label: lab, g: rint(1, 3), date: S().date }); if (rnd() < 0.15) E.casserole('espionnage', 'filature illégale d’un rival', 2, true, 0.04); return 'Le détective revient avec un dossier sur ' + x.name + ' : ' + lab + '.'; } if (rnd() < 0.2) { x.rel -= 25; return x.name + ' a repéré la filature. Il·elle sait que c’est vous.'; } return 'Rien d’exploitable sur ' + x.name + '.'; } },
    { id: 'fuite', cat: 'Coups tordus', l: 'Faire fuiter un dossier', h: 2, d: 'Donner un dossier à un·e journaliste.', ill: 'Si le dossier a été volé : recel, jusqu’à 5 ans de prison', input: 'fuite', cond: () => P().dossiers.length ? true : 'Aucun dossier en réserve.',
      run(o) { const d = P().dossiers.find(x => x.id === o.dossier); const j = S().pnj[o.pnj]; const x = S().pnj[d.on]; const ok = rnd() < 0.5 + j.rel / 200 + j.appetit / 300 - (d.fake ? 0.15 : 0); if (ok) P().dossiers = P().dossiers.filter(y => y.id !== d.id); if (!ok) { j.rel -= 5; return j.name + ' refuse de publier sans recoupement. Vous gardez le dossier… et le risque.'; } if (d.fake) { E.article(j.territory, 'Faux documents contre ' + x.name + ' : la piste remonte vers ' + P().name, -0.9, 'pj'); E.addImageAll(-4); P().cred = clamp(P().cred - 6, 0, 100); x.img += 4; j.rel -= 15; E.casserole('fuite', 'avoir diffusé des faux documents contre ' + x.name, 3, true, 0.3); return 'Catastrophe : les documents étaient retouchés. ' + j.name + ' a vérifié, et c’est vous que l’article vise. Image −4, crédibilité −6.'; } x.img -= 10 * d.g; x.mom -= 0.07 * d.g; x.noto = clamp(x.noto + 8, 0, 100); E.article(j.territory, 'Révélations : ' + x.name + ', ' + d.label, -0.7, 'pnj'); j.rel += 5; let m = 'L’article sort : ' + x.name + ' est éclaboussé·e.'; if (rnd() < 0.3) { x.rel -= x.traits.rancune > 60 ? 80 : 40; if (x.traits.rancune > 60) x.enemy = true; E.casserole('fuite', 'avoir orchestré la fuite contre ' + x.name, 1, false, 0.05); m += ' Mais ' + x.name + ' soupçonne votre main.'; } return m; } },
    { id: 'trolls', cat: 'Coups tordus', l: 'Campagne de dénigrement en ligne', h: 2, cost: 2000, d: 'Faux comptes et rumeurs contre un rival. Risque de diffamation.', ill: 'Diffamation : jusqu’à 12 000 € d’amende, plus les dommages et intérêts', input: 'pnjrival',
      run(o) { const x = S().pnj[o.pnj]; x.img -= 6; x.mom -= 0.04; E.post('Anonyme', pick(['@verite38', '@onvousment', '@lanceur_alertes38']), 'Ce que ' + x.name + ' ne veut pas que vous sachiez… #Isère', false, rint(200, 1500)); if (rnd() < 0.25) E.casserole('trolls', 'une campagne de faux comptes contre ' + x.name, 2, rnd() < 0.5, 0.08); return 'La rumeur circule sur X contre ' + x.name + '.'; } },
    { id: 'taupe', cat: 'Coups tordus', l: 'Infiltrer l’équipe adverse', h: 3, cost: 2500, d: 'Une taupe chez un rival : vous lisez son jeu.', ill: 'Vol de documents internes, abus de confiance : risque pénal', input: 'pnjrival',
      run(o) { const x = S().pnj[o.pnj]; x.mom -= 0.05; x.spied = S().date; if (rnd() < 0.2) { E.casserole('taupe', 'avoir infiltré l’équipe ' + E.de(x.name), 2, true, 0.07); } return 'Votre taupe chez ' + x.name + ' : ambition ' + x.traits.ambition + ', loyauté ' + x.traits.loyaute + ', rancune ' + x.traits.rancune + ', ' + (x.secrets ? 'des secrets à creuser' : 'pas de secret connu') + '. Sa campagne est désorganisée.'; } },
    { id: 'occulte', cat: 'Coups tordus', l: 'Solliciter un financement occulte', h: 2, d: 'De l’argent liquide d’un entrepreneur. Délit grave.', ill: 'Financement illégal : rejet du compte, amende, prison, jusqu’à 3 ans d’inéligibilité',
      run() { const amt = rint(6, 25) * 1000; P().cash += amt; E.casserole('occulte', 'un financement illégal de ' + eur(amt) + ' en liquide', amt > 15000 ? 4 : 3, true, 0.035); return 'Une enveloppe de ' + eur(amt) + '. Personne n’en saura rien… peut-être.'; } },
    { id: 'audit', cat: 'Coups tordus', l: 'Vérifier la loyauté de l’équipe', h: 2, d: 'Révèle la loyauté réelle de vos collaborateurs.', cond: () => P().staff.length ? true : 'Vous n’avez pas d’équipe.',
      run() { P().staff.forEach(x => x.audited = true); return P().staff.map(x => x.name + ' : loyauté ' + Math.round(x.loy)).join(' · '); } },
    // Mandat
    { id: 'conseil', cat: 'Mandat', l: 'Intervenir au conseil municipal', h: 3, d: 'Interpeller, proposer : notoriété locale.', cond: () => (hasM('conseiller_municipal') || hasM('adjoint')) || 'Il faut siéger au conseil municipal.',
      run() { E.addNoto('commune', 3); E.addImageAll(0.6); E.article('dauph', 'Conseil municipal : ' + P().name + ' interpelle la majorité', 0.1, 'pj'); return 'Votre intervention est relayée dans la presse locale.'; } },
    { id: 'permanence', cat: 'Mandat', l: 'Tenir une permanence', h: 4, d: 'Écoute des administrés : image et crédibilité.', cond: () => anyM() || 'Il faut un mandat.',
      run() { E.addImage('POP', 1.5); E.addImage('RET', 1.5); P().cred = clamp(P().cred + 1, 0, 100); return 'Permanence : logement, voisinage, une demande de place en crèche.'; } },
    { id: 'qag', cat: 'Mandat', l: 'Question au gouvernement', h: 3, d: 'Deux minutes à la télévision, notoriété nationale.', cond: () => hasM('depute') || 'Réservé aux députés.', input: 'text', ai: 'qag' },
    { id: 'amend', cat: 'Mandat', l: 'Déposer des amendements', h: 5, d: 'Travail parlementaire : crédibilité et poids au groupe.', cond: () => hasM('depute') || 'Réservé aux députés.',
      run() { P().cred = clamp(P().cred + 2, 0, 100); E.addStd(1.5); return 'Vos amendements sur le texte en commission sont remarqués.'; } },
    { id: 'circo', cat: 'Mandat', l: 'Travail en circonscription', h: 6, d: 'Inaugurations, entreprises, associations.', cond: () => (hasM('depute') || hasM('cd')) || 'Réservé aux députés et conseillers départementaux.',
      run() { E.addNoto('circo', 3); E.addImageAll(0.8); return 'Une semaine de terrain, du Vercors au Nord-Isère.'; } },
    { id: 'focus', cat: 'Terrain', l: 'Écouter les électeurs (groupe qualitatif)', h: 1, cost: 2500, d: 'Un institut réunit des électeurs de chaque profil : ce qu’ils disent vraiment de vous.', input: 'focus', run() { const v = LF.focusGroup(); return v.sum; } },
    { id: 'grand', cat: 'Mandat', l: 'Lancer un grand projet municipal', h: 4, d: 'Chantier sur plusieurs mois : retards, surcoûts, puis inauguration.', cond: () => P().mairie ? ((P().mairie.grands || []).some(g => !g.done) ? 'Un grand projet est déjà en cours.' : true) : 'Il faut être maire.', input: 'grand', run(o) { return LF.startGrand(o.grand).msg; } },
    { id: 'commission', cat: 'Mandat', l: 'Choisir sa commission à l’Assemblée', h: 1, d: 'Spécialisation : crédibilité sur un thème.', cond: () => P().mandats.some(m => m.type === 'depute') ? ((P().depute || {}).com ? 'Vous siégez déjà en commission.' : true) : 'Réservé aux députés.', input: 'com', run(o) { return LF.setCommission(o.com); } },
    { id: 'rapport', cat: 'Mandat', l: 'Devenir rapporteur·e d’une mission', h: 6, d: 'Quatre mois de travail, puis un rapport remarqué.', cond: () => P().mandats.some(m => m.type === 'depute') ? ((P().depute || {}).rapport ? 'Rapport en cours.' : true) : 'Réservé aux députés.', run() { return LF.startRapport(); } },
    { id: 'reforme', cat: 'Mandat', l: 'Engager une réforme', h: 6, d: 'Choisir un levier national, le faire voter… ou passer en force.', cond: () => LF.isPres() || 'Réservé au président de la République.', input: 'reforme', run(o) { return LF.reforme(o.lev, o.v, o.mode).msg; } },
    { id: 'remaniement', cat: 'Mandat', l: 'Nommer un·e Premier·e ministre', h: 3, d: 'Un nouveau visage à Matignon, un sursaut de popularité.', cond: () => LF.isPres() || 'Réservé au président de la République.', input: 'pm', run(o) { return LF.remaniement(o.pm); } },
    { id: 'referendum', cat: 'Mandat', l: 'Organiser un référendum', h: 8, d: 'Quitte ou double devant le peuple.', cond: () => LF.isPres() || 'Réservé au président de la République.', input: 'refq', run(o) { return LF.referendum(o.qi).msg; } },
    { id: 'dissoudre', cat: 'Mandat', l: 'Dissoudre l’Assemblée nationale', h: 2, d: 'Législatives anticipées dans cinq semaines.', cond: () => LF.isPres() ? (E.diffDays(S().national.lastLeg || '2024-07-07', S().date) > 365 ? true : 'Impossible moins d’un an après des législatives.') : 'Réservé au président de la République.',
      run() { const d = E.addDays(S().date, 35); const dd = E.toD(d); dd.setUTCDate(dd.getUTCDate() + (7 - dd.getUTCDay()) % 7); E.dissolution(E.fromD(dd)); S().national.approval = clamp(S().national.approval - 3, 10, 80); return 'Vous dissolvez l’Assemblée. Législatives anticipées le ' + E.fmtDate(E.fromD(dd)) + '.'; } },
    // Vie perso
    { id: 'recruter', cat: 'Équipe', l: 'Recruter un collaborateur', h: 2, d: 'Trois profils pour le poste choisi.', input: 'role' },
    { id: 'plein', cat: 'Équipe', l: 'Vivre de la politique', h: 0, d: 'Quitter votre emploi : 50 h par semaine, mais vous ne vivez que de vos indemnités et de votre épargne.', cond: () => !P().fullTime || 'Déjà à plein temps.',
      run() { P().fullTime = true; return 'Vous quittez votre emploi. Plus de filet de sécurité.'; } },
    { id: 'emploi', cat: 'Équipe', l: 'Reprendre un emploi', h: 0, d: 'Revenus réguliers, moins de temps.', cond: () => P().fullTime || 'Vous avez déjà un emploi.',
      run() { P().fullTime = false; return 'Vous reprenez une activité professionnelle.'; } }
  ];
  function doOff(jid, kind, extra) {
    const p = P(); const j = S().pnj[jid]; j.known = true; p.hours -= 1;
    if (kind === 'strategie') { j.rel += 10; if (rnd() < 0.15 + Math.max(0, -j.rel) / 200) { E.addImageAll(-1); E.article(j.territory, 'Les coulisses de la campagne ' + E.de(p.name), -0.2, 'pj'); return j.name + ' a publié une partie de vos confidences. Relation +10, mais l’article fait jaser.'; } return j.name + ' apprécie la confiance. Relation +10.'; }
    if (kind === 'couverture') { if (j.rel < 10) { j.rel -= 2; return j.name + ' ne vous doit rien et ne viendra pas.'; } j.rel -= 6; E.addNoto(scopeOf(), 3.5); E.addImageAll(0.8); E.article(j.territory, p.name + ' sur le terrain : reportage', 0.4, 'pj'); return j.name + ' couvre votre déplacement : reportage flatteur (relation −6).'; }
    if (kind === 'adversaire') { const d = p.dossiers.find(z => z.id === extra); if (!d) return ''; const x = S().pnj[d.on]; p.dossiers = p.dossiers.filter(z => z.id !== d.id); if (rnd() < 0.45 + j.rel / 150) { x.img -= 9 * d.g; x.mom -= 0.06 * d.g; E.article(j.territory, 'Enquête : ' + x.name + ', ' + d.label, -0.7, 'pnj'); j.rel += 4; if (rnd() < 0.12) { x.rel -= 40; return 'L’article sort. ' + x.name + ' soupçonne pourtant votre main.'; } return 'L’article sort, et personne ne remonte jusqu’à vous.'; } j.rel -= 3; return j.name + ' juge l’information insuffisamment recoupée.'; }
    return '';
  }
  function curType() { const c = P().cand; return c ? S().elections.find(e => e.id === c.el)?.type : null; }
  function costOf(a) { return typeof a.cost === 'function' ? a.cost() : (a.cost || 0); }
  const COLI_BLOCK = ['meeting', 'defier', 'accord', 'affiches', 'sondage', 'levee', 'numerique', 'phoning'];
  function avail(a) {
    if (E.silence() && ['Campagne', 'Terrain', 'Médias'].includes(a.cat)) return 'Silence électoral : la campagne est close.';
    if (P().cand && P().cand.mode === 'colistier' && COLI_BLOCK.includes(a.id)) { const h = S().pnj[P().cand.listOf]; return 'Réservé à la tête de liste' + (h ? ' (' + h.name + ')' : '') + ' : en tant que colistier·ère, vous faites campagne sur le terrain.'; }
    if (a.cond) { const r = a.cond(); if (r !== true) return r; }
    if (a.h > P().hours) return 'Pas assez d’heures disponibles (' + a.h + ' h).';
    const c = costOf(a); if (c && !canPay(c)) return 'Fonds insuffisants (' + eur(c) + ').';
    if (P().inelig && P().inelig > S().date && a.cat === 'Campagne') return 'Vous êtes inéligible.';
    return true;
  }
  function canPay(c) { const p = P(); if (p.cand && p.cand.compte && ph() !== 'hors') { const bal = p.cand.compte.recettes - p.cand.compte.depenses; return bal + p.cash >= c; } return p.cash >= c; }
  function pay(a) { const c = costOf(a); if (!c) return true; return E.spend(c, a.l); }
  function doAction(id, opts) {
    const a = ACTIONS.find(x => x.id === id); const ok = avail(a); if (ok !== true) return { ok: false, msg: ok };
    if (!pay(a)) return { ok: false, msg: 'Paiement impossible.' };
    P().hours -= a.h; const S0 = G.S; S0.cnt = S0.cnt || {}; S0.cnt[id] = (S0.cnt[id] || 0) + 1; S0.turnCnt = S0.turnCnt || {}; const nrep = S0.turnCnt[id] = (S0.turnCnt[id] || 0) + 1;
    let rk = [1, 1, 0.7, 0.5, 0.35, 0.25][Math.min(5, nrep)]; const pk = typeof HQ !== 'undefined' ? HQ.prepK() : 1; const pp = P(); const b0 = rk < 1 || pk < 1 ? JSON.stringify({ i: pp.image, n: pp.noto, c: pp.camp, z: S0.zones }) : null;
    const msg = a.run(opts || {});
    if (b0) { const o = JSON.parse(b0); const sc = (cur, old) => { for (const k in cur) { if (typeof cur[k] === 'number' && typeof old[k] === 'number') cur[k] = old[k] + (cur[k] - old[k]) * rk; } }; sc(pp.image, o.i); sc(pp.noto, o.n); const rk0 = rk; rk = rk0 * pk; sc(pp.camp, o.c); for (const k in (S0.zones || {})) (S0.zones[k] || []).forEach((z, i) => { const oz = o.z && o.z[k] && o.z[k][i]; if (oz) z.cover = oz.cover + (z.cover - oz.cover) * rk; }); rk = rk0; }
    E.log(a.l + ' — ' + msg, 'action'); (S0.turnDid = S0.turnDid || []).push({ l: a.l, m: typeof msg === 'string' ? msg : '' }); return { ok: true, msg };
  }
  function startAI(id) { const a = ACTIONS.find(x => x.id === id); const ok = avail(a); if (ok !== true) return { ok: false, msg: ok }; if (!pay(a)) return { ok: false, msg: 'Paiement impossible.' }; P().hours -= a.h; (G.S.turnDid = G.S.turnDid || []).push({ l: a.l, m: '' }); return { ok: true, a }; }

  /* ---------- application des évaluations IA ---------- */
  function vecOf(ax) { const v = {}; if (ax) for (const k in ax) if (k in E.AXI) v[k] = clamp(+ax[k] || 0, -100, 100); return v; }
  function applyPost(text, ev) {
    const p = P(); const reach = clamp(ev.portee ?? 40, 0, 100); const risk = clamp(ev.risque ?? 20, 0, 100);
    const likes = Math.round((p.followers / 8 + 10) * (0.3 + reach / 60) * (E.hasStaff('cm') ? 1.4 : 1) * (0.5 + rnd()));
    E.post(p.name, '@' + E.slug(p.name), text, true, likes); p.followers += Math.round(likes / 6);
    const vol = E.statement(text, ev.theme || 'institutions', vecOf(ev.axes), 0.5 + reach / 150, 'post X');
    E.addNoto(scopeOf(), reach / 30); if (inCampaign()) p.camp.num += 2 + reach / 20;
    let m = 'Publié : ' + likes + ' j’aime.';
    if (rnd() * 100 < risk * 0.6) { E.addImageAll(-2 - risk / 25); p.cred = clamp(p.cred - 2, 0, 100); E.article(pick(['info24', 'ventilo', 'dauph']), 'Bad buzz : le message ' + E.de(p.name) + ' indigne les réseaux', -0.6, 'pj', '« ' + text.slice(0, 140) + ' »'); m += ' Bad buzz : le message est épinglé par la presse.'; }
    else if (reach > 75 && rnd() < 0.5) { E.addNoto(scopeOf(), 4); m += ' Le message devient viral.'; }
    if (ev.mensonge) { E.lie(text, 1); m += ' (Affirmation contestable : un fact-check pourrait suivre.)'; }
    if (vol) m += ' La presse relève une contradiction avec vos déclarations passées.';
    return m;
  }
  function applyMeasure(text, ev, level) {
    const p = P(); const m = addMeasure({ text, level: level || 'local', theme: D.THEMES[ev.theme] ? ev.theme : 'economie', cout: +ev.cout_annuel_eur || 0, competence: ev.competence || 'oui', cred: clamp(+ev.credibilite || 50, 0, 100), resume: ev.resume || text.slice(0, 90), critique: ev.critique || '', gagnants: (ev.gagnants || []).filter(g => D.SEG_IDS.includes(g)), perdants: (ev.perdants || []).filter(g => D.SEG_IDS.includes(g)), axes: vecOf(ev.axes) });
    if (m.competence === 'non' && rnd() < 0.6) E.article('dauph', p.name + ' promet ce qu’une collectivité ne peut pas faire', -0.4, 'pj', m.critique);
    if (m.cred < 35 && rnd() < 0.5) E.article(pick(['quotlib', 'revel']), 'Contre-expertise : la mesure ' + E.de(p.name) + ' ne tient pas', -0.4, 'pj', m.critique);
    return m;
  }
  function applySpeech(text, ev) {
    const p = P(); const sc = clamp(+ev.score || 50, 0, 100); const e = E.eff() * (E.hasStaff('plume') ? 1.2 : 1);
    p.camp.meet += 1; p.militants += Math.round(sc / 15); p.mom += (sc - 45) / 600 * e; E.addNoto(scopeOf(), 2 + sc / 25);
    if (ev.segments) for (const s in ev.segments) if (D.SEG_IDS.includes(s)) E.addImage(s, clamp(+ev.segments[s], -10, 10) * 0.5 * e);
    E.statement(text, ev.theme || 'institutions', vecOf(ev.axes), 0.5, 'meeting');
    if (ev.punchline) { E.post(p.name, '@' + E.slug(p.name), '« ' + ev.punchline + ' »', true, rint(100, 900)); }
    if (ev.mensonge) E.lie(ev.punchline || text.slice(0, 120), 1);
    E.article('dauph', 'Meeting ' + E.de(p.name) + ' : ' + (sc >= 65 ? 'une salle conquise' : sc >= 45 ? 'un discours sans surprise' : 'une salle clairsemée et un discours qui tombe à plat'), (sc - 50) / 60, 'pj');
    return 'Discours noté ' + Math.round(sc) + '/100. ' + (ev.commentaire || '');
  }
  function applyDebate(sum) { // sum: {score, segments, lies:[text], punchlines:[..], gaffes}
    const p = P(); const sc = clamp(sum.score, 0, 100); const k = 1 + p.mediaTraining * 0.1; const S0 = G.S; S0.cnt = S0.cnt || {}; if (sc >= 55) S0.cnt.debateWin = (S0.cnt.debateWin || 0) + 1;
    if (sum.oppId && typeof GV !== 'undefined') GV.remember(sum.oppId, sc >= 55 ? 'Battu·e par vous en débat (' + Math.round(sc) + ' %)' : sc < 45 ? 'Vous a dominé·e en débat' : 'Débat serré avec vous', sc >= 55 ? -6 : 2);
    for (const s in sum.segments) if (D.SEG_IDS.includes(s)) E.addImage(s, clamp(sum.segments[s], -15, 15) * 0.6 * k);
    p.mom += (sc - 50) / 400; p.cred = clamp(p.cred + (sc - 50) / 15, 0, 100); E.addNoto(scopeOf(), 5 + sc / 15); if (inCampaign()) p.camp.medias += 6;
    (sum.lies || []).forEach(t => E.lie(t, 1));
    (sum.punchlines || []).forEach(t => { E.post(p.name, '@' + E.slug(p.name), '« ' + t + ' » #débat', true, rint(300, 3000)); p.followers += rint(50, 300); });
    (sum.stmts || []).forEach(st => E.statement(st.text, st.theme || 'institutions', vecOf(st.axes), 0.4, 'débat'));
    if (sum.iv) E.article(pick(['dauph', 'radio']), 'Interview : ' + (sc >= 60 ? p.name + ' convainc' : sc >= 45 ? p.name + ' sans faux pas' : p.name + ' bousculé·e par les questions'), (sc - 50) / 60, 'pj'); else E.article(pick(['alpes3', 'dauph', 'radio']), 'Débat : ' + (sc >= 62 ? p.name + ' domine ses adversaires' : sc >= 45 ? 'match nul, chacun campe sur ses positions' : p.name + ' en difficulté face à ses adversaires'), (sc - 50) / 50, 'pj');
    if (p.cand) p.cand.debates++;
    return (sum.iv ? 'Adhésion finale : ' : 'Le public vous donne gagnant·e à ') + Math.round(sc) + ' %.';
  }
  function applyDialogue(pnjId, ev) {
    const x = S().pnj[pnjId]; x.known = true; const d = clamp(+ev.relation_delta || 0, -30, 25); x.rel = clamp(x.rel + d, -100, 100);
    let m = 'Relation avec ' + x.name + ' : ' + (d >= 0 ? '+' : '') + d + '.';
    if (ev.accord && Array.isArray(ev.accord.clauses) && ev.accord.clauses.length) {
      const cl = ev.accord.clauses.filter(c => E.CLAUSES[c]); if (cl.length) { P().accords.push({ id: E.uid('acc'), with: pnjId, clauses: cl, date: S().date, status: 'actif', offer: 0 }); m += ' Accord conclu : ' + cl.map(c => E.CLAUSES[c]).join(', ') + '.'; if (cl.includes('soutien')) E.addNoto(scopeOf(), x.noto / 10); }
    }
    if (ev.info) m += ' ' + ev.info;
    return m;
  }
  function applyQag(text, ev) { const sc = clamp(+ev.score || 50, 0, 100); E.addNoto('nat', 2 + sc / 30); E.addNoto('circo', 1.5); E.statement(text, ev.theme || 'institutions', vecOf(ev.axes), 0.5, 'QAG'); if (sc > 70) E.post(P().name, '@' + E.slug(P().name), '« ' + (ev.punchline || text.slice(0, 120)) + ' » #QAG', true, rint(500, 4000)); return 'Question au gouvernement notée ' + Math.round(sc) + '/100.'; }
  function applyContribution(text, ev) { const p = P(); const sc = clamp(+ev.score || 50, 0, 100); const pa = D.PARTIES[p.party].ax; const v = vecOf(ev.axes); let fit = 0, n = 0; for (const k in v) { fit += Math.sign(v[k]) === Math.sign(pa[E.AXI[k]]) ? 1 : -1; n++; } fit = n ? fit / n : 0;
    const g = Math.max(0.3, (sc / 45) * (0.6 + 0.4 * fit) + 0.4); p.natSup = clamp(p.natSup + g, 0, 100); p.fedSup = clamp(p.fedSup + g / 2, 0, 100); E.addStd(sc / 30); E.statement(text, ev.theme || 'institutions', v, 0.3, 'contribution interne');
    if (fit < 0) { const ld = S().pnj[S().national.leaders[p.party]]; if (ld) ld.rel -= 6; }
    return 'Contribution notée ' + Math.round(sc) + '/100 : ' + (fit >= 0.3 ? 'dans la ligne, elle rassemble.' : fit <= -0.3 ? 'à contre-courant, elle fâche la direction mais vous distingue.' : 'elle fait débat.') + ' Soutien national +' + g.toFixed(1).replace('.', ',') + ' pt.'; }
  function applyTribune(text, ev, mediaId) { const sc = clamp(+ev.score || 50, 0, 100); E.addNoto(scopeOf(), 2 + sc / 20); P().cred = clamp(P().cred + (sc - 50) / 20, 0, 100); E.statement(text, ev.theme || 'institutions', vecOf(ev.axes), 0.7, 'tribune'); E.article(mediaId, 'Tribune — ' + (ev.titre || P().name + ' : « ' + text.slice(0, 60) + '… »'), 0.2, 'pj', text.slice(0, 300)); if (ev.mensonge) E.lie(text.slice(0, 140), 1); return 'Tribune publiée dans ' + D.MEDIAS.find(m => m.id === mediaId).name + ' (qualité ' + Math.round(sc) + '/100).'; }

  /* ---------- programme ---------- */
  // financement d’une mesure du catalogue : effet sur la crédibilité et sur les perdants
  const CAT_FIN = { local: { redeploiement: [2, []], taxe: [0, ['RET', 'PERI']], emprunt: [-14, []], subventions: [-10, []], aucun: [-10, []] }, national: { economies: [0, ['POP']], riches: [2, ['CAD']], tva: [-2, ['POP', 'PERI']], dette: [-8, []], croissance: [-12, []], aucun: [-12, []] } };
  function newMeasureFromCatalogue(cid, fin) {
    const c = D.CATALOGUE.find(x => x.id === cid); const pop = E.commune().pop;
    const cout = c.level === 'local' ? Math.round(c.cph * pop) : Math.round(c.md * 1e9);
    const fx = fin && (CAT_FIN[c.level] || {})[fin]; const f = fin && (L.FIN[c.level] || []).find(z => z.id === fin); const per = c.l.slice(); if (fx) fx[1].forEach(g => { if (!per.includes(g) && !c.g.includes(g)) per.push(g); });
    return addMeasure({ text: c.t + (f && fin !== 'aucun' ? ', financé par : ' + f.l.toLowerCase() : ''), resume: c.t, level: c.level, theme: c.th, axes: Object.assign({}, c.ax), cout, fin: fin || null, finL: f && fin !== 'aucun' ? f.l : '', competence: 'oui', cred: c.cred + E.rint(-4, 4) + (fx ? fx[0] : 0), gagnants: c.g.slice(), perdants: per, critique: fin === 'aucun' ? 'Financement absent : « qui paiera ? »' : '', src: cid });
  }
  function addMeasure(m) {
    const p = P(); const o = Object.assign({ id: E.uid('mes'), date: S().date, status: 'proposee', phare: false, visib: 20, defended: 0 }, m);
    if (!o.level) o.level = 'local'; if (!S().bulkProg) (S().turnDid = S().turnDid || []).push({ l: 'Mesure proposée', m: o.resume || '' });
    const dup = p.prog.find(x => x.status !== 'retiree' && x.level === o.level && ((o.lever && x.lever === o.lever) || (o.src && x.src === o.src) || x.resume === o.resume));
    if (dup) { const keep = { id: dup.id, date: dup.date, phare: dup.phare, visib: dup.visib, defended: dup.defended, status: dup.status }; Object.keys(dup).forEach(k => delete dup[k]); Object.assign(dup, o, keep, { updated: true }); return dup; } // pas de doublon : on met à jour la mesure existante
    const vo = o.axes ? E.vecFrom(o.axes) : null; const ctr = vo ? p.prog.filter(x => x.status !== 'retiree' && x.axes && x.theme === o.theme && x.level === o.level).find(x => { const w = E.vecFrom(x.axes); let d = 0; for (let i = 0; i < 6; i++) d += vo[i] * w[i]; return d < -1200; }) : null; // même thème, sens opposés
    if (ctr) { o.contra = ctr.id; ctr.contra = o.id; E.log('Attention : « ' + o.resume + ' » contredit « ' + ctr.resume + ' », déjà dans votre programme. Vos adversaires vont s’en servir.', 'bad'); p.cred = clamp(p.cred - 2, 0, 100); }
    p.prog.unshift(o); E.statement(o.text, o.theme, o.axes, 0.5, 'programme');
    (o.gagnants || []).forEach(g => D.SEG_IDS.includes(g) && E.addImage(g, 1.2)); (o.perdants || []).forEach(g => D.SEG_IDS.includes(g) && E.addImage(g, -0.8));
    let delta = (o.cred - 50) / 15; if (o.competence === 'non') delta -= 3; p.cred = clamp(p.cred + delta, 0, 100);
    if (!p.prog.some(x => x.phare && x.id !== o.id) ) o.phare = true;
    return o;
  }
  function addBuilt(levId, v, fin) {
    const lev = L.LEVERS.find(z => z.id === levId); const ev = L.evaluate(lev, v, fin, E.commune()); const f = L.FIN[lev.lvl].find(z => z.id === fin);
    const fl = L.finLabel ? L.finLabel(lev, fin) : (f ? f.l : '');
    return addMeasure({ text: ev.label + (fl && fin !== 'aucun' ? ', financé par : ' + fl.toLowerCase() : ''), resume: ev.label, level: lev.lvl, cp: lev.cp, theme: lev.th, axes: ev.axes, cout: Math.round(ev.cost), inv: Math.round(ev.inv), fin, finL: fl, ind: ev.ind, competence: 'oui', cred: ev.cred, gagnants: ev.gagnants, perdants: ev.perdants, segw: ev.seg, critique: ev.critique, lever: levId, leverV: v, v, src: 'built:' + levId });
  }
  function progSummary() {
    const live = P().prog.filter(m => m.status !== 'retiree'); const sum = lvl => live.filter(m => m.level === lvl);
    const tot = lvl => sum(lvl).reduce((t, m) => t + (m.cout || 0), 0); const unfunded = lvl => sum(lvl).filter(m => (m.cout > 0 || m.inv > 0) && (!m.fin || m.fin === 'aucun' || m.fin === 'croissance' || m.fin === 'dette')).reduce((t, m) => t + Math.max(0, m.cout || 0), 0);
    const cred = live.length ? live.reduce((t, m) => t + m.cred, 0) / live.length : 0;
    const sal = S().national.salience; const covered = new Set(live.map(m => m.theme)); const holes = Object.entries(sal).filter(([t, v]) => v > 0.3 && !covered.has(t)).map(([t]) => t);
    return { n: live.length, phares: live.filter(m => m.phare).length, locCost: tot('local'), natCost: tot('national'), locUnf: unfunded('local'), natUnf: unfunded('national'), cred, holes };
  }
  function setPhare(id) { const p = P(); const m = p.prog.find(x => x.id === id); if (!m) return ''; if (m.phare) { m.phare = false; return 'Retirée des mesures phares.'; } if (p.prog.filter(x => x.phare).length >= 3) return 'Trois mesures phares au maximum : retirez-en une d’abord.'; m.phare = true; m.visib = clamp(m.visib + 8, 0, 100); return '« ' + m.resume + ' » devient une mesure phare.'; }
  function curLevel() { const t = curType(); return t ? (['mun', 'dep', 'reg', 'sen'].includes(t) ? 'local' : 'national') : null; }
  function defendMeasure(id) {
    const p = P(); const m = p.prog.find(x => x.id === id); const e = E.eff() * (m.phare ? 1.2 : 1);
    m.visib = clamp((m.visib || 0) + 16 * e, 0, 100); m.defended = (m.defended || 0) + 1;
    (m.gagnants || []).forEach(g => E.addImage(g, 1.4 * e)); (m.perdants || []).forEach(g => E.addImage(g, -0.6 * e)); E.addNoto(scopeOf(), 1);
    if (inCampaign()) p.camp.terrain += 3;
    let msg = 'Vous défendez « ' + m.resume + ' » : la proposition gagne en visibilité.';
    const t0 = curType(); if (t0 && typeof L !== 'undefined' && !L.inComp(m, t0)) { p.cred = clamp(p.cred - 1.5, 0, 100); msg += ' Mais vos adversaires rappellent qu’elle relève de ' + L.whoDecides(m) + ', pas de ce mandat.'; }
    if (m.cred < 40 && rnd() < 0.35) { E.article('dauph', 'La proposition ' + E.de(p.name) + ' laisse les économistes sceptiques', -0.3, 'pj'); m.visib -= 5; }
    return msg;
  }
  function applyConference(id, score) { const p = P(); const m = p.prog.find(x => x.id === id); m.visib = clamp((m.visib || 0) + 10 + score / 4, 0, 100); m.cred = clamp(m.cred + (score - 50) / 8, 0, 100); p.cred = clamp(p.cred + (score - 50) / 15, 0, 100); E.addNoto(scopeOf(), 2 + score / 25); E.article(pick(['dauph', 'radio', 'alpes3']), p.name + ' présente « ' + m.resume + ' » : ' + (score >= 60 ? 'une proposition solidement défendue' : score >= 45 ? 'des réponses inégales' : 'des journalistes peu convaincus'), (score - 50) / 60, 'pj'); return 'Conférence de presse notée ' + Math.round(score) + '/100.'; }
  function applyInOffice(id) {
    const p = P(); const m = p.prog.find(x => x.id === id); const has = t => p.mandats.some(x => x.type === t);
    if (m.level === 'local' && p.mairie) {
      const mr = p.mairie; const used = mr.projets.filter(x => x.date.slice(0, 4) === S().date.slice(0, 4)).reduce((s2, x) => s2 + x.cost, 0); const cost = Math.max(0, m.cout);
      if (used + cost > mr.invest * 1.6) { return 'Budget insuffisant cette année (' + E.eur(mr.invest - used) + ' disponibles). Empruntez ou augmentez les impôts.'; }
      mr.projets.push({ id: m.id, l: m.resume, cost, date: S().date }); m.status = 'appliquee'; (m.gagnants || []).forEach(g => E.addImage(g, 3)); (m.perdants || []).forEach(g => E.addImage(g, -1.5)); p.cred = clamp(p.cred + 3, 0, 100); E.addNoto('commune', 4);
      E.article('dauph', E.commune().name + ' : promesse tenue, « ' + m.resume + ' » entre en vigueur', 0.4, 'pj'); return 'Promesse tenue : « ' + m.resume + ' » est mise en œuvre (' + E.eur(cost) + ').';
    }
    if (m.level === 'national' && has('depute')) {
      const gov = S().national.gov.includes(p.party); const pr = clamp(0.08 + (gov ? 0.32 : 0) + p.std / 400 + (m.cred - 50) / 300, 0.04, 0.75);
      if (rnd() < pr) { m.status = 'adoptee'; E.addNoto('nat', 7); p.cred = clamp(p.cred + 4, 0, 100); (m.gagnants || []).forEach(g => E.addImage(g, 2.5)); E.article('quotlib', 'L’Assemblée adopte la proposition de loi ' + E.de(p.name) + ' : « ' + m.resume + ' »', 0.5, 'pj'); return 'Victoire : votre proposition de loi est adoptée.'; }
      m.status = 'rejetee'; m.visib = clamp(m.visib + 20, 0, 100); E.addNoto('nat', 2); E.article('quotlib', 'La proposition de loi ' + E.de(p.name) + ' rejetée en séance', -0.1, 'pj'); return 'Proposition de loi rejetée, mais le débat a eu lieu et votre proposition est désormais connue.';
    }
    if (m.level === 'local' && (has('cd') || has('conseiller_municipal') || has('adjoint'))) {
      const maj = p.mandats.some(x => ['cd', 'conseiller_municipal', 'adjoint'].includes(x.type) && x.majority);
      if (rnd() < (maj ? 0.55 : 0.15)) { m.status = 'adoptee'; p.cred = clamp(p.cred + 2, 0, 100); (m.gagnants || []).forEach(g => E.addImage(g, 1.8)); E.article('dauph', 'Le conseil adopte le vœu ' + E.de(p.name) + ' : « ' + m.resume + ' »', 0.3, 'pj'); return 'Votre vœu est adopté par le conseil.'; }
      m.visib = clamp(m.visib + 12, 0, 100); return 'Le conseil rejette votre vœu' + (maj ? '' : ' (vous êtes dans l’opposition)') + ', mais vous avez pris date.';
    }
    return 'Cette proposition ne relève pas de votre mandat actuel (' + (m.level === 'local' ? 'il faut un mandat local' : 'il faut être député·e') + ').';
  }

  /* ---------- équipe ---------- */
  function staffCandidates(role) {
    return [0, 1, 2].map(i => { const benevole = i === 0; const comp = benevole ? rint(25, 55) : rint(45, 92); const g = rnd() < 0.5 ? 'F' : 'M';
      return { id: E.uid('st'), role, g, name: (g === 'F' ? pick(D.FIRST_F) : pick(D.FIRST_M)) + ' ' + pick(D.LAST), comp, loy: rint(30, 90), amb: rint(20, 90), disc: rint(30, 90), sal: benevole ? 0 : Math.round((900 + comp * 30) / 50) * 50, date: S().date }; });
  }
  function hire(st) { const p = P(); if (p.staff.filter(x => x.role === st.role).length) p.staff = p.staff.filter(x => x.role !== st.role); p.staff.push(st); p.casseroles.forEach(c => { if (rnd() < 0.2) c.known.push(st.id); }); E.log('Recrutement : ' + st.name + ', ' + D.STAFF_ROLES[st.role].l + (st.sal ? ' (' + eur(st.sal) + '/mois)' : ' (bénévole)') + '.', 'good'); }
  function setMission(id, m, mt) { const st = P().staff.find(z => z.id === id); if (!st) return; st.mission = m; st.mt = mt || null; }
  function raise(id) { const p = P(); const st = p.staff.find(z => z.id === id); if (!st) return ''; if (!st.sal) { st.sal = 900; st.loy = clamp(st.loy + 15, 0, 100); return st.name + ' passe de bénévole à salarié·e (900 €/mois). Loyauté en hausse.'; } st.sal = Math.round(st.sal * 1.2 / 50) * 50; st.loy = clamp(st.loy + 12, 0, 100); return st.name + ' est augmenté·e : ' + E.eur(st.sal) + '/mois. Loyauté en hausse.'; }
  function recadrer(id) { const st = P().staff.find(z => z.id === id); if (!st) return ''; st.comp = clamp(st.comp + 3, 0, 95); st.loy = clamp(st.loy - (st.amb > 60 ? 10 : 4), 0, 100); return 'Vous recadrez ' + st.name + ' : un peu plus rigoureux·se, un peu moins loyal·e.'; }
  function fire(id) { const p = P(); const st = p.staff.find(x => x.id === id); p.staff = p.staff.filter(x => x.id !== id); if (st && st.loy < 50 && st.amb > 50) { p.casseroles.filter(c => c.known.includes(st.id)).forEach(c => c.risk += 0.06); E.log(st.name + ' part fâché·e. Il·elle en sait beaucoup.', 'bad'); } else if (st) E.log(st.name + ' quitte l’équipe.', 'info'); }

  /* ---------- décisions en file ---------- */
  function resolveSection(run) {
    const p = P(); const sec = S().pnj[p.secId];
    if (!run) { p.std = clamp(p.std + 1, 0, 100); E.log('Vous ne vous présentez pas au secrétariat de section.', 'info'); return 'Vous laissez passer votre tour.'; }
    const sc = p.std + p.militants * 1.5 + rnd() * 30; const rs = (sec ? sec.std : 40) + rnd() * 30;
    if (sc > rs) { p.secLeader = true; p.std = clamp(p.std + 6, 0, 100); if (sec) { sec.rel -= 25; sec.role = 'cadre'; sec.mandat = 'Ancien·ne secrétaire de section'; } E.rankUpdate(); E.addNoto('commune', 3); return 'Vous êtes élu·e secrétaire de section.' + (sec ? ' ' + sec.name + ' encaisse mal.' : ''); }
    p.std = clamp(p.std - 3, 0, 100); if (sec) sec.rel -= 10; return 'Battu·e à l’élection de section. ' + (sec ? sec.name + ' reste en place.' : '');
  }
  function resolveOffer(q, accept) {
    const p = P(); const x = S().pnj[q.pnj];
    if (q.type === 'soutien') { if (accept) { p.accords.push({ id: E.uid('acc'), with: x.id, clauses: ['soutien'], date: S().date, status: 'actif' }); E.addNoto(scopeOf(), x.noto / 8); E.article('dauph', x.name + ' apporte son soutien à ' + p.name, 0.3, 'pj'); return x.name + ' vous soutient publiquement.'; } return 'Vous déclinez le soutien ' + E.de(x.name) + '.'; }
    if (q.type === 'enveloppe') { if (accept) { p.cash += q.amount; E.casserole('occulte', 'une enveloppe de ' + eur(q.amount) + ' remise par ' + x.name, q.amount > 15000 ? 4 : 3, true, 0.035); x.rel += 15; p.promises.push({ to: x.id, what: 'contrepartie', date: S().date }); return 'Vous acceptez ' + eur(q.amount) + '. ' + x.name + ' attend un retour.'; } x.rel -= 10; return 'Vous refusez. ' + x.name + ' n’insiste pas.'; }
  }
  function resolveT2(q, maintain) {
    const el = S().elections.find(e => e.id === q.el); const r = el && el.races[q.key]; if (!r) return '';
    if (maintain) { E.log('Vous vous maintenez au second tour.', 'info'); return 'Vous vous maintenez.'; }
    r.t2 = r.t2.filter(id => id !== 'PJ'); if (typeof MP !== 'undefined' && MP.on && MP.on()) MP.setWithdraw(q.el, q.key, null); E.statement('Je me retire pour faire barrage.', 'institutions', { inst: -20 }, 0.4, 'désistement'); P().std = clamp(P().std + 3, 0, 100);
    E.log('Vous vous désistez au second tour.', 'info'); return 'Vous vous retirez de la course.';
  }
  function resolveConsigne(q, targetId) {
    const el = S().elections.find(e => e.id === q.el); const r = el && el.races[q.key]; if (!r) return '';
    if (!targetId) { E.log('Pas de consigne de vote pour le second tour.', 'info'); return 'Vous ne donnez pas de consigne.'; }
    const me = r.rows.find(x => x.pj); const c = r.cands.find(x => x.id === targetId); if (c) c.mom = (c.mom || 0) + (me ? me.pct : 5) / 120;
    const x = S().pnj[targetId]; if (x) { x.rel += 20; x.known = true; }
    E.statement('J’appelle à voter pour ' + (c ? c.name : '') + ' au second tour.', 'institutions', {}, 0.2, 'consigne');
    E.log('Vous appelez à voter ' + (c ? c.name : '') + '.', 'info'); return 'Consigne de vote donnée.';
  }

  /* ---------- mairie ---------- */
  const PROJETS = [
    { id: 'ecoles', l: 'Rénover les écoles', c: 0.5, seg: { CAD: 3, JUD: 2, PERI: 3, POP: 2 }, ax: { eco: -10 }, th: 'education' },
    { id: 'police', l: 'Créer ou renforcer la police municipale', c: 0.3, seg: { RET: 4, PERI: 3, POP: 1, JUD: -2 }, ax: { aut: 40 }, th: 'securite' },
    { id: 'velo', l: 'Pistes cyclables et piétonnisation', c: 0.35, seg: { JUD: 4, CAD: 2, RET: -2, PERI: -2 }, ax: { ecol: -40 }, th: 'ecologie' },
    { id: 'voirie', l: 'Voirie et parkings', c: 0.4, seg: { PERI: 3, RET: 2, RUR: 2, JUD: -1 }, ax: { ecol: 30 }, th: 'transports' },
    { id: 'logement', l: 'Logements sociaux', c: 0.45, seg: { POP: 4, JUD: 2, RET: -1, PERI: -1 }, ax: { eco: -30 }, th: 'logement' },
    { id: 'centre', l: 'Revitaliser le centre-bourg et les commerces', c: 0.35, seg: { RET: 2, PERI: 2, RUR: 2, CAD: 1 }, ax: { eco: 10 }, th: 'economie' },
    { id: 'sante', l: 'Ouvrir un centre de santé municipal', c: 0.4, seg: { RET: 4, POP: 3, RUR: 3 }, ax: { eco: -20 }, th: 'sante' },
    { id: 'culture', l: 'Saison culturelle et médiathèque', c: 0.2, seg: { JUD: 3, CAD: 2, RET: 1 }, ax: { soc: -10 }, th: 'societe' }
  ];
  function mairieProjet(id) {
    const m = P().mairie; const pr = PROJETS.find(x => x.id === id); const cost = Math.round(m.invest * pr.c);
    if (m.projets.filter(x => x.date.slice(0, 4) === S().date.slice(0, 4)).reduce((a, x) => a + x.cost, 0) + cost > m.invest) return { ok: false, msg: 'Capacité d’investissement annuelle épuisée (' + eur(m.invest) + '). Empruntez ou augmentez la taxe foncière.' };
    m.projets.push({ id, l: pr.l, cost, date: S().date }); for (const s in pr.seg) E.addImage(s, pr.seg[s]); E.statement(pr.l, pr.th, pr.ax, 0.5, 'mairie'); E.addNoto('commune', 3);
    E.article('dauph', E.commune().name + ' : la municipalité lance « ' + pr.l + ' »', 0.2, 'pj'); return { ok: true, msg: pr.l + ' : ' + eur(cost) + ' engagés.' };
  }
  function mairieTaxe(delta) { const m = P().mairie; m.tf = clamp(m.tf + delta, 15, 60); E.addImage('RET', -2.5 * delta); E.addImage('PERI', -2.5 * delta); E.addImage('CAD', -1.5 * delta); E.statement(delta > 0 ? 'Hausse de la taxe foncière' : 'Baisse de la taxe foncière', 'fiscalite', { eco: delta > 0 ? -25 : 25 }, 0.5, 'mairie'); return 'Taux de taxe foncière : ' + m.tf + ' %.'; }
  function mairieEmprunt() { const m = P().mairie; const amt = Math.round(m.invest * 0.5); m.dette += amt; m.invest += amt; return 'Emprunt de ' + eur(amt) + ' : dette ' + eur(m.dette) + '.'; }

  /* ---------- mesure des effets ---------- */
  function snap() { const p = P(); return { nc: p.noto.commune, nci: p.noto.circo, nn: p.noto.nat, pop: E.popularity(), cred: p.cred, std: p.std, mil: p.militants, cash: p.cash + (p.cand && p.cand.compte ? p.cand.compte.recettes - p.cand.compte.depenses : 0), fol: p.followers, img: Object.assign({}, p.image), est: S().est ? S().est.pct : null }; }
  function deltas(a, b) {
    const out = []; const add = (l, d, dec, unit) => { if (Math.abs(d) >= (dec ? 0.05 : 0.5)) out.push({ l, d, t: (d > 0 ? '+' : '−') + (dec ? Math.abs(d).toFixed(1).replace('.', ',') : Math.round(Math.abs(d)).toLocaleString('fr-FR')) + (unit || '') }); };
    add('Notoriété locale', b.nc - a.nc, 1); add('Notoriété circo', b.nci - a.nci, 1); add('Notoriété nationale', b.nn - a.nn, 1); add('Popularité', b.pop - a.pop, 1); add('Crédibilité', b.cred - a.cred, 1); add('Poids au parti', b.std - a.std, 1); add('Militants', b.mil - a.mil); add('Abonnés X', b.fol - a.fol); add('Argent', b.cash - a.cash, false, ' €');
    D.SEGS.forEach(g => { const d = (b.img[g.id] || 0) - (a.img[g.id] || 0); if (Math.abs(d) >= 0.8) out.push({ l: 'Image ' + g.name.toLowerCase(), d, t: (d > 0 ? '+' : '−') + Math.abs(d).toFixed(1).replace('.', ',') }); });
    if (a.est != null && b.est != null) add('Score estimé', b.est - a.est, 1, ' pt');
    return out;
  }

  /* ---------- sauvegarde ---------- */
  function prune(s, hard) {
    const cap = (k, n) => { if (Array.isArray(s[k]) && s[k].length > n) s[k] = s[k].slice(0, n); };
    if (s.p && s.p.hq) { const h = s.p.hq; const keep = hard ? 20 : 40; if (h.boucle && h.boucle.length > keep) h.boucle = h.boucle.slice(0, keep).concat(h.boucle.slice(keep).filter(m => m.dec && m.dec.done == null)); (h.boucle || []).forEach(m => { if (m.dec && m.dec.done != null) { m.dec.opts = m.dec.opts.map(o => ({ l: o.l })); m.dec.data = null; } }); }
    cap('news', hard ? 50 : 70); cap('posts', hard ? 30 : 60); cap('sms', hard ? 40 : 70); cap('polls', hard ? 10 : 20);
    if (Array.isArray(s.log) && s.log.length > (hard ? 100 : 160)) s.log = s.log.slice(0, hard ? 100 : 160);
    if (Array.isArray(s.hist) && s.hist.length > 200) s.hist = s.hist.slice(-200);
    if (Array.isArray(s.results) && s.results.length > (hard ? 12 : 24)) s.results = s.results.slice(0, hard ? 12 : 24); // les plus récents sont en tête
    cap('polls', hard ? 8 : 14);
    const last = {}; (s.elections || []).forEach(e => { if (e.status === 'fini') last[e.type] = e.id; });
    (s.elections || []).forEach(e => { if (e.status === 'fini' && e.races && last[e.type] !== e.id) { for (const k in e.races) { const r = e.races[k]; delete r.cands; if (r.r2) delete r.r2.cands; } } });
    (s.elections || []).forEach(e => { if (e.status === 'fini' && e.races && hard) { for (const k in e.races) { const r = e.races[k]; if (k !== (s.p.cand && s.p.cand.key)) { delete r.cands; if (r.r2) delete r.r2.cands; } } } });
    Object.values(s.pnj || {}).forEach(x => { if (!x.alive && hard) { delete x.prog; delete x.mem; } });
    if (hard) { const live = []; (s.elections || []).forEach(e => { if (e.status !== 'fini' && e.races) for (const k in e.races) { const r = e.races[k]; (r.cands || []).forEach(c => live.push(c.id)); if (r.r2) (r.r2.cands || []).forEach(c => live.push(c.id)); (r.t2 || []).forEach(id => live.push(id)); } });
      const keep = new Set([].concat(live, s.rivals || [], Object.values(s.arcs || {}).filter(v => typeof v === 'string'), (s.p.dossiers || []).map(d => d.on), (s.p.promises || []).map(x => x.to), (s.p.accords || []).map(x => x.with || x.pnj), Object.values(s.national.leaders || {}), [s.p.fedId, s.p.secId]));
      Object.values(s.pnj || {}).forEach(x => { if (x.role === 'candidat' && !x.known && !x.human && !(x.mem && x.mem.length) && !x.rel && !keep.has(x.id)) delete s.pnj[x.id]; }); }
  }
  const rnd3 = (k, v) => typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v;
  function serialize() { const s = S(); prune(s, false); let j = JSON.stringify(s, rnd3); if (j.length > 220000) { prune(s, true); j = JSON.stringify(s, rnd3); } return j; }
  function load(json) { const s = typeof json === 'string' ? JSON.parse(json) : json; if (!s || !s.p || !s.date) throw new Error('Sauvegarde invalide'); G.S = s; repair(s); return s; }
  // Réparation des sauvegardes abîmées par l'ancien compactage : candidats d'une élection en cours effacés, candidature vers une élection disparue.
  function repair(s) {
    s.pnj = s.pnj || {};
    (s.elections || []).forEach(e => { if (!e.races) return; for (const k in e.races) { const r = e.races[k]; [].concat(r.cands || [], (r.r2 && r.r2.cands) || []).forEach(c => { if (c && c.id && c.id !== 'PJ' && !c.pjList && !s.pnj[c.id] && !/^(MP|H_)/.test(c.id)) s.pnj[c.id] = { id: c.id, g: 'F', name: c.name || 'Candidat·e', age: 50, party: c.party || 'DIV', ax: c.ax || (D.PARTIES[c.party || 'DIV'] || D.PARTIES.DIV).ax.slice(), traits: { loyaute: 50, ambition: 50, scrupules: 50, sangfroid: 50, terrain: 50, rancune: 40 }, noto: c.noto || 30, rel: 0, img: 0, secrets: 0, std: 40, mom: 0, role: 'candidat', territory: null, mandat: null, alive: true, enemy: false, known: true }; }); } });
    const p = s.p; if (p.cand && !(s.elections || []).some(e => e.id === p.cand.el)) { p.cand = null; p.camp = { terrain: 0, medias: 0, num: 0, meet: 0 }; }
  }

  return { CAT_FIN, doOff, setMission, raise, recadrer, addBuilt, progSummary, applyContribution, newMeasureFromCatalogue, addMeasure, setPhare, defendMeasure, applyConference, applyInOffice, curLevel, snap, deltas, ACTIONS, avail, doAction, startAI, costOf, applyPost, applyMeasure, applySpeech, applyDebate, applyDialogue, applyQag, applyTribune, staffCandidates, hire, fire, resolveSection, resolveOffer, resolveT2, resolveConsigne, PROJETS, mairieProjet, mairieTaxe, mairieEmprunt, serialize, load, scopeOf, curType, inCampaign };
})();
