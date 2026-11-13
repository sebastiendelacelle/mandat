/* MANDAT — interface */
(function () {
  const $app = document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = () => G.S, P = () => G.S && G.S.p;
  const UI = { screen: 'home', tab: 'bureau', wiz: null, filter: 'entourage', hasSave: false };
  const r0 = n => Math.round(n);
  /* ---------- correcteur typographique : filet de sécurité sur tout le texte affiché ---------- */
  const LOW = 'a-zàâäéèêëîïôöùûüçœ';
  const FRX = [
    [/\b([Dd])e (Le|Les) (?=[A-ZÉ])/g, (m, d, a) => (d === 'D' ? 'D' : 'd') + (a === 'Le' ? 'u ' : 'es ')],
    [/(^|[\s(«])([Àà]) (Le|Les) (?=[A-ZÉ])/g, (m, b, x, a) => b + (x === 'À' ? 'A' : 'a') + (a === 'Le' ? 'u ' : 'ux ')],
    [new RegExp('\\b([Dd])e ([AEIOUYÂÉÈÊÎÔÛ][' + LOW + '])', 'g'), '$1’$2'],
    [new RegExp('\\b([Dd])e (H[eéèiouy][' + LOW + '])', 'g'), '$1’$2'],
    [new RegExp('(\\d+(?:[.,]\\d+)?)\\s([' + LOW + '-]+)\\(s\\)', 'g'), (m, n, w) => n + ' ' + w + (parseFloat(n.replace(',', '.')) >= 2 ? 's' : '')],
    [/dépenses de l’état/g, 'dépenses de l’État'], [/\b1e sur\b/g, '1er sur']
  ];
  const frFix = t => { let o = t; for (const [r, f] of FRX) o = o.replace(r, f); return o; };
  function frNode(n) { if (n.nodeType === 3) { const v = n.nodeValue; if (v && /de |\(s\)|à L|état|1e /i.test(v)) { const f = frFix(v); if (f !== v) n.nodeValue = f; } return; } if (n.nodeType === 1 && !/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(n.nodeName)) n.childNodes.forEach(frNode); }
  try { new MutationObserver(ms => ms.forEach(m => { if (m.type === 'characterData') frNode(m.target); else m.addedNodes.forEach(frNode); })).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) { }

  /* ---------- stockage ---------- */
  const Store = {
    db: null, uid: null, user: null, ready: false,
    async init() {
      try { const c = window.claude; if (c && c.use) { const [db, user] = await Promise.all([c.use('db'), c.use('user')]); if (db && user) { this.db = db; this.user = user; this.uid = await user.id(); if (this.uid) MP.init(db, this.uid, user); } } } catch (e) { }
      this.ready = true; const s = await this.peek('carriere'); UI.hasSave = !!s; UI.mpGames = await MP.myGames();
      MP.setOnChange(k => { if (UI.screen === 'game' && !document.querySelector('.ov')) render(); });
      if (G.S && G.S.mp && UI.screen === 'game') MP.enter();
      if (UI.screen === 'home') render();
    },
    slot() { return G.S && G.S.mp ? 'mp_' + G.S.mp.gid : 'carriere'; },
    lsKey(k) { return k === 'carriere' ? 'mandat_save' : 'mandat_' + k; },
    doc(k) { return this.db.collection('data/users/' + this.uid).doc(k || this.slot()); },
    async save() {
      const json = X.serialize(); const k = this.slot(); let ok = false;
      if (this.db && this.uid) { try { await this.doc(k).set({ v: 1, at: Date.now(), date: S().date, name: P().name, json }); ok = true; } catch (e) { } }
      try { localStorage.setItem(this.lsKey(k), json); ok = true; } catch (e) { }
      if (G.S.mp) MP.publish();
      return ok;
    },
    async peek(k) {
      k = k || 'carriere';
      if (this.db && this.uid) { try { const d = await this.doc(k).get(); const v = d && (typeof d.data === 'function' ? d.data() : (d.data ?? d)); if (v && v.json) return v.json; } catch (e) { } }
      try { return localStorage.getItem(this.lsKey(k)); } catch (e) { return null; }
    }
  };

  /* ---------- modales & toasts ---------- */
  function modal(html, onMount, cls) {
    const ov = document.createElement('div'); ov.className = 'ov'; ov.innerHTML = '<div class="modal ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(ov); const m = ov.firstChild; const close = () => ov.remove();
    if (onMount) onMount(m, close); if (window.matchMedia('(hover: hover)').matches) { const f = m.querySelector('textarea, input'); if (f) f.focus({ preventScroll: true }); }
    return { m, close };
  }
  function choice(title, body, options) { // options: [{l, sub, v, cls}]
    return new Promise(res => {
      modal('<h2>' + esc(title) + '</h2><div>' + body + '</div><div class="stack" style="margin-top:12px">' + options.map((o, i) => '<button class="opt ' + (o.cls || '') + '" data-i="' + i + '">' + esc(o.l) + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</button>').join('') + '</div>', (m, close) => {
        m.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { close(); res(options[+b.dataset.i].v); });
      });
    });
  }
  function info(title, body, btn) { return new Promise(res => modal('<h2>' + esc(title) + '</h2><div>' + body + '</div><div class="foot"><button class="btn primary" data-ok>' + esc(btn || 'Continuer') + '</button></div>', (m, close) => { m.querySelector('[data-ok]').onclick = () => { close(); res(); }; })); }
  function ask(title, body, ph, opts) {
    return new Promise(res => modal('<h2>' + esc(title) + '</h2>' + (opts && opts.extra || '') + '<textarea id="ask-t" placeholder="' + esc(ph || '') + '" maxlength="' + (opts && opts.max || 1500) + '">' + esc(opts && opts.value || '') + '</textarea><div class="hint">' + body + '</div><div class="foot"><button class="btn ghost" data-x>Annuler</button><button class="btn primary" data-ok>' + esc(opts && opts.btn || 'Valider') + '</button></div>', (m, close) => {
      m.querySelector('[data-x]').onclick = () => { close(); res(null); };
      m.querySelector('[data-ok]').onclick = () => { const t = m.querySelector('#ask-t').value.trim(); if (!t) return; const extra = {}; m.querySelectorAll('[data-extra]').forEach(e => extra[e.dataset.extra] = e.value); close(); res({ text: t, extra }); };
    }));
  }
  function loading(txt) { return modal('<p><span class="spinner"></span> ' + esc(txt || 'Analyse en cours…') + '</p>'); }
  function chipsHTML(ds) { return ds.length ? '<div class="deltas">' + ds.map(d => '<span class="dl ' + (d.d > 0 ? (d.l === 'Argent' ? '' : 'up') : (d.l === 'Argent' ? '' : 'down')) + '">' + esc(d.l) + ' <b>' + esc(d.t) + '</b></span>').join('') + '</div>' : '<div class="muted small">Pas d’effet mesurable immédiat.</div>'; }
  function result(title, msg, before) {
    E.estimate(); const ds = X.deltas(before, X.snap());
    document.querySelectorAll('.result').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'result'; t.setAttribute('role', 'status');
    t.innerHTML = '<div class="row" style="justify-content:space-between;align-items:flex-start"><b>' + esc(title) + '</b><button class="linkbtn" aria-label="Fermer">OK</button></div><div class="small" style="margin:4px 0 6px">' + esc(msg) + '</div>' + chipsHTML(ds);
    document.body.appendChild(t); t.querySelector('button').onclick = () => t.remove(); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 7000);
  }
  let toastT; function toast(msg) { document.querySelectorAll('.toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 4200); }

  /* ---------- composants ---------- */
  const pc = code => D.PARTIES[code] ? D.PARTIES[code].color : '#e8e2d0';
  const pill = (code, label) => '<span class="pill" style="background:' + pc(code) + ';' + (code === 'DIV' || !D.PARTIES[code] ? 'color:#1b1a17' : '') + '">' + esc(label || D.PARTIES[code]?.short || code) + '</span>';
  function diverge(v, color) { v = E.clamp(v, -100, 100); const w = Math.abs(v) / 2; return '<div class="diverge"><i style="left:' + (v < 0 ? 50 - w : 50) + '%;width:' + w + '%;background:' + (color || (v < 0 ? 'var(--bad)' : 'var(--good)')) + '"></i></div>'; }
  function bars(rows, max) { const m = max || Math.max(...rows.map(r => r.pct), 1); return '<div class="bars">' + rows.map(r => '<div class="b ' + (r.pj ? 'pj' : '') + '"><span class="lab">' + esc(r.name) + ' <span class="muted">' + esc(r.label || '') + '</span></span><span class="track"><i style="width:' + (r.pct / m * 100) + '%;background:' + (r.color || '#999') + '"></i></span><span class="num">' + E.pct(r.pct) + '</span></div>').join('') + '</div>'; }
  function gauge(v, color) { return '<div class="gauge"><i style="width:' + E.clamp(v, 0, 100) + '%;background:' + (color || 'var(--paper)') + '"></i></div>'; }
  const kpi = (lab, val, g, color, sub) => '<div class="kpi"><small>' + lab + '</small><div class="v">' + val + '</div>' + (g != null ? gauge(g, color) : '') + (sub ? '<div class="muted" style="font-size:12px;margin-top:3px">' + sub + '</div>' : '') + '</div>';
  const partyName = () => P().party === 'NEW' ? P().movement : D.PARTIES[P().party].name;

  /* ---------- accueil ---------- */
  function newWiz(mp) { UI.wiz = { step: 0, name: '', g: 'F', age: 32, metier: 'salarie', ans: [], perso: [], party: null, movement: '', communeId: mp && mp.arena ? mp.arena.communeId : null, qs: pickQuiz(), ps: pickPerso(), mp: mp || null }; UI.screen = 'wiz'; render(); }
  async function openSlot(k) {
    const ld = loading('Chargement de votre partie…'); let j = null;
    try { for (let i = 0; i < 40 && !Store.ready; i++) await new Promise(r => setTimeout(r, 200)); j = await Store.peek(k); } catch (e) { j = null; }
    ld.close();
    if (!j) { const again = await choice('Partie introuvable', '<p>Impossible de charger la sauvegarde pour l’instant. Vérifiez votre connexion internet, puis réessayez.</p><p class="muted small">Vos parties sont liées à ce navigateur, ou à votre compte Google si vous vous êtes connecté·e.</p>', [{ l: 'Réessayer', v: true }, { l: 'Fermer', v: false }]); return again ? openSlot(k) : false; }
    try { MP.leave(); X.load(j); UI.screen = 'game'; UI.tab = 'bureau'; render(); if (G.S.mp) MP.enter(); return true; } catch (e) { await info('Sauvegarde illisible', '<p>Cette sauvegarde est endommagée et ne peut pas être ouverte.</p>'); return false; }
  }
  function renderHome() {
    const mpOk = MP.available(); const games = UI.mpGames || [];
    $app.innerHTML = '<div class="hero"><div class="kicker">Simulation politique · Isère, 2026</div><h1>Man<span>dat</span></h1><p class="tag">Partez de rien. Visez l’Élysée.</p>' +
      '<div class="modes"><div class="mode"><div class="eyebrow">Solo</div><h3>Votre carrière</h3><p class="muted small">Face à des adversaires simulés. À votre rythme.</p><div class="row" style="gap:8px">' + (UI.hasSave ? '<button class="btn primary" id="h-load">Continuer</button><button class="btn" id="h-new">Nouvelle carrière</button>' : '<button class="btn primary" id="h-new">Commencer</button>') + '</div></div>' +
      '<div class="mode mp"><div class="eyebrow">Multijoueur entre amis</div><h3>Même commune, mêmes élections</h3><p class="muted small">Tous les joueurs partent de la même commune et s’affrontent à chaque élection : municipales, départementales, législatives. Chacun joue quand il veut. Les scrutins où vous vous affrontez sont des rendez-vous : le résultat tombe quand tous les candidats y sont arrivés.</p>' +
      (mpOk ? (games.length ? '<div class="stack" style="gap:6px;margin-bottom:10px">' + games.map(g => '<button class="gamebtn" data-gopen="' + esc(g.gid) + '"><b>' + esc(g.name) + '</b><span class="num muted">' + esc(g.gid) + '</span></button>').join('') + '</div>' : '') + '<div class="row" style="gap:8px"><button class="btn primary" id="h-mpnew">Créer une partie</button><button class="btn" id="h-mpjoin">Rejoindre avec un code</button></div>' : '<p class="small" style="color:var(--warn);margin:0">' + (window.claude && window.claude.use ? 'Connectez-vous à claude.ai pour jouer en multijoueur.' : 'Le multijoueur n’est disponible que dans la version du jeu hébergée sur claude.ai. Ici, vos parties solo sont sauvegardées dans ce navigateur.') + '</p>') + '</div></div>' +
      '<ol class="how"><li><b>Créez votre personnage</b><span>Quelques questions sur vos idées et votre caractère. 3 minutes.</span></li><li><b>Dépensez vos heures</b><span>Composez votre agenda : terrain, parti, médias, alliances.</span></li><li><b>Passez au tour suivant</b><span>Élections, débats, scandales et trahisons arrivent d’eux-mêmes.</span></li></ol>' +
      (window.MandatAuth ? '<div class="card" style="margin:10px 0"><p class="small" style="margin:0 0 8px">' + (window.MandatAuth.isGoogle() ? 'Connecté·e : <b>' + esc(window.MandatAuth.name() || '') + '</b>. Vos parties vous suivent sur tous vos appareils.' : 'Vos parties sont liées à ce navigateur. Connectez-vous pour les retrouver sur tous vos appareils.') + '</p>' + (window.MandatAuth.isGoogle() ? '<button class="btn sm ghost" id="h-out">Se déconnecter</button>' : '<button class="btn sm primary" id="h-gin">Se connecter avec Google</button>') + '</div>' : '') +
      '<p class="muted small">Partis réels, personnalités fictives, règles électorales de 2026. Vos parties solo et multijoueur sont sauvegardées séparément : passez de l’une à l’autre quand vous voulez. <button class="linkbtn" id="h-imp">Importer une sauvegarde</button></p></div>';
    document.getElementById('h-new').onclick = () => newWiz(null);
    const gin = document.getElementById('h-gin'); if (gin) gin.onclick = async () => { const r = await window.MandatAuth.signInGoogle(); if (r && r.msg) toast(r.msg); await Store.init(); render(); };
    const gout = document.getElementById('h-out'); if (gout) gout.onclick = async () => { await window.MandatAuth.signOut(); location.reload(); };
    const l = document.getElementById('h-load'); if (l) l.onclick = () => openSlot('carriere');
    $app.querySelectorAll('[data-gopen]').forEach(b => b.onclick = async () => { const gid = b.dataset.gopen; if (await openSlot('mp_' + gid)) return; const g = await MP.find(gid); if (!g) { toast('Partie introuvable.'); return; } newWiz({ gid, seed: g.seed, name: g.name, arena: g.arena || null }); });
    const mn = document.getElementById('h-mpnew'); if (mn) mn.onclick = async () => {
      if (await MP.canWrite() === false) { mpAccessInfo(); return; }
      const r = await ask('Créer une partie', 'Donnez-lui un nom. Vous recevrez un code à envoyer à vos amis.', 'Les Isérois', { max: 60, btn: 'Créer' }); if (!r || !r.text.trim()) return;
      const ar = await arenaPick(); if (!ar) return;
      try { const g = await MP.create(r.text.trim(), ar); UI.mpGames = await MP.myGames(); await info('Partie créée', '<p>Code de la partie :</p><p class="gcode num">' + esc(g.gid) + '</p><p class="muted small">Envoyez ce code et le lien du jeu à vos amis. Créez maintenant votre personnage.</p>', 'Créer mon personnage'); newWiz(g); } catch (e) { mpAccessInfo(); }
    };
    const mj = document.getElementById('h-mpjoin'); if (mj) mj.onclick = async () => {
      const r = await ask('Rejoindre une partie', 'Entrez le code reçu (6 caractères).', 'K7P2QX', { max: 12, btn: 'Rejoindre' }); if (!r) return; const gid = r.text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const g = await MP.find(gid); if (!g) { toast('Aucune partie avec ce code.'); return; }
      try { await MP.join(gid); } catch (e) { if (e && e.message === 'full') { toast('Partie complète (8 joueurs).'); return; } mpAccessInfo(); return; }
      UI.mpGames = await MP.myGames(); if (await openSlot('mp_' + gid)) return; newWiz({ gid, seed: g.seed, name: g.name, arena: g.arena || null });
    };
    document.getElementById('h-imp').onclick = async () => { const r = await ask('Importer une sauvegarde', 'Collez le texte copié depuis le Carnet.', '{"v":1,…}', { max: 2000000, btn: 'Importer' }); if (!r) return; try { X.load(r.text); UI.screen = 'game'; render(); } catch (e) { toast('Texte de sauvegarde invalide.'); } };
  }
  // Le terrain de la partie : tous les joueurs y démarrent, et s'y affrontent
  function arenaPick() {
    const grp = (lab, L) => '<optgroup label="' + esc(lab) + '">' + L.map(c => '<option value="' + c.id + '">' + esc(c.name) + ' (' + c.pop.toLocaleString('fr-FR') + ' hab.)</option>').join('') + '</optgroup>';
    const vil = [...new Set(D.VILLAGES.map(v => v.terr))].map(t => grp('Village · ' + t, D.VILLAGES.filter(v => v.terr === t))).join('');
    const vil2 = D.CIRCOS.map(c => { const L = D.COMMUNES.filter(m => m.circo === c.id); return L.length ? grp('Ville · ' + c.name, L) : ''; }).join('');
    return new Promise(res => modal('<h2>Le terrain de la partie</h2><p class="muted small">Tous les joueurs partiront de cette commune. Vous vous y affronterez aux municipales, puis aux départementales (même canton) et aux législatives (même circonscription). Un village simplifie les règles pour débuter.</p><label class="f">Commune<select class="field" id="ar-c">' + vil + vil2 + '</select></label><div class="foot"><button class="btn ghost" data-x>Annuler</button><button class="btn primary" data-ok>Valider</button></div>', (m, close) => {
      m.querySelector('[data-x]').onclick = () => { close(); res(null); };
      m.querySelector('[data-ok]').onclick = () => { const v = m.querySelector('#ar-c').value; close(); res({ communeId: v }); };
    }));
  }
  function mpAccessInfo() { info('Accès en lecture seule', '<p>Votre accès à ce jeu ne permet pas d’enregistrer de données partagées.</p><p class="muted small">Demandez à la personne qui a créé le jeu de vous inviter par e-mail avec le droit de modifier (ou « Contributeur » au sein d’une même organisation). Le mode solo reste disponible.</p>', 'Compris'); }

  /* ---------- création du personnage ---------- */
  const NQ = 16, NP = 6;
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function pickQuiz() { // deux questions par grand thème, comme les tests en ligne
    const out = []; Object.keys(D.QUIZ_T).forEach(t => shuffle(D.QUIZ_POOL.map((_, i) => i).filter(i => D.QUIZ_POOL[i].t === t)).slice(0, 2).forEach(i => out.push(i)));
    return shuffle(out.slice(0, NQ));
  }
  function pickPerso() { return shuffle(D.PERSO_POOL.map((_, i) => i)).slice(0, NP); }
  // axes bruts d'un jeu de réponses ; étalonnés par régression sur les réponses-types de chaque parti
  function rawAxes(qs, ans) { const ax = [0, 0, 0, 0, 0, 0], mx = [0, 0, 0, 0, 0, 0]; ans.forEach((v, i) => { const q = D.QUIZ_POOL[qs[i]]; for (const k in q.w) { ax[E.AXI[k]] += q.w[k] * v / 2; mx[E.AXI[k]] += Math.abs(q.w[k]); } }); return ax.map((v, i) => mx[i] ? v / mx[i] * 100 : null); }
  let CAL = null;
  function calib() {
    if (CAL) return CAL; const all = D.QUIZ_POOL.map((_, i) => i); const xs = D.QUIZ_P.map((k, j) => rawAxes(all, all.map(i => +D.QUIZ_POOL[i].p[j] - 2)));
    CAL = [0, 1, 2, 3, 4, 5].map(a => { const X = xs.map(r => r[a]), Y = D.QUIZ_P.map(k => D.PARTIES[k].ax[a]); const n = X.length, mx = X.reduce((u, v) => u + v, 0) / n, my = Y.reduce((u, v) => u + v, 0) / n; let sxy = 0, sxx = 0; X.forEach((x, i) => { sxy += (x - mx) * (Y[i] - my); sxx += (x - mx) ** 2; }); const b = sxx ? sxy / sxx : 0; return [b, my - b * mx]; });
    return CAL;
  }
  function computeProfile(w) {
    const r = rawAxes(w.qs, w.ans), C = calib(); const m = D.quizMatch(w.qs, w.ans);
    // les axes sans question gardent la moyenne pondérée des partis les plus proches
    const top = D.QUIZ_P.slice().sort((a, b) => m[b] - m[a]).slice(0, 3); const tw = top.reduce((u, k) => u + m[k], 0) || 1;
    const ax = [0, 1, 2, 3, 4, 5].map(a => { const pa = top.reduce((u, k) => u + D.PARTIES[k].ax[a] * m[k], 0) / tw; return r[a] == null ? pa : 0.65 * (C[a][0] * r[a] + C[a][1]) + 0.35 * pa; });
    const traits = {}; Object.keys(D.TRAITS).forEach(t => traits[t] = 50); w.perso.forEach((ai, i) => { const d = D.PERSO_POOL[w.ps[i]].a[ai].t; for (const k in d) traits[k] += d[k]; });
    for (const k in traits) traits[k] = E.clamp(traits[k], 5, 95);
    return { ax: ax.map(v => E.clamp(Math.round(v), -100, 100)), traits, match: m };
  }
  function renderWiz() {
    const w = UI.wiz; const total = 5 + NQ + NP; const pr = w.step / total * 100;
    let h = '<div class="wizard"><div class="row"><span class="brand">Man<b>dat</b></span><span class="muted" style="margin-left:auto">Étape ' + (w.step + 1) + ' / ' + total + '</span></div><div class="progress"><i style="width:' + pr + '%"></i></div>';
    if (w.step === 0) {
      h += '<h2>Qui êtes-vous ?</h2><p class="muted">Votre métier fixe votre temps libre, votre épargne et vos réseaux de départ.</p><div class="formgrid" style="margin-top:14px">' +
        '<label class="f">Prénom et nom<input class="field" id="w-name" type="text" maxlength="40" value="' + esc(w.name) + '" placeholder="Ex. Claire Duvernay"></label>' +
        '<label class="f">Âge<input class="field" id="w-age" type="number" min="18" max="80" value="' + w.age + '"></label>' +
        '<label class="f">Genre (pour les accords du texte)<select class="field" id="w-g"><option value="F"' + (w.g === 'F' ? ' selected' : '') + '>Femme</option><option value="M"' + (w.g === 'M' ? ' selected' : '') + '>Homme</option></select></label>' +
        '<label class="f">Métier<select class="field" id="w-met">' + D.METIERS.map(m => '<option value="' + m.id + '"' + (w.metier === m.id ? ' selected' : '') + '>' + m.label + ' — ' + m.hpw + ' h/sem, ' + E.eur(m.cash) + '</option>').join('') + '</select></label></div>' +
        '<div class="row" style="margin-top:22px"><button class="btn primary" id="w-next">Passer le questionnaire politique</button></div>';
    } else if (w.step <= NQ) {
      const i = w.step - 1; const qq = D.QUIZ_POOL[w.qs[i]]; h += '<div class="eyebrow">Vos convictions · ' + (i + 1) + ' / ' + NQ + ' · ' + esc(D.QUIZ_T[qq.t] || '') + '</div><div class="q">' + esc(qq.q) + '</div>' + (qq.ctx ? '<p class="muted small" style="margin:-6px 0 12px">' + esc(qq.ctx) + '</p>' : '') + '<div class="likert">' + D.LIKERT.map(l => '<button data-v="' + l.v + '">' + l.l + '</button>').join('') + '</div>';
      if (i > 0) h += '<div class="row" style="margin-top:18px"><button class="btn ghost sm" id="w-back">Question précédente</button></div>';
    } else if (w.step <= NQ + NP) {
      const i = w.step - NQ - 1; const q = D.PERSO_POOL[w.ps[i]]; h += '<div class="eyebrow">Votre tempérament · ' + (i + 1) + ' / ' + NP + '</div><div class="q">' + esc(q.q) + '</div><div class="stack">' + q.a.map((a, j) => '<button class="opt" data-a="' + j + '">' + esc(a.l) + '</button>').join('') + '</div>';
    } else if (w.step === NQ + NP + 1) {
      const pf = computeProfile(w); w.ax = pf.ax; w.traits = pf.traits;
      w.match = pf.match; const prox = D.QUIZ_P.map(k => ({ k, m: pf.match[k] })).sort((a, b) => b.m - a.m); const gaps = w.party && w.party !== 'NEW' ? D.quizGaps(w.qs, w.ans, w.party) : [];
      h += '<h2>Votre profil politique</h2><p class="muted">Calculé à partir de vos réponses. C’est aussi la boussole de votre personnage : la presse comparera chacune de ses déclarations à ces positions.</p><div class="card" style="margin-top:12px">' +
        D.AXES.map((a, i) => '<div class="axisrow"><b>' + a.label + '</b><div><div class="scale"><span>' + a.neg + '</span><span>' + a.pos + '</span></div>' + diverge(pf.ax[i], 'var(--paper)') + '</div></div>').join('') +
        '<div class="sep"></div><div class="row">' + Object.entries(pf.traits).map(([k, v]) => '<span class="chip">' + D.TRAITS[k] + ' <b class="num">' + v + '</b></span>').join('') + '</div></div>' +
        '<h3 style="margin:18px 0 8px">Rejoindre un parti, ou partir seul·e</h3><p class="muted" style="margin:0 0 8px">Un parti donne un appareil, des investitures et de l’argent, mais impose sa ligne. Un mouvement vous laisse libre, sans rien de tout ça.</p>' +
        prox.map((x, i) => '<button class="opt' + (w.party === x.k ? ' sel' : '') + '" data-p="' + x.k + '">' + pill(x.k) + ' ' + esc(D.PARTIES[x.k].name) + '<small>Accord ' + x.m + ' %' + (i === 0 ? ' · le plus proche de vous' : '') + '</small></button>' + (w.party === x.k ? '<div class="card" style="margin:-2px 0 10px;border-color:var(--accent)"><b class="small">Rejoindre ' + esc(D.PARTIES[x.k].short) + ', c’est défendre sa ligne.</b><p class="small" style="margin:4px 0 0">' + (gaps.length ? 'Vos désaccords avec le parti :</p><ul class="small" style="margin:4px 0 0;padding-left:18px">' + gaps.slice(0, 4).map(g => '<li>' + esc(g.q) + ' <span class="muted">(vous : ' + (g.me > 0 ? 'pour' : 'contre') + ', le parti : ' + (g.line > 0 ? 'pour' : g.line < 0 ? 'contre' : 'partagé') + ')</span></li>').join('') + '</ul><p class="small muted" style="margin:6px 0 0">' : 'Aucun désaccord majeur sur ces questions. ') + 'Au niveau local, on vous laissera de la marge ; en campagne nationale, vous devrez porter les positions du parti, ou les contester publiquement.</p></div>' : '')).join('') +
        '<button class="opt' + (w.party === 'NEW' ? ' sel' : '') + '" data-p="NEW">Fonder mon propre mouvement<small>Sans appareil ni financement de parti</small></button>' +
        (w.party === 'NEW' ? '<label class="f" style="margin-top:8px">Nom du mouvement<input class="field" id="w-mov" type="text" maxlength="32" value="' + esc(w.movement) + '" placeholder="Ex. Isère Debout"></label>' : '') +
        '<div class="row" style="margin-top:18px"><button class="btn primary" id="w-next"' + (w.party ? '' : ' disabled') + '>Choisir votre commune</button></div>';
    } else if (w.step === NQ + NP + 2) {
      if (w.mp && w.mp.arena) { const c = D.com(w.mp.arena.communeId) || {}; h += '<h2>Votre terrain</h2><div class="card" style="margin-top:12px"><b>' + esc(c.name || '') + '</b><p class="small" style="margin:6px 0 0">' + (c.pop || 0).toLocaleString('fr-FR') + ' habitants · imposé par la partie. Tous les joueurs partent d’ici : vous vous affronterez aux municipales, puis aux départementales et aux législatives.' + (c.pop < 3500 ? ' Petite commune : listes sans étiquette.' : '') + '</p></div><div class="row" style="margin-top:18px"><button class="btn primary big" id="w-next3">Choisir votre point de départ</button></div>'; }
      else { const cm = w.cmode || 'village'; const opt = m => '<button class="opt' + (w.communeId === m.id ? ' sel' : '') + '" data-c="' + m.id + '">' + esc(m.name) + '<small>' + m.pop.toLocaleString('fr-FR') + ' habitants · ' + (m.terr ? esc(m.terr) : D.TYPE_LABEL[m.type]) + '</small></button>';
      h += '<h2>Votre terrain</h2><p class="muted">Votre commune détermine votre circonscription, votre canton et l’électorat que vous devrez conquérir.</p>' +
        '<div class="seg" style="margin:12px 0"><button data-cm="village" class="' + (cm === 'village' ? 'on' : '') + '">🌱 Débuter dans un village</button><button data-cm="ville" class="' + (cm === 'ville' ? 'on' : '') + '">🏙 Une ville</button></div>' +
        (cm === 'village' ? '<div class="card" style="margin-bottom:6px"><b>Recommandé pour une première partie.</b><p class="small" style="margin:6px 0 0">Dans une commune de moins de 3 500 habitants, tout est plus simple : pas d’investiture ni d’étiquette politique, une liste d’habitants, un ou deux adversaires, pas de débats télévisés. On apprend le jeu en devenant maire. Ensuite : intercommunalité, parti, médias… et la suite de la conquête, avec toutes les règles.</p></div>' +
          [...new Set(D.VILLAGES.map(v => v.terr))].map(t => '<div class="eyebrow" style="margin-top:14px">' + esc(t) + '</div>' + D.VILLAGES.filter(v => v.terr === t).map(opt).join('')).join('')
        : '<div class="card" style="margin-bottom:6px"><p class="small" style="margin:0">Toutes les règles dès le départ : investiture du parti, étiquettes, plusieurs listes concurrentes, presse, débats, direction de campagne.</p></div>' +
          D.CIRCOS.map(c => { const cs = D.COMMUNES.filter(m => m.circo === c.id); if (!cs.length) return ''; return '<div class="eyebrow" style="margin-top:14px">' + c.name + ' · ' + esc(c.zone) + '</div>' + cs.map(opt).join(''); }).join('')) +
        '<div class="row" style="margin-top:18px;position:sticky;bottom:12px"><button class="btn primary big" id="w-next3"' + (w.communeId ? '' : ' disabled') + '>Choisir votre point de départ</button></div>'; }
    } else {
      h += '<h2>Votre point de départ</h2><p class="muted">' + esc((D.com(w.communeId) || {}).name || '') + ' · choisissez d’où vous partez, et la difficulté.</p>' + ((D.com(w.communeId) || {}).village ? [['militant', 'Habitant·e engagé·e', 'Partir de zéro : vos voisins vous connaissent, guère plus. Le meilleur départ pour apprendre.'], ['adjoint', 'Adjoint·e au maire sortant·e', 'Vous siégez déjà au conseil municipal : un bilan à défendre et un réseau dans le village.'], ['notable', 'Figure du village', 'Présidente du comité des fêtes, agriculteur, infirmière : tout le monde vous connaît.']] : [['militant', 'Simple militant·e', 'Partir de zéro. Le parcours le plus long, le plus réaliste.'], ['adjoint', 'Adjoint·e au maire sortant·e', 'Un mandat local, un bilan à défendre, un réseau. Notoriété locale élevée.'], ['notable', 'Personnalité locale', 'Médecin, cheffe d’entreprise, président d’association : connu·e et estimé·e, mais sans appareil.']]).map(([k, l, d]) => '<button class="opt' + ((w.start || 'militant') === k ? ' sel' : '') + '" data-st="' + k + '">' + l + '<small>' + d + '</small></button>').join('') +
        '<h3 style="margin:18px 0 8px">Difficulté</h3><div class="chips" style="padding-top:0">' + [['facile', 'Facile'], ['normal', 'Normal'], ['difficile', 'Difficile']].map(([k, l]) => '<button data-df="' + k + '" class="' + ((w.diff || 'normal') === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div><p class="muted small">' + ({ facile: 'Facile : plus de temps, des adversaires moins coriaces, des électeurs indulgents. Une campagne de terrain bien menée suffit souvent.', normal: 'Normal : il faut une vraie campagne (terrain, programme, équipe, débats) pour gagner. Le terrain seul ne suffit pas.', difficile: 'Difficile : moins de temps, des adversaires redoutables et plus agressifs, des règles appliquées strictement. Chaque erreur se paie.' }[w.diff || 'normal']) + '</p>' +
        '<div class="row" style="margin-top:18px;position:sticky;bottom:12px"><button class="btn primary big" id="w-go"' + (w.communeId ? '' : ' disabled') + '>Entrer en politique</button></div>';
    }
    h += '</div>'; $app.innerHTML = h; window.scrollTo(0, 0);
    const nx = document.getElementById('w-next');
    if (w.step === 0) nx.onclick = () => { w.name = document.getElementById('w-name').value.trim(); w.age = E.clamp(+document.getElementById('w-age').value || 30, 18, 80); w.g = document.getElementById('w-g').value; w.metier = document.getElementById('w-met').value; if (!w.name) { toast('Donnez un nom à votre personnage.'); return; } { const mt = D.METIERS.find(m => m.id === w.metier); if (mt && mt.age && (w.age < mt.age[0] || w.age > mt.age[1])) { toast(mt.label + ' : entre ' + mt.age[0] + ' et ' + mt.age[1] + ' ans.'); return; } } w.step++; render(); };
    $app.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { w.ans[w.step - 1] = +b.dataset.v; w.step++; render(); });
    const bk = document.getElementById('w-back'); if (bk) bk.onclick = () => { w.step--; render(); };
    $app.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { w.perso[w.step - NQ - 1] = +b.dataset.a; w.step++; render(); });
    $app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const mv = document.getElementById('w-mov'); if (mv) w.movement = mv.value; w.party = b.dataset.p; render(); });
    if (w.step === NQ + NP + 1 && nx) nx.onclick = () => { const mv = document.getElementById('w-mov'); if (mv) w.movement = mv.value.trim(); if (w.party === 'NEW' && !w.movement) { toast('Donnez un nom à votre mouvement.'); return; } w.step++; render(); };
    $app.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { w.start = b.dataset.st; const y = window.scrollY; render(); window.scrollTo(0, y); });
    $app.querySelectorAll('[data-df]').forEach(b => b.onclick = () => { w.diff = b.dataset.df; const y = window.scrollY; render(); window.scrollTo(0, y); });
    $app.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => { w.cmode = b.dataset.cm; render(); });
    $app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { w.communeId = b.dataset.c; const y = window.scrollY; render(); window.scrollTo(0, y); });
    const n3 = document.getElementById('w-next3'); if (n3) n3.onclick = () => { w.step++; render(); };
    const go = document.getElementById('w-go'); if (go) go.onclick = async () => {
      MP.leave(); E.newGame({ name: w.name, g: w.g, age: w.age, metier: w.metier, communeId: w.communeId, ax: w.ax, traits: w.traits, party: w.party, movement: w.movement, quiz: { qs: w.qs, ans: w.ans }, diff: w.diff || 'normal', seed: w.mp ? w.mp.seed : undefined });
      GV.applyStart(w.start || 'militant'); E.estimate();
      if (w.mp) G.S.mp = { gid: w.mp.gid, name: w.mp.name, arena: w.mp.arena || null, seen: [] };
      UI.screen = 'game'; UI.tab = 'bureau'; render(); await Store.save(); if (G.S.mp) MP.enter();
      info('C’est parti', '<p>Votre <b>objectif du moment</b> s’affiche en haut de l’accueil, avec les actions conseillées. Quand vos heures sont dépensées, appuyez sur <b>Tour suivant</b>.</p>', 'Compris');
    };
  }

  /* ---------- jeu ---------- */
  const tCarnet = () => msFull() + '<h2 class="sec">Dossiers</h2>' + tDossiers() + '<h2 class="sec">Journal et sauvegarde</h2>' + tJournal();
  function renderGame() {
    const s = S(), p = P(); const ph = E.phase(); const days = E.turnDays(); const fc = face(); document.body.dataset.face = fc;
    const cmp = p.cand && p.cand.compte && ph.id !== 'hors' ? p.cand.compte : null;
    const aiDot = '<span class="aidot" title="' + (A.state === 'on' ? 'IA connectée' : A.state === 'off' ? 'Mode scripté (IA indisponible)' : 'Connexion IA…') + '" style="background:' + (A.state === 'on' ? 'var(--good)' : A.state === 'off' ? 'var(--warn)' : 'var(--muted)') + '"></span>';
    const casOut = p.procs.filter(j => j.stage !== 'clos').length; const un = LF.unread(); const bun = hasHQ() ? HQ.pending().length + HQ.unread() : 0; const bpd = hasHQ() ? HQ.pending().length : 0;
    if (!NAV[UI.tab]) { const lg = LEGACY[UI.tab]; UI.tab = lg ? lg[0] : 'bureau'; if (lg) UI.sub[lg[0]] = lg[1]; } const tab = NAV[UI.tab] ? UI.tab : 'bureau'; const view = viewOf();
    let h = '<div class="top"><div class="topbar"><span class="brand">Man<b>dat</b></span><span class="date">' + E.fmtDate(s.date, false) + '</span>' + countdown() + aiDot + '<button class="slot' + (s.mp ? ' mp' : '') + '" id="slot" title="Changer de partie">' + (s.mp ? esc(s.mp.name) : 'Solo') + '</button>' +
      '<div class="stats"><div class="stat"><small>Heures</small><span class="num">' + p.hours + ' h</span><div class="hbar"><i style="width:' + (p.hoursMax ? p.hours / p.hoursMax * 100 : 0) + '%"></i></div></div>' +
      '<div class="stat"><small>' + (cmp ? 'Campagne' : 'Argent') + '</small><span class="num">' + E.eur(cmp ? cmp.recettes - cmp.depenses : p.cash) + '</span></div></div></div>' +
      faceBand(fc) + '</div><main id="main">';
    const subs = subsOf(tab);
    if (subs) h += '<div class="seg" role="tablist">' + subs.map(([k, l]) => '<button role="tab" data-sub="' + k + '" class="' + (view === k ? 'on' : '') + '">' + l + (k === 'sms' && un ? '<span class="badge">' + un + '</span>' : k === 'boucle' && bun ? '<span class="badge">' + (bpd || bun) + '</span>' : k === 'carnet' && casOut ? '<span class="badge">' + casOut + '</span>' : '') + '</button>').join('') + '</div>';
    h += (VIEWS()[view] || tBureau)();
    const nb = k => '<button data-nav="' + k + '" class="' + (tab === k ? 'on' : '') + '"' + (tab === k ? ' aria-current="page"' : '') + '>' + ico(k) + '<span>' + (k === 'bureau' && hasOF() && OF.mode() === 'mandat' ? 'Bureau' : NAV[k].l) + '</span>' + (k === 'msg' && (un + bpd) ? '<i class="badge">' + (un + bpd) + '</i>' : k === 'plus' && casOut ? '<i class="badge">' + casOut + '</i>' : '') + '</button>';
    h += '</main><nav class="bnav" aria-label="Navigation"><div class="bin">' + nb('bureau') + nb('agir') + '<button class="bnext" id="end"><b>' + (E.silence() ? 'Jour du vote' : 'Tour suivant') + '</b><span class="num">' + daysL(days) + '</span></button>' + nb('msg') + nb('plus') + '</div></nav>';
    $app.innerHTML = h;
    $app.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => go(b.dataset.nav));
    $app.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => go(tab, b.dataset.sub));
    document.getElementById('end').onclick = endTurn;
    document.getElementById('slot').onclick = async () => { await Store.save(); MP.leave(); UI.screen = 'home'; UI.hasSave = !!(await Store.peek('carriere')); UI.mpGames = await MP.myGames(); render(); };
    const so = $app.querySelector('.seg .on'); if (so && so.parentNode.scrollWidth > so.parentNode.clientWidth) so.parentNode.scrollLeft = so.offsetLeft - 20;
    bind(); notifyMs();
  }

  /* ---------- Accueil ---------- */
  function objective() {
    const s = S(), p = P(), ph = E.phase(); const party = p.party !== 'NEW';
    if (p.inelig && p.inelig > s.date) return { t: 'Traversée du désert', x: 'Vous êtes inéligible jusqu’au ' + E.fmtDate(p.inelig) + '. Entretenez votre image et votre réseau pour préparer le retour.', a: ['asso', 'dej', 'rdv'] };
    if (ph.nat) {
      const presOn = ph.cur.type === 'pres';
      if (presOn) return { t: 'Campagne nationale : la présidentielle', x: 'La présidentielle d’abord, les législatives trois semaines après. Le score de votre camp portera ou plombera votre circonscription.' + (p.cand ? '' : ' Pensez à vous déclarer pour les législatives.'), a: p.cand ? ['presi', 'porte', 'meeting'] : ['presi', 'porte', 'dej'], e: !p.cand && ph.el.type === 'leg' ? ph.el : (!p.cand ? s.elections.find(e => e.type === 'leg' && e.status === 'futur') : null), debate: !!p.cand && p.cand.el === ph.cur.id };
      if (!p.cand) return { t: 'Campagne nationale : les législatives', x: 'La présidentielle est jouée. Place aux législatives, dans la foulée.', a: ['porte', 'rdv', 'post'], e: ph.cur.status === 'futur' ? ph.cur : null };
    }
    if (p.cand) {
      const el = s.elections.find(e => e.id === p.cand.el);
      if (ph.id === 'attente') return ph.won ? { t: 'Élu·e dès le premier tour', x: 'Votre liste l’emporte au premier tour : pas de second tour pour vous. Le second tour n’a lieu que dans les communes où personne n’a dépassé 50 %. Le nouveau conseil sera installé dans quelques jours : remerciez vos colistiers et préparez vos premiers dossiers.', a: ['rdv', 'asso', 'post'] } : { t: 'Campagne terminée', x: 'Vous n’êtes pas qualifié·e pour le second tour. Remerciez vos soutiens, tirez les leçons, et préparez la suite.', a: ['rdv', 'asso', 'post'] };
      if (el.type === 'mun' && E.myPetite() && p.cand.mode !== 'colistier') {
        if (ph.id === 'entre2') return { t: 'Entre-deux-tours', x: 'Une semaine pour aller revoir ceux qui ont hésité. Au village, chaque voix compte.', a: ['porte', 'appart', 'marche'] };
        if (ph.id === 'campagne') return { t: 'Dernière ligne droite · J−' + ph.days, x: 'Réunion publique à la salle des fêtes, porte-à-porte, marché : allez voir tout le monde, une dernière fois.', a: ['porte', 'meeting', 'marche'] };
        const li = p.cand.liste; const pj = typeof HQ !== 'undefined' ? HQ.projet() : null;
        if (li && !li.closed && li.n < li.need) return { t: 'Préparer ' + el.label, x: 'Priorité : compléter la liste (' + li.n + '/' + li.need + ', dépôt le ' + E.fmtDate(li.dep) + '). Recrutez depuis la Feuille de route, et faites-vous connaître des habitants.', a: ['porte', 'asso', 'marche'] };
        if (pj && !pj.pub) return { t: 'Préparer ' + el.label, x: 'Écrivez votre projet pour le village (au moins deux propositions), puis publiez-le : les habitants veulent savoir ce que vous ferez.', a: ['mesure', 'porte', 'appart'] };
        return { t: 'Préparer ' + el.label, x: 'Liste et projet sont prêts : maintenant, le terrain. Porte-à-porte, marché, réunions d’appartement.', a: ['porte', 'appart', 'marche'] };
      }
      if (ph.id === 'entre2') return { t: 'Entre-deux-tours', x: 'Une semaine pour convaincre. Le débat d’entre-deux-tours et la mobilisation font la différence.', a: ['phoning', 'meeting', 'rdv'], debate: true };
      if (ph.id === 'campagne') return { t: 'Campagne officielle · J−' + ph.days, x: 'Meetings, débat télévisé, terrain. Gardez un œil sur le plafond de dépenses.', a: ['meeting', 'phoning', 'porte'], debate: true };
      if (p.cand.mode !== 'colistier' && p.cand.compte && !E.hasStaff('mandataire')) return { t: 'Préparer ' + el.label, x: 'Recrutez d’abord un mandataire financier : sans lui, impossible de lever des fonds.', a: ['recruter', 'mesure', 'porte'] };
      return { t: 'Préparer ' + el.label, x: 'Faites-vous connaître et remplissez le compte de campagne. Les débats s’ouvrent six semaines avant le scrutin.', a: ['levee', 'porte', 'mesure'] };
    }
    const e = s.elections.filter(x => x.status === 'futur' && (x.type !== 'pres' || p.noto.nat > 40 || p.presDesig === x.id)).sort((a, b) => a.d1 < b.d1 ? -1 : 1)[0];
    if (!e) return { t: 'Gouverner, durer', x: 'Aucune échéance programmée. Consolidez votre position.', a: ['permanence', 'rdv', 'post'] };
    const d = E.diffDays(s.date, e.d1);
    if (d <= 210 && E.LIST_T.includes(e.type)) return { t: e.label + ' : les listes se constituent', x: p.party === 'NEW' ? 'Conduisez la liste de votre mouvement.' : 'Le parti distribue les places : plus votre poids interne est fort (fédération, soutiens, rang), mieux vous êtes placé·e. Position estimée aujourd’hui : ' + E.listPos(e.type) + '.', a: ['tournee', 'mission', 'porte'], e };
    if (e.type === 'mun' && E.myPetite()) return d <= 210 ? { t: e.label + ' : montez votre liste', x: 'Pas d’investiture à demander : déclarez-vous, puis trouvez ' + Math.max(5, D.councilSize(E.commune().pop) - (E.commune().pop < 1000 ? 2 : 0)) + ' colistiers parmi les habitants.', a: [], e } : { t: 'Objectif : ' + e.label, x: 'Scrutin le ' + E.fmtDate(e.d1) + ', candidatures dans ' + Math.max(1, Math.round((d - 210) / 30)) + ' mois. D’ici là, faites-vous connaître des habitants : associations, marché, porte-à-porte.', a: ['porte', 'asso', 'marche'] };
    const io = party ? E.invOdds(e) : null; const iot = io ? (io.pre ? ' L’investiture vous est réservée.' : ' Chances d’investiture aujourd’hui : ' + io.pct + ' % (détail dans Plus › Parti).') : '';
    if (d <= 210) return { t: e.label + ' : les candidatures sont ouvertes', x: party ? 'Déclarez-vous. La commission d’investiture tranchera selon votre poids au parti et votre notoriété.' + iot : 'Déclarez-vous : sans parti, vous partez sans aide financière, mais libre.', a: [], e };
    const mois = Math.max(1, Math.round((d - 210) / 30));
    return { t: 'Objectif : ' + e.label, x: 'Scrutin le ' + E.fmtDate(e.d1) + ', candidatures dans ' + mois + ' mois. D’ici là, faites-vous connaître localement' + (party ? ' et prenez du poids au parti pour décrocher l’investiture.' + iot : ' et recrutez des militants pour votre mouvement.'), a: party ? ['porte', 'section', 'dej'] : ['porte', 'mouvement', 'dej'] };
  }
  function declBtns(e) { const rl = (P().rallied || {})[e.id]; if (rl) { const x = S().pnj[rl]; return '<p class="small" style="margin:0">Vous soutenez ' + esc(x ? x.name : 'le candidat du parti') + ', investi·e par le parti.</p>' + (e.type === 'mun' && x ? '<button class="btn" data-joinr="' + e.id + '">Rejoindre sa liste</button>' : ''); } if (E.LIST_T.includes(e.type)) return '<button class="btn primary" data-decl="' + e.id + '">' + (P().party === 'NEW' ? 'Conduire une liste' : 'Demander une place sur la liste') + '</button>'; const lost = (P().invLost || {})[e.id]; if (lost) return '<p class="small" style="margin:0">Investiture refusée pour cette élection : le parti a choisi ' + esc(lost) + '.</p>' + (e.type === 'mun' ? '<button class="btn" data-join="' + e.id + '">Rejoindre une liste</button>' : '');
    return e.type === 'mun' ? '<button class="btn primary" data-decl="' + e.id + '">Me porter candidat·e</button><button class="btn" data-join="' + e.id + '">Rejoindre une liste</button><p class="small muted" style="margin:6px 0 0">' + (E.myPetite() ? 'Vous conduirez une liste sans étiquette : il faudra ensuite trouver vos colistiers.' : 'Vous conduirez une liste : le parti doit d’abord vous investir.') + '</p>' : '<button class="btn primary" data-decl="' + e.id + '">Me porter candidat·e</button>'; }
  function quick(id) { const a = X.ACTIONS.find(x => x.id === id); if (!a) return ''; const av = X.avail(a); const c = X.costOf(a); return '<button class="qa" data-act="' + id + '"' + (av === true ? '' : ' disabled title="' + esc(av) + '"') + '><b>' + esc(a.l) + '</b><span>' + (a.h ? a.h + ' h' : '') + (c ? ' · ' + E.eur(c) : '') + '</span></button>'; }
  function spark(vals, w, hgt) {
    const v = vals.filter(x => x != null); if (v.length < 2) return ''; const mx = Math.max(...v, 5), mn = Math.min(...v, 0); const sx = (w - 8) / (v.length - 1);
    const pts = v.map((y, i) => [4 + i * sx, hgt - 4 - (y - mn) / (mx - mn || 1) * (hgt - 10)]);
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="var(--accent)" stroke-width="2" points="' + pts.map(p => p.join(',')).join(' ') + '"/><circle cx="' + pts[pts.length - 1][0] + '" cy="' + pts[pts.length - 1][1] + '" r="3.5" fill="var(--accent)"/></svg>';
  }
  function natBlock() {
    const s = S(), p = P(); const n = s.national; const ev = (s.recentEv || [])[0]; const myP = p.party !== 'NEW' ? p.party : null; const inGov = myP && n.gov.includes(myP);
    const eff = myP ? E.natTerm({ party: myP, climK: 1 - 0.6 * (p.distance || 0) }, X.curType() || 'mun') : 0;
    return '<div class="card nat" style="margin-top:14px"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px"><div style="flex:1;min-width:220px"><div class="eyebrow">' + lvlB('national') + ' Actualité nationale</div>' + (ev ? '<div style="font:600 17px/1.3 var(--f-display);margin-top:4px">' + esc(ev.t) + '</div><div class="muted small">' + esc(ev.d || '') + '</div><div class="row" style="margin-top:8px"><button class="btn sm primary" data-react="' + ev.id + '">Réagir · 2 h</button></div>' : '<div class="muted">Actualité calme.</div>') + '</div>' +
      '<div style="min-width:180px"><div class="eyebrow">Exécutif</div><div class="big2 num">' + r0(n.approval ?? 30) + ' %</div><div class="muted small">de popularité</div>' + (myP ? '<div class="small" style="margin-top:6px">Effet national sur votre camp : <b style="color:' + (eff >= 0 ? 'var(--good)' : 'var(--bad)') + '">' + (eff >= 0 ? 'porteur' : 'pénalisant') + '</b>' + (inGov ? ' (au pouvoir : vote sanction)' : '') + ((p.distance || 0) > 0.2 ? ' · atténué par vos distances' : '') + '</div>' : '') + '</div></div></div>';
  }
  function estBlock() {
    const s = S(), p = P(); const es = s.est || E.estimate(); if (!es) return '';
    const hist = (s.hist || []).filter(x => x.el === es.el).map(x => x.est); const prev = hist.length > 1 ? hist[hist.length - 2] : null; const d = prev != null ? es.pct - prev : null;
    let h = '<div class="grid" style="margin-top:14px"><div class="c7 card est"><div class="eyebrow">' + elB(es.el) + ' ' + esc(es.label) + ' · ' + esc(es.unit) + '</div><div class="row" style="align-items:flex-end;gap:16px;margin-top:6px"><div><div class="muted small">' + (es.hypo ? 'Si vous étiez candidat·e demain' : 'Si l’élection avait lieu demain') + '</div>' + (es.rank ? '<div class="big num">' + E.pct(es.pct) + '</div>' : '<div class="big2" style="color:var(--bad)">Éliminé·e</div><div class="muted small">Le second tour se joue sans vous.</div>') + '<div class="small">' + (!es.rank ? '' : (es.list ? 'Votre liste' + (es.seats != null ? ' : ' + es.seats + ' siège(s) estimé(s), vous êtes en position ' + es.pos : '') + ' · ' : '') + es.rank + '<sup>e</sup> sur ' + es.n + (d != null ? ' · <span style="color:' + (d >= 0 ? 'var(--good)' : 'var(--bad)') + '">' + (d >= 0 ? '▲ +' : '▼ ') + d.toFixed(1).replace('.', ',') + ' pt depuis le dernier tour</span>' : '')) + '</div></div><div style="flex:1;min-width:140px">' + spark(hist, 240, 64) + '</div></div>' + bars(es.rows.slice(0, 4), Math.max(...es.rows.map(r => r.pct))) + '<div class="muted small">Estimation interne, sans marge d’erreur : elle bouge avec chacune de vos actions.</div></div>';
    const rv = (s.rivals || []).map(id => s.pnj[id]).filter(Boolean);
    h += '<div class="c5 card"><h3>Vos adversaires</h3>' + (rv.length ? rv.map(x => { const row = es.rows.find(r => r.id === x.id); return '<div class="li"><div class="grow"><div class="row" style="gap:6px"><b>' + esc(x.name) + '</b>' + pill(x.party) + (row ? '<span class="num muted small">' + E.pct(row.pct) + '</span>' : '') + '</div><div class="muted small">' + esc(x.mandat || ROLE_L[x.role] || '') + ' · relation ' + r0(x.rel) + (x.enemy ? ' · <span style="color:var(--bad)">ennemi·e</span>' : '') + '</div>' + (x.prog && x.prog.length ? '<div class="small" style="margin-top:4px"><span class="muted">Propose :</span> ' + x.prog.slice(0, 2).map(pr => '<button class="linkbtn" data-atk="' + x.id + ':' + pr.id + '">' + esc(pr.label) + '</button>').join(' · ') + '</div>' : '') + '<div class="row" style="gap:6px;margin-top:6px"><button class="btn sm" data-rdv="' + x.id + '">Rencontrer</button><button class="btn sm" data-defi="' + x.id + '">Défier en débat</button><button class="btn sm ghost" data-enq="' + x.id + '">Enquêter</button></div></div></div>'; }).join('') : '<p class="muted">Pas encore d’adversaire identifié.</p>') + ((s.turnRival || []).length ? '<div class="sep"></div><div class="eyebrow">Ce tour</div>' + s.turnRival.map(t => '<div class="small" style="margin-top:4px">' + esc(t) + '</div>').join('') : '') + '</div></div>';
    return h;
  }
  function tBureau() {
    const s = S(), p = P(); const o = objective(); const pop = E.popularity();
    const une = s.news.slice(0, 4).find(n => n.about === 'pj') || s.news[0];
    const md = hasOF() ? OF.mode() : 'libre';
    const cs0 = campSteps(); let h = guideCard() + (md === 'mandat' ? bureauElu() + '<div style="height:12px"></div>' : md === 'both' ? eluBar() : '') + (cs0 ? cs0 + '<div style="height:12px"></div>' : '') + dashTiles() + '<div class="obj"><div class="eyebrow">Votre objectif</div><h2>' + esc(o.t) + '</h2><p>' + esc(o.x) + '</p>';
    if (o.e) h += '<div class="row">' + declBtns(o.e) + '</div>';
    if (p.cumul && E.cumulConflict()) h += '<div class="row"><button class="btn primary" data-cumul>Régler le cumul de mandats (avant le ' + E.fmtDate(p.cumul.due) + ')</button></div>';
    if (o.a.length) h += '<div class="qas">' + o.a.map(quick).join('') + '</div>';
    if (o.debate && p.cand && p.cand.mode !== 'colistier') { const max = E.phase().id === 'entre2' ? 2 : 1; h += '<div class="row" style="margin-top:8px"><button class="btn" id="debat"' + (p.cand.debates < max && p.hours >= 4 ? '' : ' disabled') + '>Débat télévisé · 4 h</button></div>'; }
    const lp = (s.lastPlan || []).filter(it => { const a = X.ACTIONS.find(x => x.id === it.id); return a && X.avail(a) === true; });
    if (lp.length) { const hh = lp.reduce((t, it) => t + (X.ACTIONS.find(x => x.id === it.id).h || 0), 0); h += '<div class="row" style="margin-top:8px"><button class="btn" data-replan' + (hh <= p.hours ? '' : ' disabled') + '>↻ Refaire mon agenda précédent · ' + lp.length + ' action' + (lp.length > 1 ? 's' : '') + ', ' + hh + ' h</button></div>'; }
    h += '<div class="left">Il vous reste <b>' + p.hours + ' h</b> ce tour. <button class="linkbtn" data-go="agir">Toutes les actions</button> · <button class="linkbtn" data-plan>Composer mon agenda</button></div></div>';
    h += msCard();
    if (S().mp) MP.waitingForMe().forEach(w => { h += '<button class="smsbar" data-go="plus:joueurs" style="border-left-color:#5a78c2"><span><b>' + esc(w.name) + ' vous attend</b><span class="cp">Avancez jusqu’au scrutin : il ne peut pas voter sans vous</span></span></button>'; });
    if (S().mp && S().mp.wait) h += '<button class="smsbar" data-go="plus:joueurs" style="border-left-color:var(--warn)"><span><b>Rendez-vous électoral</b><span class="cp">Vous attendez d’autres joueurs pour un scrutin</span></span></button>';
    h += boucleBar();
    const un = LF.unread(); if (un) { const last = S().sms.find(m => !m.read); h += '<button class="smsbar" data-go="msg:sms">' + avatar(last.name, last.party) + '<span><b>' + esc(last.name) + '</b><span class="cp">' + esc(last.text) + '</span></span><span class="badge">' + un + '</span></button>'; }
    h += estBlock() + whyCard() + natBlock();
    h += '<div class="grid" style="margin-top:14px"><div class="c8"><div class="une">' + (une && une.about === 'pj' ? '<div class="flash">VOUS</div>' : '') + '<div class="mast"><b>' + esc(une ? une.media : 'Le Dauphinois') + '</b><span>' + E.fmtDate(s.date) + '</span></div><h2>' + esc(une ? une.title : 'Calme plat avant la tempête') + '</h2>' + (une && une.body ? '<p>' + esc(une.body) + '</p>' : '') + '</div></div>';
    h += '<div class="c4 card"><div class="eyebrow">' + esc(p.rank) + '</div><h3 style="font-size:21px;margin:4px 0 6px">' + esc(p.name) + '</h3><div class="row">' + (p.party === 'NEW' ? pill('DIV', p.movement) : pill(p.party)) + '<span class="muted">' + esc(E.commune().name) + '</span></div>' +
      '<div class="mini">' + [['Popularité', (pop >= 0 ? '+' : '') + r0(pop), 50 + pop / 2, pop >= 0 ? 'var(--good)' : 'var(--bad)'], ['Notoriété', r0(Math.max(p.noto.commune, p.noto.circo)), Math.max(p.noto.commune, p.noto.circo)], ['Crédibilité', r0(p.cred), p.cred], p.party === 'NEW' ? ['Militants', p.militants, Math.min(100, p.militants)] : ['Poids au parti', r0(p.std), p.std]].map(([l, v, g, c]) => '<div><span>' + l + '</span><b class="num">' + v + '</b>' + gauge(g, c) + '</div>').join('') + '</div>' +
      '<div class="eyebrow" style="margin-top:10px">Mandats</div>' + (p.mandats.length ? p.mandats.map(m => '<div style="margin-top:3px">' + esc(m.label) + '</div>').join('') : '<div class="muted" style="margin-top:3px">Aucun pour l’instant</div>') + '</div>';
    if (p.cand) { const el = s.elections.find(e => e.id === p.cand.el); const c = p.cand.compte;
      h += '<div class="c6 card"><h3>Votre candidature</h3><div><b>' + esc(el.label) + '</b> · ' + esc(E.unit(p.cand.key).name) + '</div><div class="muted">' + (p.cand.mode === 'colistier' ? 'Sur la liste de ' + esc(s.pnj[p.cand.listOf].name) + ', position ' + p.cand.listPos : p.cand.invested ? 'Investi·e par ' + esc(partyName()) : 'Candidature dissidente') + ' · scrutin le ' + E.fmtDate(el.status === 't1' ? el.d2 : el.d1) + '</div>' +
        (c ? '<div class="sep"></div><div class="row" style="justify-content:space-between"><span>Dépenses</span><span class="num">' + E.eur(c.depenses) + (c.plafond ? ' / ' + E.eur(c.plafond) : '') + '</span></div>' + (c.plafond ? gauge(c.depenses / c.plafond * 100, c.depenses > c.plafond * 0.85 ? 'var(--warn)' : 'var(--paper)') : '') + '<div class="row" style="justify-content:space-between;margin-top:6px"><span>Solde du compte</span><span class="num">' + E.eur(c.recettes - c.depenses) + '</span></div>' : '') +
        '<div class="row" style="margin-top:10px"><button class="linkbtn" id="retire">Retirer ma candidature</button></div></div>'; }
    h += '<div class="c12 card"><h3>Calendrier</h3><div class="cal">' + s.elections.filter(e => e.status !== 'fini').sort((a, b) => a.d1 < b.d1 ? -1 : 1).map(e => { const d = E.diffDays(s.date, e.d1); const can = !p.cand && e.status === 'futur' && d <= 210 && !(p.inelig && p.inelig > s.date) && (e.type !== 'pres' || p.presDesig === e.id || p.party === 'NEW'); return '<div class="' + (p.cand && p.cand.el === e.id ? 'on' : '') + '"><b>' + esc(e.label) + '</b><span>' + E.fmtDate(e.d1, true) + '</span>' + (can ? '<div class="row" style="gap:4px;margin-top:6px">' + declBtns(e).replace(/class="btn primary"/g, 'class="btn sm primary"').replace(/class="btn"/g, 'class="btn sm"') + '</div>' : '') + '</div>'; }).join('') + '</div></div>';
    return h + '</div>';
  }

  /* ---------- Actions ---------- */
  /* ---------- Agir : campagne / mandat / vie politique ---------- */
  const NATMED = new Set(['revel', 'quotlib', 'info24']);
  const pnjNat = x => ['leader', 'cadre', 'teteliste'].includes(x.role) || (x.role === 'journaliste' && NATMED.has(x.territory));
  const scopeOk = x => !UI.actScope || ['depute', 'candidat'].includes(x.role) || (UI.actScope === 'national') === pnjNat(x);
  const curScope = () => UI.scope || X.curLevel() || 'local';
  const lvlB = l => '<span class="lvl ' + l + '">' + (l === 'local' ? 'Local' : 'National') + '</span>';
  function scopeSwitch(note) {
    const sc = curScope();
    return '<div class="scope" role="tablist">' + [['local', 'Local', E.commune().name + ' · Isère'], ['national', 'National', 'Paris · France entière']].map(([k, l, d]) => '<button role="tab" data-scope="' + k + '" class="' + k + (sc === k ? ' on' : '') + '"><b>' + l + '</b><span>' + esc(d) + '</span></button>').join('') + '</div>' + (note ? '<p class="muted small" style="margin:-4px 0 12px">' + note + '</p>' : '');
  }
  const ELV = { mun: ['local', 'Scrutin local'], dep: ['local', 'Scrutin local · canton'], reg: ['local', 'Scrutin régional'], sen: ['local', 'Sénatoriales · grands électeurs de l’Isère'], leg: ['national', 'Scrutin national · campagne dans votre circonscription'], pres: ['national', 'Scrutin national'], euro: ['national', 'Scrutin européen · liste nationale'] };
  const elB = id => { const e = S().elections.find(x => x.id === id); return e ? lvlB((ELV[e.type] || ['local'])[0]) : ''; };
  function campCtx() {
    const s = S(), p = P();
    if (p.cand) { const el = s.elections.find(e => e.id === p.cand.el); if (el && el.status !== 'fini') return { el, cand: true }; }
    const e = E.nextElection(); if (e && e.status === 'futur' && E.diffDays(s.date, e.d1) <= 210) return { el: e, cand: false };
    return null;
  }
  const CAMP_G = [
    ['Sur le terrain', 'Porte-à-porte, tracts, réunions, affiches', ['porte', 'marche', 'appart', 'affiches', 'phoning', 'focus']],
    ['Mobiliser', 'Meetings, ténors du parti, numérique', ['meeting', 'figure', 'numerique', 'presi']],
    ['Face aux adversaires', 'Débats, accords, désistements', ['defier', 'accord']],
    ['Moyens', 'Dons, sondages, congés, parrainages', ['levee', 'sondage', 'conges', 'soutiens']]
  ];
  const CAMP_IDS = new Set(CAMP_G.flatMap(g => g[2]));
  const VIE_G = [
    ['Sur le terrain', 'Associations, porte-à-porte, marchés', ['asso', 'porte', 'marche', 'appart', 'focus']],
    ['Parti', 'Section, fédération, congrès, courants', ['section', 'mission', 'tournee', 'contribution', 'reseau', 'distance', 'mouvement']],
    ['Médias', 'Interviews, tribunes, réseaux sociaux', ['interview', 'dej', 'post', 'tribune', 'off', 'actu', 'training']],
    ['Propositions', 'Mesures, dossiers, conférences', ['mesure', 'defendre', 'conference', 'dossier_tech']],
    ['Réseau', 'Rendez-vous, défis, accords, soutiens', ['rdv', 'defier', 'accord', 'soutiens']],
    ['Équipe', 'Collaborateurs, emploi, loyauté', ['recruter', 'plein', 'emploi', 'audit']],
    ['Coups tordus', 'Enquêtes, fuites, trolls… à vos risques', ['enquete', 'fuite', 'trolls', 'taupe', 'occulte']]
  ];
  const SCOPE = { asso: 'local', porte: 'local', marche: 'local', appart: 'local', focus: 'local', section: 'local', mission: 'local', tournee: 'national', contribution: 'national', reseau: 'national', distance: 'national', actu: 'national', soutiens: 'national', mouvement: 'national' };
  const MQ = { maire: ['conseil', 'permanence', 'appliquer'], adjoint: ['conseil', 'permanence', 'appliquer'], conseiller_municipal: ['conseil', 'permanence', 'appliquer'], cd: ['permanence', 'circo', 'appliquer'], cr: ['permanence', 'circo'], depute: ['appliquer'], senateur: ['permanence', 'circo', 'amend'], meuro: ['permanence', 'circo'] };
  const MLOC = new Set(['maire', 'adjoint', 'conseiller_municipal', 'cd', 'cr', 'interco']);
  const actOk = id => { const a = X.ACTIONS.find(x => x.id === id); return !!a && X.avail(a) === true; };
  function actCard(a) { const av = X.avail(a); const cost = X.costOf(a); return '<button class="act ' + (av === true ? '' : 'off') + '" data-act="' + a.id + '"><span class="t">' + esc(a.l) + '<span class="num">' + (a.h ? a.h + ' h' : '') + (cost ? ' · ' + E.eur(cost) : '') + '</span></span><span class="d">' + esc(a.d) + '</span>' + (av === true ? '' : '<span class="why">' + esc(av) + '</span>') + '</button>'; }
  function famTile(t, d, ids, dark) { const n = ids.filter(actOk).length; if (!n) return ''; return '<button class="fam' + (dark ? ' dark' : '') + '" data-fam="' + esc(JSON.stringify([t, ids])) + '"><b>' + esc(t) + '</b><span class="d">' + esc(d) + '</span><span class="n num">' + n + ' possible' + (n > 1 ? 's' : '') + '</span></button>'; }
  function sugBlock(ids) { const L = [...new Set(ids)].filter(actOk).slice(0, 3); return L.length ? '<div class="eyebrow" style="margin:4px 0 8px">Conseillé maintenant</div><div class="acts sug">' + L.map(id => actCard(X.ACTIONS.find(x => x.id === id))).join('') + '</div>' : ''; }
  async function runScoped(id) { const v = viewOf(); UI.actScope = v === 'vie' || v === 'programme' ? curScope() : null; try { await runAction(id); } finally { UI.actScope = null; } }
  function famSheet(t, ids) {
    const all = ids.map(id => X.ACTIONS.find(x => x.id === id)).filter(Boolean); const ok = all.filter(a => X.avail(a) === true), ko = all.filter(a => X.avail(a) !== true);
    const v = viewOf(); const sub = v === 'vie' ? ' · ' + (curScope() === 'local' ? 'local' : 'national') : v === 'campagne' ? ' · campagne' : '';
    const { m, close } = modal('<h2>' + esc(t) + '<span class="muted" style="font:500 14px var(--f-ui)">' + sub + '</span></h2><p class="muted small" style="margin-top:-4px">' + P().hours + ' h restantes ce tour</p><div class="acts one">' + ok.map(actCard).join('') + '</div>' + (ko.length ? '<details class="ko"><summary>' + ko.length + ' indisponible(s)</summary><div class="acts one" style="margin-top:10px">' + ko.map(actCard).join('') + '</div></details>' : '') + '<div class="foot"><button class="btn ghost" data-x>Fermer</button></div>', null, 'sheet');
    m.querySelector('[data-x]').onclick = close;
    m.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { if (b.classList.contains('off')) return; close(); runScoped(b.dataset.act); });
  }

  /* --- Campagne --- */
  const tq = (k, l, sub) => '<button class="qa" data-tm="' + k + '"><b>' + l + '</b><span>' + sub + '</span></button>';
  function teamPanel() {
    const p = P(), s = S(); const t = TM.team(); const f = TM.force(); const mc = t.motiv < 30 ? 'var(--bad)' : t.motiv < 55 ? 'var(--warn)' : 'var(--good)'; const c = p.cand && p.cand.compte;
    let h = '<div class="card"><h3>Militants</h3><p class="muted small" style="margin:-4px 0 10px">Vos troupes agissent à chaque tour selon vos consignes, sans vous coûter d’heures.</p><div class="kpis">' + kpi('Militants actifs', f + (t.renforts ? '<span class="muted small"> dont ' + t.renforts + ' renforts</span>' : ''), null, null, f < 5 ? 'Trop peu : réunions d’appartement et popularité en recrutent' : '') + kpi('Motivation', r0(t.motiv) + ' %', t.motiv, mc, t.motiv < 30 ? 'Des militants décrochent' : t.motiv > 72 ? 'L’enthousiasme attire du monde' : 'La fatigue monte en fin de campagne') + kpi('Formation', r0(t.skill) + ' %', t.skill) + '</div>';
    if (t.last && t.last.pw) h += '<p class="small" style="margin:10px 0 0"><span class="muted">Dernier tour :</span> force de frappe <b class="num">' + t.last.pw + '</b>' + (t.last.out.porte ? ', porte-à-porte surtout à ' + esc(t.last.out.porte) : '') + '.</p>';
    h += '<div class="eyebrow" style="margin-top:14px">Consignes</div><div class="chips" style="padding-top:6px">' + Object.entries(TM.PRESETS).map(([k, x]) => '<button data-tpre="' + k + '"' + (JSON.stringify(x.a) === JSON.stringify(t.alloc) ? ' class="on"' : '') + '>' + esc(x.l) + '</button>').join('') + '</div>';
    h += TM.KEYS.map(k => '<div class="alloc"><div class="grow"><b>' + esc(TM.TASKS[k].l) + '</b><div class="muted small">' + esc(TM.TASKS[k].d) + '</div><div class="hbar" style="width:100%;height:5px;margin-top:5px"><i style="width:' + t.alloc[k] + '%"></i></div></div><button class="btn sm" data-tal="' + k + ':-10" aria-label="Moins">−</button><span class="num pc">' + t.alloc[k] + ' %</span><button class="btn sm" data-tal="' + k + ':10" aria-label="Plus">+</button></div>').join('');
    const zs = curZones(); if (zs) h += '<div class="eyebrow" style="margin-top:8px">Secteur prioritaire du porte-à-porte</div><div class="chips">' + zs.map(z => '<button data-focus="' + z.id + '" class="' + (p.focusZone === z.id ? 'on' : '') + '">' + esc(z.name) + ' <span class="num">' + r0(z.cover) + ' %</span></button>').join('') + '</div>';
    h += '<div class="eyebrow" style="margin-top:12px">Animer les troupes</div><div class="qas">' + tq('reunion', 'Réunion de mobilisation', '2 h') + tq('pot', 'Pot au local', '2 h · 250 €') + tq('formation', 'Former les militants', '3 h') + '</div></div>';
    h += '<div class="card" style="margin-top:12px"><h3>' + (p.party === 'NEW' ? esc(p.movement) : 'Le parti') + '</h3>' + (p.party === 'NEW' ? '<p class="muted small" style="margin:0">Sans parti, ni renforts ni financement : vos militants et vos dons sont vos seules ressources.</p><div class="qas" style="margin-top:8px">' + quick('mouvement') + '</div>' :
      '<div class="kpis">' + kpi('Soutien de la fédération', r0(p.fedSup), p.fedSup) + kpi('Investiture', p.cand.invested ? 'Investi·e' : 'Dissident·e') + (c ? kpi('Aide du parti', E.eur(c.aide)) : '') + '</div><div class="qas" style="margin-top:10px">' + tq('renforts', 'Demander des renforts militants', '1 h · 3 semaines') + tq('rallonge', 'Demander une rallonge financière', '1 h · une fois') + quick('figure') + '</div>') + '</div>';
    const need = ['dircamp', 'mandataire', 'terrain', 'com']; 
    h += '<div class="card" style="margin-top:12px"><h3>Équipe de campagne</h3><div class="list">' + need.map(r => { const x = p.staff.find(y => y.role === r); const ms = x ? E.MISSIONS[x.mission || 'repos'] : null; return '<div class="li"><div class="grow"><div class="eyebrow">' + esc(D.STAFF_ROLES[r].l) + '</div>' + (x ? '<b>' + esc(x.name) + '</b> <span class="muted small">· ' + esc(ms.l) + '</span>' : '<span style="color:var(--warn)">À pourvoir</span> <span class="muted small">· ' + esc(D.STAFF_ROLES[r].d) + '</span>') + '</div></div>'; }).join('') + p.staff.filter(x => !need.includes(x.role)).map(x => '<div class="li"><div class="grow"><div class="eyebrow">' + esc(D.STAFF_ROLES[x.role].l) + '</div><b>' + esc(x.name) + '</b> <span class="muted small">· ' + esc(E.MISSIONS[x.mission || 'repos'].l) + '</span></div></div>').join('') + '</div><div class="row" style="margin-top:10px;gap:6px">' + quick('recruter') + '<button class="btn sm" data-go="plus:equipe">Confier des missions</button></div></div>';
    if (c) h += '<div class="card" style="margin-top:12px"><h3>Compte de campagne</h3><div class="kpis">' + kpi('Solde', E.eur(c.recettes - c.depenses)) + kpi('Dépenses', E.eur(c.depenses) + (c.plafond ? ' / ' + E.eur(c.plafond) : ''), c.plafond ? c.depenses / c.plafond * 100 : null, c.plafond && c.depenses > c.plafond * 0.85 ? 'var(--warn)' : 'var(--paper)') + kpi('Dons', E.eur(c.dons)) + '</div></div>';
    return h;
  }
  function tCampagne() {
    const cc = campCtx(); if (!cc) return '<div class="card"><p class="muted" style="margin:0">Aucune élection en vue.</p></div>';
    const s = S(), p = P(); const el = cc.el; const lv = ELV[el.type] || ['local', '']; const d = el.status === 't1' ? el.d2 : el.d1; const dl = Math.ceil(E.diffDays(s.date, d)); const es = s.est;
    let h = '<div class="card camphead"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:nowrap"><div style="min-width:0"><div class="row" style="gap:6px">' + lvlB(lv[0]) + '<span class="muted small">' + esc(lv[1]) + '</span></div><h2 style="margin:6px 0 2px;font-size:21px">' + esc(el.label) + (el.status === 't1' ? ' · 2nd tour' : '') + '</h2><div class="muted small">' + (cc.cand ? esc(E.unit(p.cand.key).name) + ' · ' + (p.cand.mode === 'colistier' ? 'colistier·ère, position ' + p.cand.listPos : p.cand.invested ? 'investi·e' : 'dissident·e') : 'Vous n’êtes pas candidat·e') + '</div></div><div style="text-align:right;flex:0 0 auto"><div class="big2 num">J−' + dl + '</div><div class="muted small">' + E.fmtDate(d, true) + '</div></div></div>';
    if (cc.cand && es && es.el === el.id) h += '<div class="row" style="gap:14px;margin-top:10px;align-items:baseline"><span class="big2 num">' + (es.rank ? E.pct(es.pct) : '—') + '</span><span class="small">' + (es.rank ? es.rank + '<sup>e</sup> sur ' + es.n + ' dans votre estimation' : 'éliminé·e') + '</span></div>';
    if (!cc.cand) { const can = el.status === 'futur' && !(p.inelig && p.inelig > s.date) && (el.type !== 'pres' || p.presDesig === el.id || p.party === 'NEW'); return h + (can ? '<p class="small" style="margin:10px 0 8px">Déclarez-vous pour débloquer la campagne : équipe, militants, compte de campagne, actions de terrain.</p><div class="row" style="gap:6px">' + declBtns(el) + '</div>' : '<p class="muted small" style="margin:10px 0 0">Candidature impossible pour l’instant.</p>') + '</div>'; }
    h += '</div>';
    const cs = UI.csub || 'actions'; if (cs !== 'actions') h = '';
    if (hasHQ() && HQ.needDC()) h += '<div style="margin-top:12px">' + dcCard() + '</div>';
    if (cs === 'equipe') return h + teamWork() + '<div style="margin-top:12px"></div>' + (hasHQ() && HQ.dc() ? dcCard() + '<div style="margin-top:12px"></div>' : '') + teamPanel();
    if (cs === 'adv') return h + advPanel();
    if (cs === 'terrain') return h + tTerrain();
    const li = p.cand && p.cand.liste; if (li && hasHQ()) h += li.closed ? '' : '<div class="card" style="margin-top:12px;border-left:3px solid var(--warn)"><h3>Constituer la liste <span class="muted">dépôt le ' + E.fmtDate(li.dep, true) + '</span></h3><div class="kpis">' + kpi('Colistiers', Math.min(li.n, li.need) + ' / ' + li.need, Math.min(100, li.n / li.need * 100), li.n >= li.need ? 'var(--good)' : 'var(--warn)') + '</div><p class="muted small" style="margin:8px 0">' + esc(HQ.parityNote(li)) + ' Une liste incomplète au dépôt est irrecevable. Votre équipe recrute chaque tour ; vous pouvez accélérer.</p>' + (li.n < li.need ? '<div class="row" style="gap:6px"><button class="btn sm" data-hrec="0">Recruter des colistiers · 2 h</button></div>' : '') + '</div>';
    h += planBtn();
    h += sugBlock((objective().a || []).filter(id => CAMP_IDS.has(id)).concat(E.daysLeft() < 10 ? ['phoning', 'porte', 'meeting'] : ['porte', 'meeting', 'appart', 'levee']));
    h += '<div class="eyebrow" style="margin:16px 0 8px">Toutes les actions de campagne</div><div class="fams">' + CAMP_G.map(([t, d, ids]) => famTile(t, d, ids)).join('') + '</div>';
    return h;
  }

  /* --- Mandats --- */
  function mandatCard(m) {
    const qs = (MQ[m.type] || []).map(quick).join('');
    if (m.type === 'maire') return mairieCard().replace('<h3>', '<h3>' + lvlB('local') + ' ').replace('<div class="qas" style="margin-top:8px">', '<div class="qas" style="margin-top:8px">' + qs);
    if (m.type === 'depute') return deputeCard().replace('<h3>', '<h3>' + lvlB('national') + ' ').replace('<div class="qas" style="margin-top:10px">', '<div class="qas" style="margin-top:10px">' + qs);
    if (m.type === 'president') return presCard().replace('<h3>', '<h3>' + lvlB('national') + ' ');
    return '<div class="card"><h3>' + lvlB(MLOC.has(m.type) ? 'local' : 'national') + ' ' + esc(m.label) + '</h3><div class="muted small">' + (m.type === 'interco' ? 'Comme maire, vous siégez à l’intercommunalité : routes, eau, déchets, développement économique. ' : '') + 'Depuis ' + E.fmtDate(m.since, true) + (m.majority === false ? ' · dans l’opposition' : m.majority ? ' · dans la majorité' : '') + '</div><div class="qas" style="margin-top:10px">' + qs + '</div></div>';
  }
  function tMandat() {
    const p = P(); if (!p.mandats.length) return '<div class="card"><p class="muted" style="margin:0">Aucun mandat. Gagnez une élection : vous voterez des budgets, lancerez des chantiers, déposerez des lois, et serez jugé·e sur vos actes.</p></div>';
    const loc = p.mandats.filter(m => MLOC.has(m.type)), nat = p.mandats.filter(m => !MLOC.has(m.type));
    let h = planBtn() + '<p class="muted small" style="margin:0 0 12px">Ce que vous faites ici construit votre bilan : il sera jugé à la prochaine élection.</p>';
    if (hasOF() && OF.inOffice()) h += parapheur(false) + (OF.isMaire() ? '<div style="margin-top:12px">' + pjCard() + '</div>' : '') + (OF.isDep() ? '<div style="margin-top:12px">' + hemiCard() + '</div>' : '') + '<div style="margin-top:12px"></div>';
    h += bilanCard() + (hasHQ() && HQ.posts().length ? '<div style="margin-top:12px">' + cabCard() + '</div>' : '');
    if (loc.length) h += '<h2 class="sec">Dans l’Isère</h2><div class="stack">' + loc.map(mandatCard).join('') + '</div>';
    if (nat.length) h += '<h2 class="sec">' + (loc.length ? '' : '') + 'À Paris</h2><div class="stack">' + nat.map(mandatCard).join('') + '</div>';
    return h;
  }

  /* --- Vie politique --- */
  function tVie() {
    const sc = curScope(); const cc = campCtx(); const candOn = cc && cc.cand;
    let h = scopeSwitch(sc === 'local' ? 'Votre ancrage : commune, section, fédération, presse régionale.' : 'Votre stature : direction du parti, médias nationaux, débat national.');
    if (candOn) h += '<button class="smsbar" data-go="agir:campagne" style="margin:0 0 12px"><span class="lvl ' + (ELV[cc.el.type] || ['local'])[0] + '">Campagne</span><span><b>' + esc(cc.el.label) + '</b><span class="cp">Actions de campagne, militants et équipe : onglet Campagne</span></span></button>';
    const inScope = id => (SCOPE[id] || sc) === sc && !(candOn && CAMP_IDS.has(id));
    const ex = sc === 'local' ? ['porte', 'section', 'asso', 'dej', 'mesure'] : ['actu', 'interview', 'tribune', 'contribution', 'tournee'];
    h += planBtn();
    h += sugBlock((objective().a || []).concat(ex).filter(inScope));
    h += '<div class="eyebrow" style="margin:16px 0 8px">Par objectif</div><div class="fams">' + VIE_G.map(([t, d, ids]) => famTile(t, d, ids.filter(inScope), t === 'Coups tordus')).join('') + '</div>';
    return h;
  }

  /* ---------- agenda de la période ---------- */
  const NOPLAN = new Set(['plein', 'emploi', 'occulte', 'dissoudre', 'enquete']);
  const plannable = a => !a.ai && (!a.input || ['zone', 'seg', 'theme', 'focus'].includes(a.input)) && !NOPLAN.has(a.id);
  const planOk = a => { const v = X.avail(a); return v === true || /^Pas assez d’heures|^Fonds insuffisants/.test(v); };
  function weakestSeg() { const im = P().image; return D.SEG_IDS.slice().sort((x, y) => (im[x] || 0) - (im[y] || 0))[0]; }
  function defParam(a) {
    if (a.input === 'zone') { const zs = curZones(); if (zs) { const n = (UI.plan || []).filter(x => x.o && x.o.zone).length; const ord = zs.slice().sort((x, y) => (y.id === P().focusZone) - (x.id === P().focusZone) || x.cover - y.cover); return { zone: ord[n % ord.length].id }; } return { seg: weakestSeg() }; }
    if (a.input === 'seg') return { seg: weakestSeg() };
    if (a.input === 'theme') { const t = Object.entries(S().national.salience).sort((x, y) => y[1] - x[1])[0]; return { theme: t ? t[0] : Object.keys(D.THEMES)[0] }; }
    return {};
  }
  function planState() { if (UI.planDate !== S().date + ':' + (S().half || 0)) { UI.plan = []; UI.planDate = S().date + ':' + (S().half || 0); } return UI.plan; }
  function planBudget() { const p = P(); const plan = planState(); let hrs = p.hours, cost = 0; plan.forEach(it => { const a = X.ACTIONS.find(x => x.id === it.id); if (it.id === 'conges') hrs += 20; hrs -= a.h; cost += X.costOf(a) || 0; }); return { left: hrs, cost }; }
  function planTemplates() {
    const cc = campCtx(); const camp = cc && cc.cand; const p = P(); const T = [];
    if (camp) T.push(['Semaine terrain', ['conges', 'porte', 'porte', 'marche', 'appart', 'phoning']], ['Se faire connaître', ['affiches', 'marche', 'numerique', 'marche', 'porte']], ['Sprint final', ['conges', 'phoning', 'porte', 'phoning', 'marche']], ['Lever des fonds', ['levee', 'levee', 'porte']]);
    if (p.mandats.length) T.push(['Semaine d’élu·e', ['permanence', 'conseil', 'circo', 'amend', 'permanence']]);
    if (!camp) T.push(['Implantation locale', ['asso', 'marche', 'section', 'porte']], ['Monter dans le parti', ['section', 'mission', 'dossier_tech']], ['Stature nationale', ['tournee', 'dossier_tech', 'training']]);
    return T.map(([l, ids]) => [l, ids.filter(id => { const a = X.ACTIONS.find(x => x.id === id); return a && plannable(a) && planOk(a); })]).filter(t => t[1].length >= 2);
  }
  function applyTemplate(ids) { const plan = planState(); plan.length = 0; let guard = 0, added = true; while (added && guard++ < 4) { added = false; ids.forEach(id => { if (id === 'conges' && plan.some(x => x.id === 'conges')) return; if (plan.length >= 12) return; const a = X.ACTIONS.find(x => x.id === id); const b = planBudget(); if (a.h <= b.left || (id === 'conges' && !guard)) { plan.push({ id, o: defParam(a) }); added = true; } }); } }
  function paramSel(it, i) {
    const a = X.ACTIONS.find(x => x.id === it.id); let opts = null, k = null;
    if (it.o.zone) { k = 'zone'; opts = (curZones() || []).map(z => [z.id, z.name + ' · ' + r0(z.cover) + ' %']); }
    else if (it.o.seg) { k = 'seg'; opts = D.SEGS.map(g => [g.id, g.name]); }
    else if (it.o.theme) { k = 'theme'; opts = Object.entries(D.THEMES).map(([t, x]) => [t, x.l]); }
    if (!opts) return '';
    return '<select class="field psel" data-pp="' + i + ':' + k + '">' + opts.map(([v, l]) => '<option value="' + esc(v) + '"' + (it.o[k] === v ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>';
  }
  function planHTML() {
    const p = P(); const plan = planState(); const b = planBudget(); const tot = p.hours + (plan.some(x => x.id === 'conges') ? 20 : 0); const used = tot - b.left;
    let h = '<h2>Composer mon agenda</h2><p class="muted small" style="margin-top:-4px">Programmez plusieurs actions, lancez-les d’un coup et voyez le bilan sur un seul écran.</p>';
    h += '<div class="pbud"><div class="row" style="justify-content:space-between"><span><b class="num">' + used + '</b> / ' + tot + ' h</span><span class="num">' + (b.cost ? E.eur(b.cost) : '0 €') + '</span></div><div class="hbar" style="width:100%;height:8px;margin-top:5px"><i style="width:' + Math.min(100, used / Math.max(1, tot) * 100) + '%;' + (b.left < 0 ? 'background:var(--bad)' : '') + '"></i></div></div>';
    const tp = planTemplates(); if (tp.length) h += '<div class="eyebrow" style="margin-top:12px">Agendas types</div><div class="chips" style="padding-top:6px">' + tp.map(([l, ids], i) => '<button data-ptpl="' + i + '">' + esc(l) + '</button>').join('') + '</div>';
    h += '<div class="eyebrow" style="margin-top:12px">Votre agenda</div>' + (plan.length ? '<div class="plist">' + plan.map((it, i) => { const a = X.ACTIONS.find(x => x.id === it.id); const c = X.costOf(a); return '<div class="pitem"><span class="pn num">' + (i + 1) + '</span><div class="grow"><div class="row" style="justify-content:space-between;gap:6px"><b>' + esc(a.l) + '</b><span class="muted small num">' + (a.h ? a.h + ' h' : '+20 h') + (c ? ' · ' + E.eur(c) : '') + '</span></div>' + paramSel(it, i) + '</div><button class="btn sm ghost" data-prm="' + i + '" aria-label="Retirer">×</button></div>'; }).join('') + '</div>' : '<p class="muted small" style="margin:6px 0">Vide. Choisissez un agenda type ou ajoutez des actions ci-dessous.</p>');
    const cc = campCtx(); const groups = (cc && cc.cand ? CAMP_G : []).concat(VIE_G, [['Mandat', '', Object.values(MQ).flat()]]);
    const seen = new Set(); let add = '';
    groups.forEach(([t, , ids]) => { const L = ids.filter(id => { if (seen.has(id)) return false; const a = X.ACTIONS.find(x => x.id === id); return a && plannable(a) && planOk(a); }); if (!L.length) return; L.forEach(id => seen.add(id)); add += '<div class="small muted" style="margin:8px 0 4px">' + esc(t) + '</div><div class="chips" style="padding-top:0">' + L.map(id => { const a = X.ACTIONS.find(x => x.id === id); const fit = a.h <= b.left || id === 'conges'; return '<button data-padd="' + id + '"' + (fit ? '' : ' disabled') + '>' + esc(a.l) + ' <span class="num muted">' + (a.h ? a.h + ' h' : '+20 h') + '</span></button>'; }).join('') + '</div>'; });
    h += '<details class="padd"' + (plan.length ? '' : ' open') + '><summary>Ajouter une action</summary>' + add + '<p class="muted small" style="margin:10px 0 0">Meeting, interview, tribune, débat ou rendez-vous demandent votre intervention : lancez-les à part.</p></details>';
    h += '<div class="foot"><button class="btn ghost" data-x>Fermer</button><button class="btn primary" data-go2' + (plan.length && b.left >= 0 ? '' : ' disabled') + '>Lancer ' + (plan.length ? plan.length + ' action' + (plan.length > 1 ? 's' : '') : '') + '</button></div>';
    return h;
  }
  function planFlow() {
    const { m, close } = modal(planHTML(), null, 'sheet planner');
    const wire = () => {
      m.querySelector('[data-x]').onclick = () => { close(); render(); };
      m.querySelectorAll('[data-ptpl]').forEach(b => b.onclick = () => { applyTemplate(planTemplates()[+b.dataset.ptpl][1]); redraw(); });
      m.querySelectorAll('[data-padd]').forEach(b => b.onclick = () => { const a = X.ACTIONS.find(x => x.id === b.dataset.padd); const plan = planState(); if (a.id === 'conges') { if (!plan.some(x => x.id === 'conges')) plan.unshift({ id: 'conges', o: {} }); } else plan.push({ id: a.id, o: defParam(a) }); redraw(true); });
      m.querySelectorAll('[data-prm]').forEach(b => b.onclick = () => { planState().splice(+b.dataset.prm, 1); redraw(); });
      m.querySelectorAll('[data-pp]').forEach(s => s.onchange = () => { const [i, k] = s.dataset.pp.split(':'); planState()[+i].o[k] = s.value; });
      const go = m.querySelector('[data-go2]'); if (go) go.onclick = async () => { close(); await runPlan(); };
    };
    const redraw = keepAdd => { const open = m.querySelector('details.padd') && m.querySelector('details.padd').open; const st = m.scrollTop; m.innerHTML = planHTML(); const d = m.querySelector('details.padd'); if (d && keepAdd) d.open = open; m.scrollTop = st; wire(); };
    wire();
  }
  function paramLabel(it) { if (it.o.zone) { const z = (curZones() || []).find(x => x.id === it.o.zone); return z ? ' · ' + z.name : ''; } if (it.o.seg) return ' · ' + D.SEGS.find(g => g.id === it.o.seg).name.toLowerCase(); if (it.o.theme) return ' · ' + D.THEMES[it.o.theme].l.toLowerCase(); return ''; }
  async function runPlan() {
    const plan = planState().slice(); const before = X.snap(); const res = [];
    if (plan.length) S().lastPlan = plan.map(it => ({ id: it.id, o: Object.assign({}, it.o) })); // pour « Refaire mon agenda »
    plan.sort((x, y) => (y.id === 'conges') - (x.id === 'conges'));
    for (const it of plan) { const a = X.ACTIONS.find(x => x.id === it.id); const r = X.doAction(it.id, Object.assign({}, it.o)); res.push({ l: a.l + paramLabel(it), ok: r.ok, msg: r.msg }); }
    planState().length = 0; E.estimate(); Store.save(); render();
    const ds = X.deltas(before, X.snap()); const nOk = res.filter(r => r.ok).length;
    const next = await new Promise(resolve => modal('<h2>Bilan de votre agenda</h2><p class="muted small" style="margin-top:-4px">' + nOk + ' action(s) réalisée(s) sur ' + res.length + ' · ' + P().hours + ' h restantes</p>' + chipsHTML(ds) + '<div class="list" style="margin-top:10px">' + res.map(r => '<div class="li"><div class="grow"><b style="color:' + (r.ok ? 'var(--text)' : 'var(--bad)') + '">' + (r.ok ? '✓ ' : '✗ ') + esc(r.l) + '</b><div class="muted small">' + esc(r.msg) + '</div></div></div>').join('') + '</div><div class="foot"><button class="btn" data-a="0">Rester sur ce tour</button><button class="btn primary" data-a="1">Tour suivant</button></div>', (mm, close) => mm.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { close(); resolve(b.dataset.a === '1'); })));
    if (S().voices && plan.some(x => x.id === 'focus')) await voicesModal();
    if (next) endTurn();
  }
  const planBtn = () => { const n = planState().length; return '<button class="planbtn" data-plan><span><b>Composer mon agenda</b><span class="muted small">Plusieurs actions d’un coup · ' + P().hours + ' h disponibles</span></span>' + (n ? '<span class="badge">' + n + '</span>' : '<span class="arr">›</span>') + '</button>'; };

  /* ---------- multijoueur : joueurs ---------- */
  function pScore(x) { const w = { president: 100, depute: 40, senateur: 35, meuro: 30, maire: 30, cr: 15, cd: 15, adjoint: 8, conseiller_municipal: 5 }; return (x.mandats || []).reduce((a, m) => a + (w[m.type] || 5), 0) + (x.noto ? x.noto.nat * 0.5 + x.noto.circo * 0.2 : 0); }
  function tJoueurs() {
    const s = S(), p = P(); const g = MP.game(); const pl = MP.players();
    let h = '<div class="card"><h3>' + esc(s.mp.name) + ' <span class="muted num">code ' + esc(s.mp.gid) + '</span></h3><p class="muted small" style="margin:0 0 8px">Envoyez ce code et le lien du jeu à vos amis : ils choisissent « Rejoindre avec un code » sur l’écran d’accueil.</p><button class="btn sm" id="cpcode">Copier le code</button>' + (s.mp.wait ? '<p class="small" style="color:var(--warn);margin:10px 0 0">Vous attendez d’autres candidats pour un scrutin : passez au tour suivant quand ils seront arrivés.</p>' : '') + '</div>';
    const ar = MP.arena(); const nx = s.elections.filter(e => MP.FORCED.includes(e.type) && e.status !== 'fini').sort((a, b) => a.d1 < b.d1 ? -1 : 1)[0];
    if (ar) h += '<div class="card" style="margin-top:12px"><h3>Le terrain : ' + esc((D.com(ar.communeId) || {}).name || '') + '</h3><p class="small" style="margin:0">Tous les joueurs y sont candidats d’office à chaque élection locale et législative.' + (nx ? ' Prochain affrontement : <b>' + esc(nx.label) + '</b>, le ' + E.fmtDate(nx.d1) + '.' : '') + '</p>' + Object.values(s.mp.invRes || {}).filter(v => v.winner).map(v => '<p class="small" style="margin:6px 0 0">Investiture ' + esc(D.PARTIES[v.party].short) + ' (' + esc((s.elections.find(e => e.id === v.el) || {}).label || '') + ') : <b>' + esc(v.winnerName) + '</b> l’emporte face à ' + esc(v.scores.filter(x => x.uid !== v.winner).map(x => x.name).join(', ')) + '.</p>').join('') + '</div>';
    const meRow = { uid: 'me', name: p.name, party: p.party, rank: p.rank, mandats: p.mandats, noto: p.noto, date: s.date, me: true };
    const all = pl.concat([meRow]).sort((a, b) => pScore(b) - pScore(a));
    h += '<h2 class="sec">Classement</h2><div class="list card">' + all.map((x, i) => '<div class="li"><span class="num" style="width:22px">' + (i + 1) + '</span>' + avatar(x.name, x.party === 'NEW' ? 'DIV' : x.party) + '<div class="grow"><b>' + esc(x.name) + (x.me ? ' <span class="muted small">(vous)</span>' : '') + '</b><div class="muted small">' + esc((x.mandats || []).map(m => m.label).join(' · ') || x.rank || '') + '</div></div><span class="num muted small">' + E.fmtDate(x.date, true) + '</span></div>').join('') + '</div>';
    if (!pl.length) h += '<p class="muted" style="margin-top:12px">Personne d’autre pour l’instant.' + (g && g.members && g.members.length > 1 ? ' ' + (g.members.length - 1) + ' ami·e(s) inscrit·e(s) n’ont pas encore créé leur personnage.' : '') + '</p>';
    pl.forEach(x => {
      const el = x.cand ? s.elections.find(e => e.id === x.cand.el) : null; const ahead = E.diffDays(s.date, x.date);
      h += '<div class="card" style="margin-top:12px"><div class="row" style="gap:10px;flex-wrap:nowrap;align-items:flex-start">' + avatar(x.name, x.party === 'NEW' ? 'DIV' : x.party, true) + '<div style="flex:1;min-width:0"><h3 style="margin:0">' + esc(x.name) + '</h3><div class="row" style="gap:6px;margin-top:3px">' + (x.party === 'NEW' ? pill('DIV', x.movement || 'Mouvement') : pill(x.party)) + '<span class="muted small">' + esc(x.rank || '') + ' · ' + esc((D.COMMUNES.find(c => c.id === x.communeId) || {}).name || '') + '</span></div>' +
        '<div class="muted small" style="margin-top:4px">' + (ahead > 0 ? 'En avance de ' + Math.round(ahead) + ' j' : ahead < 0 ? 'En retard de ' + Math.round(-ahead) + ' j' : 'Même date que vous') + ' · ' + E.fmtDate(x.date, true) + (x.wait ? ' · <span style="color:var(--warn)">attend un scrutin</span>' : '') + '</div></div></div>' +
        (x.cand ? '<div class="small" style="margin-top:8px">' + elB(x.cand.el) + ' Candidat·e : <b>' + esc(el ? el.label : x.cand.el) + '</b> · ' + esc(E.unit(x.cand.key).name) + (x.est && x.est.el === x.cand.el ? ' · estimé à <b class="num">' + E.pct(x.est.pct) + '</b>' : '') + (p.cand && p.cand.el === x.cand.el && p.cand.key === x.cand.key ? ' · <span style="color:var(--accent)">votre adversaire direct</span>' : '') + '</div>' : '') +
        ((x.headlines || []).length ? '<div style="margin-top:8px">' + x.headlines.map(n => '<div class="small"><span class="muted">' + esc(n.m || '') + ' · </span>' + esc(n.t) + '</div>').join('') + '</div>' : '') +
        (() => { const el2 = x.cand && p.cand && x.cand.el === p.cand.el && x.cand.key === p.cand.key ? s.elections.find(e => e.id === p.cand.el) : null; const r = el2 && el2.status === 't1' && el2.races && el2.races[p.cand.key]; if (!r || !r.t2) return ''; const meIn = r.t2.includes('PJ'), heIn = r.t2.includes(MP.mirrorId(x.uid)); let b = '';
          if (!meIn && heIn) b = s.mp.endorse && s.mp.endorse.uid === x.uid ? '<p class="small" style="color:var(--good)">Vous appelez à voter pour ' + esc(x.name) + '.</p>' : '<button class="btn sm primary" data-pend="' + esc(x.uid) + '">Appeler à voter pour ' + esc(x.name.split(' ')[0]) + '</button>';
          if (meIn && heIn && r.t2.length > 2) b = s.mp.withdraw ? '<p class="small" style="color:var(--warn)">Vous vous êtes désisté·e.</p>' : '<button class="btn sm" data-pwd="' + esc(x.uid) + '">Me désister en sa faveur</button>';
          return b ? '<div class="row" style="gap:6px;margin-top:8px">' + b + '</div>' : ''; })() +
        '<div class="row" style="gap:6px;margin-top:10px"><button class="btn sm" data-pmsg="' + esc(x.uid) + '">Message</button><button class="btn sm" data-pduel="' + esc(x.uid) + '">Défier en débat · 4 h</button><button class="btn sm" data-psup="' + esc(x.uid) + '">Soutenir · 1 h</button><button class="btn sm" data-patk="' + esc(x.uid) + '">Attaquer publiquement · 2 h</button></div></div>';
    });
    return h;
  }
  function pushOut(uid, text) { const id = MP.mirrorId(uid); LF.sms(S().pnj[id] ? id : 'Joueur', text, null, { human: uid, role: 'Joueur·se' }); const m = S().sms[0]; m.out = true; m.read = true; }
  async function playerAct(kind, uid) {
    const x = MP.players().find(y => y.uid === uid); if (!x) return; const p = P(); const mir = S().pnj[MP.mirrorId(uid)];
    if (kind === 'msg') { const r = await ask('Message à ' + x.name, 'Il ou elle le recevra par SMS dans sa partie.', 'On se parle de la circo ?', { max: 600, btn: 'Envoyer' }); if (!r || !r.text.trim()) return; if (await MP.send(uid, 'msg', r.text.trim())) { pushOut(uid, r.text.trim()); toast('Message envoyé.'); } else toast('Envoi impossible.'); render(); return; }
    const h = kind === 'soutien' ? 1 : 2; if (p.hours < h) { toast('Il faut ' + h + ' h.'); return; }
    const r = await ask(kind === 'soutien' ? 'Soutenir ' + x.name : 'Attaquer ' + x.name, kind === 'soutien' ? 'Votre déclaration de soutien, publiée dans la presse.' : 'Votre attaque, publiée dans la presse. Il ou elle pourra riposter.', kind === 'soutien' ? 'Une élue de terrain, je la soutiens.' : 'Beaucoup de promesses, aucun résultat.', { max: 280, btn: 'Publier' }); if (!r || !r.text.trim()) return;
    const before = X.snap(); if (!(await MP.send(uid, kind === 'soutien' ? 'soutien' : 'attaque', r.text.trim()))) { toast('Envoi impossible.'); return; }
    p.hours -= h;
    if (kind === 'soutien') { if (mir) mir.rel = E.clamp(mir.rel + 10, -100, 100); E.addStd(0.3); E.article('dauph', p.name + ' apporte son soutien à ' + x.name, 0.1, 'pj', '« ' + r.text.trim() + ' »'); }
    else { if (mir) mir.rel = E.clamp(mir.rel - 15, -100, 100); E.addNoto(X.scopeOf(), 1.5); E.addImageAll(-0.3); E.article('dauph', p.name + ' charge ' + x.name, -0.1, 'pj', '« ' + r.text.trim() + ' »'); }
    pushOut(uid, (kind === 'soutien' ? 'Soutien public : « ' : 'Attaque publique : « ') + r.text.trim() + ' »');
    E.estimate(); Store.save(); render(); result(kind === 'soutien' ? 'Soutien publié' : 'Attaque publiée', 'Votre déclaration est dans la presse. ' + x.name + ' la verra à sa prochaine connexion.', before);
  }

  /* ---------- lisibilité ---------- */
  const TERM_L = { ideo: 'Positionnement', noto: 'Notoriété', image: 'Image', cred: 'Crédibilité', camp: 'Campagne et militants', mom: 'Dynamique', prog: 'Programme', field: 'Terrain', nat: 'Climat national', bilan: 'Bilan' };
  const TERM_HOW = { noto: 'presse, interviews, tracts, meetings', image: 'terrain, débats, associations', cred: 'propositions financées, vérité', camp: 'actions de campagne, militants', mom: 'débats gagnés, soutiens, sondages', prog: 'mesures visibles', field: 'couverture des secteurs', nat: 'actualité et popularité de votre camp', bilan: 'réalisations de votre mandat', ideo: 'vos prises de position' };
  function whyRows() {
    const s = S(); const es = s.est; const base = s.estPrevBase && es && s.estPrevBase.el === es.el ? s.estPrevBase : (s.estBase && es && s.estBase.el === es.el ? s.estBase : null);
    if (!es || !es.terms || !base || !base.terms) return null;
    const pr = Math.max(0.02, Math.min(0.98, es.pct / 100)); const k = 100 * pr * (1 - pr); const rows = [];
    for (const t in TERM_L) { const d = ((es.terms[t] || 0) - (base.terms[t] || 0)) * k; if (Math.abs(d) >= 0.05) rows.push({ t, d }); }
    const tot = es.pct - base.pct; const sum = rows.reduce((a, r) => a + r.d, 0); const res = tot - sum; if (Math.abs(res) >= 0.1) rows.push({ t: 'autres', d: res });
    rows.sort((a, b) => Math.abs(b.d) - Math.abs(a.d)); return { rows, tot };
  }
  const sgn = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',');
  function whyCard() {
    const w = whyRows(); if (!w) return '';
    const mx = Math.max(0.5, ...w.rows.map(r => Math.abs(r.d)));
    return '<div class="c12 card why"><h3>Pourquoi ça bouge <span class="muted">depuis le tour précédent : <b class="num" style="color:' + (w.tot >= 0 ? 'var(--good)' : 'var(--bad)') + '">' + sgn(w.tot) + ' pt</b></span></h3>' + (w.rows.length ? w.rows.slice(0, 6).map(r => '<div class="wrow"><div class="grow"><b>' + (r.t === 'autres' ? 'Adversaires et contexte' : TERM_L[r.t]) + '</b><div class="muted small">' + (r.t === 'autres' ? 'campagnes adverses, événements, hasard' : TERM_HOW[r.t]) + '</div></div><div class="wbar"><i class="' + (r.d >= 0 ? 'p' : 'n') + '" style="width:' + Math.min(100, Math.abs(r.d) / mx * 100) + '%"></i></div><span class="num ' + (r.d >= 0 ? 'up' : 'down') + '">' + sgn(r.d) + '</span></div>').join('') : '<p class="muted small" style="margin:0">Rien n’a bougé : agissez pour faire évoluer votre score.</p>') + '</div>';
  }
  function dashTiles() {
    const s = S(); const I = E.indicators(); const B = (s.estPrevBase || s.estBase || {}).ind || null; const SC = { commune: 'commune', circo: 'circonscription', dept: 'Isère', nat: 'France' };
    const t = (k, l, v, sub, fmt) => { const d = B ? v - B[k] : 0; return '<div class="dt"><small>' + l + '</small><b class="num">' + (fmt ? fmt(v) : v) + '</b>' + (Math.abs(d) >= 1 ? '<span class="num ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲' : '▼') + Math.abs(Math.round(d)) + '</span>' : '') + '<span class="sub">' + sub + '</span></div>'; };
    return '<div class="dash">' + t('noto', 'Notoriété', I.noto, SC[I.scope]) + t('image', 'Image', I.image, 'auprès de vos électeurs', v => (v > 0 ? '+' : '') + v) + t('dyn', 'Dynamique', I.dyn, I.dyn >= 60 ? 'vous avez le vent en poupe' : I.dyn <= 40 ? 'en perte de vitesse' : 'stable') + t('app', P().party === 'NEW' ? 'Mouvement' : 'Appareil', I.app, P().party === 'NEW' ? 'force militante' : 'poids dans le parti') + '</div>';
  }

  /* ---------- progression, récit, pouvoir ---------- */
  function guideCard() {
    const g = GV.guide(); if (!g) return '';
    return '<div class="guide"><div class="row" style="justify-content:space-between"><span class="eyebrow">Guide · ' + (g.i + 1) + '/' + g.n + '</span><button class="linkbtn" data-gskip>Passer le guide</button></div><h3>' + esc(g.t) + '</h3><p>' + esc(g.x) + '</p><div class="row" style="gap:6px">' + (g.go ? '<button class="btn sm primary" data-go="' + g.go + '">Ouvrir ' + (g.go === 'agir' ? 'Agir' : g.go) + '</button>' : '') + (g.next ? '<button class="btn sm' + (g.go ? '' : ' primary') + '" data-gnext>' + esc(g.next) + '</button>' : '') + '</div></div>';
  }
  function msCard() {
    const L = GV.nextMs(2); const all = GV.msList(); const done = all.filter(m => m.done).length; if (!L.length) return '';
    return '<div class="card mscard"><h3>Prochains objectifs de carrière <span class="muted num">' + done + '/' + all.length + '</span></h3>' + L.map(m => { const pr = m.prog ? Math.min(1, m.prog()) : null; return '<div class="ms"><span class="msi">○</span><div class="grow"><b>' + esc(m.t) + '</b><div class="muted small">' + esc(m.x) + '</div>' + (pr != null ? '<div class="hbar" style="width:100%;height:4px;margin-top:4px"><i style="width:' + pr * 100 + '%"></i></div>' : '') + '</div></div>'; }).join('') + '<button class="linkbtn" data-go="plus:carnet">Toute la carrière</button></div>';
  }
  function msFull() {
    return '<div class="card"><h3>Carrière</h3>' + GV.msList().map(m => '<div class="ms' + (m.done ? ' done' : '') + '"><span class="msi">' + (m.done ? '✓' : '○') + '</span><div class="grow"><b>' + esc(m.t) + '</b><div class="muted small">' + esc(m.x) + (m.done ? ' · ' + E.fmtDate(m.date, true) : '') + '</div></div></div>').join('') + '</div>';
  }
  function notifyMs() { const got = GV.check(); got.forEach((g, i) => setTimeout(() => toast('Objectif atteint : ' + g.t + ' · ' + g.r), 400 + i * 2600)); return got; }
  function keyPeople() {
    const s = S(), a = GV.arcs(); const rows = [];
    const add = (id, role, col) => { const x = s.pnj[id]; if (!x) return; rows.push('<div class="li" style="align-items:flex-start">' + avatar(x.name, x.party) + '<div class="grow"><div class="eyebrow" style="color:' + col + '">' + role + '</div><b>' + esc(x.name) + '</b> <span class="muted small">' + esc(x.mandat || '') + ' · relation ' + (x.rel > 0 ? '+' : '') + Math.round(x.rel) + '</span>' + ((x.mem || []).length ? '<div class="small muted" style="margin-top:3px">' + x.mem.slice(-3).reverse().map(m => '• ' + esc(m.t) + ' <span class="num">(' + E.fmtDate(m.date, true) + ')</span>').join('<br>') + '</div>' : '') + '</div></div>'); };
    if (a.mentor) add(a.mentor, 'Votre mentor', 'var(--good)'); if (a.nemesis) add(a.nemesis, 'Votre némésis', 'var(--bad)');
    (s.rivals || []).filter(id => id !== a.nemesis).slice(0, 2).forEach(id => add(id, 'Adversaire', 'var(--muted)'));
    if (!rows.length) return '';
    return '<div class="card" style="margin-bottom:14px"><h3>Personnages clés <span class="muted">ils se souviennent de vous</span></h3><div class="list">' + rows.join('') + '</div>' + (a.traitor && !a.betrayed ? '<p class="muted small" style="margin:8px 0 0">Quelqu’un de votre entourage pourrait vous lâcher le jour où vous percerez. Soignez la loyauté de vos proches.</p>' : '') + '</div>';
  }
  function bilanCard() {
    const p = P(); const B = (p.bilan || []).slice().reverse(); const sc = GV.bilanScore(); const pr = (p.promises || []);
    let h = '<div class="card"><h3>Votre bilan <span class="muted">sera jugé à la prochaine élection</span></h3><div class="kpis">' + kpi('Score de bilan', (sc > 0 ? '+' : '') + Math.round(sc), Math.max(0, Math.min(100, 50 + sc)), sc >= 0 ? 'var(--good)' : 'var(--bad)', sc > 15 ? 'Un atout pour votre réélection' : sc < -10 ? 'Vos adversaires vont s’en servir' : 'Encore peu marquant') + kpi('Promesses', pr.filter(x => x.kept).length + ' tenue(s)', null, null, pr.filter(x => !x.kept && !x.broken).length + ' en cours, ' + pr.filter(x => x.broken).length + ' rompue(s)') + '</div>';
    if (B.length) h += '<div style="margin-top:10px">' + B.slice(0, 6).map(b => '<div class="small"><span class="num" style="color:' + (b.v >= 0 ? 'var(--good)' : 'var(--bad)') + '">' + (b.v >= 0 ? '+' : '') + b.v + '</span> ' + esc(b.l) + ' <span class="muted">· ' + E.fmtDate(b.date, true) + '</span></div>').join('') + '</div>';
    const open = pr.filter(x => !x.kept && !x.broken);
    if (open.length) h += '<div class="eyebrow" style="margin-top:12px">Promesses à tenir</div>' + open.map(x => '<div class="li"><div class="grow"><b>' + esc(x.what) + '</b><div class="muted small">Échéance ' + E.fmtDate(x.due || x.date, true) + '</div></div>' + (p.mandats.length ? '<button class="btn sm" data-keep="' + esc(x.id || (x.date + x.what)) + '">Tenir · 3 h</button>' : '') + '</div>').join('');
    return h + '</div>';
  }
  async function budgetFlow() {
    const p = P(); const m = p.mairie; if (!m) return; const before = X.snap();
    const tf = await choice('Budget ' + S().date.slice(0, 4) + ' ' + E.de(E.commune().name), '<p>Le conseil municipal doit voter le budget avant le 15 avril. Taxe foncière actuelle : <b>' + m.tf + ' %</b>. Cohésion de votre majorité : ' + Math.round(m.cohesion ?? 70) + ' %.</p><p class="muted small">1. La fiscalité</p>', [{ l: 'Baisser la taxe foncière d’un point', sub: 'Populaire, réduit vos marges', v: '-1' }, { l: 'Maintenir le taux', sub: 'Sans surprise', v: '0' }, { l: 'Augmenter d’un point', sub: 'Impopulaire, finance des investissements', v: '1' }]);
    const prio = await choice('Budget : votre priorité', '<p class="muted small">2. L’investissement que vous mettez en avant</p>', GV.PRIOS.map(x => ({ l: x[1], sub: 'Plaît aux ' + Object.keys(x[2]).map(g => D.SEGS.find(s => s.id === g).name.toLowerCase()).join(' et '), v: x[0] })));
    const sv = await choice('Budget : les associations', '<p class="muted small">3. Les subventions</p>', [{ l: 'Augmenter les subventions', v: '1' }, { l: 'Les maintenir', v: '0' }, { l: 'Les réduire', v: '-1' }]);
    const msg = GV.budgetSession(+tf, prio, +sv); E.estimate(); render(); await info('Vote du budget', '<p>' + esc(msg) + '</p>' + chipsHTML(X.deltas(before, X.snap())));
  }
  async function plfFlow() {
    const s = S(), p = P(); const maj = s.national.gov.includes(p.party); const before = X.snap();
    const v = await choice('Projet de loi de finances', '<p>L’Assemblée vote le budget de l’État. Votre groupe est ' + (maj ? 'dans la majorité : il votera pour.' : 'dans l’opposition : il votera contre.') + '</p>', [{ l: 'Voter pour', v: 'pour' }, { l: 'Voter contre', v: 'contre' }, { l: 'M’abstenir', v: 'abst' }]);
    const am = await choice('Un amendement pour la circonscription ?', '<p>Vous pouvez défendre un amendement qui fléche des crédits vers votre circonscription (3 h).</p>', [{ l: 'Défendre un amendement', v: 'oui' }, { l: 'Non', v: 'non' }]);
    const msg = GV.plfVote(v, am === 'oui'); E.estimate(); render(); await info('Budget de l’État', '<p>' + esc(msg) + '</p>' + chipsHTML(X.deltas(before, X.snap())));
  }
  async function interpFlow() {
    const x = GV.opposant(); if (!x) return; const before = X.snap();
    await info('Conseil municipal', '<p>' + esc(x.name) + ', chef·fe de file de l’opposition, vous interpelle en séance publique. La presse locale est dans la salle.</p>', 'Prendre la parole');
    const sum = await debateRun({ format: 'Conseil municipal ' + E.de(E.commune().name), host: 'Le public du conseil', rounds: 5, opponents: [{ name: x.name, label: D.PARTIES[x.party].short, id: x.id }] });
    GV.interpOutcome(sum); X.applyDebate(sum); E.estimate(); render(); await info('Fin de séance', '<p>' + (sum.score >= 55 ? 'Vous avez dominé l’échange.' : sum.score < 45 ? 'L’opposition a marqué des points.' : 'Échange équilibré.') + '</p>' + chipsHTML(X.deltas(before, X.snap())));
  }

  /* ---------- débats entre joueurs ---------- */
  function duelPlay(beats, title) {
    return new Promise(resolve => { const ans = []; const { m, close } = modal('', null, 'live');
      const show = i => { if (i >= beats.length) { close(); resolve(ans); return; } const b = beats[i];
        m.innerHTML = '<div class="eyebrow">' + esc(title) + ' · ' + (i + 1) + '/' + beats.length + '</div><div class="lv-q"><div class="eyebrow">Question</div><div class="lq">' + esc(b.text) + '</div></div><div class="lv-opts">' + b.opts.map((o, k) => { const mv = LV.MOVES[o.move] || LV.MOVES.fond; return '<button class="lopt" data-k="' + k + '"><span class="lm" style="background:' + (o.edl ? '#2f8f6f' : mv.c) + '">' + esc(o.edl ? '📎 Éléments de langage' : mv.l) + '</span><span class="lt">' + esc(o.texte) + '</span>' + (o.move === 'punch' ? '<span class="lh"><span class="rk">Quitte ou double</span></span>' : o.move === 'esquive' ? '<span class="lh"><span class="rk">Le public n’aime pas</span></span>' : '') + '</button>'; }).join('') + '</div><p class="muted small" style="margin-top:8px">Votre adversaire répond aux mêmes questions de son côté. Varier les registres paie.</p>';
        m.querySelectorAll('[data-k]').forEach(btn => btn.onclick = () => { ans.push(+btn.dataset.k); show(i + 1); }); };
      show(0); });
  }
  async function challengePlayer(uid) {
    const x = MP.players().find(y => y.uid === uid); const p = P(); if (!x) return; if (p.hours < 4) { toast('Il faut 4 h.'); return; }
    const beats = LV.duelBeats(6); const ans = await duelPlay(beats, 'Face-à-face contre ' + x.name); p.hours -= 4;
    try { await MP.createDuel(uid, beats, ans); } catch (e) { toast('Envoi impossible.'); return; }
    E.article('radio', 'Face-à-face enregistré entre ' + p.name + ' et ' + x.name + ', diffusion à venir', 0, 'pj'); render();
    await info('Débat enregistré', '<p>Vos réponses sont enregistrées. ' + esc(x.name) + ' répondra aux mêmes questions à sa prochaine connexion ; le verdict du public tombera alors, dans sa partie comme dans la vôtre.</p>');
  }
  async function acceptDuel(id) {
    const d = await MP.getDuel(id); const p = P(); if (!d || d.status !== 'waitB') { toast('Ce débat n’est plus disponible.'); return; }
    if (p.hours < 4) { toast('Il vous faut 4 h libres pour ce débat. Revenez au prochain tour.'); return; }
    const ans = await duelPlay(d.beats, 'Face-à-face contre ' + d.nameA); p.hours -= 4;
    const st = { cred: p.cred, mt: p.mediaTraining || 0, sf: p.traits.sangfroid ?? 50 }; const res = LV.duelScore(d.beats, d.ansA, ans, d.stA || {}, st, id);
    try { await MP.finishDuel(id, d, ans, res); } catch (e) { }
    const myScore = 100 - res.scoreA; const before = X.snap(); X.applyDebate({ score: myScore, segments: {}, lies: [], punchlines: [], stmts: [] }); E.estimate(); render();
    await info(myScore >= 55 ? 'Vous remportez le face-à-face' : myScore < 45 ? 'Face-à-face perdu' : 'Match nul', '<div class="tug"><div class="tn"><b>Vous <span class="num">' + Math.round(myScore) + ' %</span></b><b><span class="num">' + Math.round(res.scoreA) + ' %</span> ' + esc(d.nameA) + '</b></div><div class="tb"><i style="width:' + myScore + '%"></i><span class="mid"></span></div></div><p class="small muted">Échange par échange : ' + res.per.map(v => (v <= 0 ? '<span style="color:var(--good)">vous</span>' : '<span style="color:var(--bad)">' + esc(d.nameA.split(' ')[0]) + '</span>')).join(' · ') + '</p>' + chipsHTML(X.deltas(before, X.snap())));
  }

  /* ---------- Opinion ---------- */
  function tOpinion() {
    const s = S(), p = P();
    let h = '<div class="grid"><div class="c6 card"><h3>Votre image par électorat <span class="muted">−100 à +100</span></h3>' + D.SEGS.map(g => '<div class="axisrow" style="grid-template-columns:170px 1fr 40px"><span>' + g.name + '</span>' + diverge(p.image[g.id] || 0) + '<span class="num" style="text-align:right">' + r0(p.image[g.id] || 0) + '</span></div>').join('') +
      '<div class="sep"></div><div class="eyebrow">Notoriété</div>' + [['commune', E.commune().name], ['circo', D.CIRCOS[p.circo - 1].name], ['dept', 'Isère'], ['nat', 'France']].map(([k, l]) => '<div class="axisrow" style="grid-template-columns:170px 1fr 40px"><span>' + esc(l) + '</span><div class="hbar" style="width:100%;height:10px"><i style="width:' + p.noto[k] + '%"></i></div><span class="num" style="text-align:right">' + r0(p.noto[k]) + '</span></div>').join('') + '</div>';
    h += '<div class="c6">' + mapCard() + '</div>';
    // sondages
    h += '<div class="c7 card"><h3>Sondages</h3>' + (s.polls.slice(0, 5).map(pl => '<div style="margin-bottom:14px"><div class="row" style="justify-content:space-between"><b>' + esc(pl.scope) + '</b><span class="muted" style="font-size:12.5px">' + esc(pl.inst) + ' · n = ' + pl.n + ' · ' + E.fmtDate(pl.date) + '</span></div><div class="muted" style="font-size:12.5px;margin-bottom:4px">' + esc(pl.label) + (pl.commande ? ' · marge d’erreur ±' + (1.96 * Math.sqrt(2500 / pl.n)).toFixed(1) + ' pt' : '') + '</div>' + bars(pl.rows.slice(0, 7)) + (pl.extra ? '<div class="muted" style="font-size:12.5px;margin-top:4px">Participation estimée ' + pl.extra.part + ' % · votre notoriété mesurée ' + pl.extra.noto + '</div>' : '') + '</div>').join('') || '<p class="muted">Aucun sondage publié.</p>') + '</div>';
    // national
    const n = s.national; const asm = n.assembly;
    h += '<div class="c5 card"><h3>Climat national</h3><div><span class="muted">Popularité de l’exécutif :</span> <b class="num">' + r0(n.approval ?? 30) + ' %</b></div><div><span class="muted">Présidence :</span> ' + (n.president ? esc(n.president.name) + ' ' + pill(n.president.party) : 'président sortant, fin de second mandat') + '</div><div style="margin-top:4px"><span class="muted">Gouvernement :</span> ' + n.gov.map(k => pill(k)).join(' ') + '</div>' + (asm ? '<div style="margin-top:4px"><span class="muted">Assemblée :</span> ' + Object.entries(asm).map(([k, v]) => pill(k, D.PARTIES[k].short + ' ' + v)).join(' ') + '</div>' : '') +
      '<div class="sep"></div><div class="eyebrow">Dynamique des partis</div>' + D.PARTY_IDS.filter(k => k !== 'DIV').map(k => { const v = n.climate[k] || 0; return '<div class="axisrow" style="grid-template-columns:80px 1fr"><span>' + pill(k) + '</span>' + diverge(v * 300, pc(k)) + '</div>'; }).join('') +
      '<div class="sep"></div><div class="eyebrow">Sujets qui dominent le débat</div><div class="row" style="margin-top:6px">' + (Object.entries(n.salience).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, v]) => '<span class="chip">' + D.THEMES[t].l + ' <span class="num muted">' + v.toFixed(1) + '</span></span>').join('') || '<span class="muted">Actualité calme.</span>') + '</div></div>';
    h += '<div class="c6">' + asmCard() + '</div><div class="c6">' + voicesCard() + '</div>';
    return h + '</div>';
  }

  /* ---------- Réseau ---------- */
  const ROLE_L = { leader: 'Direction nationale', depute: 'Député·e', maire: 'Maire', journaliste: 'Journaliste', notable: 'Notable', federal: 'Fédération', section: 'Section', cadre: 'Cadre', candidat: 'Candidat·e' };
  function partyCard() {
    const s = S(), p = P(); if (p.party === 'NEW') return '<div class="card" style="margin-bottom:14px"><h3>' + esc(p.movement) + '</h3><p class="muted">Votre mouvement, votre ligne. Pas de congrès à gagner, mais pas d’appareil non plus.</p></div>';
    const steps = E.PROLE.concat(['Candidat·e à la présidentielle']); const cur = p.presDesig ? 6 : (p.prole || 0);
    const figs = E.partyFigures(); const fed = s.pnj[p.fedId];
    const next = (s.partyCal || []).slice().sort((a, b) => a.d < b.d ? -1 : 1).map(c => ({ federal: 'Élection fédérale', congres: 'Congrès national', designation: 'Désignation présidentielle' }[c.t] + ' · ' + E.fmtDate(c.d)));
    return '<div class="card" style="margin-bottom:14px"><h3>Conquérir ' + esc(D.PARTIES[p.party].name) + '</h3><div class="ladder">' + steps.map((t, i) => '<div class="' + (i < cur ? 'done' : i === cur ? 'on' : '') + '"><span>' + (i + 1) + '</span>' + esc(t) + '</div>').join('') + '</div>' +
      '<div class="grid" style="margin-top:12px"><div class="c6"><div class="small muted">Soutien des adhérents de l’Isère</div><b class="num big2">' + r0(p.fedSup || 0) + ' %</b>' + gauge(p.fedSup || 0, 'var(--accent)') + '</div><div class="c6"><div class="small muted">Soutien national</div><b class="num big2">' + r0(p.natSup || 0) + ' %</b>' + gauge(p.natSup || 0, 'var(--accent)') + '</div></div>' +
      '<div class="small" style="margin-top:10px"><b>Prochaines échéances internes :</b> ' + (next.join(' · ') || 'aucune') + '</div>' +
      '<div class="eyebrow" style="margin-top:12px">Les forces en présence</div>' + [fed && !p.fedRole ? fed : null].concat(figs).filter(Boolean).map(x => '<div class="li"><div class="grow"><b>' + esc(x.name) + '</b> <span class="muted small">' + esc(x.role === 'leader' ? 'Direction nationale' : x.role === 'federal' ? 'Fédération de l’Isère' : x.mandat || 'Baron·ne') + (x.natW ? ' · courant ' + r0(x.natW) : '') + '</span><div style="max-width:220px;margin-top:4px">' + diverge(x.rel) + '</div></div><div class="row" style="gap:6px"><button class="btn sm" data-rdv="' + x.id + '">Rencontrer</button><button class="btn sm ghost" data-acc="' + x.id + '">Alliance</button></div></div>').join('') +
      '<div class="qas" style="margin-top:10px">' + ['section', 'mission', 'reseau', 'tournee', 'contribution'].map(quick).join('') + '</div><p class="muted small" style="margin:8px 0 0">Une alliance « soutien public » avec un·e baron·ne apporte son courant à votre motion au congrès.</p></div>';
  }
  function tReseau() { return (typeof LN !== 'undefined' ? LN.invCard() + LN.card() : '') + keyPeople() + tReseau0(); }
  function tReseau0() {
    const s = S(), p = P(); const filters = [['entourage', 'Votre entourage'], ['elus', 'Élus de l’Isère'], ['presse', 'Journalistes'], ['nat', 'Directions nationales'], ['notables', 'Notables']];
    const f = UI.filter; const list = E.pnjList(x => f === 'entourage' ? x.known : f === 'elus' ? ['depute', 'maire'].includes(x.role) : f === 'presse' ? x.role === 'journaliste' : f === 'nat' ? x.role === 'leader' : x.role === 'notable').sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel) || b.noto - a.noto);
    let h = partyCard() + '<div class="grid"><div class="c8 card"><h3>Réseau</h3><div class="row" style="margin-bottom:8px">' + filters.map(([k, l]) => '<button class="btn sm ' + (f === k ? 'primary' : 'ghost') + '" data-filter="' + k + '">' + l + '</button>').join('') + '</div><div class="list">' +
      (list.slice(0, 60).map(x => '<div class="li"><div class="grow"><div class="row" style="gap:6px"><b>' + esc(x.name) + '</b>' + (x.role !== 'journaliste' ? pill(x.party) : '') + (x.enemy ? '<span class="chip" style="border-color:var(--bad);color:var(--bad)">Ennemi·e juré·e</span>' : '') + '</div><div class="muted" style="font-size:13px">' + esc(x.mandat || ROLE_L[x.role] || x.role) + ' · notoriété ' + r0(x.noto) + '</div><div style="max-width:260px;margin-top:4px">' + diverge(x.rel) + '</div></div><div class="row" style="gap:6px"><button class="btn sm" data-rdv="' + x.id + '">Rendez-vous</button>' + (x.role !== 'journaliste' ? '<button class="btn sm ghost" data-acc="' + x.id + '">Accord</button>' : '') + '</div></div>').join('') || '<p class="muted">Personne ici pour l’instant. Prenez des rendez-vous, déjeunez avec des journalistes.</p>') + '</div></div>';
    h += '<div class="c4 stack"><div class="card"><h3>' + (p.party === 'NEW' ? 'Votre mouvement' : 'Votre parti') + '</h3><div>' + (p.party === 'NEW' ? pill('DIV', p.movement) : pill(p.party) + ' ' + esc(D.PARTIES[p.party].name)) + '</div><div class="muted" style="margin-top:6px">' + esc(p.rank) + '</div>' + (p.party !== 'NEW' ? '<div style="margin-top:8px">Poids interne <b class="num">' + r0(p.std) + '</b>' + gauge(p.std) + '</div>' : '') + '<div style="margin-top:8px">Soutiens d’élus <b class="num">' + p.soutiens + '</b> · parrainages promis <b class="num">' + p.parrainages + '</b> / 500</div></div>' +
      '<div class="card"><h3>Accords</h3>' + (p.accords.length ? p.accords.slice().reverse().map(a => { const x = s.pnj[a.with]; return '<div class="li"><div class="grow"><b>' + esc(x.name) + '</b><div class="muted" style="font-size:13px">' + a.clauses.map(c => E.CLAUSES[c]).join(', ') + ' · ' + E.fmtDate(a.date) + '</div><div style="font-size:12.5px;color:' + (a.status === 'actif' ? 'var(--good)' : 'var(--bad)') + '">' + ({ actif: 'En vigueur', rompu: 'Rompu par ' + esc(x.name), trahi: 'Rompu par vous' }[a.status]) + '</div></div>' + (a.status === 'actif' ? '<button class="btn sm ghost" data-betray="' + a.id + '">Rompre</button>' : '') + '</div>'; }).join('') : '<p class="muted">Aucun accord. Proposez-en depuis la liste.</p>') + '</div></div>';
    return h + '</div>';
  }

  /* ---------- Équipe ---------- */
  function tEquipe() {
    const p = P(); const met = D.METIERS.find(m => m.id === p.metier); const sal = p.staff.reduce((a, x) => a + x.sal, 0); const c = p.cand && p.cand.compte;
    let h = '<div class="grid"><div class="c7 card"><h3>Équipe <span class="muted">' + p.staff.length + ' collaborateur·rice·s</span></h3><p class="muted small" style="margin:0 0 8px">Chaque collaborateur accomplit sa mission à chaque tour, sans vous coûter d’heures. ★ : mission adaptée à son poste. Les missions hors poste usent sa loyauté.</p><button class="btn sm primary" data-act="recruter">Recruter (2 h)</button><div class="list" style="margin-top:8px">' +
      (p.staff.map(x => { const ms = E.MISSIONS[x.mission || 'repos']; const tgt = ms.t === 'seg' ? D.SEGS.map(g => '<option value="' + g.id + '"' + (x.mt === g.id ? ' selected' : '') + '>' + esc(g.name) + '</option>').join('') : ms.t === 'rival' ? (S().rivals || []).map(id => S().pnj[id]).filter(Boolean).map(y => '<option value="' + y.id + '"' + (x.mt === y.id ? ' selected' : '') + '>' + esc(y.name) + '</option>').join('') : ms.t === 'mes' ? p.prog.filter(z => z.status !== 'retiree').map(z => '<option value="' + z.id + '"' + (x.mt === z.id ? ' selected' : '') + '>' + esc(z.resume.slice(0, 60)) + '</option>').join('') : '';
      return '<div class="staff"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>' + esc(x.name) + '</b> <span class="muted small">· ' + D.STAFF_ROLES[x.role].l + '</span><div class="muted small">Compétence ' + x.comp + ' · loyauté ' + (x.audited ? r0(x.loy) : '≈ ' + E.clamp(r0(x.loy / 10) * 10, 0, 100)) + ' · ambition ' + x.amb + ' · discrétion ' + x.disc + ' · ' + (x.sal ? E.eur(x.sal) + '/mois' : 'bénévole') + '</div></div></div>' +
        '<div class="row" style="gap:8px;margin-top:8px"><label class="f" style="flex:1;min-width:180px">Mission<select class="field" data-mis="' + x.id + '">' + Object.entries(E.MISSIONS).map(([k, mm]) => '<option value="' + k + '"' + ((x.mission || 'repos') === k ? ' selected' : '') + '>' + esc(mm.l) + (mm.fit.includes(x.role) ? ' ★' : '') + '</option>').join('') + '</select></label>' + (tgt ? '<label class="f" style="flex:1;min-width:160px">Cible<select class="field" data-mt="' + x.id + '"><option value="">Automatique</option>' + tgt + '</select></label>' : '') + '</div>' + (x.intel ? '<div class="small" style="margin-top:6px"><span class="muted">Renseignement :</span> ' + esc(x.intel) + '</div>' : '') +
        '<div class="row" style="gap:6px;margin-top:8px"><button class="btn sm" data-raise="' + x.id + '">' + (x.sal ? 'Augmenter (+20 %)' : 'Salarier') + '</button><button class="btn sm" data-recad="' + x.id + '">Recadrer</button><button class="btn sm ghost" data-fire="' + x.id + '">Se séparer</button></div></div>'; }).join('') || '<p class="muted">Vous êtes seul·e. Un mandataire financier est obligatoire pour encaisser des dons de campagne.</p>') + '</div></div>';
    h += '<div class="c5 stack"><div class="card"><h3>Finances personnelles</h3>' + [['Trésorerie disponible', E.eur(p.cash)], ['Revenus consacrés à la politique', p.fullTime ? 'aucun (plein temps)' : E.eur(met.income) + '/mois'], ['Indemnités d’élu (20 % épargnés)', E.eur(E.indemnities()) + '/mois'], ['Salaires de l’équipe', E.eur(sal) + '/mois']].map(([a, b]) => '<div class="row" style="justify-content:space-between;padding:4px 0"><span class="muted">' + a + '</span><span class="num">' + b + '</span></div>').join('') + '<div class="row" style="margin-top:8px">' + (p.fullTime ? '<button class="btn sm" data-act="emploi">Reprendre un emploi</button>' : '<button class="btn sm" data-act="plein">Vivre de la politique</button>') + '</div></div>';
    if (c) h += '<div class="card"><h3>Compte de campagne</h3>' + [['Plafond légal', c.plafond ? E.eur(c.plafond) : 'aucun (< 9 000 hab.)'], ['Aide du parti', E.eur(c.aide)], ['Dons', E.eur(c.dons)], ['Apport personnel', E.eur(c.apport)], ['Dépenses', E.eur(c.depenses)], ['Solde', E.eur(c.recettes - c.depenses)]].map(([a, b]) => '<div class="row" style="justify-content:space-between;padding:3px 0"><span class="muted">' + a + '</span><span class="num">' + b + '</span></div>').join('') + '<div class="muted" style="font-size:12.5px;margin-top:6px">Dons plafonnés à 4 600 € par personne. Remboursement de l’État jusqu’à 47,5 % du plafond, dans la limite de votre apport, si vous dépassez 5 %. Dépasser le plafond expose à l’inéligibilité.</div></div>';
    return h + '</div></div>';
  }

  /* ---------- Programme ---------- */
  function sortedProblems() { const sal = S().national.salience; const lv = X.curLevel(); const done = new Set(P().prog.map(m => m.prob)); return L.PROBLEMS.filter(pb => !done.has(pb.id)).sort((a, b) => ((sal[b.th] || 0) * 3 + (lv === b.lvl ? 1 : 0)) - ((sal[a.th] || 0) * 3 + (lv === a.lvl ? 1 : 0))); }
  const md = n => (n / 1e9).toFixed(1).replace('.', ',') + ' Md€';
  // Programme : par chapitres (thèmes), avec des propositions adaptées à la commune et à l'élection
  function progThemes(sc) {
    const com = E.commune(); const ths = L.themesFor(sc, com.pop); const p = P();
    const cs = hasHQ() && p.cand && HQ.lvl() === sc ? (HQ.concerns() || null) : null; const w = {}; (cs || []).forEach(c => w[c.t] = c.w);
    const sal = S().national.salience || {};
    const ORD = sc === 'national' ? ['economie', 'pouvoir_achat', 'securite', 'sante', 'immigration', 'education', 'ecologie', 'fiscalite', 'industrie', 'logement', 'transports', 'agriculture', 'institutions', 'europe', 'societe'] : com.pop < 3500 ? ['education', 'sante', 'economie', 'transports', 'agriculture', 'logement', 'securite', 'ecologie', 'fiscalite', 'pouvoir_achat', 'institutions', 'societe'] : ['securite', 'logement', 'transports', 'education', 'sante', 'fiscalite', 'economie', 'ecologie', 'pouvoir_achat', 'institutions', 'societe', 'agriculture'];
    const oi = t => { const i = ORD.indexOf(t); return i < 0 ? 99 : i; };
    return ths.map(t => ({ t, w: cs ? (w[t] || 0) : (sc === 'national' ? (sal[t] || 0) / 3 : 0), known: !!cs })).sort((a, b) => (b.w - a.w) || (oi(a.t) - oi(b.t)));
  }
  function tProgramme() {
    const p = P(); const com = E.commune(); const loc = L.local(com); const sc = curScope();
    let h = scopeSwitch(sc === 'local' ? 'Votre projet pour ' + com.name + (com.pop >= 3500 ? ' et le canton' : '') + ' : il compte aux municipales et aux départementales.' : 'Vos propositions pour le pays : elles comptent aux législatives, à la présidentielle et aux européennes.') + '<div class="grid">';
    h += projetCard();
    const live = p.prog.filter(m => m.status !== 'retiree' && m.level === sc);
    const cost = live.reduce((a, m) => a + Math.max(0, m.cout || 0), 0), inv = live.reduce((a, m) => a + (m.inv || 0), 0), unf = live.filter(m => (m.cout > 0 || m.inv > 0) && (!m.fin || ['aucun', 'croissance'].includes(m.fin))).length;
    const cred = live.length ? r0(live.reduce((a, m) => a + (m.cred || 50), 0) / live.length) : null; const fmt = v => sc === 'national' ? md(v) : E.eur(v);
    h += '<div class="c12 card"><h3>Votre programme <span class="muted">' + live.length + ' proposition' + (live.length > 1 ? 's' : '') + '</span></h3><div class="kpis">' + kpi('Coût par an', fmt(cost)) + kpi('Investissements', inv ? fmt(inv) : '—') + kpi('Crédibilité', cred != null ? cred + '/100' : '—', cred, cred == null ? null : cred < 45 ? 'var(--bad)' : cred < 60 ? 'var(--warn)' : 'var(--good)', unf ? '<span style="color:var(--warn)">' + unf + ' non financée' + (unf > 1 ? 's' : '') + '</span>' : '') + '</div>' +
      '<p class="muted small" style="margin:8px 0 0">Un bon programme ' + (sc === 'local' ? 'local' : 'national') + ' : ' + (sc === 'local' ? (com.pop < 3500 ? '3 à 6' : '4 à 9') : '5 à 12') + ' propositions qui répondent aux préoccupations des électeurs, toutes financées, dont deux ou trois phares. Choisissez un thème ci-dessous.</p></div>';
    const ths = progThemes(sc); const rv = (S().rivals || []).map(id => S().pnj[id]).filter(Boolean);
    h += '<div class="c12 card"><h3>Par thème</h3>' + (ths[0] && ths[0].known ? '<p class="muted small" style="margin:-4px 0 8px">Classés selon ce qui préoccupe les électeurs (consultation).</p>' : ths[0] && sc === 'local' && hasHQ() && p.cand ? '<p class="muted small" style="margin:-4px 0 8px">Consultez les habitants (Feuille de route) pour savoir quels thèmes comptent le plus ici.</p>' : '') +
      ths.map(x => { const mine = live.filter(m => m.theme === x.t); const opp = rv.reduce((a, y) => a + (y.prog || []).filter(pr => pr.lvl === sc && pr.th === x.t).length, 0); const imp = x.known ? (x.w >= 0.2 ? '<span class="chip" style="border-color:var(--accent);color:var(--accent)">priorité des électeurs</span>' : x.w >= 0.1 ? '<span class="chip">compte</span>' : '') : '';
        return '<button class="li chap" data-chap="' + x.t + '" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);padding:10px 0;color:inherit;cursor:pointer"><div class="grow"><div class="row" style="gap:6px"><b>' + esc(D.THEMES[x.t].l) + '</b>' + imp + '</div><div class="muted small">' + (mine.length ? '<span style="color:var(--good)">✓</span> ' + esc(mine.map(m => m.resume).join(' · ')).slice(0, 110) : 'Aucune proposition') + (opp ? ' · ' + opp + ' proposition' + (opp > 1 ? 's' : '') + ' adverse' + (opp > 1 ? 's' : '') : '') + '</div></div><span class="muted">›</span></button>'; }).join('') + '</div>';
    const office = p.mandats.some(m => ['maire', 'depute', 'cd', 'conseiller_municipal', 'adjoint'].includes(m.type));
    if (live.length) h += '<div class="c12 card"><h3>Vos propositions</h3><div class="stack">' + live.map(m => measureCard(m) + '<div class="row" style="gap:6px;margin:-4px 0 6px"><button class="btn sm" data-def="' + m.id + '">Défendre · 3 h</button><button class="btn sm" data-conf="' + m.id + '">Conférence de presse · 3 h</button>' + (office && (!m.status || m.status === 'proposee') ? '<button class="btn sm" data-app="' + m.id + '">' + (p.mairie && m.level === 'local' ? 'Réaliser' : m.level === 'national' ? 'Proposition de loi' : 'Présenter au conseil') + ' · 5 h</button>' : '') + '<button class="btn sm ghost" data-phare="' + m.id + '">' + (m.phare ? '★ Phare' : '☆ Phare') + '</button><button class="btn sm ghost" data-ret="' + m.id + '">Retirer</button></div>').join('') + '</div></div>';
    if (p.mairie) h += '<div class="c12 card"><h3>Mairie de ' + esc(com.name) + '</h3><p class="muted small" style="margin:0 0 8px">Budget, fiscalité, grands chantiers : tout se pilote depuis le Bureau.</p><button class="btn sm" data-go="agir:mandat">Ouvrir le Bureau</button></div>';
    h += '<div class="c12 card"><details><summary><b>Diagnostic ' + (sc === 'local' ? 'de ' + esc(com.name) : 'national') + '</b></summary>' + (sc === 'local' ? loc.rows.filter(r => !(com.pop < 3500 && ['Policiers municipaux', 'Logements sociaux', 'Pistes cyclables'].some(k => r[1].startsWith(k)))).map(([t, l, v]) => '<div class="drow"><span>' + esc(l) + '</span><b>' + esc(v) + '</b></div>').join('') + '<p class="muted small" style="margin:8px 0 0">Ordres de grandeur estimés à partir de la taille et du profil de la commune.</p>' : L.NAT.map(n => '<div class="drow"><span>' + esc(n.l) + '</span><b>' + esc(n.v) + '</b></div><div class="src">' + esc(n.s) + '</div>').join('')) + '</details></div>';
    h += '<div class="c12 card"><details><summary><b>Archives de vos déclarations</b></summary><div class="list">' + (p.stmts.slice(0, 20).map(x => '<div class="li"><div class="grow"><div class="eyebrow">' + E.fmtDate(x.date) + ' · ' + esc(x.src) + ' · ' + (D.THEMES[x.theme]?.l || x.theme) + '</div><div class="small">' + esc(x.text) + '</div></div></div>').join('') || '<p class="muted">Aucune déclaration.</p>') + '</div></details></div>';
    return h + '</div>';
  }
  // Un chapitre : la situation, vos propositions, celles d'en face, et des propositions prêtes à l'emploi
  async function chapterFlow(th, scope) {
    const p = P(); const com = E.commune(); const loc = L.local(com); const sc = scope || curScope(); const pop = com.pop; const fmt = v => sc === 'national' ? md(v) : E.eur(v);
    const pbs = L.problemsFor(sc, th, pop); const levs = L.leversFor(sc, th, pop);
    if (!levs.length) { toast('Pas de levier ' + (sc === 'local' ? 'municipal' : 'national') + ' sur ce thème.'); return; }
    const mine = p.prog.filter(m => m.status !== 'retiree' && m.level === sc && m.theme === th);
    const opp = (S().rivals || []).map(id => S().pnj[id]).filter(Boolean).flatMap(x => (x.prog || []).filter(pr => pr.lvl === sc && pr.th === th).map(pr => ({ x, pr })));
    let body = (pbs[0] ? '<p><b>' + esc(pbs[0].t) + '.</b> ' + esc(pbs[0].d(loc)) + '</p>' : '') +
      (mine.length ? '<div class="eyebrow">Vos propositions</div><ul class="small" style="margin:4px 0 8px;padding-left:18px">' + mine.map(m => '<li>' + esc(m.resume) + '</li>').join('') + '</ul>' : '') +
      (opp.length ? '<div class="eyebrow">En face</div><ul class="small" style="margin:4px 0 8px;padding-left:18px">' + opp.map(o => '<li>' + esc(o.x.name) + ' : ' + esc(o.pr.label) + '</li>').join('') + '</ul>' : '') +
      '<p class="muted small" style="margin:6px 0 0">Choisissez une proposition (3 h pour la préparer). Vous choisirez ensuite son financement.</p>';
    // propositions prêtes : celles des dossiers du thème, puis un exemplaire de chaque levier
    const seen = new Set(); const ready = [];
    pbs.forEach(pb => pb.o.forEach(([lid, v]) => { const k = lid + ':' + v; const lev = levs.find(z => z.id === lid); if (lev && !seen.has(k) && !mine.some(m => m.lever === lid)) { seen.add(k); ready.push({ lev, v, pb: pb.id }); } }));
    levs.forEach(lev => { if (!ready.some(r => r.lev.id === lev.id) && !mine.some(m => m.lever === lev.id)) ready.push({ lev, v: lev.def, pb: null }); });
    const opts = ready.slice(0, 5).map((r, i) => { const ev = L.evaluate(r.lev, r.v, L.bestFin(r.lev, r.v, com), com); return { l: ev.label, sub: (ev.cost > 0 ? fmt(ev.cost) + ' par an' : ev.cost < 0 ? 'rapporte ' + fmt(-ev.cost) + ' par an' : 'pas de coût annuel') + (ev.inv ? ' · investissement ' + fmt(ev.inv) : '') + (ev.gagnants.length ? ' · plaît aux ' + ev.gagnants.slice(0, 2).map(g => D.SEGS.find(x => x.id === g).name.toLowerCase()).join(' et ') : ''), v: i }; });
    const v = await choice(D.THEMES[th].l, body, opts.concat([{ l: 'Ajuster les chiffres moi-même', sub: 'Ampleur et financement, avec le coût en direct', v: 'tune' }, { l: 'Rédiger ma propre proposition', sub: 'Chiffrée et évaluée', v: 'own' }, CANCEL]));
    if (v == null) return; if (P().hours < 3) { toast('Il faut 3 h pour préparer une proposition.'); return; }
    if (v === 'tune') return builderFlow(ready[0] ? ready[0].lev.id : levs[0].id, { th, t: D.THEMES[th].l, o: [] });
    if (v === 'own') return ownMeasureFlow(sc);
    const r = ready[v]; const fin = await finFlow(r.lev, r.v); if (!fin) return;
    await addProp(r.lev.id, r.v, fin, r.pb);
  }
  // Choix du financement : la crédibilité de chaque option est affichée
  async function finFlow(lev, v) {
    const com = E.commune(); const ev0 = L.evaluate(lev, v, 'aucun', com); if (ev0.cost <= 0 && !ev0.inv) return 'aucun';
    const fs = L.FIN[lev.lvl].map(f => ({ f, c: L.evaluate(lev, v, f.id, com).cred })).sort((a, b) => b.c - a.c);
    return choice('Comment la financer ?', '<p class="small"><b>' + esc(ev0.label) + '</b></p><p class="muted small">La crédibilité de la proposition dépend de son financement. Vos adversaires attaqueront d’abord ce qui n’est pas financé.</p>', fs.map((x, i) => ({ l: x.f.l + (i === 0 ? ' (conseillé)' : ''), sub: 'Crédibilité ' + x.c + '/100 · ' + x.f.d, v: x.f.id })).concat([CANCEL]));
  }
  async function themePick(sc) {
    const ths = progThemes(sc); const live = P().prog.filter(m => m.status !== 'retiree' && m.level === sc);
    const t = await choice('Sur quel thème ?', '', ths.map(x => ({ l: D.THEMES[x.t].l + (x.known && x.w >= 0.2 ? ' · priorité des électeurs' : ''), sub: live.filter(m => m.theme === x.t).length ? 'Déjà ' + live.filter(m => m.theme === x.t).length + ' proposition(s)' : 'Aucune proposition', v: x.t })).concat([CANCEL]));
    if (t) await chapterFlow(t, sc);
  }

  /* ---------- Dossiers ---------- */
  function tDossiers() {
    const p = P(), s = S();
    let h = '<div class="grid"><div class="c6 card"><h3>Dossiers sur vos rivaux</h3>' + (p.dossiers.map(d => '<div class="li"><div class="grow"><b>' + esc(s.pnj[d.on].name) + '</b><div class="muted" style="font-size:13px">' + esc(d.label) + ' · gravité ' + d.g + '</div></div><button class="btn sm" data-act="fuite">Faire fuiter</button></div>').join('') || '<p class="muted">Aucun dossier. Un détective peut s’en charger (Agenda, Coups tordus).</p>') + '</div>';
    h += '<div class="c6 card"><h3>Vos casseroles</h3>' + (p.casseroles.map(c => '<div class="li"><div class="grow"><b>' + esc(c.label) + '</b><div class="muted" style="font-size:13px">' + (c.out ? '<span style="color:var(--bad)">Révélée le ' + E.fmtDate(c.outDate) + '</span>' : 'Latente · risque ' + (c.risk > 0.07 ? 'élevé' : c.risk > 0.04 ? 'moyen' : 'faible') + ' · connue de ' + c.known.length + ' proche(s)') + (c.legal ? ' · pénalement répréhensible' : '') + '</div></div></div>').join('') || '<p class="muted">Rien à se reprocher. Pour l’instant.</p>') + '</div>';
    h += '<div class="c6 card"><h3>Procédures judiciaires</h3>' + (p.procs.map(j => '<div class="li"><div class="grow"><b>' + esc(j.label) + '</b><div class="muted" style="font-size:13px">' + ({ enquete: 'Enquête préliminaire', mise_en_examen: 'Mise en examen', proces: 'Procès en attente', clos: 'Affaire jugée' }[j.stage]) + (j.stage !== 'clos' ? ' · prochaine étape vers le ' + E.fmtDate(j.next) : ' · ' + esc(j.verdict)) + '</div></div></div>').join('') || '<p class="muted">Aucune procédure.</p>') + (p.inelig && p.inelig > s.date ? '<p style="color:var(--bad)">Inéligible jusqu’au ' + E.fmtDate(p.inelig) + '.</p>' : '') + '</div>';
    h += '<div class="c6 card"><h3>Affirmations contestables</h3><p>' + (p.factchecks.length ? p.factchecks.length + ' affirmation(s) douteuse(s) circulent. Les vérificateurs peuvent tomber dessus à tout moment.' : 'Aucune affirmation douteuse en circulation.') + '</p></div>';
    return h + '</div>';
  }

  /* ---------- Journal ---------- */
  function tJournal() {
    const s = S();
    let h = '<div class="grid"><div class="c8 card"><h3>Journal de carrière</h3><div class="list">' + s.log.slice(0, 120).map(l => '<div class="li"><span class="muted num" style="font-size:12px;min-width:86px">' + l.date + '</span><div class="grow log-' + l.kind + '" style="font-size:13.5px">' + esc(l.t) + '</div></div>').join('') + '</div></div>';
    h += '<div class="c4 stack"><div class="card"><h3>Résultats électoraux</h3>' + (s.results.slice(0, 10).map(r => { const sn = r.snapshot[0]; return '<div style="margin-bottom:10px"><b>' + esc(r.label) + '</b> <span class="muted">· ' + (r.round === 1 ? '1er tour' : '2nd tour') + (sn ? ' · ' + esc(sn.name) : '') + '</span>' + (sn ? bars(sn.rows.slice(0, 4)) : '') + '</div>'; }).join('') || '<p class="muted">Aucun scrutin passé.</p>') + '</div>' +
      '<div class="card"><h3>Sauvegarde</h3><p class="muted" style="font-size:13px">Sauvegarde automatique à chaque période' + (Store.db ? ', liée à votre compte.' : ' dans ce navigateur.') + '</p><div class="row"><button class="btn sm" id="sv">Sauvegarder</button><button class="btn sm" id="ex">Copier la sauvegarde</button><button class="btn sm ghost" id="nw">Nouvelle partie</button></div></div></div>';
    return h + '</div>';
  }

  /* ---------- liaisons ---------- */
  function bind() {
    $app.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { if (b.classList.contains('off')) return; runScoped(b.dataset.act); });
    $app.querySelectorAll('[data-plan]').forEach(b => b.onclick = planFlow);
    $app.querySelectorAll('[data-replan]').forEach(b => b.onclick = async () => { const pl = planState(); pl.length = 0; (S().lastPlan || []).forEach(it => { const a = X.ACTIONS.find(x => x.id === it.id); if (a && X.avail(a) === true) pl.push({ id: it.id, o: Object.assign({}, it.o) }); }); if (pl.length) await runPlan(); });
    $app.querySelectorAll('[data-gnext]').forEach(b => b.onclick = () => { GV.guideNext(); render(); });
    $app.querySelectorAll('[data-gskip]').forEach(b => b.onclick = () => { GV.guideNext(true); render(); });
    $app.querySelectorAll('[data-keep]').forEach(b => b.onclick = () => { const before = X.snap(); const r = GV.keepPromise(b.dataset.keep); if (!r.ok) { toast(r.msg); return; } E.estimate(); render(); result('Promesse tenue', r.msg, before); });
    $app.querySelectorAll('[data-pmsg]').forEach(b => b.onclick = () => playerAct('msg', b.dataset.pmsg));
    $app.querySelectorAll('[data-pduel]').forEach(b => b.onclick = () => challengePlayer(b.dataset.pduel));
    $app.querySelectorAll('[data-pend]').forEach(b => b.onclick = async () => { const p = P(); MP.setEndorse(p.cand.el, p.cand.key, b.dataset.pend); await MP.send(b.dataset.pend, 'soutien', 'J’appelle à voter pour toi au second tour.'); E.article('dauph', p.name + ' appelle à voter pour son ami·e au second tour', 0.1, 'pj'); Store.save(); render(); toast('Consigne de vote publiée.'); });
    $app.querySelectorAll('[data-pwd]').forEach(b => b.onclick = async () => { const p = P(); const v = await choice('Se désister ?', '<p>Vous retirez votre candidature du second tour au profit de votre ami·e. C’est définitif.</p>', [{ l: 'Je me désiste', v: 'y' }, { l: 'Annuler', v: null }]); if (!v) return; MP.setWithdraw(p.cand.el, p.cand.key, b.dataset.pwd); await MP.send(b.dataset.pwd, 'msg', 'Je me désiste en ta faveur pour le second tour. Ne me déçois pas.'); E.addStd(1); p.cred = E.clamp(p.cred + 2, 0, 100); E.article('dauph', p.name + ' se désiste pour faire barrage', 0.2, 'pj'); Store.save(); render(); });
    $app.querySelectorAll('[data-psup]').forEach(b => b.onclick = () => playerAct('soutien', b.dataset.psup));
    $app.querySelectorAll('[data-patk]').forEach(b => b.onclick = () => playerAct('attaque', b.dataset.patk));
    const cp = document.getElementById('cpcode'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(S().mp.gid); toast('Code copié : ' + S().mp.gid); } catch (e) { toast('Code : ' + S().mp.gid); } };
    $app.querySelectorAll('[data-scope]').forEach(b => b.onclick = () => { UI.scope = b.dataset.scope; render(); });
    $app.querySelectorAll('[data-ofd]').forEach(b => b.onclick = () => { const [id, i] = b.dataset.ofd.split(':'); const before = X.snap(); const r = OF.decide(id, +i); if (!r.ok) { toast(r.msg); return; } E.estimate(); render(); if (r.act === 'interview') interviewFlow(); else result('Dossier traité', r.msg, before); });
    $app.querySelectorAll('[data-amdt]').forEach(b => b.onclick = () => { const before = X.snap(); const r = OF.amend(); if (!r.ok) { toast(r.msg); return; } render(); result('Amendements', r.msg, before); });
    $app.querySelectorAll('[data-speak]').forEach(b => b.onclick = speakFlow);
    $app.querySelectorAll('[data-vote]').forEach(b => b.onclick = () => { const r = OF.vote(b.dataset.vote); toast(r || 'Vote enregistré.'); render(); });
    const spl = document.getElementById('split'); if (spl) { spl.oninput = () => { const t = document.getElementById('splt'); if (t) t.textContent = spl.value + ' %'; }; spl.onchange = () => { OF.setSplit(+spl.value); render(); }; }
    $app.querySelectorAll('[data-bdec]').forEach(b => b.onclick = () => { const [id, i] = b.dataset.bdec.split(':'); bdec(id, +i); });
    $app.querySelectorAll('[data-dcpick]').forEach(b => b.onclick = () => dcFlow(!!HQ.dc()));
    $app.querySelectorAll('[data-hatk]').forEach(b => b.onclick = () => attackFlow(b.dataset.hatk));
    $app.querySelectorAll('[data-hrec]').forEach(b => b.onclick = () => { const r = HQ.recruit(); toast(r.msg); render(); });
    $app.querySelectorAll('[data-hcab]').forEach(b => b.onclick = () => cabFlow(b.dataset.hcab));
    const hedl = document.getElementById('hedl'); if (hedl) hedl.onclick = edlFlow;
    $app.querySelectorAll('[data-hcons]').forEach(b => b.onclick = consultFlow);
    $app.querySelectorAll('[data-hatel]').forEach(b => b.onclick = atelierFlow);
    $app.querySelectorAll('[data-hpub]').forEach(b => b.onclick = () => { const before = X.snap(); const r = HQ.publish(); if (!r.ok) { toast(r.msg); return; } render(); result('Programme publié', r.msg, before); });
    $app.querySelectorAll('[data-csub]').forEach(b => b.onclick = () => go('agir', 'c_' + b.dataset.csub));
    $app.querySelectorAll('[data-tal]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.tal.split(':'); TM.setAlloc(k, +d); render(); });
    $app.querySelectorAll('[data-tpre]').forEach(b => b.onclick = () => { TM.preset(b.dataset.tpre); render(); });
    $app.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => { const before = X.snap(); const r = TM[b.dataset.tm](); if (!r.ok) { toast(r.msg); return; } E.estimate(); render(); result(b.querySelector('b').textContent, r.msg, before); });
    $app.querySelectorAll('[data-fam]').forEach(b => b.onclick = () => { const [t, ids] = JSON.parse(b.dataset.fam); famSheet(t, ids); });
    $app.querySelectorAll('[data-defi]').forEach(b => b.onclick = () => runAction('defier', b.dataset.defi));
    $app.querySelectorAll('[data-enq]').forEach(b => b.onclick = () => runAction('enquete', b.dataset.enq));
    $app.querySelectorAll('[data-ret]').forEach(b => b.onclick = async () => { const m = P().prog.find(x => x.id === b.dataset.ret); if (!m) return; const ok = await choice('Retirer « ' + m.resume + ' » ?', '<p class="muted">Retirer une proposition déjà annoncée coûte un peu de crédibilité, surtout si elle était visible.</p>', [{ l: 'Retirer', v: 1 }, CANCEL]); if (!ok) return; m.status = 'retiree'; m.phare = false; P().cred = E.clamp(P().cred - (m.visib > 30 ? 2.5 : 0.5), 0, 100); E.estimate(); render(); });
    $app.querySelectorAll('[data-phare]').forEach(b => b.onclick = () => { toast(X.setPhare(b.dataset.phare)); render(); });
    $app.querySelectorAll('[data-def]').forEach(b => b.onclick = () => runAction('defendre', b.dataset.def));
    $app.querySelectorAll('[data-conf]').forEach(b => b.onclick = () => runAction('conference', b.dataset.conf));
    $app.querySelectorAll('[data-app]').forEach(b => b.onclick = () => { const m = P().prog.find(x => x.id === b.dataset.app); if (m && m.level === 'local' && m.lever && hasOF() && OF.isMaire()) { const r = OF.startPj({ lev: m.lever, l: m.resume, th: m.theme, mid: m.id, inv: m.inv, cost: m.cout, seg: m.segw }); toast(r.msg); render(); return; } runAction('appliquer', b.dataset.app); });
    $app.querySelectorAll('[data-chap]').forEach(b => b.onclick = () => chapterFlow(b.dataset.chap));
    $app.querySelectorAll('[data-prob]').forEach(b => b.onclick = () => problemFlow(b.dataset.prob));
    $app.querySelectorAll('[data-react]').forEach(b => b.onclick = () => reactFlow(b.dataset.react));
    $app.querySelectorAll('[data-atk]').forEach(b => b.onclick = () => { const [x, pr] = b.dataset.atk.split(':'); propAttackFlow(x, pr); });
    $app.querySelectorAll('[data-za]').forEach(b => b.onclick = () => { const [act, z] = b.dataset.za.split(':'); runAction(act, z); });
    $app.querySelectorAll('[data-focus]').forEach(b => b.onclick = () => { P().focusZone = b.dataset.focus; toast('Vos militants se concentrent sur ce secteur.'); render(); });
    const bl = document.getElementById('builder'); if (bl) bl.onclick = () => builderFlow();
    const op = document.getElementById('ownprop'); if (op) op.onclick = () => ownMeasureFlow();
    $app.querySelectorAll('[data-mis]').forEach(sl => sl.onchange = () => { const mm = E.MISSIONS[sl.value]; X.setMission(sl.dataset.mis, sl.value, null); render(); });
    $app.querySelectorAll('[data-mt]').forEach(sl => sl.onchange = () => { const st = P().staff.find(z => z.id === sl.dataset.mt); X.setMission(st.id, st.mission, sl.value); toast('Mission précisée.'); });
    $app.querySelectorAll('[data-raise]').forEach(b => b.onclick = () => { toast(X.raise(b.dataset.raise)); render(); });
    $app.querySelectorAll('[data-recad]').forEach(b => b.onclick = () => { toast(X.recadrer(b.dataset.recad)); render(); });
    $app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const [t, sb] = b.dataset.go.split(':'); go(t, sb); });
    $app.querySelectorAll('[data-thread]').forEach(b => b.onclick = () => openThread(b.dataset.thread));
    $app.querySelectorAll('[data-mapmode]').forEach(b => b.onclick = () => { UI.mapMode = b.dataset.mapmode; render(); });
    $app.querySelectorAll('[data-decl]').forEach(b => b.onclick = () => declareFlow(b.dataset.decl, 'tete'));
    $app.querySelectorAll('[data-cumul]').forEach(b => b.onclick = async () => { S().queue.push({ kind: 'cumul' }); await runQueue(); Store.save(); render(); });
    $app.querySelectorAll('[data-join]').forEach(b => b.onclick = () => joinFlow(b.dataset.join));
    $app.querySelectorAll('[data-pjm]').forEach(b => b.onclick = () => { const m = P().prog.find(x => x.id === b.dataset.pjm); if (!m) return; const lev = L.LEVERS.find(z => z.id === m.lever); const r = OF.startPj({ lev: m.lever, v: m.leverV, l: m.resume, th: m.theme, mid: m.id, inv: m.inv, cost: m.cout, seg: m.segw }); toast(r.msg); render(); });
    const pjn = document.getElementById('pjnew'); if (pjn) pjn.onclick = pjNewFlow;
    $app.querySelectorAll('[data-face]').forEach(b => b.onclick = () => { UI.face = b.dataset.face; if (b.dataset.face === 'pouvoir') go('agir', 'mandat'); else go('agir', 'c_actions'); });
    const lsw = document.getElementById('ln-switch'); if (lsw) lsw.onclick = switchFlow;
    $app.querySelectorAll('[data-joinr]').forEach(b => b.onclick = async () => { const id = b.dataset.joinr; const r = E.declare(id, 'colistier', P().rallied[id]); await info('Liste municipale', '<p>' + esc(r.msg) + '</p>'); render(); });
    $app.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { UI.filter = b.dataset.filter; render(); });
    $app.querySelectorAll('[data-rdv]').forEach(b => b.onclick = () => runAction('rdv', b.dataset.rdv));
    $app.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => runAction('accord', b.dataset.acc));
    $app.querySelectorAll('[data-betray]').forEach(b => b.onclick = async () => { const ok = await choice('Rompre l’accord ?', '<p>Votre partenaire réagira selon son tempérament : certains oublient, d’autres se vengent.</p>', [{ l: 'Rompre l’accord', v: true }, { l: 'Annuler', v: false }]); if (ok) { E.betray(b.dataset.betray); render(); } });
    $app.querySelectorAll('[data-fire]').forEach(b => b.onclick = () => { X.fire(b.dataset.fire); render(); });
    $app.querySelectorAll('[data-proj]').forEach(b => b.onclick = () => { const r = X.mairieProjet(b.dataset.proj); toast(r.msg); render(); });
    $app.querySelectorAll('[data-tf]').forEach(b => b.onclick = () => { toast(X.mairieTaxe(+b.dataset.tf)); render(); });
    const em = document.getElementById('emprunt'); if (em) em.onclick = () => { toast(X.mairieEmprunt()); render(); };
    const db = document.getElementById('debat'); if (db) db.onclick = debateFlow;
    const rt = document.getElementById('retire'); if (rt) rt.onclick = async () => { const ok = await choice('Retirer votre candidature ?', '<p>Les dépenses déjà engagées restent à votre charge.</p>', [{ l: 'Me retirer', v: true }, { l: 'Rester en lice', v: false }]); if (ok) { E.withdrawCand(); render(); } };
    const inj = document.getElementById('inject'); if (inj) inj.onclick = injectFlow;
    const sv = document.getElementById('sv'); if (sv) sv.onclick = async () => toast((await Store.save()) ? 'Partie sauvegardée.' : 'Sauvegarde impossible ici : copiez la sauvegarde.');
    const ex = document.getElementById('ex'); if (ex) ex.onclick = async () => { try { await navigator.clipboard.writeText(X.serialize()); toast('Sauvegarde copiée dans le presse-papiers.'); } catch (e) { modal('<h2>Sauvegarde</h2><p class="muted">Copiez ce texte et gardez-le.</p><textarea readonly style="min-height:200px">' + esc(X.serialize()) + '</textarea><div class="foot"><button class="btn" data-ok>Fermer</button></div>', (m, close) => m.querySelector('[data-ok]').onclick = close); } };
    const nw = document.getElementById('nw'); if (nw) nw.onclick = async () => { const ok = await choice('Nouvelle partie ?', '<p>La partie en cours sera remplacée à la prochaine sauvegarde.</p>', [{ l: 'Recommencer une carrière', v: true }, { l: 'Annuler', v: false }]); if (ok) { G.S = null; UI.screen = 'home'; render(); } };
  }

  /* ---------- actions ---------- */
  const segOpts = () => D.SEGS.map(s => ({ l: s.name, sub: 'Votre image : ' + r0(P().image[s.id] || 0), v: s.id }));
  function pnjPick(title, f) { const L = E.pnjList(f).sort((a, b) => (b.known - a.known) || b.noto - a.noto).slice(0, 40); if (!L.length) { toast('Personne à contacter pour l’instant.'); return Promise.resolve(null); } return choice(title, '', L.map(x => ({ l: x.name + ' — ' + (x.role === 'journaliste' ? x.mandat : (D.PARTIES[x.party].short + ', ' + (x.mandat || ROLE_L[x.role]))), sub: 'Relation ' + r0(x.rel) + ' · notoriété ' + r0(x.noto), v: x.id })).concat([{ l: 'Annuler', v: null }])); }
  async function runAction(id, preset) {
    const a = X.ACTIONS.find(x => x.id === id); const av = X.avail(a); if (av !== true) { toast(av); return; }
    let o = {};
    if (a.input === 'zone') { const zs = curZones(); if (zs) { o.zone = preset || await choice(a.l, '<p class="muted">Où allez-vous ?</p>', zs.map(z => ({ l: z.name, sub: zoneSub(z), v: z.id })).concat([{ l: 'Annuler', v: null }])); if (!o.zone) return; } else { o.seg = await choice(a.l, '<p class="muted">Quel électorat ciblez-vous ?</p>', segOpts().concat([{ l: 'Annuler', v: null }])); if (!o.seg) return; } }
    if (a.input === 'off') { await offFlow(preset); return; }
    if (a.input === 'seg') { o.seg = await choice(a.l, '<p class="muted">Quel électorat ciblez-vous ?</p>', segOpts().concat([{ l: 'Annuler', v: null }])); if (!o.seg) return; }
    if (a.input === 'journalist') { o.pnj = await pnjPick(a.l, x => x.role === 'journaliste' && scopeOk(x)); if (!o.pnj) return; }
    if (a.input === 'pnjrival') { o.pnj = preset || await pnjPick(a.l, x => x.known && x.role !== 'journaliste' && x.role !== 'notable'); if (!o.pnj) return; }
    if (a.input === 'measure') { await measureFlow(); return; }
    if (a.input === 'natev') { await reactFlow(preset); return; }
    if (a.input === 'mes' || a.input === 'mesapp') { const L = P().prog.filter(m => m.status !== 'retiree' && (a.input === 'mes' || !m.status || m.status === 'proposee')); o.mes = preset || await choice(a.l, '', L.map(m => ({ l: (m.phare ? '★ ' : '') + m.resume, sub: (m.level === 'local' ? 'Locale' : 'Nationale') + ' · visibilité ' + r0(m.visib) + ' · crédibilité ' + r0(m.cred), v: m.id })).concat([{ l: 'Annuler', v: null }])); if (!o.mes) return; if (a.ai === 'conference') { await conferenceFlow(o.mes); return; } }
    if (a.input === 'rival') { const id = preset || await choice(a.l, '', (S().rivals || []).map(i => S().pnj[i]).filter(Boolean).map(x => ({ l: x.name + ' — ' + D.PARTIES[x.party].short, v: x.id })).concat([{ l: 'Annuler', v: null }])); if (!id) return; await challengeFlow(id); return; }
    if (a.input === 'theme') { o.theme = await choice(a.l, '', Object.entries(D.THEMES).map(([k, t]) => ({ l: t.l, v: k })).concat([{ l: 'Annuler', v: null }])); if (!o.theme) return; }
    if (a.input === 'fuite') { o.dossier = await choice('Quel dossier ?', '', P().dossiers.map(d => ({ l: S().pnj[d.on].name + ' : ' + d.label, v: d.id })).concat([{ l: 'Annuler', v: null }])); if (!o.dossier) return; o.pnj = await pnjPick('À quel·le journaliste ?', x => x.role === 'journaliste'); if (!o.pnj) return; }
    if (a.input === 'role') { const role = await choice('Quel poste ?', '', Object.entries(D.STAFF_ROLES).map(([k, r]) => ({ l: r.l, sub: r.d, v: k })).concat([{ l: 'Annuler', v: null }])); if (!role) return; P().hours -= a.h; const cs = X.staffCandidates(role); const pickd = await choice('Candidat·e·s : ' + D.STAFF_ROLES[role].l, '<p class="muted">La loyauté affichée est une impression d’entretien.</p>', cs.map(c => ({ l: c.name + ' — ' + (c.sal ? E.eur(c.sal) + '/mois' : 'bénévole'), sub: 'Compétence ' + c.comp + ' · loyauté ≈ ' + E.clamp(r0(c.loy / 10) * 10 + E.rint(-1, 1) * 10, 0, 100) + ' · ambition ' + c.amb, v: c })).concat([{ l: 'Ne recruter personne', v: null }])); if (pickd) { const cur = P().staff.find(x => x.role === role); if (cur && !(await choice('Remplacer ' + cur.name + ' ?', '<p>' + esc(cur.name) + ' occupe déjà ce poste. Recruter ' + esc(pickd.name) + ' met fin à sa mission.</p>', [{ l: 'Remplacer', v: true }, { l: 'Garder ' + cur.name, v: false }]))) { render(); return; } X.hire(pickd); } render(); return; }
    if (a.input === 'accord') { await accordFlow(preset); return; }
    if (a.input === 'grand') { o.grand = await choice(a.l, '<p class="muted">Un seul grand chantier à la fois, financé à 60 % par l’emprunt.</p>', LF.GRANDS.map(g => ({ l: g.l, sub: g.m + ' mois prévus · ' + E.eur(Math.round(P().mairie.invest * g.c * 2)) + ' · plaît aux ' + topSegs(g.seg), v: g.id })).concat([CANCEL])); if (!o.grand) return; }
    if (a.input === 'com') { o.com = await choice(a.l, '<p class="muted">Votre commission fixe votre spécialité pour tout le mandat.</p>', Object.entries(LF.COMMISSIONS).map(([k, c]) => ({ l: 'Commission ' + (c[0] === 'Lois' ? 'des lois' : c[0] === 'Défense' ? 'de la défense' : c[0] === 'Finances' ? 'des finances' : 'des ' + c[0].toLowerCase()), sub: 'Expertise : ' + D.THEMES[c[1]].l, v: k })).concat([CANCEL])); if (!o.com) return; }
    if (a.input === 'reforme') { const rf = await reformeFlow(); if (!rf) return; Object.assign(o, rf); }
    if (a.input === 'pm') { o.pm = await pnjPick(a.l, x => x.alive !== false && !['journaliste', 'notable'].includes(x.role) && (x.party === P().party || S().national.gov.includes(x.party)) && x.noto >= 30); if (!o.pm) return; }
    if (a.input === 'refq') { const qs = shuffle(D.QUIZ_POOL.map((_, i) => i)).slice(0, 5); const qv = await choice(a.l, '<p class="muted">Quelle question posez-vous aux Français ? Le résultat dépend de l’opinion… et de votre popularité.</p>', qs.map(i => ({ l: D.QUIZ_POOL[i].q, v: String(i) })).concat([CANCEL])); if (qv == null) return; o.qi = +qv; }
    if (a.ai) { await aiAction(a, preset); return; }
    const before = X.snap(); const r = X.doAction(id, o); if (!r.ok) { toast(r.msg); return; } render(); result(a.l, r.msg, before);
    if (id === 'focus') await voicesModal();
  }
  async function accordFlow(preset) {
    const pid = preset || await pnjPick('Proposer un accord à…', x => x.known && !['journaliste'].includes(x.role)); if (!pid) return;
    const x = S().pnj[pid]; const a = X.ACTIONS.find(z => z.id === 'accord'); if (P().hours < a.h) { toast('Pas assez d’heures (2 h).'); return; }
    const sel = await new Promise(res => modal('<h2>Accord avec ' + esc(x.name) + '</h2><p class="muted">' + esc(x.mandat || ROLE_L[x.role]) + ' · relation ' + r0(x.rel) + '</p>' + Object.entries(E.CLAUSES).map(([k, l]) => '<label class="opt" style="display:flex;gap:8px;align-items:center"><input type="checkbox" value="' + k + '"> ' + l + '</label>').join('') + '<label class="f" style="margin-top:8px">Contrepartie offerte<select class="field" id="off"><option value="0">Aucune</option><option value="1">Une place de choix plus tard</option><option value="2">Un poste important</option></select></label><div class="foot"><button class="btn ghost" data-x>Annuler</button><button class="btn primary" data-ok>Proposer (2 h)</button></div>', (m, close) => { m.querySelector('[data-x]').onclick = () => { close(); res(null); }; m.querySelector('[data-ok]').onclick = () => { const cl = [...m.querySelectorAll('input:checked')].map(i => i.value); if (!cl.length) return; close(); res({ cl, off: +m.querySelector('#off').value }); }; }));
    if (!sel) return; P().hours -= a.h; const r = E.proposeAccord(pid, sel.cl, sel.off); if (sel.off && r.ok) P().promises.push({ to: pid, what: sel.off === 2 ? 'poste' : 'place', date: S().date }); toast(r.msg); render();
  }
  async function aiAction(a, preset) {
    if (a.ai === 'dialogue') return dialogueFlow(preset);
    if (['post', 'tribune', 'speech', 'contribution', 'qag'].includes(a.ai) && !preset) return writerFlow(a);
    if (a.ai === 'interview') return interviewFlow();
    const PROMPTS = { post: ['Publier sur X', 'Votre message (280 caractères). Le ton, les chiffres et la cohérence comptent.', 'Ex. À Voiron, les urgences ferment la nuit. Je demande…', 280], tribune: ['Écrire une tribune', 'Une prise de position argumentée.', 'Votre texte…', 3000], measure: ['Rédiger une mesure', 'Décrivez une mesure concrète. Elle sera chiffrée, et on vérifiera si votre futur mandat permet de la mettre en œuvre.', 'Ex. Gratuité des transports scolaires dans la commune, financée par…', 1200], speech: ['Discours de meeting', 'Écrivez le cœur de votre discours. Une salle vous écoute.', 'Mes chers amis…', 3000], qag: ['Question au gouvernement', 'Deux minutes, en direct à la télévision.', 'Madame la Première ministre…', 1200], contribution: ['Contribution interne', 'Votre texte d’orientation pour le parti. Une ligne claire rassemble un courant ; une ligne à contre-courant vous distingue mais fâche la direction.', 'Pour reconquérir les classes populaires, notre parti doit…', 3000] };
    const pr = PROMPTS[a.ai]; let extra = '';
    if (a.ai === 'tribune') extra = '<label class="f" style="margin:8px 0">Journal<select class="field" data-extra="media">' + D.MEDIAS.filter(m => m.id !== 'alpes3' && m.id !== 'radio' && m.id !== 'info24').map(m => '<option value="' + m.id + '">' + m.name + '</option>').join('') + '</select></label>';
    const r = await ask(pr[0], '<p class="muted">' + pr[1] + '</p>', pr[2], { max: pr[3], extra, btn: 'Envoyer (' + a.h + ' h)' }); if (!r) return;
    const before = X.snap(); const st = X.startAI(a.id); if (!st.ok) { toast(st.msg); return; }
    const ld = loading(A.state === 'on' ? 'Claude analyse votre texte…' : 'Analyse…');
    const fn = { post: A.post, tribune: A.tribune, measure: A.measure, speech: A.speech, qag: A.qag, contribution: A.tribune }[a.ai]; const ev = await fn(r.text); ld.close();
    let body = '';
    if (a.ai === 'post') body = '<p>' + esc(X.applyPost(r.text, ev)) + '</p>';
    if (a.ai === 'tribune') body = '<p>' + esc(X.applyTribune(r.text, ev, r.extra.media || 'dauph')) + '</p>';
    if (a.ai === 'speech') body = '<p>' + esc(X.applySpeech(r.text, ev)) + '</p>' + (ev.punchline ? '<p><b>Reprise par les médias :</b> « ' + esc(ev.punchline) + ' »</p>' : '');
    if (a.ai === 'contribution') body = '<p>' + esc(X.applyContribution(r.text, ev)) + '</p>';
    if (a.ai === 'qag') body = '<p>' + esc(X.applyQag(r.text, ev)) + '</p>' + (ev.reponse_ministre ? '<p class="muted"><b>Réponse du ministre :</b> ' + esc(ev.reponse_ministre) + '</p>' : '');
    if (a.ai === 'measure') { const m = X.applyMeasure(r.text, ev); body = '<div class="kpis">' + kpi('Coût annuel', m.cout ? E.eur(m.cout) : 'non chiffré') + kpi('Compétence', esc(m.competence)) + kpi('Crédibilité', r0(m.cred), m.cred) + '</div><p><b>' + esc(m.resume) + '</b></p>' + (m.critique ? '<p class="muted">Objection : ' + esc(m.critique) + '</p>' : '') + (m.gagnants.length ? '<p>Plaît à : ' + m.gagnants.map(s => D.SEGS.find(g => g.id === s)?.name).filter(Boolean).join(', ') + '</p>' : '') + (m.perdants.length ? '<p>Déplaît à : ' + m.perdants.map(s => D.SEGS.find(g => g.id === s)?.name).filter(Boolean).join(', ') + '</p>' : ''); }
    if (ev._fallback) body += '<p class="muted" style="font-size:12px">Évaluation scriptée (IA indisponible).</p>';
    E.estimate(); body += '<div class="sep"></div><div class="eyebrow">Effets</div>' + chipsHTML(X.deltas(before, X.snap()));
    await info(pr[0], body); render();
  }

  /* ---------- terrain ---------- */
  function curKey() { const p = P(); if (p.cand) return p.cand.key; const e = E.nextElection(x => !E.LIST_T.includes(x.type) && x.type !== 'pres' && x.status !== 'fini'); return e ? E.electionUnit(e.type) : null; }
  function curZones() { const k = curKey(); return k ? E.zonesFor(k) : null; }
  function leanL(l) { return l > 15 ? 'favorable' : l > 3 ? 'plutôt favorable' : l > -3 ? 'disputé' : l > -15 ? 'plutôt hostile' : 'hostile'; }
  function zoneSub(z) { const top = z.mix.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 2).map(([, i]) => D.SEGS[i].name.toLowerCase()); return Math.round(z.w * 100) + ' % des électeurs · ' + top.join(', ') + ' · couverture ' + Math.round(z.cover) + ' % · terrain ' + leanL(E.zoneLean(z)); }
  function fieldBlock() {
    const zs = curZones(); if (!zs) return ''; const p = P(); const fe = E.fieldEffect(curKey()) || {}; const mob = Object.values(fe).reduce((a, b) => a + b, 0) / 6;
    return '<div class="card" style="margin-top:14px"><h3>Carte de terrain <span class="muted">Mobilisation ' + Math.round(mob / 0.17 * 100) + ' %</span></h3><p class="muted small" style="margin:0 0 8px">La couverture de chaque secteur mobilise vos électeurs potentiels le jour du vote. Elle s’érode si vous n’y retournez pas. Vos militants renforcent le secteur prioritaire à chaque tour.</p>' +
      zs.map(z => '<div class="zone"><div class="row" style="justify-content:space-between;gap:8px"><div><b>' + esc(z.name) + '</b>' + (p.focusZone === z.id ? ' <span class="chip red">prioritaire</span>' : '') + '<div class="muted small">' + esc(zoneSub(z)) + '</div></div></div><div class="hbar" style="width:100%;height:8px;margin:6px 0"><i style="width:' + z.cover + '%;background:var(--accent)"></i></div><div class="row" style="gap:6px"><button class="btn sm" data-za="porte:' + z.id + '">Porte-à-porte · 6 h</button><button class="btn sm" data-za="marche:' + z.id + '">Tractage · 3 h</button><button class="btn sm" data-za="appart:' + z.id + '">Réunion · 4 h</button>' + (p.focusZone !== z.id ? '<button class="btn sm ghost" data-focus="' + z.id + '">Militants ici</button>' : '') + '</div></div>').join('') + '</div>';
  }

  /* ---------- rédaction assistée ---------- */
  async function composerFlow(a) {
    const s = S(), p = P(); const kind = a.ai; const loc = E.commune().name;
    const subs = [];
    p.prog.filter(m => m.status !== 'retiree').sort((x, y) => y.phare - x.phare).slice(0, 4).forEach(m => subs.push({ l: 'Défendre : ' + m.resume, v: { kind: 'mesure', m, t: m.resume, th: m.theme, desc: 'défendre sa proposition « ' + m.resume + ' »' + (m.finL ? ' (financement : ' + m.finL + ')' : '') + (m.ind ? ' ; impact : ' + m.ind : '') } }));
    (s.recentEv || []).slice(0, 2).forEach(r => { const e = E.evById(r.id, r.custom); if (e && e.ch) subs.push({ l: 'Réagir : ' + e.t, v: { kind: 'actu', e, t: e.t, th: e.th, desc: 'réagir à l’actualité nationale « ' + e.t + ' » en la rapportant à ' + loc } }); });
    (s.rivals || []).map(id => s.pnj[id]).filter(Boolean).forEach(x => (x.prog || []).slice(0, 2).forEach(pr => subs.push({ l: 'Attaquer : ' + x.name + ' — ' + pr.label, v: { kind: 'rival', x, pr, t: pr.label, th: pr.th, desc: 'critiquer la proposition « ' + pr.label + ' » ' + E.de(x.name) + ' (financement : ' + pr.fin + ')' } })));
    Object.entries(s.national.salience).sort((x, y) => y[1] - x[1]).slice(0, 3).forEach(([th]) => subs.push({ l: 'Thème : ' + D.THEMES[th].l, v: { kind: 'theme', t: D.THEMES[th].l, th, desc: 'sa position sur le thème « ' + D.THEMES[th].l + ' »' } }));
    const sub = await choice(kind === 'post' ? 'Publier sur X' : 'Écrire une tribune', '<p class="muted">Sur quoi ?</p>', subs.concat([{ l: 'Écrire entièrement moi-même', v: 'own' }, { l: 'Annuler', v: null }]));
    if (!sub) return; if (sub === 'own') return aiAction(a, true);
    const tone = await choice('Quel ton ?', '', [{ l: 'Combatif', v: 'combatif' }, { l: 'Pédagogique, chiffré', v: 'pedago' }, { l: 'Émotion, vécu', v: 'emotion' }, { l: 'Ironique', v: 'ironie' }, { l: 'Annuler', v: null }]); if (!tone) return;
    const ld = loading('Rédaction des propositions…'); const dr = await A.drafts(kind, sub, tone); ld.close();
    const pickd = await choice('Choisissez un texte', dr._fallback ? '<p class="muted small">Brouillons générés sans IA.</p>' : '', dr.textes.slice(0, 3).map((t, i) => ({ l: t.length > 160 ? t.slice(0, 160) + '…' : t, v: 't' + i })).concat([{ l: 'Modifier un brouillon avant publication', v: 'edit' }, { l: 'Annuler', v: null }]));
    if (!pickd) return; let text = pickd === 'edit' ? null : dr.textes[+pickd.slice(1)];
    if (pickd === 'edit') { const r = await ask('Retouchez votre texte', '', '', { max: kind === 'post' ? 280 : 3000, value: dr.textes[0], btn: 'Publier' }); if (!r) return; text = r.text; }
    let media = 'dauph'; if (kind === 'tribune') { media = await choice('Dans quel journal ?', '', D.MEDIAS.filter(m => !['alpes3', 'radio', 'info24'].includes(m.id)).map(m => ({ l: m.name, sub: m.kind, v: m.id }))); }
    const before = X.snap(); const st = X.startAI(a.id); if (!st.ok) { toast(st.msg); return; }
    const ld2 = loading('Publication…'); const ev = await (kind === 'post' ? A.post(text) : A.tribune(text)); ld2.close();
    let body = '<p class="small">« ' + esc(text.slice(0, 300)) + (text.length > 300 ? '…' : '') + ' »</p><p>' + esc(kind === 'post' ? X.applyPost(text, ev) : X.applyTribune(text, ev, media)) + '</p>';
    if (sub.kind === 'rival' && typeof DP !== 'undefined') { const r = DP.attackProp(sub.x.id, sub.pr.id, 'cout'); body += '<p>' + esc(r.msg) + '</p>'; }
    if (sub.kind === 'mesure') sub.m.visib = E.clamp(sub.m.visib + (kind === 'post' ? 6 : 12), 0, 100);
    E.estimate(); body += '<div class="sep"></div><div class="eyebrow">Effets</div>' + chipsHTML(X.deltas(before, X.snap())); await info(kind === 'post' ? 'Publié' : 'Tribune publiée', body); render();
  }

  /* ---------- atelier d’écriture ---------- */
  const WK = { speech: 'Discours de meeting', tribune: 'Tribune', contribution: 'Contribution au parti', post: 'Message sur X', qag: 'Question au gouvernement' };
  const WTONES = [['combatif', 'Combatif'], ['pedago', 'Pédagogique, chiffré'], ['emotion', 'Émotion, vécu'], ['rassembleur', 'Rassembleur'], ['ironie', 'Ironique'], ['solennel', 'Solennel']];
  function writerHTML(W, a) {
    const s = S(), p = P(); const lim = W.kind === 'post' ? 280 : 6000;
    const chip = (attr, v, on, l) => '<button data-' + attr + '="' + esc(v) + '" class="' + (on ? 'on' : '') + '">' + l + '</button>';
    const ths = Object.keys(D.THEMES).sort((x, y) => (s.national.salience[y] || 0) - (s.national.salience[x] || 0));
    const live = p.prog.filter(m => m.status !== 'retiree');
    const atk = []; (s.rivals || []).map(id => s.pnj[id]).filter(Boolean).forEach(x => (x.prog || []).slice(0, 2).forEach(pr => atk.push({ x, pr })));
    let h = '<h2>' + WK[W.kind] + '</h2><div class="seg" style="margin-bottom:10px">' + [['ia', 'Générer avec l’IA'], ['libre', 'Rédiger moi-même']].map(([k, l]) => '<button data-wm="' + k + '" class="' + (W.mode === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
    if (W.mode === 'ia') {
      h += '<div class="eyebrow">Thèmes <span class="muted">(3 au plus)</span></div><div class="chips wch">' + ths.map(t => chip('wt', t, W.themes.includes(t), esc(D.THEMES[t].l))).join('') + '</div>';
      if (live.length) h += '<div class="eyebrow">Mesures chiffrées à défendre</div><div class="chips wch">' + live.map(m => chip('wme', m.id, W.measures.includes(m.id), esc(m.resume) + (m.cout ? ' <span class="num muted">' + E.eur(m.cout) + '</span>' : ''))).join('') + '</div>';
      else h += '<p class="muted small">Aucune mesure dans votre programme : construisez-en dans Agir › Programme pour pouvoir les chiffrer ici.</p>';
      h += '<div class="eyebrow">Ton</div><div class="chips wch">' + WTONES.map(([k, l]) => chip('wtn', k, W.tone === k, l)).join('') + '</div>';
      h += '<div class="eyebrow">Échelle</div><div class="chips wch">' + chip('wsc', 'local', W.scope === 'local', 'Local') + chip('wsc', 'national', W.scope === 'national', 'National') + '</div>';
      h += '<div class="eyebrow">Électorats visés</div><div class="chips wch">' + D.SEGS.map(g => chip('wsg', g.id, W.segs.includes(g.id), esc(g.name))).join('') + '</div>';
      if (atk.length && W.kind !== 'contribution') h += '<div class="eyebrow">Attaquer une proposition adverse</div><select class="field" id="w-atk"><option value="">Non</option>' + atk.map((t, i) => '<option value="' + i + '"' + (W.atk === i ? ' selected' : '') + '>' + esc(t.x.name + ' : ' + t.pr.label) + '</option>').join('') + '</select>';
      if (W.kind !== 'post') h += '<div class="eyebrow" style="margin-top:10px">Longueur</div><div class="chips wch">' + [['court', 'Court'], ['moyen', 'Moyen'], ['long', 'Long']].map(([k, l]) => chip('wln', k, W.len === k, l)).join('') + '</div>';
      h += '<label class="f" style="margin-top:8px">Consignes libres <input class="field" id="w-extra" maxlength="200" value="' + esc(W.extra) + '" placeholder="Ex. citer la fermeture de la maternité, finir sur un appel au vote"></label>';
      h += '<div class="row" style="margin:10px 0"><button class="btn primary" data-wgen>' + (W.text ? 'Regénérer' : 'Générer le texte') + '</button>' + (A.state !== 'on' ? '<span class="muted small">IA indisponible : brouillon scripté.</span>' : '') + '</div>';
    } else h += '<p class="muted small" style="margin:0 0 8px">Écrivez librement. ' + (W.kind === 'speech' ? 'Un bon discours : une accroche, deux ou trois propositions chiffrées, une formule, un appel.' : W.kind === 'contribution' ? 'Une contribution pèse si elle propose une ligne claire et des mesures.' : 'Le ton, les chiffres et la cohérence avec vos positions comptent.') + '</p>';
    if (W.kind === 'tribune') h += '<label class="f">Journal<select class="field" id="w-media">' + D.MEDIAS.filter(m => !['alpes3', 'radio', 'info24'].includes(m.id)).map(m => '<option value="' + m.id + '"' + (W.media === m.id ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') + '</select></label>';
    h += '<textarea class="field" id="w-text" rows="' + (W.kind === 'post' ? 4 : 10) + '" maxlength="' + lim + '" placeholder="' + (W.mode === 'ia' ? 'Le texte généré apparaîtra ici. Vous pourrez le retoucher.' : 'Votre texte…') + '" style="margin-top:8px">' + esc(W.text) + '</textarea><div class="muted small num" id="w-count" style="text-align:right">' + W.text.length + ' / ' + lim + '</div>';
    h += '<div class="foot"><button class="btn ghost" data-wx>Annuler</button><button class="btn primary" data-wgo>' + (W.kind === 'speech' ? 'Prononcer' : W.kind === 'qag' ? 'Poser la question' : 'Publier') + ' · ' + a.h + ' h</button></div>';
    return h;
  }
  function writerFlow(a) {
    const s = S(), p = P(); const top = Object.entries(s.national.salience).sort((x, y) => y[1] - x[1])[0];
    const W = { kind: a.ai, mode: 'ia', themes: top ? [top[0]] : [], measures: p.prog.filter(m => m.phare && m.status !== 'retiree').slice(0, 1).map(m => m.id), tone: 'combatif', scope: X.curLevel() || 'local', segs: [], atk: null, len: 'moyen', extra: '', text: '', media: 'dauph' };
    return new Promise(resolve => {
      const { m, close } = modal('', null, 'writer');
      const tog = (arr, v, max) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else { arr.push(v); if (max && arr.length > max) arr.shift(); } };
      const keep = () => { const t = m.querySelector('#w-text'); if (t) W.text = t.value; const e = m.querySelector('#w-extra'); if (e) W.extra = e.value; const md = m.querySelector('#w-media'); if (md) W.media = md.value; const at = m.querySelector('#w-atk'); if (at) W.atk = at.value === '' ? null : +at.value; };
      const draw = () => { const st = m.scrollTop; m.innerHTML = writerHTML(W, a); m.scrollTop = st; wire(); };
      const wire = () => {
        m.querySelectorAll('[data-wm]').forEach(b => b.onclick = () => { keep(); W.mode = b.dataset.wm; draw(); });
        m.querySelectorAll('[data-wt]').forEach(b => b.onclick = () => { keep(); tog(W.themes, b.dataset.wt, 3); draw(); });
        m.querySelectorAll('[data-wme]').forEach(b => b.onclick = () => { keep(); tog(W.measures, b.dataset.wme, 4); draw(); });
        m.querySelectorAll('[data-wsg]').forEach(b => b.onclick = () => { keep(); tog(W.segs, b.dataset.wsg, 3); draw(); });
        m.querySelectorAll('[data-wtn]').forEach(b => b.onclick = () => { keep(); W.tone = b.dataset.wtn; draw(); });
        m.querySelectorAll('[data-wsc]').forEach(b => b.onclick = () => { keep(); W.scope = b.dataset.wsc; draw(); });
        m.querySelectorAll('[data-wln]').forEach(b => b.onclick = () => { keep(); W.len = b.dataset.wln; draw(); });
        const t = m.querySelector('#w-text'); if (t) t.oninput = () => { m.querySelector('#w-count').textContent = t.value.length + ' / ' + (W.kind === 'post' ? 280 : 6000); };
        const g = m.querySelector('[data-wgen]'); if (g) g.onclick = async () => { keep(); g.disabled = true; g.textContent = 'Rédaction…';
          const atk = []; (S().rivals || []).map(id => S().pnj[id]).filter(Boolean).forEach(x => (x.prog || []).slice(0, 2).forEach(pr => atk.push({ x, pr })));
          const spec = { themes: W.themes, measures: P().prog.filter(x => W.measures.includes(x.id)), tone: W.tone, scope: W.scope, segs: W.segs, attack: W.atk != null ? atk[W.atk] : null, len: W.len, extra: W.extra };
          const r = await A.write(W.kind, spec); W.text = W.kind === 'post' ? r.text.slice(0, 280) : r.text; draw(); };
        m.querySelector('[data-wx]').onclick = () => { close(); resolve(); };
        m.querySelector('[data-wgo]').onclick = async () => { keep(); const text = W.text.trim(); if (text.length < 20) { toast('Le texte est trop court.'); return; } close(); await publishWritten(a, W, text); resolve(); };
      };
      draw();
    });
  }
  async function publishWritten(a, W, text) {
    const s = S(), p = P(); const before = X.snap(); const st = X.startAI(a.id); if (!st.ok) { toast(st.msg); return; }
    const ld = loading(A.state === 'on' ? 'Réactions en cours…' : 'Analyse…');
    const fn = { post: A.post, tribune: A.tribune, speech: A.speech, qag: A.qag, contribution: A.tribune }[a.ai]; const ev = await fn(text); ld.close();
    let body = '<p class="small">« ' + esc(text.slice(0, 280)) + (text.length > 280 ? '…' : '') + ' »</p>';
    if (a.ai === 'post') body += '<p>' + esc(X.applyPost(text, ev)) + '</p>';
    if (a.ai === 'tribune') body += '<p>' + esc(X.applyTribune(text, ev, W.media || 'dauph')) + '</p>';
    if (a.ai === 'speech') body += '<p>' + esc(X.applySpeech(text, ev)) + '</p>' + (ev.punchline ? '<p><b>Reprise par les médias :</b> « ' + esc(ev.punchline) + ' »</p>' : '');
    if (a.ai === 'contribution') body += '<p>' + esc(X.applyContribution(text, ev)) + '</p>';
    if (a.ai === 'qag') body += '<p>' + esc(X.applyQag(text, ev)) + '</p>' + (ev.reponse_ministre ? '<p class="muted"><b>Réponse du ministre :</b> ' + esc(ev.reponse_ministre) + '</p>' : '');
    const ms = p.prog.filter(x => W.measures.includes(x.id) && text.toLowerCase().includes(x.resume.toLowerCase().slice(0, 18)));
    ms.forEach(x => { x.visib = E.clamp((x.visib || 0) + (a.ai === 'post' ? 5 : a.ai === 'speech' ? 10 : 12), 0, 100); }); if (ms.length) body += '<p class="small">Mesures mises en avant : ' + ms.map(x => esc(x.resume)).join(', ') + '.</p>';
    if (W.segs.length) W.segs.forEach(g => E.addImage(g, 0.6));
    if (W.mode === 'libre') { p.cred = E.clamp(p.cred + 0.5, 0, 100); }
    if (ev._fallback) body += '<p class="muted" style="font-size:12px">Évaluation scriptée (IA indisponible).</p>';
    E.estimate(); body += '<div class="sep"></div><div class="eyebrow">Effets</div>' + chipsHTML(X.deltas(before, X.snap()));
    await info(WK[a.ai], body); render();
  }

  /* ---------- presse : off et interviews ---------- */
  const toneOf = j => j.rel >= 30 ? 'bienveillant, questions ouvertes' : j.rel <= -20 ? 'hostile, questions piège et relances agressives' : 'pugnace mais loyal';
  const jSub = j => { const m = D.MEDIAS.find(x => x.id === j.territory); const aud = Object.entries(m.reach).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => D.SEGS.find(x => x.id === g).name.toLowerCase()); return m.kind + ' · audience : ' + aud.join(', ') + ' · relation ' + r0(j.rel) + ' (' + (j.rel >= 30 ? 'bienveillant' : j.rel <= -20 ? 'hostile' : 'neutre') + ')'; };
  async function offFlow(preset) {
    if (P().hours < 1) { toast('Il faut 1 h.'); return; }
    const jid = preset || await choice('À quel journaliste ?', '', E.pnjList(x => x.role === 'journaliste').map(j => ({ l: j.name + ' — ' + D.MEDIAS.find(m => m.id === j.territory).name, sub: jSub(j), v: j.id })).concat([{ l: 'Annuler', v: null }])); if (!jid) return;
    const opts = [{ l: 'Lui confier votre stratégie', sub: 'Gage de confiance : relation +10, petit risque de fuite', v: 'strategie' }, { l: 'Lui demander de couvrir votre prochain déplacement', sub: 'Reportage flatteur si la relation est bonne (≥ 10)', v: 'couverture' }];
    if (P().dossiers.length) opts.push({ l: 'Lui transmettre un dossier sur un adversaire', sub: 'Moins traçable qu’une fuite directe', v: 'adversaire' });
    const kind = await choice('Off', '', opts.concat([{ l: 'Annuler', v: null }])); if (!kind) return;
    let extra = null; if (kind === 'adversaire') { extra = await choice('Quel dossier ?', '', P().dossiers.map(d => ({ l: S().pnj[d.on].name + ' : ' + d.label, v: d.id }))); }
    const before = X.snap(); const msg = X.doOff(jid, kind, extra); E.log('Off avec ' + S().pnj[jid].name + ' — ' + msg, 'action'); render(); result('Off', msg, before);
  }
  async function propAttackFlow(xid, pid) {
    if (P().hours < 2) { toast('Il faut 2 h.'); return; }
    const x = S().pnj[xid]; const pr = x.prog.find(z => z.id === pid);
    const ch = c => c > 0.6 ? 'angle prometteur' : c > 0.4 ? 'jouable' : 'risqué';
    const angle = await choice('Attaquer « ' + pr.label + ' »', '<p>' + esc(x.name) + ' · coût ' + (pr.lvl === 'national' ? (pr.cost / 1e9).toFixed(1).replace('.', ',') + ' Md€' : E.eur(pr.cost)) + '/an · financement : ' + esc((L.FIN[pr.lvl].find(f => f.id === pr.fin) || {}).l || pr.fin) + ' · crédibilité ' + r0(pr.cred) + (pr.perdants.length ? ' · déplaît aux ' + pr.perdants.map(g => D.SEGS.find(s => s.id === g).name.toLowerCase()).join(', ') : '') + '</p>', Object.entries(DP.ANGLES).map(([k, an]) => ({ l: an.l, sub: an.d + ' · ' + ch(DP.angleChance(x, pr, k)), v: k })).concat([{ l: 'Annuler', v: null }]));
    if (!angle) return; const before = X.snap(); P().hours -= 2; const r = DP.attackProp(xid, pid, angle); E.estimate(); render(); await info(r.ok ? 'Attaque réussie' : 'Attaque ratée', '<p>' + esc(r.msg) + '</p>' + chipsHTML(X.deltas(before, X.snap()))); render();
  }

  /* ---------- actualité nationale ---------- */
  async function reactFlow(evId) {
    const s = S(); const a = X.ACTIONS.find(z => z.id === 'actu'); if (P().hours < a.h) { toast('Il faut 2 h.'); return; }
    const ev = evId ? (s.recentEv || []).find(x => x.id === evId) : await choice('Réagir à l’actualité nationale', '', (s.recentEv || []).map(x => ({ l: x.t, sub: E.fmtDate(x.date), v: x })).concat([{ l: 'Annuler', v: null }]));
    const rec = typeof ev === 'object' ? ev : null; if (!rec) return; const e = E.evById(rec.id, rec.custom); if (!e || !e.ch) { toast('Pas de prise de position possible sur ce sujet.'); return; }
    const pl = P().party !== 'NEW' ? D.PARTIES[P().party] : null;
    const idx = await choice(e.t, '<p>' + esc(e.d) + '</p>' + (pl ? '<p class="muted small">Ligne de votre parti sur ce thème : ' + esc(lineHint(pl, e)) + '</p>' : ''), e.ch.map((c, i) => ({ l: c.l, sub: '« ' + c.txt + ' »', v: i })).concat([{ l: 'Annuler', v: -1 }]));
    if (idx < 0) return; const before = X.snap(); P().hours -= a.h; const msg = E.reactNational(rec.id, idx, rec.custom, X.scopeOf()); E.log(msg, 'action'); render(); result('Réaction à l’actualité', msg, before);
  }
  function lineHint(pl, e) { const best = e.ch.map((c, i) => { let s2 = 0; for (const k in c.v) s2 += Math.sign(c.v[k]) * Math.sign(pl.ax[E.AXI[k]]); return [i, s2]; }).sort((a, b) => b[1] - a[1])[0]; return '« ' + e.ch[best[0]].l + ' »'; }

  /* ---------- propositions : dossiers en QCM ---------- */
  function optSub(ev, lev, fin) { const f = L.FIN[lev.lvl].find(z => z.id === fin); const cst = lev.lvl === 'national' ? (ev.cost >= 0 ? md(ev.cost) + '/an' : 'recette de ' + md(-ev.cost) + '/an') : (ev.cost >= 0 ? E.eur(ev.cost) + '/an' : 'recette de ' + E.eur(-ev.cost) + '/an'); return cst + (ev.inv ? ' + ' + (lev.lvl === 'national' ? md(ev.inv) : E.eur(ev.inv)) + ' d’investissement' : '') + ' · ' + (f ? f.l.toLowerCase() : '') + ' · crédibilité ' + ev.cred + (ev.gagnants.length ? ' · plaît aux ' + ev.gagnants.slice(0, 2).map(g => D.SEGS.find(x => x.id === g).name.toLowerCase()).join(', ') : '') + (ev.perdants.length ? ' · déplaît aux ' + ev.perdants.slice(0, 2).map(g => D.SEGS.find(x => x.id === g).name.toLowerCase()).join(', ') : ''); }
  async function problemFlow(pid) {
    const pb = L.PROBLEMS.find(z => z.id === pid); if (P().hours < 3) { toast('Il faut 3 h pour travailler un dossier.'); return; }
    const com = E.commune(); const loc = L.local(com);
    const opts = pb.o.map(([lid, v, fin]) => { const lev = L.LEVERS.find(z => z.id === lid); const ev = L.evaluate(lev, v, fin, com); return { l: ev.label, sub: optSub(ev, lev, fin), v: { lid, v, fin } }; });
    const pick = await choice(pb.t, '<p>' + esc(pb.d(loc)) + '</p><p class="muted small">Que proposez-vous ?</p>', opts.concat([{ l: 'Ajuster les chiffres moi-même', sub: 'Montant, ampleur, financement', v: 'tune' }, { l: 'Rien pour l’instant', v: null }]));
    if (!pick) return; if (pick === 'tune') { await builderFlow(pb.o[0][0], pb); return; }
    await addProp(pick.lid, pick.v, pick.fin, pb.id);
  }
  async function addProp(lid, v, fin, prob) {
    const before = X.snap(); P().hours -= 3; const m = X.addBuilt(lid, v, fin); m.prob = prob; E.log('Nouvelle proposition : ' + m.resume, 'action'); E.estimate();
    await info(m.updated ? 'Proposition mise à jour' : 'Proposition ajoutée', measureCard(m) + '<div class="sep"></div><div class="eyebrow">Effets</div>' + chipsHTML(X.deltas(before, X.snap())) + '<p class="muted small">Défendez-la pour la rendre visible : c’est la visibilité qui la fait peser dans le vote.</p>'); render();
  }
  async function builderFlow(lidStart, pb) {
    if (P().hours < 3) { toast('Il faut 3 h.'); return; }
    const com = E.commune(); let lev = L.LEVERS.find(z => z.id === lidStart) || L.LEVERS[0];
    const res = await new Promise(resolve => {
      const levOpts = lv => L.leversFor(lv, pb ? pb.th : null, com.pop).map(z => '<option value="' + z.id + '"' + (z.id === lev.id ? ' selected' : '') + '>' + esc((pb ? '' : (D.THEMES[z.th]?.l || '') + ' : ') + L.ltpl(z)) + '</option>').join('');
      const { m, close } = modal('<h2>' + esc(pb ? pb.t : 'Proposition sur mesure') + '</h2>' + (pb ? '' : '<div class="row" style="gap:6px;margin-bottom:8px"><button class="btn sm" data-lv="local">Locale</button><button class="btn sm" data-lv="national">Nationale</button></div>') + '<label class="f">Levier<select class="field" id="b-lev"></select></label><label class="f" style="margin-top:10px"><span id="b-lab"></span><input type="range" id="b-v" style="width:100%"></label><label class="f" style="margin-top:10px">Financement<select class="field" id="b-fin"></select></label><div id="b-out" class="card" style="margin-top:12px"></div><div class="foot"><button class="btn ghost" data-x>Annuler</button><button class="btn primary" data-ok>Ajouter au programme · 3 h</button></div>');
      const sel = m.querySelector('#b-lev'), rng = m.querySelector('#b-v'), fin = m.querySelector('#b-fin'), out = m.querySelector('#b-out'), lab = m.querySelector('#b-lab');
      const setLev = () => { lev = L.LEVERS.find(z => z.id === sel.value); rng.min = lev.min; rng.max = lev.max; rng.step = lev.step; rng.value = lev.def; fin.innerHTML = L.FIN[lev.lvl].map(f => '<option value="' + f.id + '">' + esc(f.l) + '</option>').join(''); upd(); };
      const upd = () => { const v = +rng.value; const ev = L.evaluate(lev, v, fin.value, com); lab.textContent = ev.label; const f = L.FIN[lev.lvl].find(z => z.id === fin.value);
        out.innerHTML = '<div class="kpis">' + kpi('Coût annuel', lev.lvl === 'national' ? md(ev.cost) : E.eur(ev.cost)) + kpi('Investissement', ev.inv ? (lev.lvl === 'national' ? md(ev.inv) : E.eur(ev.inv)) : '—') + kpi('Crédibilité', ev.cred, ev.cred, ev.cred < 40 ? 'var(--bad)' : ev.cred < 55 ? 'var(--warn)' : 'var(--good)') + '</div><div class="small" style="margin-top:8px"><span class="muted">Impact :</span> ' + esc(ev.ind) + '</div>' + (lev.lvl === 'local' ? '<div class="small"><span class="muted">Part du budget de fonctionnement :</span> ' + (ev.ratio * 100).toFixed(1).replace('.', ',') + ' %</div>' : '') + '<div class="small" style="margin-top:6px">' + Object.entries(ev.seg).filter(([, x]) => Math.abs(x) > 0.3).sort((a, b) => b[1] - a[1]).map(([g, x]) => '<span class="dl ' + (x > 0 ? 'up' : 'down') + '">' + esc(D.SEGS.find(s => s.id === g).name) + ' <b>' + (x > 0 ? '+' : '−') + Math.abs(x).toFixed(1).replace('.', ',') + '</b></span>').join(' ') + '</div><div class="muted small" style="margin-top:6px">' + esc(f ? f.d : '') + '</div>' + (ev.critique ? '<div class="small" style="margin-top:4px;color:var(--warn)">' + esc(ev.critique) + '</div>' : ''); };
      const fill = lv => { sel.innerHTML = levOpts(lv); if (!L.LEVERS.find(z => z.id === sel.value && z.lvl === lv)) sel.selectedIndex = 0; setLev(); };
      m.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { lev = L.LEVERS.find(z => z.lvl === b.dataset.lv); fill(b.dataset.lv); });
      sel.onchange = setLev; rng.oninput = upd; fin.onchange = upd; fill(lev.lvl);
      m.querySelector('[data-x]').onclick = () => { close(); resolve(null); };
      m.querySelector('[data-ok]').onclick = () => { close(); resolve({ lid: lev.id, v: +rng.value, fin: fin.value }); };
    });
    if (res) await addProp(res.lid, res.v, res.fin, pb && pb.id ? pb.id : null);
  }
  async function measureFlow() { return themePick(UI.actScope || curScope()); }
  async function ownMeasureFlow(sc0) {
    const a = X.ACTIONS.find(x => x.id === 'mesure'); if (P().hours < a.h) { toast('Il faut 3 h.'); return; }
    const lvl0 = sc0 || await choice('Votre proposition', '', [{ l: 'Proposition locale', v: 'local' }, { l: 'Proposition nationale', v: 'national' }, { l: 'Annuler', v: null }]); if (!lvl0) return;
    const before = X.snap();
    const r = await ask('Votre proposition ' + (lvl0 === 'local' ? 'locale' : 'nationale'), 'Soyez concret : quoi, pour qui, financé comment.', lvl0 === 'local' ? 'Ex. Ouvrir la piscine municipale le dimanche, financé par…' : 'Ex. Exonérer de charges les heures supplémentaires…', { max: 1200, btn: 'Proposer (3 h)' }); if (!r) return;
    P().hours -= a.h; const ld = loading('Chiffrage et contre-expertise…'); const ev = await A.measure(r.text, lvl0); ld.close();
    const m = X.applyMeasure(r.text, ev, lvl0); E.estimate();
    await info(m.updated ? 'Proposition mise à jour' : 'Proposition ajoutée', measureCard(m) + (ev._fallback ? '<p class="muted small">Évaluation scriptée (IA indisponible).</p>' : '') + '<div class="sep"></div><div class="eyebrow">Effets</div>' + chipsHTML(X.deltas(before, X.snap()))); render();
  }
  async function catalogueFlowUnused() {
    const a = X.ACTIONS.find(x => x.id === 'mesure'); if (P().hours < a.h) { toast('Il faut 3 h.'); return; }
    const lvl = await choice('Nouvelle proposition', '<p class="muted">Locale : commune, canton. Nationale : ce que vous défendriez à l’Assemblée ou à l’Élysée. Une proposition hors du champ de l’élection visée pèse moins et prête le flanc aux critiques.</p>', [{ l: 'Proposition locale', v: 'local' }, { l: 'Proposition nationale', v: 'national' }, { l: 'Annuler', v: null }]); if (!lvl) return;
    const have = new Set(P().prog.map(m => m.src)); const cat = D.CATALOGUE.filter(c => c.level === lvl && !have.has(c.id)).map(c => ({ c, d: E.wdist(P().ax, Object.assign([0, 0, 0, 0, 0, 0], ...Object.entries(c.ax).map(([k, v]) => ({ [E.AXI[k]]: v }))), E.W1) })).sort((x, y) => x.d - y.d);
    const pop = E.commune().pop;
    const pickd = await choice(lvl === 'local' ? 'Proposition locale' : 'Proposition nationale', '<p class="muted">Choisissez dans le catalogue (classé selon vos convictions) ou rédigez la vôtre.</p>', [{ l: 'Rédiger ma propre proposition', sub: 'Chiffrée et évaluée par l’IA', v: '__own' }].concat(cat.map(({ c }) => ({ l: c.t, sub: (c.level === 'local' ? 'Coût ≈ ' + E.eur(c.cph * pop) + '/an' : 'Coût ≈ ' + (c.md >= 0 ? '' : 'recette de ') + Math.abs(c.md).toLocaleString('fr-FR') + ' Md€/an') + ' · plaît à ' + c.g.map(g => D.SEGS.find(x => x.id === g).name.toLowerCase()).join(', '), v: c.id }))).concat([{ l: 'Annuler', v: null }]));
    if (!pickd) return;
    const before = X.snap();
    if (pickd === '__own') {
      const r = await ask('Votre proposition ' + (lvl === 'local' ? 'locale' : 'nationale'), 'Soyez concret.', lvl === 'local' ? 'Ex. Ouvrir la piscine municipale le dimanche, financé par…' : 'Ex. Exonérer de charges les heures supplémentaires…', { max: 1200, btn: 'Proposer (3 h)' }); if (!r) return;
      P().hours -= a.h; const ld = loading('Chiffrage et contre-expertise…'); const ev = await A.measure(r.text, lvl); ld.close();
      const m = X.applyMeasure(r.text, ev, lvl); E.estimate();
      await info(m.updated ? 'Proposition mise à jour' : 'Proposition ajoutée', measureCard(m) + (ev._fallback ? '<p class="muted small">Évaluation scriptée (IA indisponible).</p>' : '') + '<div class="sep"></div><div class="eyebrow">Effets</div>' + chipsHTML(X.deltas(before, X.snap())));
    } else { P().hours -= a.h; const m = X.newMeasureFromCatalogue(pickd); E.estimate(); await info(m.updated ? 'Proposition mise à jour' : 'Proposition ajoutée', measureCard(m) + '<div class="sep"></div><div class="eyebrow">Effets</div>' + chipsHTML(X.deltas(before, X.snap()))); }
    go('agir', 'programme');
  }
  function measureCard(m) {
    const st = { proposee: '', appliquee: 'Mise en œuvre', adoptee: 'Adoptée', rejetee: 'Rejetée', retiree: 'Retirée' }[m.status || 'proposee'];
    return '<div class="mes"><div class="row" style="gap:6px"><span class="lvl ' + m.level + '">' + (m.level === 'local' ? 'Locale' : 'Nationale') + '</span>' + (m.phare ? '<span class="star">★ Phare</span>' : '') + (st ? '<span class="chip">' + st + '</span>' : '') + '</div><div class="mt">' + esc(m.resume) + '</div><div class="muted small">' + esc(D.THEMES[m.theme]?.l || m.theme) + ' · ' + (m.cout ? (m.level === 'national' ? (m.cout / 1e9).toFixed(1).replace('.', ',') + ' Md€/an' : E.eur(m.cout) + '/an') : 'coût non chiffré') + ' · crédibilité ' + r0(m.cred) + (m.competence && m.competence !== 'oui' ? ' · compétence ' + esc(m.competence) : '') + '</div>' +
      ((m.gagnants || []).length ? '<div class="small" style="margin-top:4px"><span style="color:var(--good)">Plaît à</span> ' + m.gagnants.map(g => D.SEGS.find(x => x.id === g)?.name.toLowerCase()).filter(Boolean).join(', ') + ((m.perdants || []).length ? ' · <span style="color:var(--bad)">déplaît à</span> ' + m.perdants.map(g => D.SEGS.find(x => x.id === g)?.name.toLowerCase()).filter(Boolean).join(', ') : '') + '</div>' : '') +
      (m.finL ? '<div class="small" style="margin-top:4px"><span class="muted">Financement :</span> ' + esc(m.finL) + (m.inv ? ' · investissement ' + (m.level === 'national' ? md(m.inv) : E.eur(m.inv)) : '') + '</div>' : '') + (m.ind ? '<div class="small" style="margin-top:2px"><span class="muted">Impact :</span> ' + esc(m.ind) + '</div>' : '') + (m.critique ? '<div class="small muted" style="margin-top:4px">Objection : ' + esc(m.critique) + '</div>' : '') + '<div class="row small" style="margin-top:6px;gap:8px"><span class="muted">Visibilité</span><div class="hbar" style="flex:1;width:auto"><i style="width:' + E.clamp(m.visib, 0, 100) + '%;background:var(--accent)"></i></div><span class="num">' + r0(m.visib) + '</span></div></div>';
  }
  async function conferenceFlow(mid) {
    const st = X.startAI('conference'); if (!st.ok) { toast(st.msg); return; } const before = X.snap();
    const m = P().prog.find(x => x.id === mid); const js = E.pnjList(x => x.role === 'journaliste').sort(() => E.rnd() - 0.5).slice(0, 2);
    const sum = await debateRun({ format: 'Conférence de presse sur la proposition « ' + m.resume + ' »', host: js[0].name, interview: true, rounds: 5, focusM: m, opponents: [], focus: '« ' + m.resume + ' » (' + (m.cout ? E.eur(m.cout) + '/an' : 'non chiffrée') + ')', focusM: m });
    const msg = X.applyConference(mid, sum.score); (sum.lies || []).forEach(t => E.lie(t, 1)); E.estimate();
    await info('Après la conférence de presse', '<p>' + esc(msg) + '</p>' + chipsHTML(X.deltas(before, X.snap()))); render();
  }
  async function challengeFlow(id) {
    const x = S().pnj[id]; const a = X.ACTIONS.find(z => z.id === 'defier'); if (P().hours < a.h) { toast('Il faut 4 h pour un débat.'); return; }
    const es = S().est; const mine = es ? es.pct : 0; const theirs = es ? (es.rows.find(r => r.id === id) || { pct: 0 }).pct : 0;
    const acc = E.rnd() < 0.25 + (theirs < mine ? 0.45 : 0) + x.traits.charisme / 300 + (x.traits.ambition > 70 ? 0.1 : 0);
    if (!acc) { P().hours -= 1; const before = X.snap(); E.addImageAll(1); x.mom -= 0.02; P().mom += 0.01; E.article('radio', x.name + ' refuse le débat proposé par ' + P().name, 0.2, 'pj'); E.log(x.name + ' se dérobe à votre défi.', 'good'); render(); result('Défi refusé', x.name + ' se dérobe. Vous marquez un point dans l’opinion.', before); return; }
    await debateFlow([{ name: x.name, label: D.PARTIES[x.party].short, id }], 'Face-à-face sur Radio Isère : ' + P().name + ' contre ' + x.name, 8);
  }

  /* ---------- dialogue ---------- */
  async function dialogueFlow(preset) {
    const pid = preset || await pnjPick('Rendez-vous avec…', x => (x.role !== 'candidat' || x.known) && scopeOk(x)); if (!pid) return;
    const st = X.startAI('rdv'); if (!st.ok) { toast(st.msg); return; }
    const x = S().pnj[pid]; x.known = true; const hist = []; let total = { relation_delta: 0, accord: null, info: [] }; let n = 0;
    await new Promise(res => {
      const { m, close } = modal('<div class="chathead"><h2 style="font-size:20px">' + esc(x.name) + '</h2><p class="muted small" style="margin:0">' + esc(x.mandat || ROLE_L[x.role]) + (x.role !== 'journaliste' ? ' · ' + D.PARTIES[x.party].short : '') + ' · relation ' + r0(x.rel) + '</p></div><div id="chat" class="chatlog"><p class="muted small">Demandez un soutien, un désistement, une place sur une liste, ou sondez ses intentions.</p></div><div class="chatin"><textarea id="say" placeholder="Votre message…"></textarea><div class="row" style="justify-content:space-between"><button class="btn ghost sm" id="bye">Prendre congé</button><button class="btn primary" id="send">Envoyer</button></div></div>', null, 'chat');
      const chat = m.querySelector('#chat');
      const draw = () => { setTimeout(() => chat.scrollTop = chat.scrollHeight, 0); chat.innerHTML = hist.map(h => '<div class="bubble ' + (h.me ? 'me' : 'them') + '"><b>' + esc(h.me ? P().name : x.name) + '</b>' + esc(h.t) + '</div>').join(''); };
      const end = () => { close(); res(); };
      m.querySelector('#bye').onclick = end;
      m.querySelector('#send').onclick = async () => {
        const ta = m.querySelector('#say'); const t = ta.value.trim(); if (!t) return; ta.value = ''; hist.push({ me: true, t }); draw(); chat.insertAdjacentHTML('beforeend', '<p class="muted"><span class="spinner"></span></p>');
        const ev = await A.dialogue(x, hist.slice(0, -1), t); hist.push({ me: false, t: ev.reponse || '…' }); draw(); n++;
        total.relation_delta += +ev.relation_delta || 0; if (ev.accord && ev.accord.clauses && ev.accord.clauses.length) { total.accord = ev.accord; chat.insertAdjacentHTML('beforeend', '<p style="color:var(--good)">Accord : ' + ev.accord.clauses.map(c => E.CLAUSES[c]).filter(Boolean).join(', ') + '</p>'); } if (ev.info) { total.info.push(ev.info); chat.insertAdjacentHTML('beforeend', '<p class="muted">' + esc(ev.info) + '</p>'); }
        if (ev.fin || n >= 6) { m.querySelector('#send').disabled = true; chat.insertAdjacentHTML('beforeend', '<p class="muted">' + esc(x.name) + ' met fin à l’entretien.</p>'); }
      };
    });
    if (n) { const msg = X.applyDialogue(pid, { relation_delta: total.relation_delta, accord: total.accord, info: total.info.join(' ') }); toast(msg); E.log('Rendez-vous avec ' + x.name + ' — ' + msg, 'action'); }
    render();
  }

  /* ---------- débats & interviews ---------- */
  /* ---------- débat / interview en direct ---------- */
  function lvMeters(st, segD) {
    return '<div class="lv-segs">' + LV.SEGS.map(g => { const v = st.seg[g]; const d = segD ? segD[g] : 0; const w = Math.min(50, Math.abs(v) / 15 * 50);
      return '<div class="lsg"><span>' + LV.SHORT[g] + '</span><div class="lsb"><i class="' + (v >= 0 ? 'p' : 'n') + '" style="' + (v >= 0 ? 'left:50%' : 'right:50%') + ';width:' + w + '%"></i></div><b class="num ' + (d > 0.5 ? 'up' : d < -0.5 ? 'down' : '') + '">' + (d > 0.5 ? '▲' : d < -0.5 ? '▼' : '') + '</b></div>'; }).join('') + '</div>';
  }
  function lvTop(st) {
    const left = esc(P().name.split(' ')[0]), right = st.iv ? '' : esc(st.opp.name.split(' ').slice(-1)[0]);
    return '<div class="eyebrow">' + esc(st.dctx.format) + ' · ' + Math.min(st.i + 1, st.N) + '/' + st.N + '</div>' +
      '<div class="tug">' + (st.iv ? '<div class="tn"><b>Adhésion du public</b><b class="num">' + Math.round(st.bar) + ' %</b></div><div class="tb iv"><i style="width:' + st.bar + '%"></i><span class="mid"></span></div>' :
      '<div class="tn"><b>' + left + ' <span class="num">' + Math.round(st.bar) + ' %</span></b><span class="muted small">qui convainc ?</span><b><span class="num">' + Math.round(100 - st.bar) + ' %</span> ' + right + '</b></div><div class="tb"><i style="width:' + st.bar + '%"></i><span class="mid"></span></div>') + '</div>' +
      '<div class="lv-g"><div><small>Tension</small><div class="hbar" style="width:100%;height:6px"><i style="width:' + st.tension + '%;background:' + (st.tension > 70 ? 'var(--bad)' : st.tension > 50 ? 'var(--warn)' : 'var(--paper)') + '"></i></div></div><div><small>Vérification des faits</small><span class="dots">' + [0, 1, 2].map(k => '<i class="' + (st.fact > k * 30 ? 'on' : '') + '"></i>').join('') + '</span></div></div>';
  }
  function lvBeat(st, beat) {
    const sp = beat.kind === 'atk' || beat.kind === 'clash' ? (st.opp || {}) : { name: beat.who };
    const x = sp.id ? S().pnj[sp.id] : null;
    let h = lvTop(st) + lvMeters(st) + (st.feed.length ? '<div class="lv-feed">' + st.feed.slice(-2).map(f => '<div class="small' + (f.me ? '' : ' muted') + '"><b>' + esc(f.me ? 'Vous' : f.n) + ' :</b> ' + esc(f.t) + '</div>').join('') + '</div>' : '');
    h += '<div class="lv-q' + (beat.kind === 'atk' ? ' atk' : '') + '"><div class="row" style="gap:8px;flex-wrap:nowrap;align-items:flex-start">' + avatar(beat.who || 'Animateur', x ? x.party : null) + '<div><div class="eyebrow">' + ({ q: 'Question', atk: 'Attaque', clash: 'Accrochage', relance: 'Relance', fc: 'Vérification', fin: 'Conclusion' }[beat.kind] || '') + '</div><div class="lq">' + esc(beat.text) + '</div></div></div></div><div class="lv-opts">';
    beat.opts.forEach((o, k) => { const pr = LV.predict(st, o); const mv = LV.MOVES[o.move] || LV.MOVES.fond;
      h += '<button class="lopt" data-k="' + k + '"><span class="lm" style="background:' + mv.c + '">' + esc(mv.l) + '</span><span class="lt">' + esc(o.texte) + '</span><span class="lh">' + pr.plus.map(g => '<span class="up">▲ ' + LV.SHORT[g] + '</span>').join('') + pr.minus.map(g => '<span class="down">▼ ' + LV.SHORT[g] + '</span>').join('') + pr.risks.map(r => '<span class="rk">' + esc(r) + '</span>').join('') + '</span></button>'; });
    return h + '</div>';
  }
  function lvResult(st, out) {
    let h = lvTop(st) + lvMeters(st, out.segD) + '<div class="lv-res ' + (out.barD > 1.5 ? 'good' : out.barD < -1.5 ? 'bad' : '') + '"><b>' + esc(out.reac) + '</b> <span class="num">' + (out.barD >= 0 ? '+' : '') + out.barD.toFixed(1).replace('.', ',') + ' pt</span></div>';
    if (out.opp) h += '<div class="lv-q"><div class="small"><b>' + esc(out.opp.name) + ' :</b> « ' + esc(out.opp.txt) + ' »</div></div>';
    return h + '<div class="foot"><button class="btn primary" data-n>' + (st.i >= st.N ? 'Fin du débat' : 'Échange suivant') + '</button></div>';
  }
  function liveRun(dctx) {
    const st = LV.start(dctx);
    return new Promise(resolve => {
      const { m, close } = modal('', null, 'live');
      const show = () => {
        const beat = LV.next(st);
        if (!beat) { const sum = LV.finish(st); const win = st.bar >= 55, lose = st.bar < 45;
          m.innerHTML = lvTop(st) + lvMeters(st) + '<h2 style="margin-top:12px">' + (st.iv ? (win ? 'Interview réussie' : lose ? 'Interview difficile' : 'Interview correcte') : (win ? 'Vous remportez le débat' : lose ? 'Débat perdu' : 'Match nul')) + '</h2>' +
            (sum.best && sum.best.d > 2 ? '<p class="small"><b>Moment fort :</b> « ' + esc(sum.best.t) + ' »</p>' : '') + (sum.worst && sum.worst.d < -2 ? '<p class="small"><b>Moment faible :</b> « ' + esc(sum.worst.t) + ' »</p>' : '') +
            (sum.caught ? '<p class="small" style="color:var(--bad)">Les vérificateurs relèvent ' + sum.caught + ' affirmation(s) fausse(s).</p>' : '') + (sum.punchlines.length ? '<p class="small" style="color:var(--good)">Votre formule circule sur les réseaux.</p>' : '') +
            '<div class="foot"><button class="btn primary" data-end>Terminer</button></div>';
          m.querySelector('[data-end]').onclick = () => { close(); resolve(sum); setTimeout(() => { const n = S().news.find(x => x.about === 'pj'); if (n) A.flavor(n); }, 50); }; return; }
        if (typeof HQ !== 'undefined' && ['q', 'atk', 'relance'].includes(beat.kind) && !beat.opts.some(o => o.edl)) { const eo = HQ.edlOpt(beat.theme); if (eo) beat.opts.unshift(eo); }
        m.innerHTML = lvBeat(st, beat); m.scrollTop = 0;
        m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const out = LV.resolve(st, beat, beat.opts[+b.dataset.k]); m.innerHTML = lvResult(st, out); m.scrollTop = 0; m.querySelector('[data-n]').onclick = show; });
      };
      show();
    });
  }

  /* ---------- débat en direct : l’arène ---------- */
  function arenaRun(dctx) {
    const st = LV.arenaStart(dctx); const D0 = S().diff || 'normal'; const K = D0 === 'facile' ? 1.35 : D0 === 'difficile' ? 0.75 : 1;
    const T_ANS = D0 === 'difficile' ? 40000 : null; // le joueur lit à son rythme ; minuterie seulement en difficile
    return new Promise(resolve => {
      const { m, close } = modal('', null, 'live arena'); let timerIv = null;
      const oppN = st.opp ? st.opp.name : 'Adversaire'; const oppP = st.oppX ? st.oppX.party : null;
      m.innerHTML = '<div id="ar-top"></div><div class="plateau"><div class="spk" id="ar-spk"></div><div class="speech" id="ar-sp"></div><div class="stt" id="ar-st"></div></div><div class="tmr"><i id="ar-tm"></i></div><div class="acts2" id="ar-act"></div><div class="talk" id="ar-talk"></div>';
      const $ = id => m.querySelector('#' + id);
      const top = (segD) => { $('ar-top').innerHTML = lvTop(st) + lvMeters(st, segD); const t = st.talk.me + st.talk.opp || 1; $('ar-talk').innerHTML = '<span class="muted small">Temps de parole</span><div class="tb2"><i style="width:' + (st.talk.me / t * 100) + '%"></i></div><span class="muted small num">' + Math.round(st.talk.me / t * 100) + ' % / ' + Math.round(st.talk.opp / t * 100) + ' %</span>'; };
      const spk = (name, party, role) => { $('ar-spk').innerHTML = avatar(name, party) + '<div><b>' + esc(name) + '</b><div class="muted small">' + esc(role) + '</div></div>'; };
      const say = (t, cls) => { const d = document.createElement('p'); d.className = 'sl ' + (cls || ''); d.textContent = t; $('ar-sp').appendChild(d); $('ar-sp').scrollTop = 99999; return d; };
      const stt = (t, cls) => { $('ar-st').className = 'stt ' + (cls || ''); $('ar-st').textContent = t || ''; };
      const fx = r => { if (!r) return; top(r.segD); if (r.barD != null && Math.abs(r.barD) >= 0.3) { const f = document.createElement('span'); f.className = 'flt ' + (r.barD > 0 ? 'up' : 'down'); f.textContent = (r.barD > 0 ? '+' : '') + r.barD.toFixed(1).replace('.', ','); $('ar-top').appendChild(f); setTimeout(() => f.remove(), 1400); } };
      const pause = ms => new Promise(r => { const t = setTimeout(r, ms); m.onclick = e => { if (e.target.closest('button')) return; clearTimeout(t); m.onclick = null; r(); }; });
      const wait = (btns, ms, layout) => new Promise(res => {
        clearInterval(timerIv); const box = $('ar-act'); box.className = 'acts2 ' + (layout || ''); box.innerHTML = btns.map((b, i) => '<button class="' + (b.cls || 'abtn') + '" data-i="' + i + '">' + b.h + '</button>').join('');
        const t0 = Date.now(); const bar = $('ar-tm'); bar.style.width = ms ? '100%' : '0%'; let done = false;
        const fin = v => { if (done) return; done = true; clearInterval(timerIv); box.innerHTML = ''; bar.style.width = '0%'; res(v); };
        if (ms) timerIv = setInterval(() => { const r = 1 - (Date.now() - t0) / ms; bar.style.width = Math.max(0, r * 100) + '%'; bar.className = r < 0.3 ? 'hot' : ''; if (r <= 0) fin(-1); }, 100);
        box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => fin(+b.dataset.i));
      });
      const LIVEB = [{ h: 'Suite ▸', cls: 'abtn ok' }, { h: '✋ Contester' }, { h: '📝 Noter pour y revenir' }];
      async function oppBlock() {
        const sp = LV.oppSpeech(st); $('ar-sp').innerHTML = ''; spk(st.dctx.host, null, 'Modérateur'); say((st.dctx.host ? st.dctx.host + ' : ' : '') + sp.q, 'host'); stt(''); await pause(1300);
        spk(oppN, oppP, 'Votre adversaire'); stt('Lisez à votre rythme. Si une phrase est fausse ou fragile : contestez-la tout de suite, ou notez-la pour y revenir. Contester une phrase solide vous fera mal voir.', 'muted');
        for (let i = 0; i < sp.sents.length; i++) { const s0 = sp.sents[i]; const el = say(s0.t, 'opp cur');
          const k = await wait(LIVEB, null, 'row3'); el.classList.remove('cur');
          if (k === 0 || k === -1) { fx(LV.heard(st, s0)); continue; }
          if (k === 1) { const r = LV.cut(st, s0); say('Vous : « ' + r.line + ' »', 'me'); stt(r.d > 1 ? 'Bien vu : sa phrase ne tenait pas.' : r.d < -1 ? 'Sa phrase était solide : le public n’apprécie pas.' : 'Échange tendu.', r.d > 1 ? 'good' : r.d < -1 ? 'bad' : ''); fx(r); await pause(2200); break; }
          if (k === 2) { LV.note(st, s0); el.classList.add('noted'); fx(LV.heard(st, s0)); stt('Phrase notée : elle vous sera proposée quand vous aurez la parole.', 'muted'); continue; }
        }
        LV.endOppBlock(st); st.i++; top();
      }
      async function meBlock(fin) {
        const q = fin ? Object.assign(LV.closing(st), { kind: 'fin' }) : LV.myQuestion(st); if (!fin && typeof HQ !== 'undefined' && !q.opts.some(o => o.edl)) { const eo = HQ.edlOpt(q.theme); if (eo) q.opts.unshift(eo); } $('ar-sp').innerHTML = ''; spk(st.dctx.host, null, 'Modérateur'); say(q.text, 'host'); stt('À vous. Le temps est compté.', 'muted');
        const btns = q.opts.map(o => { const pr = LV.predict(st, o); const mv = LV.MOVES[o.move] || LV.MOVES.fond; return { cls: 'lopt', h: '<span class="lm" style="background:' + (o.edl ? '#2f8f6f' : mv.c) + '">' + esc(o.edl ? '📎 Éléments de langage' : o.fromNote ? 'Votre note' : mv.l) + '</span><span class="lt">' + esc(o.texte) + '</span><span class="lh">' + pr.plus.map(g => '<span class="up">▲ ' + LV.SHORT[g] + '</span>').join('') + pr.minus.map(g => '<span class="down">▼ ' + LV.SHORT[g] + '</span>').join('') + pr.risks.map(r => '<span class="rk">' + esc(r) + '</span>').join('') + '</span>' }; });
        let k = await wait(btns, fin ? T_ANS * 1.3 : T_ANS, 'col');
        let o = k >= 0 ? q.opts[k] : { posture: 'Hésitation', texte: 'Euh… c’est une question importante, et… je vais y venir.', q: -7, move: 'esquive' };
        spk(P().name, pjParty(), 'Vous'); const mine = say(o.texte, 'me'); if (k < 0) stt('Vous avez hésité trop longtemps.', 'bad');
        if (!fin && st.oppX && Math.random() < LV.interruptChance(st)) { await pause(900); say(oppN + ' : « ' + E.fresh('intr', ['C’est faux !', 'Vous n’y croyez pas vous-même.', 'Et votre bilan ?', 'N’importe quoi.', 'Laissez-moi rire.', 'Vous mentez aux habitants.']) + ' »', 'opp');
          stt('Il vous coupe la parole ! Que faites-vous ?', 'bad'); const ki = await wait(LV.INTR.map(x => ({ h: esc(x.l), cls: 'lopt' })), null, 'col'); const r = LV.interrupted(st, ki); say(r.line, 'me'); fx(r); }
        const out = LV.myAnswer(st, q, o); fx(out); stt(out.reac, out.barD > 1.5 ? 'good' : out.barD < -1.5 ? 'bad' : ''); await pause(1800);
      }
      async function clash() {
        $('ar-sp').innerHTML = ''; spk(st.dctx.host, null, 'Modérateur'); say('Échange libre entre les candidats. Allez-y.', 'host'); await pause(1000);
        for (let v = 0; v < 3; v++) { const c = LV.clashJab(st); spk(oppN, oppP, 'Votre adversaire'); say(c.jab, 'opp cur'); stt('Votre réplique ?', 'muted');
          const k = await wait(c.opts.map(o => ({ cls: 'lopt', h: '<span class="lm" style="background:' + (o.mv === 'nuance' ? '#4f9a74' : o.mv === 'attaque' ? '#d9493b' : '#c98b3a') + '">' + esc(o.tag) + '</span><span class="lt">' + esc(o.l) + '</span>' })), null, 'col'); const r = LV.clashAnswer(st, k >= 0 ? c.opts[k] : null); if (k >= 0) say('Vous : ' + c.opts[k].l, 'me'); else stt('Vous restez sans voix.', 'bad'); fx(r); stt(r.barD > 1 ? 'Ça porte.' : r.barD < -1 ? 'Ça tombe à plat.' : 'Échange équilibré.', r.barD > 1 ? 'good' : r.barD < -1 ? 'bad' : ''); await pause(1600); }
        st.i++;
      }
      (async () => {
        top();
        for (st.bi = 0; st.bi < st.blocks.length; st.bi++) { const b = st.blocks[st.bi]; if (b === 'opp' && st.oppX) await oppBlock(); else if (b === 'clash' && st.oppX) await clash(); else if (b === 'fin') await meBlock(true); else await meBlock(false); }
        clearInterval(timerIv); m.onclick = null; const sum = LV.finish(st); const win = st.bar >= 55, lose = st.bar < 45;
        m.innerHTML = lvTop(st) + lvMeters(st) + '<h2 style="margin-top:12px">' + (win ? 'Vous remportez le débat' : lose ? 'Débat perdu' : 'Match nul') + '</h2>' + (sum.best && sum.best.d > 2 ? '<p class="small"><b>Moment fort :</b> « ' + esc(sum.best.t) + ' »</p>' : '') + (sum.worst && sum.worst.d < -2 ? '<p class="small"><b>Moment faible :</b> « ' + esc(sum.worst.t) + ' »</p>' : '') + '<p class="small muted">Temps de parole : ' + Math.round(st.talk.me / ((st.talk.me + st.talk.opp) || 1) * 100) + ' % pour vous · ' + st.cuts + ' coupure(s) de parole.</p>' + (sum.caught ? '<p class="small" style="color:var(--bad)">Les vérificateurs relèvent ' + sum.caught + ' affirmation(s) fausse(s).</p>' : '') + (sum.punchlines.length ? '<p class="small" style="color:var(--good)">Votre formule circule sur les réseaux.</p>' : '') + '<div class="foot"><button class="btn primary" data-end>Terminer</button></div>';
        m.querySelector('[data-end]').onclick = () => { close(); resolve(sum); setTimeout(() => { const n = S().news.find(x => x.about === 'pj'); if (n) A.flavor(n); }, 50); };
      })();
    });
  }

  async function debateRun(dctx) { return !dctx.interview && dctx.opponents && dctx.opponents[0] && dctx.opponents[0].id && S().pnj[dctx.opponents[0].id] ? arenaRun(dctx) : liveRun(dctx); }
  async function debateRunAI(dctx) {
    const hist = []; const sum = { score: 0, segments: {}, lies: [], punchlines: [], stmts: [] }; let rounds = 0; const reach = dctx.reach || null;
    for (let i = 0; i < dctx.rounds; i++) {
      let ld = loading(i === 0 ? 'Le plateau se met en place…' : 'Question suivante…'); const q = await A.debateOpen(dctx, i, hist); ld.close();
      const props = (q.propositions || []).slice(0, 6);
      const pickR = await new Promise(res => modal('<div class="eyebrow">' + esc(dctx.format) + ' · ' + (i + 1) + ' / ' + dctx.rounds + '</div><h2 style="font-size:20px;margin-top:6px">' + esc(dctx.host) + ' : « ' + esc(q.question) + ' »</h2>' + (q.adversaires || []).map(a => '<div class="bubble them"><b>' + esc(a.nom) + '</b>' + esc(a.replique) + '</div>').join('') + '<div class="eyebrow" style="margin-top:12px">Votre réponse</div>' + props.map((p, j) => '<button class="opt" data-j="' + j + '"><small>' + esc(p.posture) + '</small>' + esc(p.texte) + '</button>').join('') + '<details class="own"><summary>Ou répondre avec vos mots</summary><textarea id="own" placeholder="Votre réponse…"></textarea><div class="foot"><button class="btn primary" id="own-ok">Répondre</button></div></details>', (m, close) => {
        m.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { close(); res({ text: props[+b.dataset.j].texte, chosen: props[+b.dataset.j] }); });
        m.querySelector('#own-ok').onclick = () => { const t = m.querySelector('#own').value.trim(); if (!t) return; close(); res({ text: t, chosen: null }); };
      }));
      const reply = pickR.text, chosen = pickR.chosen;
      ld = loading('Le public réagit…'); const j = await A.debateJudge(dctx, q, reply, chosen); ld.close();
      let sc = +j.score || 50; if (dctx.relBonus) sc += dctx.relBonus;
      let atkTxt = ''; if (chosen && chosen.attack && typeof DP !== 'undefined') { const x = S().pnj[chosen.attack.x]; const pr = x && (x.prog || []).find(z => z.id === chosen.attack.pr); if (pr) { if (sc >= 55) { pr.cred = E.clamp(pr.cred - 8, 5, 95); pr.vis = E.clamp(pr.vis - 8, 0, 100); x.mom -= 0.02; atkTxt = 'Votre attaque contre « ' + pr.label + ' » porte.'; } else { x.mom += 0.01; atkTxt = x.name + ' défend sa proposition sans difficulté.'; } } }
      const xo = S().pnj[(dctx.opponents[0] || {}).id] || null;
      const rip = await choice('Réaction', '<div class="kpis">' + kpi('Impact', r0(sc) + '/100', sc, sc >= 55 ? 'var(--good)' : sc < 40 ? 'var(--bad)' : 'var(--warn)') + '</div><p>' + esc(j.commentaire || '') + '</p>' + (atkTxt ? '<p class="small">' + esc(atkTxt) + '</p>' : '') + (j.reaction ? '<div class="bubble them"><b>' + esc(j.reaction.nom) + '</b>' + esc(j.reaction.texte) + '</div>' : '') + (j.punchline ? '<p><b>Sur X :</b> « ' + esc(j.punchline) + ' »</p>' : '') + (j.mensonge ? '<p style="color:var(--warn)">Une affirmation contestable : les vérificateurs vont s’y intéresser.</p>' : '') + '<div class="eyebrow" style="margin-top:10px">Votre réplique</div>',
        (typeof DP !== 'undefined' ? DP.RIPOSTES : []).map(r => ({ l: r.l, v: r.id })).concat([{ l: i + 1 < dctx.rounds ? 'Passer à la question suivante' : 'Conclure', v: 'none' }]));
      if (rip !== 'none' && typeof DP !== 'undefined') { const R0 = DP.RIPOSTES.find(r => r.id === rip); const b = Math.round(R0.f(q, xo) + (E.rnd() * 6 - 3)); sc += b; toast(b >= 3 ? 'Réplique efficace (+' + b + ')' : b <= -3 ? 'Réplique ratée (' + b + ')' : 'Réplique sans effet notable'); if (rip === 'attaque' && xo && (xo.prog || [])[0] && b > 4) { xo.prog[0].cred = E.clamp(xo.prog[0].cred - 5, 5, 95); } }
      sc = E.clamp(sc, 5, 98);
      rounds++; sum.score += sc; for (const k in (j.segments || {})) sum.segments[k] = (sum.segments[k] || 0) + (+j.segments[k] || 0) / dctx.rounds * (reach ? 0.4 + (reach[k] || 0) * 2 : 1);
      if (j.mensonge) sum.lies.push(j.affirmation || reply.slice(0, 120)); if (j.punchline) sum.punchlines.push(j.punchline); sum.stmts.push({ text: reply, theme: q.theme, axes: j.axes || (chosen && chosen.ax) });
      if (j.gaffe) { E.addImageAll(-2); E.article('info24', 'La gaffe ' + E.de(P().name) + ' en plein débat', -0.6, 'pj', reply.slice(0, 160)); }
      hist.push({ q: q.question, reply });
    }
    sum.score = sum.score / Math.max(1, rounds); return sum;
  }
  async function debateFlow(forced, forcedFmt, forcedRounds) {
    const p = P(); const before = X.snap();
    if (forced) { p.hours = Math.max(0, p.hours - 4); const sum = await debateRun({ format: forcedFmt, host: (E.pnjList(x => x.role === 'journaliste' && x.territory === 'radio')[0] || { name: 'L’animateur' }).name, rounds: forcedRounds && forcedRounds > 6 ? forcedRounds : 10, opponents: forced, natHook: (S().recentEv || [])[0] || null });
      const msg = X.applyDebate(sum); forced.forEach(o => { const x = S().pnj[o.id]; if (x) { x.mom += (50 - sum.score) / 500; x.rel -= 4; } }); E.estimate(); await info('Après le débat', '<p>' + esc(msg) + '</p>' + chipsHTML(X.deltas(before, X.snap()))); render(); return; }
    const el = S().elections.find(e => e.id === p.cand.el); const ph = E.phase().id;
    let opp;
    if (ph === 'entre2') { const r = el.races[p.cand.key]; opp = (r.t2 || []).filter(id => id !== 'PJ').map(id => r.cands.find(c => c.id === id)).filter(Boolean); }
    else opp = E.buildCandsPreview(el, p.cand.key).filter(c => !c.pj).sort((a, b) => b.noto - a.noto).slice(0, 3);
    if (!opp.length) { toast('Pas d’adversaire disponible pour ce débat.'); return; }
    p.hours -= 4;
    const fmt = { mun: 'Débat des têtes de liste sur Radio Isère', dep: 'Débat des candidats du canton sur Alpes 3', leg: 'Débat de la circonscription sur Alpes 3', pres: 'Débat télévisé national' }[el.type] + (ph === 'entre2' ? ', entre-deux-tours' : '');
    const j = E.pnjList(x => x.role === 'journaliste' && x.territory === (el.type === 'mun' ? 'radio' : 'alpes3'))[0];
    const sum = await debateRun({ format: fmt, host: j ? j.name : 'L’animatrice', rounds: ph === 'entre2' ? 12 : 10, opponents: opp.map(o => ({ name: o.name, label: o.label || D.PARTIES[o.party]?.short || '', id: o.id })), natHook: el.type !== 'pres' ? ((S().recentEv || [])[0] || null) : null });
    const msg = X.applyDebate(sum); E.estimate(); await info('Après le débat', '<p>' + esc(msg) + '</p>' + chipsHTML(X.deltas(before, X.snap()))); render();
  }
  async function runSmsAct(act) {
    const i0 = act.indexOf(':'); const k = act.slice(0, i0), id = act.slice(i0 + 1); const x = S().pnj[id]; if (!x && k !== 'duel') { render(); return; }
    if (k === 'duel') { await acceptDuel(id); render(); return; }
    if (k === 'interview') await interviewFlow(id);
    if (k === 'debate') { if (P().hours < 4) { toast('Il vous faut 4 h libres pour ce débat : il est reporté.'); render(); return; } await debateFlow([{ name: x.name, label: D.PARTIES[x.party].short, id }], 'Face-à-face sur Radio Isère : ' + P().name + ' contre ' + x.name, 10); }
    render();
  }
  async function interviewFlow(presetJ) {
    const a = X.ACTIONS.find(z => z.id === 'interview'); if (P().hours < a.h) { toast('Il faut 2 h.'); return; }
    const FORMATS = { radio: 'Matinale de Radio Isère', alpes3: 'Invité du journal régional d’Alpes 3', dauph: 'Grand entretien dans Le Dauphinois', info24: 'Plateau d’Info 24', quotlib: 'Entretien dans Le Quotidien libéral', revel: 'Interview vérité de Révélations', ventilo: 'Interview décalée du Ventilo' };
    let jid = presetJ || await choice('Accorder une interview', '<p class="muted">Le média décide de l’audience touchée ; votre relation avec le journaliste décide du ton.</p>', E.pnjList(x => x.role === 'journaliste' && scopeOk(x)).sort((x, y) => y.rel - x.rel).map(j => { const need = Math.max(0, ({ alpes3: 18, info24: 32, quotlib: 32, revel: 22 }[j.territory] || 0) - (j.rel >= 30 ? 10 : 0)); const no = Math.max(P().noto.circo, P().noto.nat * 1.5); return no >= need ? { l: FORMATS[j.territory] + ' — ' + j.name, sub: jSub(j), v: j.id } : { l: FORMATS[j.territory] + ' — indisponible', sub: 'Ce média ne s’intéresse pas encore à vous (notoriété ' + need + ' requise, ou une bonne relation)', v: '__no' }; }).concat([{ l: 'Annuler', v: null }])); if (!jid) return;
    if (jid === '__no') { toast('Ce média ne vous invitera pas encore. Travaillez votre notoriété ou la relation.'); return; }
    const st = X.startAI('interview'); if (!st.ok) { toast(st.msg); return; }
    const j = S().pnj[jid]; j.known = true; const media = D.MEDIAS.find(m => m.id === j.territory); const before = X.snap();
    const sum = await debateRun({ interview: true, journalist: { id: j.id }, format: FORMATS[j.territory], host: j.name, tone: toneOf(j), rounds: 8, opponents: [], natHook: E.rnd() < 0.5 ? ((S().recentEv || [])[0] || null) : null, reach: media.reach, relBonus: Math.round(j.rel / 10) });
    const msg = X.applyDebate(sum); j.rel += sum.score > 55 ? 4 : -3; E.addNoto(media.lean !== 0 || ['quotlib', 'info24', 'revel'].includes(media.id) ? 'nat' : 'circo', 1.5); E.estimate();
    await info('Après l’interview', '<p>' + esc(msg) + '</p><p class="small muted">Audience touchée surtout : ' + Object.entries(media.reach).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([g]) => D.SEGS.find(s => s.id === g).name.toLowerCase()).join(', ') + '.</p>' + chipsHTML(X.deltas(before, X.snap()))); render();
  }

  /* ---------- candidatures ---------- */
  async function declareFlow(elId, mode) {
    const el = S().elections.find(e => e.id === elId); const p = P();
    if (el.type === 'pres' && p.presDesig !== el.id && p.parrainages < 500) { await info('Parrainages', '<p>Il faut 500 parrainages d’élus, issus d’au moins 30 départements, pour être candidat·e à l’élection présidentielle. Vous en avez <b>' + p.parrainages + '</b>. Démarchez des élus (Agenda, Réseau).</p>'); return; }
    // Avant de demander l'investiture : le détail de vos chances, sans tirage
    const io = mode === 'tete' && p.party !== 'NEW' && !(el.type === 'mun' && E.myPetite()) ? E.invOdds(el) : null;
    if (io && !io.pre && io.rival) { const pt = io.parts || {}; const row = (l, v) => '<div class="row" style="justify-content:space-between"><span>' + l + '</span><b class="num">' + Math.round(v) + '</b></div>';
      const go = await choice('Demander l’investiture', '<p>La commission d’investiture compare votre dossier à celui de <b>' + esc(io.rival.name) + '</b>' + (io.rival.mandat ? ' (' + esc(io.rival.mandat) + ')' : '') + '. Sa décision est définitive pour cette élection.</p>' + row('Poids dans le parti', pt.poids || 0) + row('Notoriété', pt.noto || 0) + row('Soutien de la fédération', pt.fed || 0) + row('Responsabilités', pt.role || 0) + '<p style="margin-top:8px">Vos chances aujourd’hui : <b class="num">' + io.pct + ' %</b>' + (io.need > 0 ? ' · il vous manque environ ' + io.need + ' points' : '') + '.</p>', [{ l: 'Déposer ma demande', v: true }, { l: 'Attendre et renforcer mon dossier', sub: 'Poids au parti, notoriété, relation avec la fédération', v: false }]); if (!go) return; }
    const r = E.declare(elId, mode); Store.save(); // décision de la commission enregistrée tout de suite
    if (r.ok) { await info('Candidature', '<p>' + esc(r.msg) + '</p>' + (el.type === 'mun' && E.myPetite() ? '<p><b>Vos trois chantiers :</b></p><ol class="small"><li>Compléter la liste (QG › Feuille de route).</li><li>Écrire votre projet pour le village (Programme), puis le publier.</li><li>Aller voir les habitants : porte-à-porte, marché, fêtes.</li></ol>' : '<p class="muted">Pensez à recruter un mandataire financier pour encaisser des dons.</p>')); if (hasHQ() && HQ.needDC()) await dcFlow(false); render(); return; }
    if (r.refused && p.party !== 'NEW' && S().mp && MP.rivals().length) { const r2 = E.declare(elId, 'dissident'); await info('Investiture refusée', '<p>' + esc(r.msg) + '</p><p>Dans une partie multijoueur, on ne se retire pas : vous partez en dissidence. ' + esc(r2.msg || '') + '</p>'); render(); return; }
    if (r.refused && p.party !== 'NEW') {
      const rv = r.rival ? S().pnj[r.rival] : null; const lab = rv ? (rv.g === 'F' ? 'la candidate du parti' : 'le candidat du parti') : 'la décision du parti';
      const v = await choice('Investiture refusée', '<p>' + esc(r.msg) + '</p>', (el.type === 'mun' && rv ? [{ l: 'Négocier une place éligible sur la liste ' + E.de(rv.name), sub: 'Poids interne −3, mais une vraie chance d’être élu·e', v: 'nego' }] : []).concat([{ l: 'M’incliner et soutenir ' + lab, sub: 'Poids interne +4, la fédération vous en sera redevable', v: 'ok' }, { l: 'Partir en dissidence', sub: 'Vous perdez une grande partie de votre poids interne et l’étiquette', v: 'diss' }]));
      if (v === 'nego') { E.addStd(-3); p.rallied = Object.assign({}, p.rallied, { [elId]: r.rival }); const r3 = E.declare(elId, 'colistier', r.rival, { nego: true }); await info('Liste municipale', '<p>' + esc(r3.msg) + '</p>'); render(); return; }
      if (v === 'ok') { E.addStd(4); const f = S().pnj[p.fedId]; if (f) f.rel += 8; if (r.rival) S().pnj[r.rival].rel += 10; p.rallied = Object.assign({}, p.rallied, { [elId]: r.rival }); E.log('Vous vous rangez derrière ' + lab + '.', 'info');
        if (el.type === 'mun' && r.rival) { const j = await choice('Et maintenant ?', '<p>' + esc(S().pnj[r.rival].name) + ' conduira la liste du parti. Vous pouvez la rejoindre : votre place dépendra de votre poids et de votre relation.</p>', [{ l: 'Rejoindre sa liste', v: 'join' }, { l: 'Soutenir de l’extérieur', sub: 'Vous pourrez la rejoindre plus tard', v: 'out' }]); if (j === 'join') { const r3 = E.declare(elId, 'colistier', r.rival); await info('Liste municipale', '<p>' + esc(r3.msg) + '</p>'); } } }
      else { const r2 = E.declare(elId, 'dissident'); await info('Dissidence', '<p>' + esc(r2.msg) + '</p>'); }
      render(); return;
    }
    toast(r.msg);
  }
  async function switchFlow() {
    const p = P(); const c = LN.canSwitch(); if (!c.ok) { toast(c.msg); return; }
    const L = D.QUIZ_P.filter(k => k !== p.party).map(k => ({ k, m: LN.match(k) })).sort((a, b) => b.m - a.m);
    const k = await choice(p.party === 'NEW' ? 'Rejoindre un parti' : 'Quitter ' + D.PARTIES[p.party].short, '<p class="muted">Vous repartez de zéro dans votre nouvelle famille (poids interne, réseau). Si vos désaccords étaient connus, le départ paraît cohérent ; sinon, on parlera d’opportunisme. Pas de nouveau changement avant un an.</p>', L.map(x => ({ l: D.PARTIES[x.k].name, sub: 'Accord avec son programme : ' + x.m + ' %', v: x.k })).concat(p.party !== 'NEW' ? [{ l: 'Devenir indépendant·e', sub: 'Sans parti : libre, mais sans investiture ni financement', v: 'NEW' }] : []).concat([CANCEL])); if (!k) return;
    let mv = null; if (k === 'NEW') { const r = await ask('Votre mouvement', '<p class="muted">Sous quel nom vous présentez-vous désormais ?</p>', 'Ex. Isère Debout', { max: 32, btn: 'Valider' }); if (!r || !r.text) return; mv = r.text.trim(); }
    const r = LN.switchTo(k, mv); await info(r.ok ? 'Changement de parti' : 'Impossible', '<p>' + esc(r.msg) + '</p>'); render();
  }
  async function joinFlow(elId) {
    if (S().mp && MP.rivals().length) { toast('Partie multijoueur : chaque joueur conduit sa propre liste.'); return; }
    const com = E.commune(); const heads = [E.mayorOf(com.id)].concat(E.pnjList(x => x.territory === com.id && ['cadre', 'section', 'candidat'].includes(x.role))).filter(Boolean);
    if (P().party !== 'NEW' && !heads.some(h => h.party === P().party)) heads.push(E.cadre(P().party, com.id, 'cadre'));
    const uniq = [...new Map(heads.map(h => [h.id, h])).values()];
    const id = await choice('Rejoindre une liste', '<p class="muted">Votre place dépendra de votre poids, de votre notoriété et de votre relation avec la tête de liste.</p>', uniq.map(h => ({ l: h.name + ' — ' + (E.myPetite() ? 'liste sans étiquette' : D.PARTIES[h.party].short), sub: (h.mandat || 'Tête de liste') + ' · relation ' + r0(h.rel), v: h.id })).concat([{ l: 'Annuler', v: null }]));
    if (!id) return; const r = E.declare(elId, 'colistier', id); S().pnj[id].known = true; await info('Liste municipale', '<p>' + esc(r.msg) + '</p>'); render();
  }
  async function injectFlow() {
    const r = await ask('Injecter une actualité réelle', '<p class="muted">Collez un titre ou un résumé. Il sera transposé en événement, sans personnalité réelle.</p>', 'Ex. Le gouvernement annonce un plan d’économies…', { max: 1500, btn: 'Transposer' }); if (!r) return;
    const ld = loading('Transposition…'); const ev = await A.transpose(r.text); ld.close();
    const e = { id: 'custom', scope: ['nat', 'loc', 'int'].includes(ev.scope) ? ev.scope : 'nat', t: ev.t || r.text.slice(0, 90), d: ev.d || '', th: D.THEMES[ev.th] ? ev.th : A.themeOf(r.text), sal: E.clamp(+ev.sal || 0.5, 0.1, 1), cl: ev.cl || {}, ch: Array.isArray(ev.ch) && ev.ch.length ? ev.ch.slice(0, 3).map(c => ({ l: c.l, v: c.v || {}, txt: c.txt || c.l })) : null, custom: true };
    for (const k in e.cl) if (!D.PARTIES[k]) delete e.cl[k]; else e.cl[k] = E.clamp(+e.cl[k] || 0, -0.06, 0.06);
    E.applyEvent(e); await runQueue(); render();
  }

  /* ---------- fin de période & file ---------- */
  async function endTurn() {
    const btn = document.getElementById('end'); if (btn) btn.disabled = true;
    if (hasHQ() && HQ.needDC()) { await dcFlow(false); if (HQ.needDC()) { if (btn) btn.disabled = false; return; } }
    const p = P(); if (p.hours > 0 && p.hours >= p.hoursMax * 0.5) { const ok = await choice('Passer la période ?', '<p>Il vous reste <b>' + p.hours + ' heures</b> non utilisées. Elles seront perdues.</p>', [{ l: 'Passer à la suite', v: true }, { l: 'Retourner à l’agenda', v: false }]); if (!ok) { if (btn) btn.disabled = false; go('agir'); return; } }
    if (S().mp) { if (btn) { btn.disabled = true; btn.querySelector('b').textContent = 'Synchronisation…'; } let g = null; try { g = await MP.gate(); } catch (e) { g = null; }
      if (g && g.wait) { render(); await info(g.busy ? 'Calcul en cours' : g.inv ? 'Commission d’investiture' : 'Rendez-vous électoral', g.busy ? '<p>Un autre joueur calcule en ce moment le résultat. Réessayez dans quelques secondes.</p>' : g.inv ? '<p><b>' + esc(g.el.label) + '</b> : plusieurs joueurs de votre parti visent l’investiture. La commission tranchera quand tous seront arrivés à cette date, au vu de votre poids au parti, de votre notoriété et de votre relation avec la fédération.</p>' : '<p><b>' + esc(g.el.label) + (g.round === 2 ? ' · second tour' : '') + '</b> : vous affrontez d’autres joueurs. Le scrutin aura lieu quand tous y seront arrivés.</p><p>En retard : ' + g.late.map(esc).join(', ') + '.</p><p class="muted small">Vous pouvez encore agir sur ce tour. Revenez plus tard : la partie se synchronise toute seule.</p>', 'Compris'); return; } }
    const before = X.snap(); const from = S().date; const nNews = S().news.length ? S().news[0].id : null;
    E.endTurn(); render(); await runQueue();
    if (S().mp && MP.on()) { const fz = MP.force(); for (const f of fz) await info('Candidature d’office', '<p>Dans une partie multijoueur, tout le monde se présente. Vous voilà candidat·e : <b>' + esc(f.el.label) + '</b>' + (f.vs.length ? ', face à ' + esc(f.vs.join(', ')) : '') + '.</p><p>' + esc(f.msg || '') + '</p>', 'En campagne'); }
    E.estimate(); Store.save(); render();
    await bilan(before, from, nNews); render();
  }
  async function bilan(before, from, lastNewsId) {
    const s = S(), p = P(); const es = s.est; const ds = X.deltas(before, X.snap());
    const idx = s.news.findIndex(n => n.id === lastNewsId); const fresh = (idx < 0 ? s.news.slice(0, 6) : s.news.slice(0, idx)).filter(n => n.about === 'pj').slice(0, 4);
    const hist = es ? (s.hist || []).filter(x => x.el === es.el).map(x => x.est) : [];
    let h = '<div class="eyebrow">Du ' + E.fmtDate(from) + ' au ' + E.fmtDate(s.date) + '</div>';
    if (es) h += '<div class="card" style="margin-top:10px"><div class="muted small">' + esc(es.label) + ' · ' + (es.hypo ? 'si vous étiez candidat·e' : 'si l’élection avait lieu demain') + '</div><div class="row" style="align-items:center;gap:14px"><span class="big num">' + (es.rank ? E.pct(es.pct) : '—') + '</span><span class="small">' + (es.rank ? es.rank + '<sup>' + (es.rank === 1 ? (P().g === 'F' ? 're' : 'er') : 'e') + '</sup> sur ' + es.n : 'éliminé·e') + '</span><div style="flex:1;min-width:120px">' + spark(hist, 220, 50) + '</div></div></div>';
    h += '<div class="eyebrow" style="margin-top:12px">Ce qui a bougé</div>' + chipsHTML(ds);
    if ((s.turnStaff || []).length) h += '<div class="eyebrow" style="margin-top:12px">Votre équipe</div>' + s.turnStaff.map(t => '<div class="small" style="margin-top:3px">' + esc(t) + '</div>').join('');
    if ((s.turnRival || []).length) h += '<div class="eyebrow" style="margin-top:12px">Vos adversaires</div>' + s.turnRival.map(t => '<div class="small" style="margin-top:3px">' + esc(t) + '</div>').join('');
    if (fresh.length) h += '<div class="eyebrow" style="margin-top:12px">On parle de vous</div>' + fresh.map(n => '<div class="small" style="margin-top:3px"><b>' + esc(n.media) + '</b> · ' + esc(n.title) + '</div>').join('');
    // Bilan repliable : un bandeau discret, le détail sur demande
    document.querySelectorAll('.bilanbar').forEach(x => x.remove());
    const top = ds.filter(d => !/Argent|Abonnés|Militants/.test(d.l)).sort((a, b) => (b.l === 'Score estimé') - (a.l === 'Score estimé') || Math.abs(b.d) - Math.abs(a.d)).slice(0, 3);
    const bar = document.createElement('div'); bar.className = 'bilanbar';
    bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(78px + env(safe-area-inset-bottom));z-index:40;width:min(560px,94vw);background:var(--raise);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:10px;padding:8px 10px;box-shadow:0 8px 24px rgba(0,0,0,.4);display:flex;gap:8px;align-items:center';
    bar.innerHTML = '<div class="small" style="flex:1"><b>Bilan du tour</b>' + (es && es.rank ? ' · ' + esc(es.label) + ' : <span class="num">' + E.pct(es.pct) + '</span> (' + es.rank + (es.rank === 1 ? '<sup>' + (p.g === 'F' ? 're' : 'er') + '</sup>' : '<sup>e</sup>') + ')' : '') + (top.length ? '<br><span class="muted">' + top.map(d => esc(d.l + ' ' + d.t)).join(' · ') + '</span>' : '') + '</div><button class="btn" data-bdet>Détail</button><button class="btn ghost" data-bx aria-label="Fermer">×</button>';
    document.body.appendChild(bar);
    bar.querySelector('[data-bx]').onclick = () => bar.remove();
    bar.querySelector('[data-bdet]').onclick = async () => { bar.remove(); await info('Bilan du tour', h, 'Continuer'); };
    clearTimeout(UI.bilT); UI.bilT = setTimeout(() => bar.remove(), 12000);
  }
  async function runQueue() {
    const s = S(); UI.bTold = 0; try { await runQueue0(); } finally { if (UI.bTold) toast(UI.bTold > 1 ? 'Vos adversaires attaquent : votre équipe vous attend dans la Boucle.' : 'Une attaque adverse : votre équipe vous attend dans la Boucle.'); }
  }
  async function runQueue0() {
    const s = S();
    while (s.queue.length) {
      const q = s.queue.shift();
      try {
        if (q.kind === 'event') { const e = q.custom || E.EVENTS.find(x => x.id === q.ev); const v = await choice(e.t, '<p>' + esc(e.d) + '</p><p class="muted">Les journalistes vous demandent une réaction.</p>', e.ch.map((c, i) => ({ l: c.l, sub: '« ' + c.txt + ' »', v: i })).concat([{ l: 'Ne pas réagir', v: -1 }])); E.resolveEvent(q.ev, v, q.custom); }
        else if (q.kind === 'results') await showResults(q);
        else if (q.kind === 't2choice') { const v = await choice('Triangulaire', '<p>Vous êtes qualifié·e pour le second tour, mais à plus de deux. Vous maintenez-vous, ou vous désistez-vous ?</p>', [{ l: 'Me maintenir', v: true }, { l: 'Me désister', sub: 'Geste apprécié au parti, mais votre élection s’arrête là', v: false }]); toast(X.resolveT2(q, v)); }
        else if (q.kind === 't2consigne') { const el = s.elections.find(e => e.id === q.el); const r = el.races[q.key]; const opts = (r.t2 || []).map(id => r.cands.find(c => c.id === id)).filter(Boolean).map(c => ({ l: 'Appeler à voter ' + c.name, sub: D.PARTIES[c.party]?.name || '', v: c.id })); const v = await choice('Consigne de vote', '<p>Vous êtes éliminé·e, mais vos électeurs comptent. Que leur dites-vous ?</p>', opts.concat([{ l: 'Pas de consigne', v: null }])); X.resolveConsigne(q, v); }
        else if (q.kind === 'section') { const v = await choice('Élection du secrétaire de section', '<p>Le poste de secrétaire de la section locale est remis en jeu. Vous présentez-vous contre le sortant ?</p>', [{ l: 'Me présenter', v: true }, { l: 'Laisser passer mon tour', v: false }]); await info('Section', '<p>' + esc(X.resolveSection(v)) + '</p>'); }
        else if (q.kind === 'offer') { const x = s.pnj[q.pnj]; if (q.type === 'soutien') { const v = await choice('Proposition de soutien', '<p>' + esc(x.name) + ' (' + esc(x.mandat || ROLE_L[x.role]) + ') propose de vous soutenir publiquement.</p>', [{ l: 'Accepter', v: true }, { l: 'Décliner', v: false }]); toast(X.resolveOffer(q, v)); } else { const v = await choice('Une enveloppe', '<p>' + esc(x.name) + ' (' + esc(x.mandat || 'notable') + ') vous propose « un coup de main » de <b>' + E.eur(q.amount) + '</b> en liquide, sans reçu. Il attendra un retour.</p>', [{ l: 'Accepter l’enveloppe', sub: 'Financement illégal : risque pénal', v: true }, { l: 'Refuser', v: false }]); toast(X.resolveOffer(q, v)); } }
        else if (q.kind === 'vote') { const v = await choice(q.ctx, '<p><b>' + esc(q.text) + '</b></p>' + (q.line ? '<p class="muted">Consigne de votre groupe : ' + q.line + '.</p>' : ''), [{ l: 'Voter pour', v: 'pour' }, { l: 'Voter contre', v: 'contre' }, { l: 'S’abstenir', v: 'abstention' }]); E.resolveVote(q, v); }
        else if (q.kind === 'info') await info(q.title, '<p>' + esc(q.text) + '</p>');
        else if (q.kind === 'cumul') { const c = E.cumulConflict(); if (c) { const v = await choice('Non-cumul des mandats', '<p>' + esc(c.why) + '</p><p class="muted small">La loi vous laisse 30 jours pour choisir. Sans réponse, ' + (c.kind === 'exec' ? 'votre fonction exécutive locale prend fin' : 'le mandat le plus ancien prend fin') + '.</p>', c.opts.map(t => ({ l: 'Renoncer à : ' + E.cumulLabel(t), v: t })).concat([{ l: 'Décider plus tard', sub: 'Avant le ' + E.fmtDate(P().cumul ? P().cumul.due : S().date), v: null }])); if (v) await info('Non-cumul', '<p>' + esc(E.resolveCumul(v)) + '</p>'); } }
        else if (q.kind === 'budget') await budgetFlow();
        else if (q.kind === 'plf') await plfFlow();
        else if (q.kind === 'interp') await interpFlow();
        else if (q.kind === 'rival' && hasHQ() && ['attaque', 'rumeur', 'critique'].includes(q.type) && HQ.fromRival(q)) { UI.bTold = (UI.bTold || 0) + 1; }
        else if (q.kind === 'rival') await rivalQ(q);
        else if (q.kind === 'party') await partyQ(q);
        else if (q.kind === 'situation') { const x = DP.SIT.find(z => z.id === q.id); const before = X.snap(); const v = await choice(x.t, '<p>' + esc(x.d) + '</p>', x.o.map((o, i) => ({ l: o[0], v: i }))); const msg = DP.situationResolve(q.id, v); E.estimate(); await info(x.t, '<p>' + esc(msg) + '</p>' + chipsHTML(X.deltas(before, X.snap()))); }
        else if (q.kind === 'leakwarn') { const c = P().casseroles.find(z => z.id === q.cas); const j = s.pnj[q.j]; if (!c || c.out) continue; const v = await choice('Un journaliste vous prévient', '<p>' + esc(j.name) + ' (' + esc(D.MEDIAS.find(m => m.id === j.territory).name) + ') vous appelle : un confrère s’apprête à sortir une information sur <b>' + esc(c.label) + '</b>.</p>', [{ l: 'Prendre les devants : tout révéler vous-même', sub: 'Le choc est amorti', v: 'devant' }, { l: 'Tenter d’étouffer l’affaire', sub: 'Ça peut marcher… ou empirer', v: 'etouffer' }, { l: 'Ne rien faire', v: 'rien' }]);
          if (v === 'devant') { c.g = Math.max(1, c.g - 1); P().cred = E.clamp(P().cred + 2, 0, 100); E.surface(c, 'Révélé par ' + P().name + ' lui-même, avant la presse.'); j.rel += 5; }
          else if (v === 'etouffer') { j.rel -= 8; if (E.rnd() < 0.5) { c.risk *= 0.5; toast('L’article est repoussé… pour l’instant.'); } else { c.g = Math.min(5, c.g + 1); E.surface(c, 'Et des pressions pour étouffer l’affaire.'); } }
          else E.surface(c, ''); }
      } catch (e) { console.error(e); }
    }
  }
  async function partyQ(q) {
    const s = S(), p = P(); if (p.party === 'NEW') return; const fed = s.pnj[p.fedId]; const ld = s.pnj[s.national.leaders[p.party]]; const pn = D.PARTIES[p.party].short; let msg = '';
    if (q.t === 'federal') {
      const can = p.fedSup >= 15 || p.prole >= 2;
      const v = await choice('Élection à la fédération ' + pn + ' de l’Isère', '<p>Les adhérents du département élisent leur premier·e fédéral·e.' + (fed && !p.fedRole ? ' Sortant·e : <b>' + esc(fed.name) + '</b>.' : '') + '</p><p>Votre soutien parmi les adhérents de l’Isère : <b class="num">' + r0(p.fedSup) + ' %</b>' + (p.secLeader ? ' · vous tenez une section' : '') + '.</p>' + (can ? '' : '<p class="muted small">Il faut au moins 15 % de soutien ou une section pour vous présenter.</p>'), (can ? [{ l: p.fedRole ? 'Me représenter' : 'Me présenter contre la direction sortante', sub: 'Victoire : vous tenez les investitures du département', v: 'run' }] : []).concat([{ l: p.fedRole ? 'Passer la main' : 'Soutenir la direction sortante', v: 'support' }]));
      msg = E.partyResolve(q, v);
    } else if (q.t === 'congres') {
      const figs = E.partyFigures(); const can = p.natSup >= 10 || p.prole >= 3;
      const v = await choice('Congrès national de ' + pn, '<p>Le parti choisit sa direction. Poids estimé des courants :</p>' + figs.map(x => '<div class="small">' + esc(x.name) + (ld && x.id === ld.id ? ' <span class="chip">direction</span>' : '') + ' · courant <span class="num">' + r0(x.natW || 10) + '</span> · relation ' + r0(x.rel) + '</div>').join('') + '<p>Votre soutien national : <b class="num">' + r0(p.natSup) + ' %</b>.</p>' + (can ? '' : '<p class="muted small">Il faut 10 % de soutien national, ou tenir une fédération, pour déposer votre motion.</p>'),
        (p.chef ? [{ l: 'Défendre mon bilan à la tête du parti', v: 'motion' }] : [{ l: 'Soutenir la direction (' + (ld ? ld.name : '') + ')', sub: 'Sécurité : une place si elle gagne', v: 'direction' }].concat(figs.filter(x => !ld || x.id !== ld.id).map(x => ({ l: 'Rallier ' + x.name, sub: 'Pari : si ce courant gagne, vous montez', v: 'ch:' + x.id }))).concat(can ? [{ l: 'Déposer ma propre motion', sub: 'Victoire : vous prenez le parti. Défaite : vous vous isolez.', v: 'motion' }] : [])));
      msg = v.startsWith('ch:') ? E.partyResolve(q, 'challenger', v.slice(3)) : E.partyResolve(q, v);
    } else if (q.t === 'designation') {
      const el = s.elections.find(e => e.id === q.el); const can = p.natSup >= 12 || p.prole >= 4 || p.chef;
      const opts = p.chef ? [{ l: 'Être candidat·e : je dirige le parti', sub: 'Un débat interne départage les ambitieux', v: 'chef' }, { l: 'Laisser la place à ' + (ld ? ld.name : 'un·e baron·ne'), v: 'support' }] : (can ? [{ l: 'Me présenter à la primaire', sub: 'Un débat face aux barons, puis le vote des adhérents', v: 'primaire' }] : []).concat([{ l: 'Soutenir ' + (ld ? ld.name : 'le candidat de la direction'), v: 'support' }]);
      const v = await choice('Désignation pour la ' + (el ? el.label.toLowerCase() : 'présidentielle'), '<p>' + pn + ' choisit son ou sa candidat·e. Votre soutien national : <b class="num">' + r0(p.natSup) + ' %</b>, notoriété nationale ' + r0(p.noto.nat) + '.</p>' + (can ? '' : '<p class="muted small">Il faut 12 % de soutien national ou un siège au bureau national pour concourir.</p>'), opts);
      let extra = 0;
      if (v === 'primaire' || v === 'chef') { const figs = E.partyFigures().slice(0, 2); const sum = await debateRun({ format: 'Débat de la primaire de ' + pn + ', entre candidat·e·s du même camp', host: (E.pnjList(x => x.role === 'journaliste' && x.territory === 'quotlib')[0] || { name: 'La modératrice' }).name, rounds: 8, opponents: figs.map(x => ({ name: x.name, label: pn })) }); extra = (sum.score - 50) / 2; X.applyDebate(sum); }
      msg = E.partyResolve(q, v, extra);
    }
    if (msg) await info('Vie du parti', '<p>' + esc(msg) + '</p>');
  }
  async function rivalQ(q) {
    const s = S(); const x = s.pnj[q.pnj]; if (!x) return; const who = esc(x.name) + ' ' + pill(x.party); const before = X.snap(); let msg = '';
    if (q.type === 'attaque') {
      const v = await choice('Attaque ' + E.de(x.name), '<p>' + who + ' sur X' + (q.viral ? ' — <b>le message fait le buzz</b>' : '') + ' :</p><div class="bubble them">' + esc(q.text) + '</div>', [{ l: 'Répondre avec vos mots', sub: 'Votre réponse est publiée et évaluée', v: 'write' }, { l: 'Réplique cinglante', sub: 'Ça passe ou ça casse, selon votre sang-froid', v: 'cinglant' }, { l: 'Répondre sur le fond, calmement', sub: q.viral ? 'Peu audible face à un buzz' : 'Rassure, mais s’use si on le répète', v: 'fond' }, { l: 'Ignorer', v: 'ignore' }]);
      if (v === 'write') { const r = await ask('Votre réponse à ' + x.name, 'Publiée sur X.', 'Votre réponse…', { max: 280, btn: 'Publier' }); if (r) { const ld = loading('Évaluation…'); const ev = await A.post(r.text); ld.close(); msg = X.applyPost(r.text, ev); x.rel -= 5; if ((ev.portee || 0) > 55) x.mom -= 0.02; } else msg = E.rivalResolve(q, 'ignore'); }
      else msg = E.rivalResolve(q, v);
    } else if (q.type === 'defi') {
      const v = await choice('Défi ' + E.de(x.name), '<p>' + who + ' vous défie publiquement : un face-à-face sur ' + (q.media === 'alpes3' ? 'Alpes 3' : 'Radio Isère') + '.</p>', [{ l: 'Accepter le débat', sub: '4 h, même si votre agenda est plein', v: 'ok' }, { l: 'Refuser', sub: x.name + ' dira que vous fuyez', v: 'refuse' }]);
      if (v === 'ok') { await debateFlow([{ name: x.name, label: D.PARTIES[x.party].short, id: x.id }], 'Face-à-face sur ' + (q.media === 'alpes3' ? 'Alpes 3' : 'Radio Isère') + ' : ' + P().name + ' contre ' + x.name, 3); return; }
      msg = E.rivalResolve(q, 'refuse');
    } else if (q.type === 'alliance') {
      const v = await choice('Proposition ' + E.de(x.name), '<p>' + who + ' vous propose un accord : <b>' + q.clauses.map(c => E.CLAUSES[c]).join(', ') + '</b>.</p><p class="muted small">Relation ' + r0(x.rel) + ' · loyauté perçue ' + (x.traits.loyaute > 60 ? 'solide' : x.traits.loyaute > 35 ? 'moyenne' : 'douteuse') + '</p>', [{ l: 'Accepter', v: 'accept' }, { l: 'Négocier en tête-à-tête', sub: 'Ouvre un rendez-vous (3 h)', v: 'talk' }, { l: 'Refuser', v: 'no' }]);
      if (v === 'talk') { await runAction('rdv', x.id); return; } msg = E.rivalResolve(q, v);
    } else if (q.type === 'rumeur') {
      msg = E.rivalResolve(q, await choice('Rumeur', '<p>L’entourage de ' + who + ' fait courir le bruit que vous ' + esc(q.text) + '.</p>', [{ l: 'Démentir publiquement', v: 'dementi' }, { l: 'Porter plainte en diffamation', sub: '2 500 € de frais, issue incertaine', v: 'plainte' }, { l: 'Ignorer', v: 'ignore' }]));
    } else if (q.type === 'critique') {
      const m = P().prog.find(z => z.id === q.mes); if (!m) return;
      msg = E.rivalResolve(q, await choice('Votre proposition attaquée', '<p>' + who + ' s’en prend à « ' + esc(m.resume) + ' » : ' + esc(q.text) + '</p><p class="muted small">Crédibilité de la proposition : ' + r0(m.cred) + '/100</p>', [{ l: 'La défendre, chiffres à l’appui', sub: 'Réussite selon la crédibilité de la mesure et votre maîtrise du dossier', v: 'chiffrer' }, { l: 'La retirer', sub: 'Fin de la polémique, mais vous reculez', v: 'retirer' }, { l: 'Laisser dire', v: 'ignore' }]));
    }
    E.estimate(); if (msg) await info('Résultat', '<p>' + esc(msg) + '</p>' + chipsHTML(X.deltas(before, X.snap())));
  }
  /* ---------- QG : boucle, direction de campagne, adversaires, projet, cabinet ---------- */
  const hasHQ = () => typeof HQ !== 'undefined';
  function boucleBar() {
    if (!hasHQ()) return ''; const pd = HQ.pending(); const un = HQ.unread(); if (!pd.length && !un) return '';
    const last = HQ.hq().boucle.find(m => !m.me) || {}; const d = HQ.dc();
    return '<button class="smsbar" data-go="msg:boucle" style="border-left-color:#2f8f6f">' + avatar('QG', null) + '<span><b>Boucle de campagne' + (pd.length ? ' · ' + pd.length + ' décision' + (pd.length > 1 ? 's' : '') + ' à trancher' : '') + '</b><span class="cp">' + esc((last.name ? last.name + ' : ' : '') + (last.t || '')) + '</span>' + (pd.length && d ? '<span class="muted small">Sans réponse, ' + esc(d.name.split(' ')[0]) + ' tranchera à la fin du tour.</span>' : '') + '</span>' + (un ? '<span class="badge">' + un + '</span>' : '') + '</button>';
  }
  function tBoucle() {
    if (!hasHQ()) return ''; const h = HQ.hq(); const d = HQ.dc(); const mem = HQ.members();
    let x = '<div class="card"><div class="row" style="gap:10px;flex-wrap:nowrap">' + avatar('QG', null, true) + '<div style="min-width:0"><h3 style="margin:0">Boucle de campagne</h3><div class="muted small">' + (mem.length ? mem.map(z => esc(z.name.split(' ')[0])).join(', ') + ' et vous' : 'Votre équipe apparaîtra ici dès votre candidature') + '</div></div></div>' +
      (d ? '<div class="kpis" style="margin-top:10px">' + kpi('Direction', '<span class="kt">' + esc(d.name) + '</span>', null, null, esc(HQ.STYLE[d.style || 'terrain'][0])) + kpi('Confiance', r0(h.trust) + ' %', h.trust, h.trust < 35 ? 'var(--bad)' : h.trust < 55 ? 'var(--warn)' : 'var(--good)') + kpi('Moral de l’équipe', r0(h.moral) + ' %', h.moral, h.moral < 40 ? 'var(--bad)' : 'var(--good)') + '</div><p class="muted small" style="margin:8px 0 0">Les décisions sans réponse sont tranchées par ' + esc(d.name.split(' ')[0]) + ' à la fin du tour. Suivre ses conseils renforce sa confiance.</p>' : '') + '</div>';
    const L = h.boucle.slice(0, 30).reverse(); if (!L.length) return x + '<div class="card" style="margin-top:12px"><p class="muted" style="margin:0">Rien pour l’instant.</p></div>';
    const pd = HQ.pending(); const dn = d ? d.name.split(' ')[0] : '';
    const decHTML = m => '<div class="bubble them todo"><b class="wa-n">' + esc(m.name) + '</b>' + (m.lbl ? ' <span class="muted small">' + esc(m.lbl) + '</span>' : '') + '<div>' + esc(m.t) + '</div><div class="reps col">' + m.dec.opts.map((o, i) => '<button class="btn sm" data-bdec="' + m.id + ':' + i + '">' + esc(o.l) + (o.h ? ' · ' + o.h + ' h' : '') + (o.cost ? ' · ' + E.eur(o.cost) : '') + (m.dec.rec === i ? ' <span class="chip">👍 avis de ' + esc(dn) + '</span>' : '') + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</button>').join('') + '</div></div>';
    if (pd.length) x += '<div class="eyebrow" style="margin:14px 0 2px">À trancher ce tour · ' + pd.length + '</div><div class="thread-wa" style="margin-top:4px">' + pd.slice().reverse().map(decHTML).join('') + '</div>';
    x += '<div class="eyebrow" style="margin:14px 0 2px">Fil de la boucle</div><div class="thread-wa" style="margin-top:4px">'; let day = '';
    L.forEach(m => { const dd = E.fmtDate(m.date, false); if (dd !== day) { day = dd; x += '<div class="daytag">' + dd + '</div>'; }
      if (m.me) { x += '<div class="bubble me">' + esc(m.t) + '</div>'; return; }
      x += '<div class="bubble them"><b class="wa-n">' + esc(m.name) + '</b>' + (m.lbl ? ' <span class="muted small">' + esc(m.lbl) + '</span>' : '') + '<div>' + esc(m.t) + '</div>';
      if (m.dec && m.dec.done == null) x += '<div class="muted small" style="margin-top:4px">↑ à trancher plus haut</div>';
      else if (m.dec) x += '<div class="muted small" style="margin-top:4px">' + (m.dec.by === 'dc' ? 'Tranché par la direction' : m.dec.by === 'late' ? 'Sans réponse' : 'Tranché') + ' : ' + esc(m.dec.opts[m.dec.done].l) + '</div>';
      x += '</div>'; });
    return x + '</div>';
  }
  async function runHqAct(act) {
    if (!act) return;
    if (act === 'dc') return dcFlow(true);
    if (act === 'cabinet') return cabFlow();
    if (act === 'consult') return consultFlow();
    if (act === 'attack') return attackFlow();
    if (act === 'go:programme') { UI.scope = HQ.lvl(); return go('agir', 'programme'); }
    if (act.startsWith('edl:')) { const r = HQ.prepEdl(act.slice(4)); toast(r.msg); render(); return; }
    if (act.startsWith('write:')) { const [, pid, txt] = act.split(':'); const x = S().pnj[pid]; const r = await ask('Votre réponse à ' + (x ? x.name : 'l’adversaire'), 'Publiée sur X.', 'Votre réponse…', { max: 280, btn: 'Publier' }); if (!r) return; const before = X.snap(); const ld = loading('Évaluation…'); const ev = await A.post(r.text); ld.close(); const msg = X.applyPost(r.text, ev); if (x) { x.rel -= 5; if ((ev.portee || 0) > 55) x.mom -= 0.02; } render(); result('Riposte publiée', msg, before); }
  }
  function bdec(id, i) { const before = X.snap(); const r = HQ.decide(id, i, 'me'); if (!r.ok) { toast(r.msg); return; } const act = S()._hqAct; S()._hqAct = null; E.estimate(); render(); if (act) runHqAct(act); else { const ds = X.deltas(before, X.snap()); if (ds.length) result('Boucle', r.msg, before); } }
  async function dcFlow(replace) {
    if (!hasHQ()) return; const L = HQ.dcCandidates(); const SRC = { equipe: 'Reconduire', proche: 'Un·e proche', ancien: 'Un·e ancien·ne', promo: 'Promotion interne', parti: 'Proposé·e par le parti', militant: 'Un·e militant·e' };
    const v = await choice(replace ? 'Nouvelle direction de campagne' : 'Qui dirige votre campagne ?', '<p>C’est la personne centrale de votre campagne : elle tient la boucle de l’équipe, vous conseille et tranche quand vous n’êtes pas là. Le choix est obligatoire.</p>',
      L.map((c, i) => ({ l: SRC[c.src] + ' : ' + c.name, sub: HQ.STYLE[c.style][0] + ' — ' + HQ.STYLE[c.style][1].toLowerCase() + ' · compétence ' + c.comp + ' · ' + (c.sal ? E.eur(c.sal) + '/mois' : 'bénévole') + (c.note ? ' · ' + c.note : ''), v: i })));
    if (v == null) return; const msg = HQ.setDC(L[v]); toast(msg); render();
  }
  async function attackFlow(preset) {
    const rv = HQ.targets(); if (!rv.length) { toast('Aucun adversaire déclaré pour l’instant.'); return; }
    const xid = preset || await choice('Attaquer un adversaire', '', rv.map(x => ({ l: x.name + ' — ' + D.PARTIES[x.party].short, sub: (x.mandat || 'Candidat·e') + ' · relation ' + r0(x.rel), v: x.id })).concat([CANCEL])); if (!xid) return;
    const ang = HQ.angles(xid); const ak = await choice('Sur quel angle ?', '', ang.map(a => ({ l: a.l + (HQ.edlOf(a.th) ? ' 📎' : ''), sub: a.sub + ' · chances ' + r0(HQ.attackChance(xid, a) * 100) + ' %', v: a.k })).concat([CANCEL])); if (!ak) return;
    const ch = await choice('Par quel canal ?', '', Object.entries(HQ.CHANNELS).map(([k, c]) => ({ l: c.l + (c.h ? ' · ' + c.h + ' h' : '') + (c.cost ? ' · ' + E.eur(c.cost) : ''), sub: c.sub, v: k })).concat([CANCEL])); if (!ch) return;
    const before = X.snap(); const r = HQ.attack(xid, ak, ch); if (!r.ok) { toast(r.msg); return; } render(); result(r.hit ? 'Attaque réussie' : 'Attaque ratée', r.msg, before);
  }
  async function edlFlow() {
    const L = HQ.edlSuggest().slice(0, 7); const h = HQ.edlHours();
    const t = await choice('Préparer des éléments de langage', '<p class="muted">Votre équipe rédige une fiche : messages clés, chiffres, formule. Elle sert trois fois, en débat, en interview ou pour riposter. ' + h + ' h.</p>', L.map(x => ({ l: D.THEMES[x.t].l + (HQ.edlOf(x.t) ? ' (à rafraîchir)' : ''), sub: x.why || '', v: x.t })).concat([CANCEL])); if (!t) return;
    const r = HQ.prepEdl(t); toast(r.msg); render();
  }
  function advPanel() {
    const rv = HQ.targets(); const h = HQ.hq(); const ed = HQ.edlList();
    let x = '<div class="card"><h3>Vos adversaires</h3>' + (rv.length ? rv.map(z => { const a = h.atk[z.id]; return '<div class="li"><div class="grow"><b>' + esc(z.name) + '</b> ' + pill(z.party) + '<div class="muted small">' + esc(z.mandat || 'Candidat·e') + ' · relation ' + r0(z.rel) + (a && E.diffDays(a.date, S().date) < 30 ? ' · attaqué·e ' + a.n + ' fois ce mois' : '') + '</div></div><button class="btn sm" data-hatk="' + z.id + '">Attaquer</button></div>'; }).join('') : '<p class="muted small" style="margin:0">Aucun adversaire déclaré.</p>') + '</div>';
    x += '<div class="card" style="margin-top:12px"><h3>Éléments de langage <span class="muted">' + ed.length + ' fiche(s)</span></h3><p class="muted small" style="margin:-4px 0 8px">Une fiche prête apparaît comme option en débat et en interview (📎), et renforce vos ripostes sur ce thème.</p>' + (ed.length ? ed.map(z => '<div class="li"><div class="grow"><b>' + esc(D.THEMES[z.t].l) + '</b><div class="muted small">Qualité ' + r0(z.e.q) + '/100 · encore ' + z.e.uses + ' utilisation(s)</div></div></div>').join('') : '') + '<div class="row" style="margin-top:8px"><button class="btn sm" id="hedl">Préparer une fiche · ' + HQ.edlHours() + ' h</button></div></div>';
    return x;
  }
  function dcCard() {
    if (!hasHQ()) return ''; const d = HQ.dc(); const h = HQ.hq();
    if (!d) return HQ.needDC() ? '<div class="card" style="border-left:3px solid var(--warn)"><h3>Direction de campagne</h3><p class="small" style="margin:0 0 8px">Personne ne dirige votre campagne. C’est obligatoire : choisissez-le·la avant la fin du tour.</p><button class="btn primary" data-dcpick>Choisir</button></div>' : '';
    return '<div class="card"><h3>Direction de campagne</h3><div class="kpis">' + kpi('Directeur·rice', '<span class="kt">' + esc(d.name) + '</span>', null, null, esc(HQ.STYLE[d.style || 'terrain'][0]) + ' · compétence ' + d.comp) + kpi('Confiance', r0(h.trust) + ' %', h.trust, h.trust < 35 ? 'var(--bad)' : 'var(--good)', h.trust < 35 ? 'Il·elle envisage de partir' : '') + kpi('Moral', r0(h.moral) + ' %', h.moral) + '</div><div class="row" style="gap:6px;margin-top:10px"><button class="btn sm" data-go="msg:boucle">Ouvrir la boucle</button><button class="btn sm ghost" data-dcpick>Changer</button></div></div>';
  }
  function projetCard() {
    if (!hasHQ() || !HQ.active() || !HQ.leads()) return ''; const pj = HQ.projet(); if (!pj) return '';
    const cs = pj.known ? pj.cs : null; const p = P();
    let x = '<div class="c12 card" style="border-left:3px solid var(--accent)"><h3>' + (pj.pl ? 'Profession de foi' : 'Projet de campagne') + ' <span class="muted">' + (pj.lv === 'local' ? 'local' : 'national') + (pj.pub ? ' · publié le ' + E.fmtDate(pj.pub.date, true) : ' · non publié') + '</span></h3><div class="kpis">' + kpi('Qualité', pj.score + '/100', pj.score, pj.score < 45 ? 'var(--bad)' : pj.score < 65 ? 'var(--warn)' : 'var(--good)') + kpi('Réponse aux préoccupations', cs ? r0(pj.cov * 100) + ' %' : '?', cs ? pj.cov * 100 : null, null, cs ? '' : 'Inconnues : consultez') + kpi('Financement', pj.n ? r0(pj.fin * 100) + ' %' : '—', pj.n ? pj.fin * 100 : null, pj.fin < 0.7 ? 'var(--warn)' : 'var(--good)') + kpi(pj.pl ? 'Vos engagements' : 'Propositions', pj.n + (pj.ph ? ' · ' + pj.ph + ' phare' + (pj.ph > 1 ? 's' : '') : '')) + '</div>' + (pj.pl ? '<p class="muted small" style="margin:8px 0 0">La ligne et le programme national viennent de ' + esc(D.PARTIES[p.party].name) + ' : affiches, slogans, grandes mesures. Votre patte : les accents, et vos engagements pour la circonscription.</p>' : '');
    if (pj.pl) x += '<p class="muted small" style="margin:8px 0 0">La ligne et le programme national viennent de ' + esc(D.PARTIES[p.party].name) + ' : affiches, slogans, grandes mesures. Votre patte : les accents, et vos engagements pour la circonscription.</p>';
    if (cs) x += '<div class="eyebrow" style="margin-top:10px">Ce qui préoccupe les électeurs</div><div class="chips" style="padding-top:6px">' + cs.map(c => '<span class="chip' + ((p.prog || []).some(m => m.status !== 'retiree' && m.level === pj.lv && m.theme === c.t) ? ' on' : '') + '">' + esc(D.THEMES[c.t].l) + ' ' + r0(c.w * 100) + ' %</span>').join('') + '</div>';
    if (pj.notes.length) x += '<p class="small" style="margin:8px 0 0"><b style="color:var(--warn)">À corriger :</b> ' + esc(pj.notes[0].txt) + '</p>';
    x += '<p class="muted small" style="margin:8px 0 0">' + (pj.pub ? 'Programme publié : ses propositions pèsent davantage dans le vote.' : 'Tant qu’il n’est pas publié, vos propositions pèsent moins dans le vote (et encore moins dans le dernier mois).') + '</p><div class="row" style="gap:6px;margin-top:8px">' + (cs ? '' : '<button class="btn sm" data-hcons>Consulter les habitants</button>') + '<button class="btn sm" data-hatel>Atelier programme · 2 h</button>' + (pj.pub ? '' : '<button class="btn sm primary" data-hpub' + (pj.n < pj.min ? ' disabled' : '') + '>' + (pj.pl ? 'Publier la profession de foi' : 'Publier le programme') + ' · 3 h</button>') + '</div></div>';
    return x;
  }
  async function consultFlow() {
    const k = await choice('Consulter les habitants', '<p class="muted">Savoir ce qui compte vraiment ici, avant de figer le programme.</p>', Object.entries(HQ.CONSULT).map(([k, c]) => ({ l: c.l, sub: c.sub, v: k })).concat([CANCEL])); if (!k) return;
    const before = X.snap(); const r = HQ.consult(k); if (!r.ok) { toast(r.msg); return; } render(); result('Consultation', r.msg, before);
  }
  async function atelierFlow() {
    const r = HQ.atelier(); if (!r.ok) { toast(r.msg); return; } render(); if (!r.notes.length) { toast(r.msg); return; }
    for (const n of r.notes) {
      const opts = n.k === 'miss' ? [{ l: 'Ajouter une proposition sur ' + E.thArt(n.t), v: 'add' }] : n.k === 'unf' ? [{ l: 'La retirer du programme', v: 'do' }] : n.k === 'trop' ? [{ l: 'Retirer les propositions secondaires', v: 'do' }] : n.k === 'phare' ? [{ l: 'En faire une mesure phare', v: 'do' }] : [{ l: 'Ajouter une proposition', v: 'add' }];
      const v = await choice('Atelier programme', '<p>' + esc(n.txt) + '</p>', opts.concat([{ l: 'Passer', v: null }]));
      if (v === 'do') toast(HQ.noteAct(n, true));
      else if (v === 'add') { HQ.noteAct({ k: 'none' }, true); render(); if (n.t) await chapterFlow(n.t, HQ.lvl()); else await themePick(HQ.lvl()); return; }
      else if (v === 'fin') { HQ.noteAct({ k: 'none' }, true); render(); await runAction('defendre', n.id); return; }
      else HQ.noteAct({ k: 'none' }, false);
    }
    render();
  }
  function cabCard() {
    if (!hasHQ()) return ''; const ps = HQ.posts(); if (!ps.length) return '';
    return '<div class="card"><h3>Votre cabinet</h3><p class="muted small" style="margin:-4px 0 8px">Recrutez de préférence dans votre équipe de campagne : loyauté assurée, mais compétences inégales.</p><div class="list">' + ps.map(k => { const c = HQ.cabOf(k); const P0 = HQ.POSTS[k]; return '<div class="li"><div class="grow"><div class="eyebrow">' + esc(P0.l) + '</div>' + (c ? '<b>' + esc(c.name) + '</b> <span class="muted small">· compétence ' + c.comp + ' · loyauté ' + r0(c.loy) + (c.from === 'campagne' ? ' · de la campagne' : '') + '</span>' : '<span style="color:var(--warn)">À pourvoir</span> <span class="muted small">· ' + esc(P0.d) + '</span>') + '</div><button class="btn sm" data-hcab="' + k + '">' + (c ? 'Changer' : 'Recruter') + '</button></div>'; }).join('') + '</div></div>';
  }
  async function cabFlow(post) {
    const ps = HQ.posts(); if (!ps.length) { toast('Aucun mandat ne vous donne de cabinet.'); return; }
    const k = post || await choice('Composer le cabinet', '', ps.map(x => ({ l: HQ.POSTS[x].l, sub: (HQ.cabOf(x) ? HQ.cabOf(x).name : 'À pourvoir') + ' · ' + HQ.POSTS[x].d, v: x })).concat([CANCEL])); if (!k) return;
    const L = HQ.cabCands(k); const v = await choice(HQ.POSTS[k].l, '', L.map((c, i) => ({ l: c.name, sub: c.note + ' · compétence ' + c.comp + ' · loyauté ' + r0(c.loy), v: i })).concat(HQ.cabOf(k) ? [{ l: 'Laisser le poste vacant', v: 'fire' }] : []).concat([CANCEL])); if (v == null) return;
    toast(v === 'fire' ? HQ.fireCab(k) : HQ.hireCab(k, L[v])); render();
  }

  /* ---------- exercice du pouvoir : bureau d'élu ---------- */
  const hasOF = () => typeof OF !== 'undefined';
  function parapheur(full) {
    const L = OF.pending(); const done = OF.of().dos.filter(d => d.done != null).slice(0, full ? 3 : 0);
    let h = '<div class="card"><h3>Parapheur <span class="muted">' + (L.length ? L.length + ' dossier' + (L.length > 1 ? 's' : '') + ' à traiter' : 'à jour') + '</span></h3>';
    if (!L.length) h += '<p class="muted small" style="margin:0">Rien d’urgent. Les nouveaux dossiers arrivent à chaque tour.</p>';
    L.forEach(d => { h += '<div class="dos"><div class="eyebrow">' + (d.lvl === 'nat' ? 'Paris' : 'Terrain') + (d.who ? ' · note de ' + esc(d.who) : '') + '</div><div class="dt">' + esc(d.t) + '</div><div class="reps col">' + d.opts.map((o, i) => { const ok = OF.optOk(o); const a = o.d ? OF.adjOf(o.d) : null; return '<button class="btn sm' + (ok === true ? '' : ' off') + '" data-ofd="' + d.id + ':' + i + '">' + esc(o.l) + (a ? ' (' + esc(a.name) + ')' : '') + (o.h ? ' · ' + o.h + ' h' : '') + (o.cost ? ' · ' + E.eur(o.cost) : '') + (ok === true ? '' : '<small>' + esc(ok) + '</small>') + '</button>'; }).join('') + '</div><div class="muted small">' + (d.who ? 'Sans décision, ' + esc(d.who.split(' ')[0]) + ' traitera ce qui peut l’être sans vous.' : OF.TPL[d.kind].d && OF.adjOf(OF.TPL[d.kind].d) ? 'Sans décision, ' + esc(OF.adjOf(OF.TPL[d.kind].d).name.split(' ')[0]) + ' (adjoint·e) s’en chargera.' : 'Sans décision, le dossier sera classé sans suite.') + '</div></div>'; });
    if (done.length) h += '<div class="eyebrow" style="margin-top:10px">Derniers dossiers</div>' + done.map(d => '<div class="small" style="margin-top:4px"><span class="muted">' + esc(d.t.slice(0, 70)) + '… →</span> ' + esc(d.auto ? 'traité par ' + d.auto + ' : ' : '') + esc(d.res || '') + '</div>').join('');
    return h + '</div>';
  }
  function hemiCard() {
    const o = OF.of(); const t = o.texte; if (!OF.isDep() || !t) return '';
    const st = Math.min(2, t.stage);
    return '<div class="card"><h3>Cette semaine à l’Assemblée</h3><div class="eyebrow">' + esc(OF.STAGES[st]) + ' · ' + esc(D.THEMES[t.th].l) + '</div><div class="dt" style="font:600 16px/1.3 var(--f-display);margin:4px 0 6px">' + esc(t.l) + '</div>' + (t.line ? '<p class="small" style="margin:0 0 8px">Consigne du groupe : <b>' + t.line + '</b>' + (t.amdt ? ' · ' + t.amdt + ' série(s) d’amendements déposée(s)' : '') + '</p>' : '') +
      '<div class="row" style="gap:6px">' + (t.stage <= 1 ? '<button class="btn sm" data-amdt>Déposer des amendements · 3 h</button>' : '') + (!t.spoke ? '<button class="btn sm" data-speak>Prendre la parole · 2 h</button>' : '') + quick('qag') + '</div>' +
      (t.stage >= 2 && !t.vote ? '<div class="eyebrow" style="margin-top:10px">Votre vote</div><div class="row" style="gap:6px">' + ['pour', 'contre', 'abstention'].map(v => '<button class="btn sm' + (v === t.line ? ' primary' : '') + '" data-vote="' + v + '">' + v.charAt(0).toUpperCase() + v.slice(1) + '</button>').join('') + '</div><p class="muted small" style="margin:6px 0 0">Sans vote de votre part, la consigne du groupe s’applique.</p>' : t.vote ? '<p class="small" style="margin:8px 0 0">Vous avez voté <b>' + t.vote + '</b>.</p>' : '') + '</div>';
  }
  function bureauElu() {
    const p = P(), o = OF.of(); let h = '<div class="card elu"><div class="eyebrow">Bureau d’élu</div><h2 style="margin:4px 0 8px;font-size:21px">' + esc(p.mandats.map(m => m.label).join(' · ')) + '</h2>';
    if (OF.isDep()) h += '<div class="kpis">' + kpi('Présence en circonscription', r0(o.pres), o.pres, o.pres < 30 ? 'var(--bad)' : 'var(--good)', o.pres < 30 ? '« On ne le voit jamais »' : '') + kpi('Poids à l’Assemblée', r0(o.poids), o.poids, 'var(--accent)') + '</div><label class="small" style="display:block;margin-top:10px">Semaine type : <b id="splt">' + o.split + ' %</b> en circonscription, ' + (100 - o.split) + ' % à Paris<input type="range" id="split" min="10" max="90" step="5" value="' + o.split + '" style="width:100%"></label>';
    if (OF.isMaire() && p.mairie) { const m = p.mairie; const adj = (o.adj || []).filter(a => a.on); const weak = adj.filter(a => a.loy < 40);
      h += '<div class="kpis" style="margin-top:8px">' + kpi('Cohésion de la majorité', r0(m.cohesion ?? 70) + ' %', m.cohesion ?? 70, (m.cohesion ?? 70) < 45 ? 'var(--bad)' : 'var(--good)') + kpi('Investissement ' + S().date.slice(0, 4), E.eur(Math.max(0, m.invest - m.projets.filter(x => x.date.slice(0, 4) === S().date.slice(0, 4)).reduce((a, x) => a + x.cost, 0)))) + '</div>' +
        (adj.length ? '<details style="margin-top:10px"><summary class="small"><b>' + adj.length + ' adjoint·e·s</b>' + (weak.length ? ' · <span style="color:var(--warn)">' + weak.length + ' en froid</span>' : ' · majorité soudée') + '</summary>' + adj.map(a => '<div class="small" style="margin-top:3px"><b>' + esc(a.name) + '</b> <span class="muted">· ' + esc(OF.DELEG[a.deleg]) + ' · compétence ' + a.comp + '</span>' + (a.loy < 40 ? ' <span class="chip red">loyauté ' + r0(a.loy) + '</span>' : '') + '</div>').join('') + '</details>' + (weak.length ? '<p class="small" style="color:var(--warn);margin:6px 0 0">Confiez-leur des dossiers de leur délégation : un·e adjoint·e qu’on court-circuite finit par partir.</p>' : '') : ''); }
    h += '<div class="row" style="gap:6px;margin-top:10px"><button class="btn sm" data-go="agir:mandat">Tableau de bord du mandat</button>' + (typeof HQ !== 'undefined' && HQ.posts().length ? '<button class="btn sm ghost" data-go="agir:mandat">Cabinet</button>' : '') + '</div></div>';
    return h + '<div style="margin-top:12px">' + parapheur(true) + '</div>' + (OF.isMaire() ? '<div style="margin-top:12px">' + pjCard() + '</div>' : '') + (OF.isDep() ? '<div style="margin-top:12px">' + hemiCard() + '</div>' : '');
  }
  // Projets du mandat : engagements de campagne à lancer, chantiers en cours, réalisations
  const PJ_ST = { etude: 'Étude', subv: 'Financement', subvok: 'Financement', ao: 'Appel d’offres', travaux: 'Travaux', fini: 'Inauguré' };
  function pjCard() {
    if (!hasOF() || !OF.isMaire()) return ''; const p = P(); const L = OF.pjs(); const act = OF.activePj(); const fin = L.filter(x => x.st === 'fini');
    const eng = p.prog.filter(m => m.level === 'local' && m.lever && (!m.status || m.status === 'proposee') && !L.some(x => x.mid === m.id && x.st !== 'abandon'));
    const steps = ['etude', 'subv', 'ao', 'travaux', 'fini'];
    let h = '<div class="card"><h3>Projets du mandat <span class="muted">' + act.length + '/' + OF.PJ_MAX() + ' en cours</span></h3><p class="muted small" style="margin:-4px 0 8px">Une promesse se réalise en plusieurs étapes : étude, subventions, appel d’offres, travaux, inauguration. Les décisions arrivent dans le parapheur.</p>';
    if (act.length) h += act.map(x => { const i = steps.indexOf(x.st === 'subvok' ? 'subv' : x.st); const nxt = x.wait ? '<span style="color:var(--warn)">Décision attendue dans le parapheur</span>' : x.st === 'etude' ? 'Étude en cours' : x.st === 'subv' ? (x.again ? 'Reporté au prochain budget' : 'Dossiers de subvention à l’instruction') : x.st === 'ao' ? 'Appel d’offres publié' : x.st === 'travaux' ? 'Chantier en cours · fin prévue ' + E.fmtDate(E.addDays(S().date, Math.max(0, x.t)), true) : '';
      return '<div class="proj" style="margin:8px 0"><b class="small">' + esc(x.l) + '</b><div class="pjst">' + steps.map((k, j) => '<span class="' + (j < i ? 'ok' : j === i ? 'cur' : '') + '">' + PJ_ST[k] + '</span>').join('') + '</div><div class="muted small">' + nxt + (x.inv ? ' · ' + E.eur(x.inv) + (x.tot ? ' dont ' + x.tot + ' % de subventions' : '') : '') + '</div></div>'; }).join('');
    if (eng.length) h += '<div class="eyebrow" style="margin-top:10px">Vos engagements de campagne</div>' + eng.slice(0, 6).map(m => '<div class="li"><div class="grow small">' + esc(m.resume) + '</div><button class="btn sm" data-pjm="' + m.id + '"' + (act.length >= OF.PJ_MAX() ? ' disabled' : '') + '>Lancer · 3 h</button></div>').join('');
    else if (!act.length) h += '<p class="small" style="margin:6px 0">Aucun engagement en attente.</p>';
    h += '<div class="row" style="margin-top:8px"><button class="btn sm" id="pjnew"' + (act.length >= OF.PJ_MAX() ? ' disabled' : '') + '>Nouveau projet</button></div>';
    if (fin.length) h += '<div class="eyebrow" style="margin-top:10px">Réalisé</div>' + fin.slice(-5).reverse().map(x => '<div class="small">✓ ' + esc(x.l) + ' <span class="muted">· ' + E.fmtDate(x.end, true) + '</span></div>').join('');
    return h + '</div>';
  }
  async function pjNewFlow() {
    const com = E.commune(); const ths = L.themesFor('local', com.pop);
    const t = await choice('Nouveau projet', '<p class="muted">Sur quel sujet ?</p>', ths.map(x => ({ l: D.THEMES[x].l, v: x })).concat([CANCEL])); if (!t) return;
    const levs = L.leversFor('local', t, com.pop); const k = await choice(D.THEMES[t].l, '<p class="muted">Lancer l’étude prend 3 h. Le financement se décidera après.</p>', levs.map((l, i) => { const ev = L.evaluate(l, l.def, 'subventions', com); return { l: ev.label, sub: (ev.inv ? 'Investissement ≈ ' + E.eur(ev.inv) : '') + (ev.cost > 0 ? (ev.inv ? ' · ' : '') + E.eur(ev.cost) + ' par an' : ''), v: String(i) }; }).concat([CANCEL])); if (k == null) return;
    const r = OF.startPj({ lev: levs[+k].id }); toast(r.msg); render();
  }
  function eluBar() { const n = OF.pending().length; if (!n) return ''; return '<button class="smsbar" data-go="agir:mandat" style="border-left-color:var(--accent)"><span><b>Parapheur · ' + n + ' dossier' + (n > 1 ? 's' : '') + '</b><span class="cp">Votre mandat continue pendant la campagne</span></span><span class="badge">' + n + '</span></button>'; }
  async function speakFlow() { const v = await choice('Prendre la parole dans l’hémicycle', '<p class="muted">Cinq minutes au micro, en séance publique.</p>', [{ l: 'Sur le fond, chiffres à l’appui', sub: 'Sûr, apprécié des collègues', v: 'fond' }, { l: 'Avec des exemples de la circonscription', sub: 'Touche les classes populaires', v: 'emotion' }, { l: 'Une sortie qui fera le buzz', sub: 'Quitte ou double', v: 'punch' }, CANCEL]); if (!v) return; const before = X.snap(); const r = OF.speak(v); if (!r.ok) { toast(r.msg); return; } render(); result('Dans l’hémicycle', r.msg, before); }

  /* ---------- feuille de route de campagne et rôle de l'équipe ---------- */
  function campSteps() {
    if (!hasHQ() || !HQ.active() || !HQ.leads()) return ''; const p = P(); const pj = HQ.projet(); const li = p.cand.liste; const d = HQ.dc();
    const st = [
      HQ.petite() && !d ? null : [!!d, 'Direction de campagne', d ? esc(d.name) : 'À choisir', d ? '' : '<button class="btn sm primary" data-dcpick>Choisir</button>'],
      [!!p.cand.concerns, 'Écouter les habitants', p.cand.concerns ? 'Préoccupations connues' : 'Facultatif, mais oriente le programme', p.cand.concerns ? '' : '<button class="btn sm" data-hcons>Consulter</button>'],
      [!!(pj && pj.pub), pj && pj.pl ? 'Profession de foi publiée' : HQ.petite() ? 'Projet pour le village publié' : 'Programme publié', pj && pj.pub ? 'Qualité ' + pj.pub.score + '/100' : (pj ? pj.n : 0) + ' proposition(s) · qualité ' + (pj ? pj.score : 0) + '/100', pj && pj.pub ? '' : '<button class="btn sm' + (pj && pj.n >= pj.min ? ' primary' : '') + '" data-go="agir:programme">Programme</button>'],
      li ? [!!li.closed && li.n >= li.need, 'Liste déposée', li.closed ? 'Déposée' : Math.min(li.n, li.need) + '/' + li.need + ' · dépôt le ' + E.fmtDate(li.dep, true), li.closed ? '' : '<button class="btn sm" data-go="agir:c_actions">Recruter</button>'] : null,
      [!!(pj && pj.pub), 'Campagne de terrain', pj && pj.pub ? 'Efficacité ' + r0(HQ.terrainK() * 100) + ' %' : 'Bridée tant que le ' + (HQ.petite() ? 'projet' : 'programme') + ' n’est pas publié', '']
    ].filter(Boolean);
    const n = st.filter(x => x[0]).length;
    return '<div class="card steps"><h3>Feuille de route <span class="muted">' + n + '/' + st.length + '</span></h3>' + (pj && !pj.pub ? '<p class="small" style="margin:-2px 0 8px;color:var(--warn)">Phase de préparation : tant que votre ' + (HQ.petite() ? 'projet' : 'programme') + ' n’est pas publié, le terrain rapporte ' + (HQ.petite() ? '20' : '40') + ' % de moins. ' + (HQ.petite() ? 'Les habitants veulent savoir ce que vous ferez.' : 'Vos militants n’ont rien à défendre.') + '</p>' : '') +
      st.map(([ok, l, sub, btn]) => '<div class="stp' + (ok ? ' ok' : '') + '"><span class="ck">' + (ok ? '✓' : '') + '</span><div class="grow"><b>' + l + '</b><div class="muted small">' + sub + '</div></div>' + btn + '</div>').join('') + '</div>';
  }
  function teamWork() {
    if (!hasHQ() || !HQ.active() || !HQ.leads()) return ''; const p = P(); const d = HQ.dc(); const h = HQ.hq();
    const pro = r => p.staff.find(x => x.role === r); const lane = l => HQ.member(l);
    const com = lane('com'), ter = lane('terrain'), org = lane('orga'); const comPro = p.staff.some(x => ['com', 'cm', 'plume'].includes(x.role)); const terPro = !!pro('terrain'); const orgPro = p.staff.some(x => ['mandataire', 'juriste'].includes(x.role));
    const row = (who, role, status, eff) => '<div class="tw"><div class="grow"><div class="eyebrow">' + role + '</div><b>' + esc(who) + '</b> <span class="muted small">· ' + status + '</span><div class="small">' + eff + '</div></div></div>';
    const tk = HQ.terrainK() / (HQ.prepK() || 1);
    return '<div class="card"><h3>Ce que fait votre équipe</h3><p class="muted small" style="margin:-4px 0 6px">Chaque membre agit à chaque tour, sans vous coûter d’heures. Un·e professionnel·le fait mieux qu’un·e bénévole.</p>' +
      (d ? row(d.name, 'Direction', 'compétence ' + d.comp + ' · confiance ' + r0(h.trust) + ' %', 'Tranche les décisions de la Boucle quand vous ne répondez pas, vous conseille chaque semaine. ' + esc(HQ.STYLE[d.style || 'terrain'][1]) + '.') : '') +
      row(com.name, 'Communication', comPro ? 'salarié·e · compétence ' + com.comp : 'bénévole · compétence ' + com.comp, 'Ripostes réussies : environ ' + r0(Math.min(95, (0.42 + com.comp / 260 + (p.cred - 50) / 250) * 100)) + ' % · éléments de langage de qualité ' + r0(32 + com.comp / 2.4) + '/100.') +
      row(ter.name, 'Terrain', terPro ? 'salarié·e · compétence ' + ter.comp : 'bénévole · compétence ' + ter.comp, 'Efficacité des militants : ' + r0(tk * 100) + ' %' + (h.tracts != null ? ' · stock de tracts : ' + Math.max(0, Math.round(h.tracts)) : '') + (h.flags && h.flags.coord ? ' · coordinateurs par secteur' : '') + '.') +
      row(org.name, 'Logistique et réglementaire', orgPro ? 'professionnel·le' : 'bénévole', orgPro ? 'Comptes, reçus de dons, dépôts en préfecture : aucune erreur.' : 'Risque d’erreur sur les dépôts et la commission de propagande. Un mandataire financier est obligatoire pour encaisser des dons.') +
      '<div class="row" style="margin-top:8px">' + quick('recruter') + '</div></div>';
  }

  /* ---------- navigation ---------- */
  // Navigation à un seul niveau : le 2e onglet change selon la phase (campagne, mandat, ou ni l'un ni l'autre)
  // Deux visages : la campagne (QG, affiches, compte à rebours) et le pouvoir (mairie, institutions, dossiers)
  const POUV_VIEWS = new Set(['mandat']);
  function face() { const m = phaseMode(); if (m === 'camp') return 'camp'; if (m === 'mandat') return 'pouvoir'; if (m === 'libre') return 'libre'; const v = viewOf(); return POUV_VIEWS.has(v) || (UI.tab === 'bureau' && UI.face === 'pouvoir') ? 'pouvoir' : 'camp'; }
  function mainMandat() { const p = P(); const pr = ['president', 'depute', 'senateur', 'maire', 'cd', 'cr', 'meuro', 'adjoint', 'conseiller_municipal']; const ix = t => { const i = pr.indexOf(t); return i < 0 ? 99 : i; }; const m = p.mandats.slice().sort((a, b) => ix(a.type) - ix(b.type))[0]; return m ? m.label : ''; }
  function faceBand(f) {
    const ph = E.phase(); const m = phaseMode();
    if (f === 'libre') return ph.id !== 'hors' ? '<div class="phase">' + esc(ph.label) + '</div>' : '';
    const sw = m === 'both' ? '<span class="fsw"><button data-face="camp" class="' + (f === 'camp' ? 'on' : '') + '">📣 Campagne</button><button data-face="pouvoir" class="' + (f === 'pouvoir' ? 'on' : '') + '">🏛 Mandat</button></span>' : '';
    if (f === 'camp') { const cc = campCtx(); return '<div class="phase band-camp"><b>EN CAMPAGNE</b><span>' + esc(cc && cc.el ? cc.el.label : ph.label) + (ph.days != null && ph.id !== 'attente' ? ' · J−' + Math.ceil(ph.days) : '') + '</span>' + sw + '</div>'; }
    const e = E.nextElection(); return '<div class="phase band-pouv"><i class="tri"></i><b>AU POUVOIR</b><span>' + esc(mainMandat()) + (e && m !== 'both' ? ' · prochain scrutin : ' + esc(e.label) : '') + '</span>' + sw + '</div>';
  }
  function phaseMode() { const cc = G.S && campCtx(); const camp = !!(cc && cc.cand); const man = G.S && P().mandats.length > 0; return camp ? (man ? 'both' : 'camp') : man ? 'mandat' : 'libre'; }
  const NAV = {
    bureau: { get l() { return G.S && phaseMode() === 'mandat' ? 'Bureau' : 'QG'; }, subs: null },
    agir: { get l() { const m = G.S ? phaseMode() : 'libre'; return m === 'camp' || m === 'both' ? 'Campagne' : m === 'mandat' ? 'Mandat' : 'Agir'; },
      subs: () => { const m = phaseMode(); const C = [['c_actions', 'Actions'], ['programme', 'Programme'], ['c_adv', 'Adversaires'], ['c_equipe', 'Équipe'], ['c_terrain', 'Carte']];
        if (m === 'camp') return C; if (m === 'both') return C.concat([['mandat', P().mandats.length > 1 ? 'Mandats' : 'Mandat']]);
        const ce = campCtx() ? [['c_actions', '🗳 ' + campCtx().el.label.replace(/ \d{4}.*/, '')]] : [];
        if (m === 'mandat') return ce.concat([['mandat', 'Dossiers'], ['vie', 'Vie politique'], ['programme', 'Programme']]);
        return ce.concat([['vie', 'Vie politique'], ['programme', 'Programme']]); } },
    msg: { l: 'Messages', subs: () => (typeof HQ !== 'undefined' && G.S && (HQ.hq().boucle.length || HQ.active()) ? [['boucle', 'Boucle']] : []).concat([['sms', 'SMS'], ['presse', 'Presse'], ['x', 'X']]) },
    plus: { l: 'Plus', subs: () => (G.S && G.S.mp ? [['joueurs', 'Joueurs']] : []).concat([['parti', 'Parti'], ['opinion', 'Opinion'], ['carnet', 'Carnet']], ['camp', 'both'].includes(phaseMode()) ? [] : [['equipe', 'Collaborateurs']]) }
  };
  const LEGACY = { agenda: ['agir', null], programme: ['agir', 'programme'], monde: ['msg', 'presse'], reseau: ['plus', 'parti'], carnet: ['plus', 'carnet'] };
  UI.sub = { agir: null, msg: 'sms', plus: null };
  const subsOf = t => { const s = NAV[t] && NAV[t].subs; return typeof s === 'function' ? s() : s; };
  function go(tab, sub) { if (LEGACY[tab]) [tab, sub] = LEGACY[tab]; if (tab === 'agir' && sub === 'campagne') sub = 'c_actions'; if (tab === 'plus' && sub === 'equipe' && ['camp', 'both'].includes(phaseMode())) { tab = 'agir'; sub = 'c_equipe'; } UI.tab = NAV[tab] ? tab : 'bureau'; if (sub && subsOf(UI.tab)) UI.sub[UI.tab] = sub; render(); window.scrollTo(0, 0); }
  const ICO = {
    bureau: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    agir: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
    msg: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17h0A2.5 2.5 0 0 1 4 14.5z"/>',
    plus: '<circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/>'
  };
  const ico = k => '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico ' + k + '">' + ICO[k] + '</svg>';
  function viewOf() { const t = NAV[UI.tab] ? UI.tab : 'bureau'; if (t === 'bureau') return 'bureau'; const L = subsOf(t); return L.some(x => x[0] === UI.sub[t]) ? UI.sub[t] : L[0][0]; }
  const VIEWS = () => ({ c_actions: () => { UI.csub = 'actions'; return tCampagne(); }, c_adv: () => { UI.csub = 'adv'; return tCampagne(); }, c_equipe: () => { UI.csub = 'equipe'; return tCampagne(); }, c_terrain: () => { UI.csub = 'terrain'; return tCampagne(); }, boucle: () => { const h = tBoucle(); HQ.markRead(); return h; }, bureau: tBureau, campagne: tCampagne, mandat: tMandat, vie: tVie, programme: tProgramme, sms: tSms, presse: tPresse, x: tX, parti: tReseau, equipe: tEquipe, opinion: tOpinion, carnet: tCarnet, joueurs: tJoueurs });
  function countdown() {
    const s = S(), ph = E.phase(); const e = E.nextElection(); if (!e) return '';
    const dl = E.daysLeft(); const td = E.turnDays();
    if (E.silence()) return '<span class="cd hot" title="' + esc(ph.label) + '">Silence électoral</span>';
    if (ph.id === 'attente') return '<span class="cd">' + (ph.won ? 'Élu·e au 1er tour' : 'Campagne terminée') + '</span>';
    if (ph.id === 'campagne' || ph.id === 'entre2' || dl <= 21) return '<span class="cd hot" title="' + esc(ph.label) + '">' + (ph.id === 'entre2' ? '2nd tour ' : '') + 'J−' + Math.ceil(dl) + (td === 0.5 ? (s.half ? ' · après-midi' : ' · matin') : '') + '</span>';
    if (dl < 420) return '<span class="cd" title="' + esc(e.label) + '"><span class="cdl">' + esc(e.label.replace(/ \d{4}.*/, '')) + ' · </span>J−' + Math.ceil(dl) + '</span>';
    return '';
  }
  const daysL = d => d === 0.5 ? '½ journée' : '+' + d + ' j';

  /* ---------- avatars ---------- */
  function avatar(name, party, big) {
    const ini = name === 'Numéro masqué' ? '?' : String(name || '?').replace(/[^A-Za-zÀ-ÿ' -]/g, '').split(/[\s-]+/).filter(w => w && w[0] === w[0].toUpperCase()).slice(0, 2).map(w => w[0]).join('') || name[0];
    const bg = party && D.PARTIES[party] ? pc(party) : '#3a4150';
    return '<span class="av' + (big ? ' big' : '') + '" style="background:' + bg + '" aria-hidden="true">' + esc(ini) + '</span>';
  }

  /* ---------- carte de l'Isère ---------- */
  const GEO = { 'Grenoble': [45.19, 5.72], "Saint-Martin-d'Hères": [45.17, 5.77], 'Échirolles': [45.14, 5.72], 'Vienne': [45.52, 4.87], 'Bourgoin-Jallieu': [45.59, 5.27], 'Fontaine': [45.19, 5.68], 'Voiron': [45.36, 5.59], 'Villefontaine': [45.61, 5.15], 'Meylan': [45.21, 5.78], "L'Isle-d'Abeau": [45.62, 5.23], 'Saint-Égrève': [45.23, 5.68], 'Seyssinet-Pariset': [45.18, 5.69], 'Sassenage': [45.20, 5.66], 'Voreppe': [45.29, 5.64], 'Crolles': [45.28, 5.88], 'La Tour-du-Pin': [45.57, 5.44], 'Roussillon': [45.37, 4.81], 'Moirans': [45.32, 5.57], 'Saint-Marcellin': [45.15, 5.32], 'Tullins': [45.30, 5.49], 'Vizille': [45.08, 5.77], 'Rives': [45.35, 5.50], 'Pont-de-Chéruy': [45.75, 5.17], 'La Côte-Saint-André': [45.39, 5.26], 'La Mure': [44.90, 5.79], 'Beaurepaire': [45.34, 5.05], 'Saint-Jean-de-Bournay': [45.50, 5.14], 'Villard-de-Lans': [45.07, 5.55], 'Allevard': [45.39, 6.07], 'Crémieu': [45.72, 5.25], "Le Bourg-d'Oisans": [45.05, 6.03], 'Mens': [44.82, 5.75] };
  const OUTLINE = [[4.75, 45.35], [4.80, 45.55], [4.95, 45.62], [5.05, 45.72], [5.15, 45.80], [5.35, 45.88], [5.45, 45.80], [5.55, 45.65], [5.70, 45.60], [5.80, 45.52], [5.85, 45.42], [6.00, 45.45], [6.15, 45.38], [6.25, 45.25], [6.36, 45.10], [6.25, 44.95], [6.05, 44.85], [5.90, 44.80], [5.70, 44.70], [5.55, 44.80], [5.45, 44.95], [5.35, 45.05], [5.20, 45.10], [5.05, 45.15], [4.85, 45.25]];
  const MW = 372, MH = 390; const proj = (lon, lat) => [(lon - 4.70) * 0.705 * 300 + 6, (45.92 - lat) * 300 + 6];
  let mapCache = null, mapN = 0;
  function mapGeom() {
    if (mapCache) return mapCache;
    const pts = D.COMMUNES.map(c => { const g = GEO[c.name] || [45.2, 5.6]; return proj(g[1], g[0]); });
    const outline = OUTLINE.map(([lo, la]) => proj(lo, la));
    let cells = null;
    try { if (window.d3 && d3.Delaunay) { const v = d3.Delaunay.from(pts).voronoi([0, 0, MW, MH]); cells = pts.map((_, i) => v.renderCell(i)); } } catch (e) { cells = null; }
    mapCache = { pts, outline, cells, opath: 'M' + outline.map(p => p.map(n => n.toFixed(1)).join(',')).join('L') + 'Z' };
    return mapCache;
  }
  // opts: fill(com) -> couleur, hl: Set d'ids, me: id, label(com) -> texte, dim
  function isereMap(opts) {
    const g = mapGeom(); const id = 'clip' + (++mapN); const o = opts || {};
    let h = '<svg class="isere" viewBox="0 0 ' + MW + ' ' + MH + '" role="img" aria-label="Carte de l’Isère"><defs><clipPath id="' + id + '"><path d="' + g.opath + '"/></clipPath></defs><path d="' + g.opath + '" fill="#232833"/>';
    h += '<g clip-path="url(#' + id + ')">';
    D.COMMUNES.forEach((c, i) => {
      const f = o.fill ? o.fill(c) : null; const hl = !o.hl || o.hl.has(c.id);
      if (g.cells) h += '<path d="' + g.cells[i] + '" fill="' + (f || '#2b313c') + '" fill-opacity="' + (hl ? (f ? 0.9 : 1) : 0.22) + '" stroke="#101318" stroke-width="1.2"><title>' + esc(c.name + (o.title ? ' · ' + o.title(c) : '')) + '</title></path>';
      else { const [x, y] = g.pts[i]; h += '<circle cx="' + x + '" cy="' + y + '" r="' + (5 + Math.sqrt(c.pop) / 30) + '" fill="' + (f || '#2b313c') + '" fill-opacity="' + (hl ? 0.9 : 0.25) + '"><title>' + esc(c.name) + '</title></circle>'; }
    });
    h += '</g><path d="' + g.opath + '" fill="none" stroke="#8d95a2" stroke-width="1.4"/>';
    D.COMMUNES.forEach((c, i) => {
      const [x, y] = g.pts[i]; const me = o.me === c.id; const hl = !o.hl || o.hl.has(c.id);
      h += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (me ? 4.5 : 2.2) + '" fill="' + (me ? '#fff' : '#f1ebdc') + '" opacity="' + (hl ? 0.95 : 0.35) + '"' + (me ? ' stroke="#d9493b" stroke-width="2"' : '') + '/>';
      const lab = o.label ? o.label(c) : (c.pop > 30000 || me ? c.name : null);
      if (lab && hl) h += '<text x="' + (x + 6).toFixed(1) + '" y="' + (y + 3.5).toFixed(1) + '" class="ml' + (me ? ' me' : '') + '">' + esc(lab) + '</text>';
    });
    const vc = o.me && D.com(o.me); if (vc && vc.geo && !D.COMMUNES.includes(vc)) { const [x, y] = proj(vc.geo[1], vc.geo[0]); h += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4.5" fill="#fff" stroke="#d9493b" stroke-width="2"><title>' + esc(vc.name) + '</title></circle><text x="' + (x + 6).toFixed(1) + '" y="' + (y + 3.5).toFixed(1) + '" class="ml me">' + esc(vc.name) + '</text>'; }
    return h + '</svg>';
  }
  function legend(parties) { const u = [...new Set(parties.filter(Boolean))]; return '<div class="row" style="gap:5px;margin-top:8px">' + u.map(k => pill(k)).join('') + '</div>'; }
  const pjParty = () => P().party === 'NEW' ? 'DIV' : P().party;
  function mayorParty(c) { const p = P(); if (p.mairie && p.communeId === c.id) return pjParty(); const m = E.findPnj(x => x.role === 'maire' && x.territory === c.id); return m ? m.party : null; }
  function deputyParty(c) { const p = P(); if (p.circo === c.circo && p.mandats.some(m => m.type === 'depute')) return pjParty(); const d = E.findPnj(x => x.role === 'depute' && x.territory === 'c' + c.circo); return d ? d.party : null; }
  function mapCard() {
    const p = P(); const mode = UI.mapMode || 'maires';
    const f = mode === 'maires' ? mayorParty : deputyParty; const ps = D.COMMUNES.map(f);
    return '<div class="card"><h3>Isère <span class="muted">' + (mode === 'maires' ? 'Couleur politique des maires' : 'Députés par circonscription') + '</span></h3><div class="chips" style="padding-top:0">' + [['maires', 'Maires'], ['deputes', 'Députés']].map(([k, l]) => '<button class="' + (mode === k ? 'on' : '') + '" data-mapmode="' + k + '">' + l + '</button>').join('') + '</div>' +
      isereMap({ fill: c => { const k = f(c); return k ? pc(k) : null; }, me: p.communeId, title: c => { const k = f(c); return (k ? D.PARTIES[k].short : '—') + ' · ' + D.CIRCOS[c.circo - 1].name; } }) + legend(ps) + '</div>';
  }

  /* ---------- hémicycle ---------- */
  const ASM_ORDER = ['LFI', 'PCF', 'ECO', 'PS', 'DIV', 'REN', 'MODEM', 'HOR', 'LR', 'UDR', 'RN', 'REC'];
  const ASM_2024 = LF.ASM_2024;
  function hemicycle(seats) {
    const list = []; ASM_ORDER.concat(Object.keys(seats).filter(k => !ASM_ORDER.includes(k))).forEach(k => { for (let i = 0; i < (seats[k] || 0); i++) list.push(k); });
    const N = list.length; if (!N) return ''; const rows = 11, R0 = 58, R1 = 150, cx = 160, cy = 158;
    const radii = Array.from({ length: rows }, (_, i) => R0 + (R1 - R0) * i / (rows - 1)); const tot = radii.reduce((a, b) => a + b, 0);
    const cnt = radii.map(r => Math.round(N * r / tot)); cnt[rows - 1] += N - cnt.reduce((a, b) => a + b, 0);
    const pos = []; radii.forEach((r, i) => { const n = cnt[i]; for (let j = 0; j < n; j++) { const a = Math.PI - Math.PI * (n === 1 ? 0.5 : j / (n - 1)); pos.push({ a, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }); } });
    pos.sort((u, v) => v.a - u.a || 0);
    let h = '<svg class="hemi" viewBox="0 0 320 168" role="img" aria-label="Hémicycle de l’Assemblée nationale">';
    pos.forEach((q, i) => { h += '<circle cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="3.6" fill="' + pc(list[i]) + '"/>'; });
    h += '<text x="160" y="150" text-anchor="middle" class="hn">' + N + '</text><text x="160" y="164" text-anchor="middle" class="hs">sièges · majorité 289</text></svg>';
    return h;
  }
  function asmCard() {
    const n = S().national; const a = n.assembly || ASM_2024;
    return '<div class="card"><h3>Assemblée nationale <span class="muted">' + (n.assembly ? 'issue des dernières législatives' : 'composition de départ (2024, arrondie)') + '</span></h3>' + hemicycle(a) +
      '<div class="row" style="gap:5px;margin-top:6px">' + ASM_ORDER.filter(k => a[k]).map(k => pill(k, D.PARTIES[k].short + ' ' + a[k])).join('') + '</div><div class="muted small" style="margin-top:6px">Gouvernement : ' + n.gov.map(k => D.PARTIES[k].short).join(', ') + '</div></div>';
  }

  /* ---------- Terrain ---------- */
  function voicesCard(bare) {
    const v = S().voices; const tone = { pos: 'var(--good)', neu: 'var(--muted)', neg: 'var(--bad)' };
    return '<div class="card"><h3>La voix des électeurs <span class="muted">' + (v ? 'groupe du ' + E.fmtDate(v.date) : 'aucune étude') + '</span></h3>' +
      (v ? '<div class="stack" style="gap:8px">' + v.items.map(it => '<div class="vb"><div class="eyebrow" style="color:' + tone[it.mood] + '">' + esc(it.name) + ' · image ' + (it.im > 0 ? '+' : '') + it.im + '</div><div class="q2">« ' + esc(it.txt) + ' »</div></div>').join('') + '</div><p class="small" style="margin:10px 0 0"><b>Synthèse de l’institut :</b> ' + esc(v.sum) + '</p>' : '<p class="muted small" style="margin:0 0 8px">Un institut réunit des électeurs de chaque profil pour une soirée de discussion. Vous entendrez ce qu’ils disent vraiment de vous.</p>') +
      (bare ? '' : '<div class="qas" style="margin-top:10px">' + quick('focus') + '</div>') + '</div>';
  }
  function tTerrain() {
    const p = P(); const k = curKey(); let hl = null, scope = 'Votre commune';
    if (k && /^c\d+$/.test(k)) { const n = +k.slice(1); hl = new Set(D.COMMUNES.filter(c => c.circo === n).map(c => c.id)); scope = D.CIRCOS[n - 1].name; }
    else if (k && (k.startsWith('mun:') || k.startsWith('can:'))) { hl = new Set([k.slice(4)]); scope = E.commune().name; }
    let h = '<div class="grid"><div class="c5 card"><h3>Votre territoire <span class="muted">' + esc(scope) + '</span></h3>' + isereMap({ hl, me: p.communeId, fill: c => hl && hl.has(c.id) ? '#d9493b' : null, label: c => hl && hl.has(c.id) && (c.pop > 9000 || c.id === p.communeId) ? c.name : (c.pop > 60000 ? c.name : null) }) + '<div class="qas" style="margin-top:10px">' + ['porte', 'marche', 'phoning', 'meeting'].map(quick).join('') + '</div></div>';
    h += '<div class="c7">' + (fieldBlock().replace('margin-top:14px', 'margin-top:0') || '<div class="card"><h3>Terrain</h3><p class="muted">Pas d’élection en vue pour l’instant : visez une candidature pour découper votre territoire en secteurs.</p></div>') + '</div>';
    h += '<div class="c12">' + voicesCard() + '</div></div>';
    return h;
  }

  /* ---------- SMS ---------- */
  function convs() {
    const m = S().sms || []; const map = new Map();
    m.forEach(x => { const k = x.name; if (!map.has(k)) map.set(k, { name: k, party: x.party, role: x.role, msgs: [] }); map.get(k).msgs.push(x); });
    return [...map.values()];
  }
  function tSms() {
    const cs = convs();
    if (!cs.length) return '<div class="card"><h3>Téléphone</h3><p class="muted">Pas encore de messages. Votre numéro circulera à mesure que vous vous ferez connaître : militants, journalistes, adversaires, habitants.</p></div>';
    return '<div class="phone">' + cs.map(c => { const last = c.msgs[0]; const un = c.msgs.filter(x => !x.read).length; const todo = c.msgs.some(x => x.replies && x.answered == null);
      const prev = last.thread && last.thread.length ? last.thread[last.thread.length - 1] : null;
      return '<button class="conv' + (un ? ' un' : '') + (c.msgs.some(m => m.human) ? ' hum' : '') + '" data-thread="' + esc(c.name) + '">' + avatar(c.name, c.party) + '<span class="cb"><span class="cn"><b>' + esc(c.name) + '</b><span class="muted small">' + E.fmtDate(last.date, false) + '</span></span><span class="muted small cr">' + esc(c.role || '') + '</span><span class="cp">' + esc(prev ? (prev.me ? 'Vous : ' : '') + prev.t : (last.out ? 'Vous : ' : '') + last.text) + '</span></span>' + (un ? '<span class="badge">' + un + '</span>' : todo ? '<span class="chip red">À répondre</span>' : '') + '</button>'; }).join('') + '</div>';
  }
  function threadHTML(c) {
    let h = '<div class="th-h">' + avatar(c.name, c.party, true) + '<div><h2 style="margin:0">' + esc(c.name) + '</h2><div class="muted small">' + esc(c.role || '') + (c.party && D.PARTIES[c.party] ? ' · ' + esc(D.PARTIES[c.party].short) : '') + '</div></div></div><div class="th">';
    c.msgs.slice().reverse().forEach(m => {
      h += '<div class="daytag">' + E.fmtDate(m.date, false) + '</div><div class="bubble ' + (m.out ? 'me' : 'them') + '">' + esc(m.text) + '</div>';
      (m.thread || []).forEach(t => { h += '<div class="bubble ' + (t.me ? 'me' : 'them') + '">' + esc(t.t) + '</div>'; });
      if (m.replies && m.answered == null) h += '<div class="reps">' + m.replies.map((r, i) => '<button class="btn sm" data-rep="' + m.id + ':' + i + '">' + esc(r.l) + '</button>').join('') + '</div>';
    });
    const hu = c.msgs.find(m => m.human); return h + '</div>' + (hu ? '<div class="row" style="gap:6px;flex-wrap:nowrap;margin-top:8px"><input class="field" id="hrep" maxlength="600" placeholder="Répondre à ' + esc(c.name) + '…" style="flex:1"><button class="btn primary" data-hsend="' + esc(hu.human) + '">Envoyer</button></div>' : '') + '<div class="foot"><button class="btn' + (hu ? '' : ' primary') + '" data-ok>Fermer</button></div>';
  }
  function openThread(name) {
    const c = convs().find(x => x.name === name); if (!c) return; c.msgs.forEach(m => m.read = true);
    const { m, close } = modal(threadHTML(c), null, 'thread');
    const wire = () => {
      m.querySelector('[data-ok]').onclick = () => { close(); render(); };
      const hs = m.querySelector('[data-hsend]'); if (hs) hs.onclick = async () => { const inp = m.querySelector('#hrep'); const t = inp.value.trim(); if (!t) return; hs.disabled = true; if (await MP.send(hs.dataset.hsend, 'msg', t)) { pushOut(hs.dataset.hsend, t); const c2 = convs().find(x => x.name === name); m.innerHTML = threadHTML(c2); wire(); const th = m.querySelector('.th'); th.scrollTop = th.scrollHeight; } else { toast('Envoi impossible.'); hs.disabled = false; } };
      m.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => { const [id, i] = b.dataset.rep.split(':'); const before = X.snap(); const res = LF.reply(id, +i); const act = S()._act; S()._act = null; if (act) { close(); toast(res); runSmsAct(act); return; } const c2 = convs().find(x => x.name === name); m.innerHTML = threadHTML(c2); wire(); const th = m.querySelector('.th'); th.scrollTop = th.scrollHeight; E.estimate(); const ds = X.deltas(before, X.snap()); toast(res + (ds.length ? ' ' + ds.map(d => d.l + ' ' + d.t).join(', ') : '')); });
    };
    wire(); const th = m.querySelector('.th'); th.scrollTop = th.scrollHeight;
  }

  /* ---------- Pouvoir ---------- */
  function mairieCard() {
    const p = P(); if (!p.mairie) return ''; const m = p.mairie; const com = E.commune(); const used = m.projets.filter(x => x.date.slice(0, 4) === S().date.slice(0, 4)).reduce((a, x) => a + x.cost, 0);
    const gr = (m.grands || []);
    return '<div class="card"><h3>Mairie de ' + esc(com.name) + '</h3><div class="kpis">' + kpi('Fonctionnement', E.eur(m.budget)) + kpi('Investissement ' + S().date.slice(0, 4), E.eur(m.invest - used), (m.invest - used) / m.invest * 100) + kpi('Dette', E.eur(m.dette)) + kpi('Taxe foncière', m.tf + ' %') + kpi('Cohésion de la majorité', r0(m.cohesion ?? 70) + ' %', m.cohesion ?? 70, (m.cohesion ?? 70) < 40 ? 'var(--bad)' : 'var(--good)') + '</div>' +
      '<div class="row" style="margin-top:10px"><button class="btn sm" data-tf="-1">Baisser la taxe foncière</button><button class="btn sm" data-tf="1">Augmenter la taxe foncière</button><button class="btn sm" id="emprunt">Emprunter</button></div>' +
      '<div class="sep"></div><div class="eyebrow">Grands projets</div>' + (gr.length ? gr.slice().reverse().map(g => '<div class="proj"><div class="row" style="justify-content:space-between"><b>' + esc(g.l) + '</b><span class="muted small num">' + (g.done ? 'inauguré ' + E.fmtDate(g.end, true) : r0(Math.min(99, g.prog)) + ' %') + '</span></div>' + (g.done ? '' : gauge(g.prog, 'var(--accent)')) + '<div class="muted small">' + E.eur(g.cost + (g.overrun || 0)) + (g.delay ? ' · ' + g.delay + ' mois de retard' : '') + (g.overrun ? ' · surcoût ' + E.eur(g.overrun) : '') + '</div></div>').join('') : '<p class="muted small" style="margin:4px 0">Aucun chantier. Un grand projet dure des mois : retards et recours possibles, mais l’inauguration marque un mandat.</p>') +
      '<div class="qas" style="margin-top:8px">' + quick('grand') + '</div>' +
      (m.projets.filter(x => x.real || !['of', 'ao', 'emp'].includes(x.id)).length ? '<div class="sep"></div><div class="eyebrow">Dépenses et réalisations de l’année</div>' + m.projets.filter(x => x.real || !['of', 'ao', 'emp'].includes(x.id)).slice(-6).map(x => '<div class="small">' + esc(x.l) + ' <span class="muted">· ' + E.eur(x.cost) + ' · ' + E.fmtDate(x.date, true) + '</span></div>').join('') : '') + '</div>';
  }
  function deputeCard() {
    const p = P(); if (!p.mandats.some(m => m.type === 'depute')) return ''; const d = p.depute || {};
    return '<div class="card"><h3>Député·e de la ' + esc(D.CIRCOS[p.circo - 1].name) + '</h3><div class="kpis">' + kpi('Commission', '<span class="kt">' + (d.com ? esc(LF.COMMISSIONS[d.com][0]) : 'aucune') + '</span>') + kpi('Rapport', d.rapport ? r0(Math.min(99, d.rapport.prog)) + ' %' : 'aucun', d.rapport ? d.rapport.prog : null, 'var(--accent)', d.rapport ? esc(d.rapport.l) : '') + kpi('Notoriété nationale', r0(p.noto.nat), p.noto.nat) + '</div><div class="qas" style="margin-top:10px">' + ['commission', 'rapport', 'qag', 'amend', 'circo'].map(quick).join('') + '</div></div>';
  }
  function presCard() {
    if (!LF.isPres()) return ''; const s = S(), p = P(); const pr = p.pres || { reformes: [] }; const mj = LF.majorite(); const pm = pr.pm ? s.pnj[pr.pm] : null;
    return '<div class="card pres"><h3>Présidence de la République</h3><div class="kpis">' + kpi('Popularité', r0(s.national.approval) + ' %', s.national.approval, s.national.approval < 30 ? 'var(--bad)' : 'var(--good)') + kpi('Majorité', mj.seats + ' sièges', mj.seats / 577 * 100, mj.seats >= 289 ? 'var(--good)' : 'var(--warn)', mj.seats >= 289 ? 'absolue' : 'relative : chaque vote est un combat') + kpi('Matignon', '<span class="kt">' + (pm ? esc(pm.name) : 'vacant') + '</span>', null, null, pm ? esc(D.PARTIES[pm.party].short) : '') + '</div>' +
      '<div class="eyebrow" style="margin-top:10px">Réformes</div>' + ((pr.reformes || []).length ? pr.reformes.slice().reverse().slice(0, 8).map(x => '<div class="small">' + (x.mode === '493' ? '<span class="chip red">49.3</span> ' : '') + esc(x.l) + ' <span class="muted">· ' + E.fmtDate(x.date, true) + '</span></div>').join('') : '<p class="muted small" style="margin:4px 0">Aucune réforme engagée.</p>') +
      '<div class="qas" style="margin-top:10px">' + ['reforme', 'remaniement', 'referendum', 'dissoudre'].map(quick).join('') + '</div></div>';
  }
  function tPouvoir() {
    const p = P(); const cards = [presCard(), mairieCard(), deputeCard()].filter(Boolean);
    let h = '<div class="card"><h3>Vos mandats</h3>' + (p.mandats.length ? '<div class="row" style="gap:6px">' + p.mandats.map(m => '<span class="chip">' + esc(m.label) + '</span>').join('') + '</div>' : '<p class="muted" style="margin:0">Aucun mandat. Gagnez une élection : vous pourrez alors voter le budget, lancer des chantiers, déposer des lois… et être jugé·e sur vos actes.</p>') + '</div>';
    if (!cards.length && p.mandats.length) cards.push('<div class="card"><h3>Mandat d’opposition</h3><p class="muted small" style="margin:0 0 8px">Interpellez la majorité, tenez des permanences : votre bilan, ce sont vos combats.</p><div class="qas">' + ['conseil', 'permanence', 'circo'].map(quick).join('') + '</div></div>');
    return '<div class="stack">' + h + cards.join('') + asmCard() + '</div>';
  }

  /* ---------- flux du pouvoir ---------- */
  const CANCEL = { l: 'Annuler', v: null };
  const topSegs = seg => Object.entries(seg).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => D.SEGS.find(x => x.id === g).name.toLowerCase()).join(' et ');
  function reformeFlow() {
    const levs = L.LEVERS.filter(l => l.lvl === 'national'); const mj = LF.majorite();
    return new Promise(res => modal('<h2>Engager une réforme</h2><p class="muted small">Votre majorité : <b>' + mj.seats + ' sièges</b> sur 577' + (mj.seats >= 289 ? ' (absolue).' : ' : sans majorité absolue, le texte peut être rejeté. Le 49.3 passe en force, au risque d’une motion de censure.') + '</p>' +
      '<label class="f">Levier<select class="field" id="rf-l">' + levs.map((l, i) => '<option value="' + i + '">' + esc(L.ltpl(l)) + '</option>').join('') + '</select></label><div style="margin-top:12px"><div id="rf-t" style="font:600 17px/1.3 var(--f-display)"></div><input type="range" id="rf-v" style="width:100%;margin-top:8px"></div>' +
      '<div class="foot"><button class="btn ghost" data-x>Annuler</button><button class="btn" data-m="493">Passer par le 49.3</button><button class="btn primary" data-m="normal">Soumettre au vote</button></div>', (m, close) => {
        const sl = m.querySelector('#rf-l'), rv = m.querySelector('#rf-v'), t = m.querySelector('#rf-t');
        const setL = () => { const l = levs[+sl.value]; rv.min = l.min; rv.max = l.max; rv.step = l.step; rv.value = l.def; upd(); };
        const upd = () => { const l = levs[+sl.value]; t.textContent = typeof l.l === 'function' ? l.l(+rv.value) : l.l.replace('{v}', (+rv.value).toLocaleString('fr-FR')); };
        sl.onchange = setL; rv.oninput = upd; setL();
        m.querySelector('[data-x]').onclick = () => { close(); res(null); };
        m.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { close(); res({ lev: levs[+sl.value].id, v: +rv.value, mode: b.dataset.m }); });
      }));
  }
  async function voicesModal() { const v = S().voices; if (!v) return; await info('La voix des électeurs', voicesCard(true).replace('<div class="card">', '<div>'), 'Merci'); }

  /* ---------- soirée électorale ---------- */
  function clockStage(label) {
    return new Promise(res => {
      const { m, close } = modal('<div class="night"><div class="eyebrow">Soirée électorale · ' + esc(label) + '</div><div class="clock num" id="clk">19:59:52</div><p class="muted">Les derniers bureaux de vote ferment. Les instituts s’apprêtent à donner leurs estimations.</p><p class="muted small">Touchez pour passer.</p></div>', null, 'nightm');
      let t = 52; const fin = () => { clearInterval(iv); const c = m.querySelector('#clk'); c.textContent = '20:00:00'; c.classList.add('go'); setTimeout(() => { close(); res(); }, 650); };
      const iv = setInterval(() => { t++; if (t >= 60) fin(); else m.querySelector('#clk').textContent = '19:59:' + t; }, 170);
      m.onclick = () => { if (t < 60) { t = 60; fin(); } };
    });
  }
  function raceLeader(r) { const x = r.r2 || r; return x.rows && x.rows[0]; }
  function nightMap(el, sn) {
    if (!el || !el.races) return '';
    if (el.type === 'leg') {
      const col = {}; for (const k in el.races) { const r = el.races[k]; const w = r.winner ? (r.r2 || r).rows.find(x => x.id === r.winner) : raceLeader(r); if (w) col[k] = w; }
      const hl = /^c\d+$/.test(sn.key) ? new Set(D.COMMUNES.filter(c => 'c' + c.circo === sn.key).map(c => c.id)) : null;
      return '<div class="eyebrow" style="margin-top:12px">Les 10 circonscriptions · en tête ou élu·e</div>' + isereMap({ fill: c => col['c' + c.circo] ? col['c' + c.circo].color : null, me: P().communeId, title: c => { const w = col['c' + c.circo]; return w ? (w.pj ? 'Vous' : w.name) + ' (' + w.label + ')' : ''; } }) + (hl ? '' : '');
    }
    if (el.type === 'mun') {
      const col = {}; for (const k in el.races) { const w = raceLeader(el.races[k]); if (w) col[k.slice(4)] = w; }
      return '<div class="eyebrow" style="margin-top:12px">Les 32 communes suivies · liste en tête</div>' + isereMap({ fill: c => col[c.id] ? col[c.id].color : null, me: P().communeId, title: c => { const w = col[c.id]; return w ? (w.pj ? 'Votre liste' : w.name) + ' (' + w.label + ')' : ''; } });
    }
    return '';
  }
  function breakdownHTML(q, sn) {
    if (!/^c\d+$/.test(sn.key)) return ''; let b = null; try { b = LF.breakdown(q.el, sn.key); } catch (e) { b = null; } if (!b || !b.length) return '';
    return '<details class="bd"><summary>Résultats commune par commune</summary><div class="list">' + b.map(c => { const pj = c.rows.find(x => x.pj); return '<div class="li"><div class="grow"><b>' + esc(c.name) + '</b><div class="small">' + c.rows.map(x => '<span style="color:' + (x.pj ? 'var(--paper)' : 'var(--muted)') + '">' + esc(x.pj ? 'Vous' : x.name.split(' ').slice(-1)[0]) + ' ' + E.pct(x.pct) + '</span>').join(' · ') + '</div></div>' + (pj ? '<span class="num">' + E.pct(pj.pct) + '</span>' : '') + '</div>'; }).join('') + '</div></details>';
  }
  async function showResults(q) {
    const s = S(); const r = s.results.find(x => x.el === q.el && x.round === q.round); if (!r || !r.snapshot.length) return;
    const sn = r.snapshot[0]; const el = s.elections.find(e => e.id === q.el); const winner = sn.winner ? sn.rows.find(x => x.id === sn.winner) : null; const pjRow = sn.rows.find(x => x.pj);
    await clockStage(r.label);
    let h = '<div class="night2"><div class="eyebrow">' + (q.round === 1 ? 'Premier tour' : 'Second tour') + ' · ' + esc(sn.name) + '</div><div class="row" style="justify-content:space-between;margin:4px 0 8px"><span class="muted small">Estimation 20 h 00</span><span class="small">Participation <b class="num">' + E.pct(sn.participation) + '</b></span></div>' + bars(sn.rows.slice(0, 8), Math.max(...sn.rows.map(x => x.pct)) * 1.1);
    const prop = el && E.LIST_T.includes(el.type) && el.type !== 'reg' || (el && el.type === 'reg' && !sn.t2);
    if (winner && prop) h += '<p class="verdict">' + (winner.pj ? 'Votre liste arrive en tête.' : esc(winner.name) + ' (' + esc(winner.label) + ') arrive en tête.') + ' Les sièges sont répartis à la proportionnelle' + (el.type === 'reg' ? ', avec une prime de 25 % pour la liste arrivée en tête' : '') + '.</p>';
    else if (winner) h += '<p class="verdict ' + (winner.pj ? 'win' : pjRow ? 'lose' : '') + '">' + (winner.pj ? 'Vous l’emportez.' : esc(winner.name) + ' (' + esc(winner.label) + ') l’emporte.') + '</p>';
    else if (sn.t2) h += '<p class="verdict' + (pjRow && sn.t2.includes(pjRow.id) ? ' win' : pjRow ? ' lose' : '') + '">Qualifié·e·s pour le second tour : ' + sn.t2.map(id => { const x = sn.rows.find(y => y.id === id); return x ? (x.pj ? 'vous' : esc(x.name)) : ''; }).join(', ') + '.</p>';
    if (sn.seats) h += '<div class="eyebrow" style="margin-top:10px">Sièges</div><div class="row" style="margin-top:6px">' + Object.entries(sn.seats).filter(([, v]) => v > 0).map(([id, v]) => { const x = sn.rows.find(y => y.id === id); return '<span class="chip">' + esc(x ? (x.pj ? 'Votre liste' : x.name) : id) + ' <b class="num">' + v + '</b></span>'; }).join('') + '</div>';
    if (el && el.type === 'leg' && el.status === 'fini') { const cnt = {}; for (const k in el.races) { const w = el.races[k].winner; const row = (el.races[k].r2 || el.races[k]).rows.find(x => x.id === w); if (row) cnt[row.label] = (cnt[row.label] || 0) + 1; } h += '<div class="row" style="margin-top:8px">' + Object.entries(cnt).map(([k, v]) => '<span class="chip">' + esc(k) + ' <b class="num">' + v + '</b></span>').join('') + '</div>'; if (s.national.assembly) h += '<div class="eyebrow" style="margin-top:12px">Nouvelle Assemblée nationale</div>' + hemicycle(s.national.assembly); }
    h += nightMap(el, sn) + breakdownHTML(q, sn) + '</div>';
    await new Promise(res => modal('<h2>Soirée électorale · ' + esc(r.label) + '</h2>' + h + '<div class="foot"><button class="btn primary" data-ok>Continuer</button></div>', (m, close) => {
      const is = [...m.querySelectorAll('.bars .track i')]; const w = is.map(i => i.style.width); is.forEach(i => { i.style.transition = 'none'; i.style.width = '0%'; });
      void m.offsetWidth; requestAnimationFrame(() => is.forEach((i, k) => { i.style.transition = 'width 1.5s cubic-bezier(.2,.8,.2,1) ' + (k * 0.08) + 's'; i.style.width = w[k]; }));
      m.querySelector('[data-ok]').onclick = () => { close(); res(); };
    }));
    if (!pjRow) return;
    const won = winner && winner.pj; const qualified = !winner && sn.t2 && sn.t2.includes(pjRow.id); const out = !won && !qualified;
    const p = P(); const rivals = (s.rivals || []).map(id => s.pnj[id]).filter(Boolean); const before = X.snap();
    const opts = won ? [{ l: 'Rassembler : « Je serai l’élu·e de toutes et tous »', sub: 'Image auprès de tous, apaisement avec vos adversaires', v: 'ras' }, { l: 'Savourer : « Ils nous disaient battus d’avance »', sub: 'Galvanise vos troupes, braque vos adversaires', v: 'sav' }, { l: 'Humble : remercier électeurs et militants', sub: 'Crédibilité', v: 'hum' }]
      : qualified ? [{ l: 'Appeler au rassemblement au-delà de votre camp', sub: 'Image et reports de voix', v: 'ras' }, { l: 'Mobiliser : « Rien n’est joué, tous dans la rue dès demain »', sub: 'Militants et campagne', v: 'sav' }, { l: 'Attaquer frontalement votre adversaire', sub: 'Polarise : votre camp adore, les autres moins', v: 'atk' }]
      : [{ l: 'Digne : féliciter le vainqueur', sub: 'Crédibilité et image, pour la suite', v: 'hum' }, { l: 'Combatif : « Le combat continue »', sub: 'Militants et poids au parti', v: 'sav' }, { l: 'Amer : dénoncer une campagne indigne', sub: 'Votre noyau dur apprécie, les autres beaucoup moins', v: 'atk' }];
    const v = await choice(won ? 'Votre discours de victoire' : qualified ? 'Votre discours du soir' : 'Votre discours de défaite', '<p class="muted">Les caméras sont braquées sur vous. Que dites-vous ?</p>', opts);
    if (v === 'ras') { E.addImageAll(won ? 1.5 : 1); rivals.forEach(x => x.rel = E.clamp(x.rel + 6, -100, 100)); }
    if (v === 'sav') { p.militants += Math.max(1, Math.round(p.militants * 0.08)); E.addStd(1.5); if (won) rivals.forEach(x => x.rel = E.clamp(x.rel - 8, -100, 100)); }
    if (v === 'hum') { p.cred = E.clamp(p.cred + (won ? 2 : 3), 0, 100); if (!won) E.addImageAll(0.8); }
    if (v === 'atk') { E.addImageAll(-0.8); p.militants += 1; rivals.forEach(x => x.rel = E.clamp(x.rel - 10, -100, 100)); }
    E.article('dauph', won ? p.name + ' : « ' + (v === 'ras' ? 'Je serai l’élu·e de toutes et tous' : v === 'sav' ? 'Ils nous disaient battus d’avance' : 'Merci à chacune et chacun' ) + ' »' : qualified ? 'Second tour : ' + p.name + ' ' + (v === 'atk' ? 'charge son adversaire' : 'appelle à la mobilisation') : 'Défaite : ' + p.name + (v === 'hum' ? ' salue son adversaire' : v === 'sav' ? ' promet de revenir' : ' dénonce une campagne indigne'), v === 'atk' ? -0.2 : 0.2, 'pj');
    if (!qualified && el) LF.electionSms(!!won, el);
    E.estimate(); await info('Réactions', '<p>' + (won ? 'Les félicitations affluent.' : qualified ? 'La campagne repart dès demain matin.' : 'La soirée est longue. Vos proches vous écrivent.') + '</p>' + chipsHTML(X.deltas(before, X.snap())) + (LF.unread() ? '<p class="small" style="margin-top:10px">' + ico('msg') + ' ' + LF.unread() + ' nouveau(x) SMS dans Messages.</p>' : ''));
  }

  /* ---------- Messages : presse & X ---------- */
  function tPresse() {
    const s = S();
    return '<div class="card"><h3>Revue de presse</h3><div class="list">' + s.news.slice(0, 30).map(n => '<div class="li"><div class="grow"><div class="eyebrow" style="color:' + (n.about === 'pj' ? 'var(--accent)' : 'var(--muted)') + '">' + esc(n.media) + ' · ' + E.fmtDate(n.date) + '</div><div style="font:600 16px/1.3 var(--f-display)">' + esc(n.title) + '</div>' + (n.body ? '<div class="muted" style="font-size:13.5px;margin-top:2px">' + esc(n.body) + '</div>' : '') + '</div></div>').join('') + '</div></div>' +
      '<div class="card" style="margin-top:14px"><h3>Actualité réelle</h3><p class="muted" style="font-size:13px;margin:0 0 8px">Collez un titre ou un résumé d’article réel : il est transposé en événement de jeu, sans personnalité réelle.</p><button class="btn sm" id="inject">Injecter une actualité</button></div>';
  }
  function tX() {
    const s = S();
    return '<div class="card"><h3>X <span class="muted">' + s.trends.map(esc).join(' ') + '</span></h3><div class="row"><button class="btn sm primary" data-act="post">Publier · 1 h</button></div><div style="margin-top:8px">' + s.posts.slice(0, 30).map(t => '<div class="tweet ' + (t.pj ? 'me' : '') + '"><div class="row" style="gap:8px;align-items:flex-start;flex-wrap:nowrap">' + avatar(t.author, t.pj ? pjParty() : null) + '<div style="min-width:0"><div class="h"><b>' + esc(t.author) + '</b> ' + esc(t.handle) + ' · ' + E.fmtDate(t.date, false) + '</div><div>' + esc(t.text) + '</div><div class="h num">♥ ' + t.likes + ' · ⟲ ' + t.rt + '</div></div></div></div>').join('') + '</div></div>';
  }

  /* ---------- rendu ---------- */
  function render() { if (UI.screen === 'game' && G.S) { renderGame(); autoSave(); } else if (UI.screen === 'wiz') renderWiz(); else renderHome(); }
  // Sauvegarde automatique après chaque action (hors fenêtres en cours), pour ne rien perdre en fermant l'appli
  function autoSave() { clearTimeout(UI.svT); UI.svT = setTimeout(function tick() { if (UI.screen !== 'game' || !G.S) return; if (document.querySelector('.ov')) { UI.svT = setTimeout(tick, 3000); return; } Store.save(); }, 2500); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && UI.screen === 'game' && G.S && !document.querySelector('.ov')) { try { localStorage.setItem(Store.lsKey(Store.slot()), X.serialize()); } catch (e) { } Store.save(); } });
  function vv() { const v = window.visualViewport; if (!v) return; const r = document.documentElement.style; r.setProperty('--vvh', v.height + 'px'); r.setProperty('--vvt', v.offsetTop + 'px'); }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', vv); window.visualViewport.addEventListener('scroll', vv); vv(); }
  document.addEventListener('focusin', e => { if (e.target.closest && e.target.closest('.modal') && /TEXTAREA|INPUT/.test(e.target.tagName)) setTimeout(() => e.target.scrollIntoView({ block: 'nearest' }), 250); });
  function start(data) {
    if (data && data.S) { G.S = data.S; UI.screen = data.screen || 'game'; UI.tab = data.tab || 'bureau'; if (LEGACY[UI.tab]) { UI.sub[LEGACY[UI.tab][0]] = LEGACY[UI.tab][1]; UI.tab = LEGACY[UI.tab][0]; } if (data.sub) Object.assign(UI.sub, data.sub); }
    try { window.claude?.hot?.snapshot(() => ({ S: G.S, screen: UI.screen === 'wiz' ? 'home' : UI.screen, tab: UI.tab, sub: UI.sub })); } catch (e) { }
    A.init(); A.onState(() => { if (UI.screen === 'game' && !document.querySelector('.ov')) render(); });
    render(); Store.init();
  }
  window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
