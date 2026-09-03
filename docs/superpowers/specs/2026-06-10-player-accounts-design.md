# Spec — Comptes joueurs, connexion obligatoire & « rester connecté »

**Date** : 2026-06-10
**Statut** : Scope approuvé. **Connexion obligatoire** pour jouer (page de connexion en premier, pas de
mode hors-ligne). Comptes joueurs (inscription/login), **progression sauvegardée par compte** côté
serveur. Case **« rester connecté »** (cochée = persiste via localStorage ; décochée = le temps de la
session). L'admin peut créer/gérer les comptes (dont des comptes joueurs). Réutilise le backend existant.

## 1. Stockage de session partagé — `src/shared/authStore.ts`

`saveToken(token, remember)` → `localStorage` si « rester connecté », sinon `sessionStorage`.
`getToken()` (cherche les deux), `clearToken()`, `getUser()/saveUser()`. Utilisé par le jeu **et** l'admin.

## 2. Backend (`server/` étendu)

- **Rôles** : `admin | operator | player`. `player` ne peut pas gérer les comptes.
- `POST /api/register {username,password}` → crée un compte **player** (self-service ; refuse les doublons).
- **Sauvegardes** (auth requise, middleware `requireAuth` = tout jeton valide) :
  - `GET /api/save` → `{ save }` (l'état stocké du user, ou `null`).
  - `PUT /api/save { save }` → écrit `server/data/saves/<user>.json` (gitignored). Module `server/saves.ts`
    (chemin sûr : nom de fichier dérivé du token, pas de l'entrée client).
- Gestion des comptes (admin) existante → la création accepte le rôle `player`.

## 3. Porte de connexion du jeu — `index.html` + `src/main.ts` + `src/game/auth/loginGate.ts`

- Au chargement : **aucun jeu lancé tant qu'on n'est pas authentifié.**
  - Si un jeton est présent → `GET /api/save` ; 200 → on hydrate la session et on **démarre le jeu** ;
    401 → jeton effacé, on montre la connexion ; serveur injoignable → message « serveur injoignable —
    lance `npm run dev` » (pas de jeu, **pas de mode hors-ligne**).
  - Sinon → overlay **Connexion / Inscription** (onglets) + case **« rester connecté »**.
- À la réussite (login ou register+login) → charge la sauvegarde → démarre le jeu.
- **Barre de compte** en jeu (overlay DOM discret) : « 👤 <user> · Déconnexion ». Déconnexion =
  sauvegarde immédiate puis `clearToken()` + rechargement de la page (retour à la connexion).

## 4. Sauvegarde / chargement — `src/game/session.ts`

- `serialize(): SaveData` = `{ v:1, player, cleared:[], identified:[], nexusBest }`.
- `hydrate(data)` : remplace player (fusion avec `createPlayer()` pour les champs manquants),
  reconstruit `cleared`/`identified` (Set), `nexusBest`. Ignore une sauvegarde de version `v` inconnue
  (repart à neuf).
- **Auto-save** (`src/game/net/saveClient.ts`) : `PUT /api/save` — déclenché périodiquement (~20 s),
  à la sortie vers la carte, et à la mort. Best-effort (échec réseau silencieux, sans bloquer le jeu).

## 5. Admin (`src/admin/`)

- Case **« rester connecté »** sur le login admin (réutilise `authStore`).
- Onglet **Comptes** : création avec rôle `player | operator | admin` ; liste affiche le rôle ;
  suppression (dernier admin protégé). Permet d'**ajouter des comptes joueurs depuis l'admin**.

## 6. Tests (vitest, déterministes)

- `authStore` : remember → localStorage ; sinon sessionStorage ; getToken lit les deux ; clear vide tout.
- `server/accounts` : rôle `player` créable ; register refuse un doublon.
- `server/saves` : chemin de fichier sûr (sanitize du nom) ; round-trip écrit/lit.
- `session.serialize`/`hydrate` : round-trip conserve l'état clé ; version inconnue → état neuf ;
  champs manquants → complétés par `createPlayer()`.

## 7. Definition of Done

Le jeu **exige une connexion** (page de connexion d'abord, inscription possible, « rester connecté »
fonctionnel) ; la progression est **sauvegardée et rechargée par compte** ; l'admin crée/gère les comptes
joueurs ; déconnexion propre. Tests verts, build OK (jeu + admin), `idea/admin.md` mis à jour.

## 8. Hors périmètre

Durcissement réseau public / HTTPS ; reset de mot de passe ; e-mail ; multijoueur temps réel (tranche K) ;
anti-triche serveur (les saves sont autoritaires côté client, c'est un jeu solo).
