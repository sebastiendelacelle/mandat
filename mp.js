/* Mandat — multijoueur asynchrone entre amis
   Chaque joueur fait vivre sa propre copie du monde (même graine) ; les autres joueurs y apparaissent
   comme personnages « humains » à partir de ce qu'ils publient. Les scrutins où plusieurs joueurs
   s'affrontent sont des rendez-vous : on attend que tous y soient, le résultat est calculé une fois
   et partagé. */
const MP = (() => {
  let db = null, me = null, user = null, writable = null;
  const pubs = {}; const cache = {}; let game = null; let unsubs = []; let onChange = () => { };
  const S = () => G.S;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const on = () => !!(db && me && G.S && G.S.mp);
  const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = () => Array.from({ length: 6 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join('');
  const resPath = (gid, elId, round, key) => 'mpres/' + gid + '~' + elId + '~' + round + '~' + key.replace(/[^A-Za-z0-9_\-.~:@+]/g, '_');
  const dget = d => d && d.exists ? (typeof d.data === 'function' ? d.data() : d.data) : null;

  function init(dbx, uid, userx) { db = dbx; me = uid; user = userx; }
  function available() { return !!(db && me); }
  async function canWrite() { if (writable != null) return writable; try { const c = user && user.can ? await user.can('data.write') : null; writable = c; } catch (e) { writable = null; } return writable; }
  function setOnChange(f) { onChange = f; }

  /* ---- index des parties de l'utilisateur ---- */
  const idxRef = () => db.collection('data/users/' + me).doc('mpindex');
  async function myGames() { if (!available()) return []; try { const d = dget(await idxRef().get()); return (d && d.games) || []; } catch (e) { return []; } }
  async function addIndex(gid, name) { const L = await myGames(); if (!L.some(g => g.gid === gid)) L.unshift({ gid, name, at: Date.now() }); await idxRef().set({ games: L.slice(0, 20) }); }

  /* ---- création / adhésion ---- */
  async function create(name) {
    const gid = code(); const seed = 1 + Math.floor(Math.random() * 2e9);
    await db.doc('mpgames/' + gid).set({ v: 1, name: String(name).slice(0, 60), seed, host: me, members: [me], created: Date.now() });
    await addIndex(gid, name); return { gid, seed, name };
  }
  async function find(gid) { try { return dget(await db.doc('mpgames/' + gid).get()); } catch (e) { return null; } }
  async function join(gid) {
    const ref = db.doc('mpgames/' + gid);
    for (let i = 0; i < 6; i++) {
      const l = await ref.acquire({ holder: me, ttlMs: 8000 });
      if (l.acquired) { const g = dget(await ref.get()); if (!g) return null; const m = (g.members || []).slice(); if (!m.includes(me)) { if (m.length >= 8) throw new Error('full'); m.push(me); await ref.update({ members: m }); } await addIndex(gid, g.name); return Object.assign({}, g, { gid, members: m }); }
      await sleep(1200);
    }
    throw new Error('busy');
  }

  /* ---- publication de son propre état ---- */
  function pubOf() {
    const s = S(), p = s.p; let prof = null;
    if (p.cand && p.cand.mode !== 'colistier' && !E.LIST_T.includes((s.elections.find(e => e.id === p.cand.el) || {}).type)) { try { prof = JSON.parse(JSON.stringify(E.pjCand())); delete prof.pj; } catch (e) { prof = null; } }
    return {
      game: s.mp.gid, name: p.name, g: p.g, party: p.party, movement: p.movement || null, communeId: p.communeId, circo: p.circo, rank: p.rank, date: s.date, half: s.half || 0,
      noto: { commune: Math.round(p.noto.commune), circo: Math.round(p.noto.circo), dept: Math.round(p.noto.dept), nat: Math.round(p.noto.nat) }, pop: Math.round(E.popularity()), cred: Math.round(p.cred), ax: p.ax,
      mandats: p.mandats.map(m => ({ type: m.type, label: m.label })), cand: p.cand ? { el: p.cand.el, key: p.cand.key, mode: p.cand.mode, invested: !!p.cand.invested, label: p.cand.label } : null, prof,
      wait: s.mp.wait || null, endorse: s.mp.endorse || null, withdraw: s.mp.withdraw || null, est: s.est ? { el: s.est.el, pct: Math.round(s.est.pct * 10) / 10, rank: s.est.rank } : null,
      headlines: s.news.filter(n => n.about === 'pj').slice(0, 3).map(n => ({ t: n.title, d: n.date, m: n.media })), at: Date.now()
    };
  }
  let pubBusy = false, pubAgain = false;
  async function publish() {
    if (!on()) return; if (pubBusy) { pubAgain = true; return; } pubBusy = true;
    try { await db.doc('mp/' + me + '/g/' + S().mp.gid).set(pubOf()); } catch (e) { }
    pubBusy = false; if (pubAgain) { pubAgain = false; publish(); }
  }

  /* ---- entrer dans une partie : abonnements ---- */
  function leave() { unsubs.forEach(u => { try { u(); } catch (e) { } }); unsubs = []; game = null; for (const k in pubs) delete pubs[k]; }
  function enter() {
    leave(); if (!on()) return; const gid = S().mp.gid; const subd = new Set();
    const subPlayer = uid => { if (subd.has(uid) || uid === me) return; subd.add(uid); unsubs.push(db.doc('mp/' + uid + '/g/' + gid).onSnapshot(d => { const v = dget(d); if (v) { pubs[uid] = v; applyPubs(); onChange('pub'); } }, () => { })); };
    unsubs.push(db.doc('mpgames/' + gid).onSnapshot(d => { const g = dget(d); if (!g) return; game = Object.assign({ gid }, g); (g.members || []).forEach(subPlayer); onChange('game'); }, () => { }));
    unsubs.push(db.collection('mpmsg').where('game', '==', gid).where('to', '==', me).onSnapshot(q => { q.docs.forEach(d => inbound(d.id, dget(d))); }, () => { }));
    publish();
  }

  /* ---- miroirs : les autres joueurs dans mon monde ---- */
  function mirrorId(uid) { return 'H_' + uid; }
  function applyPubs() {
    const s = S(); if (!s || !s.mp) return;
    for (const uid in pubs) {
      const h = pubs[uid]; const id = mirrorId(uid); const party = h.party === 'NEW' ? 'DIV' : h.party;
      let x = s.pnj[id];
      if (!x) { x = E.mkPnj({ id, name: h.name, g: h.g, party, ax: h.ax, role: 'candidat', territory: h.communeId, noto: h.noto.commune }); x.rel = 0; }
      const prevM = x._m || []; const nowM = (h.mandats || []).map(m => m.label);
      Object.assign(x, { human: true, uid, name: h.name, g: h.g, party, ax: h.ax, alive: true, known: true, noto: Math.max(h.noto.commune, h.noto.circo, h.noto.nat), img: Math.max(-40, Math.min(40, h.pop || 0)), movement: h.movement });
      const ty = (h.mandats || []).map(m => m.type);
      if (ty.includes('president')) { x.role = 'leader'; x.territory = 'nat'; } else if (ty.includes('depute')) { x.role = 'depute'; x.territory = 'c' + h.circo; } else if (ty.includes('maire')) { x.role = 'maire'; x.territory = h.communeId; } else { x.role = 'candidat'; x.territory = h.cand ? (h.cand.key.startsWith('mun:') ? h.cand.key.slice(4) : h.cand.key) : h.communeId; }
      x.mandat = nowM.length ? nowM.join(' · ') : h.rank + (h.party === 'NEW' ? ' · ' + (h.movement || 'mouvement') : '');
      if (x._m) nowM.filter(l => !prevM.includes(l)).forEach(l => { E.article('dauph', h.name + ' : ' + l, 0, null); E.log('Votre ami·e ' + h.name + ' devient ' + l + '.', 'info'); });
      x._m = nowM;
    }
  }
  function players() { return Object.entries(pubs).map(([uid, h]) => Object.assign({ uid }, h)); }
  function inject(el, key, cands) {
    if (!on()) return;
    for (const uid in pubs) {
      if (uid === me) continue; const h = pubs[uid]; if (!h.cand || h.cand.el !== el.id || h.cand.key !== key || h.cand.mode === 'colistier' || !h.prof) continue;
      const id = mirrorId(uid); if (cands.some(c => c.id === id)) continue; if (!S().pnj[id]) applyPubs();
      const c = Object.assign({}, h.prof, { id, pj: false, human: true, name: h.name });
      if (h.cand.invested && h.cand.label !== 'DIV') { const i = cands.findIndex(x => !x.pj && !x.human && x.bucket && x.bucket.includes(h.cand.label)); if (i >= 0) { c.bucket = cands[i].bucket; cands.splice(i, 1, c); continue; } }
      cands.push(c);
    }
  }
  function freshCand(c) { const uid = c.id.slice(2); const h = pubs[uid]; const o = h && h.prof ? Object.assign({}, h.prof, { id: c.id, pj: false, human: true, name: h.name, bucket: c.bucket }) : Object.assign({}, c); o.mom = (o.mom || 0) + endorseBonus(uid); return o; }
  function endorseBonus(uid) { const s = S(); if (!s || !s.mp) return 0; const all = Object.entries(pubs).filter(([u]) => u !== me).map(([, h]) => h).concat([{ endorse: s.mp.endorse }]); return all.filter(h => h.endorse && h.endorse.uid === uid).length * 0.06; }
  function withdrawn(elId, key) { const out = new Set(); const s = S(); if (s.mp && s.mp.withdraw && s.mp.withdraw.el === elId && s.mp.withdraw.key === key) out.add('PJ'); for (const u in pubs) { const w = pubs[u].withdraw; if (w && w.el === elId && w.key === key) out.add(mirrorId(u)); } return out; }
  function setEndorse(elId, key, uid) { S().mp.endorse = { el: elId, key, uid }; publish(); }
  function setWithdraw(elId, key, uid) { S().mp.withdraw = { el: elId, key, for: uid }; publish(); }
  function waitingForMe() { const s = S(), p = s.p; if (!p.cand) return []; return Object.entries(pubs).filter(([u, h]) => u !== me && h.wait && h.cand && h.cand.el === p.cand.el && h.cand.key === p.cand.key).map(([, h]) => h); }

  /* ---- débats entre joueurs (asynchrones) ---- */
  async function createDuel(toUid, beats, ans) {
    const s = S(); const id = s.mp.gid + '~' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    const st = { cred: s.p.cred, mt: s.p.mediaTraining || 0, sf: s.p.traits.sangfroid ?? 50 };
    await db.doc('mpdeb/' + id).set({ game: s.mp.gid, a: me, b: toUid, nameA: s.p.name, beats, ansA: ans, stA: st, status: 'waitB', at: Date.now() });
    await send(toUid, 'duel', id); return id;
  }
  async function getDuel(id) { try { return dget(await db.doc('mpdeb/' + id).get()); } catch (e) { return null; } }
  async function finishDuel(id, d, ansB, res) { const s = S(); await db.doc('mpdeb/' + id).update({ ansB, stB: { cred: s.p.cred, mt: s.p.mediaTraining || 0, sf: s.p.traits.sangfroid ?? 50 }, nameB: s.p.name, status: 'done', res }); await send(d.a, 'duelres', id, { scoreA: res.scoreA, nameB: s.p.name, best: res.bestA || null }); }

  /* ---- rendez-vous électoraux ---- */
  function shared(elId, round, key) { if (!on()) return null; return cache[S().mp.gid + '|' + elId + '|' + round + '|' + key] || null; }
  async function refreshPubs() { delete pubs[me]; const g = game && game.members ? game.members : []; await Promise.all(g.filter(u => u !== me).map(async u => { try { const v = dget(await db.doc('mp/' + u + '/g/' + S().mp.gid).get()); if (v) pubs[u] = v; } catch (e) { } })); applyPubs(); }
  async function gate() {
    if (!on()) return null; const s = S(), p = s.p; const gid = s.mp.gid;
    if (!game) { const g = await find(gid); if (g) game = Object.assign({ gid }, g); }
    await refreshPubs();
    const due = E.peekDue(); if (!due.length) { if (s.mp.wait) { s.mp.wait = null; publish(); } return null; }
    for (const { el, round } of due) {
      if (E.LIST_T.includes(el.type)) continue;
      const keys = new Set(); Object.values(pubs).forEach(h => { if (h.cand && h.cand.el === el.id && h.cand.mode !== 'colistier') keys.add(h.cand.key); });
      if (p.cand && p.cand.el === el.id && p.cand.mode !== 'colistier') keys.add(p.cand.key);
      for (const key of keys) { const ck = gid + '|' + el.id + '|' + round + '|' + key; if (cache[ck]) continue; try { const v = dget(await db.doc(resPath(gid, el.id, round, key)).get()); if (v) cache[ck] = v; } catch (e) { } }
      if (!(p.cand && p.cand.el === el.id && p.cand.mode !== 'colistier')) continue;
      const key = p.cand.key; const ck = gid + '|' + el.id + '|' + round + '|' + key; if (cache[ck]) continue;
      const r1 = el.races && el.races[key]; if (round === 2 && r1 && r1.done) continue;
      const others = Object.entries(pubs).filter(([u, h]) => u !== me && h.cand && h.cand.el === el.id && h.cand.key === key && h.cand.mode !== 'colistier');
      let mustWait;
      if (round === 1) { if (!others.length) continue; mustWait = others; }
      else { if (!r1 || !r1.shared) continue; const t2 = r1.t2 || []; const humT2 = others.filter(([u]) => t2.includes(mirrorId(u))); if (t2.includes('PJ')) mustWait = humT2; else if (humT2.length) continue; else mustWait = []; }
      const tag = el.id + ':' + round; const d = E.nextDate(el);
      const late = mustWait.filter(([, h]) => !(h.date >= d || h.wait === tag));
      if (late.length) { s.mp.wait = tag; await publish(); return { wait: true, el, round, late: late.map(([, h]) => h.name + ' (au ' + E.fmtDate(h.date, true) + ')') }; }
      const ref = db.doc(resPath(gid, el.id, round, key));
      for (let i = 0; i < 6 && !cache[ck]; i++) {
        let v = dget(await ref.get()); if (v) { cache[ck] = v; break; }
        const l = await ref.acquire({ holder: me, ttlMs: 15000 });
        if (l.acquired) { v = dget(await ref.get()); if (v) { cache[ck] = v; break; } const st = s.rng; const res = E.computeShared(el, key, round, me); s.rng = st; res.game = gid; await ref.set(res); cache[ck] = res; break; }
        await sleep(1500);
      }
      if (!cache[ck]) return { wait: true, el, round, busy: true, late: [] };
    }
    if (s.mp.wait) { s.mp.wait = null; publish(); }
    return null;
  }

  /* ---- messages entre joueurs ---- */
  function seen(id) { const m = S().mp; m.seen = m.seen || []; if (m.seen.includes(id)) return true; m.seen.push(id); if (m.seen.length > 400) m.seen.splice(0, 100); return false; }
  function inbound(id, v) {
    if (!v || !S() || !S().mp || seen(id)) return; const from = mirrorId(v.from);
    const h = pubs[v.from]; const nm = h ? h.name : (v.fromName || 'Un·e ami·e'); const fid = S().pnj[from] ? from : nm;
    const p = S().p;
    if (v.kind === 'attaque') {
      LF.sms(fid, '« ' + v.text + ' » (déclaration publique de ' + nm + ' à votre encontre)', [
        { l: 'Riposter publiquement', noto: 1.5, std: 0.5, res: 'Votre riposte fait le tour des réseaux.', mpReply: 'riposte' },
        { l: 'Prendre de la hauteur', cred: 1, res: 'Vous ne répondez pas. Certains saluent votre calme.' }], { role: 'Joueur·se', human: v.from });
      E.addImageAll(-0.6); E.article('dauph', nm + ' s’en prend à ' + p.name, -0.2, 'pj', '« ' + v.text + ' »');
    } else if (v.kind === 'soutien') {
      LF.sms(fid, nm + ' vous apporte publiquement son soutien : « ' + v.text + ' »', [{ l: 'Remercier', res: 'Message envoyé.', mpReply: 'merci' }], { role: 'Joueur·se', human: v.from });
      E.addImageAll(0.6); E.article('dauph', nm + ' soutient ' + p.name, 0.2, 'pj');
    } else if (v.kind === 'duel') {
      LF.sms(fid, nm + ' vous défie en débat sur Radio Isère. Vous répondez aux mêmes questions, chacun de votre côté ; le public tranchera.', [{ l: 'Relever le défi (4 h)', act: 'duel:' + v.text, res: 'Vous entrez en studio.' }, { l: 'Refuser', img: -0.5, res: nm + ' racontera que vous fuyez le débat.' }], { role: 'Joueur·se', human: v.from });
    } else if (v.kind === 'duelres') {
      const d = v.data || {}; const sc = d.scoreA || 50; if (typeof X !== 'undefined') X.applyDebate({ score: sc, segments: {}, lies: [], punchlines: [], stmts: [], oppId: null });
      LF.sms(fid, 'Le débat est diffusé. Verdict du public : vous ' + (sc >= 55 ? 'l’emportez' : sc < 45 ? 'perdez' : 'faites jeu égal') + ' (' + Math.round(sc) + ' %).', null, { role: 'Joueur·se', human: v.from });
    } else if (v.kind === 'riposte') {
      LF.sms(fid, nm + ' riposte : « ' + v.text + ' »', null, { role: 'Joueur·se', human: v.from }); E.addImageAll(-0.3);
    } else {
      LF.sms(fid, v.text, null, { role: 'Joueur·se', human: v.from });
    }
    onChange('msg');
  }
  async function send(toUid, kind, text, data) {
    if (!on()) return false; const s = S();
    try { await db.collection('mpmsg').add({ game: s.mp.gid, from: me, fromName: s.p.name, to: toUid, kind, text: String(text).slice(0, 600), data: data || null, date: s.date, at: Date.now() }); return true; } catch (e) { return false; }
  }
  return { endorseBonus, withdrawn, setEndorse, setWithdraw, waitingForMe, createDuel, getDuel, finishDuel, init, available, canWrite, setOnChange, myGames, create, find, join, publish, enter, leave, players, inject, freshCand, shared, gate, send, uid: () => me, mirrorId, game: () => game, on };
})();
if (typeof window !== 'undefined') window.MP = MP;
