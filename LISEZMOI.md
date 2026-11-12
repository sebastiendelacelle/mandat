# Mandat — version site web

Cette version tourne hors de claude.ai : un site statique (GitHub Pages) et Firebase pour les sauvegardes et le multijoueur. Les deux sont gratuits à l'échelle d'un groupe d'amis.

Compter 20 minutes, une seule fois.

## 1. Créer le projet Firebase

1. Aller sur https://console.firebase.google.com et cliquer **Créer un projet** (nom : `mandat`, Google Analytics inutile).
2. **Authentication** › Commencer › onglet **Sign-in method** : activer **Anonyme**, puis **Google**.
3. **Firestore Database** › Créer une base de données › emplacement **eur3 (europe)** › mode **production**.
4. Onglet **Règles** de Firestore : remplacer tout le contenu par celui du fichier `firestore.rules`, puis **Publier**.
5. **Paramètres du projet** (roue dentée) › **Vos applications** › icône **Web `</>`** › nom `Mandat web` › Enregistrer.
   Firebase affiche un bloc `firebaseConfig = { apiKey: …, … }`.
6. Ouvrir `js/firebase-config.js` et y recopier ces six valeurs à la place des `REMPLACER`.

Ces valeurs ne sont pas secrètes : ce sont les règles de sécurité (étape 4) qui protègent les données.

## 2. Mettre le site en ligne avec GitHub Pages

1. Créer un compte sur https://github.com si besoin, puis **New repository** : nom `mandat`, **Public**.
2. Dans le dépôt : **Add file › Upload files**, glisser `index.html` et le dossier `js` (avec `firebase-config.js` complété). **Commit changes**.
3. **Settings › Pages** › Source : **Deploy from a branch**, branche `main`, dossier `/ (root)` › Save.
   Après une ou deux minutes, le site est en ligne à l'adresse `https://VOTRE-NOM.github.io/mandat/`.
4. Retour dans Firebase › **Authentication › Settings › Domaines autorisés** › ajouter `VOTRE-NOM.github.io`.
   Sans cette étape, la connexion Google est refusée.

## 3. Partager

Envoyer l'adresse du site. Chacun peut jouer tout de suite, sans compte. Le bouton **Se connecter avec Google** de l'accueil permet de retrouver ses parties sur un autre téléphone ou ordinateur.

Pour récupérer une partie commencée dans claude.ai, ouvrir la partie dans l'artefact, puis **Plus › Carnet › Sauvegarde › Copier la sauvegarde**. Sur le site, cliquer **Importer** en bas de l'accueil et coller.

## Ce qui change par rapport à claude.ai

- Les fonctions qui appelaient Claude (rédaction libre de propositions, interviews improvisées) passent en mode scripté : le jeu reste complet, avec des textes préécrits.
- Les sauvegardes sont dans Firestore, liées au compte (anonyme ou Google), et recopiées dans le navigateur.

## Mettre à jour le jeu

Remplacer les fichiers du dossier `js` dans GitHub (Upload files, même nom). Ne pas écraser `firebase-config.js`.
