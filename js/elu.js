/* Mandat — la vie réelle des élus (d'après les enquêtes AMF-Cevipof, ELUSAN, CALAÉ, CNCCFP, Public Sénat, LCP).
   Majorité qui se fissure, interco, binôme, collaborateurs, financeurs, permanence, Paris/circo, maire employeur,
   village, budget en équilibre, Assemblée (incidents, QAG, groupe), sénatoriales, Région, associations, opposition,
   bulletin municipal, présidence d'interco, déport, lobbies, dauphin. */
const EL = (() => {
  const S = () => G.S, P = () => G.S.p;
  const R = () => E.rnd(), pick = a => E.pick(a), clamp = (v, a, b) => E.clamp(v, a, b), rint = (a, b) => E.rint(a, b);
  const has = t => P().mandats.some(m => m.type === t); const mayor = () => !!P().mairie && has('maire');
  const place = () => E.commune().name; const pet = () => !!(E.myPetite && E.myPetite()) || E.commune().pop < 1000;
  const mk = o => FL.mkItem(o.k, o); const W = () => { const s = S(); s.elu = s.elu || { seen: {} }; return s.elu; };
  const due = (k, days) => { const w = W(); const d = w.seen[k]; return !d || E.diffDays(d, S().date) >= days; };
  const seen = k => { W().seen[k] = S().date; };
  const of = () => (typeof OF !== 'undefined' ? OF.of() : {});
  const nmG = g => pick(g === 'F' ? D.FIRST_F : D.FIRST_M) + ' ' + pick(D.LAST);
  const council = () => { const pop = E.commune().pop; return pop < 100 ? 7 : pop < 500 ? 11 : pop < 1500 ? 15 : pop < 2500 ? 19 : pop < 3500 ? 23 : pop < 5000 ? 27 : pop < 10000 ? 29 : pop < 20000 ? 33 : 35; };
  const preElection = () => { const e = E.nextElection(); return e && E.diffDays(S().date, e.d1) <= 183 && E.diffDays(S().date, e.d1) > 0 ? e : null; };

  /* ===== Mairie ===== */
  // Majorité qui se fissure : 1re cause de démission des maires (31 %, Cevipof 2025)
  function frondeItem() { const m = P().mairie; const a = (of().adj || []).filter(x => x.on).sort((x, y) => x.loy - y.loy)[0]; if (!a || a.loy > 62) return null; const want = pick(['une délégation élargie', 'un projet pour son quartier', 'une place de premier·ère adjoint·e', 'la tête de liste aux prochaines municipales']); const il = a.g === 'F' ? 'elle' : 'il';
    return mk({ k: 'fronde', from: a.name + ', adjoint·e', t: 'Fronde dans la majorité : ' + a.name + ' menace de démissionner', body: a.name + ' réclame ' + want + ' et laisse entendre que trois conseillers de la majorité ' + (il === 'elle' ? 'la' : 'le') + ' suivraient. Si un tiers du conseil (' + Math.ceil(council() / 3) + ' élus) démissionne, il faudra revoter dans les trois mois.', opts: [
      { l: 'Céder', sub: want.includes('projet') ? '60 000 € d’investissement' : 'Coût politique dans la majorité', inv: want.includes('projet') ? 60000 : 0, fx: { coh: 4 }, el: { adj: a.id, d: 20 }, res: 'La crise est évitée. Les autres adjoints ont noté qu’il suffit de menacer.' },
      { l: 'Le ou la recadrer en bureau municipal', h: 2, fx: { coh: -3, cred: 1 }, el: { adj: a.id, d: -10, risk: 0.35 }, res: 'Explication franche. Reste à voir si ' + il + ' rentre dans le rang.' },
      { l: 'Le ou la laisser partir', fx: { coh: -6 }, el: { quit: a.id, n: rint(1, 3) }, res: a.name + ' quitte la majorité avec des fidèles.' }],
      dflt: { fx: { coh: -5 }, el: { adj: a.id, d: -12, risk: 0.5 }, res: 'Votre silence est pris pour du mépris.' } }); }
  function lostCheck() { const m = P().mairie; if (!m) return; if ((m.lost || 0) >= Math.ceil(council() / 3) && !m.anticip) { m.anticip = S().date; FL.push(mk({ k: 'anticip', urgent: 1, from: 'La préfecture', t: 'Élections municipales anticipées', body: 'Un tiers du conseil municipal a démissionné : la loi impose de revoter dans les trois mois. Vous pouvez repartir en campagne avec une liste renouvelée, ou passer la main.', opts: [
      { l: 'Repartir en campagne avec une liste renouvelée', h: 6, el: { anticip: 'go' } },
      { l: 'Passer la main et ne pas me représenter', el: { anticip: 'stop' } }], dflt: { el: { anticip: 'go' } } })); } }
  // Maire employeur : DGS, agents, recrutements
  function dgsItem() { const m = P().mairie; m.dgs = m.dgs || { name: nmG(R() < 0.5 ? 'F' : 'M'), comp: rint(45, 80) };
    const L = [
      () => mk({ k: 'emp', from: 'Ressources humaines', t: 'Votre DGS, ' + m.dgs.name + ', obtient une mutation', body: 'Le directeur ou la directrice générale des services part dans six semaines. C’est la personne qui fait tourner la mairie : budget, marchés, personnel.', opts: [
        { l: 'Recruter un profil expérimenté', sub: 'Plus cher, opérationnel vite', inv: 25000, el: { dgs: rint(70, 90) }, res: 'Un DGS chevronné arrive. Les dossiers repartent.' },
        { l: 'Promouvoir un cadre de la maison', el: { dgs: rint(45, 70) }, fx: { coh: 1 }, res: 'Promotion interne : les agents apprécient, l’apprentissage sera long.' },
        { l: 'Laisser le poste vacant quelques mois', el: { dgs: 0 }, res: 'Les projets ralentissent, les agents s’inquiètent.' }], dflt: { el: { dgs: 0 }, res: 'Poste vacant : tout ralentit.' } }),
      () => mk({ k: 'emp', from: 'Le DGS', t: 'Absentéisme record aux services techniques', body: 'Un agent sur cinq est en arrêt aux services techniques. Les espaces verts et la voirie prennent du retard, les habitants le voient.', opts: [
        { l: 'Plan de prévention et réorganisation', h: 2, inv: 15000, fx: { coh: 1 }, el: { emp: 1 }, res: 'Les arrêts baissent en quelques mois. Les agents se sentent écoutés.' },
        { l: 'Recourir à des prestataires privés', inv: 30000, fx: { img: { PERI: 0.6 } }, res: 'Les rues sont propres, les syndicats grincent.' },
        { l: 'Rappeler les règles et contrôler les arrêts', fx: { coh: -1 }, el: { emp: -1 }, res: 'Le climat se tend. Préavis de grève possible.' }], dflt: { fx: { img: { PERI: -0.8, RET: -0.6 } }, res: 'Les retards s’accumulent, les habitants se plaignent.' } }),
      () => { const adj = (of().adj || []).find(x => x.on); const who = adj ? adj.name : 'un adjoint'; return mk({ k: 'deport', from: 'Le DGS', t: 'Recrutement : le candidat est le fils d’' + who, body: 'Pour le poste de policier municipal, le meilleur dossier sur le papier est celui du fils de ' + who + '. Le jury se réunit jeudi.', opts: [
        { l: 'Faire siéger un jury sans l’adjoint concerné', fx: { cred: 1.5 }, res: 'Procédure irréprochable. Le candidat est retenu, ou non, sur ses mérites.' },
        { l: 'Le recruter directement pour faire plaisir', ill: 'Favoritisme et prise illégale d’intérêts : jusqu’à 5 ans de prison et 500 000 € d’amende', fx: { coh: 3, cas: ['favoritisme', 'le recrutement du fils d’un adjoint', 2, 0.1] }, res: 'L’adjoint est ravi. L’opposition, elle, a l’œil.' },
        { l: 'Écarter sa candidature par prudence', fx: { coh: -2 }, res: 'Vous évitez le soupçon, l’adjoint vous en veut.' }], dflt: { res: 'Le jury s’est réuni sans consigne.' } }); }];
    return pick(L)(); }
  // Village qui manque de bras
  function villageItem() { const L = [
      () => mk({ k: 'vil', from: 'Le secrétariat de mairie', t: 'Deux conseillers municipaux démissionnent', body: 'Déménagement et lassitude : deux conseillers partent. Le conseil passe à ' + (council() - 2) + ' membres, réputé complet, mais les tâches retombent sur les autres.', opts: [
        { l: 'Redistribuer les tâches en conseil', h: 2, fx: { coh: 1 }, res: 'Chacun prend un morceau. Ça tient, de justesse.' },
        { l: 'Chercher des bénévoles parmi les habitants', h: 3, fx: { img: { RUR: 1, RET: 0.6 } }, res: 'Trois retraités se proposent pour les fêtes et le fleurissement.' },
        { l: 'Tout reprendre vous-même', h: 4, fx: { all: 0.4 }, res: 'Vous faites tout. C’est épuisant, mais c’est fait.' }], dflt: { fx: { all: -0.6 }, res: 'Des tâches restent en plan : le cimetière n’est pas entretenu.' } }),
      () => mk({ k: 'vil', from: 'Un habitant', t: pick(['Le stade n’a pas été tondu', 'Il faut poser les illuminations de Noël', 'Une buse est bouchée sur le chemin communal']), body: 'Pas d’agent disponible avant trois semaines. Au village, quand ça ne se fait pas, on sait qui est le maire.', opts: [
        { l: 'Le faire vous-même ce week-end', h: 3, fx: { img: { RUR: 1.2, RET: 0.8 } }, res: 'Vous y passez votre samedi. Les voisins viennent donner un coup de main.' },
        { l: 'Payer une entreprise', inv: 3000, res: 'Fait en deux jours, mais 3 000 € pour un petit budget, ça se voit.' },
        { l: 'Attendre l’agent', res: 'Trois semaines d’attente.' }], dflt: { fx: { img: { RUR: -0.6 } }, res: 'Ça traîne. On en parle au café.' } }),
      () => mk({ k: 'vil', from: 'La préfecture', t: 'Personne pour tenir le bureau de vote', body: 'Pour le prochain scrutin, il manque trois assesseurs. Sans eux, le bureau ne peut pas ouvrir.', opts: [
        { l: 'Faire du porte-à-porte pour trouver des volontaires', h: 2, fx: { noto: 0.4, img: { RET: 0.4 } }, res: 'Trois volontaires, dont un jeune de 19 ans ravi de découvrir.' },
        { l: 'Tenir le bureau toute la journée vous-même', h: 3, res: 'Douze heures au bureau de vote. Le métier.' }], dflt: { fx: { cred: -1 }, res: 'Ouverture en retard, le préfet vous rappelle à l’ordre.' } })];
    return pick(L)(); }
  // Budget en équilibre obligatoire (art. L1612-4 CGCT)
  function budgetEqItem() { const m = P().mairie; const gap = Math.round((m.budget || 2e6) * (0.015 + R() * 0.035) / 1000) * 1000; const eur = E.eur(gap);
    return mk({ k: 'budgeq', from: 'La commission des finances', t: 'Préparer le budget : il manque ' + eur, body: 'Énergie, salaires, baisse des dotations : pour équilibrer le budget de fonctionnement, il manque ' + eur + '. Un budget communal doit être voté en équilibre, et on ne peut pas emprunter pour payer le fonctionnement.', opts: [
      { l: 'Augmenter la taxe foncière', fx: { img: { RET: -1.5, POP: -1, PERI: -1 }, coh: -2 }, el: { tf: 1 }, res: 'Équilibre trouvé par l’impôt. Les propriétaires le sentiront à l’automne.' },
      { l: 'Économiser sur le fonctionnement', h: 3, fx: { coh: -2, img: { POP: -0.6 } }, res: 'Horaires de la piscine réduits, éclairage coupé la nuit, un poste non remplacé. Ça passe.' },
      { l: 'Reporter un investissement', fx: { cred: -1 }, el: { inv: -Math.max(gap * 2, 60000) }, res: 'Le projet attendra un an. Les riverains concernés sont déçus.' },
      { l: 'Emprunter pour boucher le trou', ill: 'Interdit : un emprunt ne peut financer que l’investissement. Le préfet saisira la chambre régionale des comptes', fx: { cred: -4, art: ['dauph', 'Budget de ' + place() + ' : le préfet saisit la chambre régionale des comptes', -0.6] }, res: 'Le préfet refuse le budget et saisit la chambre régionale des comptes. Humiliant.' }],
      dflt: { fx: { cred: -3 }, res: 'Faute de budget voté à temps, le préfet règle lui-même les comptes.' } }); }
  // Associations et subventions
  function assoItem() { const A = pick([['le club de foot', 'un minibus pour les déplacements', 15000, { PERI: 1, POP: 0.8 }], ['le comité des fêtes', 'le feu d’artifice et la fête du village', 8000, { RET: 0.8, PERI: 0.8 }], ['l’association culturelle', 'un festival de théâtre', 12000, { JUD: 1, CAD: 0.8 }], ['les Restos du cœur', 'un local plus grand', 10000, { POP: 1.2 }], ['le club des aînés', 'des sorties et un minibus partagé', 6000, { RET: 1.4 }]]); const pres = nmG(R() < 0.5 ? 'F' : 'M');
    return mk({ k: 'asso', from: pres + ', président·e de ' + A[0], t: 'Subvention : ' + A[0] + ' demande ' + E.eur(A[2]), body: A[0].charAt(0).toUpperCase() + A[0].slice(1) + ' demande ' + E.eur(A[2]) + ' pour ' + A[1] + '. ' + pres + ' connaît tout le monde et fait l’opinion dans le quartier.', opts: [
      { l: 'Accorder', inv: A[2], fx: { img: A[3] }, debt: [pres + ', ' + A[0], 'une subvention de ' + E.eur(A[2])], res: 'Subvention votée. ' + pres + ' le dira à tout le monde, et s’en souviendra.' },
      { l: 'Accorder la moitié, avec une convention d’objectifs', inv: Math.round(A[2] / 2), fx: { cred: 1, img: Object.fromEntries(Object.entries(A[3]).map(([k, v]) => [k, v / 2])) }, res: 'Compromis sérieux. Le bureau de l’association grogne un peu.' },
      { l: 'Refuser', fx: { img: Object.fromEntries(Object.entries(A[3]).map(([k, v]) => [k, -v / 2])) }, later: [2, 'asso', {}], res: 'Refus. L’association le fera savoir à sa prochaine assemblée générale.' }],
      dflt: { fx: { img: Object.fromEntries(Object.entries(A[3]).map(([k, v]) => [k, -v / 3])) }, res: 'Sans réponse, l’association se sent méprisée.' } }); }
  // Opposition municipale outillée
  function oppoMaireItem() { const L = [
      () => mk({ k: 'oppo', from: 'Le tribunal administratif', t: 'L’opposition attaque une délibération', body: 'Le groupe d’opposition dépose un recours contre votre délibération sur ' + pick(['la vente d’un terrain communal', 'les tarifs de la cantine', 'l’attribution d’un marché de voirie', 'le plan local d’urbanisme']) + ' : vice de procédure, selon eux.', opts: [
        { l: 'Défendre la délibération avec un avocat', inv: 8000, r: [{ p: 0.65, res: 'Le tribunal rejette le recours. L’opposition en sort affaiblie.', fx: { cred: 1.5 } }, { res: 'Délibération annulée pour vice de forme. Il faudra la revoter.', fx: { cred: -2, art: ['dauph', place() + ' : le tribunal annule une délibération municipale', -0.4] } }] },
        { l: 'Retirer et revoter proprement', h: 2, fx: { cred: -0.5 }, res: 'Vous revotez en corrigeant la forme. Le recours tombe.' },
        { l: 'Négocier avec l’opposition', h: 2, fx: { cred: 1, coh: -1 }, res: 'Un amendement de l’opposition est intégré, le recours est retiré.' }], dflt: { res: 'Le tribunal statuera dans quelques mois.' } }),
      () => mk({ k: 'oppo', from: 'Le bulletin municipal', t: 'Tribune de l’opposition contre vous', body: 'La loi oblige à laisser une tribune à l’opposition dans le bulletin municipal. Ce mois-ci, elle vous accuse de ' + pick(['mentir sur la dette', 'bétonner la commune', 'abandonner les quartiers', 'gaspiller pour votre communication']) + '.', opts: [
        { l: 'Répondre point par point dans votre édito', fx: { cred: 1 }, res: 'Réponse factuelle. Les lecteurs jugeront.' },
        { l: 'Ignorer', res: 'Vous ne donnez pas d’écho à l’attaque.' },
        { l: 'Demander à retarder la tribune', ill: 'Entrave au droit d’expression de l’opposition : délibération et bulletin annulables', fx: { cred: -3, art: ['dauph', 'L’opposition de ' + place() + ' censurée ?', -0.5] }, res: 'L’opposition crie à la censure, et elle a raison.' }], dflt: { res: 'La tribune est parue.' } })];
    return pick(L)(); }
  function oppoItem() { const mx = (S().pnj ? Object.values(S().pnj).find(x => x.role === 'maire' && x.territory === P().communeId) : null); const mn = mx ? mx.name : 'le maire';
    return mk({ k: 'oppo', from: 'Votre groupe d’opposition', t: 'Que faire de la délibération sur ' + pick(['la hausse des tarifs de la cantine', 'la vente du terrain de la gare', 'le marché de voirie']) + ' ?', body: 'Vous êtes dans l’opposition : vous n’avez pas le pouvoir, mais vous avez des armes. ' + mn + ' fait voter la délibération jeudi.', opts: [
      { l: 'Déposer une question écrite et la médiatiser', h: 1, fx: { noto: 0.6, cred: 0.6 }, res: 'Votre question oblige ' + mn + ' à répondre publiquement.' },
      { l: 'Former un recours au tribunal administratif', h: 3, cash: -1500, r: [{ p: 0.35, res: 'Le tribunal annule la délibération. Coup politique majeur.', fx: { noto: 2, cred: 2, rrel: -10 } }, { res: 'Recours rejeté. On vous reproche de faire de la procédure.', fx: { cred: -1 } }] },
      { l: 'Proposer un amendement constructif', h: 2, fx: { cred: 1.2, img: { CAD: 0.6, RET: 0.6 } }, res: 'Amendement rejeté, mais votre sérieux est noté.' }], dflt: { res: 'La délibération passe sans débat.' } }); }
  // Bulletin municipal : la règle des six mois (art. L52-1 du code électoral)
  function bulletinItem() { const pre = preElection();
    return mk({ k: 'bull', from: 'Le service communication', t: 'Le bulletin municipal part à l’impression', body: 'Votre édito doit être bouclé lundi.' + (pre ? ' Attention : l’élection est dans moins de six mois. Toute promotion de votre action dans les supports de la commune peut être requalifiée en propagande.' : ''), opts: [
      { l: 'Un édito d’information, factuel', fx: { noto: 0.5, cred: 0.6 }, res: 'Travaux, agenda, services : utile et sans risque.' },
      { l: 'Donner la parole aux habitants', h: 1, fx: { noto: 0.4, img: { RET: 0.5, PERI: 0.5 } }, res: 'Portraits de bénévoles et de commerçants. Très lu.' },
      { l: pre ? 'Un bilan flatteur de votre mandat' : 'Mettre en avant vos réalisations', fx: pre ? { noto: 1.2, cas: ['propagande', 'un bulletin municipal promotionnel en période électorale', 1, 0.15] } : { noto: 1, cred: -0.3 }, ill: pre ? 'Propagande avec des moyens publics : dépense réintégrée au compte de campagne, élection annulable' : undefined, res: pre ? 'Joli bulletin. Votre adversaire l’a gardé précieusement pour le juge.' : 'Bilan mis en valeur. Certains trouvent ça un peu promotionnel.' }],
      dflt: { res: 'Le service a bouclé sans vous.' } }); }
  // Présidence d'intercommunalité
  function intercoItem() { const p = P(); const st = p.interco ? p.interco.r : null;
    return mk({ k: 'ic', from: 'Les maires de la communauté de communes', t: st ? 'Conseil communautaire : ' + pick(['transfert de la compétence eau', 'PLU intercommunal', 'hausse de la taxe d’ordures ménagères']) : 'Élection du président de l’intercommunalité', body: st ? 'Vous siégez à l’exécutif intercommunal (' + (st === 'pres' ? 'président·e' : 'vice-président·e') + ') : votre voix pèse pour ' + place() + '.' : 'C’est l’interco qui gère l’eau, les déchets, l’économie et souvent l’urbanisme. Les maires se répartissent les postes ce soir, entre eux.', opts: st ? [
      { l: 'Défendre les intérêts de ' + place(), h: 2, fx: { img: { RUR: 0.8, PERI: 0.8 }, noto: 0.6 }, res: 'Vous obtenez une compensation pour votre commune.' },
      { l: 'Porter l’intérêt général de l’interco', h: 2, fx: { cred: 1.5, std: 0.5 }, res: 'Les autres maires saluent votre hauteur de vue. Vos habitants, moins.' }] : [
      { l: 'Viser la présidence', h: 4, el: { ic: 'pres' } },
      { l: 'Négocier une vice-présidence', h: 2, el: { ic: 'vp' } },
      { l: 'Rester simple conseiller·ère communautaire', res: 'Vous vous concentrez sur votre commune. Les décisions se prendront sans vous.' }], dflt: { res: 'Les postes ont été répartis sans vous.' } }); }
  // Projets à plusieurs financeurs : la paperasse
  function subvItem() { const x = (typeof OF !== 'undefined' ? OF.pjs() : []).find(z => z.st === 'subv' && !z.dossier); if (!x) return null; x.dossier = 1;
    return mk({ k: 'subv', from: 'La sous-préfecture', t: 'Dossier de subvention incomplet : « ' + x.l + ' »', body: 'Pour la dotation de l’État, il manque trois pièces : plan de financement signé, délibération, devis actualisés. Région et Département ont chacun leur propre formulaire.', opts: [
      { l: 'Monter les dossiers vous-même', h: 3, el: { pj: x.id, qb: 0.12 }, res: 'Une soirée sur les formulaires. Le dossier est complet.' },
      { l: 'Payer un bureau d’études', inv: 6000, el: { pj: x.id, qb: 0.15 }, res: 'Dossier impeccable, facture salée.' },
      { l: 'Appeler votre député ou sénateur', el: { pj: x.id, qb: 0.08 }, debt: ['Votre parlementaire', 'un appui sur un dossier de subvention'], res: 'Un coup de fil au préfet. Ça aide, et ça crée une dette.' }],
      dflt: { el: { pj: x.id, delay: 45 }, res: 'Dossier incomplet : le projet prend un mois et demi de retard.' } }); }
  // Se déporter : prise illégale d'intérêts (art. 432-12 du code pénal, réécrit par la loi du 22 décembre 2025)
  function deportItem() { const what = pick(['l’attribution du marché de restauration scolaire, auquel répond l’entreprise de votre beau-frère', 'une subvention à l’association que vous présidez', 'la modification du PLU qui rend constructible un terrain de votre famille']);
    return mk({ k: 'deport', from: 'Le DGS', t: 'Conflit d’intérêts à la prochaine séance', body: 'L’ordre du jour comporte ' + what + '. Vous êtes concerné·e.', opts: [
      { l: 'Vous déporter : sortir de la salle', fx: { cred: 1 }, res: 'Vous quittez la salle, le procès-verbal le mentionne. Irréprochable.' },
      { l: 'Participer et voter', ill: 'Prise illégale d’intérêts : jusqu’à 5 ans de prison, 500 000 € d’amende et l’inéligibilité', fx: { cas: ['pii', what.split(',')[0], 3, 0.15] }, later: [rint(4, 10), 'enquete', { t: 'un vote sur ' + what.split(',')[0] }], res: 'Délibération adoptée. Votre opposition a lu l’ordre du jour très attentivement.' },
      { l: 'Rester sans voter', ill: 'Être présent pendant le débat peut suffire à caractériser l’infraction', fx: { cas: ['pii', what.split(',')[0], 2, 0.06] }, res: 'Vous restez assis·e, sans voter. Juridiquement fragile.' }], dflt: { fx: { cred: 1 }, res: 'Vous étiez absent·e ce soir-là. Tant mieux.' } }); }
  // Passer la main à un dauphin
  function dauphinItem() { const p = P(); const a = (of().adj || []).filter(x => x.on).sort((x, y) => y.loy - x.loy)[0]; if (!a) return null; const yrs = E.diffDays((p.mandats.find(m => m.type === 'maire') || {}).since || S().date, S().date) / 365;
    return mk({ k: 'dauphin', from: 'Vos proches', t: 'Préparer votre succession ?', body: 'Après ' + Math.max(1, Math.round(yrs)) + ' an' + (yrs >= 1.5 ? 's' : '') + ' de mandat' + (p.mandats.length > 1 ? ' et un autre mandat à exercer' : '') + ', la question se pose : passer la main en cours de mandat, c’est la deuxième cause de départ des maires. ' + a.name + ' (loyauté ' + Math.round(a.loy) + ') est le ou la mieux placé·e.', opts: [
      { l: 'Désigner ' + a.name + ' comme dauphin', fx: { coh: 2 }, el: { dauph: a.id }, res: a.name + ' sait désormais qu’' + (a.g === 'F' ? 'elle' : 'il') + ' est appelé·e à vous succéder.' },
      { l: 'Passer la main dès maintenant', el: { dauph: a.id, now: 1 } },
      { l: 'Pas question, je continue', res: 'Vous restez aux commandes. Les ambitieux attendront.' }], dflt: { res: 'La question reviendra.' } }); }

  /* ===== Département : le binôme ===== */
  function binome() { const w = W(); if (!w.bin) { const g = P().g === 'F' ? 'M' : 'F'; w.bin = { name: nmG(g), g, rel: rint(0, 30) }; } return w.bin; }
  function binomeItem() { const b = binome(); const il = b.g === 'F' ? 'elle' : 'il'; const L = [
      () => mk({ k: 'bin', from: b.name + ', votre binôme', t: 'Votre binôme s’attribue l’inauguration du collège', body: 'Élu·e·s en binôme sur le même canton, vous partagez tout, y compris la lumière. ' + b.name + ' a prévu de couper seul·e le ruban du collège rénové.', opts: [
        { l: 'Laisser faire', el: { bin: 4 }, res: il.charAt(0).toUpperCase() + il.slice(1) + ' vous remercie. La photo sera sans vous.' },
        { l: 'Imposer d’y aller à deux', h: 2, el: { bin: -6 }, fx: { noto: 0.8 }, res: 'Vous êtes sur la photo. L’ambiance est fraîche.' },
        { l: 'Proposer un partage clair du canton', h: 2, el: { bin: 6 }, fx: { cred: 0.6 }, res: 'Nord pour vous, sud pour ' + il + ' : chacun ses inaugurations.' }], dflt: { el: { bin: -2 }, res: 'Inauguration sans vous.' } }),
      () => mk({ k: 'bin', from: b.name + ', votre binôme', t: 'Votre binôme vise la même vice-présidence que vous', body: 'Le président du Département redistribue les vice-présidences. ' + b.name + ' et vous visez la même : ' + pick(['les collèges', 'les routes', 'l’action sociale', 'le sport']) + '.', opts: [
        { l: 'Vous effacer', el: { bin: 8 }, fx: { std: -0.5 }, res: 'Votre binôme l’obtient et vous en saura gré.' },
        { l: 'Faire campagne auprès du président', h: 3, r: [{ p: 0.5, res: 'Vous obtenez la vice-présidence. Votre binôme ne vous parle plus.', fx: { std: 2, noto: 1 } }, { res: 'Le président choisit votre binôme. Vous voilà affaibli·e et en froid.', fx: { std: -1 } }], el: { bin: -12 } }], dflt: { el: { bin: 2 }, res: 'Le président a tranché sans vous.' } })];
    return pick(L)(); }

  /* ===== Région : un mandat peu visible ===== */
  function regionItem() { const L = [
      () => mk({ k: 'reg', from: 'Le proviseur', t: 'Inauguration du lycée rénové', body: 'La Région a payé 18 millions d’euros, mais les habitants pensent que c’est la mairie ou l’État. Le maire compte bien prendre la parole en premier.', opts: [
        { l: 'Faire savoir que c’est la Région', h: 2, fx: { noto: 1.2, img: { PERI: 0.6, JUD: 0.6 } }, res: 'Un discours clair : « 18 millions, c’est la Région. » Le journal le reprend.' },
        { l: 'Laisser le maire parader', fx: { std: 0.5 }, res: 'Bonne entente locale, mais personne ne sait que vous y êtes pour quelque chose.' }], dflt: { res: 'Inauguration sans vous.' } }),
      () => mk({ k: 'reg', from: 'Un collectif d’usagers', t: 'TER supprimés : les usagers interpellent la Région', body: 'Trois trains supprimés chaque matin depuis un mois. Les usagers, furieux, ont découvert que c’est la Région qui commande les TER.', opts: [
        { l: 'Prendre le train avec eux à 6 h 40', h: 2, fx: { noto: 1, img: { PERI: 1.2 } }, res: 'Une heure debout dans un train bondé, avec un journaliste. Efficace.' },
        { l: 'Obtenir des bus de substitution', h: 3, fx: { img: { PERI: 1.5 }, cred: 1 }, res: 'Des cars remplacent les trains supprimés. Les usagers respirent.' },
        { l: 'Renvoyer vers la SNCF', fx: { img: { PERI: -1 } }, res: 'Les usagers n’ont pas apprécié.' }], dflt: { fx: { img: { PERI: -0.8 } }, res: 'Les usagers ont noté votre silence.' } })];
    return pick(L)(); }

  /* ===== Assemblée nationale ===== */
  function permItem() { const cases = [['une mère qui attend un logement social depuis six ans', 'POP'], ['un couple hébergé par le 115 avec deux enfants', 'POP'], ['un ouvrier dont le titre de séjour expire et qui risque son emploi', 'POP'], ['une famille dont le dossier MDPH est bloqué depuis un an', 'PERI'], ['un retraité dont la pension n’a pas été liquidée', 'RET'], ['un artisan étranglé par une erreur des impôts', 'PERI']].sort(() => R() - 0.5).slice(0, 3);
    return mk({ k: 'perm', from: 'Votre permanence', t: 'Permanence du vendredi : sept personnes attendent', body: 'Logement, hébergement d’urgence, papiers : chaque semaine, la permanence déborde. Vous ne pourrez pas tout régler. Parmi les situations : ' + cases.map(c => c[0]).join(' ; ') + '.', opts: cases.map(c => ({ l: 'Suivre personnellement : ' + c[0], h: 2, later: [1, 'dol', { who: c[0].split(' ').slice(0, 3).join(' '), what: 'une solution', seg: c[1], p: 0.55, big: 1 }], res: 'Vous écrivez au préfet et au bailleur. Réponse dans quelques semaines.' })).concat([{ l: 'Tout confier à votre collaborateur en circonscription', later: [1, 'dol', { who: 'les visiteurs de la permanence', what: 'des réponses', seg: 'POP', p: 0.4 }], res: 'Votre collaborateur prend les dossiers. Il ou elle est débordé·e.' }]), dflt: { fx: { img: { POP: -0.6 } }, res: 'La permanence a fermé plus tôt. On vous le reproche.' } }); }
  function parisItem() { const L = [
      () => mk({ k: 'paris', from: 'Votre collaborateur à l’Assemblée', t: 'Séance de nuit ou inauguration en circonscription ?', body: 'Votre amendement passe en séance ce soir vers 23 h. Au même moment, ' + pick(['la nouvelle maison de santé', 'la salle des fêtes rénovée', 'le gymnase']) + ' est inauguré en circonscription, et le maire compte sur vous.', opts: [
        { l: 'Rester à Paris défendre l’amendement', fx: { std: 1 }, el: { of: { poids: 3, pres: -3 } }, res: 'Amendement adopté à 0 h 40, devant douze députés. Le maire, lui, a remarqué votre absence.' },
        { l: 'Rentrer en circonscription', fx: { noto: 0.8, img: { RET: 0.6 } }, el: { of: { poids: -2, pres: 4 } }, res: 'Ruban coupé, poignées de main. L’amendement tombe faute de défenseur.' }], dflt: { el: { of: { pres: -2 } }, res: 'Ni l’un ni l’autre : une mauvaise soirée.' } }),
      () => mk({ k: 'paris', from: 'Le président de la commission', t: 'Devenir rapporteur d’une commission d’enquête ?', body: 'Trois mois d’auditions, souvent le lundi et le vendredi : vos jours de circonscription. Mais un rapport peut faire une réputation.', opts: [
        { l: 'Accepter', fx: { noto: 0.6 }, el: { of: { poids: 6, pres: -6 } }, later: [3, 'rapport', {}], res: 'Vous voilà rapporteur. Votre agenda de circonscription se vide.' },
        { l: 'Décliner pour rester présent·e sur le terrain', el: { of: { pres: 2 } }, res: 'Un autre député prend la place, et la lumière.' }], dflt: { res: 'La place est partie à un autre.' } })];
    return pick(L)(); }
  function incidentItem() { const g = pick(['RN', 'LFI', 'LR', 'REN', 'ECO']); return mk({ k: 'hemi', urgent: 1, from: 'Hémicycle', t: 'Incident de séance', body: 'En plein débat, un député ' + ((D.PARTIES[g] || {}).short || g) + ' vous lance une insulte, micro coupé. Les caméras tournent.', opts: [
      { l: 'Répliquer vertement', fx: { noto: 1.5, cred: -2, cash: -1500 }, r: [{ p: 0.5, res: 'Votre réplique fait 2 millions de vues. Le Bureau vous inflige un rappel à l’ordre avec inscription au procès-verbal : retenue d’indemnité.', fx: {} }, { res: 'Votre réplique tourne en boucle. Rappel à l’ordre simple.', fx: { cash: 1500 } }] },
      { l: 'Garder votre calme et demander un rappel au règlement', fx: { cred: 1.5, std: 0.5 }, res: 'Sang-froid salué, même sur les bancs d’en face.' },
      { l: 'Quitter l’hémicycle avec votre groupe', fx: { std: 1, noto: 0.5, cred: -0.5 }, res: 'Sortie collective, image de crise. Votre groupe apprécie.' }], dflt: { res: 'L’incident est passé.' } }); }
  function qagItem() { const p = P(); const th = (D.THEMES[pick(Object.keys(D.THEMES))] || {}).l || 'l’actualité';
    return mk({ k: 'qag', from: 'Votre président de groupe', t: 'Une question au gouvernement mardi', body: 'Votre groupe vous confie l’une de ses questions au gouvernement : deux minutes en direct, face au ministre. Thème libre.', opts: [
      { l: 'Une question de fond sur votre circonscription', h: 2, fx: { noto: 1, cred: 1.2 }, el: { of: { pres: 2 } }, res: 'Question précise sur ' + place() + ', réponse embarrassée du ministre. Le Dauphinois reprend.' },
      { l: 'Un coup d’éclat pour les réseaux', h: 1, fx: { noto: 2.2, cred: -1.5, std: 0.5 }, res: 'Votre interpellation devient virale. Les sérieux haussent les sourcils.' },
      { l: 'Une question technique sur ' + th.toLowerCase(), h: 3, fx: { cred: 1.5 }, el: { of: { poids: 3 } }, res: 'Question pointue, passée inaperçue du grand public, remarquée au ministère.' }], dflt: { fx: { std: -1 }, res: 'Vous avez rendu la question à votre groupe. Il s’en souviendra.' } }); }
  function groupeItem() { const p = P(); return mk({ k: 'grp', urgent: 1, from: 'Votre président de groupe', t: 'Convocation : vos votes contre le groupe', body: 'Vous avez voté ' + (p.dissent || 0) + ' fois contre la consigne du groupe. Le bureau du groupe vous convoque : la prochaine fois, ce sera l’exclusion.', opts: [
      { l: 'Rentrer dans le rang', fx: { std: 2, cred: -0.5 }, el: { dis: 0 }, res: 'Vous promettez la discipline. Les investitures se préparent toujours en groupe.' },
      { l: 'Assumer votre liberté de vote', fx: { cred: 1.5, std: -2 }, res: 'Vous tenez votre ligne. Encore un écart, et c’est la porte.' },
      { l: 'Quitter le groupe et siéger chez les non-inscrits', fx: { std: -8, cred: 1, noto: 1 }, el: { dis: 0, ni: 1 }, res: 'Non-inscrit·e : liberté totale, mais plus de temps de parole, plus de postes, plus d’appui du parti.' }], dflt: { fx: { std: -2 }, res: 'Votre absence à la réunion aggrave votre cas.' } }); }
  function lobbyItem() { const sec = pick(['une fédération du BTP', 'un grand groupe de la distribution', 'un syndicat agricole', 'une fédération de l’énergie', 'une association de consommateurs']);
    return mk({ k: 'lobby', from: 'Un représentant d’intérêts', t: 'Rendez-vous avec ' + sec, body: 'Inscrit au registre de la Haute Autorité pour la transparence, il demande un rendez-vous et vous tend un amendement « clé en main » sur un texte en cours.', opts: [
      { l: 'Le recevoir et publier le rendez-vous dans votre agenda', h: 1, fx: { cred: 1 }, res: 'Informations utiles, en toute transparence.' },
      { l: 'Déposer l’amendement tel quel', fx: { std: 0.5 }, el: { of: { poids: 2 } }, r: [{ p: 0.25, res: 'Un média retrouve le même amendement chez six députés : « copié-collé des lobbies ».', fx: { cred: -4, art: ['revel', 'Amendements copiés-collés : un élu isérois épinglé', -0.6] } }, { res: 'Amendement déposé. Personne n’a remarqué d’où il venait.' }] },
      { l: 'Décliner', res: 'Vous travaillerez avec vos propres sources.' }], dflt: { res: 'Le rendez-vous ne s’est pas fait.' } }); }
  function collabItem() { const L = [
      () => mk({ k: 'collab', from: 'Votre équipe parlementaire', t: 'Recruter un·e collaborateur·rice', body: 'Votre crédit collaborateur (environ 12 000 € par mois) permet un recrutement de plus. Vous êtes l’employeur, avec toutes les obligations d’un patron.', opts: [
        { l: 'Un profil local, ancré en circonscription', el: { of: { pres: 4 } }, res: 'Votre permanence respire : les dossiers sont suivis.' },
        { l: 'Un expert des textes à Paris', el: { of: { poids: 4 } }, res: 'Vos amendements gagnent en qualité.' },
        { l: 'Un militant de confiance', fx: { std: 1 }, res: 'Loyal, mais il faudra le former.' }], dflt: { res: 'Le poste reste vacant.' } }),
      () => mk({ k: 'collab', from: 'Votre collaboratrice en circonscription', t: 'Votre collaboratrice en circonscription est épuisée', body: 'Permanences, courriers, appels à 22 h : elle menace de partir et parle de « management brutal » à d’anciens collègues.', opts: [
        { l: 'Revoir l’organisation et ses horaires', h: 2, el: { of: { pres: -1 } }, fx: { cred: 0.5 }, res: 'Elle reste. Vous répondrez vous-même à quelques appels du soir.' },
        { l: 'Lui accorder une prime', cash: -1200, res: 'Elle reste, pour l’instant.' },
        { l: 'La laisser partir', el: { of: { pres: -4 } }, later: [rint(1, 4), 'fuite', { who: 'Votre ancienne collaboratrice' }], res: 'Elle part. Et parle.' }], dflt: { el: { of: { pres: -3 } }, res: 'Elle a posé sa démission.' } })];
    return pick(L)(); }

  /* ===== Sénatoriales : les grands électeurs ===== */
  function senItem() { const e = (S().elections || []).find(x => x.type === 'sen' && x.status !== 'fini' && E.diffDays(S().date, x.d1) <= 400 && E.diffDays(S().date, x.d1) > 0); if (!e) return null; const p = P(); p.gde = p.gde || 0;
    return mk({ k: 'sen', from: 'Les grands électeurs', t: 'Sénatoriales : la tournée des maires', body: '95 % des grands électeurs sont des élus municipaux. On ne fait pas campagne au marché : on va voir les maires un par un, dans leur mairie. Votre réseau d’élus : ' + Math.round(p.gde) + '/100.', opts: [
      { l: 'Faire la tournée d’un canton (une dizaine de maires)', h: 5, el: { gde: 8 }, res: 'Dix mairies, dix cafés, dix dossiers à appuyer. On vous dit « on verra ».' },
      { l: 'Inviter les maires à une réunion sur les finances locales', h: 3, cash: -800, el: { gde: 5 }, fx: { cred: 0.6 }, res: 'Salle pleine : vous parlez dotations et normes, leurs vrais soucis.' },
      { l: 'Appeler les maires de votre parti', h: 1, el: { gde: 2 }, res: 'Les vôtres sont acquis, ou presque.' }], dflt: { res: 'Une semaine sans contact avec les grands électeurs.' } }); }

  /* ===== résolution des effets propres ===== */
  function res(e, it) { const p = P(), m = p.mairie, o = of(); let out = '';
    if (e.adj) { const a = (o.adj || []).find(x => x.id === e.adj); if (a) { a.loy = clamp(a.loy + (e.d || 0), 0, 100); if (e.risk && R() < e.risk) { e.quit = a.id; e.n = rint(1, 3); out = a.name + ' claque la porte malgré tout.'; } } }
    if (e.quit) { const a = (o.adj || []).find(x => x.id === e.quit); if (a && a.on) { a.on = false; if (m) { m.lost = (m.lost || 0) + 1 + (e.n || 0); m.cohesion = clamp((m.cohesion ?? 70) - 8, 0, 100); } E.article('dauph', place() + ' : ' + a.name + ' et ' + (e.n || 0) + ' conseillers quittent la majorité', -0.5, 'pj'); if (typeof OF !== 'undefined' && OF.TPL.adjdepart) { try { OF.of().dos.unshift({ id: E.uid('of'), kind: 'adjdepart', date: S().date, t: a.name + ' a quitté la majorité. Sa délégation est vacante.', data: { id: a.id }, opts: OF.TPL.adjdepart.mk({ data: { id: a.id } }).opts, lvl: 'local', done: null }); } catch (er) { } } lostCheck(); } }
    if (e.anticip) { if (e.anticip === 'stop') return handover(null, true); E.estimate(); const es = S().est; const win = es && es.rank === 1 ? R() < 0.8 : R() < 0.25; if (win) { if (m) { m.lost = 0; m.cohesion = 70; m.anticip = null; } E.addNoto('commune', 3); E.article('dauph', place() + ' : ' + p.name + ' réélu·e après la crise', 0.4, 'pj'); return 'Réélection anticipée : votre nouvelle liste l’emporte. Majorité ressoudée.'; } handover(null, true); E.article('dauph', place() + ' : ' + p.name + ' perd la mairie lors du scrutin anticipé', -0.6, 'pj'); return 'Les électeurs ont tranché : vous perdez la mairie et siégerez dans l’opposition.'; }
    if (e.dgs != null && m) { m.dgs = e.dgs ? { name: (m.dgs && m.dgs.name) || 'Nouveau DGS', comp: e.dgs } : null; if (!e.dgs) m.cohesion = clamp((m.cohesion ?? 70) - 3, 0, 100); }
    if (e.emp && m) m.cohesion = clamp((m.cohesion ?? 70) + 2 * e.emp, 0, 100);
    if (e.tf && m) { m.tf = (m.tf || 0) + e.tf; m.budget = (m.budget || 0) * 1.015; }
    if (e.inv && m) m.invest = Math.max(0, m.invest + e.inv);
    if (e.ic) { const sc = p.noto.circo / 100 + (p.std || 0) / 200 + (p.mandats.length > 1 ? 0.15 : 0); const ok = e.ic === 'pres' ? R() < 0.15 + sc * 0.6 : R() < 0.55 + sc * 0.4; if (ok) { p.interco = { r: e.ic, since: S().date }; E.addNoto('circo', e.ic === 'pres' ? 4 : 2); return e.ic === 'pres' ? 'Vous voilà président·e de l’intercommunalité : eau, déchets, économie passent par vous.' : 'Vice-présidence obtenue : vous pesez dans les décisions communautaires.'; } p.interco = e.ic === 'pres' ? { r: 'vp', since: S().date } : null; return e.ic === 'pres' ? 'Battu·e pour la présidence, vous obtenez une vice-présidence de consolation.' : 'Les autres maires vous ont préféré quelqu’un d’autre.'; }
    if (e.pj) { const x = (typeof OF !== 'undefined' ? OF.pjs() : []).find(z => z.id === e.pj); if (x) { if (e.qb) x.qb = (x.qb || 0) + e.qb; if (e.delay) x.t = (x.t || 0) + e.delay; } }
    if (e.dauph) { const a = (o.adj || []).find(x => x.id === e.dauph); W().dauph = e.dauph; if (e.now) { return handover(a); } }
    if (e.bin) { const b = binome(); b.rel = clamp(b.rel + e.bin, -100, 100); }
    if (e.of && typeof OF !== 'undefined') { const oo = OF.of(); for (const k in e.of) oo[k] = clamp((oo[k] || 0) + e.of[k], 0, 100); }
    if (e.dis != null) { p.dissent = e.dis; }
    if (e.ni) { p.nonInscrit = S().date; }
    if (e.gde) { p.gde = clamp((p.gde || 0) + e.gde, 0, 100); }
    return out; }
  function handover(a, forced) { const p = P(); const nm0 = a ? a.name : nmG(R() < 0.5 ? 'F' : 'M'); p.mandats = p.mandats.filter(x => x.type !== 'maire'); if (!p.mandats.some(x => x.type === 'conseiller_municipal')) p.mandats.push({ type: 'conseiller_municipal', label: 'Conseiller·ère municipal·e ' + (forced ? 'd’opposition' : 'de la majorité') + ' (' + place() + ')', since: S().date, ind: 0, majority: !forced }); p.mairie = null; const old = Object.values(S().pnj).find(x => x.role === 'maire' && x.territory === p.communeId); if (old) old.role = 'cadre';
    try { E.mkPnj({ name: nm0, g: a ? a.g : undefined, party: forced ? 'DIV' : p.party, role: 'maire', territory: p.communeId, mandat: 'Maire de ' + place(), rel: forced ? -10 : 40, noto: 45 }); } catch (er) { }
    E.addNoto('commune', -2); E.article('dauph', place() + ' : ' + nm0 + ' devient maire', 0.1, 'pj'); return forced ? 'Vous quittez le fauteuil de maire. ' + nm0 + ' vous succède.' : 'Passation de pouvoir : ' + nm0 + ' devient maire, vous restez au conseil municipal. ' + (a && a.loy > 60 ? 'Un successeur loyal.' : 'Reste à voir s’il ou elle vous restera fidèle.'); }

  /* ===== tour ===== */
  function tick(k, tryAdd) { const p = P(); const mo = +S().date.slice(5, 7);
    if (p.interco && !mayor()) p.interco = null;
    if (mayor()) {
      tryAdd(due('fronde', 150) && R() < 0.3 * k, () => { const it = frondeItem(); if (it) seen('fronde'); return it; });
      tryAdd(due('emp', 180) && R() < 0.25 * k, () => { seen('emp'); return dgsItem(); });
      tryAdd(pet() && due('vil', 90) && R() < 0.4 * k, () => { seen('vil'); return villageItem(); });
      tryAdd([1, 2].includes(mo) && due('budgeq', 300), () => { seen('budgeq'); return budgetEqItem(); });
      tryAdd(due('asso', 120) && R() < 0.3 * k, () => { seen('asso'); return assoItem(); });
      tryAdd(!pet() && due('oppo', 150) && R() < 0.25 * k, () => { seen('oppo'); return oppoMaireItem(); });
      tryAdd(!pet() && due('bull', 120) && R() < 0.3 * k, () => { seen('bull'); return bulletinItem(); });
      tryAdd(due('ic', p.interco ? 240 : 720) && R() < 0.2 * k, () => { seen('ic'); return intercoItem(); });
      tryAdd(due('subv', 30), () => { const it = subvItem(); if (it) seen('subv'); return it; });
      tryAdd(due('dauph', 720) && E.diffDays((p.mandats.find(m => m.type === 'maire') || {}).since || S().date, S().date) > 900 && R() < 0.2 * k, () => { seen('dauph'); return dauphinItem(); });
      lostCheck();
    }
    if (has('conseiller_municipal') && !p.mandats.some(m => m.type === 'conseiller_municipal' && m.majority) && !mayor()) tryAdd(due('oppo', 120) && R() < 0.3 * k, () => { seen('oppo'); return oppoItem(); });
    if (p.mandats.some(m => ['maire', 'adjoint', 'conseiller_municipal', 'cd'].includes(m.type))) tryAdd(due('deport', 360) && R() < 0.12 * k, () => { seen('deport'); return deportItem(); });
    if (has('cd')) tryAdd(due('bin', 150) && R() < 0.3 * k, () => { seen('bin'); return binomeItem(); });
    if (has('cr')) { tryAdd(due('reg', 120) && R() < 0.35 * k, () => { seen('reg'); return regionItem(); }); if (!p.mandats.some(m => m.type !== 'cr') && R() < 0.3 * k) E.addNoto('dept', -0.4 * k); }
    if (has('depute')) {
      tryAdd(due('perm', 45) && R() < 0.6 * k, () => { seen('perm'); return permItem(); });
      tryAdd(due('paris', 90) && R() < 0.35 * k, () => { seen('paris'); return parisItem(); });
      tryAdd(due('hemi', 150) && R() < 0.2 * k, () => { seen('hemi'); return incidentItem(); });
      tryAdd(!p.nonInscrit && due('qag', 75) && R() < 0.4 * k, () => { seen('qag'); return qagItem(); });
      tryAdd(!p.nonInscrit && (p.dissent || 0) >= 3 && due('grp', 120), () => { seen('grp'); return groupeItem(); });
      if (!p.nonInscrit && (p.dissent || 0) >= 5) { p.nonInscrit = S().date; p.dissent = 0; E.addStd(-10); FL.echo('Exclu·e de votre groupe parlementaire pour indiscipline : vous siégez désormais chez les non-inscrits.', { cred: 0.5 }); }
      tryAdd(due('collab', 200) && R() < 0.25 * k, () => { seen('collab'); return collabItem(); });
    }
    if (p.mandats.some(m => ['depute', 'senateur', 'cr', 'meuro'].includes(m.type))) tryAdd(due('lobby', 150) && R() < 0.25 * k, () => { seen('lobby'); return lobbyItem(); });
    if (p.mandats.length) tryAdd(due('sen', 45) && R() < 0.5 * k, () => { const it = senItem(); if (it) seen('sen'); return it; });
  }
  return { tick, res, binome, handover };
})();
if (typeof window !== 'undefined') window.EL = EL;
