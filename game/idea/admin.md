🛠️ ADMIN / OUTILS DEV

🐞 PANNEAU DEBUG LOCAL — touche **F1** (`src/game/debug/debugPanel.ts`)
Overlay DOM en jeu : sliders de *tuning* (vitesse, accel, friction, dash, blink, dégâts mêlée/tir) +
toggles **godmode / hitboxes / vecteur vitesse / FPS**. Local, sans connexion.

🌐 CONSOLE D'ADMINISTRATION WEB — touche **F2** (page séparée + connexion)
F2 ouvre **`/admin.html`** dans un nouvel onglet : une vraie **console d'admin** avec **compte**.

- **Backend Node** `game/server/` (port 8787) : authentification + comptes + relais temps réel.
  - Compte par défaut **admin / admin1234** (mot de passe **hashé bcrypt**, rôle `admin`), stocké dans
    `server/data/accounts.json` (gitignored, créé au 1er lancement).
  - API : `POST /api/login` (→ jeton JWT), `GET/POST/DELETE /api/accounts` (réservé rôle admin).
  - **WebSocket `/ws`** : relaie les commandes admin → jeu et les snapshots d'état jeu → admin.
- **Vite** sert le jeu **et** la page admin, et **proxifie** `/api` + `/ws` vers `:8787` (même origine).
- **Menu latéral** avec 11 pages (chacune au niveau faisable pour un jeu solo ; les capacités multijoueur
  sont marquées « tranche K ») :
  1. **Gestion des joueurs** : comptes (liste, recherche, rôle, **ban/kick/warn**, suppression), **création
     de compte**, édition en direct du joueur connecté (or/niveaux/stats/soin/godmode).
  2. **Modération** : actions rapides (soin/godmode/tuer), **avertir** un joueur, **logs en direct**.
  3. **Serveur** : métriques **RAM/uptime** (+ en ligne/comptes/Node), liste des **sauvegardes**.
  4. **Économie** : or total en circulation, prix/récompenses/drop (balance).
  5. **Gameplay** : tuning + difficulté (× PV/dégâts ennemis, × XP) + flags.
  6. **Permissions** : rôles des comptes (admin/operator/player).
  7. **Logs & historique** : journal d'événements en direct (zones, morts…).
  8. **Contenu** : parcours des armes/armures/sets/biomes/boss (lecture).
  9. **Statistiques** : comptes par rôle, en ligne, or total.
  10. **IDs de référence** : dump complet de tous les identifiants (recherche).
  11. **Commandes** : liste des commandes admin et leur effet.
- Backend : présence par compte (le jeu s'identifie au WS via son jeton), modération
  (`/api/players/:user/{role,ban,unban,kick,warn,save}`), métriques (`/api/metrics`), saves (`/api/saves`).
  Sanctions et bannissement stockés sur le compte (`server/accounts.ts`).

🔑 COMPTES JOUEURS & CONNEXION (jeu)
- Le jeu **exige une connexion** : page de connexion/inscription au lancement (`src/game/auth/loginGate.ts`),
  case **« rester connecté »** (localStorage si cochée, sinon sessionStorage — `src/shared/authStore.ts`).
- `POST /api/register` crée un compte **player** ; **sauvegarde par compte** via `GET/PUT /api/save`
  (`server/saves.ts`, fichier `server/data/saves/<user>.json`). Auto‑save + sauvegarde à la mort / à la sortie.
- `session.serialize()/hydrate()` (joueur + biomes nettoyés/identifiés + record Nexus) ;
  client : `src/game/net/saveClient.ts`. Barre **Déconnexion** en jeu.
- État du jeu (or, niveau, classe, PV…) et indicateurs **serveur / jeu connecté** affichés en direct.

▶️ LANCEMENT
**`npm run dev`** lance le **jeu ET le serveur** ensemble (jeu seul : `npm run dev:game` ; serveur seul :
`npm run server`). Puis dans le jeu, **F2** → connexion **admin / admin1234**.
⚠️ Sans serveur lancé, le login renvoie **HTTP 500** (le proxy Vite ne joint pas le backend).

🧩 ARCHITECTURE
- Protocole partagé : `src/core/adminProtocol.ts` (`AdminCommand`, `GameState`, `validateCommand`).
- Logique pure testée : `src/core/admin.ts`, `src/core/balance.ts`, `server/accounts.ts`, `server/token.ts`.
- Client jeu : `src/game/net/adminClient.ts` (applique les commandes, envoie l'état) ; actions de scène via
  le pont `src/game/debug/adminBridge.ts`. Page admin : `admin.html` + `src/admin/`.

⚠️ SÉCURITÉ : outil **dev local**. L'auth est réelle (bcrypt + JWT) mais le serveur n'est pas durci pour
une exposition publique — à faire tourner en local.

💡 IDÉES À VENIR
- Téléport vers un biome précis ; donner une arme/armure entièrement custom
- Édition de contenu (ennemis/biomes) ; rôles plus fins ; HTTPS / durcissement (si exposition réseau)
