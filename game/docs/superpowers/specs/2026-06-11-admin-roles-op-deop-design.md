# Design — Octroi des droits admin : bouton de profil + `/op` / `/deop`

> Tranche : **Admin / rôles de compte** (indépendante du lore)
> Date : 2026-06-11 · Branche cible : `feat/game-topdown-controller`

## 1. Objectif

Permettre de **promouvoir / rétrograder un compte au rôle `admin`** de deux façons :

1. Un **bouton sur le profil d'un joueur** dans la catégorie « Utilisateurs » de la console
   d'administration.
2. Deux **commandes de chat in-game** : **`/op <user>`** (donne admin) et
   **`/deop <user>`** (retire admin).

## 2. Acquis — le backend existe déjà

- Rôles : `admin` / `operator` / `player` (`server/accounts.ts`).
- `setRole(accts, user, role)` : change le rôle, **refuse de rétrograder le dernier admin**,
  lève le ban si promotion admin. Déjà **testé** (`tests/playerSave.test.ts`).
- Endpoint **`PUT /api/players/:user/role`** protégé par `requireAdmin` (403 si l'appelant
  n'est pas admin). Client API : `setRole(token, user, role)` (`src/admin/api.ts`).
- La table des comptes (`src/admin/main.ts` → `accountsTable()`) affiche déjà un `<select>`
  de rôle par ligne.

→ **Aucune logique serveur nouvelle.** On ajoute une **UI** et deux **commandes**.

## 3. Bouton sur le profil (console admin)

Dans `accountsTable()` (`src/admin/main.ts`), à côté des actions existantes
(Bannir/Débannir/Avertir), ajouter **un bouton explicite** par compte :

- Si `role !== "admin"` → bouton **« Promouvoir admin »** (classe `primary`) →
  `await setRole(tok(), user, "admin")` puis `refresh()`.
- Si `role === "admin"` → bouton **« Retirer admin »** (classe `danger`) →
  `await setRole(tok(), user, "player")` puis `refresh()`.
- Les erreurs serveur (ex. « dernier admin ») s'affichent comme les autres actions (le
  `<select>` de rôle existant reste en place ; le bouton est un raccourci plus visible).

C'est une **modification UI pure** ; pas de nouvel endpoint ni de logique testable côté core.

## 4. Commandes `/op` et `/deop` (in-game)

- `/op <user>` → `PUT /api/players/<user>/role { role: "admin" }`
- `/deop <user>` → `PUT /api/players/<user>/role { role: "player" }`

### Autorisation

- L'appel utilise le **token du joueur courant** (`getToken()` de `authStore`).
- Le serveur applique `requireAdmin` : si l'appelant n'est pas admin → **403**, la commande
  répond `Système: réservé à l'admin`. **Aucune vérif de rôle côté client** (le serveur fait
  foi ; le client n'a pas besoin de connaître son rôle).

### Asynchronicité (chat)

`runCommand` est synchrone et renvoie une string affichée immédiatement. Pour une commande
réseau :

1. Valider l'argument `<user>` localement (présent + `USERNAME_RE`). Si invalide → message
   synchrone `Système: usage : /op <pseudo>`.
2. Lancer le `fetch` (non bloquant) et **renvoyer un accusé** `Système: /op <user>…`.
3. À la résolution, **`pushChat("Système: …")`** (succès : « <user> est désormais admin » ;
   erreur : message du serveur, ex. 403 / dernier admin / compte inconnu).

### Net helper

- Nouveau petit module jeu `src/game/net/roleClient.ts` :
  `setUserRole(user: string, role: "admin" | "player"): Promise<{ ok: boolean; error?: string }>`
  → `fetch("/api/players/<user>/role", { method:"PUT", headers:{Authorization:Bearer <token>}, body:{role} })`.
  (N'importe **pas** le bundle admin ; même endpoint, appel autonome.)

### Registre

- Ajouter `/op` et `/deop` à `COMMANDS` (`src/core/commands.ts`) pour les suggestions et
  `/help` (usage : `/op <pseudo>` · `/deop <pseudo>`).
- Helper pur `parseUserCommand(args): { user } | { error }` (présence + `USERNAME_RE`) dans
  `src/core/commands.ts` ou `src/core/summon.ts`, **testé**.

## 5. Fichiers

| Fichier | Rôle | Nature |
|---|---|---|
| `src/admin/main.ts` | bouton « Promouvoir admin » / « Retirer admin » par ligne de compte | UI |
| `src/core/commands.ts` | entrées `/op`, `/deop` + `parseUserCommand` (validation pseudo) | **pur, testé** |
| `tests/commands.test.ts` | parsing `/op`/`/deop` (pseudo manquant/invalide/valide) | **Vitest** |
| `src/game/net/roleClient.ts` | `setUserRole(user, role)` via l'endpoint existant | TS |
| `src/game/scenes/BiomeScene.ts` | `case "op"` / `case "deop"` : valide, appelle `roleClient`, accusé + `pushChat` au retour | Phaser |
| `game/idea/admin.md` + `game/README.md` | doc des commandes `/op`/`/deop` + bouton | doc |

## 6. Hors périmètre

- Gestion fine `operator` via commande (on cible `admin`↔`player` ; `operator` reste géré par
  le `<select>` du panel).
- Journalisation/audit des promotions (au-delà des invariants existants de `setRole`).

## 7. Questions ouvertes (défauts proposés)

1. **`/deop` rétrograde vers quoi ?** → **Défaut : `player`**. (Option : `operator`.)
2. **Qui peut taper `/op` en jeu ?** → seulement un compte **admin** (imposé par le serveur).
   Les non-admins reçoivent `réservé à l'admin`.
