# Spec — Console d'administration web (backend + comptes)

**Date** : 2026-06-10
**Statut** : Scope approuvé. Vrai backend Node + comptes serveur ; compte par défaut **admin / admin1234**,
création d'autres comptes possible ; **F2 ouvre la page admin** (remplace le panneau DOM) ; couvre
Joueur, Monde & combat, Réglages live (tuning) et Contenu & économie ; pilotage du jeu **en direct**.

## 1. Objectif

Une **console web d'administration** séparée, protégée par **connexion**, qui pilote le jeu en cours
**en temps réel** et permet de « tout gérer » sans toucher au code.

## 2. Topologie (même origine en dev → pas de CORS)

- **Backend Node** `game/server/` sur `:8787` (API auth + comptes + relais WebSocket).
- **Vite** `:5173` sert le **jeu** et la **page admin** (`/admin.html`) et **proxifie** `/api` + `/ws`
  vers `:8787` (`vite.config.ts` → `server.proxy`). Un seul port à ouvrir.
- **F2** (et un bouton en jeu) ouvrent `/admin.html` dans un nouvel onglet. F1 (debug) conservé.
  Le panneau DOM admin (`adminPanel.ts`) est retiré.

## 3. Backend `game/server/` (TypeScript, lancé via `tsx`)

Dépendances : `express`, `ws`, `bcryptjs`, `jsonwebtoken` (+ `tsx`, `concurrently`, `@types/*` en dev).

- **Comptes** : `server/data/accounts.json` (gitignored), créé au 1er lancement avec
  `admin` / `admin1234` (hash **bcrypt**), rôle `admin`. Module **pur testable** `server/accounts.ts` :
  `loadAccounts`, `seedIfEmpty`, `verify(user, pass)`, `createAccount`, `deleteAccount` (jamais le dernier admin).
- **Token** : module pur `server/token.ts` (JWT HMAC-SHA256, `sign({user,role})`, `verify`) — secret depuis
  `ADMIN_JWT_SECRET` ou défaut dev.
- **API** (`server/index.ts`) :
  - `POST /api/login {username,password}` → `{token, role}` (401 sinon).
  - `GET /api/accounts` / `POST /api/accounts {username,password,role}` / `DELETE /api/accounts/:user`
    — **auth requise + rôle `admin`** (middleware Bearer token).
- **WebSocket `/ws`** : à la connexion, le client s'annonce `{role:"game"}` ou `{role:"admin", token}`.
  Token admin invalide → fermeture. Relais : tout message d'un admin (commande) est diffusé aux clients
  `game` ; tout message d'un client `game` (snapshot d'état) est diffusé aux clients `admin`.
- **Protocole** : module pur `server/protocol.ts` (types `AdminCommand`, `GameState`, `validateCommand`).

## 4. Page admin `game/admin.html` + `game/src/admin/`

- **Connexion** : formulaire identifiant/mot de passe → `POST /api/login` → token en `sessionStorage`.
- **Tableau de bord** (après login), onglets :
  - **Joueur** : or, Omganium, niveaux, points stat/compétence (champs + boutons), soin, godmode,
    donner arme (type+tier), donner set d'armure, classe + « tout l'arbre », respec.
  - **Monde & combat** : tout débloquer / identifier, spawn boss, spawn N ennemis, tuer tous, aller au Nexus.
  - **Réglages live (tuning)** : sliders/inputs (vitesse, accel, friction, dégâts mêlée/tir, dash, blink…) + flags.
  - **Contenu & économie** : `dropChance`, `omganiumMult`, `shopPriceMult`, `enemyHpMult`, `enemyDamageMult`,
    `goldMult`, `xpMult`.
  - **Comptes** (admin) : lister / créer / supprimer.
- **État live** : panneau affichant le snapshot reçu (or, niveau, classe, PV, biome…) + statut connexion
  (jeu connecté ? serveur ?).
- Chaque action envoie une `AdminCommand` sur le WS. Le tableau de bord reste utilisable même si aucun
  jeu n'est connecté (les commandes seront appliquées dès qu'un jeu se connecte ? non : sans client jeu,
  les commandes sont ignorées — un indicateur prévient « aucun jeu connecté »).

## 5. Client jeu `game/src/game/net/adminClient.ts`

- Se connecte à `/ws` comme `game` (best-effort ; échec silencieux si serveur absent — le jeu tourne normalement).
- **Applique les commandes** reçues via un **dispatcher** réutilisant : `core/admin` (gold/levels/stats/skills/heal),
  `session` (unlock/identify), `core/balance` (économie/contenu), le `tuning`/`flags` (réglages live), et les
  **hooks de scène** `adminBridge` (spawn/boss/kill/nexus). Donner arme/armure → `addWeapon`/`makeArmor`.
- **Envoie un snapshot** d'état (or, niveau, classe, PV/maxHp, statPoints, biome, nexus…) ~2×/s.
- Branché au démarrage (`main.ts`) sur le joueur persistant + connecté aux hooks de scène existants.

## 6. `core/balance.ts` (contenu/économie pilotable sans code)

Objet mutable exporté `BALANCE = { dropChance:0.35, omganiumMult:1, shopPriceMult:1, enemyHpMult:1,
enemyDamageMult:1, goldMult:1, xpMult:1 }` (défauts = comportement actuel) + `setBalance(patch)`.
Lecture :
- `loot.ts` : `DROP_CHANCE` → `BALANCE.dropChance` ; `omganiumChance` ×`BALANCE.omganiumMult`.
- `shop.ts` : `itemValue` ×`BALANCE.shopPriceMult` ; `goldReward`/`bossGoldReward` ×`BALANCE.goldMult`.
- `world.ts` : `makeEnemy` applique `enemyHpMult`/`enemyDamageMult` ; XP gagnée ×`BALANCE.xpMult`.

## 7. Lancement

- `npm run server` (tsx `server/index.ts`), `npm run dev` (Vite). `npm run dev:all` = les deux (`concurrently`).
- `vite.config.ts` : proxy `/api` (http) + `/ws` (ws) → `:8787`.
- README : section « Console d'administration » (lancer, se connecter admin/admin1234, F2).

## 8. Tests (vitest, déterministes)

- `server/accounts.ts` : seed admin ; verify bon/mauvais mot de passe ; create/delete ; refus de supprimer
  le dernier admin.
- `server/token.ts` : sign→verify round-trip ; rejet d'un token falsifié/expiré.
- `server/protocol.ts` : `validateCommand` accepte les commandes valides, rejette les invalides.
- `core/balance.ts` : défauts ; `setBalance` patch ; `loot`/`shop` lisent BALANCE (ex. dropChance modifié
  change `DROP_CHANCE` effectif ; shopPriceMult change `itemValue`).

## 9. Definition of Done

`npm run server` + `npm run dev` ; F2 ouvre `/admin.html` ; login admin/admin1234 ; le tableau de bord
pilote un jeu connecté en direct (joueur/monde/combat/tuning/économie) ; création/suppression de comptes ;
état live affiché. Tests verts, build OK (jeu **et** serveur), `idea/admin.md` mis à jour.

## 10. Hors périmètre

Déploiement public / HTTPS / durcissement réseau ; édition de contenu arbitraire (renommer ennemis, créer
des biomes) ; multijoueur (tranche K) ; persistance de l'état de jeu côté serveur.
