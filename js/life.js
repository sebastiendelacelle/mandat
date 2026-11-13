/* MANDAT — vie politique : SMS, voix des électeurs, exercice du pouvoir, soirées électorales */
window.LF = (function () {
  const S = () => G.S, P = () => G.S.p; const R = () => E.rnd(); const pick = a => a[Math.floor(R() * a.length)]; const clamp = E.clamp;

  /* ===== SMS ===== */
  // les SMS s’adressent au joueur : accords selon son genre
  const gzS = t => typeof t !== 'string' ? t : t.replace(/([A-Za-zÀ-ÿ]+)·([a-zà-ÿ]+)/g, (m, b, x) => { const g = (S().p || {}).g; return g !== 'F' ? b : x === 'ère' ? b.replace(/ier$/, 'ière') : x === 'rice' ? b.replace(/eur$/, 'rice') : x === 've' && /f$/.test(b) ? b.slice(0, -1) + 've' : x === 'se' && /x$/.test(b) ? b.slice(0, -1) + 'se' : b + x; });
  function sms(from, text, replies, opt) {
    text = gzS(text); if (replies) replies = replies.map(r => Object.assign({}, r, { l: gzS(r.l) }));
    const s = S(); s.sms = s.sms || []; const x = typeof from === 'string' && s.pnj[from] ? s.pnj[from] : null;
    s.sms.unshift({ id: E.uid('sm'), from: x ? x.id : null, name: x ? x.name : from, party: x ? x.party : (opt && opt.party) || null, role: x ? (x.mandat || x.role) : (opt && opt.role) || '', text, date: s.date, half: s.half || 0, read: false, replies: replies || null, answered: null, human: (opt && opt.human) || null });
    if (s.sms.length > 90) s.sms.length = 90;
  }
  function unread() { return (S().sms || []).filter(m => !m.read).length; }
  function reply(id, idx) {
    const s = S(), p = P(); const m = s.sms.find(z => z.id === id); if (!m || m.answered != null || !m.replies) return ''; let r = m.replies[idx]; m.answered = idx; m.read = true;
    const x = m.from ? s.pnj[m.from] : null; if (x && r.rel) x.rel = clamp(x.rel + r.rel, -100, 100);
    if (r.std) E.addStd(r.std); if (r.cash) p.cash += r.cash; if (r.mil) p.militants = Math.max(0, p.militants + r.mil); if (r.cred) p.cred = clamp(p.cred + r.cred, 0, 100); if (r.img) E.addImageAll(r.img); if (r.noto) E.addNoto(X.scopeOf(), r.noto); if (r.nat) p.natSup = clamp(p.natSup + r.nat, 0, 100); if (r.mot && p.team) p.team.motiv = clamp(p.team.motiv + r.mot, 0, 100);
    if (r.imgSeg) for (const g in r.imgSeg) E.addImage(g, r.imgSeg[g]); if (r.hours) p.hours = Math.max(0, p.hours - r.hours); if (r.mom) p.mom += r.mom; if (r.mtrain) p.mediaTraining = (p.mediaTraining || 0) + r.mtrain;
    if (r.mairie && p.mairie) p.mairie.invest -= r.mairie; if (r.promise) p.promises.push({ id: E.uid('pr'), to: x ? x.id : null, what: r.promise, date: s.date, due: E.addDays(s.date, 365) });
    if (r.ln && typeof LN !== 'undefined') { const t = LN.fx(r.ln, m); if (t) r = Object.assign({}, r, { res: t }); }
    if (r.gvfx && typeof GV !== 'undefined') { const [k, i] = r.gvfx.split(':'); if (k === 'mentor') r = Object.assign({}, r, { res: GV.mentorFx(+i) }); }
    if (x && r.rel && Math.abs(r.rel) >= 4 && typeof GV !== 'undefined') GV.remember(x.id, (r.rel > 0 ? 'Échange cordial' : 'Échange tendu') + ' : « ' + r.l + ' »', r.rel);
    if (r.rivalImg && s.pnj[r.rivalImg.id]) s.pnj[r.rivalImg.id].img = (s.pnj[r.rivalImg.id].img || 0) + r.rivalImg.d;
    if (r.leak && R() < r.leak) { const c = p.casseroles.find(k => !k.out); if (c) { c.out = true; E.article('revel', 'Révélations : ' + p.name + ' et ' + c.label, -0.6, 'pj'); E.addImageAll(-2); } else { p.cred = clamp(p.cred - 3, 0, 100); E.article('revel', 'Les manœuvres ' + E.de(p.name) + ' en coulisses', -0.4, 'pj'); } }
    if (r.defuse) { const c = p.casseroles.find(k => !k.out); if (c) { c.out = true; c.g = Math.max(1, (c.g || 2) - 1); E.article('dauph', p.name + ' révèle de lui-même ' + c.label, -0.1, 'pj'); } }
    if (r.fx && typeof X !== 'undefined') { const [k, id] = r.fx.split(':'); if (k === 'fire') X.fire(id); if (k === 'recadrer') X.recadrer(id); }
    if (r.act) s._act = r.act;
    if (r.leakOther && s.pnj[r.leakOther] && R() < 0.4) { const y = s.pnj[r.leakOther]; s.later = s.later || []; y.img = (y.img || 0) - 4; y.mom = (y.mom || 0) - 0.03; E.article('revel', 'Des documents internes embarrassent ' + y.name, -0.4, 'pnj'); r = Object.assign({}, r, { res: r.res + ' Quelques jours plus tard, les documents sortent dans Révélations : ' + y.name + ' est éclaboussé·e, sans que votre nom apparaisse.' }); }
    if (r.dossierOn) { p.dossiers.push({ id: E.uid('d'), on: r.dossierOn, label: r.dossier, g: 2, date: s.date }); if (R() < 0.3) E.casserole('recel', 'l’utilisation de documents obtenus illégalement', 2, true, 0.05); }
    else if (r.dossier && x) { p.dossiers.push({ id: E.uid('d'), on: x.id, label: r.dossier, g: 2, date: s.date }); if (R() < 0.3) E.casserole('recel', 'l’utilisation de documents obtenus illégalement', 2, true, 0.05); }
    if (r.quote && r.quote.txt) { E.statement(r.quote.txt, r.quote.th, r.quote.v, 0.5, 'citation presse'); E.article(r.quote.media || 'dauph', r.quote.title || (p.name + ' réagit'), 0.1, 'pj', '« ' + r.quote.txt + ' »'); }
    if (r.pw && typeof PW !== 'undefined') { const t = PW.res(r.pw, m); if (t) r = Object.assign({}, r, { res: t }); }
    if (r.mpReply && m.human && typeof MP !== 'undefined') MP.send(m.human, r.mpReply === 'riposte' ? 'riposte' : 'msg', r.mpReply === 'riposte' ? 'Je ne laisserai pas passer ces attaques. Les électeurs jugeront sur les actes.' : 'Merci pour ton soutien, ça compte.');
    m.thread = (m.thread || []).concat([{ me: true, t: r.l }]); if (r.ans) m.thread.push({ me: false, t: r.ans });
    return r.res || 'Message envoyé.';
  }
  /* ===== SMS : peu nombreux, contextuels, avec de vrais enjeux ===== */
  const NOTABLES = [['Président·e de l’union des commerçants', 'CAD', 'emploi', 'la redynamisation du centre-ville'], ['Président·e du club de rugby', 'POP', 'sport', 'la rénovation du stade'], ['Responsable d’une association de parents d’élèves', 'JUD', 'education', 'les effectifs des classes'], ['Président·e du club des aînés', 'RET', 'sante', 'la maison de santé'], ['Représentant·e syndical·e de la zone industrielle', 'POP', 'emploi', 'le maintien de l’usine'], ['Président·e de la FDSEA locale', 'RUR', 'agriculture', 'les terres agricoles'], ['Collectif de cyclistes du quotidien', 'JUD', 'transports', 'les pistes cyclables'], ['Association des riverains de la rocade', 'PERI', 'transports', 'les bouchons du matin']];
  const ASSOS = [['à la fête de quartier', 'POP'], ['à l’assemblée générale des commerçants', 'CAD'], ['au loto du club des aînés', 'RET'], ['au tournoi de foot des jeunes', 'JUD'], ['à la foire agricole', 'RUR'], ['au forum des associations', 'PERI']];
  function ctxOf() {
    const s = S(), p = P(); const ph = E.phase().id; const camp = ph === 'campagne' || ph === 'entre2';
    const rivals = (s.rivals || []).map(id => s.pnj[id]).filter(x => x && !x.human);
    const jour = E.pnjList(x => x.role === 'journaliste').sort((a, b) => b.rel - a.rel);
    const weak = p.prog.find(m => m.status !== 'retiree' && (!m.fin || ['aucun', 'dette'].includes(m.fin)));
    return { s, p, ph, camp, cand: p.cand, rivals, jour, weak, ev: (s.recentEv || [])[0], cas: p.casseroles.find(c => !c.out), lowStaff: p.staff.find(x => x.loy < 35), party: p.party !== 'NEW', partySoon: (s.partyCal || []).find(c => !c.done && E.diffDays(s.date, c.d) > 0 && E.diffDays(s.date, c.d) < 35), noto: Math.max(p.noto.commune, p.noto.circo) };
  }
  const T = [
    { id: 'j_quote', cd: 25, w: c => c.ev && c.jour[0] && c.jour[0].rel >= 10 ? 1.2 : 0, mk: c => { const j = c.jour[0]; const e = E.evById(c.ev.id, c.ev.custom); if (!e || !e.ch) return null; return [j.id, 'Je boucle un papier sur « ' + e.t + ' ». Une réaction de votre part ? J’ai besoin de trois lignes avant 18 h.', e.ch.slice(0, 2).map(ch => ({ l: '« ' + ch.txt + ' »', rel: 2, noto: 1.5, quote: { txt: ch.txt, th: e.th, v: ch.v, media: j.territory, title: e.t + ' : la réaction ' + E.de(c.p.name) }, res: 'Votre citation paraîtra demain. Elle vous engage.' })).concat([{ l: 'Pas de commentaire', rel: -2, res: 'Le papier sortira sans vous.' }])]; } },
    { id: 'j_invite', cd: 40, w: c => c.jour.find(j => j.rel >= 5) && c.noto >= 12 ? (c.camp ? 1.4 : 0.6) : 0, mk: c => { const j = c.jour.find(x => x.rel >= 5); return [j.id, pick(['Vous seriez libre demain pour ma matinale ? 7 h 50, huit minutes, en direct.', 'J’ai un créneau dans mon émission jeudi. Ça vous dit de venir défendre votre programme ?', 'On vous propose un grand entretien. Sans filet, mais vous aurez le temps de développer.']), [{ l: 'J’y serai', act: 'interview:' + j.id, rel: 2, res: 'Rendez-vous pris. L’interview commence.' }, { l: 'Pas cette fois', rel: -3, res: 'Le créneau ira à un adversaire.' }]]; } },
    { id: 'j_enquete', cd: 60, w: c => c.jour[0] && (c.weak || c.cas) ? 0.9 : 0, mk: c => { const j = c.jour.find(x => x.territory === 'revel') || c.jour[0]; const sub = c.cas ? c.cas.label : '« ' + c.weak.resume + ' », qui n’est pas financée'; const rv = c.rivals[0];
      return [j.id, 'Je prépare un article sur ' + sub + '. Je vous laisse une chance de donner votre version avant publication.', [{ l: 'Donner ma version, sur le fond', rel: 3, cred: c.cas ? 1 : -0.5, res: 'Votre version figure dans l’article. Ça limite les dégâts.' }].concat(rv ? [{ l: 'En off : orienter vers ' + rv.name, rel: 4, rivalImg: { id: rv.id, d: -4 }, leak: 0.2, res: 'L’article change de cible. Si ça se sait, ce sera pour vous.' }] : [], [{ l: 'Refuser de répondre', rel: -5, img: -0.7, res: '« Contacté·e, ' + c.p.name + ' n’a pas souhaité répondre. »' }])]; } },
    { id: 'rival_debate', cd: 35, w: c => c.camp && c.rivals[0] && !(c.cand && E.myPetite()) ? 1 : 0, mk: c => { const x = c.rivals[0]; return [x.id, pick(['Radio Isère nous propose un face-à-face jeudi. Tu oses ?', 'Un débat, toi et moi, devant les électeurs. Ou tu préfères les tracts ?', 'On m’a dit que tu évitais les débats. Prouve le contraire.']), [{ l: 'J’accepte', act: 'debate:' + x.id, res: 'Le débat commence.' }, { l: 'Je refuse', img: -0.5, rel: -2, res: x.name + ' racontera partout que vous fuyez le débat.' }]]; } },
    { id: 'rival_deal', cd: 300, w: c => c.ph === 'entre2' && c.cand ? 2 : 0, mk: c => { const el = c.s.elections.find(e => e.id === c.cand.el); const r = el && el.races && el.races[c.cand.key]; if (!r || !r.t2 || !r.t2.includes('PJ')) return null; const out = r.rows.filter(x => !r.t2.includes(x.id) && c.s.pnj[x.id] && !c.s.pnj[x.id].human && x.pct >= 5)[0]; if (!out) return null; const x = c.s.pnj[out.id];
      return [x.id, 'Avec mes ' + Math.round(out.pct) + ' %, je peux faire basculer le second tour. Je peux appeler à voter pour toi. On en parle ?', [{ l: 'Accepter : lui promettre une place', promise: 'poste', rel: 15, mom: 0.04, imgSeg: { POP: 1, PERI: 1, RET: 1 }, res: x.name + ' appelle à voter pour vous. Il faudra tenir parole.' }, { l: 'Refuser tout marchandage', cred: 1.5, rel: -6, res: 'Vous restez libre. Ses électeurs, eux, sont orphelins.' }]]; } },
    { id: 'rival_threat', cd: 120, w: c => c.cas && c.rivals[0] && c.rivals[0].traits && c.rivals[0].traits.scrupules < 50 ? 0.7 : 0, mk: c => { const x = c.rivals[0]; const has = c.p.dossiers.find(d => d.on === x.id);
      return ['Numéro masqué', 'Je sais pour ' + c.cas.label + '. Il serait sage de rester discret·ète dans cette campagne. Pensez-y.', [{ l: 'Ignorer', leak: 0.5, res: 'Vous ne cédez pas au chantage. Reste à voir si la menace était sérieuse.' }].concat(has ? [{ l: 'Répondre : « Moi aussi, j’ai un dossier sur ' + x.name + ' »', rel: -10, res: 'Le message s’arrête là. Équilibre de la terreur.' }] : [], [{ l: 'Prévenir la presse vous-même', img: -0.6, cred: 2, defuse: true, res: 'Vous prenez les devants. L’affaire sort, mais selon vos termes.' }]), { role: 'Inconnu' }]; } },
    { id: 'notable', cd: 45, w: c => c.noto >= 8 ? 0.9 : 0, mk: c => { const [role, seg, th, obj] = pick(NOTABLES); return [role, 'Bonjour. Nous sommes plusieurs centaines d’adhérents. Si vous vous engagez sur ' + obj + ', nous pourrions vous soutenir publiquement.', [{ l: 'M’engager publiquement', promise: obj, imgSeg: { [seg]: 3.5 }, noto: 1, res: 'Leur soutien est annoncé. Votre engagement aussi : on vous le rappellera.' }, { l: 'Les recevoir, sans promettre', hours: 2, imgSeg: { [seg]: 1.2 }, res: 'Rencontre cordiale. Pas de soutien officiel, pas de promesse.' }, { l: 'Décliner', imgSeg: { [seg]: -0.8 }, res: 'Ils iront voir vos adversaires.' }], { role: 'Corps intermédiaire' }]; } },
    { id: 'asso', cd: 30, w: () => 0.8, mk: c => { const [ev, seg] = pick(ASSOS); return ['Une association', 'Vous êtes invité·e ' + ev + ' samedi. Ce serait l’occasion de rencontrer du monde.', [{ l: 'J’y serai (3 h)', hours: 3, imgSeg: { [seg]: 2.5 }, noto: 1.2, mil: 1, res: 'Vous serrez des mains toute l’après-midi. On se souviendra de votre venue.' }].concat(c.p.staff.length ? [{ l: 'Envoyer un collaborateur', imgSeg: { [seg]: 0.8 }, res: 'Votre équipe vous représente. C’est mieux que rien.' }] : [], [{ l: 'Décliner poliment', res: 'Une autre fois.' }]), { role: 'Vie associative' }]; } },
    { id: 'probleme', cd: 35, w: c => c.noto >= 10 ? 0.8 : 0, mk: c => { const com = E.commune().name; const pb = pick([['L’école du quartier va fermer une classe à la rentrée.', 'JUD'], ['La rue est inondée à chaque orage depuis des années.', 'PERI'], ['Le dernier médecin du quartier part à la retraite.', 'RET'], ['Les bus ne passent plus après 20 h.', 'POP'], ['Un projet d’entrepôt menace des terres agricoles.', 'RUR']]);
      const isM = c.p.mandats.some(m => m.type === 'maire'), isA = c.p.mandats.some(m => m.type === 'adjoint');
      if (isA && !isM) return ['Un habitant', pb[0] + ' Vous êtes adjoint' + (c.p.g === 'F' ? 'e' : '') + ' au maire : vous pouvez faire bouger les choses ?', [{ l: 'Porter le dossier au bureau municipal (1 h)', hours: 1, imgSeg: { [pb[1]]: 2.2 }, res: 'Le dossier est inscrit à l’ordre du jour. L’habitant le saura.' }, { l: 'Le recevoir à la mairie (2 h)', hours: 2, imgSeg: { [pb[1]]: 2.5 }, res: 'Il repart rassuré, et il en parlera à ses voisins.' }, { l: 'Le renvoyer vers les services', imgSeg: { [pb[1]]: -1 }, res: 'Réponse administrative. Il attendait mieux d’un élu de la majorité.' }], { role: 'Administré' }];
      const amt = Math.max(5000, Math.min(150000, Math.round(E.commune().pop * 6 / 1000) * 1000));
      if (isM) return ['Un habitant', pb[0] + ' Vous êtes ' + (c.p.g === 'F' ? 'la maire' : 'le maire') + ', vous faites quoi ?', [{ l: 'Débloquer ' + E.eur(amt) + ' tout de suite', mairie: amt, imgSeg: { [pb[1]]: 3 }, res: 'Les travaux sont lancés. Les habitants le remarquent.' }, { l: 'Inscrire au prochain budget', imgSeg: { [pb[1]]: 0.8 }, res: 'C’est noté. Ils attendront… et jugeront.' }, { l: 'Renvoyer vers les services', imgSeg: { [pb[1]]: -1.2 }, res: 'Réponse administrative. Le mécontentement monte.' }], { role: 'Administré' }];
      return ['Un habitant', pb[0] + ' Personne ne bouge à la mairie de ' + com + '. Vous pouvez faire quelque chose ?', [{ l: 'Interpeller publiquement le maire', opp: true, noto: 1.5, imgSeg: { [pb[1]]: 2 }, res: 'Votre interpellation est reprise par la presse locale.' }, { l: 'Le rencontrer chez lui (2 h)', hours: 2, imgSeg: { [pb[1]]: 2.5 }, res: 'Il en parlera à tous ses voisins.' }, { l: 'Promettre d’en parler', imgSeg: { [pb[1]]: 0.3 }, res: 'Une promesse de plus.' }], { role: 'Habitant' }]; } },
    { id: 'party_vote', cd: 60, w: c => c.party && c.partySoon ? 1.5 : 0, mk: c => { const ld = c.s.pnj[c.s.national.leaders[c.p.party]]; const fed = c.s.pnj[c.p.fedId]; if (!ld || !fed) return null;
      return [fed.id, 'Le vote interne approche. La direction ' + E.de(ld.name) + ' est contestée. Tu te positionnes comment ?', [{ l: 'Soutenir la direction', rel: 6, std: 1.5, nat: 2, res: 'La direction s’en souviendra. Les contestataires aussi.' }, { l: 'Soutenir les contestataires', rel: -4, std: 1, nat: -2, res: 'Vous prenez date pour l’après. Risqué, mais remarqué.' }, { l: 'Rester neutre', res: 'Prudence. Personne ne vous doit rien.' }]]; } },
    { id: 'staff_alert', cd: 60, w: c => c.lowStaff && c.p.staff.length > 1 ? 1.2 : 0, mk: c => { const x = c.lowStaff; const y = c.p.staff.find(z => z.id !== x.id);
      return [y.name, 'Je préfère te le dire : ' + x.name + ' a été vu·e en train de déjeuner avec l’équipe adverse. Je n’accuse personne, mais méfie-toi.', [{ l: 'Le recadrer', fx: 'recadrer:' + x.id, res: 'Explication franche. Reste à savoir s’il ou elle sera loyal·e.' }, { l: 'Me séparer de lui ou d’elle', fx: 'fire:' + x.id, res: 'Départ immédiat. Attention à ce qu’il ou elle sait.' }, { l: 'Ignorer', res: 'Vous laissez courir.' }], { role: 'Votre équipe' }]; } },
    { id: 'kompromat', cd: 150, w: c => c.rivals[0] && c.camp ? 0.4 : 0, mk: c => { const x = c.rivals[0]; return ['Numéro masqué', 'J’ai des documents sur ' + x.name + '. Intéressé·e ? Discrétion assurée.', [{ l: 'Envoyez', act: 'kompro:' + x.id, ill: 'Recel de documents volés : jusqu’à 5 ans de prison et 375 000 € d’amende', ans: 'Lien chiffré. Il expire dans une heure.', res: 'Le dossier arrive. À vous de décider quoi en faire.' }, { l: 'Bloquer ce numéro', cred: 1.5, leakOther: x.id, res: 'Numéro bloqué. Crédibilité +1,5 : vous ne mangez pas de ce pain-là. Mais l’informateur ira sans doute frapper à une autre porte.' }], { role: 'Inconnu' }]; } },
    { id: 'coach', cd: 120, w: c => c.noto >= 15 && (c.p.mediaTraining || 0) < 3 ? 0.5 : 0, mk: () => ['Une amie conseillère en communication', 'Je t’ai vu·e à la télé. Tu es bon·ne sur le fond, mais tu te fais couper la parole. Je t’offre une séance de travail, trois heures ?', [{ l: 'Avec plaisir (3 h)', hours: 3, mtrain: 1, res: 'Séance intense. Vous tiendrez mieux vos prochains débats.' }, { l: 'Pas le temps', res: 'Une autre fois.' }], { role: 'Entourage' }] },
    { id: 'rival_taunt', cd: 70, w: c => c.rivals[0] && c.s.est && c.s.est.rows[0] && c.s.est.rows[0].id === c.rivals[0].id ? 0.6 : 0, mk: c => { const x = c.rivals[0]; return [x.id, pick(['Les sondages sont têtus. Tu devrais commencer à préparer ta défaite 😉', 'Pas mal ton tract. Dommage que personne ne le lise.', 'À ce rythme, tu finiras derrière les blancs et nuls.']), [{ l: 'Le publier sur X', noto: 1, img: -0.2, rel: -8, res: 'La capture d’écran fait réagir. Ça vous fait connaître, et ça abîme un peu le débat.' }, { l: 'Répondre par un pouce levé', cred: 0.5, res: 'Le calme des vieilles troupes.' }]]; } }
  ];
  function pickTemplate(c) {
    const s = c.s; s.smsUsed = s.smsUsed || {};
    const ok = T.map(t => ({ t, w: (s.smsUsed[t.id] && E.diffDays(s.smsUsed[t.id], s.date) < t.cd) ? 0 : t.w(c) })).filter(x => x.w > 0);
    const tot = ok.reduce((a, x) => a + x.w, 0); if (!tot) return null; let r = R() * tot; for (const x of ok) { r -= x.w; if (r <= 0) return x.t; } return ok[0].t;
  }
  function smsTick(days) {
    const s = S(); if (unread() >= 4) return; const c = ctxOf(); const f = Math.min(1, days / 14);
    let n = (R() < 0.45 * f + (c.camp ? 0.3 : 0)) ? 1 : 0; if (c.camp && R() < 0.25) n++;
    for (let i = 0; i < n; i++) { const t = pickTemplate(c); if (!t) break; s.smsUsed[t.id] = s.date; const m = t.mk(c); if (m) sms(m[0], m[1], m[2], m[3]); }
  }
  function tick(days) {
    smsTick(days);
    // pouvoir : projets municipaux, rapports, présidence
    projTick(days); presTick(days);
  }
  function electionSms(won, el) {
    const s = S(), p = P(); const allies = E.pnjList(x => x.known && x.rel > 25 && x.role !== 'journaliste').slice(0, 2);
    allies.forEach(x => sms(x.id, won ? pick(['Bravo !!! Tu l’as fait 👏', 'Énorme. On fête ça quand ?', 'Félicitations, tu le mérites.']) : pick(['Courage. Ce n’est que partie remise.', 'Tu as fait une belle campagne, sincèrement.', 'On en reparle à froid. Tiens bon.']), [{ l: 'Merci ❤️', rel: 3, res: 'Message envoyé.' }]));
    (s.rivals || []).slice(0, 1).forEach(id => { const x = s.pnj[id]; if (x) sms(x.id, won ? 'Félicitations. Le combat continue.' : 'Belle campagne. Sans rancune ?', [{ l: 'Merci, à bientôt', rel: 6, res: 'Fair-play.' }, { l: 'Ne pas répondre', rel: -3, res: 'Silence.' }]); });
  }

  /* ===== Voix des électeurs ===== */
  const VB = {
    JUD: { pos: ['Enfin quelqu’un qui parle du climat sans langue de bois.', 'Ses idées sur le logement, ça me parle.'], neu: ['Je ne sais pas trop qui c’est, honnêtement.', 'Sur les réseaux, on le voit passer, sans plus.'], neg: ['Encore un politique qui nous oublie, nous les jeunes.', 'Trop vieux jeu pour moi.'] },
    POP: { pos: ['Lui au moins, il vient dans le quartier.', 'Il a parlé des salaires, c’est le seul.'], neu: ['Ils sont tous pareils, mais celui-là… on verra.', 'Connais pas.'], neg: ['On le voit jamais ici, sauf avant les élections.', 'Il parle pour les riches.'] },
    RET: { pos: ['Sérieux, posé. On peut lui faire confiance.', 'Il a des idées pour la santé, c’est important à mon âge.'], neu: ['Je l’ai vu dans Le Dauphinois, il a l’air correct.', 'Faut voir sur la durée.'], neg: ['Trop agité. La politique, c’est du sérieux.', 'Et la sécurité, il en dit quoi ?'] },
    PERI: { pos: ['Il comprend qu’on a besoin de sa voiture.', 'Il parle des vrais problèmes : les prix, les transports.'], neu: ['Je vote pour celui qui baissera le prix du plein.', 'Pas d’avis tranché.'], neg: ['Encore un qui veut nous taxer.', 'Il ne connaît pas notre vie de navetteurs.'] },
    CAD: { pos: ['Programme chiffré, ça change.', 'Compétent, ça se voit en débat.'], neu: ['Intéressant, mais je veux voir le financement.', 'Je compare encore.'], neg: ['Des promesses intenables.', 'Trop flou sur l’économie.'] },
    RUR: { pos: ['Il est venu à la ferme, il a écouté.', 'Il défend les campagnes, enfin.'], neu: ['On le connaît peu ici, dans les villages.', 'Les politiques, ça reste en ville.'], neg: ['Encore un citadin qui nous fait la leçon.', 'Les normes, toujours les normes…'] }
  };
  function focusGroup() {
    const s = S(), p = P(); const items = D.SEGS.map(g => { const im = p.image[g.id] || 0; const noto = Math.max(p.noto.commune, p.noto.circo); const mood = noto < 12 ? 'neu' : im > 8 ? 'pos' : im < -8 ? 'neg' : 'neu'; let txt = pick(VB[g.id][mood]);
      const ph = p.prog.find(m => m.phare && m.status !== 'retiree'); if (ph && R() < 0.4) txt = (m => (m.gagnants || []).includes(g.id) ? 'Sa proposition « ' + m.resume + ' », je suis pour.' : (m.perdants || []).includes(g.id) ? '« ' + m.resume + ' » ? Ça va encore être pour notre pomme.' : txt)(ph);
      const sal = Object.entries(s.national.salience).sort((a, b) => b[1] - a[1])[0]; if (sal && R() < 0.25) txt += ' Et ' + D.THEMES[sal[0]].l.toLowerCase() + ', il en pense quoi ?';
      return { seg: g.id, name: g.name, mood, txt, im: Math.round(im) }; });
    const best = items.slice().sort((a, b) => b.im - a.im)[0], worst = items.slice().sort((a, b) => a.im - b.im)[0];
    const rv = (s.rivals || []).map(id => s.pnj[id]).filter(Boolean)[0];
    const sum = 'Point fort : les ' + best.name.toLowerCase() + '. Point faible : les ' + worst.name.toLowerCase() + '.' + (rv ? ' ' + rv.name + ' est perçu·e comme ' + (rv.img > 5 ? 'solide' : rv.img < -5 ? 'fragilisé·e' : 'banal·e') + '.' : '');
    s.voices = { date: s.date, items, sum }; return s.voices;
  }

  /* ===== Exercer le pouvoir ===== */
  const GRANDS = [
    { id: 'mediatheque', l: 'Construire une médiathèque', m: 14, c: 0.9, seg: { JUD: 3, CAD: 3, RET: 2 } },
    { id: 'piscine', l: 'Rénover la piscine municipale', m: 10, c: 0.7, seg: { PERI: 3, POP: 2, JUD: 2 } },
    { id: 'ecoquartier', l: 'Lancer un écoquartier', m: 24, c: 1.6, seg: { JUD: 3, CAD: 3, POP: 1, RET: -1 } },
    { id: 'centre', l: 'Requalifier le centre-ville', m: 18, c: 1.2, seg: { RET: 3, PERI: 2, CAD: 2 } },
    { id: 'maisonsante', l: 'Ouvrir une maison de santé', m: 12, c: 0.6, seg: { RET: 4, POP: 2, RUR: 3 } },
    { id: 'policeHQ', l: 'Créer un centre de supervision urbaine', m: 8, c: 0.4, seg: { RET: 3, PERI: 2, JUD: -1 } }
  ];
  function startGrand(id) {
    const p = P(); const m = p.mairie; if (!m) return { ok: false, msg: 'Il faut être maire.' }; m.grands = m.grands || [];
    if (m.grands.some(g => !g.done)) return { ok: false, msg: 'Un grand projet est déjà en cours. Terminez-le d’abord.' };
    const g = GRANDS.find(x => x.id === id); const cost = Math.round(m.invest * g.c * 2); m.dette += Math.round(cost * 0.6);
    m.grands.push({ id, l: g.l, cost, months: g.m, prog: 0, start: S().date, done: false, delay: 0, overrun: 0 }); E.addNoto('commune', 3); E.article('dauph', E.commune().name + ' : la municipalité lance « ' + g.l + ' » (' + E.eur(cost) + ')', 0.2, 'pj');
    return { ok: true, msg: 'Chantier lancé : ' + g.l + ' (' + E.eur(cost) + ', ' + g.m + ' mois prévus).' };
  }
  function projTick(days) {
    const s = S(), p = P(); const m = p.mairie; if (m && m.grands) m.grands.filter(g => !g.done).forEach(g => {
      g.prog += days / 30 / g.months * 100;
      if (R() < 0.04 * days / 30) { const t = pick(['retard', 'surcoût', 'recours']); if (t === 'retard') { g.months += 3; g.delay += 3; E.article('dauph', '« ' + g.l + ' » : le chantier prend trois mois de retard', -0.3, 'pj'); sms('Directeur des services', 'Mauvaise nouvelle : le chantier « ' + g.l + ' » prend 3 mois de retard.', [{ l: 'Mettez la pression aux entreprises', res: 'Réunion de chantier tendue.' }], { role: 'Mairie' }); } else if (t === 'surcoût') { const o = Math.round(g.cost * 0.12); g.overrun += o; m.dette += o; E.addImage('RET', -1); E.article('dauph', '« ' + g.l + ' » : un surcoût de ' + E.eur(o), -0.3, 'pj'); } else { g.months += 2; E.article('dauph', 'Un recours d’habitants contre « ' + g.l + ' »', -0.2, 'pj'); } }
      if (g.prog >= 100) { g.done = true; g.end = s.date; const G0 = GRANDS.find(x => x.id === g.id); for (const k in G0.seg) E.addImage(k, G0.seg[k] * 1.5); E.addNoto('commune', 6); E.addNoto('circo', 2); p.cred = clamp(p.cred + 3, 0, 100); E.article('dauph', 'Inauguration : « ' + g.l + ' » ouvre ses portes', 0.6, 'pj'); s.queue.push({ kind: 'info', title: 'Inauguration', text: '« ' + g.l + ' » est terminé' + (g.delay ? ' avec ' + g.delay + ' mois de retard' : ' dans les temps') + '. Ruban coupé, photos dans la presse.' }); }
    });
    if (m) { m.cohesion = clamp((m.cohesion ?? 70) + (R() - 0.55) * 4 * days / 30, 20, 95); if (m.cohesion < 35 && R() < 0.1 * days / 30) { m.cohesion += 15; E.addImageAll(-1); E.article('dauph', E.commune().name + ' : un adjoint claque la porte de la majorité', -0.4, 'pj'); s.queue.push({ kind: 'info', title: 'Crise dans la majorité', text: 'Un adjoint démissionne avec fracas et rejoint l’opposition.' }); } }
    // rapport parlementaire
    const dp = p.depute; if (dp && dp.rapport) { dp.rapport.prog += days / 30 / 4 * 100; if (dp.rapport.prog >= 100) { E.addNoto('nat', 6); p.cred = clamp(p.cred + 4, 0, 100); E.addStd(3); E.article('quotlib', 'Le rapport ' + E.de(p.name) + ' sur « ' + dp.rapport.l + ' » fait référence', 0.5, 'pj'); s.queue.push({ kind: 'info', title: 'Rapport parlementaire', text: 'Votre rapport « ' + dp.rapport.l + ' » est publié et salué.' }); dp.rapport = null; } }
  }
  const COMMISSIONS = { finances: ['Finances', 'fiscalite'], lois: ['Lois', 'securite'], sociales: ['Affaires sociales', 'sante'], durable: ['Développement durable', 'ecologie'], eco: ['Affaires économiques', 'industrie'], defense: ['Défense', 'europe'] };
  const RAPPORTS = ['la désertification médicale en zone rurale', 'la sécurité des petites communes', 'l’avenir des stations de moyenne montagne', 'la réindustrialisation des vallées alpines', 'le coût du logement pour les jeunes actifs', 'l’efficacité de la dépense publique locale'];
  function setCommission(k) { const p = P(); p.depute = p.depute || {}; p.depute.com = k; p.expertise = p.expertise || {}; p.expertise[COMMISSIONS[k][1]] = (p.expertise[COMMISSIONS[k][1]] || 0) + 2; return 'Vous siégez en commission des ' + COMMISSIONS[k][0].toLowerCase() + '.'; }
  function startRapport() { const p = P(); p.depute = p.depute || {}; if (p.depute.rapport) return 'Un rapport est déjà en cours.'; p.depute.rapport = { l: pick(RAPPORTS), prog: 0 }; return 'Vous êtes nommé·e rapporteur·e sur ' + p.depute.rapport.l + ' (environ 4 mois).'; }

  // Présidence
  function isPres() { return P().mandats.some(m => m.type === 'president'); }
  function presTick(days) { const s = S(), p = P(); if (!isPres()) return; const pr = (p.pres = p.pres || { reformes: [], pm: null, censure: 0 }); if (!pr.pm) { const c = E.partyFigures()[0] || E.findPnj(x => x.party === p.party && x.role !== 'journaliste'); pr.pm = c ? c.id : null; } }
  const ASM_2024 = { LFI: 71, PCF: 17, ECO: 38, PS: 66, DIV: 38, REN: 91, MODEM: 36, HOR: 34, LR: 47, UDR: 16, RN: 123 };
  function majorite() { const n = S().national; const a = n.assembly || ASM_2024; const p = P(); const mine = p.party === 'NEW' ? 0 : Object.entries(a).filter(([k]) => n.gov.includes(k) || D.PARTIES[k] && D.PARTIES[k].bloc === D.PARTIES[p.party].bloc).reduce((t, [, v]) => t + v, 0); return { seats: mine, abs: mine >= 289 }; }
  function reforme(levId, v, mode) {
    const s = S(), p = P(); const lev = L.LEVERS.find(z => z.id === levId); const ev = L.evaluate(lev, v, 'economies', E.commune()); const mj = majorite();
    let passed = mode === '493' ? true : R() < (mj.abs ? 0.9 : 0.35 + mj.seats / 1200);
    let msg = '';
    if (!passed) { s.national.approval = clamp(s.national.approval - 2, 10, 80); msg = 'L’Assemblée rejette « ' + ev.label + ' ». Sans majorité absolue, chaque texte est un combat.'; E.article('quotlib', 'Revers pour l’Élysée : « ' + ev.label + ' » rejeté', -0.5, 'pj'); return { ok: false, msg }; }
    let ap = 0; D.SEGS.forEach((g, i) => { ap += (ev.seg[g.id] || 0) * E.unit('nat').mix[i]; }); ap = ap * 1.5 - (mode === '493' ? 4 : 0);
    s.national.approval = clamp(s.national.approval + ap, 10, 80); for (const g in ev.seg) E.addImage(g, ev.seg[g]); E.statement(ev.label, lev.th, ev.axes, 1, 'réforme présidentielle');
    (p.pres = p.pres || { reformes: [] }).reformes.push({ l: ev.label, date: s.date, mode });
    msg = (mode === '493' ? 'Réforme adoptée par le 49.3 : ' : 'Réforme adoptée : ') + ev.label + '. Popularité ' + (ap >= 0 ? '+' : '') + ap.toFixed(1).replace('.', ',') + ' pt.';
    E.article('quotlib', (mode === '493' ? '49.3 : ' : 'Adoptée : ') + ev.label, mode === '493' ? -0.3 : 0.2, 'pj');
    if (mode === '493' && R() < (mj.abs ? 0.05 : 0.3)) { s.national.approval = clamp(s.national.approval - 4, 10, 80); const old = s.pnj[p.pres.pm]; p.pres.pm = null; msg += ' Une motion de censure est adoptée : le gouvernement tombe' + (old ? ', ' + old.name + ' quitte Matignon' : '') + '.'; E.article('quotlib', 'Motion de censure adoptée, le gouvernement renversé', -0.7, 'pj'); }
    return { ok: true, msg };
  }
  function remaniement(pmId) { const s = S(), p = P(); (p.pres = p.pres || { reformes: [] }).pm = pmId; const x = s.pnj[pmId]; s.national.approval = clamp(s.national.approval + 2.5, 10, 80); x.rel += 15; E.article('quotlib', x.name + ' nommé·e à Matignon', 0.2, 'pj'); return x.name + ' devient Premier·e ministre. Petit regain de popularité.'; }
  function referendum(qi) {
    const s = S(); const q = D.QUIZ_POOL[qi]; const u = E.unit('nat'); let yes = 0; D.SEGS.forEach((g, i) => { let a = 0, n = 0; for (const k in q.w) { a += Math.sign(q.w[k]) * g.ideal[E.AXI[k]] / 100; n++; } const pr = 0.5 + 0.35 * (a / n) + (s.national.approval - 40) / 300; yes += u.mix[i] * clamp(pr, 0.05, 0.95); });
    yes = clamp(yes * 100 + E.gauss() * 3, 5, 95); const won = yes > 50; s.national.approval = clamp(s.national.approval + (won ? 4 : -8), 10, 80);
    E.article('quotlib', 'Référendum : le « ' + (won ? 'oui' : 'non') + ' » l’emporte avec ' + (won ? yes : 100 - yes).toFixed(1).replace('.', ',') + ' %', won ? 0.4 : -0.6, 'pj');
    return { won, yes, msg: 'Question : « ' + q.q + ' » — Oui ' + yes.toFixed(1).replace('.', ',') + ' %. ' + (won ? 'Victoire : vous sortez renforcé·e.' : 'Désaveu : la popularité s’effondre.') };
  }

  /* ===== Soirée électorale : détail par commune ===== */
  function breakdown(elId, key) {
    const s = S(); const el = s.elections.find(e => e.id === elId); if (!el || !el.races || !el.races[key]) return null; const r = el.races[key]; const cands = r.cands || null; if (!cands) return null;
    let coms = []; if (/^c\d+$/.test(key)) coms = D.COMMUNES.filter(c => c.circo === +key.slice(1)); else if (key.startsWith('can:')) coms = [D.com(key.slice(4))]; else return null;
    const st = s.rng; const out = coms.map(c => { const v = E.vote('com:' + c.id, cands.map(x => Object.assign({}, x)), el.type, 0.04); return { name: c.name, rows: v.rows.slice(0, 3) }; }); s.rng = st; return out;
  }

  return { ASM_2024, sms, unread, reply, tick, electionSms, focusGroup, GRANDS, startGrand, COMMISSIONS, setCommission, startRapport, isPres, majorite, reforme, remaniement, referendum, breakdown };
})();
