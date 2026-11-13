/* MANDAT — données de référence (approximations calibrables) */
window.D = (function () {
  const AXES = [
    { id: 'eco', label: 'Économie', neg: 'Redistribution, État', pos: 'Marché, libéralisme' },
    { id: 'soc', label: 'Société', neg: 'Progressiste', pos: 'Conservateur' },
    { id: 'aut', label: 'Ordre', neg: 'Libertés', pos: 'Autorité' },
    { id: 'souv', label: 'Nation & Europe', neg: 'Intégration européenne', pos: 'Souveraineté, protection' },
    { id: 'ecol', label: 'Écologie', neg: 'Priorité climat', pos: 'Priorité croissance' },
    { id: 'inst', label: 'Système', neg: 'Institutionnel', pos: 'Anti-système' }
  ];

  // Partis réels, personnalités fictives. Positions approximatives sur 6 axes (-100..100).
  const PARTIES = {
    LFI:   { name: 'La France insoumise', short: 'LFI', color: '#d4563a', bloc: 'G',  ax: [-85, -70, -60, 20, -50, 60], wealth: 0.5 },
    PCF:   { name: 'Parti communiste français', short: 'PCF', color: '#b5232c', bloc: 'G',  ax: [-80, -30, -10, 30, 10, 20], wealth: 0.35 },
    ECO:   { name: 'Les Écologistes', short: 'ECO', color: '#4f9a5a', bloc: 'GE', ax: [-50, -70, -50, -50, -90, -10], wealth: 0.4 },
    PS:    { name: 'Parti socialiste', short: 'PS', color: '#e0679a', bloc: 'GE', ax: [-40, -45, -10, -60, -40, -50], wealth: 0.55 },
    REN:   { name: 'Renaissance', short: 'REN', color: '#f0b33c', bloc: 'C', ax: [30, -30, 20, -80, -10, -70], wealth: 0.7 },
    MODEM: { name: 'Mouvement démocrate', short: 'MoDem', color: '#ef8a3c', bloc: 'C', ax: [10, -20, 10, -75, -20, -60], wealth: 0.4 },
    HOR:   { name: 'Horizons', short: 'HOR', color: '#46a0d6', bloc: 'C', ax: [45, -10, 40, -60, 5, -65], wealth: 0.5 },
    LR:    { name: 'Les Républicains', short: 'LR', color: '#3567b5', bloc: 'D', ax: [55, 40, 60, -10, 30, -40], wealth: 0.6 },
    UDR:   { name: 'Union des droites pour la République', short: 'UDR', color: '#6b5fc0', bloc: 'ED', ax: [50, 55, 70, 50, 45, 20], wealth: 0.3 },
    RN:    { name: 'Rassemblement national', short: 'RN', color: '#3a4fa8', bloc: 'ED', ax: [-5, 50, 75, 75, 40, 45], wealth: 0.65 },
    REC:   { name: 'Reconquête', short: 'REC', color: '#8a6a4a', bloc: 'ED', ax: [45, 80, 85, 85, 55, 40], wealth: 0.35 },
    DIV:   { name: 'Divers / sans étiquette', short: 'DIV', color: '#8d939c', bloc: 'DIV', ax: [10, 0, 20, 0, 10, -10], wealth: 0.1 }
  };
  const PARTY_IDS = Object.keys(PARTIES);
  const BLOCS = { G: 'Gauche radicale', GE: 'Gauche sociale-écologiste', C: 'Centre', D: 'Droite', ED: 'Droite nationale', DIV: 'Divers' };

  // Segments d'électorat
  const SEGS = [
    { id: 'JUD', name: 'Jeunes urbains diplômés', ideal: [-40, -70, -40, -40, -60, 0], turnout: 0.52 },
    { id: 'POP', name: 'Classes populaires', ideal: [-40, 20, 40, 50, 30, 50], turnout: 0.44 },
    { id: 'RET', name: 'Retraités', ideal: [10, 30, 50, 0, 20, -30], turnout: 0.78 },
    { id: 'PERI', name: 'Périurbains actifs', ideal: [10, 20, 40, 30, 40, 30], turnout: 0.57 },
    { id: 'CAD', name: 'Cadres & prof. intermédiaires', ideal: [20, -40, 0, -50, -20, -40], turnout: 0.7 },
    { id: 'RUR', name: 'Ruraux & agriculteurs', ideal: [20, 40, 40, 40, 50, 20], turnout: 0.67 }
  ];
  const SEG_IDS = SEGS.map(s => s.id);

  const TYPE_MIX = {
    metro:      [0.22, 0.22, 0.18, 0.06, 0.27, 0.05],
    ville:      [0.10, 0.30, 0.22, 0.13, 0.18, 0.07],
    periurbain: [0.06, 0.17, 0.20, 0.33, 0.19, 0.05],
    bourg:      [0.05, 0.22, 0.28, 0.17, 0.12, 0.16],
    rural:      [0.03, 0.14, 0.30, 0.15, 0.08, 0.30],
    montagne:   [0.06, 0.15, 0.26, 0.12, 0.14, 0.27]
  };
  const TYPE_LABEL = { metro: 'Métropole', ville: 'Ville moyenne', periurbain: 'Périurbain', bourg: 'Bourg-centre', rural: 'Rural', montagne: 'Montagne' };

  // Circonscriptions de l'Isère (10). Scores de 1er tour approximatifs, base législatives 2024.
  // ordre des partis : LFI PCF ECO PS REN MODEM HOR LR UDR RN REC DIV
  function c(nfp, c, d, ed, div) { // nfp=[LFI,PCF,ECO,PS], ed=[RN,UDR,REC]
    return { LFI: nfp[0], PCF: nfp[1], ECO: nfp[2], PS: nfp[3], REN: c * 0.6, MODEM: c * 0.2, HOR: c * 0.2, LR: d, RN: ed[0], UDR: ed[1], REC: ed[2], DIV: div };
  }
  const CIRCOS = [
    { id: 1, name: '1re circonscription', zone: 'Grenoble nord-est, Meylan', pop: 131000, mixOf: { metro: 0.85, periurbain: 0.15 }, base: c([14, 2, 11, 11], 30, 7, [17, 2, 1], 5), gx: 3, gy: 2 },
    { id: 2, name: '2e circonscription', zone: 'Échirolles, Vizille', pop: 125000, mixOf: { metro: 0.55, ville: 0.25, bourg: 0.2 }, base: c([17, 4, 9, 10], 20, 5, [26, 3, 1], 5), gx: 3, gy: 3 },
    { id: 3, name: '3e circonscription', zone: 'Grenoble centre, Fontaine', pop: 118000, mixOf: { metro: 1 }, base: c([24, 3, 13, 10], 20, 6, [15, 2, 1], 6), gx: 2, gy: 2 },
    { id: 4, name: '4e circonscription', zone: 'Sud-Isère, Matheysine, Oisans, Vercors', pop: 109000, mixOf: { montagne: 0.4, rural: 0.3, bourg: 0.3 }, base: c([9, 3, 8, 18], 18, 7, [28, 3, 1], 5), gx: 2, gy: 4 },
    { id: 5, name: '5e circonscription', zone: 'Grésivaudan, Saint-Égrève', pop: 118000, mixOf: { metro: 0.35, periurbain: 0.4, montagne: 0.25 }, base: c([11, 2, 15, 10], 27, 6, [22, 2, 1], 4), gx: 4, gy: 2 },
    { id: 6, name: '6e circonscription', zone: 'Nord-Isère, Crémieu, Pont-de-Chéruy', pop: 128000, mixOf: { periurbain: 0.5, ville: 0.25, rural: 0.25 }, base: c([9, 2, 5, 6], 20, 10, [36, 4, 2], 6), gx: 3, gy: 0 },
    { id: 7, name: '7e circonscription', zone: 'Bièvre, La Tour-du-Pin, Beaurepaire', pop: 133000, mixOf: { rural: 0.45, bourg: 0.35, periurbain: 0.2 }, base: c([8, 2, 5, 7], 18, 10, [38, 4, 2], 6), gx: 1, gy: 1 },
    { id: 8, name: '8e circonscription', zone: 'Vienne, Roussillon', pop: 126000, mixOf: { ville: 0.5, periurbain: 0.3, rural: 0.2 }, base: c([11, 3, 5, 7], 25, 7, [33, 3, 2], 4), gx: 0, gy: 1 },
    { id: 9, name: '9e circonscription', zone: 'Voironnais, Saint-Marcellin, Chartreuse', pop: 127000, mixOf: { periurbain: 0.45, bourg: 0.3, ville: 0.15, rural: 0.1 }, base: c([10, 2, 9, 9], 24, 8, [28, 3, 2], 5), gx: 1, gy: 2 },
    { id: 10, name: '10e circonscription', zone: "Bourgoin-Jallieu, L'Isle-d'Abeau, Villefontaine", pop: 124000, mixOf: { ville: 0.5, periurbain: 0.5 }, base: c([12, 2, 6, 8], 20, 7, [35, 3, 2], 5), gx: 2, gy: 1 }
  ];

  // Communes (populations arrondies, rattachement de circonscription simplifié)
  const COMMUNES = [
    ['Grenoble', 157000, 3, 'metro'], ["Saint-Martin-d'Hères", 38500, 1, 'metro'], ['Échirolles', 37000, 2, 'metro'],
    ['Vienne', 30500, 8, 'ville'], ['Bourgoin-Jallieu', 29500, 10, 'ville'], ['Fontaine', 22500, 3, 'metro'],
    ['Voiron', 20500, 9, 'ville'], ['Villefontaine', 19500, 10, 'ville'], ['Meylan', 18000, 1, 'metro'],
    ["L'Isle-d'Abeau", 16500, 10, 'periurbain'], ['Saint-Égrève', 16000, 5, 'metro'], ['Seyssinet-Pariset', 12000, 3, 'metro'],
    ['Sassenage', 11500, 3, 'metro'], ['Voreppe', 9500, 9, 'periurbain'], ['Crolles', 8800, 5, 'periurbain'],
    ['La Tour-du-Pin', 8500, 7, 'ville'], ['Roussillon', 8100, 8, 'ville'], ['Moirans', 8000, 9, 'periurbain'],
    ['Saint-Marcellin', 8000, 9, 'bourg'], ['Tullins', 7800, 9, 'periurbain'], ['Vizille', 7300, 2, 'bourg'],
    ['Rives', 6400, 9, 'periurbain'], ['Pont-de-Chéruy', 6000, 6, 'ville'], ['La Côte-Saint-André', 5000, 7, 'bourg'],
    ['La Mure', 4900, 4, 'bourg'], ['Beaurepaire', 4900, 7, 'bourg'], ['Saint-Jean-de-Bournay', 4800, 7, 'rural'],
    ['Villard-de-Lans', 4000, 4, 'montagne'], ['Allevard', 4000, 5, 'montagne'], ['Crémieu', 3400, 6, 'bourg'],
    ["Le Bourg-d'Oisans", 3200, 4, 'montagne'], ['Mens', 1400, 4, 'rural']
  ].map((r, i) => ({ id: 'm' + i, name: r[0], pop: r[1], circo: r[2], type: r[3] }));

  // Villages et petites communes réels (populations 2022), pour débuter avec des règles simplifiées.
  // [nom, population, circonscription, type, lat, lon, territoire]
  const VILLAGES = [
    ['Besse', 153, 4, 'montagne', 45.073, 6.171, 'Oisans'], ['Mizoën', 192, 4, 'montagne', 45.060, 6.105, 'Oisans'], ['Allemond', 955, 4, 'montagne', 45.130, 6.040, 'Oisans'], ['Huez', 1264, 4, 'montagne', 45.084, 6.064, 'Oisans'],
    ['Lalley', 183, 4, 'montagne', 44.755, 5.678, 'Trièves'], ['Chichilianne', 326, 4, 'montagne', 44.810, 5.570, 'Trièves'], ['Gresse-en-Vercors', 356, 4, 'montagne', 44.902, 5.559, 'Trièves'], ['Clelles', 576, 4, 'montagne', 44.828, 5.620, 'Trièves'], ['Monestier-de-Clermont', 1463, 4, 'montagne', 44.914, 5.633, 'Trièves'],
    ['Corps', 424, 4, 'montagne', 44.818, 5.946, 'Matheysine'], ['Laffrey', 468, 4, 'montagne', 45.025, 5.767, 'Matheysine'], ['Nantes-en-Ratier', 468, 4, 'montagne', 44.937, 5.822, 'Matheysine'], ['Pierre-Châtel', 1485, 4, 'montagne', 44.958, 5.775, 'Matheysine'],
    ['Corrençon-en-Vercors', 368, 4, 'montagne', 45.031, 5.527, 'Vercors'], ['Engins', 429, 4, 'montagne', 45.196, 5.623, 'Vercors'], ['Rencurel', 349, 9, 'montagne', 45.104, 5.468, 'Vercors'],
    ['Cognin-les-Gorges', 619, 9, 'rural', 45.168, 5.410, 'Royans et Sud-Grésivaudan'], ['Chevrières', 737, 9, 'rural', 45.187, 5.297, 'Royans et Sud-Grésivaudan'], ['Izeron', 781, 9, 'rural', 45.143, 5.372, 'Royans et Sud-Grésivaudan'], ['Pont-en-Royans', 809, 9, 'rural', 45.062, 5.343, 'Royans et Sud-Grésivaudan'], ["Saint-Antoine-l'Abbaye", 1258, 9, 'rural', 45.175, 5.218, 'Royans et Sud-Grésivaudan'],
    ['Proveysieux', 519, 5, 'montagne', 45.254, 5.707, 'Chartreuse'], ['Saint-Christophe-sur-Guiers', 836, 5, 'montagne', 45.430, 5.776, 'Chartreuse'], ['Quaix-en-Chartreuse', 926, 5, 'montagne', 45.249, 5.720, 'Chartreuse'],
    ['La Pierre', 648, 5, 'montagne', 45.297, 5.979, 'Grésivaudan et Belledonne'], ['La Combe-de-Lancey', 730, 5, 'montagne', 45.226, 5.891, 'Grésivaudan et Belledonne'], ['Laval-en-Belledonne', 1009, 5, 'montagne', 45.248, 5.968, 'Grésivaudan et Belledonne'], ['Revel', 1323, 5, 'montagne', 45.185, 5.871, 'Grésivaudan et Belledonne'],
    ['Montchaboud', 347, 2, 'periurbain', 45.098, 5.759, 'Sud de la métropole'], ['Miribel-Lanchâtre', 450, 2, 'rural', 44.983, 5.633, 'Sud de la métropole'], ['Notre-Dame-de-Commiers', 527, 2, 'rural', 45.008, 5.699, 'Sud de la métropole'], ['Bresson', 671, 2, 'periurbain', 45.132, 5.751, 'Sud de la métropole'],
    ['Penol', 377, 7, 'rural', 45.375, 5.212, 'Bièvre'], ['Burcin', 439, 7, 'rural', 45.436, 5.437, 'Bièvre'], ['Eydoche', 541, 7, 'rural', 45.441, 5.326, 'Bièvre'], ['Bizonnes', 1028, 7, 'rural', 45.454, 5.364, 'Bièvre'], ['Pajay', 1052, 7, 'rural', 45.360, 5.131, 'Bièvre'], ['Roybon', 1103, 7, 'rural', 45.257, 5.245, 'Bièvre'], ['Faramans', 1148, 7, 'rural', 45.392, 5.174, 'Bièvre'],
    ['Blandin', 156, 7, 'rural', 45.468, 5.567, 'Terres froides'], ['Chassignieu', 226, 7, 'rural', 45.495, 5.512, 'Terres froides'], ['Chélieu', 739, 7, 'rural', 45.509, 5.479, 'Terres froides'], ['Doissin', 879, 7, 'rural', 45.503, 5.426, 'Terres froides'], ['Le Passage', 972, 7, 'rural', 45.530, 5.505, 'Terres froides'],
    ['Brangues', 620, 6, 'rural', 45.693, 5.533, 'Isle-Crémieu'], ['Annoisin-Chatelans', 724, 6, 'rural', 45.760, 5.296, 'Isle-Crémieu'], ['Parmilieu', 727, 6, 'rural', 45.836, 5.380, 'Isle-Crémieu'], ['Optevoz', 877, 6, 'rural', 45.755, 5.352, 'Isle-Crémieu'], ['Hières-sur-Amby', 1198, 6, 'rural', 45.797, 5.292, 'Isle-Crémieu'],
    ['Meyssiez', 665, 8, 'rural', 45.462, 5.033, 'Pays viennois'], ['Primarette', 694, 7, 'rural', 45.405, 5.034, 'Pays viennois'], ['Moissieu-sur-Dolon', 721, 7, 'rural', 45.386, 4.950, 'Pays viennois'], ['Pact', 864, 7, 'rural', 45.363, 4.998, 'Pays viennois'], ['Cour-et-Buis', 926, 8, 'rural', 45.443, 4.995, 'Pays viennois'], ['Montseveroux', 998, 8, 'rural', 45.433, 4.971, 'Pays viennois'],
    ['Merlas', 466, 9, 'rural', 45.444, 5.673, 'Pays voironnais'], ['Saint-Bueil', 707, 9, 'rural', 45.474, 5.695, 'Pays voironnais'], ['Massieu', 757, 9, 'rural', 45.433, 5.601, 'Pays voironnais'], ['Saint-Aupre', 1200, 9, 'rural', 45.393, 5.660, 'Pays voironnais'],
    ['Crachier', 590, 10, 'rural', 45.546, 5.226, 'Porte de l’Isère'], ['Chèzeneuve', 650, 10, 'rural', 45.565, 5.217, 'Porte de l’Isère'], ['Châteauvilain', 744, 10, 'rural', 45.517, 5.331, 'Porte de l’Isère'], ['Les Éparres', 976, 10, 'rural', 45.536, 5.297, 'Porte de l’Isère']
  ].map((r, i) => ({ id: 'v' + i, name: r[0], pop: r[1], circo: r[2], type: r[3], geo: [r[4], r[5]], terr: r[6], village: true }));
  // Cantons réels (découpage de 2015) de chaque commune jouable
  const CANTONS = {"Grenoble": "Grenoble-1", "Saint-Martin-d'Hères": "Saint-Martin-d'Hères", "Échirolles": "Échirolles", "Vienne": "Vienne-1", "Bourgoin-Jallieu": "Bourgoin-Jallieu", "Fontaine": "Fontaine-Seyssinet", "Voiron": "Voiron", "Villefontaine": "L'Isle-d'Abeau", "Meylan": "Meylan", "L'Isle-d'Abeau": "L'Isle-d'Abeau", "Saint-Égrève": "Grenoble-2", "Seyssinet-Pariset": "Fontaine-Seyssinet", "Sassenage": "Fontaine-Vercors", "Voreppe": "Voiron", "Crolles": "Le Moyen Grésivaudan", "La Tour-du-Pin": "La Tour-du-Pin", "Roussillon": "Roussillon", "Moirans": "Tullins", "Saint-Marcellin": "Le Sud Grésivaudan", "Tullins": "Tullins", "Vizille": "Oisans-Romanche", "Rives": "Tullins", "Pont-de-Chéruy": "Charvieu-Chavagneux", "La Côte-Saint-André": "Bièvre", "La Mure": "Matheysine-Trièves", "Beaurepaire": "Roussillon", "Saint-Jean-de-Bournay": "L'Isle-d'Abeau", "Villard-de-Lans": "Fontaine-Vercors", "Allevard": "Le Haut-Grésivaudan", "Crémieu": "Charvieu-Chavagneux", "Le Bourg-d'Oisans": "Oisans-Romanche", "Mens": "Matheysine-Trièves", "Besse": "Oisans-Romanche", "Mizoën": "Oisans-Romanche", "Allemond": "Oisans-Romanche", "Huez": "Oisans-Romanche", "Lalley": "Matheysine-Trièves", "Chichilianne": "Matheysine-Trièves", "Gresse-en-Vercors": "Matheysine-Trièves", "Clelles": "Matheysine-Trièves", "Monestier-de-Clermont": "Matheysine-Trièves", "Corps": "Matheysine-Trièves", "Laffrey": "Matheysine-Trièves", "Nantes-en-Ratier": "Matheysine-Trièves", "Pierre-Châtel": "Matheysine-Trièves", "Corrençon-en-Vercors": "Fontaine-Vercors", "Engins": "Fontaine-Vercors", "Rencurel": "Le Sud Grésivaudan", "Cognin-les-Gorges": "Le Sud Grésivaudan", "Chevrières": "Le Sud Grésivaudan", "Izeron": "Le Sud Grésivaudan", "Pont-en-Royans": "Le Sud Grésivaudan", "Saint-Antoine-l'Abbaye": "Le Sud Grésivaudan", "Proveysieux": "Grenoble-2", "Saint-Christophe-sur-Guiers": "Chartreuse-Guiers", "Quaix-en-Chartreuse": "Grenoble-2", "La Pierre": "Le Haut-Grésivaudan", "La Combe-de-Lancey": "Le Moyen Grésivaudan", "Laval-en-Belledonne": "Le Moyen Grésivaudan", "Revel": "Le Moyen Grésivaudan", "Montchaboud": "Oisans-Romanche", "Miribel-Lanchâtre": "Matheysine-Trièves", "Notre-Dame-de-Commiers": "Le Pont-de-Claix", "Bresson": "Échirolles", "Penol": "Bièvre", "Burcin": "Le Grand-Lemps", "Eydoche": "Le Grand-Lemps", "Bizonnes": "Le Grand-Lemps", "Pajay": "Bièvre", "Roybon": "Bièvre", "Faramans": "Bièvre", "Blandin": "Le Grand-Lemps", "Chassignieu": "Le Grand-Lemps", "Chélieu": "Le Grand-Lemps", "Doissin": "Le Grand-Lemps", "Le Passage": "La Tour-du-Pin", "Brangues": "Morestel", "Annoisin-Chatelans": "Charvieu-Chavagneux", "Parmilieu": "Morestel", "Optevoz": "Morestel", "Hières-sur-Amby": "Charvieu-Chavagneux", "Meyssiez": "Bièvre", "Primarette": "Roussillon", "Moissieu-sur-Dolon": "Roussillon", "Pact": "Roussillon", "Cour-et-Buis": "Roussillon", "Montseveroux": "Roussillon", "Merlas": "Chartreuse-Guiers", "Saint-Bueil": "Chartreuse-Guiers", "Massieu": "Le Grand-Lemps", "Saint-Aupre": "Voiron", "Crachier": "L'Isle-d'Abeau", "Chèzeneuve": "L'Isle-d'Abeau", "Châteauvilain": "Bourgoin-Jallieu", "Les Éparres": "Bourgoin-Jallieu"};
  COMMUNES.concat(VILLAGES).forEach(c => { c.canton = CANTONS[c.name] || c.terr || c.name; });
  const COM_BY_ID = {}; COMMUNES.concat(VILLAGES).forEach(c => COM_BY_ID[c.id] = c);
  const com = id => COM_BY_ID[id];

  // Base nationale approximative (pour la présidentielle et le climat)
  const NATIONAL = { name: 'France', pop: 49000000, mixOf: { metro: 0.25, ville: 0.25, periurbain: 0.22, bourg: 0.14, rural: 0.14 },
    base: { LFI: 10, PCF: 2.5, ECO: 6, PS: 10, REN: 13, MODEM: 4, HOR: 4, LR: 8, UDR: 4, RN: 30, REC: 2, DIV: 6.5 } };

  const METIERS = [
    { id: 'etudiant', label: 'Étudiant·e', hpw: 16, cash: 1500, income: 80, seg: { JUD: 8 }, net: 2 , age: [18, 28]},
    { id: 'salarie', label: 'Salarié·e du privé', hpw: 11, cash: 6000, income: 250, seg: { PERI: 6, POP: 3 }, net: 4 },
    { id: 'ouvrier', label: 'Ouvrier·ère', hpw: 10, cash: 3000, income: 150, seg: { POP: 10 }, net: 4 },
    { id: 'enseignant', label: 'Enseignant·e', hpw: 13, cash: 7000, income: 250, seg: { JUD: 4, CAD: 4 }, net: 6 , cred: 3, noto: 3},
    { id: 'cadre', label: 'Cadre du privé', hpw: 9, cash: 22000, income: 600, seg: { CAD: 8 }, net: 8 , cred: 5, noto: 3},
    { id: 'independant', label: 'Artisan·e / commerçant·e', hpw: 10, cash: 15000, income: 450, seg: { PERI: 5, RUR: 4 }, net: 10 , noto: 6},
    { id: 'agriculteur', label: 'Agriculteur·rice', hpw: 8, cash: 9000, income: 200, seg: { RUR: 12 }, net: 7 , noto: 5},
    { id: 'fonctionnaire', label: 'Fonctionnaire territorial·e', hpw: 12, cash: 8000, income: 280, seg: { CAD: 3, RET: 3 }, net: 9 , cred: 4},
    { id: 'avocat', label: 'Avocat·e', hpw: 9, cash: 30000, income: 800, seg: { CAD: 6 }, net: 10 , cred: 8, noto: 6, age: [26, 75]},
    { id: 'retraite', label: 'Retraité·e', hpw: 18, cash: 18000, income: 350, seg: { RET: 10 }, net: 6 , age: [60, 80]}
  ];

  // Questionnaire politique : 15 affirmations, échelle -2..+2 (Pas du tout ... Tout à fait d'accord)
  // w = contribution à chaque axe pour une réponse "Tout à fait d'accord" (+2)
  // Questionnaire inspiré des tests en ligne (Boussole présidentielle, Vote&Vous…) : des mesures concrètes,
  // et la position de chaque parti (0 = pas du tout d’accord … 4 = tout à fait), dans l’ordre QUIZ_P.
  const QUIZ_P = ['LFI', 'PCF', 'ECO', 'PS', 'REN', 'MODEM', 'HOR', 'LR', 'UDR', 'RN', 'REC'];
  const QUIZ_T = { eco: 'Économie et impôts', social: 'Travail et protection sociale', societe: 'Société', securite: 'Sécurité et justice', immig: 'Immigration', europe: 'Europe et international', ecologie: 'Énergie et écologie', institutions: 'Institutions' };
  const QUIZ = [
    { t: 'eco', q: 'Rétablir un impôt sur la fortune, qui porterait aussi sur les placements financiers.', p: '44440100030', w: { eco: -40 }, ctx: 'L’ISF a été remplacé en 2018 par un impôt sur la seule fortune immobilière (IFI).' },
    { t: 'eco', q: 'Baisser les impôts et cotisations des entreprises, en finançant cela par des économies dans les dépenses publiques.', p: '00114344424', w: { eco: 40 } },
    { t: 'eco', q: 'Porter le SMIC à 1 600 € net par mois.', p: '44330100010', w: { eco: -35 }, ctx: 'Le SMIC est d’environ 1 440 € net par mois en 2026.' },
    { t: 'eco', q: 'Réduire le nombre de fonctionnaires, hors soignants, policiers et enseignants.', p: '00002244424', w: { eco: 35 } },
    { t: 'eco', q: 'Renationaliser les autoroutes à la fin (ou avant la fin) des concessions.', p: '44430101041', w: { eco: -30, souv: 10 }, ctx: 'Les autoroutes ont été privatisées en 2006 ; les premières concessions expirent à partir de 2031.' },
    { t: 'social', q: 'Revenir à un âge légal de départ à la retraite à 62 ans.', p: '44430100140', w: { eco: -35, inst: 10 }, ctx: 'La réforme de 2023 le porte progressivement à 64 ans ; sa mise en œuvre est suspendue jusqu’en janvier 2028.' },
    { t: 'social', q: 'Durcir les règles de l’assurance chômage pour inciter davantage à reprendre un emploi.', p: '00004344424', w: { eco: 35 } },
    { t: 'social', q: 'Supprimer l’obligation de 15 heures d’activité par semaine pour les allocataires du RSA.', p: '44320000010', w: { eco: -25, aut: -10 }, ctx: 'Depuis janvier 2025, les allocataires du RSA inscrits à France Travail doivent effectuer 15 heures d’activité par semaine.' },
    { t: 'social', q: 'Indexer automatiquement les salaires sur l’inflation.', p: '44330000010', w: { eco: -35 } },
    { t: 'eco', q: 'Exonérer de droits de succession les héritages jusqu’à 300 000 € par enfant.', p: '00000113443', w: { eco: 30, soc: 5 }, ctx: 'Aujourd’hui, l’abattement est de 100 000 € par parent et par enfant.' },
    { t: 'societe', q: 'Légaliser l’aide active à mourir, sous conditions strictes.', p: '43443231010', w: { soc: -35 } },
    { t: 'societe', q: 'Autoriser la gestation pour autrui (GPA), encadrée par la loi.', p: '21311010000', w: { soc: -40 } },
    { t: 'societe', q: 'Légaliser le cannabis récréatif, vendu sous le contrôle de l’État.', p: '42431110000', w: { soc: -30, aut: -20 } },
    { t: 'societe', q: 'Interdire le port du voile dans les compétitions sportives.', p: '01023234444', w: { soc: 30, aut: 15 } },
    { t: 'societe', q: 'Privatiser l’audiovisuel public (France Télévisions, Radio France).', p: '00000011344', w: { soc: 10, inst: 25 } },
    { t: 'securite', q: 'Rétablir des peines planchers pour les récidivistes.', p: '00012234444', w: { aut: 40 } },
    { t: 'securite', q: 'Abaisser la majorité pénale à 16 ans pour les crimes et délits graves.', p: '00002124444', w: { aut: 35, soc: 5 } },
    { t: 'securite', q: 'Autoriser la reconnaissance faciale en temps réel dans l’espace public.', p: '00012134444', w: { aut: 40 } },
    { t: 'securite', q: 'Interdire les LBD et les grenades de désencerclement pour le maintien de l’ordre.', p: '43420000000', w: { aut: -40 } },
    { t: 'securite', q: 'Construire 20 000 places de prison supplémentaires.', p: '01013344444', w: { aut: 30 } },
    { t: 'immig', q: 'Réserver en priorité aux Français l’accès au logement social et à certaines aides sociales.', p: '00000001444', w: { soc: 35, souv: 20 } },
    { t: 'immig', q: 'Organiser le retour dans leur pays d’une partie des immigrés déjà installés en France, y compris en situation régulière.', p: '00000000214', w: { soc: 45, souv: 15 } },
    { t: 'immig', q: 'Supprimer le droit du sol.', p: '00000013444', w: { soc: 30, souv: 20 } },
    { t: 'immig', q: 'Régulariser les travailleurs sans papiers dans les métiers en tension.', p: '44442310000', w: { soc: -35 } },
    { t: 'immig', q: 'Organiser un référendum sur l’immigration.', p: '00001014444', w: { soc: 25, inst: 20 } },
    { t: 'europe', q: 'Créer une défense européenne commune, financée par un emprunt européen.', p: '00344442000', w: { souv: -45 } },
    { t: 'europe', q: 'Faire primer le droit français sur le droit européen quand ils s’opposent.', p: '22000003444', w: { souv: 45 } },
    { t: 'europe', q: 'Continuer à livrer des armes à l’Ukraine.', p: '11444443110', w: { souv: -25, aut: 5 } },
    { t: 'europe', q: 'Quitter le commandement intégré de l’OTAN.', p: '44100000032', w: { souv: 35 } },
    { t: 'europe', q: 'Faire entrer l’Ukraine et la Moldavie dans l’Union européenne.', p: '00333331000', w: { souv: -35 } },
    { t: 'ecologie', q: 'Construire de nouveaux réacteurs nucléaires.', p: '04024444444', w: { ecol: 30 } },
    { t: 'ecologie', q: 'Geler les nouveaux projets d’éoliennes, sur terre et en mer.', p: '01000013444', w: { ecol: 40 } },
    { t: 'ecologie', q: 'Repousser la fin de la vente des voitures neuves à essence et diesel, prévue en 2035.', p: '02012124444', w: { ecol: 35 } },
    { t: 'ecologie', q: 'Interdire les vols intérieurs quand le train fait le trajet en moins de 4 heures.', p: '42431100000', w: { ecol: -35 } },
    { t: 'ecologie', q: 'Supprimer les zones à faibles émissions (ZFE) qui interdisent les vieux véhicules en ville.', p: '22011114444', w: { ecol: 30 } },
    { t: 'institutions', q: 'Élire les députés à la proportionnelle.', p: '44442400344', w: { inst: 20 } },
    { t: 'institutions', q: 'Créer un référendum d’initiative citoyenne (RIC).', p: '43310100244', w: { inst: 40 } },
    { t: 'institutions', q: 'Passer à une VIe République, avec un président aux pouvoirs réduits.', p: '43310000000', w: { inst: 40, aut: -10 } },
    { t: 'institutions', q: 'Rétablir la possibilité d’être à la fois député·e et maire.', p: '01003444433', w: { inst: 10 }, ctx: 'Interdit depuis 2017. Plusieurs propositions de loi déposées en 2024 et 2025 veulent le rétablir, au moins dans les petites communes.' },
    { t: 'institutions', q: 'La droite peut s’allier avec le Rassemblement national.', p: '00000001444', w: { inst: 35, souv: 20 } },
    { t: 'eco', q: 'Instaurer un impôt minimum de 2 % sur les patrimoines de plus de 100 millions d’euros (« taxe Zucman »).', p: '44440100001', w: { eco: -35 }, ctx: 'Proposée par l’économiste Gabriel Zucman, elle a divisé le Parlement en 2025.' },
    { t: 'europe', q: 'Ratifier l’accord de libre-échange entre l’Union européenne et le Mercosur.', p: '00001122000', w: { souv: -20, ecol: 15 }, ctx: 'L’accord avec l’Argentine, le Brésil, le Paraguay et l’Uruguay est contesté par les agriculteurs français.' },
    { t: 'social', q: 'Introduire une part obligatoire de retraite par capitalisation.', p: '00003244414', w: { eco: 30 } },
    { t: 'eco', q: 'Ramener le déficit public sous 3 % du PIB dès 2029, quitte à réduire fortement les dépenses.', p: '00113444323', w: { eco: 30 }, ctx: 'Le déficit public était de 5,1 % du PIB en 2025.' }
  ];
  const LIKERT = [
    { v: -2, l: 'Pas du tout d’accord' }, { v: -1, l: 'Plutôt pas d’accord' }, { v: 0, l: 'Sans avis' },
    { v: 1, l: 'Plutôt d’accord' }, { v: 2, l: 'Tout à fait d’accord' }
  ];

  // Traits de personnalité : 6 mises en situation
  const TRAITS = { loyaute: 'Loyauté', ambition: 'Ambition', scrupules: 'Scrupules', sangfroid: 'Sang-froid', terrain: 'Sens du terrain', rancune: 'Rancune' };
  const PERSO = [
    { q: 'Un allié vous a rendu service, mais le soutenir maintenant vous coûterait des voix.', a: [
      { l: 'Je le soutiens quand même', t: { loyaute: 25, ambition: -5 } },
      { l: 'Je me fais discret', t: { sangfroid: 10 } },
      { l: 'Je prends mes distances publiquement', t: { loyaute: -20, ambition: 20 } }] },
    { q: 'Un journaliste vous tend une question piège en direct.', a: [
      { l: 'Je réponds franchement, quitte à me découvrir', t: { scrupules: 15, sangfroid: -5 } },
      { l: 'J’esquive avec une formule', t: { sangfroid: 20 } },
      { l: 'Je contre-attaque le journaliste', t: { sangfroid: -10, ambition: 10 } }] },
    { q: 'On vous apporte un dossier compromettant sur un rival.', a: [
      { l: 'Je refuse d’y toucher', t: { scrupules: 25 } },
      { l: 'Je le garde en réserve', t: { scrupules: -5, sangfroid: 10 } },
      { l: 'Je le fais fuiter sans attendre', t: { scrupules: -25, ambition: 10 } }] },
    { q: 'Votre parti investit quelqu’un d’autre à votre place.', a: [
      { l: 'Je m’incline et je négocie une contrepartie', t: { loyaute: 15, sangfroid: 10 } },
      { l: 'Je pars en dissidence', t: { loyaute: -15, ambition: 20 } },
      { l: 'Je n’oublierai pas qui m’a barré la route', t: { rancune: 30 } }] },
    { q: 'Samedi matin : dossier technique ou marché du centre-ville ?', a: [
      { l: 'Le dossier, la rigueur paie', t: { terrain: -10, sangfroid: 5 } },
      { l: 'Le marché, serrer des mains', t: { terrain: 25 } },
      { l: 'Les deux, je dors moins', t: { terrain: 10, ambition: 10 } }] },
    { q: 'Au soir d’une défaite électorale :', a: [
      { l: 'J’analyse et je repars', t: { sangfroid: 15 } },
      { l: 'Je cherche qui m’a lâché', t: { rancune: 25 } },
      { l: 'Je change de stratégie, voire d’étiquette', t: { loyaute: -15, ambition: 15 } }] }
  ];


  // Réservoir de questions : 15 tirées à chaque création (au moins 2 par axe)
  const QUIZ_POOL = QUIZ;
  // Correspondance avec les partis : accord question par question (les « sans avis » ne comptent pas)
  function quizMatch(qs, ans) {
    const out = {}; QUIZ_P.forEach(k => out[k] = 0); let n = 0;
    ans.forEach((v, i) => { if (v === 0 || v == null) return; const q = QUIZ_POOL[qs[i]]; const a = v + 2; n++; QUIZ_P.forEach((k, j) => { out[k] += (4 - Math.abs(a - +q.p[j])) / 4; }); });
    QUIZ_P.forEach(k => out[k] = n ? Math.round(out[k] / n * 100) : 0); return out;
  }
  // Désaccords marqués avec un parti (écart de 3 ou 4 crans)
  function quizGaps(qs, ans, party) { const j = QUIZ_P.indexOf(party); if (j < 0) return []; return ans.map((v, i) => ({ v, q: QUIZ_POOL[qs[i]] })).filter(x => x.v != null && Math.abs(x.v + 2 - +x.q.p[j]) >= 3).map(x => ({ q: x.q.q, t: x.q.t, me: x.v, line: +x.q.p[j] - 2 })); }
  const PERSO_POOL = PERSO.concat([
    { q: 'Un ami proche vous demande d’appuyer son dossier de logement social.', a: [
      { l: 'Je refuse : pas de passe-droit', t: { scrupules: 25, loyaute: -10 } },
      { l: 'Je glisse un mot, discrètement', t: { scrupules: -20, loyaute: 15 } },
      { l: 'Je l’aide à monter un dossier irréprochable', t: { sangfroid: 10, scrupules: 10 } }] },
    { q: 'Un militant de votre camp tient des propos racistes en public.', a: [
      { l: 'Exclusion immédiate', t: { scrupules: 20, loyaute: -10 } },
      { l: 'Je le défends : on sort ses phrases du contexte', t: { loyaute: 15, scrupules: -20 } },
      { l: 'Recadrage ferme, en privé', t: { sangfroid: 15 } }] },
    { q: 'À trois semaines du vote, un sondage vous donne battu·e.', a: [
      { l: 'Tout sur le terrain, jusqu’au bout', t: { terrain: 20 } },
      { l: 'Je change de stratégie du tout au tout', t: { ambition: 15, sangfroid: -5 } },
      { l: 'Je durcis les attaques contre l’adversaire', t: { rancune: 15, scrupules: -10 } }] },
    { q: 'On vous propose un ministère dans un gouvernement du camp d’en face.', a: [
      { l: 'J’accepte : on agit mieux de l’intérieur', t: { ambition: 25, loyaute: -20 } },
      { l: 'Je refuse par fidélité', t: { loyaute: 25, ambition: -5 } },
      { l: 'Je pose mes conditions, publiquement', t: { sangfroid: 15, ambition: 10 } }] },
    { q: 'Des manifestants bloquent votre permanence.', a: [
      { l: 'Je sors discuter avec eux', t: { terrain: 15, sangfroid: 10 } },
      { l: 'Je porte plainte', t: { rancune: 15, sangfroid: -5 } },
      { l: 'Je laisse passer l’orage', t: { sangfroid: 10, terrain: -10 } }] },
    { q: 'Votre directeur de campagne a commis une faute grave.', a: [
      { l: 'Je le couvre', t: { loyaute: 20, scrupules: -15 } },
      { l: 'Je le limoge sur-le-champ', t: { ambition: 15, loyaute: -15 } },
      { l: 'J’assume publiquement l’erreur', t: { scrupules: 20, sangfroid: 5 } }] },
    { q: 'Votre adversaire traverse un drame personnel en pleine campagne.', a: [
      { l: 'Je suspends toutes mes attaques', t: { scrupules: 20 } },
      { l: 'La campagne continue, c’est la politique', t: { ambition: 15, scrupules: -15 } },
      { l: 'Je lui écris un mot, en privé', t: { sangfroid: 10, rancune: -10 } }] },
    { q: 'Un journaliste vous fait perdre votre calme en direct.', a: [
      { l: 'Je m’excuse dès le lendemain', t: { scrupules: 10, sangfroid: 5 } },
      { l: 'J’assume : il fallait que ça sorte', t: { sangfroid: -15, ambition: 5 } },
      { l: 'Je boycotte ce média désormais', t: { rancune: 20 } }] }
  ]);
  const THEMES = {
    economie: { l: 'Économie & emploi', ax: { eco: 1 } }, pouvoir_achat: { l: "Pouvoir d'achat", ax: { eco: -0.6, ecol: 0.4 } },
    securite: { l: 'Sécurité', ax: { aut: 1 } }, immigration: { l: 'Immigration', ax: { souv: 0.7, soc: 0.3 } },
    ecologie: { l: 'Écologie', ax: { ecol: -1 } }, sante: { l: 'Santé', ax: { eco: -0.5 } },
    education: { l: 'Éducation', ax: { soc: 0.4, aut: 0.3 } }, logement: { l: 'Logement', ax: { eco: -0.5 } },
    transports: { l: 'Transports', ax: { ecol: -0.5 } }, institutions: { l: 'Institutions & démocratie', ax: { inst: 1 } },
    europe: { l: 'Europe', ax: { souv: 1 } }, agriculture: { l: 'Agriculture', ax: { ecol: 0.5, souv: 0.5 } },
    industrie: { l: 'Industrie', ax: { souv: 0.6, eco: -0.2 } }, fiscalite: { l: 'Fiscalité', ax: { eco: 1 } },
    societe: { l: 'Questions de société', ax: { soc: 1 } }
  };
  const KEYWORDS = [
    ['securite', ['police', 'sécurité', 'securite', 'délinquance', 'caméra', 'videoprotection', 'vidéoprotection', 'drogue', 'deal', 'insécurité']],
    ['immigration', ['immigration', 'migrant', 'frontière', 'clandestin', 'asile', 'oqtf']],
    ['ecologie', ['climat', 'écolo', 'vélo', 'arbre', 'pollution', 'énergie', 'renouvelable', 'carbone', 'biodiversité']],
    ['pouvoir_achat', ["pouvoir d'achat", 'prix', 'salaire', 'smic', 'carburant', 'facture', 'gratuit']],
    ['logement', ['logement', 'loyer', 'hlm', 'immobilier', 'foncier']],
    ['transports', ['bus', 'tram', 'train', 'transport', 'route', 'parking', 'voiture']],
    ['sante', ['santé', 'hôpital', 'médecin', 'maternité', 'urgences']],
    ['education', ['école', 'collège', 'lycée', 'éducation', 'enseignant', 'cantine', 'crèche']],
    ['fiscalite', ['impôt', 'taxe', 'fiscal', 'foncière']],
    ['economie', ['emploi', 'entreprise', 'commerce', 'chômage', 'économie']],
    ['industrie', ['usine', 'industrie', 'réindustrialisation']],
    ['institutions', ['référendum', 'démocratie', 'participation', 'transparence', 'élu']],
    ['europe', ['europe', 'bruxelles', 'ue ']],
    ['agriculture', ['agricult', 'paysan', 'ferme', 'circuit court']],
    ['societe', ['laïcité', 'famille', 'mariage', 'fin de vie', 'égalité']]
  ];

  const FIRST_M = ['Julien', 'Thomas', 'Nicolas', 'Olivier', 'Laurent', 'Philippe', 'Mathieu', 'Antoine', 'Pierre', 'Romain', 'Guillaume', 'François', 'Éric', 'Damien', 'Sylvain', 'Karim', 'Yannick', 'Benoît', 'Hervé', 'Cédric', 'Bruno', 'Alexandre', 'Mehdi', 'Jérôme', 'Patrick', 'Gilles', 'Rémi', 'Bastien', 'Christophe', 'Hugo'];
  const FIRST_F = ['Isabelle', 'Nathalie', 'Sophie', 'Claire', 'Émilie', 'Sandrine', 'Céline', 'Aurélie', 'Camille', 'Julie', 'Catherine', 'Valérie', 'Hélène', 'Laure', 'Agnès', 'Nadia', 'Marion', 'Élodie', 'Anne', 'Pauline', 'Christine', 'Delphine', 'Sabrina', 'Mathilde', 'Véronique', 'Florence', 'Léa', 'Karine', 'Muriel', 'Inès'];
  const LAST = ['Martin', 'Bernard', 'Dubois', 'Girard', 'Bonnet', 'Fontaine', 'Rousseau', 'Chevalier', 'Mercier', 'Blanc', 'Guerin', 'Faure', 'Gauthier', 'Perrin', 'Roche', 'Brun', 'Arnaud', 'Ferrand', 'Vial', 'Rey', 'Jacquier', 'Buisson', 'Chabert', 'Allemand', 'Michallet', 'Cotte', 'Bouvier', 'Pellet', 'Reynaud', 'Gros', 'Chapuis', 'Berthier', 'Mollard', 'Durand', 'Benali', 'Morel', 'Garnier', 'Lambert', 'Rossi', 'Haddad', 'Collomb', 'Pinel', 'Sauvage', 'Vincent', 'Carrel', 'Dumas', 'Tissot', 'Ravix'];

  // Médias fictifs calqués sur les archétypes réels
  const MEDIAS = [
    { id: 'dauph', name: 'Le Dauphinois', kind: 'Quotidien régional', lean: 0, reach: { RET: 0.6, RUR: 0.5, PERI: 0.4, POP: 0.3, CAD: 0.3, JUD: 0.15 }, fact: 0.3, scoop: 0.3 },
    { id: 'alpes3', name: 'Alpes 3', kind: 'Télévision régionale', lean: 0, reach: { RET: 0.5, RUR: 0.4, PERI: 0.3, POP: 0.3, CAD: 0.2, JUD: 0.1 }, fact: 0.3, scoop: 0.2 },
    { id: 'radio', name: 'Radio Isère', kind: 'Radio locale', lean: 0, reach: { PERI: 0.3, RET: 0.3, CAD: 0.25, RUR: 0.25, POP: 0.2, JUD: 0.15 }, fact: 0.3, scoop: 0.2 },
    { id: 'ventilo', name: 'Le Ventilo', kind: 'Journal satirique grenoblois', lean: -40, reach: { JUD: 0.35, CAD: 0.15, POP: 0.05, RET: 0.03, PERI: 0.03, RUR: 0.02 }, fact: 0.5, scoop: 0.5 },
    { id: 'revel', name: 'Révélations', kind: 'Média d’investigation en ligne', lean: -25, reach: { CAD: 0.3, JUD: 0.35, RET: 0.1, POP: 0.08, PERI: 0.08, RUR: 0.05 }, fact: 0.9, scoop: 0.9 },
    { id: 'quotlib', name: 'Le Quotidien libéral', kind: 'Quotidien national', lean: 25, reach: { CAD: 0.35, RET: 0.25, JUD: 0.1, PERI: 0.1, POP: 0.04, RUR: 0.08 }, fact: 0.6, scoop: 0.5 },
    { id: 'info24', name: 'Info 24', kind: 'Chaîne d’info en continu', lean: 45, reach: { RET: 0.4, POP: 0.3, PERI: 0.35, RUR: 0.3, CAD: 0.15, JUD: 0.08 }, fact: 0.15, scoop: 0.4 }
  ];
  const INSTITUTS = [
    { id: 'opinia', name: 'Opinia', house: { RN: 1.2, LFI: -0.8 } },
    { id: 'harmonie', name: 'Harmonie Sondages', house: { REN: 1, ECO: -0.6 } },
    { id: 'panel', name: 'Panel Alpes', house: { LR: 1, DIV: 0.8, PS: 0.5 } }
  ];

  const STAFF_ROLES = {
    dircamp: { l: 'Directeur·rice de campagne', d: '+20 % d’efficacité des actions de campagne' },
    com: { l: 'Directeur·rice de la communication', d: 'Meilleure couverture presse, gestion de crise' },
    plume: { l: 'Plume', d: 'Discours et débats plus percutants' },
    mandataire: { l: 'Mandataire financier', d: 'Obligatoire pour encaisser des dons de campagne' },
    juriste: { l: 'Conseil juridique', d: 'Réduit les risques judiciaires' },
    terrain: { l: 'Responsable terrain', d: 'Porte-à-porte et militants plus efficaces' },
    cm: { l: 'Community manager', d: 'Portée accrue sur X' }
  };


  // Catalogue de propositions (équilibré entre sensibilités). cph = coût €/habitant/an (local) ; md = coût en milliards €/an (national, négatif = recette)
  const CATALOGUE = [
    { id: 'l_police', level: 'local', t: 'Doubler la police municipale et installer la vidéoprotection', th: 'securite', ax: { aut: 45 }, cph: 12, g: ['RET', 'PERI'], l: ['JUD'], cred: 62 },
    { id: 'l_bio', level: 'local', t: 'Cantine 50 % bio et locale dans toutes les écoles', th: 'ecologie', ax: { ecol: -30 }, cph: 6, g: ['JUD', 'CAD'], l: [], cred: 64 },
    { id: 'l_transco', level: 'local', t: 'Gratuité des transports scolaires', th: 'pouvoir_achat', ax: { eco: -30 }, cph: 8, g: ['POP', 'PERI'], l: [], cred: 58 },
    { id: 'l_tf', level: 'local', t: 'Baisser la taxe foncière de 5 % dès la première année', th: 'fiscalite', ax: { eco: 35 }, cph: 10, g: ['RET', 'PERI', 'CAD'], l: ['POP'], cred: 52 },
    { id: 'l_sante', level: 'local', t: 'Ouvrir un centre de santé municipal avec des médecins salariés', th: 'sante', ax: { eco: -25 }, cph: 9, g: ['RET', 'POP', 'RUR'], l: [], cred: 60 },
    { id: 'l_velo', level: 'local', t: '20 km de pistes cyclables sécurisées', th: 'transports', ax: { ecol: -35 }, cph: 7, g: ['JUD', 'CAD'], l: ['PERI'], cred: 63 },
    { id: 'l_parking', level: 'local', t: 'Stationnement gratuit la première heure en centre-ville', th: 'transports', ax: { ecol: 30 }, cph: 4, g: ['PERI', 'RET', 'RUR'], l: ['JUD'], cred: 66 },
    { id: 'l_bp', level: 'local', t: 'Budget participatif : 5 % de l’investissement décidé par les habitants', th: 'institutions', ax: { inst: 20 }, cph: 3, g: ['JUD', 'CAD'], l: [], cred: 68 },
    { id: 'l_hlm', level: 'local', t: '25 % de logements sociaux dans chaque programme neuf', th: 'logement', ax: { eco: -30 }, cph: 5, g: ['POP', 'JUD'], l: ['RET', 'CAD'], cred: 57 },
    { id: 'l_zero', level: 'local', t: 'Aucune hausse d’impôts locaux sur tout le mandat', th: 'fiscalite', ax: { eco: 25 }, cph: 0, g: ['RET', 'PERI'], l: [], cred: 55 },
    { id: 'l_commerce', level: 'local', t: 'Racheter les commerces vacants pour revitaliser le centre', th: 'economie', ax: { eco: -10 }, cph: 5, g: ['RET', 'PERI', 'RUR'], l: [], cred: 59 },
    { id: 'l_services', level: 'local', t: 'Une permanence de services publics dans chaque quartier et hameau', th: 'institutions', ax: { inst: -10 }, cph: 3, g: ['RUR', 'RET', 'POP'], l: [], cred: 65 },
    { id: 'n_retraite', level: 'national', t: 'Revenir à la retraite à 62 ans', th: 'economie', ax: { eco: -45 }, md: 15, g: ['POP', 'RET', 'PERI'], l: ['CAD'], cred: 42 },
    { id: 'n_smic', level: 'national', t: 'Porter le SMIC à 1 600 € net', th: 'pouvoir_achat', ax: { eco: -40 }, md: 8, g: ['POP', 'JUD'], l: ['CAD'], cred: 45 },
    { id: 'n_tva', level: 'national', t: 'TVA à 5,5 % sur l’énergie et les carburants', th: 'pouvoir_achat', ax: { ecol: 35, eco: -10 }, md: 12, g: ['PERI', 'RUR', 'POP'], l: ['JUD'], cred: 48 },
    { id: 'n_depenses', level: 'national', t: 'Réduire les dépenses publiques de 30 milliards', th: 'economie', ax: { eco: 50 }, md: -30, g: ['CAD'], l: ['POP', 'RET'], cred: 50 },
    { id: 'n_fortune', level: 'national', t: 'Impôt plancher de 2 % sur les très grandes fortunes', th: 'fiscalite', ax: { eco: -40 }, md: -10, g: ['POP', 'JUD'], l: ['CAD'], cred: 55 },
    { id: 'n_prod', level: 'national', t: 'Baisser les impôts de production de 10 milliards', th: 'industrie', ax: { eco: 40 }, md: 10, g: ['CAD', 'PERI'], l: [], cred: 56 },
    { id: 'n_quotas', level: 'national', t: 'Référendum sur l’immigration et quotas annuels', th: 'immigration', ax: { souv: 50, soc: 20 }, md: 0.3, g: ['POP', 'PERI', 'RET', 'RUR'], l: ['JUD', 'CAD'], cred: 50 },
    { id: 'n_regul', level: 'national', t: 'Régulariser les travailleurs sans papiers des métiers en tension', th: 'immigration', ax: { souv: -40 }, md: 0.2, g: ['JUD'], l: ['POP', 'RET'], cred: 58 },
    { id: 'n_planif', level: 'national', t: 'Planification écologique : 30 milliards par an d’investissements verts', th: 'ecologie', ax: { ecol: -50 }, md: 30, g: ['JUD', 'CAD'], l: ['RUR'], cred: 47 },
    { id: 'n_nucleaire', level: 'national', t: 'Construire 14 nouveaux réacteurs nucléaires', th: 'industrie', ax: { ecol: 30, souv: 20 }, md: 6, g: ['CAD', 'RET', 'PERI'], l: ['JUD'], cred: 61 },
    { id: 'n_prison', level: 'national', t: 'Peines planchers et 20 000 places de prison', th: 'securite', ax: { aut: 50 }, md: 2, g: ['RET', 'PERI', 'RUR'], l: ['JUD'], cred: 57 },
    { id: 'n_ric', level: 'national', t: 'Instaurer le référendum d’initiative citoyenne', th: 'institutions', ax: { inst: 45 }, md: 0.1, g: ['POP', 'PERI', 'RUR'], l: ['CAD'], cred: 60 },
    { id: 'n_fdv', level: 'national', t: 'Légaliser une aide à mourir strictement encadrée', th: 'societe', ax: { soc: -45 }, md: 0, g: ['JUD', 'CAD'], l: ['RET'], cred: 66 },
    { id: 'n_snu', level: 'national', t: 'Service civique obligatoire de trois mois', th: 'education', ax: { aut: 25, soc: 15 }, md: 2, g: ['RET'], l: ['JUD'], cred: 54 }
  ];

  // Taille des conseils municipaux (art. L2121-2 CGCT)
  function councilSize(pop) {
    const t = [[100, 7], [500, 11], [1500, 15], [2500, 19], [3500, 23], [5000, 27], [10000, 29], [20000, 33], [30000, 35], [40000, 39], [50000, 43], [60000, 45], [80000, 49], [100000, 53], [150000, 55], [200000, 59], [250000, 61], [300000, 65]];
    for (const [lim, n] of t) if (pop < lim) return n;
    return 69;
  }
  function adjIndemnity(pop) { // net mensuel approximatif d'un·e adjoint·e (taux maximaux légaux de l'indice brut terminal, ~4 030 € brut)
    const t = pop < 500 ? 9.9 : pop < 1000 ? 10.7 : pop < 3500 ? 19.8 : pop < 10000 ? 22 : pop < 20000 ? 27.5 : pop < 50000 ? 33 : pop < 100000 ? 44 : 66;
    return Math.round(4030 * t / 100 * 0.84 / 10) * 10; }
  function mayorIndemnity(pop) { // net mensuel approximatif
    if (pop < 1000) return 900; if (pop < 3500) return 1500; if (pop < 10000) return 2000; if (pop < 20000) return 2400;
    if (pop < 50000) return 3100; if (pop < 100000) return 3900; return 4500;
  }

  return { quizMatch, quizGaps, QUIZ_P, QUIZ_T, QUIZ_POOL, PERSO_POOL, CATALOGUE, AXES, PARTIES, PARTY_IDS, BLOCS, SEGS, SEG_IDS, TYPE_MIX, TYPE_LABEL, CIRCOS, COMMUNES, VILLAGES, com, NATIONAL, METIERS, QUIZ, LIKERT, TRAITS, PERSO, THEMES, KEYWORDS, FIRST_M, FIRST_F, LAST, MEDIAS, INSTITUTS, STAFF_ROLES, councilSize, mayorIndemnity, adjIndemnity };
})();
