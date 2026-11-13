/* Mandat — « le fil » : dossiers à épisodes, suites différées, dettes, promesses, votes publics,
   polémiques express, doléances, rendez-vous, crises, stratégie du rival, journaliste, équipe. */
const FL = (() => {
  const S = () => G.S, P = () => G.S.p;
  const R = () => E.rnd(), pick = a => E.pick(a), clamp = (v, a, b) => E.clamp(v, a, b), rint = (a, b) => E.rint(a, b);
  const F = () => { const s = S(); if (!s.fl) s.fl = { inbox: [], arcs: [], later: [], debts: [], prom: [], votes: [], pos: {}, echo: [], done: [], seen: {} }; return s.fl; };
  const add = (d, n) => E.addDays(d, n), dd = (a, b) => E.diffDays(a, b);
  const SEGN = id => (D.SEGS.find(s => s.id === id) || {}).name || id;
  const bloc = () => (D.PARTIES[P().party] || {}).bloc || 'DIV';
  const has = t => P().mandats.some(m => m.type === t);
  const mayor = () => has('maire') || !!P().mairie;
  const local = () => P().mandats.some(m => ['conseiller_municipal', 'adjoint', 'maire', 'cd', 'cr'].includes(m.type));
  const elu = () => P().mandats.length > 0;
  const majority = () => mayor() || has('adjoint') || P().mandats.some(m => m.type === 'conseiller_municipal' && m.majority);
  const place = () => E.commune().name; const vil = () => !!(E.myPetite && E.myPetite());
  const nm = g => pick(g === 'F' ? D.FIRST_F : D.FIRST_M) + ' ' + pick(D.LAST);
  const nscope = () => has('depute') ? 'circo' : has('cd') ? 'circo' : 'commune';
  const known = () => Math.max(P().noto.commune, P().noto.circo);

  /* ---------- personnages récurrents ---------- */
  function journo() { const f = F(); let x = f.jid && S().pnj[f.jid]; if (!x || !x.alive) { const L = E.pnjList(y => y.role === 'journaliste' && y.territory === 'dauph'); x = L[0] || E.pnjList(y => y.role === 'journaliste')[0]; f.jid = x ? x.id : null; } return x || null; }
  const jn = () => { const j = journo(); return j ? j.name + ', du Dauphinois,' : 'Le correspondant du Dauphinois'; };
  function rival() { const id = (S().rivals || [])[0]; return id ? S().pnj[id] : null; }

  /* ---------- effets ---------- */
  function fx(o, ctx) {
    if (!o) return; const p = P(); const sc = nscope();
    if (o.img) Object.keys(o.img).forEach(k => E.addImage(k, o.img[k]));
    if (o.all) E.addImageAll(o.all);
    if (o.noto) E.addNoto(sc, o.noto);
    if (o.cred) p.cred = clamp(p.cred + o.cred, 0, 100);
    if (o.std && p.party !== 'NEW') E.addStd(o.std);
    if (o.cash) p.cash = Math.max(0, p.cash + o.cash);
    if (o.jrel) { const j = journo(); if (j) j.rel = clamp((j.rel || 0) + o.jrel, -100, 100); }
    if (o.rrel) { const r = rival(); if (r) { r.rel = clamp((r.rel || 0) + o.rrel, -100, 100); if (o.rrel < -5) r.mom = (r.mom || 0) + 0.01; } }
    if (o.rmom) { const r = rival(); if (r) r.mom = (r.mom || 0) + o.rmom; }
    if (o.coh && p.mairie) p.mairie.cohesion = clamp((p.mairie.cohesion ?? 70) + o.coh, 0, 100);
    if (o.art) E.article(o.art[0], o.art[1], o.art[2], 'pj');
    if (o.later) later(o.later[0], o.later[1], Object.assign({}, o.later[2] || {}, ctx || {}));
    if (o.prom) promise(o.prom[0], o.prom[1], o.prom[2] || null);
    if (o.cas) E.casserole(o.cas[0], o.cas[1], o.cas[2] || 2, true, o.cas[3] || 0.08);
  }
  function echo(t, f) { const b = typeof X !== 'undefined' ? X.snap() : null; fx(f); F().echo.unshift({ date: S().date, t }); F().echo = F().echo.slice(0, 30); E.log(t, 'event'); }

  /* ---------- suites différées ---------- */
  function later(months, k, d) { F().later.push({ at: add(S().date, Math.round(months * 30)), k, d: d || {} }); }
  const LATER = {
    enquete(d) { if (R() < 0.4) { const j = journo(); echo('Révélations ressort une vieille affaire : ' + (d.t || 'un financement douteux') + '. ' + (j ? j.name + ' reprend l’information.' : ''), { cred: -5, all: -1.5, art: ['revel', 'Financement : les questions qui gênent ' + P().name, -0.7] }); } },
    asso(d) { echo('Les associations privées de subventions manifestent devant la mairie. Les photos tournent sur les réseaux.', { img: { POP: -1, RET: -1, JUD: -0.6 }, jrel: -2 }); },
    revanche(d) { echo((d.who || 'Le notable éconduit') + ' raconte partout que vous n’avez pas de parole.', { img: { RET: -1, CAD: -0.6 }, cred: -1 }); },
    fuite(d) { echo((d.who || 'Votre ancien·ne collaborateur·rice') + ' règle ses comptes dans la presse : réunions tendues, promesses intenables.', { cred: -3, all: -0.8, art: ['dauph', 'Un ex-proche de ' + P().name + ' raconte les coulisses', -0.5] }); },
    dol(d) { const ok = R() < (d.p || 0.6); const il = d.g === 'F' ? 'Elle' : 'Il'; if (ok) echo(d.who + ' a obtenu ' + d.what + ' grâce à vous. ' + il + ' le raconte à tout le quartier.', { img: { [d.seg]: d.big ? 1.8 : 1 }, noto: 0.6 }); else echo('Rien n’a bougé pour ' + d.who + ' (' + d.what + '). ' + il + ' commence à dire que vous promettez beaucoup.', { img: { [d.seg]: -0.6 } }); if (d.prom) closeProm(d.prom, ok); },
    crise(d) { push(mkItem('crisesuite', { k: 'crisesuite', from: 'Les sinistrés', t: 'Après ' + d.what + ' : les indemnisations traînent', body: 'Plusieurs familles touchées par ' + d.what + ' attendent toujours les assurances et l’aide de l’État. Elles vous interpellent.', opts: [{ l: 'Relancer la préfecture et les assureurs', h: 2, fx: { all: 1, noto: 0.5 }, res: 'Les dossiers sont accélérés. Les familles vous remercient publiquement.' }, { l: 'Organiser une collecte solidaire', h: 1, fx: { img: { RET: 1, POP: 1 } }, res: 'La collecte rapporte de quoi tenir. Joli geste, relayé par le journal.' }], dflt: { fx: { all: -0.8 }, res: 'Personne n’a répondu aux sinistrés. Ils le font savoir.' } })); }
  };

  /* ---------- promesses ---------- */
  function promise(t, months, ref) { const f = F(); const pr = { id: E.uid('pr'), t, date: S().date, due: add(S().date, Math.round((months || 6) * 30)), ref, ok: null }; f.prom.push(pr); f.prom = f.prom.slice(-40); return pr.id; }
  function closeProm(id, ok) { const pr = F().prom.find(x => x.id === id); if (!pr || pr.ok != null) return; pr.ok = ok; pr.closed = S().date; if (ok) fx({ cred: 1.5 }); else { const j = journo(); echo((j ? j.name : 'Le Dauphinois') + ' rappelle votre engagement : « ' + pr.t + ' ». Il n’a pas été tenu.', { cred: -3, all: -0.6, jrel: -1, art: ['dauph', 'Promesse non tenue : ' + pr.t, -0.4] }); } }

  /* ---------- dettes ---------- */
  function owe(who, why, kind) { F().debts.push({ id: E.uid('db'), who, why, kind: kind || 'notable', date: S().date, asked: false }); }

  /* ---------- la boîte « À trancher » ---------- */
  function mkItem(k, o) { return Object.assign({ id: E.uid('fl'), k, date: S().date, due: add(S().date, o.urgent ? 10 : 31), from: '', t: '', body: '', opts: [], dflt: null }, o); }
  function push(it) { const f = F(); if (it.urgent && f.inbox.some(x => x.urgent && x.done == null && x.date === S().date)) it.urgent = 0; f.inbox.unshift(it); if (it.urgent) S().queue.push({ kind: 'fl', id: it.id }); return it; }
  const pending = () => F().inbox.filter(x => x.done == null);
  function optOk(o) { const p = P(); if (o.h && p.hours < o.h) return 'Il vous faut ' + o.h + ' h libres.'; if (o.cash && o.cash < 0 && p.cash < -o.cash) return 'Pas assez d’argent.'; return true; }
  function decide(id, i) {
    const f = F(); const it = f.inbox.find(x => x.id === id); if (!it || it.done != null) return { ok: false, msg: 'Déjà traité.' };
    const o = it.opts[i]; const ok = optOk(o); if (ok !== true) return { ok: false, msg: ok };
    if (o.h) P().hours -= o.h; it.done = i; it.when = S().date;
    let res = o.res || ''; let f2 = o.fx;
    if (o.r) { const b = o.r.find(z => z.p == null || R() < z.p) || o.r[o.r.length - 1]; res = b.res; f2 = Object.assign({}, o.fx || {}, b.fx || {}); }
    fx(f2, { item: it.t });
    if (o.prom) o.prom2 = promise(o.prom[0], o.prom[1]);
    if (o.later) later(o.later[0], o.later[1], Object.assign({}, o.later[2] || {}, o.prom2 ? { prom: o.prom2 } : {}));
    if (o.debt) owe(o.debt[0], o.debt[1], o.debt[2]);
    if (o.pos) posMemo(o.pos[0], o.pos[1], it);
    if (it.arc) arcStep(it.arc, o.flag || null);
    if (it.debt) { const d = f.debts.find(x => x.id === it.debt); if (d) { d.paid = o.paid ? 1 : 0; d.closed = S().date; } if (!o.paid) later(rint(2, 6), 'revanche', { who: it.from }); }
    if (it.vote) f.votes.unshift({ date: S().date, t: it.vote, v: o.l }), f.votes = f.votes.slice(0, 30);
    if (o.staff) staffRes(o.staff, it);
    it.res = res; return { ok: true, msg: res, act: o.act || null };
  }
  function expire(it) { it.done = -1; it.when = S().date; const d = it.dflt || {}; fx(d.fx); if (it.arc) arcStep(it.arc, d.flag || 'silence'); if (it.debt && !d.keep) { const x = F().debts.find(y => y.id === it.debt); if (x) { x.paid = 0; x.closed = S().date; } later(rint(2, 6), 'revanche', { who: it.from }); } it.res = d.res || 'Sans réponse de votre part.'; if (d.res) F().echo.unshift({ date: S().date, t: it.t + ' : ' + d.res }); }

  /* ---------- positions : mémoire et volte-face ---------- */
  function posMemo(topic, v, it) { const f = F(); const old = f.pos[topic]; if (old && old.v * v < 0) { const j = journo(); echo((j ? j.name : 'Le Dauphinois') + ' relève votre volte-face : vous disiez l’inverse le ' + E.fmtDate(old.date) + '.', { cred: -3, jrel: -1 }); } if (v) f.pos[topic] = { v, date: S().date, t: it.t }; }

  /* ---------- dossiers à épisodes ---------- */
  const ARCS = {
    eolien: { t: 'Le parc éolien de la colline', w: () => vil() || E.commune().pop < 15000 ? 1 : 0.4, steps: [
      () => ({ from: 'Un développeur d’énergie', body: 'Une société propose six éoliennes sur la colline : 120 000 € de recettes fiscales par an pour la commune. Un collectif « Sauvons nos paysages » se crée déjà.', opts: [
        { l: 'Soutenir le projet', flag: 'pour', fx: { img: { JUD: 1.5, CAD: 1, RUR: -1.5, RET: -1 } }, pos: ['eolien', 1], prom: ['Faire aboutir le parc éolien', 18], res: 'Votre soutien est dans le journal. Le collectif vous a déjà dans le viseur.' },
        { l: 'Vous y opposer', flag: 'contre', fx: { img: { RUR: 1.5, RET: 1.2, JUD: -1.5 } }, pos: ['eolien', -1], prom: ['Empêcher le parc éolien', 18], res: 'Le collectif vous applaudit. Le développeur prend note.' },
        { l: 'Exiger une vraie concertation d’abord', flag: 'concert', h: 1, fx: { cred: 1.5, img: { CAD: 0.6 } }, res: 'Position prudente, saluée par le journal. Les deux camps attendent la suite.' }],
        dflt: { flag: 'silence', fx: { cred: -0.5 }, res: 'Vous ne dites rien. Le sujet avance sans vous.' } }),
      (fl) => ({ from: 'Le collectif « Sauvons nos paysages »', body: 'Réunion publique houleuse à la salle des fêtes : 250 personnes, des pancartes, des insultes. ' + (fl.pour ? 'On vous attend pour défendre le projet.' : fl.contre ? 'Le collectif veut que vous preniez la parole à ses côtés.' : 'Tout le monde veut savoir ce que vous pensez vraiment.'), opts: [
        { l: fl.pour ? 'Défendre le projet devant la salle' : fl.contre ? 'Monter à la tribune avec le collectif' : 'Prendre position devant la salle', h: 3, r: [{ p: 0.55, res: 'Vous tenez la salle. Même vos opposants reconnaissent que vous ne vous êtes pas défilé·e.', fx: { cred: 2, noto: 1 } }, { res: 'Huées, interruptions : la vidéo tourne. Vous avez tenu, mais l’image est rude.', fx: { noto: 1.2, all: -0.6 } }], flag: fl.concert || fl.silence ? 'pour' : null },
        { l: 'Envoyer un communiqué', fx: { cred: -0.5 }, res: 'Le communiqué est lu à la tribune, sous les sifflets. On note que vous n’êtes pas venu·e.' },
        { l: fl.pour ? 'Prendre ses distances avec le projet' : fl.contre ? 'Calmer le jeu : « tout est encore ouvert »' : 'Annoncer une étude indépendante', flag: fl.pour || fl.contre ? 'flip' : 'concert', fx: fl.pour || fl.contre ? { cred: -3 } : { cred: 1 }, res: fl.pour || fl.contre ? 'Changement de pied remarqué. Personne n’est vraiment content.' : 'L’étude rassure un peu. Elle coûtera du temps.' }],
        dflt: { fx: { cred: -1 }, res: 'Vous n’êtes pas venu·e. Le collectif le fait savoir.' } }),
      (fl) => { const won = fl.contre ? R() < 0.55 : fl.pour ? R() < 0.6 : R() < 0.5; return { from: 'La préfecture', body: 'Le préfet a tranché après l’enquête publique : le parc éolien est ' + (won === !fl.contre ? 'autorisé.' : 'refusé.') + ' ' + (fl.pour || fl.contre ? (won ? 'C’est ce que vous défendiez.' : 'C’est l’inverse de ce que vous défendiez.') : ''), opts: [
        { l: won ? 'Revendiquer la victoire' : 'Prendre acte et passer à autre chose', fx: won ? { noto: 1, cred: 1 } : { cred: 0.5 }, res: won ? 'Vous avez tenu votre ligne du début à la fin. Ça se voit.' : 'Défaite digne. Vos adversaires sur ce dossier s’en souviendront moins que vos électeurs.' },
        { l: won ? 'Tendre la main au camp adverse' : 'Soutenir un recours au tribunal', h: won ? 1 : 2, fx: won ? { cred: 1.5, img: { RET: 0.6, RUR: 0.6 } } : { noto: 0.8, cred: -0.5 }, res: won ? 'Geste apprécié : l’apaisement, c’est aussi le rôle d’un·e élu·e.' : 'Recours déposé. Le dossier durera encore deux ans.' }], close: won } }
    ] },
    usine: { t: 'L’usine menacée', w: () => 1, steps: [
      () => { const e = pick(['la fonderie', 'les Papeteries', 'l’usine de skis', 'l’imprimerie industrielle', 'le sous-traitant automobile']); return { data: { e }, from: 'L’intersyndicale', body: 'Coup de tonnerre : ' + e + ' annonce un plan social, ' + rint(60, 180) + ' emplois menacés. Les salariés bloquent l’entrée.', opts: [
        { l: 'Aller voir les salariés sur le piquet', h: 2, flag: 'salaries', fx: { img: { POP: 2, PERI: 1 }, noto: 1, std: bloc() === 'D' ? -0.5 : 0.5 }, prom: ['Se battre pour l’usine', 12], res: 'Café, braseros, poignées de main. Les salariés vous ont vu·e.' },
        { l: 'Demander un rendez-vous à la direction', h: 1, flag: 'direction', fx: { img: { CAD: 1 }, cred: 1 }, res: 'La direction vous reçoit poliment. Elle parle de « restructuration nécessaire ».' },
        { l: 'Rester discret·ète, c’est une affaire privée', flag: 'silence', fx: { img: { POP: -1.5 } }, res: 'Les syndicats notent votre absence.' }],
        dflt: { flag: 'silence', fx: { img: { POP: -1.5, PERI: -0.5 } }, res: 'Pas un mot de votre part. Les salariés s’en souviendront.' } }; },
      (fl, d) => ({ from: 'Le commissaire au redressement', body: 'Un repreneur se présente pour ' + d.e + ' : il garde la moitié des emplois, demande une aide publique et un terrain à prix cassé. Son passé est trouble.', opts: [
        { l: 'Soutenir la reprise, même imparfaite', flag: 'reprise', fx: { img: { PERI: 1, CAD: 0.6 } }, res: 'Vous misez sur la reprise. Vous serez comptable du résultat.' },
        { l: 'Exiger des garanties écrites', h: 2, flag: 'garanties', fx: { cred: 1.5 }, res: 'Les garanties sont négociées. Le repreneur traîne des pieds.' },
        { l: 'Plaider pour une SCOP des salariés', h: 3, flag: 'scop', fx: { img: { POP: 1.5, JUD: 1 } }, res: 'L’idée fait son chemin chez les salariés. Il faudra des banques.' }],
        dflt: { flag: 'reprise', res: 'Le dossier avance sans vous. Le repreneur est retenu.' } }),
      (fl, d) => { const good = R() < (fl.garanties ? 0.65 : fl.scop ? 0.45 : 0.4); return { from: 'Le Dauphinois', body: good ? 'Bonne nouvelle : la reprise de ' + d.e + ' tient. ' + rint(40, 110) + ' emplois sauvés.' : 'Douche froide : un an après, ' + d.e + ' ferme définitivement. Les engagements n’ont pas été tenus.', opts: [
        { l: good ? 'Saluer les salariés, sans tirer la couverture' : 'Organiser une cellule de reclassement', h: good ? 1 : 3, fx: good ? { img: { POP: 1.5, PERI: 1 }, cred: 1.5 } : { img: { POP: 1.2 }, cred: 1 }, res: good ? 'Sobre et juste : les salariés apprécient.' : 'La cellule aide une quarantaine de personnes à retrouver un emploi.' },
        { l: good ? 'Revendiquer le sauvetage' : 'Accuser le gouvernement', fx: good ? { noto: 1.5, cred: fl.salaries || fl.garanties ? 1 : -2 } : { std: 1, img: { POP: 0.8 }, cred: -0.5 }, res: good ? (fl.salaries || fl.garanties ? 'Mérité : vous étiez là depuis le début.' : 'On vous rappelle que vous étiez absent·e au début.') : 'Le refrain habituel. Vos partisans applaudissent.' }], close: good } }
    ] },
    ecole: { t: 'La fermeture de classe', w: () => 1, steps: [
      () => ({ from: 'Les parents d’élèves', body: 'L’Éducation nationale annonce la fermeture d’une classe à ' + place() + ' à la rentrée. Les parents occupent l’école un matin par semaine.', opts: [
        { l: 'Occuper l’école avec les parents', h: 2, flag: 'parents', fx: { img: { PERI: 2, JUD: 1 }, noto: 0.8 }, prom: ['Sauver la classe', 8], res: 'Photo avec les parents en une du Dauphinois.' },
        { l: 'Écrire au directeur académique', h: 1, flag: 'dasen', fx: { cred: 1 }, res: 'Courrier envoyé. Réponse polie et vague.' },
        { l: 'Proposer un regroupement avec la commune voisine', flag: 'rpi', fx: { cred: 1, img: { PERI: -0.6 } }, res: 'Pragmatique, mais les parents le prennent comme une capitulation.' }],
        dflt: { flag: 'silence', fx: { img: { PERI: -1.5 } }, res: 'Les parents attendaient un signe de votre part. Rien.' } }),
      (fl) => { const ok = R() < (fl.parents ? 0.5 : fl.dasen ? 0.4 : fl.rpi ? 0.7 : 0.2); return { from: 'L’inspection académique', body: ok ? (fl.rpi ? 'Le regroupement est acté : les élèves restent scolarisés près de chez eux.' : 'Victoire : la classe est maintenue à la rentrée.') : 'La décision est confirmée : la classe ferme.', opts: [
        { l: ok ? 'Fêter ça avec les parents' : 'Promettre de se battre l’an prochain', fx: ok ? { img: { PERI: 1.5 }, noto: 0.6 } : { img: { PERI: 0.5 } }, prom: ok ? null : ['Rouvrir la classe', 12], res: ok ? 'Goûter dans la cour, discours court. Les parents s’en souviendront.' : 'Engagement noté. Il faudra le tenir.' },
        { l: 'Remercier sobrement tout le monde', fx: { cred: 0.8 }, res: 'Sobre. On apprécie.' }], close: ok } }
    ] },
    logement: { t: 'Les logements sociaux de la rue des Prés', w: () => vil() ? 0.3 : 1, steps: [
      () => ({ from: 'Un bailleur social', body: 'Projet de 45 logements sociaux rue des Prés. La commune est en retard sur la loi SRU et paie des pénalités. Les riverains lancent une pétition (600 signatures).', opts: [
        { l: 'Défendre le projet : il faut loger les familles', flag: 'pour', fx: { img: { POP: 2, JUD: 1.5, RET: -1.5, PERI: -1 } }, pos: ['logement', 1], prom: ['Faire construire les logements de la rue des Prés', 24], res: 'Les riverains vous accusent de « bétonner ». Les familles en attente vous écrivent pour vous remercier.' },
        { l: 'Soutenir les riverains', flag: 'contre', fx: { img: { RET: 1.5, PERI: 1.2, POP: -1.5, JUD: -1 } }, pos: ['logement', -1], res: 'La pétition gagne une signature de poids. Le préfet, lui, rappelle la loi.' },
        { l: 'Demander un projet plus petit et mieux intégré', h: 2, flag: 'mixte', fx: { cred: 1.5, img: { CAD: 1 } }, res: 'Compromis sur la table : 25 logements, des jardins. Personne n’est ravi, tout le monde peut vivre avec.' }],
        dflt: { flag: 'silence', fx: { cred: -0.6 }, res: 'Vous restez en retrait. Le débat se fait sans vous.' } }),
      (fl) => ({ from: 'Le collectif des riverains', body: 'Le collectif dépose un recours contre le permis de construire et vous demande de le soutenir publiquement. Le bailleur menace d’abandonner.', opts: [
        { l: 'Tenir bon : le projet doit se faire', flag: 'pour', fx: { img: { POP: 1, RET: -1 }, cred: fl.pour || fl.mixte ? 1.5 : -2 }, res: fl.pour || fl.mixte ? 'Ligne tenue. Le bailleur reste.' : 'Revirement remarqué. On vous demande ce qui a changé.' },
        { l: 'Soutenir le recours', flag: 'contre', fx: { img: { RET: 1, POP: -1 }, cred: fl.contre ? 1 : -2.5 }, res: fl.contre ? 'Cohérent avec votre position. Le préfet vous a dans le collimateur.' : 'Vous lâchez le projet que vous aviez défendu. Ça se paie.' }],
        dflt: { flag: 'silence', res: 'Vous laissez la justice trancher.' } }),
      (fl) => { const built = R() < (fl.pour ? 0.7 : fl.mixte ? 0.6 : 0.3); return { from: 'Le tribunal administratif', body: built ? 'Le recours est rejeté : les logements seront construits. Premiers coups de pelle au printemps.' : 'Le permis est annulé. Le bailleur jette l’éponge et la commune paiera ses pénalités SRU encore longtemps.', opts: [
        { l: built ? 'Inaugurer la première pierre' : 'Dénoncer le gâchis', h: 1, fx: built ? { img: { POP: 1.5 }, noto: 0.8 } : { noto: 0.5 }, res: built ? 'Photo avec les futures familles. Les riverains boudent.' : 'Vous avez dit ce que vous pensiez. Le dossier est clos.' },
        { l: 'Passer à autre chose', res: 'Dossier clos.' }], close: built } }
    ] },
    securite: { t: 'La série de cambriolages', w: () => 1, steps: [
      () => ({ from: 'Un groupe de voisins vigilants', body: 'Quinze cambriolages en un mois dans le quartier ' + pick(['des Écoles', 'de la Gare', 'des Pins', 'du Bourg']) + '. Les habitants veulent des caméras et plus de patrouilles.', opts: [
        { l: 'Réclamer de la vidéoprotection', flag: 'cam', fx: { img: { RET: 2, PERI: 1.2, JUD: -1.2 } }, pos: ['securite', 1], prom: ['Installer la vidéoprotection', 12], res: 'Les habitants applaudissent. La Ligue des droits de l’homme s’inquiète.' },
        { l: 'Organiser une réunion avec la gendarmerie', h: 2, flag: 'gend', fx: { cred: 1.5, img: { RET: 1 } }, res: 'Le commandant présente un plan de patrouilles. Sérieux, apprécié.' },
        { l: 'Miser sur la prévention et l’éclairage', flag: 'prev', fx: { img: { JUD: 1, CAD: 0.6, RET: -0.8 } }, pos: ['securite', -1], res: 'Approche jugée « naïve » par certains, « raisonnable » par d’autres.' }],
        dflt: { flag: 'silence', fx: { img: { RET: -1.5, PERI: -0.6 } }, res: 'Les habitants ont l’impression que personne ne les écoute.' } }),
      (fl) => { const calm = R() < (fl.gend ? 0.65 : 0.45); return { from: 'La gendarmerie', body: calm ? 'Une bande de cambrioleurs a été interpellée. Le quartier respire.' : 'Les cambriolages continuent, et un habitant a été blessé en surprenant des voleurs.', opts: [
        { l: calm ? 'Remercier les gendarmes' : 'Exiger des renforts du préfet', h: calm ? 0 : 1, fx: calm ? { img: { RET: 1 }, cred: 1 } : { img: { RET: 1.2, PERI: 0.8 }, noto: 0.8 }, res: calm ? 'Sobre et juste.' : 'Votre courrier au préfet est relayé. Deux patrouilles de plus sont promises.' },
        { l: calm ? 'Pousser pour pérenniser le dispositif' : 'Proposer des voisins vigilants encadrés', h: 1, fx: { cred: 1, img: { RET: 0.6 } }, res: 'Mesure concrète. Elle sera jugée dans la durée.' }], close: calm } }
    ] },
    medecin: { t: 'Le désert médical', w: () => 1, steps: [
      () => ({ from: 'Le dernier généraliste', body: 'Le Dr ' + pick(D.LAST) + ' part à la retraite en juin. 1 800 patients vont se retrouver sans médecin traitant à ' + place() + '.', opts: [
        { l: 'Porter un projet de maison de santé', h: 2, flag: 'msp', fx: { img: { RET: 2, RUR: 1 } }, prom: ['Ouvrir une maison de santé', 24], res: 'Projet lancé. Il faudra trouver des médecins, et c’est le plus dur.' },
        { l: 'Proposer un médecin salarié par la commune', flag: 'sal', fx: { img: { POP: 1.5, RET: 1 }, std: bloc() === 'G' ? 1 : 0 }, prom: ['Recruter un médecin salarié', 12], res: 'Idée forte. Reste à la financer.' },
        { l: 'Interpeller l’ARS et le député', h: 1, flag: 'ars', fx: { cred: 1 }, res: 'Lettre ouverte publiée. L’ARS « étudie le dossier ».' }],
        dflt: { flag: 'silence', fx: { img: { RET: -2 } }, res: 'Les retraités vous attendaient sur ce sujet.' } }),
      (fl) => { const ok = R() < (fl.msp ? 0.5 : fl.sal ? 0.55 : 0.3); return { from: 'L’Agence régionale de santé', body: ok ? 'Deux jeunes médecins acceptent de s’installer. Le cabinet ouvre à la rentrée.' : 'Aucun candidat. Les annonces restent sans réponse et les urgences débordent.', opts: [
        { l: ok ? 'Accueillir les médecins' : 'Relancer avec une prime d’installation', h: 1, fx: ok ? { img: { RET: 2, RUR: 1 }, noto: 0.8 } : { img: { RET: 0.6 } }, res: ok ? 'Pot d’accueil en mairie. La salle d’attente est déjà pleine.' : 'Prime votée. Il faudra attendre.' },
        { l: 'Faire le point publiquement', fx: { cred: 1 }, res: 'Transparent. Apprécié.' }], close: ok } }
    ] },
    entrepot: { t: 'L’entrepôt logistique', w: () => vil() ? 0.8 : 0.7, steps: [
      () => ({ from: 'Un groupe de logistique', body: 'Un géant de la logistique veut construire un entrepôt de 60 000 m² sur des terres agricoles : 300 emplois annoncés, 200 camions par jour.', opts: [
        { l: 'Défendre l’emploi : oui à l’entrepôt', flag: 'pour', fx: { img: { POP: 1.5, PERI: 1, RUR: -1.5, JUD: -1.5 } }, pos: ['artificialisation', 1], res: 'Les chômeurs de la vallée y croient. Les agriculteurs sortent les tracteurs.' },
        { l: 'Refuser : on ne bétonne pas les terres', flag: 'contre', fx: { img: { RUR: 1.5, JUD: 1.5, POP: -1 } }, pos: ['artificialisation', -1], prom: ['Bloquer l’entrepôt', 18], res: 'Les écologistes et les agriculteurs, pour une fois d’accord, vous saluent.' },
        { l: 'Négocier : friche industrielle plutôt que champs', h: 2, flag: 'friche', fx: { cred: 2 }, res: 'Contre-proposition sérieuse. Le groupe étudie.' }],
        dflt: { flag: 'silence', res: 'Vous ne prenez pas parti. Le débat s’envenime sans vous.' } }),
      (fl) => { const r = R(); const out = fl.friche ? (r < 0.5 ? 'friche' : 'champs') : r < 0.5 ? 'champs' : 'abandon'; return { from: 'La communauté de communes', body: out === 'friche' ? 'Le groupe accepte la friche industrielle : emplois et terres préservés.' : out === 'champs' ? 'L’intercommunalité vote le projet sur les terres agricoles.' : 'Le groupe renonce et part s’installer dans le département voisin.', opts: [
        { l: 'Prendre la parole sur la décision', h: 1, fx: { noto: 0.8, cred: (out === 'champs' && fl.contre) || (out === 'abandon' && fl.pour) ? -0.5 : 1.5 }, res: out === 'friche' ? 'Votre contre-proposition a gagné. Vrai succès.' : 'Vous dites ce que vous pensez. Chacun en tire ses conclusions.' },
        { l: 'Ne rien ajouter', res: 'Dossier clos.' }], close: out !== 'champs' || !!fl.pour } }
    ] }
  };
  function arcStart() { const f = F(); const act = f.arcs.filter(a => !a.end); if (act.length >= (local() ? 2 : 1)) return; const used = new Set(f.arcs.map(a => a.k)); const L = Object.keys(ARCS).filter(k => !used.has(k) || f.arcs.filter(a => a.k === k && a.end && dd(a.end, S().date) > 1100).length && !f.arcs.some(a => a.k === k && !a.end)); if (!L.length) return; const k = E.pick(L.filter(k => ARCS[k].w() > 0.5).length ? L.filter(k => ARCS[k].w() > 0.5) : L); const a = { id: E.uid('arc'), k, step: 0, flags: {}, data: {}, start: S().date, next: null }; f.arcs.push(a); arcItem(a); }
  function arcItem(a) { const A = ARCS[a.k]; const st = A.steps[a.step](a.flags, a.data); if (st.data) Object.assign(a.data, st.data); const it = mkItem('arc', { arc: a.id, from: st.from, t: A.t + ' · ' + (a.step + 1) + '/' + A.steps.length, body: st.body, opts: st.opts, dflt: st.dflt || { res: 'Vous laissez filer.' }, due: add(S().date, 45) }); if (st.close != null) it.close = st.close; push(it); }
  function arcStep(id, flag) { const a = F().arcs.find(x => x.id === id); if (!a) return; if (flag) { if (flag === 'flip') { a.flags.flip = 1; } else { ['pour', 'contre', 'concert', 'silence', 'mixte'].forEach(k => { if (['pour', 'contre', 'concert', 'silence', 'mixte'].includes(flag)) delete a.flags[k]; }); a.flags[flag] = 1; } }
    const A = ARCS[a.k]; const it = F().inbox.find(x => x.arc === id && x.t.endsWith((a.step + 1) + '/' + A.steps.length));
    if (a.step >= A.steps.length - 1) { a.end = S().date; a.won = it && it.close; F().prom.filter(pr => pr.ok == null && pr.date >= a.start && A.steps[0] && pr.t && it).forEach(pr => { if (pr.t && (pr.t.includes('éolien') && a.k === 'eolien' || pr.t.includes('usine') && a.k === 'usine' || pr.t.includes('classe') && a.k === 'ecole' || pr.t.includes('logements') && a.k === 'logement' || pr.t.includes('vidéo') && a.k === 'securite' || /maison de santé|médecin/.test(pr.t) && a.k === 'medecin' || pr.t.includes('entrepôt') && a.k === 'entrepot')) closeProm(pr.id, !!a.won); }); return; }
    a.step++; a.next = add(S().date, rint(45, 95)); }

  /* ---------- doléances ---------- */
  const DOL = [
    ['F', 'retraitée', 'RET', 'le trottoir devant chez elle est défoncé, elle est tombée la semaine dernière', 'le trottoir refait'],
    ['M', 'retraité', 'RET', 'attend depuis huit mois une place en EHPAD pour sa femme', 'une place en EHPAD'],
    ['F', 'mère célibataire', 'POP', 'n’a pas de place en crèche et risque de perdre son emploi', 'une place en crèche'],
    ['M', 'artisan', 'PERI', 'ne peut plus livrer : la rue est fermée pour travaux depuis trois mois', 'un accès pour ses livraisons'],
    ['F', 'infirmière', 'PERI', 'subit les nuisances d’un bar de nuit sous ses fenêtres', 'des horaires de fermeture respectés'],
    ['M', 'agriculteur', 'RUR', 'voit ses champs traversés par des quads tous les week-ends', 'des contrôles contre les quads'],
    ['F', 'étudiante', 'JUD', 'cherche un logement depuis la rentrée et dort chez des amis', 'un logement étudiant'],
    ['M', 'locataire HLM', 'POP', 'vit avec de la moisissure dans la chambre de ses enfants, le bailleur ne répond pas', 'des travaux dans son logement'],
    ['F', 'commerçante', 'PERI', 'voit ses clients fuir faute de places de stationnement', 'des places de stationnement minute'],
    ['M', 'cadre', 'CAD', 'réclame une piste cyclable sécurisée vers la gare', 'un marquage cyclable provisoire'],
    ['F', 'retraitée', 'RET', 'n’a plus de bus le samedi pour aller au marché', 'le retour du bus du samedi'],
    ['M', 'jeune chômeur', 'POP', 'cherche un stage pour terminer sa formation', 'un stage'],
    ['F', 'présidente d’association', 'RET', 'demande une salle pour son club de gym douce', 'une salle pour son club'],
    ['M', 'père de famille', 'PERI', 'signale une sortie d’école dangereuse, les voitures roulent trop vite', 'un ralentisseur devant l’école']
  ];
  function dolItem() { const f0 = F(); const pool = DOL.filter(z => !(f0.seen['dol_' + z[3]] && dd(f0.seen['dol_' + z[3]], S().date) < 360)); const d = pick(pool.length ? pool : DOL); f0.seen['dol_' + d[3]] = S().date; const g = d[0]; const who = (g === 'F' ? 'Mme ' : 'M. ') + pick(D.LAST); const what = d[3]; const ok = d[4]; const il = g === 'F' ? 'Elle' : 'Il'; const el = local() || has('depute');
    return mkItem('dol', { from: who + ', ' + d[1], t: 'Doléance : ' + what.split(',')[0], body: who + ' vous ' + (R() < 0.5 ? 'écrit' : 'interpelle au marché') + ' : ' + what + '.', opts: el ? [
      { l: 'M’en occuper personnellement', sub: '1 h · plus de chances, et on saura que c’est vous', h: 1, prom: ['Régler le problème de ' + who, 2], later: [1, 'dol', { who, what: ok, g, seg: d[2], p: 0.75, big: 1 }], res: 'Vous avez pris le dossier en main. Réponse dans quelques semaines.' },
      { l: 'Confier à votre équipe ou aux services', sub: 'Sans heure, résultat moins sûr', later: [1, 'dol', { who, what: ok, g, seg: d[2], p: 0.5 }], res: 'Dossier transmis. On verra.' },
      { l: 'Répondre que ce n’est pas de votre ressort', fx: { img: { [d[2]]: -0.3 } }, res: 'Réponse honnête, mais froide.' }] : [
      { l: 'Relayer auprès de la mairie et le faire savoir', sub: '1 h · vous n’avez pas le pouvoir, mais de la voix', h: 1, later: [1, 'dol', { who, what: ok, g, seg: d[2], p: 0.4 }], fx: { noto: 0.3, rrel: -2 }, res: 'Vous avez écrit au maire et publié le courrier. Ça bouscule.' },
      { l: 'L’aider à monter son dossier', sub: '2 h · utile, discret', h: 2, later: [1, 'dol', { who, what: ok, g, seg: d[2], p: 0.6, big: 1 }], res: 'Une soirée sur les formulaires. Ça compte.' },
      { l: 'L’orienter vers le bon service', fx: { img: { [d[2]]: 0.2 } }, res: 'Conseil donné. Pas plus.' }],
      dflt: { fx: { img: { [d[2]]: -0.6 } }, res: who + ' n’a jamais eu de réponse. ' + il + ' le raconte à qui veut l’entendre.' } }); }

  /* ---------- rendez-vous imposés ---------- */
  function rdvItem() { const mo = +S().date.slice(5, 7); const p = P(); const L = [];
    if (mo === 1) L.push(['Cérémonie des vœux du maire', 'Toute la commune y sera. Les élus et candidats aussi.', { RET: 1, CAD: 0.6 }]);
    if (mo === 5) L.push(['Commémoration du 8 Mai', 'Dépôt de gerbe au monument aux morts, avec les anciens combattants.', { RET: 1.5 }]);
    if (mo === 11) L.push(['Commémoration du 11 Novembre', 'Lecture des noms au monument aux morts, puis vin d’honneur.', { RET: 1.5, RUR: 0.5 }]);
    if (mo === 7) L.push(['Bal du 14 Juillet', 'Feu d’artifice et buvette des pompiers.', { POP: 1, PERI: 1 }]);
    if (mo === 9) L.push(['Forum des associations', 'Tous les clubs tiennent un stand au gymnase.', { PERI: 1, RET: 0.6, JUD: 0.6 }]);
    if (mo === 6) L.push(['Kermesse de l’école', 'Les parents tiennent les stands. On compte sur vous à la tombola.', { PERI: 1.5 }]);
    L.push(['Assemblée générale ' + pick(['de l’association des commerçants', 'de la société de chasse', 'de l’amicale des donneurs de sang', 'du club de foot', 'du comité des fêtes', 'des Restos du cœur', 'de l’association de parents d’élèves', 'du club des aînés']), 'Rapport moral, rapport financier, verre de l’amitié.', { RET: 0.8, PERI: 0.6 }]);
    if (p.party !== 'NEW' && !vil()) L.push(['Réunion de section du parti', 'Ordre du jour : la désignation des candidats. Les absents ont toujours tort.', null, true]);
    if (!vil()) L.push(['Conseil de quartier ' + pick(['des Écoles', 'de la Gare', 'du Centre']), 'Une trentaine d’habitants, et beaucoup de questions sur la propreté.', { POP: 0.8, PERI: 0.6 }]);
    const f = F(); const fr = L.filter(z => !(f.seen['rdv_' + z[0]] && dd(f.seen['rdv_' + z[0]], S().date) < 160)); const r = pick(fr.length ? fr : L); f.seen['rdv_' + r[0]] = S().date; const date = add(S().date, rint(5, 20));
    return mkItem('rdv', { from: 'Agenda', t: r[0] + ' · ' + E.fmtDate(date), body: r[1], due: date, opts: [
      { l: 'Y aller et prendre la parole', sub: '3 h', h: 3, fx: r[3] ? { std: 2.5 } : { img: r[2], noto: 0.6 }, res: r[3] ? 'Intervention remarquée. On vous compte parmi ceux qui pèsent.' : 'Présent·e, souriant·e, trois mots justes. On vous a vu·e.' },
      { l: 'Passer en coup de vent', sub: '1 h', h: 1, fx: r[3] ? { std: 0.8 } : { noto: 0.2 }, res: 'Une poignée de main, et vous filez. Le minimum.' },
      { l: 'Ne pas y aller', fx: r[3] ? { std: -1 } : { noto: -0.2 }, res: 'Absent·e. Ça se remarque toujours un peu.' }],
      dflt: { fx: r[3] ? { std: -1 } : { noto: -0.2 }, res: 'Vous n’y étiez pas.' } }); }

  /* ---------- votes publics ---------- */
  const DELIB = [
    ['Hausse des tarifs de la cantine de 8 %', { POP: -2, PERI: -1.2, CAD: 0.3 }, 'eco'],
    ['Installation de 20 caméras de vidéoprotection', { RET: 1.5, PERI: 1, JUD: -1.5 }, 'securite'],
    ['Passage de l’éclairage public à l’extinction nocturne', { JUD: 1, CAD: 0.6, RET: -1 }, 'ecologie'],
    ['Vente d’un terrain communal à un promoteur', { CAD: 0.6, RUR: -1, JUD: -0.8 }, 'logement'],
    ['Hausse des indemnités des élus', { POP: -1.5, RET: -1, PERI: -1 }, 'inst'],
    ['Subvention exceptionnelle au club de foot', { PERI: 0.8, POP: 0.8, CAD: -0.4 }, 'social'],
    ['Création d’une police municipale', { RET: 1.5, PERI: 1, JUD: -1 }, 'securite'],
    ['Zone à faibles émissions dans le centre', { JUD: 1.5, CAD: 1, PERI: -1.5, POP: -1 }, 'ecologie'],
    ['Gratuité des transports scolaires', { PERI: 1.5, POP: 1, CAD: -0.3 }, 'social'],
    ['Fermeture de la piscine municipale l’hiver', { POP: -1, PERI: -1, RET: -0.6 }, 'eco']];
  function voteItem() { const d = pick(DELIB); const maj = majority(); const assembly = has('cd') ? 'Conseil départemental' : has('cr') ? 'Conseil régional' : 'Conseil municipal'; const v = d[1]; const conv = (() => { const ideal = { POP: 1, PERI: 1, RET: 1, CAD: 1, JUD: 1, RUR: 1 }; let s2 = 0; const ax = P().ax || [0, 0, 0, 0, 0, 0]; const sg = D.SEGS; Object.keys(v).forEach(k => { const seg = sg.find(x => x.id === k); if (!seg) return; let a = 0; for (let i = 0; i < 6; i++) a += (ax[i] || 0) * seg.ideal[i]; s2 += v[k] * Math.sign(a); }); return s2 >= 0 ? 'pour' : 'contre'; })();
    const line = maj ? 'pour' : 'contre'; const opp = o => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x * o]));
    const mk = (l, sign, extra, res) => ({ l, fx: Object.assign({ img: opp(sign * 0.8) }, extra), res });
    return mkItem('vote', { vote: d[0], from: assembly, t: 'Vote : ' + d[0], body: assembly + ' de jeudi. Délibération : « ' + d[0] + ' ». ' + (maj ? 'La majorité, dont vous êtes, porte le texte.' : 'Votre groupe d’opposition votera contre.') + ' Votre conviction vous porterait plutôt à voter ' + conv + '. Le vote est public et nominatif.', opts: [
      mk('Voter ' + line + ' avec ' + (maj ? 'la majorité' : 'votre groupe'), line === 'pour' ? 1 : -1, { coh: maj ? 1 : 0, std: 0.5 }, 'Vote discipliné. Personne ne vous le reprochera dans votre camp.'),
      mk('Voter ' + (line === 'pour' ? 'contre' : 'pour') + ', en conscience', line === 'pour' ? -1 : 1, { coh: maj ? -4 : 0, std: -1.5, cred: conv !== line ? 1.5 : -0.5, noto: 0.6 }, maj ? 'Vote dissident : le maire vous en veut, la presse vous trouve indépendant·e.' : 'Vous votez avec la majorité. Votre groupe est furieux, le journal intrigué.'),
      mk('M’abstenir', 0, { coh: maj ? -1 : 0, cred: -0.3 }, 'Abstention. Ni chaud ni froid.')],
      dflt: { fx: { cred: -0.5 }, res: 'Vous étiez absent·e au moment du vote.' } }); }

  /* ---------- polémiques express ---------- */
  const POLEM = [
    ['Un ministre veut interdire les manifestations devant les mairies après des violences', 'ordre', { RET: 1.5, PERI: 0.8, JUD: -1.5, POP: -0.4 }, ['D', 'ED', 'C']],
    ['Un rapport révèle que l’eau du robinet de la vallée contient des polluants éternels', 'eau', { JUD: 1, CAD: 1, RET: 1, PERI: 1, POP: 1, RUR: 0.6 }, ['G', 'GE', 'C', 'D', 'ED', 'DIV'], 1],
    ['Un élu de votre bord est mis en examen pour détournement de fonds', 'probite', { JUD: 1, CAD: 1, RET: 1, PERI: 1, POP: 1, RUR: 1 }, [], 2],
    ['Le gouvernement annonce la fermeture de 40 petites gares de campagne', 'services', { RUR: -2, RET: -1.5, PERI: -1, CAD: 0.3 }, ['C']],
    ['Une enseignante est menacée de mort pour un cours sur la laïcité', 'laicite', { RET: 1, CAD: 1, PERI: 1, JUD: 0.6, POP: 0.6, RUR: 1 }, ['G', 'GE', 'C', 'D', 'ED', 'DIV'], 1],
    ['Une militante écologiste bloque l’autoroute avec 200 personnes', 'ecologie', { JUD: 1.2, CAD: -0.4, PERI: -1.5, RET: -1.2, RUR: -1 }, ['GE']],
    ['Le prix de l’électricité augmente de 10 % au 1er février', 'pouvoir', { POP: -2, PERI: -1.5, RET: -1.2, RUR: -1 }, ['C']],
    ['Un hébergement d’urgence pour migrants doit ouvrir dans le département', 'immigration', { JUD: 1.2, CAD: 0.4, RET: -1.5, PERI: -1.2, POP: -0.8 }, ['G', 'GE', 'C']],
    ['Une grande surface veut ouvrir le dimanche toute l’année', 'travail', { CAD: 1, JUD: 0.6, POP: -0.6, RET: -0.6 }, ['C', 'D']],
    ['Les agriculteurs déversent du fumier devant la préfecture', 'agri', { RUR: 2, RET: 0.6, JUD: -0.8, CAD: -0.4 }, ['D', 'ED']]];
  function polemItem() { const p = P(); const x = pick(POLEM.filter(z => !F().seen['pol_' + z[1]] || dd(F().seen['pol_' + z[1]], S().date) > 300)); if (!x) return null; F().seen['pol_' + x[1]] = S().date; const v = x[2]; const line = x[3].includes(bloc()); const j = journo();
    const opp = s => Object.fromEntries(Object.entries(v).map(([k, y]) => [k, y * s]));
    const cons = x[4] === 1; const self = x[4] === 2;
    const opts = cons ? [
      { l: 'Réagir vite et fort', fx: { all: 0.8, noto: 0.8 }, res: 'Votre réaction est reprise dans la matinale de ' + (j ? j.name : 'Radio Isère') + '.' },
      { l: 'Proposer une action locale concrète', h: 2, fx: { all: 1.2, cred: 1.5 }, res: 'Vous passez de la réaction à l’action. C’est ce qu’on retient.' },
      { l: 'Ne rien dire', fx: { noto: -0.3 }, res: 'Silence. On a remarqué que tout le monde avait réagi, sauf vous.' }] : self ? [
      { l: 'Condamner clairement, même dans votre camp', fx: { cred: 2.5, std: -2, all: 0.5 }, pos: ['probite', 1], res: 'Vous ne protégez pas les vôtres. Ça vous vaut du respect, et des ennemis au parti.' },
      { l: 'Rappeler la présomption d’innocence', fx: { std: 1, cred: -1 }, res: 'Juridiquement correct, politiquement tiède.' },
      { l: 'Se taire', fx: { cred: -0.8 }, res: 'Votre silence est commenté.' }] : [
      { l: line ? 'Soutenir, comme votre parti' : 'Soutenir, contre la ligne du parti', fx: { img: opp(1), noto: 0.6, std: line ? 1 : -2.5 }, pos: [x[1], 1], res: line ? 'Ligne du parti tenue. Les électeurs concernés ont entendu.' : 'Vous vous démarquez de votre parti. Remarqué.' },
      { l: line ? 'Condamner, contre la ligne du parti' : 'Condamner, comme votre parti', fx: { img: opp(-1), noto: 0.6, std: line ? -2.5 : 1 }, pos: [x[1], -1], res: line ? 'Vous désavouez votre camp. On en parle à la fédération.' : 'Ligne tenue. Clair et net.' },
      { l: 'Nuancer : « c’est plus compliqué »', fx: { img: opp(0.3), cred: 0.8 }, res: 'Position équilibrée. Moins de bruit, plus de crédit.' },
      { l: 'Ne rien dire', res: 'Vous laissez passer l’orage.' }];
    return mkItem('polem', { urgent: 1, from: (j ? j.name : 'Un journaliste') + ' veut votre réaction', t: 'Polémique : ' + x[0], body: x[0] + '. ' + (j ? j.name + ' vous appelle' : 'On vous appelle') + ' : ' + (j && j.g === 'F' ? 'elle' : 'il') + ' boucle dans deux heures.' + (!cons && !self ? ' Votre parti ' + (line ? 'soutient' : 'condamne') + '.' : ''), opts, dflt: { res: 'Vous n’avez pas répondu à temps.' } }); }

  /* ---------- crises locales ---------- */
  const CRISE = [['la crue de la rivière', 'La rivière déborde cette nuit : quarante maisons inondées, une école fermée.'], ['l’incendie de l’entrepôt', 'Un incendie ravage un entrepôt en zone industrielle : panache de fumée, confinement décrété.'], ['l’agression du centre-ville', 'Un adolescent est grièvement blessé au couteau près de la gare. La ville est sous le choc.'], ['la coupure d’eau', 'Une pollution du captage prive 3 000 foyers d’eau potable pour plusieurs jours.'], ['le glissement de terrain', 'Un glissement de terrain coupe la route du hameau : douze familles isolées.']];
  function criseItem() { const c = pick(CRISE); const m = mayor(); return mkItem('crise', { urgent: 1, from: m ? 'Votre directeur·rice de cabinet' : 'La préfecture communique', t: 'Crise : ' + c[0], body: c[1] + (m ? ' Le préfet attend vos décisions dans l’heure.' : ' Tout le monde attend de voir qui sera là.'), opts: m ? [
      { l: 'Ouvrir la cellule de crise et aller sur place', h: 4, fx: { all: 2, noto: 1.5, cred: 1.5 }, later: [2, 'crise', { what: c[0] }], res: 'Bottes, gilet, téléphone : vous êtes au front. La gestion est saluée.' },
      { l: 'Piloter depuis la mairie et communiquer', h: 1, fx: { all: 0.6, cred: 0.6 }, later: [2, 'crise', { what: c[0] }], res: 'Efficace, mais on ne vous a pas vu·e sur le terrain.' },
      { l: 'Laisser la préfecture gérer', fx: { all: -2, cred: -2, art: ['dauph', '« Où était le maire ? »', -0.6] }, res: 'On vous reproche votre absence. « Où était le maire ? », titre le Dauphinois.' }] : [
      { l: 'Aller aider les bénévoles', h: 3, fx: { all: 1.2, noto: 1 }, res: 'Vous avez porté des sacs de sable et servi des cafés. Les gens s’en souviennent.' },
      { l: 'Publier un message de soutien', fx: { noto: 0.3 }, res: 'Message relayé. Utile, sans plus.' },
      { l: 'Critiquer la gestion de la crise', fx: { noto: 0.8, all: -0.8, cred: -1, rrel: -5 }, res: 'Accusé·e de récupération politique en pleine crise. Mauvais calcul.' }],
      dflt: { fx: { all: -1 }, res: 'Pas un mot, pas une présence. Les habitants l’ont noté.' } }); }

  /* ---------- notables, dettes et services ---------- */
  const SERV = [['le patron de l’imprimerie', 'imprimer vos tracts à prix coûtant', { cash: 1500 }], ['le président du club de foot', 'vous laisser parler à la mi-temps devant 800 personnes', { noto: 1.2 }], ['un entrepreneur du BTP', 'vous prêter une salle et un buffet pour votre réunion', { noto: 0.8, cash: 800 }], ['la présidente de l’amicale des retraités', 'vous présenter à tout son réseau', { img: { RET: 2 } }], ['le curé de la paroisse', 'vous inviter à la fête paroissiale', { img: { RET: 1.2, RUR: 0.6 } }]];
  const ASKS = [['une place en crèche pour sa petite-fille, avant tout le monde', 'Favoritisme : un élu ne peut pas privilégier un proche dans une attribution'], ['un coup de pouce pour un permis de construire', 'Prise illégale d’intérêts ou trafic d’influence selon les cas : jusqu’à 5 ans de prison'], ['un emploi saisonnier pour son fils à la mairie', 'Favoritisme dans un recrutement public'], ['votre soutien public à sa liste au conseil des prud’hommes', null], ['une subvention pour son association', null]];
  function servItem() { const f0 = F(); const pool = SERV.filter(z => !(f0.seen['srv_' + z[0]] && dd(f0.seen['srv_' + z[0]], S().date) < 400)); const s0 = pick(pool.length ? pool : SERV); f0.seen['srv_' + s0[0]] = S().date; const g = R() < 0.5 ? 'F' : 'M'; const who = nm(g) + ', ' + s0[0]; return mkItem('serv', { from: who, t: 'Un service proposé', body: who.split(',')[0] + ' propose de ' + s0[1] + '. « Entre gens de bonne compagnie, on s’entraide. »', opts: [
      { l: 'Accepter avec plaisir', fx: s0[2], debt: [who, s0[1]], res: 'Service rendu. Vous savez qu’un jour, on viendra vous le rappeler.' },
      { l: 'Décliner poliment', fx: { cred: 0.5 }, res: 'Vous ne voulez rien devoir à personne. Prudent.' }], dflt: { res: 'L’offre est retirée.' } }); }
  function claimItem(d) { const a = pick(ASKS); return mkItem('claim', { debt: d.id, from: d.who, t: 'On vous rappelle un service', body: 'Il y a quelques mois, ' + d.who.split(',')[0] + ' a accepté de ' + d.why + '. Aujourd’hui, il ou elle demande ' + a[0] + '.', opts: [
      { l: 'Rendre le service', paid: 1, ill: a[1] || undefined, fx: a[1] ? { cas: ['favoritisme', a[0], 2, 0.06] } : { cred: -0.5 }, res: 'Service rendu. Vous êtes quittes.' + (a[1] ? ' Pourvu que ça ne se sache pas.' : '') },
      { l: 'Refuser, en expliquant pourquoi', fx: { cred: 1 }, res: 'Refus net. ' + d.who.split(',')[0] + ' est vexé·e et le fera savoir.' },
      { l: 'Proposer autre chose de légal', h: 1, paid: 1, fx: { cred: 0.5 }, res: 'Un rendez-vous, un conseil, une mise en relation : vous vous en tirez avec élégance.' }], dflt: { res: 'Pas de réponse : c’est un refus.' } }); }

  /* ---------- journaliste récurrent ---------- */
  function portraitItem() { const j = journo(); if (!j) return null; return mkItem('portrait', { from: j.name + ', Le Dauphinois', t: 'Demande de portrait', body: j.name + ' prépare un portrait de vous pour l’édition du week-end. Relation actuelle : ' + (j.rel > 20 ? 'cordiale' : j.rel < -10 ? 'tendue' : 'neutre') + '.', opts: [
      { l: 'Accepter un long entretien', h: 2, r: [{ p: 0.45 + (j.rel || 0) / 200 + P().cred / 400, res: 'Portrait flatteur : « Un·e élu·e qui bosse ». Il circule beaucoup.', fx: { noto: 2, all: 0.8, jrel: 6 } }, { res: 'Portrait piquant : quelques phrases sorties de leur contexte. Ça pique.', fx: { noto: 1.5, all: -0.5, jrel: 2 } }] },
      { l: 'Envoyer des éléments écrits', fx: { noto: 0.6, jrel: -1 }, res: 'Portrait correct mais froid. ' + j.name + ' aurait préféré vous voir.' },
      { l: 'Refuser', fx: { jrel: -6 }, res: j.name + ' le fera quand même. Sans vous.' }], dflt: { fx: { jrel: -3 }, res: 'Portrait publié sans votre version.' } }); }

  /* ---------- équipe ambitieuse ---------- */
  function staffItem() { const p = P(); const x = (p.staff || []).filter(y => (y.amb || 50) >= 55 && !(y.askedAt && dd(y.askedAt, S().date) < 240)).sort((a, b) => (b.amb || 0) - (a.amb || 0))[0]; if (!x) return null; x.askedAt = S().date; const want = pick(['une augmentation de 300 € par mois', 'le titre de directeur·rice adjoint·e', 'une place éligible sur votre prochaine liste', 'votre soutien pour se présenter au conseil départemental']); const fem = x.g === 'F';
    return mkItem('staff', { from: x.name, t: 'Votre équipe : ' + x.name + ' veut plus', body: x.name + ' (ambition ' + Math.round(x.amb || 50) + ', loyauté ' + Math.round(x.loy) + ') vous demande ' + want + '. « J’ai fait mes preuves. »', opts: [
      { l: 'Accorder', staff: { id: x.id, k: 'oui' }, fx: want.includes('augmentation') ? { cash: -1800 } : {}, res: (fem ? 'Elle' : 'Il') + ' est ravi' + (fem ? 'e' : '') + ' et motivé' + (fem ? 'e' : '') + '.' },
      { l: 'Promettre pour plus tard', staff: { id: x.id, k: 'plus' }, prom: ['Tenir parole envers ' + x.name, 8], res: 'Promesse faite. ' + (fem ? 'Elle' : 'Il') + ' la notera.' },
      { l: 'Refuser', staff: { id: x.id, k: 'non' }, res: 'Refus. ' + (fem ? 'Elle' : 'Il') + ' encaisse, la mâchoire serrée.' }], dflt: { res: 'Pas de réponse. Ça vexe.' } }); }
  function staffRes(o, it) { const p = P(); const x = (p.staff || []).find(y => y.id === o.id); if (!x) return; if (o.k === 'oui') { x.loy = clamp(x.loy + 10, 0, 100); x.amb = Math.max(30, (x.amb || 50) - 10); }
    else if (o.k === 'plus') { x.loy = clamp(x.loy - 2, 0, 100); }
    else { x.loy = clamp(x.loy - 14, 0, 100); if (x.loy < 40 && R() < 0.6) { p.staff = p.staff.filter(y => y.id !== x.id); F().echo.unshift({ date: S().date, t: x.name + ' a démissionné.' }); if (R() < 0.5) later(rint(1, 4), 'fuite', { who: x.name }); } } }

  /* ---------- stratégie du rival ---------- */
  const PLANS = { offensif: { l: 'passer à l’attaque contre vous', w: { attaque: 2.2, rumeur: 1.8, critique: 2, meeting: 0.7 } }, terrain: { l: 'labourer le terrain, quartier par quartier', w: { meeting: 2.2, programme: 1.2, attaque: 0.5 } }, notable: { l: 'rallier les notables et soigner son programme', w: { programme: 2, alliance: 1.6, attaque: 0.6 } }, rassembleur: { l: 'chercher des alliances pour vous isoler', w: { alliance: 2.4, programme: 1.3, attaque: 0.8 } } };
  function planTick() { const x = rival(); if (!x) return; const f = F(); const t = x.traits || {}; const es = S().est; const behind = es && es.rank === 1; const cur = f.rplan && f.rplan.id === x.id ? f.rplan.plan : null;
    let plan = cur; if (!cur || (R() < 0.1 && dd(f.rplan.since, S().date) > 150)) plan = (t.rancune || 50) + (t.ambition || 50) > 130 ? 'offensif' : (t.charisme || 50) > 60 ? 'terrain' : R() < 0.5 ? 'notable' : 'rassembleur'; if (behind && cur !== 'offensif' && R() < 0.3) plan = 'offensif'; if ((x.rel || 0) < -30) plan = 'offensif';
    if (plan !== cur) { f.rplan = { id: x.id, plan, since: S().date }; F().echo.unshift({ date: S().date, t: 'Ce qui se dit : ' + x.name + ' a décidé de ' + PLANS[plan].l + '.' }); } }
  function biasRival(x, opts) { const f = F(); if (!f.rplan || f.rplan.id !== x.id) return; const w = PLANS[f.rplan.plan].w; opts.forEach(o => { if (w[o[0]]) o[1] = o[1] * w[o[0]]; }); }
  function planOf() { const f = F(); const x = rival(); if (!x || !f.rplan || f.rplan.id !== x.id) return null; const j = journo(); const sure = (x.spied && dd(x.spied, S().date) < 120) || (j && j.rel > 25); return { name: x.name, l: PLANS[f.rplan.plan].l, sure }; }

  /* ---------- tour ---------- */
  function tick(days) {
    if (!days || days < 1) return; const s = S(), p = s.p, f = F(); const k = Math.min(1.5, days / 30);
    // 1. échéances
    f.inbox.filter(x => x.done == null && x.due <= s.date).forEach(expire);
    f.later.filter(x => x.at <= s.date).forEach(x => { try { (LATER[x.k] || (() => 0))(x.d); } catch (e) { console.error(e); } }); f.later = f.later.filter(x => x.at > s.date);
    f.prom.filter(pr => pr.ok == null && pr.due <= s.date).forEach(pr => closeProm(pr.id, false));
    f.arcs.filter(a => !a.end && a.next && a.next <= s.date).forEach(a => { a.next = null; arcItem(a); });
    f.inbox = f.inbox.filter(x => x.done == null || dd(x.when || x.date, s.date) < 120).slice(0, 40);
    if (s.turn < 2) return;
    // 2. nouveaux sujets, sans dépasser quatre en attente
    let room = Math.max(0, 4 - pending().length); const tryAdd = (cond, mk) => { if (room <= 0 || !cond) return; const it = mk(); if (it) { push(it); room--; } };
    if (R() < 0.05 * k && (elu() || p.cand)) { const it = criseItem(); push(it); }
    tryAdd(R() < 0.25 * k && known() > 5, polemItem);
    if (!f.arcs.some(a => !a.end) || R() < 0.25 * k) tryAdd(R() < 0.45 * k && s.turn >= 2, () => { arcStart(); return null; });
    tryAdd((local() || has('depute') || p.cand) ? R() < 0.5 * k : known() > 6 && R() < 0.3 * k, dolItem);
    tryAdd((local() || has('depute')) && R() < 0.12 * k, dolItem);
    tryAdd(R() < 0.4 * k && !(mayor() && typeof OF !== 'undefined'), rdvItem);
    tryAdd(local() && !mayor() && R() < 0.45 * k, voteItem);
    const due = f.debts.find(d => !d.asked && dd(d.date, s.date) > 60); if (due && R() < 0.35 * k) tryAdd(true, () => { due.asked = true; return claimItem(due); });
    tryAdd(R() < (p.cand || elu() ? 0.1 : 0.07) * k, servItem);
    tryAdd(R() < 0.07 * k && known() > 18, portraitItem);
    tryAdd(R() < 0.12 * k && (p.staff || []).length, staffItem);
    planTick();
  }
  return { tick, decide, pending, later, owe, promise, closeProm, biasRival, planOf, F, optOk, ARCS, journo, echo };
})();
if (typeof window !== 'undefined') window.FL = FL;
