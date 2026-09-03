# Spec — Tranche I : Panneau Admin (outils dev)

**Date** : 2026-06-10
**Statut** : Scope approuvé (panneau **dédié** DOM ouvert par F2 ; couvre économie/progression, classes,
monde/déblocage, combat/Nexus).

## 1. Objectif

Un **panneau d'administration / test** dédié, séparé du panneau debug F1, pour piloter tout le contenu
(or, XP/niveaux/stats/compétences, classes, déblocage du monde, spawn de boss/ennemis, accès Nexus) en
un clic. But : tester rapidement les tranches D→H sans grind.

## 2. Forme

- Overlay **DOM** `createAdminPanel()` (même pattern que `debugPanel.ts`), créé **une seule fois**
  (garde par `getElementById`), **persistant entre scènes**, basculé par **F2** (window keydown,
  `preventDefault`). Style cohérent (boîte sombre monospace, à gauche pour ne pas masquer le debug à droite).
- Contenu = sections avec **boutons** + quelques **champs nombre** (montant or, n niveaux, niveau Nexus).
- Un petit **journal** (dernière action) en bas du panneau.

## 3. Logique testable — `core/admin.ts`

Fonctions pures sur `Player` (RNG injecté si besoin) :
- `giveGold(player, n)` — `player.gold += n`.
- `grantLevels(player, n)` — fait gagner n niveaux via `addXp` (points de stat/compétence cohérents).
- `giveStatPoints(player, n)` / `giveSkillPoints(player, n)`.
- `unlockAllSkills(player)` — pour la classe courante, met chaque nœud de `SKILL_TREES[class]` à `maxRank`
  dans `player.skills` (no-op si pas de classe).
- `healFull(player)` — `health.hp = maxHp` ; énergie au max.
Réutilise l'existant : `setClass`, `respec`, `addXp`, `allocStat`.

## 4. Session

- `unlockEverything()` — marque **tous** les biomes (`SPAWN_BIOME` + `BIOMES`) comme `cleared` **et**
  `identified` (⇒ carte ouverte, rang S validé ⇒ Nexus débloqué, PNJ S/Ω débloqués).
- `identifyAll()` — marque tous les biomes `identified` (révèle la carte sans tout nettoyer).

## 5. Pont scène — `game/debug/adminBridge.ts`

Découple le panneau DOM des actions qui exigent la scène active :
```
interface AdminSceneHooks { spawnBoss(): string; spawnEnemies(n): string; killAll(): string; gotoNexus(): string; }
setAdminHooks(h | null) ; getAdminHooks(): hooks | null
```
- `BiomeScene.create()` appelle `setAdminHooks({...})` (closures sur la scène) ; `shutdown` → `setAdminHooks(null)`.
- Les boutons Combat/Nexus appellent `getAdminHooks()` ; si `null` (ex. carte), ils affichent « (entre dans un biome) ».
- Hooks réutilisent la logique existante : spawn boss = `makeBoss(bossForTier(tier), tier, …)` ;
  spawnEnemies = logique de `/spawn` ; killAll = `/kill` ; gotoNexus = `scene.start("biome", { nexus: true })`.

## 6. Intégration `BiomeScene`

- `createAdminPanel()` en `create()` (après `createDebugPanel`).
- `setAdminHooks(...)` en `create()`, `setAdminHooks(null)` au `shutdown`.
- Le panneau mute le **joueur persistant** (`getPlayer()`) → reflété au HUD à la frame suivante. Pas de pause requise (overlay DOM, comme F1).

## 7. Tests (core + session, déterministes)

- `giveGold` ajoute ; `grantLevels(p, 3)` → `level += 3`, points de stat/compétence crédités.
- `giveStatPoints`/`giveSkillPoints` ajoutent.
- `unlockAllSkills` : après `setClass`, tous les nœuds de l'arbre sont à `maxRank` ; no-op sans classe.
- `healFull` : PV/énergie au max.
- `session.unlockEverything()` → `isUnlocked` vrai pour des biomes externes, `isNexusUnlocked()` vrai,
  `hasClearedRank("S")` vrai. `identifyAll()` → `isIdentified` vrai partout.

## 8. Definition of Done

F2 ouvre/ferme le panneau ; chaque bouton agit (or/niveaux/stats/compétences/classe/respec/unlock skills/
heal/unlock monde/spawn boss/spawn ennemis/kill/nexus) ; boutons scène grisés hors biome. Tests verts, build OK.
`idea/admin.md`.

## 9. Hors périmètre

Édition live des courbes de tuning (déjà dans F1), persistance disque des cheats, auth/rôles admin réseau
(multijoueur, tranche K), rejouer/enregistrer des scénarios.
