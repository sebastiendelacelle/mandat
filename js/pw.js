// Pouvoir : carnet des obligés, secrets des rivaux, enjeux du moment, pactes entre joueurs, plan de mandat, budget en leviers
const PW = (() => {
  const S = () => G.S, P = () => G.S.p;
  const R = () => E.rnd(), clamp = (v, a, b) => E.clamp(v, a, b), pick = a => E.pick(a), rint = (a, b) => E.rint(a, b);
  const dd = (a, b) => E.diffDays(a, b);
  const W = () => { const s = S(); if (!s.pw) s.pw = { hooks: [], secrets: [], pacts: [], enq: {}, act: {}, baro: {}, talk: {}, seen: {} }; const w = s.pw; ['hooks', 'secrets', 'pacts'].forEach(k => w[k] = w[k] || []); ['enq', 'act', 'baro', 'talk', 'seen'].forEach(k => w[k] = w[k] || {}); return w; };
  const mayor = () => !!P().mairie && P().mandats.some(m => m.type === 'maire');
  const elu = () => P().mandats.length > 0;
  const first = who => String(who || '').split(',')[0];
  const due = (k, days) => { const t = W().seen[k]; return !t || dd(t, S().date) >= days; };
  const seen = k => { W().seen[k] = S().date; };
  const camp = () => { const p = P(); return !!p.cand && ['pre', 'campagne', 'entre2'].includes(E.phase().id); };
  const eur = v => E.eur(v); const f1 = v => String(Math.round(v * 10) / 10).replace('.', ',');

  /* =================== carnet des obligés =================== */
  const HK = { elu: 'Élus', parti: 'Parti', asso: 'Associatif', media: 'Presse', notable: 'Économie' };
  function addHook(who, kind, str, why) { const h = { id: E.uid('hk'), who, kind, str: clamp(str, 1, 3), why: why || '', date: S().date, exp: E.addDays(S().date, 720), used: null }; const w = W(); w.hooks.unshift(h); w.hooks = w.hooks.slice(0, 24); return h; }
  const liveHooks = () => W().hooks.filter(h => !h.used && h.exp > S().date);
  function upcomingInv() { const s = S(), p = P(); if (p.party === 'NEW') return null; return s.elections.filter(e => e.status === 'futur' && dd(s.date, e.d1) < 420 && dd(s.date, e.d1) > 45 && !((p.invWin || {})[e.id]) && !((p.preInv || {})[e.id]) && E.invOdds && E.invOdds(e) && E.invOdds(e).pct < 100).sort((a, b) => a.d1 < b.d1 ? -1 : 1)[0] || null; }
  function hookUses(h) {
    const p = P(), s = S(); const out = []; const el = p.cand ? s.elections.find(e => e.id === p.cand.el) : null;
    if (h.kind === 'elu') {
      if (el && el.type === 'pres' && p.cand.parr != null && !p.cand.parrOk) out.push({ k: 'parr', l: 'Obtenir des parrainages de son réseau', sub: '+' + 6 * h.str + ' signatures de maires' });
      if (el && el.type === 'sen') out.push({ k: 'gde', l: 'Rallier des grands électeurs', sub: 'Conseillers municipaux de son secteur' });
      const pj = typeof OF !== 'undefined' && OF.isMaire() ? OF.activePj().find(x => ['etude', 'subv'].includes(x.st)) : null; if (pj) out.push({ k: 'subv', l: 'Appuyer « ' + pj.l + ' » auprès des financeurs', sub: 'Meilleures chances de subvention', pj: pj.id });
      if (camp()) out.push({ k: 'soutien', l: 'Obtenir son soutien public', sub: 'Image auprès des retraités et des ruraux' });
      out.push({ k: 'appui', l: 'Vous introduire auprès des élus du secteur', sub: 'Notoriété dans la circonscription' });
    }
    if (h.kind === 'parti') { const inv = upcomingInv(); if (inv) out.push({ k: 'inv', l: 'Peser sur la commission d’investiture', sub: inv.label, el: inv.id }); out.push({ k: 'std', l: 'Faire monter votre cote au parti', sub: 'Poids au parti' }); }
    if (h.kind === 'asso') { if (camp()) out.push({ k: 'mobil', l: 'Mobiliser ses bénévoles pour votre campagne', sub: 'Terrain et militants' }); out.push({ k: 'reseau', l: 'Vous ouvrir son réseau', sub: 'Image auprès de ses adhérents' }); }
    if (h.kind === 'media') out.push({ k: 'portrait', l: 'Obtenir un portrait favorable', sub: 'Notoriété et crédibilité' });
    if (h.kind === 'notable') { if (camp() && p.cand.compte) out.push({ k: 'don', l: 'Solliciter un don personnel à votre campagne', sub: 'Légal : 4 600 € au plus par personne, versés au mandataire' }); out.push({ k: 'reseau', l: 'Vous présenter à ses relations', sub: 'Image auprès des cadres et des retraités' }); }
    return out;
  }
  function useHook(id, k, x) {
    const h = W().hooks.find(z => z.id === id); if (!h || h.used) return { ok: false, msg: 'Cette faveur a déjà servi.' }; const p = P(), s = h.str, n = first(h.who); let t = '';
    if (k === 'parr') { p.cand.parr = (p.cand.parr || 0) + 6 * s; t = n + ' fait signer ' + 6 * s + ' maires de son réseau.'; }
    else if (k === 'gde') { p.gde = (p.gde || 0) + 12 * s; t = n + ' fait le tour des conseillers municipaux de son secteur pour vous.'; }
    else if (k === 'subv') { const pj = typeof OF !== 'undefined' ? OF.pjs().find(z => z.id === (x || {}).pj) : null; if (!pj) return { ok: false, msg: 'Projet introuvable.' }; pj.qb = (pj.qb || 0) + 0.07 * s; t = 'Un coup de fil au bon endroit : le dossier « ' + pj.l + ' » remonte la pile.'; }
    else if (k === 'soutien') { E.addImage('RET', 1.2 * s); E.addImage('RUR', 0.8 * s); E.addNoto(FL.nscope(), 0.8 * s); E.article('dauph', n + ' apporte son soutien à ' + p.name, 0.3, 'pj'); t = 'Soutien public annoncé dans Le Dauphinois.'; }
    else if (k === 'appui') { E.addNoto('circo', 1.2 * s); if (p.party !== 'NEW') E.addStd(0.5 * s); t = n + ' vous emmène à la réunion des maires du canton. On retient votre nom.'; }
    else if (k === 'inv') { const el = (x || {}).el; if (!el) return { ok: false, msg: 'Aucune investiture en vue.' }; p.invHook = p.invHook || {}; p.invHook[el] = (p.invHook[el] || 0) + 6 * s; t = n + ' glisse votre nom aux membres de la commission. Vos chances d’investiture progressent.'; }
    else if (k === 'std') { E.addStd(3 * s); t = n + ' vante vos mérites à la fédération.'; }
    else if (k === 'mobil') { p.camp.terrain = (p.camp.terrain || 0) + 10 * s; p.militants += 6 * s; t = 'Ses bénévoles rejoignent vos équipes de porte-à-porte.'; }
    else if (k === 'reseau') { if (h.kind === 'asso') { E.addImage('PERI', s); E.addImage('POP', 0.6 * s); } else { E.addImage('CAD', s); E.addImage('RET', 0.6 * s); } t = n + ' vous présente à son réseau. Des portes s’ouvrent.'; }
    else if (k === 'portrait') { E.addNoto(FL.nscope(), 1.5 * s); p.cred = clamp(p.cred + s, 0, 100); E.article('dauph', 'Portrait : ' + p.name + ', un parcours', 0.5, 'pj'); t = 'Un portrait flatteur paraît dans Le Dauphinois.'; }
    else if (k === 'don') { const v = 1500 * s; p.cand.compte.dons += v; p.cand.compte.recettes += v; t = n + ' verse ' + eur(v) + ' à titre personnel, avec reçu du mandataire.'; }
    else return { ok: false, msg: 'Usage impossible.' };
    h.used = { k, date: S().date }; (S().turnDid = S().turnDid || []).push({ l: 'Faveur rendue', m: t }); return { ok: true, msg: t };
  }
  // Sollicitations : on vous demande un service, et l'on vous en devra un
  function askItem() {
    const p = P(); const g = R() < 0.5 ? 'F' : 'M'; const il = g === 'F' ? 'elle' : 'il', Il = g === 'F' ? 'Elle' : 'Il'; const civ = (g === 'F' ? 'Mme ' : 'M. ') + pick(D.LAST);
    const vills = D.COMMUNES.filter(c => c.id !== p.communeId && c.pop < 4000).map(c => c.name); const L = [];
    if ((elu() || p.noto.circo > 25) && vills.length) L.push(['vois', () => { const v = pick(vills); const who = civ + ', maire de ' + v; return FL.mkItem('pwask', { from: who, t: 'Un maire voisin vous demande un coup de main', body: civ + ' monte un dossier pour rénover l’école de ' + v + ' et voudrait que vous l’appuyiez auprès du sous-préfet. « Je m’en souviendrai », promet-' + il + '.', opts: [
      { l: 'Appuyer le dossier', sub: '2 h · ' + il + ' vous devra un vrai service', h: 2, pw: { hook: [who, 'elu', 2, 'Votre appui pour l’école de ' + v] }, res: 'Vous avez plaidé son dossier. ' + civ + ' vous doit une fière chandelle.' },
      { l: 'Envoyer un courrier de soutien', sub: 'Sans heure · un petit service', pw: { hook: [who, 'elu', 1, 'Un courrier de soutien'] }, res: 'Un courrier, c’est déjà ça. ' + Il + ' s’en souviendra, un peu.' },
      { l: 'Décliner', res: 'Vous avez d’autres priorités.' }], dflt: { res: 'Sans nouvelles de vous, ' + il + ' s’est adressé·e ailleurs.' } }); }]);
    if (p.mandats.some(m => ['maire', 'adjoint', 'conseiller_municipal', 'interco'].includes(m.type))) L.push(['cd', () => { const who = civ + ', conseiller' + (g === 'F' ? 'ère' : '') + ' départemental' + (g === 'F' ? 'e' : ''); return FL.mkItem('pwask', { from: who, t: 'Un vote qu’on vous demande', body: civ + ' porte une piste cyclable entre deux bourgs et compte sur votre voix en conseil communautaire. « Entre élus, on se tient. »', opts: [
      { l: 'Voter pour', fx: { img: { JUD: 0.5, RUR: -0.4 } }, pw: { hook: [who, 'elu', 2, 'Votre vote pour sa piste cyclable'] }, res: 'Projet adopté, avec votre voix. ' + civ + ' vous remercie chaleureusement.' },
      { l: 'S’abstenir', res: 'Vous ne prenez pas parti. ' + Il + ' en prend note.' },
      { l: 'Voter contre', fx: { img: { RUR: 0.5, JUD: -0.4 } }, res: 'Vous votez contre. La relation se refroidit.' }], dflt: { res: 'Le vote a eu lieu sans vous.' } }); }]);
    if (p.party !== 'NEW') L.push(['fed', () => { const fed = S().pnj[p.fedId]; const who = (fed ? fed.name : 'Le secrétaire fédéral') + ', fédération ' + D.PARTIES[p.party].short; return FL.mkItem('pwask', { from: who, t: 'La fédération compte sur vous', body: 'Un membre de la direction nationale vient dans le département. La fédération vous demande d’organiser la visite : salle, public, presse.', opts: [
      { l: 'Organiser la visite', sub: '4 h · la fédération vous en sera redevable', h: 4, fx: { std: 1, noto: 0.5 }, pw: { hook: [who, 'parti', 2, 'La visite que vous avez organisée'] }, res: 'Salle pleine, presse présente : la fédération est ravie.' },
      { l: 'Prétexter un agenda chargé', fx: { std: -0.6 }, res: 'Un autre s’en charge. Et s’en souviendra, lui.' }], dflt: { fx: { std: -0.6 }, res: 'La fédération a trouvé quelqu’un d’autre.' } }); }]);
    L.push(['asso', () => { const who = civ + ', président' + (g === 'F' ? 'e' : '') + ' du club de handball'; return FL.mkItem('pwask', { from: who, t: 'Un club cherche un créneau', body: 'Soixante licenciés et pas assez d’heures de gymnase. ' + civ + ' vous demande ' + (mayor() ? 'd’arbitrer en leur faveur.' : 'de plaider sa cause auprès de la mairie.'), opts: [
      mayor() ? { l: 'Arbitrer en sa faveur', fx: { img: { PERI: 0.5 }, coh: -1 }, pw: { hook: [who, 'asso', 2, 'Le créneau de gymnase'] }, res: 'Le club gagne deux soirées par semaine. Le basket grince des dents.' } : { l: 'Plaider sa cause', sub: '1 h', h: 1, pw: { hook: [who, 'asso', 1, 'Votre plaidoyer pour le club'] }, res: 'Vous avez écrit à la mairie. Le club le sait.' },
      { l: 'Ne pas s’en mêler', res: 'Vous restez à l’écart.' }], dflt: { res: 'Le club s’est débrouillé sans vous.' } }); }]);
    const j = FL.journo(); if (j) L.push(['media', () => { const who = j.name + ', Le Dauphinois'; return FL.mkItem('pwask', { from: who, t: 'Une exclusivité demandée', body: j.name + ' aimerait vos chiffres et votre annonce en avant-première, la veille de votre conférence de presse.', opts: [
      { l: 'Lui donner l’exclusivité', fx: { jrel: 3 }, pw: { hook: [who, 'media', 2, 'L’exclusivité que vous lui avez donnée'] }, res: 'Son article sort le premier. ' + j.name + ' apprécie le geste.' },
      { l: 'Refuser : tout le monde en même temps', fx: { cred: 0.3 }, res: 'Vous traitez tous les médias de la même façon.' }], dflt: { res: 'L’occasion est passée.' } }); }]);
    L.push(['patron', () => { const who = civ + ', ' + pick(['patron d’une PME de mécanique', 'dirigeant' + (g === 'F' ? 'e' : '') + ' d’une scierie', 'patron' + (g === 'F' ? 'ne' : '') + ' d’une entreprise de transport']); return FL.mkItem('pwask', { from: who, t: 'Une entreprise demande un coup de pouce', body: civ + ' attend depuis huit mois le raccordement électrique de son extension : quarante emplois à la clé. ' + Il + ' vous demande d’appeler Enedis.', opts: [
      { l: 'Décrocher votre téléphone', sub: '1 h', h: 1, fx: { img: { CAD: 0.3 } }, pw: { hook: [who, 'notable', 2, 'Votre intervention pour le raccordement'] }, res: 'Le dossier se débloque. ' + civ + ' n’oubliera pas.' },
      { l: 'Ce n’est pas votre rôle', fx: { cred: 0.3 }, res: 'Vous le renvoyez vers la chambre de commerce.' }], dflt: { res: 'Sans réponse de votre part, ' + il + ' a cherché ailleurs.' } }); }]);
    const ok = L.filter(([k]) => due('ask_' + k, 300)); if (!ok.length) return null; const c = pick(ok); seen('ask_' + c[0]); return c[1]();
  }

  /* =================== secrets des rivaux =================== */
  const SECR = [
    ['n’a assisté qu’à quatre conseils sur dix depuis deux ans', 1], ['a fait voter une subvention à l’association que préside son conjoint', 3], ['emploie sa fille comme collaboratrice, payée sur fonds publics', 2],
    ['doit trois ans de taxe foncière sur sa résidence secondaire', 2], ['a vu son compte de campagne rejeté par la Commission des comptes de campagne', 2], ['a promis le même terrain à deux promoteurs', 2],
    ['traite ses électeurs de « cas sociaux » dans des messages privés', 2], ['s’est fait offrir un séjour au ski par une entreprise titulaire de marchés publics', 3], ['a été condamné·e aux prud’hommes par une ancienne salariée', 1]];
  const ENQ_H = 4, ENQ_C = 500;
  function enqState(rid) { const e = W().enq[rid]; if (!e) return null; return e; }
  function canEnq(rid) { const p = P(); const e = enqState(rid); if (e && (e.run || dd(e.date, S().date) < 180)) return e.run ? 'Enquête en cours.' : 'Déjà enquêté récemment.'; if (p.hours < ENQ_H) return 'Il faut ' + ENQ_H + ' h.'; if (p.cash < ENQ_C) return 'Il faut ' + eur(ENQ_C) + '.'; return true; }
  function enquete(rid) {
    const ok = canEnq(rid); if (ok !== true) return { ok: false, msg: ok }; const p = P(), x = S().pnj[rid]; if (!x) return { ok: false, msg: 'Adversaire inconnu.' };
    p.hours -= ENQ_H; p.cash -= ENQ_C; W().enq[rid] = { date: S().date, run: true }; FL.later(rint(1, 2), 'pwEnq', { rid });
    (S().turnDid = S().turnDid || []).push({ l: 'Enquête d’opposition', m: x.name });
    return { ok: true, msg: 'Votre équipe épluche délibérations, comptes publiés, annonces légales et archives de presse sur ' + x.name + '. Résultat d’ici un à deux mois.' };
  }
  function secretOpts(sc) { const p = P(); const j = FL.journo(); const o = [
      { l: 'Le transmettre à ' + (j ? j.name : 'la presse'), sub: 'Effet immédiat, mais on peut remonter jusqu’à vous', pw: { sec: ['leak', sc.id] } },
      { l: 'Le garder sous le coude', sub: 'À sortir au bon moment, ou à faire valoir', pw: { sec: ['keep', sc.id] } }];
    if (p.party !== 'NEW') o.push({ l: 'L’échanger auprès de votre parti', sub: 'La fédération vous en saura gré', pw: { sec: ['trade', sc.id] } });
    o.push({ l: 'Ne rien en faire', fx: { cred: 0.5 }, pw: { sec: ['drop', sc.id] }, res: 'Vous refermez le dossier. Ce n’est pas votre façon de faire de la politique.' }); return o; }
  function secUses(sc) { const p = P(); const o = [{ k: 'leak', l: 'Le transmettre à la presse', sub: camp() ? 'En pleine campagne : effet maximal' : 'Effet immédiat' }, { k: 'pression', l: 'Lui faire savoir que vous savez', sub: 'Pour qu’il ou elle baisse le ton', ill: 'Chantage : jusqu’à 5 ans de prison et 75 000 € d’amende (art. 312-10 du code pénal)' }]; if (p.party !== 'NEW') o.push({ k: 'trade', l: 'L’échanger auprès de votre parti', sub: 'Poids au parti' }); return o; }
  function useSecret(id, k) {
    const sc = W().secrets.find(z => z.id === id); if (!sc || ['used', 'drop'].includes(sc.st)) return 'Ce dossier est clos.'; const p = P(); const x = S().pnj[sc.on]; const pw = sc.pw; const nm0 = x ? x.name : sc.name;
    if (k === 'keep') { sc.st = 'keep'; return 'Le dossier est rangé. Vous saurez quand le ressortir.'; }
    if (k === 'drop') { sc.st = 'drop'; return ''; }
    sc.st = 'used'; sc.used = { k, date: S().date };
    if (k === 'leak') { const kk = camp() ? 1.3 : 1; if (x) { x.img = (x.img || 0) - 3 * pw * kk; x.mom = (x.mom || 0) - 0.02 * pw * kk; x.noto = clamp((x.noto || 0) - pw, 0, 100); }
      E.article('revel', 'Révélations : ' + nm0 + ' ' + sc.t, -0.4, 'pnj'); FL.fx({ jrel: 2 }); const j = FL.journo(); const back = R() < 0.22 - (j && (j.rel || 0) > 20 ? 0.08 : 0);
      if (back) { p.cred = clamp(p.cred - 3, 0, 100); if (x) x.rel = clamp((x.rel || 0) - 15, -100, 100); E.article('dauph', 'Qui a fourni le dossier contre ' + nm0 + ' ? Le camp ' + E.de(p.name) + ' soupçonné', -0.3, 'pj'); return 'L’article fait mal à ' + nm0 + '. Mais l’origine du dossier fuite : on vous accuse de coup bas.'; }
      return 'L’article fait mal à ' + nm0 + '. Votre nom n’apparaît nulle part.'; }
    if (k === 'pression') { if (x) { x.rel = clamp((x.rel || 0) + 35, -100, 100); x.mom = (x.mom || 0) - 0.03; } const f = FL.F(); if (f.rplan && x && f.rplan.id === x.id) f.rplan = { id: x.id, plan: 'rassembleur', since: S().date };
      E.casserole('chantage', 'des pressions sur un adversaire', 3, true, 0.12); return nm0 + ' a compris. Ses attaques se font soudain plus rares. Reste à espérer que personne n’en parle jamais.'; }
    if (k === 'trade') { E.addStd(2 * pw); const fed = S().pnj[p.fedId]; addHook((fed ? fed.name : 'La fédération') + ', fédération', 'parti', pw, 'Le dossier sur ' + nm0); return 'La fédération récupère le dossier. On vous doit désormais quelque chose.'; }
    return '';
  }

  /* =================== enjeux du moment =================== */
  const LOCEV = [['securite', 'Une série de cambriolages secoue le secteur'], ['sante', 'Le dernier médecin généraliste du secteur annonce son départ'], ['economie', 'Un plan social menace 120 emplois dans la zone d’activités'], ['transports', 'La Région supprime une ligne de car'],
    ['ecologie', 'Un orage de grêle ravage les cultures et inonde des caves'], ['logement', 'Une famille sur trois attend un logement social'], ['education', 'Une fermeture de classe est annoncée pour la rentrée'], ['pouvoir_achat', 'La facture d’eau bondit de 18 %']];
  function enjeux() { const p = P(); if (!p.cand || typeof HQ === 'undefined' || !HQ.concernsTrue) return null; return HQ.concernsTrue(); }
  function known() { const p = P(); return p.cand && p.cand.concerns ? p.cand.concerns.list : null; }
  function enjW() { const L = enjeux(); if (!L) return null; const o = {}; L.forEach(c => o[c.t] = c.w); return o; }
  function talk(th, n) { const p = P(); if (!p.cand || !th) return; const w = W(); const k = p.cand.el + '|' + p.cand.key; w.talk[k] = w.talk[k] || {}; w.talk[k][th] = (w.talk[k][th] || 0) + (n || 1); }
  function talks() { const p = P(); if (!p.cand) return {}; return W().talk[p.cand.el + '|' + p.cand.key] || {}; }
  function talkAlign() { const L = enjeux(); if (!L) return 0; const t = talks(); return L.slice(0, 3).reduce((a, c) => a + c.w * Math.min(1, (t[c.t] || 0) / 3), 0) * 0.05; }
  function refreshKnown() { const p = P(); if (!p.cand || !p.cand.concerns) return; const L = enjeux(); if (!L) return; p.cand.concerns.list = L.slice(0, p.cand.concerns.depth || 3); }
  function baro() {
    const p = P(), s = S(); const k = p.cand.el + '|' + p.cand.key; if (W().baro[k]) return; const L = enjeux(); if (!L) return; W().baro[k] = s.date; const top = L.slice(0, 3);
    if (!p.cand.concerns) p.cand.concerns = { list: top, date: s.date, depth: 3, src: 'baro' };
    const u = E.unit(p.cand.key); const txt = top.map(c => D.THEMES[c.t].l.toLowerCase() + ' (' + Math.round(c.w * 100) + ' %)').join(', ');
    E.article('dauph', 'Baromètre : ' + D.THEMES[top[0].t].l.toLowerCase() + ' en tête des préoccupations' + (u ? ' · ' + u.name : ''), 0, 'nat');
    s.queue.push({ kind: 'info', title: 'Les enjeux de la campagne', text: 'Le baromètre du Dauphinois classe les préoccupations des électeurs : ' + txt + '. Un programme et des discours qui y répondent pèseront davantage dans les urnes. Une consultation de terrain vous en dira plus.' });
  }
  function actuTick(k) {
    const p = P(), s = S(); if (!p.cand || !['campagne', 'entre2', 'pre'].includes(E.phase().id)) return; const key = p.cand.el + '|' + p.cand.key; const w = W(); w.seen['actu_' + key] = w.seen['actu_' + key] || 0; if (w.seen['actu_' + key] >= 2 || R() > 0.1 * k) return;
    const ev = pick(LOCEV); w.seen['actu_' + key]++; const a = w.act[p.cand.key] = w.act[p.cand.key] || {}; a[ev[0]] = (a[ev[0]] || 0) + 0.6;
    const before = (known() || []).slice(0, 3).map(c => c.t); refreshKnown(); const L = enjeux() || []; const top = L.slice(0, 3).map(c => c.t);
    E.article('dauph', ev[1], -0.1, 'nat'); const has = (p.prog || []).some(m => m.status !== 'retiree' && m.theme === ev[0]);
    FL.echo('L’actualité s’invite dans la campagne : ' + ev[1].charAt(0).toLowerCase() + ev[1].slice(1) + '. ' + (top.includes(ev[0]) && !before.includes(ev[0]) ? D.THEMES[ev[0]].l + ' devient un enjeu majeur. ' : '') + (has ? 'Votre programme y répond.' : 'Votre programme ne dit rien sur le sujet : votre équipe s’inquiète.'));
  }

  /* =================== pactes entre joueurs =================== */
  const ASK = { adjoint: 'un poste d’adjoint·e avec délégation dans la future majorité', soutien: 'ton soutien public à ma prochaine candidature' };
  function pactWith(uid) { const p = P(); if (!p.cand) return null; return W().pacts.find(z => z.uid === uid && z.el === p.cand.el && ['propose', 'actif'].includes(z.st)) || null; }
  function proposePact(uid, give, ask) {
    const p = P(), s = S(); if (!p.cand || typeof MP === 'undefined' || !MP.on()) return { ok: false, msg: 'Réservé aux parties entre amis.' }; if (pactWith(uid)) return { ok: false, msg: 'Une proposition est déjà en cours.' };
    const h = MP.rivals().find(x => x.uid === uid); const el = s.elections.find(e => e.id === p.cand.el); const pid = E.uid('pa'); const name = h ? h.name : 'Votre ami·e';
    W().pacts.unshift({ pid, uid, name, el: p.cand.el, elL: el ? el.label : '', key: p.cand.key, give, ask, role: 'A', st: 'propose', date: s.date });
    const txt = (give === 'desist' ? 'Je me retire du second tour en ta faveur' : 'J’appelle à voter pour toi au second tour') + ', si tu t’engages sur ceci : ' + ASK[ask] + '.';
    MP.send(uid, 'pacte', txt, { pid, el: p.cand.el, elL: el ? el.label : '', key: p.cand.key, give, ask }); return { ok: true, msg: 'Proposition d’accord envoyée à ' + name + '.' };
  }
  function inbound(v, fid, nm0) {
    const d = v.data || {}; const w = W(); const pa = w.pacts.find(z => z.pid === d.pid); const p = P();
    if (v.kind === 'pacte') { if (pa) return; w.pacts.unshift({ pid: d.pid, uid: v.from, name: nm0, el: d.el, elL: d.elL, key: d.key, give: d.give, ask: d.ask, role: 'B', st: 'propose', date: S().date });
      LF.sms(fid, nm0 + ' vous propose un accord d’entre-deux-tours : « ' + v.text + ' »', [{ l: 'Accepter et m’engager', pw: { pacte: ['ok', d.pid] }, res: 'Accord conclu. Il faudra tenir parole.' }, { l: 'Refuser', pw: { pacte: ['non', d.pid] }, res: 'Vous déclinez.' }], { role: 'Joueur·se', human: v.from }); return; }
    if (!pa) return;
    if (v.kind === 'pacteRep') {
      if (!d.ok) { pa.st = 'refuse'; LF.sms(fid, nm0 + ' refuse votre accord. Vous restez libre de vos consignes.', null, { role: 'Joueur·se', human: v.from }); return; }
      pa.st = 'actif'; let t = nm0 + ' accepte : ' + ASK[pa.ask].replace('ton', 'son') + '. ';
      if (p.cand && p.cand.el === pa.el && p.cand.key === pa.key) { if (pa.give === 'desist') { MP.setWithdraw(pa.el, pa.key, pa.uid); E.addStd(1); E.article('dauph', p.name + ' se retire au profit de ' + nm0, 0.2, 'pj'); t += 'Votre désistement est annoncé.'; } else { MP.setEndorse(pa.el, pa.key, pa.uid); MP.send(pa.uid, 'soutien', 'J’appelle à voter pour toi au second tour.'); E.article('dauph', p.name + ' appelle à voter pour ' + nm0 + ' au second tour', 0.1, 'pj'); t += 'Votre consigne de vote est publiée.'; } }
      LF.sms(fid, t, null, { role: 'Joueur·se', human: v.from }); return; }
    if (v.kind === 'pacteTenu') { pa.st = 'tenu';
      if (pa.ask === 'adjoint') { const com = E.commune(); if (!p.mandats.some(m => ['maire', 'adjoint'].includes(m.type))) { p.mandats = p.mandats.filter(m => m.type !== 'conseiller_municipal'); p.mandats.push({ type: 'adjoint', label: 'Adjoint·e au maire ' + E.de(com.name) + ' (accord avec ' + nm0 + ')', since: S().date, ind: D.adjIndemnity(com.pop), majority: true }); E.log('Accord tenu : vous devenez adjoint·e au maire ' + E.de(com.name) + '.', 'good'); } }
      LF.sms(fid, nm0 + ' tient parole' + (pa.ask === 'adjoint' ? ' : vous voilà adjoint·e, avec une délégation.' : ' : son soutien est public.'), null, { role: 'Joueur·se', human: v.from }); return; }
    if (v.kind === 'pacteTrahi') { pa.st = 'trahi'; E.addImageAll(0.4); LF.sms(fid, nm0 + ' revient sur votre accord d’entre-deux-tours. Ce que vous aviez obtenu en échange de votre ' + (pa.give === 'desist' ? 'désistement' : 'soutien') + ' ne viendra pas.', [{ l: 'Le dénoncer publiquement', noto: 1, pw: { denonce: pa.uid }, res: 'Votre déclaration fait le tour du département.' }, { l: 'Encaisser sans un mot', cred: 1, res: 'Vous ne dites rien. Certains le remarquent, et vous en estiment.' }], { role: 'Joueur·se', human: v.from }); return; }
    if (v.kind === 'pacteCaduc') { pa.st = 'caduc'; LF.sms(fid, nm0 + ' a perdu : votre accord tombe de lui-même.', null, { role: 'Joueur·se', human: v.from }); }
  }
  function pactRes(k, pid) {
    const pa = W().pacts.find(z => z.pid === pid); if (!pa) return ''; const p = P();
    if (k === 'ok' || k === 'non') { if (pa.st !== 'propose') return ''; pa.st = k === 'ok' ? 'actif' : 'refuse'; MP.send(pa.uid, 'pacteRep', k === 'ok' ? 'ok' : 'non', { pid, ok: k === 'ok' ? 1 : 0 }); if (k === 'ok') E.article('dauph', 'Accord d’entre-deux-tours entre ' + p.name + ' et ' + pa.name, 0.1, 'pj'); return ''; }
    if (k === 'tenu') { pa.st = 'tenu'; MP.send(pa.uid, 'pacteTenu', 'tenu', { pid }); if (pa.ask === 'soutien') MP.send(pa.uid, 'soutien', 'Je tiens parole : je te soutiens.'); p.cred = clamp(p.cred + 1, 0, 100); return 'Vous tenez parole. Dans le département, ça se sait.'; }
    if (k === 'trahi') { pa.st = 'trahi'; MP.send(pa.uid, 'pacteTrahi', 'trahi', { pid }); p.cred = clamp(p.cred - 5, 0, 100); E.addImageAll(-0.6); E.article('dauph', p.name + ' renie son accord avec ' + pa.name, -0.4, 'pj'); return 'Vous reniez votre parole. Le Dauphinois en fait ses gros titres.'; }
    return '';
  }
  function pactTick(tryAdd) {
    if (typeof MP === 'undefined' || !MP.on()) return; const s = S(), p = P();
    W().pacts.filter(z => z.role === 'B' && z.st === 'actif').forEach(pa => { const el = s.elections.find(e => e.id === pa.el); if (!el || el.status !== 'fini' || pa.asked) return;
      if (pa.ask === 'adjoint') { if (!mayor()) { pa.st = 'caduc'; MP.send(pa.uid, 'pacteCaduc', 'caduc', { pid: pa.pid }); return; }
        tryAdd(true, () => { pa.asked = true; return FL.mkItem('pwpact', { urgent: 1, from: pa.name, t: 'Tenir parole envers ' + pa.name, body: 'Entre les deux tours, vous avez promis à ' + pa.name + ' un poste d’adjoint·e avec délégation en échange de son ' + (pa.give === 'desist' ? 'désistement' : 'soutien') + '. Le conseil d’installation approche.', opts: [
          { l: 'Lui confier une délégation', fx: { coh: 3 }, pw: { pacte: ['tenu', pa.pid] } }, { l: 'Revenir sur l’accord', pw: { pacte: ['trahi', pa.pid] } }], dflt: { pw: { pacte: ['trahi', pa.pid] }, res: 'Faute de décision, la délégation est donnée à quelqu’un d’autre. ' + pa.name + ' le prend très mal.' } }); }); }
      else { const h = MP.rivals().find(x => x.uid === pa.uid); if (dd(pa.date, s.date) > 1460) { pa.st = 'caduc'; return; } if (!h || !h.cand || h.cand.el === pa.el) return; const el2 = s.elections.find(e => e.id === h.cand.el);
        tryAdd(true, () => { pa.asked = true; return FL.mkItem('pwpact', { from: pa.name, t: pa.name + ' attend votre soutien', body: pa.name + ' est candidat·e' + (el2 ? ' aux ' + el2.label.toLowerCase() : '') + '. Vous lui aviez promis votre soutien public en échange de son ' + (pa.give === 'desist' ? 'désistement' : 'soutien') + ' aux ' + pa.elL.toLowerCase() + '.', opts: [
          { l: 'Le soutenir publiquement', pw: { pacte: ['tenu', pa.pid] } }, { l: 'Rester neutre', pw: { pacte: ['trahi', pa.pid] } }], dflt: { pw: { pacte: ['trahi', pa.pid] }, res: 'Votre silence vaut reniement.' } }); }); }
    });
  }

  /* =================== budget en leviers =================== */
  const PRIO = { ecoles: ['Écoles et enfance', ['education'], { PERI: 1, JUD: 0.6 }], voirie: ['Voirie et mobilités', ['transports'], { PERI: 1, RUR: 0.8 }], securite: ['Sécurité', ['securite'], { RET: 1, PERI: 0.6 }],
    solid: ['Solidarités et santé', ['sante', 'logement', 'pouvoir_achat'], { POP: 1, RET: 0.6 }], eco: ['Transition écologique', ['ecologie'], { JUD: 1, CAD: 0.6 }], vie: ['Sport, culture, associations', ['societe', 'culture', 'sport'], { POP: 0.6, PERI: 0.6, JUD: 0.6 }] };
  const GR_TH = { mediatheque: 'culture', piscine: 'sport', ecoquartier: 'ecologie', centre: 'economie', maisonsante: 'sante', policeHQ: 'securite' };
  const EMP = ['Aucun', 'Modéré', 'Fort'];
  function budCalc(o) {
    const m = P().mairie; const pop = E.commune().pop; const base = pop * 1350; const tf = clamp(m.tf + (o.dtf || 0), 15, 60);
    const fct = (m.fct || 1) * (1 + (o.f || 0)); const drift = (m.drift || 0) + 0.004;
    const rec = base * (1 + 0.35 * (tf - 38) / 38); const dep = base * 0.88 * fct * (1 + drift);
    const int = m.dette * 0.03; const eb = rec - dep - int; const cap = m.dette / 15; const empA = [0, pop * 90, pop * 210][o.emp ?? 1];
    const inv = Math.max(0, Math.round(eb - cap + pop * 150 + empA)); const dette = Math.max(0, Math.round(m.dette + empA - cap)); const ratio = eb > 0 ? dette / eb : 99;
    return { tf, fct, drift, rec, dep, int, eb, cap, empA, inv, dette, ratio };
  }
  const yr = () => S().date.slice(0, 4);
  function budVoted() { const m = P().mairie; return !!(m && m.bud && m.bud[yr()]); }
  function prioEval() {
    const m = P().mairie; if (!m || !m.bud) return; const ys = Object.keys(m.bud).filter(y => y < yr() && !m.bud[y].eval).sort(); ys.forEach(y => { const b = m.bud[y]; b.eval = true; if (!(b.prio || []).length) return;
      const ths = b.prio.flatMap(k => (PRIO[k] || ['', []])[1]); const pjs = typeof OF !== 'undefined' ? OF.pjs().filter(x => x.st === 'fini' && (x.end || '').slice(0, 4) === y && ths.includes(x.th)) : []; const gr = (m.grands || []).filter(g => g.done && (g.end || '').slice(0, 4) === y && ths.includes(GR_TH[g.id]));
      const n = pjs.length + gr.length; const lab = b.prio.map(k => PRIO[k][0].toLowerCase()).join(' et ');
      if (n) { b.prio.forEach(k => { const sg = PRIO[k][2]; for (const g in sg) E.addImage(g, sg[g]); }); P().cred = clamp(P().cred + 1.5, 0, 100); if (typeof GV !== 'undefined') GV.addBilan('Budget ' + y + ' : priorités tenues (' + lab + ')', 4, 'mandat'); FL.echo('Bilan du budget ' + y + ' : vos priorités (' + lab + ') se sont traduites en ' + n + ' réalisation' + (n > 1 ? 's' : '') + '.', null); }
      else { P().cred = clamp(P().cred - 1.5, 0, 100); if (typeof GV !== 'undefined') GV.addBilan('Budget ' + y + ' : priorités sans réalisation', -2, 'mandat'); FL.echo('Bilan du budget ' + y + ' : aucune réalisation sur vos priorités affichées (' + lab + '). L’opposition parle de « budget d’affichage ».', null); } });
  }
  function voteBudget(o) {
    const p = P(), m = p.mairie; if (!m) return 'Il faut être maire.'; prioEval(); const y = yr(); const coh = m.cohesion ?? 70;
    if (!o.forced && R() > 0.55 + coh / 200 - ((o.dtf || 0) > 0 ? 0.06 : 0) - ((o.f || 0) < 0 ? 0.04 : 0)) { const c0 = budCalc({ dtf: 0, f: 0, emp: 1 }); m.fct = c0.fct; m.drift = c0.drift; m.dette = c0.dette; m.invest = c0.inv; m.budget = Math.round(c0.dep); m.bud = m.bud || {}; m.bud[y] = { dtf: 0, f: 0, emp: 1, prio: [], inv: c0.inv, extra: 0, ratio: Math.round(c0.ratio * 10) / 10, eb: Math.round(c0.eb), rejet: true };
      m.cohesion = clamp(coh - 10, 0, 100); E.addImageAll(-1.5); if (typeof GV !== 'undefined') GV.addBilan('Budget ' + y + ' rejeté par le conseil', -8, 'budget'); E.article('dauph', E.commune().name + ' : le budget rejeté, camouflet pour ' + p.name, -0.5, 'pj');
      return 'Votre majorité se fissure : le budget est rejeté. Le préfet le règle sur la base de l’an dernier. Un camouflet.'; }
    const c = budCalc(o); const dtf = c.tf - m.tf;
    m.tf = c.tf; m.fct = c.fct; m.drift = c.drift; m.dette = c.dette; m.invest = c.inv; m.budget = Math.round(c.dep); m.bud = m.bud || {}; m.bud[y] = { dtf, f: o.f || 0, sv: o.sv || 0, emp: o.emp ?? 1, prio: (o.prio || []).slice(0, 2), inv: c.inv, extra: 0, ratio: Math.round(c.ratio * 10) / 10, eb: Math.round(c.eb) };
    const L = [];
    if (dtf) { E.addImage('RET', -1.5 * dtf); E.addImage('PERI', -1.5 * dtf); E.addImage('CAD', -1 * dtf); E.statement(dtf > 0 ? 'Hausse de la taxe foncière : il faut financer nos services.' : 'Baisse de la taxe foncière : nous rendons du pouvoir d’achat.', 'fiscalite', { eco: dtf > 0 ? -25 : 25 }, 0.5, 'budget'); L.push('taxe foncière ' + (dtf > 0 ? '+' : '') + dtf + ' point' + (Math.abs(dtf) > 1 ? 's' : '') + ' (' + c.tf + ' %)'); if (dtf > 0 && m.plan && m.plan.items.some(i => i.k === 'fisc')) { p.cred = clamp(p.cred - 3, 0, 100); L.push('promesse fiscale du plan de mandat rompue'); } }
    if ((o.f || 0) < 0) { E.addImage('POP', -1); E.addImage('RET', -0.4); m.sat = (m.sat || 0) - 2; L.push('économies sur le fonctionnement'); }
    if ((o.f || 0) > 0) { E.addImage('POP', 0.8); E.addImage('PERI', 0.5); m.sat = (m.sat || 0) + 2; L.push('services renforcés'); }
    (o.prio || []).slice(0, 2).forEach(k => { const sg = (PRIO[k] || [])[2] || {}; for (const g in sg) E.addImage(g, sg[g] * 0.5); });
    if ((o.sv || 0) > 0) { E.addImage('POP', 1); E.addImage('JUD', 0.8); p.militants += 2; L.push('subventions aux associations en hausse'); }
    if ((o.sv || 0) < 0) { E.addImage('POP', -1.2); if (typeof GV !== 'undefined') GV.addBilan('Baisse des subventions aux associations', -3, 'budget'); FL.later(2, 'asso', {}); L.push('subventions aux associations en baisse'); }
    m.cohesion = clamp(coh + (dtf > 0 ? -5 : 2) + ((o.f || 0) < 0 ? -3 : 0), 0, 100);
    if ((o.emp ?? 1) === 2) { L.push('emprunt fort'); if (c.ratio > 10) p.cred = clamp(p.cred - 1.5, 0, 100); }
    if (c.ratio > 12) { FL.later(6, 'pwCrc', { y }); L.push('<b>endettement préoccupant</b>'); }
    E.article('dauph', 'Budget ' + y + ' ' + E.de(E.commune().name) + ' : ' + (L.length ? L.join(', ').replace(/<[^>]+>/g, '') : 'continuité') + ', ' + eur(c.inv) + ' d’investissements', dtf > 0 ? -0.2 : 0.1, 'pj');
    (S().turnDid = S().turnDid || []).push({ l: 'Budget voté', m: eur(c.inv) + ' d’investissement' });
    return 'Budget ' + y + ' voté : ' + eur(c.inv) + ' d’investissements, capacité de désendettement ' + (c.ratio >= 99 ? 'hors de contrôle' : f1(c.ratio) + ' ans') + '.' + (L.length ? ' ' + L.join(', ').replace(/<[^>]+>/g, '') + '.' : '');
  }
  function budItem() { const m = P().mairie; const c = budCalc({ dtf: 0, f: 0, emp: 1 }); const prev = m.bud && m.bud[String(+yr() - 1)];
    return FL.mkItem('pwbud', { urgent: +S().date.slice(5, 7) >= 3 ? 1 : 0, from: 'La commission des finances', t: 'Voter le budget ' + yr(), due: yr() + '-04-14', body: 'Le budget primitif doit être voté avant le 15 avril. À politique inchangée, l’épargne de la commune serait de ' + eur(c.eb) + ' et la capacité de désendettement de ' + (c.ratio >= 99 ? 'plus de 50' : f1(c.ratio)) + ' ans' + (prev ? ' (l’an dernier : ' + f1(prev.ratio) + ' ans)' : '') + '. Taux, dépenses, emprunt, priorités : à vous d’arbitrer.', opts: [
      { l: 'Préparer le budget', sub: 'Taux, dépenses, emprunt et priorités', ui: 'budget' }, { l: 'Reconduire le budget de l’an dernier', pw: { bud: 'recond' } }],
      dflt: { pw: { bud: 'recond' }, fx: { cred: -2 }, res: 'Faute de vote à temps, le préfet règle le budget sur la base de l’an dernier. Mauvaise publicité.' } }); }
  const LATER = {
    pwEnq(d) { const p = P(); const x = S().pnj[d.rid]; const e = W().enq[d.rid]; if (e) e.run = false; if (!x) return; const st = p.staff || [];
      const q = 0.42 + (st.some(z => z.role === 'juriste') ? 0.15 : 0) + (st.some(z => z.role === 'dircamp') ? 0.08 : 0) + (x.mandat || ['maire', 'depute'].includes(x.role) ? 0.1 : 0);
      if (R() > q) { FL.echo('Votre enquête sur ' + x.name + ' n’a rien donné de solide. Rien d’exploitable, ou rien de trouvable.', null); return; }
      const used = W().secrets.filter(z => z.on === x.id).map(z => z.t); const pool = SECR.filter(z => !used.includes(z[0])); if (!pool.length) return; const z = pick(pool);
      const sc = { id: E.uid('sc'), on: x.id, name: x.name, t: z[0], pw: z[1], date: S().date, st: 'new' }; W().secrets.unshift(sc);
      FL.push(FL.mkItem('pwsec', { from: 'Votre équipe', t: 'Ce que l’enquête a trouvé sur ' + x.name, body: 'Documents à l’appui : ' + x.name + ' ' + z[0] + '. ' + (z[1] >= 3 ? 'C’est grave.' : z[1] === 2 ? 'C’est sérieux.' : 'C’est gênant, sans plus.'), opts: secretOpts(sc), dflt: { pw: { sec: ['keep', sc.id] }, res: 'Le dossier reste dans un tiroir.' } })); },
    pwCrc(d) { const m = P().mairie; if (!m) return; const c = budCalc({ dtf: 0, f: 0, emp: 0 }); if (c.ratio <= 12) return; P().cred = clamp(P().cred - 4, 0, 100); m.tf = clamp(m.tf + 2, 15, 60); E.addImage('RET', -2); E.addImage('PERI', -2);
      E.article('dauph', 'Finances ' + E.de(E.commune().name) + ' : le préfet saisit la chambre régionale des comptes', -0.6, 'pj'); FL.echo('La chambre régionale des comptes impose un plan de redressement : la taxe foncière augmente de deux points d’office.', null); }
  };

  /* =================== plan de mandat =================== */
  function planCands() {
    const p = P(), m = p.mairie; if (!m) return []; const out = [];
    p.prog.filter(x => x.level === 'local' && x.status !== 'retiree').forEach(x => out.push({ id: 'm:' + x.id, k: 'mes', ref: x.id, l: x.resume, th: x.theme, cost: (x.inv || 0) + (x.cout || 0) * 3 }));
    (typeof LF !== 'undefined' ? LF.GRANDS : []).forEach(g => out.push({ id: 'g:' + g.id, k: 'grand', ref: g.id, l: g.l, th: GR_TH[g.id], cost: Math.round(m.invest * g.c * 2) }));
    out.push({ id: 'f:tf', k: 'fisc', l: 'Ne pas augmenter la taxe foncière du mandat', cost: 0 }); out.push({ id: 'f:dette', k: 'dette', l: 'Réduire la dette de la commune', cost: 0 }); return out;
  }
  function setPlan(ids) {
    const p = P(), m = p.mairie; if (!m) return 'Il faut être maire.'; const C = planCands(); const items = ids.map(id => C.find(c => c.id === id)).filter(Boolean).slice(0, 5); if (items.length < 3) return 'Choisissez de trois à cinq engagements.';
    const cost = items.reduce((a, c) => a + c.cost, 0); const capa = m.invest * 6; const real = cost <= capa * 1.15;
    m.plan = { start: S().date, items, tf0: m.tf, dette0: m.dette, cost, capa, mid: false, end: false }; p.cred = clamp(p.cred + (real ? 1.5 : -2), 0, 100);
    E.article('dauph', p.name + ' présente son plan de mandat : ' + items.length + ' engagements' + (real ? '' : ', un programme jugé ambitieux'), real ? 0.3 : -0.1, 'pj');
    return 'Plan de mandat présenté au conseil : ' + items.length + ' engagements, ' + eur(cost) + ' estimés pour ' + eur(capa) + ' de capacité d’investissement sur six ans.' + (real ? '' : ' La presse le juge irréaliste.');
  }
  function itemSt(it) {
    const p = P(), m = p.mairie || {};
    if (it.k === 'mes') { const x = p.prog.find(z => z.id === it.ref); const pj = typeof OF !== 'undefined' ? OF.pjs().find(z => z.mid === it.ref && z.st !== 'abandon') : null; if (x && x.status === 'appliquee') return 'done'; if ((x && x.status === 'encours') || pj) return 'run'; if (!x || x.status === 'retiree') return 'drop'; return 'todo'; }
    if (it.k === 'grand') { const g = (m.grands || []).filter(z => z.id === it.ref && (z.start || '') >= m.plan.start); if (g.some(z => z.done)) return 'done'; if (g.length) return 'run'; return 'todo'; }
    if (it.k === 'fisc') return m.tf <= m.plan.tf0 ? 'ok' : 'broken'; if (it.k === 'dette') return m.dette < m.plan.dette0 ? 'ok' : 'todo'; return 'todo';
  }
  function tally() { const m = P().mairie; if (!m || !m.plan) return null; const st = m.plan.items.map(itemSt); const done = st.filter(x => x === 'done' || x === 'ok').length, run = st.filter(x => x === 'run').length; return { n: st.length, done, run, st, ratio: (done + run * 0.5) / st.length }; }
  function midItem() { const t = tally(); const m = P().mairie; const lab = t.done + ' engagement' + (t.done > 1 ? 's' : '') + ' tenu' + (t.done > 1 ? 's' : '') + ', ' + t.run + ' en cours, sur ' + t.n;
    return FL.mkItem('pwmid', { from: FL.journo() ? FL.journo().name + ', Le Dauphinois' : 'Le Dauphinois', t: 'Bilan de mi-mandat', body: 'Trois ans après votre plan de mandat : ' + lab + '. Le journal prépare un dossier et vous demande la suite.', opts: [
      { l: 'Tenir le cap', pw: { plan: 'cap' } }, { l: 'Réviser le plan : abandonner un engagement', pw: { plan: 'revise' }, fx: { cred: -1.5 }, res: 'Vous assumez de renoncer à un engagement. L’opposition s’en régale, mais le reste devient crédible.' },
      { l: 'Accélérer en empruntant', pw: { plan: 'accel' }, res: 'Emprunt voté : les chantiers en retard redémarrent.' }], dflt: { pw: { plan: 'cap' } } }); }
  function planRes(k) {
    const p = P(), m = p.mairie; if (!m || !m.plan) return ''; const t = tally(); m.plan.mid = true;
    if (k === 'cap') { const d = Math.round((t.ratio - 0.35) * 8 * 10) / 10; p.cred = clamp(p.cred + d, 0, 100); if (typeof GV !== 'undefined') GV.addBilan('Mi-mandat : ' + t.done + ' engagement(s) tenu(s) sur ' + t.n, d > 0 ? 3 : -2, 'mandat'); E.article('dauph', 'Mi-mandat : ' + t.done + ' engagement' + (t.done > 1 ? 's' : '') + ' tenu' + (t.done > 1 ? 's' : '') + ' sur ' + t.n + ' pour ' + p.name, d > 0 ? 0.3 : -0.3, 'pj'); return d >= 0 ? 'Le dossier du Dauphinois salue un plan qui avance.' : 'Le dossier du Dauphinois parle d’un plan à la traîne.'; }
    if (k === 'revise') { const i = t.st.findIndex(x => x === 'todo' || x === 'broken'); if (i >= 0) m.plan.items.splice(i, 1); return ''; }
    if (k === 'accel') { const amt = Math.round(m.invest * 0.6); m.dette += amt; m.invest += amt; const b = m.bud && m.bud[yr()]; if (b) b.extra = (b.extra || 0) + amt; p.cred = clamp(p.cred - 0.5, 0, 100); return 'Emprunt supplémentaire de ' + eur(amt) + '.'; }
    return '';
  }
  function planEnd() { const p = P(), m = p.mairie; if (!m || !m.plan || m.plan.end) return; const t = tally(); m.plan.end = true;
    m.plan.items.forEach((it, i) => { const st = t.st[i]; if (typeof GV !== 'undefined') GV.addBilan((st === 'done' || st === 'ok' ? 'Engagement tenu : ' : 'Engagement non tenu : ') + it.l, st === 'done' || st === 'ok' ? 5 : -4, 'mandat'); });
    p.cred = clamp(p.cred + (t.ratio - 0.5) * 8, 0, 100); E.article('dauph', 'Fin de mandat : ' + p.name + ' a tenu ' + t.done + ' de ses ' + t.n + ' engagements', t.ratio >= 0.5 ? 0.3 : -0.3, 'pj'); }

  /* =================== résolution des options =================== */
  function res(e, it) { let out = '';
    if (e.hook) addHook(e.hook[0], e.hook[1], e.hook[2], e.hook[3]);
    if (e.sec) out = useSecret(e.sec[1], e.sec[0]) || '';
    if (e.pacte) out = pactRes(e.pacte[0], e.pacte[1]) || '';
    if (e.denonce && typeof MP !== 'undefined') { MP.send(e.denonce, 'attaque', 'Il y a une chose qu’on ne fait pas en politique : renier sa parole. Je ne l’oublierai pas.'); E.addNoto(FL.nscope(), 0.5); }
    if (e.bud === 'recond') { const b = P().mairie && P().mairie.bud && P().mairie.bud[String(+yr() - 1)]; out = voteBudget({ forced: true, dtf: 0, f: 0, emp: b ? b.emp : 1, prio: b ? b.prio : [] }); }
    if (e.plan) out = planRes(e.plan) || '';
    return out; }

  /* =================== tour =================== */
  function tick(k, tryAdd) {
    const s = S(), p = P(); const mo = +s.date.slice(5, 7);
    tryAdd(R() < 0.12 * k && (elu() || p.cand || FL.known() > 8), askItem);
    if (p.cand) { const ce = s.elections.find(e => e.id === p.cand.el); if (ce && ce.status !== 'fini' && dd(s.date, E.nextDate(ce)) <= 150) baro(); }
    actuTick(k);
    if (mayor()) { const m = p.mairie; const pend = FL.pending();
      if (!budVoted() && (mo <= 4 || !m.bud) && !pend.some(x => x.k === 'pwbud')) tryAdd(true, budItem);
      if (!m.plan && !m.planAsked && dd((p.mandats.find(z => z.type === 'maire') || {}).since || s.date, s.date) >= 20) tryAdd(true, () => { m.planAsked = s.date; return FL.mkItem('pwplan', { from: 'Votre directeur·rice de cabinet', t: 'Établir votre plan de mandat', body: 'Le conseil attend votre feuille de route pour six ans : trois à cinq engagements que vous vous fixez, chiffrés face à la capacité d’investissement de la commune. Ils seront jugés à mi-mandat, puis à la fin.', opts: [{ l: 'Construire le plan', ui: 'plan' }, { l: 'Gouverner sans plan affiché', fx: { cred: -1 }, res: 'Vous gardez les mains libres. La presse parle d’un mandat sans cap.' }], dflt: { fx: { cred: -1 }, res: 'Pas de plan présenté. On vous reproche de naviguer à vue.' } }); });
      if (m.plan && !m.plan.mid && dd(m.plan.start, s.date) >= 1065 && !pend.some(x => x.k === 'pwmid')) tryAdd(true, midItem);
      if (m.plan && !m.plan.end) { const mun = s.elections.find(e => e.type === 'mun' && e.status === 'futur' && dd(s.date, e.d1) <= 60 && dd(s.date, e.d1) > 0); if (mun) planEnd(); }
      if (mo === 12) prioEval(); }
    pactTick(tryAdd);
  }
  return { W, HK, addHook, liveHooks, hookUses, useHook, enquete, canEnq, ENQ_H, ENQ_C, secUses, useSecret, enjeux, known, enjW, talk, talks, talkAlign, baro, proposePact, pactWith, inbound, ASK, budCalc, budVoted, voteBudget, PRIO, EMP, planCands, setPlan, itemSt, tally, res, tick, LATER };
})();
if (typeof window !== 'undefined') window.PW = PW;
