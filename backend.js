/* MANDAT — version autonome : remplace l'environnement claude.ai par Firebase.
   Le reste du jeu appelle window.claude.use('db' | 'user' | 'sample') comme dans l'artefact :
   - 'db'     → Firestore (sauvegardes et multijoueur)
   - 'user'   → compte Firebase (anonyme par défaut, Google pour retrouver ses parties partout)
   - 'sample' → indisponible : le jeu passe en mode scripté, sans IA. */
(function () {
  const cfg = window.MANDAT_FIREBASE;
  const ok = cfg && cfg.apiKey && !/REMPLACER/.test(cfg.apiKey) && typeof firebase !== 'undefined';
  let ready = null, fs = null, auth = null;

  function start() {
    if (ready) return ready;
    ready = (async () => {
      if (!ok) return false;
      try {
        firebase.initializeApp(cfg); auth = firebase.auth(); fs = firebase.firestore(); try { fs.settings({ ignoreUndefinedProperties: true, merge: true }); } catch (e) { }
        try { fs.enablePersistence({ synchronizeTabs: true }).catch(() => { }); } catch (e) { }
        await new Promise(res => { const un = auth.onAuthStateChanged(u => { un(); res(u); }); });
        if (!auth.currentUser) await auth.signInAnonymously();
        return true;
      } catch (e) { console.error('Firebase', e); return false; }
    })();
    return ready;
  }

  // Une référence de document Firestore, avec le petit verrou qu'utilise le multijoueur pour rejoindre une partie
  // Firestore refuse les tableaux imbriqués et les valeurs indéfinies : on stocke l'objet entier en JSON,
  // en recopiant à plat les champs simples (utiles aux règles de sécurité et aux requêtes).
  function enc(v) { const o = { __j: JSON.stringify(v) }; for (const k in v) { const x = v[k]; if (x == null || ['string', 'number', 'boolean'].includes(typeof x) || (Array.isArray(x) && x.every(y => y == null || typeof y !== 'object'))) o[k] = x === undefined ? null : x; } return o; }
  function dec(snap) { const raw = snap && snap.exists ? snap.data() : undefined; const v = raw && raw.__j ? JSON.parse(raw.__j) : raw; return { exists: !!(snap && snap.exists), id: snap ? snap.id : null, data: () => v }; }
  function wrapDoc(ref) {
    return {
      get: async () => dec(await ref.get()), set: v => ref.set(enc(v)), delete: () => ref.delete(),
      async update(v) { const cur = dec(await ref.get()).data() || {}; return ref.set(enc(Object.assign({}, cur, v))); },
      onSnapshot: (a, b) => ref.onSnapshot(sn => a(dec(sn)), b), get id() { return ref.id; },
      async acquire() { return { acquired: true }; }, async release() { return true; }
    };
  }
  const dbApi = {
    collection: p => fs.collection(p),
    doc: p => wrapDoc(fs.doc(p))
  };
  const userApi = {
    id: async () => (auth && auth.currentUser ? auth.currentUser.uid : null),
    name: async () => (auth && auth.currentUser ? auth.currentUser.displayName || '' : ''),
    can: async () => true
  };

  window.claude = {
    use: async name => {
      if (name === 'db' || name === 'user') { const r = await start(); if (!r) return null; return name === 'db' ? dbApi : userApi; }
      return null;
    }
  };

  // Connexion Google : on rattache le compte anonyme pour garder les parties déjà commencées
  window.MandatAuth = ok ? {
    isGoogle: () => !!(auth && auth.currentUser && !auth.currentUser.isAnonymous),
    name: () => (auth && auth.currentUser ? auth.currentUser.displayName || auth.currentUser.email || '' : ''),
    async signInGoogle() {
      await start(); const prov = new firebase.auth.GoogleAuthProvider();
      try {
        if (auth.currentUser && auth.currentUser.isAnonymous) { await auth.currentUser.linkWithPopup(prov); return { msg: 'Connecté·e. Vos parties sont désormais liées à votre compte Google.' }; }
        await auth.signInWithPopup(prov); return { msg: 'Connecté·e.' };
      } catch (e) {
        if (e && e.code === 'auth/credential-already-in-use') { await auth.signInWithCredential(e.credential); return { msg: 'Connecté·e à votre compte existant. Les parties faites sans connexion sur cet appareil restent dans ce navigateur.' }; }
        return { msg: 'Connexion impossible : ' + (e && e.message ? e.message : 'erreur inconnue') };
      }
    },
    async signOut() { if (auth) await auth.signOut(); }
  } : null;
})();
