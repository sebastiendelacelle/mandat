/* MANDAT — couche IA (Claude via la capacité « sample »), avec repli scripté */
window.A = (function () {
  let sample = null; let state = 'pending'; // pending | on | off
  const listeners = [];
  function init() {
    try {
      const c = window.claude; if (!c || !c.use) { state = 'off'; notify(); return; }
      c.use('sample').then(s => { sample = s; state = s ? 'on' : 'off'; notify(); }).catch(() => { state = 'off'; notify(); });
    } catch (e) { state = 'off'; notify(); }
  }
  function notify() { listeners.forEach(f => { try { f(state); } catch (e) { } }); }
  const onState = f => { listeners.push(f); f(state); };
  const S = () => G.S, P = () => G.S.p;

  const SEG_TXT = D.SEGS.map(s => s.id + ' = ' + s.name).join(' ; ');
  const RULES = 'Règles : réponds en français, uniquement par un objet JSON valide, sans texte autour. Monde réaliste et sombre de la politique française actuelle (Isère et national). Les partis sont réels mais toutes les personnalités sont fictives : ne cite et n’invente jamais de propos de personnalités réelles. Évalue de façon neutre : la réaction de chaque segment d’électorat dépend de ses préférences, pas de ton opinion. Segments : ' + SEG_TXT + '. Axes (−100..100) : eco (−redistribution / +marché), soc (−progressiste / +conservateur), aut (−libertés / +autorité), souv (−intégration européenne / +souveraineté), ecol (−priorité climat / +priorité croissance), inst (−institutionnel / +anti-système). Thèmes possibles : ' + Object.keys(D.THEMES).join(', ') + '.';

  function ctx() {
    const s = S(), p = P(); const ph = E.phase(); const com = E.commune();
    const party = p.party === 'NEW' ? 'mouvement « ' + p.movement + ' »' : D.PARTIES[p.party].name;
    const ax = D.AXES.map((a, i) => a.id + ' ' + Math.round(p.ax[i])).join(', ');
    const sal = Object.entries(s.national.salience).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => D.THEMES[t].l).join(', ') || 'aucun';
    return `Date : ${E.fmtDate(s.date)}. Personnage : ${p.name}, ${p.age} ans, ${D.METIERS.find(m => m.id === p.metier).label}, ${party}, ${p.rank}, basé·e à ${com.name} (${D.CIRCOS[p.circo - 1].name} de l’Isère). Mandats : ${p.mandats.map(m => m.label).join(', ') || 'aucun'}. Positions : ${ax}. Phase : ${ph.label}. Mesures phares : ${p.prog.filter(m => m.phare && m.status !== 'retiree').map(m => '« ' + m.resume + ' » (' + (m.level === 'local' ? 'locale' : 'nationale') + (m.cout ? ', ' + E.eur(m.cout) + '/an' : '') + ')').join(' ; ') || 'aucune'}. Président·e : ${s.national.president ? s.national.president.name + ' (' + (D.PARTIES[s.national.president.party]?.short || '') + ')' : 'sortant, fin de second mandat'}. Thèmes chauds : ${sal}. Popularité de l’exécutif : ${Math.round(s.national.approval ?? 30)} %. Actualité nationale récente : ${(s.recentEv || []).slice(0, 3).map(e => '« ' + e.t + ' »').join(', ') || 'calme'}.`;
  }
  async function ask(prompt, tier) {
    if (!sample) throw new Error('off');
    const input = RULES + '\n\n' + ctx() + '\n\n' + prompt;
    const opts = { modelTier: tier || 'default' };
    let v;
    if (typeof sample.json === 'function') v = await sample.json(input, opts);
    else { const r = await sample(input, opts); v = parseJSON(r.text); }
    if (typeof v === 'string') v = parseJSON(v);
    if (!v || typeof v !== 'object') throw new Error('bad json');
    return v;
  }
  function parseJSON(t) { if (!t) return null; const m = String(t).match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch (e) { return null; } }
  async function withFallback(fn, fb) { if (state !== 'on') return Object.assign(fb(), { _fallback: true }); try { return await fn(); } catch (e) { if (e && e.code === 'not_granted') { state = 'off'; notify(); } return Object.assign(fb(), { _fallback: true }); } }

  /* ---------- heuristiques de repli ---------- */
  function themeOf(text) { const t = (text || '').toLowerCase(); for (const [th, kws] of D.KEYWORDS) if (kws.some(k => t.includes(k))) return th; return 'institutions'; }
  function axesGuess(text, theme) {
    const t = text.toLowerCase(); const ax = {}; const th = D.THEMES[theme] || D.THEMES.institutions; let sign = 0;
    const plus = ['baisser les impôts', 'libérer', 'fermeté', 'contrôle', 'expulser', 'police', 'autorité', 'nucléaire', 'frontière', 'souveraineté', 'tradition', 'mérite', 'travail'];
    const minus = ['gratuit', 'service public', 'solidarité', 'climat', 'vélo', 'accueil', 'égalité', 'redistribu', 'taxer les riches', 'écolog', 'transition', 'droits'];
    plus.forEach(k => { if (t.includes(k)) sign += 1; }); minus.forEach(k => { if (t.includes(k)) sign -= 1; });
    const base = sign === 0 ? P().ax : null;
    for (const a in th.ax) ax[a] = base ? Math.round(base[E.AXI[a]] * 0.6) : Math.round(E.clamp(sign * 30, -60, 60) * Math.sign(th.ax[a] || 1));
    return ax;
  }
  const RUDE = ['connard', 'crétin', 'débile', 'traître', 'pourri', 'racaille', 'salaud', 'nul', 'honte'];

  /* ---------- évaluations ---------- */
  function post(text) {
    return withFallback(() => ask(`Le personnage publie sur X : « ${text} ». Évalue ce message. JSON : {"theme": thème, "axes": {axe: valeur pour les axes concernés}, "ton": "court mot", "portee": 0-100 (potentiel de diffusion), "risque": 0-100 (risque de bad buzz), "mensonge": true si une affirmation factuelle est fausse ou trompeuse, "resume": "une phrase"}`, 'quick'),
      () => { const th = themeOf(text); const rude = RUDE.some(k => text.toLowerCase().includes(k)); return { theme: th, axes: axesGuess(text, th), portee: E.clamp(30 + text.length / 6 + (text.includes('!') ? 10 : 0), 10, 80), risque: rude ? 75 : 15, mensonge: false, resume: '' }; });
  }
  function measure(text, level) {
    const scope = P().mairie ? 'maire de ' + E.commune().name : X.curType() ? 'candidat·e aux ' + E.TYPE_LABEL[X.curType()] : 'militant·e';
    const com = E.commune();
    return withFallback(() => ask(`Le personnage (${scope}) propose cette mesure ${level === 'national' ? 'NATIONALE (relevant de l’État : chiffre le coût en euros par an pour le budget de l’État)' : 'LOCALE (commune ou département)'} : « ${text} ». Contexte budgétaire local : ${com.name} compte ${com.pop} habitants, budget de fonctionnement d’environ ${E.eur(com.pop * 1350)}. Analyse comme un service de contre-expertise : coût annuel réaliste en euros, compétence réelle de l’échelon visé (commune, département, État), crédibilité, segments gagnants et perdants. JSON : {"theme": thème, "axes": {axe: valeur}, "cout_annuel_eur": nombre, "competence": "oui"|"partielle"|"non", "credibilite": 0-100, "gagnants": [ids de segments], "perdants": [ids de segments], "resume": "reformulation en 12 mots max", "critique": "la principale objection d’un contradicteur, une phrase"}`, 'default'),
      () => { const th = themeOf(text); return { theme: th, axes: axesGuess(text, th), cout_annuel_eur: 0, competence: 'oui', credibilite: E.clamp(40 + text.length / 10, 35, 65), gagnants: [], perdants: [], resume: text.slice(0, 80), critique: 'Mesure non chiffrée : vos adversaires parlent de promesse en l’air.' }; });
  }
  function speech(text) {
    return withFallback(() => ask(`Le personnage prononce ce discours en meeting : « ${text} ». Évalue la force oratoire, la cohérence et l’effet sur chaque segment. JSON : {"score": 0-100, "theme": thème principal, "axes": {axe: valeur}, "segments": {id: -10..10}, "punchline": "la meilleure phrase reprise par les médias, ou null", "mensonge": true/false, "commentaire": "une phrase de commentateur politique"}`, 'default'),
      () => { const th = themeOf(text); const sc = E.clamp(35 + Math.min(40, text.length / 25) + E.rint(-8, 8), 20, 85); return { score: sc, theme: th, axes: axesGuess(text, th), segments: {}, punchline: text.split(/[.!?]/).filter(x => x.trim().length > 20)[0]?.trim() || null, mensonge: false, commentaire: sc > 60 ? 'Une salle chauffée à blanc.' : 'Un discours correct mais sans relief.' }; });
  }
  function tribune(text) {
    return withFallback(() => ask(`Le personnage publie une tribune : « ${text} ». JSON : {"score": 0-100 (qualité argumentative), "titre": "titre de presse de la tribune, 10 mots max", "theme": thème, "axes": {axe: valeur}, "mensonge": true/false}`, 'quick'),
      () => { const th = themeOf(text); return { score: E.clamp(40 + text.length / 20, 30, 80), titre: null, theme: th, axes: axesGuess(text, th), mensonge: false }; });
  }
  function qag(text) {
    return withFallback(() => ask(`Le personnage, député·e, pose une question au gouvernement : « ${text} ». JSON : {"score": 0-100 (impact politique et médiatique), "theme": thème, "axes": {axe: valeur}, "punchline": "phrase la plus reprise ou null", "reponse_ministre": "réponse du ministre (fictif), deux phrases"}`, 'quick'),
      () => { const th = themeOf(text); return { score: E.clamp(40 + text.length / 15, 30, 80), theme: th, axes: axesGuess(text, th), punchline: null, reponse_ministre: 'Le ministre renvoie à la réforme en cours et promet une réponse écrite.' }; });
  }

  /* ---------- débats et interviews ---------- */
  const QBANK = {
    securite: ['L’insécurité progresse dans les quartiers comme dans les bourgs. Que proposez-vous concrètement ?'],
    pouvoir_achat: ['Les prix ont flambé, les salaires stagnent. Quelle est votre première mesure pour le pouvoir d’achat ?'],
    ecologie: ['Sécheresses, crues, stations sans neige : l’Isère est en première ligne. Que faites-vous ?'],
    immigration: ['L’immigration divise. Quelle est votre position, sans langue de bois ?'],
    sante: ['Des urgences ferment la nuit, les déserts médicaux s’étendent. Votre solution ?'],
    logement: ['Se loger devient impossible pour les jeunes actifs. Que proposez-vous ?'],
    economie: ['Des usines ferment dans le Nord-Isère. Comment protégez-vous l’emploi ?'],
    fiscalite: ['Faut-il augmenter ou baisser les impôts ? Répondez clairement.'],
    institutions: ['La défiance envers les élus est record. Pourquoi vous ferait-on confiance ?']
  };
  const PROPS = {
    eco: [['Chiffres', 'Je propose un plan précis, chiffré et financé : chaque euro dépensé sera compensé.'], ['Attaque', 'Mes adversaires ont eu le pouvoir et n’ont rien fait. Moi, j’agirai.'], ['Émotion', 'Derrière les chiffres, il y a des familles qui n’en peuvent plus. Je les ai rencontrées.']]
  };
  function themesForDebate() { const sal = S().national.salience; const all = Object.keys(QBANK); return all.sort((a, b) => (sal[b] || 0) - (sal[a] || 0)).slice(0, 4).concat(all.filter(() => E.rnd() < 0.3)).slice(0, 5); }
  const ANG_AI = { programme: 'les propositions du personnage (coût, financement, perdants)', adversaire: 'une proposition précise d’un adversaire, que le personnage doit juger ou attaquer', contradiction: 'une déclaration passée du personnage, pour tester sa cohérence', local: 'un problème concret du territoire', national: 'l’actualité nationale rapportée au territoire', valeurs: 'une question de valeurs ou de société, réponse par oui ou non', personnel: 'le parcours, la légitimité ou les affaires du personnage', chiffres: 'un chiffre précis du diagnostic local ou national' };
  function rivalsTxt(dctx) { return (dctx.opponents || []).map(o => { const x = G.S.pnj[o.id] || E.findPnj(y => y.name === o.name); return x && x.prog && x.prog.length ? o.name + ' propose : ' + x.prog.map(pr => '« ' + pr.label + ' » (financement : ' + pr.fin + ')').join(', ') : ''; }).filter(Boolean).join(' ; '); }
  function oldFallback(dctx, round) {
    const th = themesForDebate()[round % 4] || 'institutions'; const q = (QBANK[th] || QBANK.institutions)[0];
    return { theme: th, question: q, adversaires: dctx.opponents.slice(0, 2).map(o => ({ nom: o.name, replique: 'Soyons sérieux : il faut des solutions qui marchent.' })), propositions: [{ posture: 'Proposition', texte: 'J’ai un plan précis, chiffré, que je mettrai en œuvre dès la première année.' }, { posture: 'Attaque', texte: 'Mes adversaires ont eu des années pour agir.' }, { posture: 'Émotion', texte: 'J’ai rencontré des habitants qui n’en peuvent plus.' }] };
  }
  async function debateOpen(dctx, round, history) {
    const fb = () => (typeof DP !== 'undefined' && DP.fallbackQuestion(dctx, round)) || oldFallback(dctx, round);
    if (state !== 'on') return Object.assign(fb(), { _fallback: true });
    const order = dctx._angAI || (dctx._angAI = (dctx.focus ? ['programme', 'programme', 'programme'] : (dctx.natHook ? ['national'] : []).concat(Object.keys(ANG_AI).filter(a => !(dctx.natHook && a === 'national')).sort(() => Math.random() - 0.5))));
    const ang = order[round % order.length]; const prevQ = (G.S.qAI || []).slice(-15);
    const stm = (P().stmts || []).slice(3, 12).map(x => E.fmtDate(x.date) + ' : « ' + x.text.slice(0, 100) + ' »').join(' | ');
    try {
      const v = await ask(`${dctx.format}${dctx.tone ? ' Ton du journaliste : ' + dctx.tone + '.' : ''} Animateur : ${dctx.host}. Adversaires ou interlocuteurs : ${(dctx.opponents || []).map(o => o.name + ' (' + o.label + ')').join(', ')}. ${rivalsTxt(dctx)}. Manche ${round + 1}/${dctx.rounds}. ANGLE IMPOSÉ pour cette question : ${ANG_AI[ang]}. ${dctx.focus ? 'Sujet unique : ' + dctx.focus + '.' : ''} ${ang === 'national' && dctx.natHook ? 'Actualité : « ' + dctx.natHook.t + ' ».' : ''} ${ang === 'contradiction' ? 'Déclarations passées du personnage : ' + (stm || 'aucune, choisis un autre angle') + '.' : ''} Questions DÉJÀ posées lors des précédents débats, à NE PAS répéter ni paraphraser : ${prevQ.join(' / ') || 'aucune'}. Échanges de ce débat : ${history.map(h => h.q + ' → ' + h.reply.slice(0, 100)).join(' | ') || 'aucun'}. Génère une question précise et originale, une réplique de chaque adversaire cohérente avec sa ligne et ses propositions (deux phrases max), et CINQ réponses possibles pour le personnage, cohérentes avec ses positions et son programme, de postures toutes différentes parmi : Chiffres, Contre-attaque sur une proposition adverse nommée, Émotion, Valeurs, Nuance, Esquive, Punchline, Terrain. JSON : {"theme": thème, "question": "…", "adversaires": [{"nom": "…", "replique": "…"}], "propositions": [{"posture": "…", "texte": "…"}]}`, 'default');
      if (!v.question || !Array.isArray(v.propositions)) throw new Error('bad');
      G.S.qAI = (G.S.qAI || []).concat([v.question.slice(0, 140)]).slice(-30); v.angle = ang; return v;
    } catch (e) { if (e && e.code === 'not_granted') { state = 'off'; notify(); } return Object.assign(fb(), { _fallback: true }); }
  }
  function debateJudge(dctx, q, reply, chosen) {
    return withFallback(() => ask(`${dctx.format}${dctx.tone ? ' Ton : ' + dctx.tone + '.' : ''} Question : « ${q.question} » (thème ${q.theme}). Répliques adverses : ${(q.adversaires || []).map(a => a.nom + ' : ' + a.replique).join(' / ')}. ${rivalsTxt(dctx)}. Réponse du personnage : « ${reply} ». Juge comme un panel de téléspectateurs représentatif et un éditorialiste neutre : pertinence, précision, cohérence avec ses positions, efficacité face à l’adversaire. Une esquive ou une réponse creuse est sanctionnée, une attaque précise sur une proposition adverse mal financée est récompensée. JSON : {"score": 0-100, "segments": {id: -10..10 pour chaque segment}, "axes": {axe: valeur exprimée}, "mensonge": true si affirmation factuelle fausse, "affirmation": "l’affirmation douteuse ou null", "punchline": "formule marquante reprise sur les réseaux, ou null", "gaffe": true/false, "commentaire": "une phrase d’éditorialiste", "reaction": {"nom": "adversaire ou journaliste qui réagit", "texte": "sa relance ou sa réplique, une phrase"}}`, 'default'),
      () => (typeof DP !== 'undefined' ? DP.fallbackJudge(dctx, q, reply, chosen) : { score: 50, segments: {}, axes: {}, commentaire: '' }));
  }

  /* ---------- dialogue avec un PNJ ---------- */
  function dialogue(pn, history, msg) {
    const p = P(); const tr = pn.traits;
    const persona = `Tu incarnes ${pn.name}, ${pn.age} ans, ${pn.mandat || pn.role}, ${D.PARTIES[pn.party].name}. Traits (0-100) : ambition ${tr.ambition}, loyauté ${tr.loyaute}, rancune ${tr.rancune}, scrupules ${tr.scrupules}, charisme ${tr.charisme}. Positions : ${D.AXES.map((a, i) => a.id + ' ' + pn.ax[i]).join(', ')}. Relation actuelle avec le personnage du joueur : ${pn.rel} (−100 hostile, +100 allié). Notoriété : ${pn.noto}. ${pn.secrets ? 'Tu caches des choses et tu es nerveux·se si on en parle.' : ''} Tu défends tes intérêts : tu n’acceptes un accord que s’il te rapporte quelque chose. Tu parles comme un·e élu·e français·e, avec sous-entendus et réalisme.`;
    return withFallback(() => ask(`${persona}\nConversation : ${history.map(h => (h.me ? p.name : pn.name) + ' : ' + h.t).join('\n') || '(début)'}\n${p.name} : ${msg}\nRéponds en personnage. JSON : {"reponse": "ta réplique, 3 phrases max", "relation_delta": −15..+12 (effet de cet échange), "accord": null ou {"clauses": [parmi "desistement","soutien","place","poste","nonagression"]} si tu acceptes explicitement un accord, "info": "information utile lâchée, ou null", "fin": true si tu mets fin à l’entretien}`, 'default'),
      () => { const t = msg.toLowerCase(); let rep, d = 2, acc = null; const wants = ['soutien', 'désist', 'desist', 'liste', 'poste', 'alliance', 'accord'].some(k => t.includes(k));
        if (wants && pn.rel > 15 + (100 - tr.ambition) / 5) { rep = 'Ça peut se discuter. Mais je veux des garanties, et que ça se sache le moment venu.'; acc = { clauses: [t.includes('désist') || t.includes('desist') ? 'desistement' : t.includes('liste') ? 'place' : t.includes('poste') ? 'poste' : 'soutien'] }; d = 4; }
        else if (wants) { rep = 'Vous allez un peu vite. On ne se connaît pas assez, et je n’ai rien à y gagner pour l’instant.'; d = -1; }
        else if (RUDE.some(k => t.includes(k))) { rep = 'Je crois que cet entretien est terminé.'; d = -12; }
        else { rep = pick(['Je vous écoute. Mais en politique, la sympathie ne suffit pas.', 'On m’a parlé de vous. En bien, figurez-vous. Enfin, plutôt.', 'Le terrain est difficile en ce moment. Tout le monde cherche des alliés.']); d = 3; }
        return { reponse: rep, relation_delta: d, accord: acc, info: null, fin: d < -10 }; });
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- brouillons prêts à l’emploi ---------- */
  const TONES = { combatif: 'combatif et tranchant', pedago: 'pédagogique et chiffré', emotion: 'humain et émouvant, ancré dans le vécu des habitants', ironie: 'ironique et mordant' };
  function draftsFallback(kind, sub, tone) {
    const p = P(); const loc = E.commune().name; const t = sub.t; const short = kind === 'post';
    const open = { combatif: ['Assez !', 'Il est temps d’agir.', 'Je ne lâcherai rien.'], pedago: ['Les chiffres sont têtus.', 'Regardons les faits.', 'Expliquons simplement.'], emotion: ['Hier encore, une habitante m’a dit sa colère.', 'Derrière chaque chiffre, il y a une famille.', 'Je pense à ceux qui n’en peuvent plus.'], ironie: ['On nous promet la lune, encore.', 'Chaque campagne, le même film.', 'Surprise : personne ne sait qui paiera.'] }[tone] || ['Parlons franchement.'];
    let core;
    if (sub.kind === 'mesure') core = ['Je propose : ' + sub.m.resume + (sub.m.finL ? ', financé par ' + sub.m.finL.toLowerCase() : '') + '.', (sub.m.ind ? sub.m.ind + '. ' : '') + 'C’est concret, c’est chiffré, c’est pour ' + loc + '.', 'Ma priorité : ' + sub.m.resume.charAt(0).toLowerCase() + sub.m.resume.slice(1) + '. Parce que les habitants attendent des actes.'];
    else if (sub.kind === 'rival') core = [sub.x.name + ' propose « ' + sub.pr.label + ' ». ' + (['aucun', 'dette', 'croissance'].includes(sub.pr.fin) ? 'Sans un euro de financement.' : 'Qui paiera ?'), 'La proposition de ' + sub.x.name + ' coûterait ' + (sub.pr.lvl === 'national' ? (sub.pr.cost / 1e9).toFixed(1).replace('.', ',') + ' Md€' : E.eur(sub.pr.cost)) + ' par an. Ce sont les contribuables qui régleront l’addition.', '« ' + sub.pr.label + ' » : ' + (sub.pr.perdants.length ? 'les ' + sub.pr.perdants.map(g => D.SEGS.find(x => x.id === g).name.toLowerCase()).join(' et les ') + ' en paieraient le prix.' : 'une promesse de plus, sans lendemain.')];
    else if (sub.kind === 'actu') core = sub.e.ch.map(c => c.txt + ' Ici, à ' + loc + ', ça change tout.');
    else core = ['Sur ' + t.toLowerCase() + ', ma ligne est claire : des actes, pas des promesses.', t + ' : les habitants de ' + loc + ' méritent mieux que des discours.', 'Je me bats pour ' + t.toLowerCase() + ', parce que c’est le quotidien de chacun.'];
    return core.slice(0, 3).map((c, i) => { let txt = open[i % open.length] + ' ' + c; if (!short) txt += ' ' + ['Le statu quo n’est plus une option. Il faut du courage politique, et je l’aurai.', 'Je propose une méthode : écouter, chiffrer, décider, rendre des comptes.', 'Cette élection se jouera sur la crédibilité. Je mets la mienne sur la table.'][i] + ' ' + ['C’est l’engagement que je prends devant vous.', 'Jugez-moi sur les actes.', 'Rendez-vous dans les urnes.'][i]; return short ? txt.slice(0, 278) : txt; });
  }
  async function drafts(kind, sub, tone) {
    if (state !== 'on') return { textes: draftsFallback(kind, sub, tone), _fallback: true };
    try { const v = await ask(`Rédige 3 versions différentes d’${kind === 'post' ? 'un message X (moins de 270 caractères, sans hashtag excessif)' : 'une tribune de presse (120 à 180 mots, avec un titre en première ligne)'} signé du personnage, sur le sujet : ${sub.desc}. Ton : ${TONES[tone] || 'clair'}. Reste fidèle à ses positions et à son programme ; n’invente ni chiffre faux ni propos de personne réelle. JSON : {"textes": ["…", "…", "…"]}`, 'quick'); if (!Array.isArray(v.textes) || !v.textes.length) throw new Error('bad'); return v; }
    catch (e) { return { textes: draftsFallback(kind, sub, tone), _fallback: true }; }
  }

  /* ---------- injection d’actualité réelle ---------- */
  function transpose(text) {
    return withFallback(() => ask(`Voici une actualité réelle collée par le joueur : « ${text} ». Transpose-la en événement de jeu crédible, en retirant tout nom de personne réelle. JSON : {"t": "titre de presse", "d": "résumé deux phrases", "th": thème, "scope": "nat"|"loc"|"int", "sal": 0.2-1, "cl": {code parti parmi ${D.PARTY_IDS.join(',')}: effet −0.05..0.05}, "ch": [{"l": "prise de position courte", "v": {axe: valeur}, "txt": "déclaration du personnage"}, {deuxième option opposée}]}`, 'default'),
      () => ({ t: text.slice(0, 90), d: 'Actualité ajoutée par le joueur.', th: themeOf(text), scope: 'nat', sal: 0.5, cl: {}, ch: [{ l: 'Réagir avec fermeté', v: { aut: 30 }, txt: 'Il faut agir avec fermeté.' }, { l: 'Appeler au dialogue', v: { aut: -20 }, txt: 'Il faut apaiser et dialoguer.' }] }));
  }


  /* ---------- atelier d’écriture : discours, tribunes, contributions, messages, questions ---------- */
  const KINDS = {
    speech: { l: 'discours de meeting', len: { court: '150 mots environ (1 minute)', moyen: '350 mots environ (3 minutes)', long: '600 mots environ (5 minutes)' } },
    tribune: { l: 'tribune de presse, avec un titre en première ligne', len: { court: '150 mots', moyen: '300 mots', long: '500 mots' } },
    contribution: { l: 'contribution écrite au débat interne du parti (texte d’orientation adressé aux adhérents), avec un titre', len: { court: '250 mots', moyen: '450 mots', long: '700 mots' } },
    post: { l: 'message pour X', len: { court: 'moins de 200 caractères', moyen: 'moins de 270 caractères', long: 'moins de 280 caractères' } },
    qag: { l: 'question au gouvernement posée dans l’hémicycle (2 minutes, interpellation d’un ministre)', len: { court: '120 mots', moyen: '180 mots', long: '220 mots' } }
  };
  const TONES2 = { combatif: 'combatif et tranchant', pedago: 'pédagogique et chiffré', emotion: 'humain, émouvant, ancré dans le vécu', rassembleur: 'rassembleur et apaisé', ironie: 'ironique et mordant', solennel: 'grave et solennel' };
  function specDesc(spec) {
    const p = P(); const parts = [];
    if (spec.themes.length) parts.push('Thèmes : ' + spec.themes.map(t => D.THEMES[t].l).join(', ') + '.');
    if (spec.measures.length) parts.push('Mesures à défendre, avec leurs chiffres exacts : ' + spec.measures.map(m => '« ' + m.resume + ' »' + (m.cout ? ' (coût ' + E.eur(m.cout) + (m.level === 'national' ? ' par an' : '') + ')' : '') + (m.finL ? ', financée par ' + m.finL : '') + (m.ind ? ', impact attendu : ' + m.ind : '')).join(' ; ') + '.');
    if (spec.attack) parts.push('Attaquer la proposition « ' + spec.attack.pr.label + ' » de ' + spec.attack.x.name + ' (financement : ' + spec.attack.pr.fin + ').');
    if (spec.segs.length) parts.push('Électorats visés en priorité : ' + spec.segs.map(g => D.SEGS.find(s => s.id === g).name).join(', ') + '.');
    parts.push('Échelle : ' + (spec.scope === 'local' ? 'enjeux locaux de ' + E.commune().name + ' et de l’Isère' : 'enjeux nationaux') + '.');
    if (spec.extra) parts.push('Consignes de l’auteur : ' + spec.extra);
    return parts.join(' ');
  }
  async function write(kind, spec) {
    if (state !== 'on') return { text: writeFallback(kind, spec), _fallback: true };
    try {
      const K = KINDS[kind]; const v = await ask(`Rédige un ${K.l}, signé du personnage, longueur ${K.len[spec.len || 'moyen']}. Ton : ${TONES2[spec.tone] || 'clair'}. ${specDesc(spec)} Reste fidèle à ses positions (axes) et à son programme ; n’invente aucun chiffre en dehors de ceux fournis ; aucune personnalité réelle. Texte prêt à être prononcé ou publié, sans indication de mise en scène. JSON : {"texte": "..."}`, 'default');
      if (v && v.texte) return { text: String(v.texte).trim() }; throw new Error('vide');
    } catch (e) { return { text: writeFallback(kind, spec), _fallback: true }; }
  }
  function writeFallback(kind, spec) {
    const p = P(); const loc = E.commune().name; const tone = spec.tone || 'combatif';
    const OPEN = { combatif: 'Mes amis, l’heure n’est plus aux demi-mesures.', pedago: 'Je veux vous parler franchement, chiffres à l’appui.', emotion: 'La semaine dernière, une mère de famille m’a arrêté·e sur le marché. Elle n’en pouvait plus.', rassembleur: 'Quelles que soient nos sensibilités, nous voulons tous la même chose : que ' + loc + ' aille mieux.', ironie: 'On nous refait le coup à chaque élection : des promesses, des slogans, et puis plus rien.', solennel: 'Nous vivons un moment où chaque décision engage l’avenir.' };
    const CLOSE = { combatif: 'Je ne lâcherai rien. Avec vous, on va gagner.', pedago: 'Voilà ma méthode : des objectifs, des moyens, et des comptes rendus chaque année.', emotion: 'C’est pour elle, pour vous, pour nous tous que je m’engage.', rassembleur: 'Je tends la main à toutes celles et ceux qui veulent avancer.', ironie: 'Moi, je préfère les actes. Et je vous donne rendez-vous pour les vérifier.', solennel: 'Je prends devant vous cet engagement, et je le tiendrai.' };
    const TH = { securite: 'La sécurité est la première des libertés : des moyens sur le terrain, pas des effets d’annonce.', sante: 'Trouver un médecin ne devrait pas être un parcours du combattant.', education: 'Nos écoles doivent redevenir la fierté de nos quartiers.', logement: 'Se loger dignement ne doit pas coûter la moitié d’un salaire.', emploi: 'Chaque emploi qui part, c’est une famille qui doute.', ecologie: 'La transition écologique se fera avec les habitants, pas contre eux.', transports: 'Personne ne devrait passer deux heures par jour dans les bouchons.', fiscalite: 'Chaque euro d’impôt doit être justifié et utile.', immigration: 'Accueillir, oui, mais avec des règles claires et respectées.', europe: 'L’Europe doit nous protéger, pas nous contraindre sans nous écouter.', agriculture: 'Nos agriculteurs nourrissent le pays : ils méritent de vivre de leur travail.', institutions: 'La confiance se reconstruit par la transparence.', industrie: 'Produire ici, c’est garder nos savoir-faire et nos emplois.', retraites: 'Après une vie de travail, chacun a droit à une retraite digne.', pouvoir_achat: 'Le pouvoir d’achat, c’est la première préoccupation des familles.' };
    const parts = [OPEN[tone] || OPEN.combatif];
    spec.themes.forEach(t => parts.push(TH[t] || ('Sur ' + D.THEMES[t].l.toLowerCase() + ', il faut enfin des résultats.')));
    spec.measures.forEach(m => parts.push('Je propose ' + m.resume.charAt(0).toLowerCase() + m.resume.slice(1) + (m.cout ? ', pour ' + E.eur(m.cout) + (m.level === 'national' ? ' par an' : '') : '') + (m.finL ? ', financé par ' + m.finL.toLowerCase() : '') + '.' + (m.ind ? ' Résultat attendu : ' + m.ind + '.' : '')));
    if (spec.attack) parts.push(spec.attack.x.name + ' propose « ' + spec.attack.pr.label + ' ». ' + (['aucun', 'dette', 'croissance'].includes(spec.attack.pr.fin) ? 'Sans dire comment la payer.' : 'Qui paiera la note ?'));
    if (kind === 'contribution') { parts.unshift('Contribution : ' + (spec.themes[0] ? D.THEMES[spec.themes[0]].l : 'nos priorités') + ', pour ' + (spec.scope === 'local' ? 'une fédération' : 'un parti') + ' qui gagne\n'); parts.splice(parts.length - 1, 0, 'Notre parti doit cesser de parler à lui-même et retrouver le chemin des électeurs. Je propose que ces orientations soient soumises au vote des adhérents.'); }
    if (kind === 'tribune') parts.unshift((spec.themes[0] ? D.THEMES[spec.themes[0]].l : 'Agir') + ' : sortir des slogans\n');
    if (kind === 'qag') parts.unshift('Monsieur le ministre, dans ma circonscription, les habitants attendent des réponses.');
    parts.push(CLOSE[tone] || CLOSE.combatif);
    let t = parts.join(' ').replace(/\n /g, '\n');
    if (kind === 'post') t = (OPEN[tone] + ' ' + (spec.measures[0] ? 'Je propose ' + spec.measures[0].resume.charAt(0).toLowerCase() + spec.measures[0].resume.slice(1) + '.' : (TH[spec.themes[0]] || ''))).slice(0, 270);
    return t;
  }
  async function flavor(n) { if (state !== 'on' || !n || n.body) return; try { const v = await ask(`Écris le chapeau (deux phrases sobres, style presse régionale) de l’article titré « ${n.title} » paru dans ${n.media}. Aucune personnalité réelle. JSON : {"chapo": "..."}`, 'quick'); if (v && v.chapo) n.body = String(v.chapo).slice(0, 400); } catch (e) { } }
  return { flavor, write, writeFallback, KINDS, TONES2, drafts, init, onState, get state() { return state; }, post, measure, speech, tribune, qag, debateOpen, debateJudge, dialogue, transpose, themeOf };
})();
