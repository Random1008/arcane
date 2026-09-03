# Spec — Tranche F : Donjons (ramifiés)

**Date** : 2026-06-10
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Statut** : Scope approuvé (salles ramifiées ; mini-boss + coffre garanti)

---

## 1. Objectif

Transformer les **entrées de donjon** (aujourd'hui de simples marqueurs) en **instances ramifiées** :
un petit graphe de salles à explorer (combat + culs-de-sac à trésor), terminé par un **mini-boss** et
un **coffre garanti**. Réutilise tout le combat/rendu/HUD existant (BiomeScene en *mode donjon*).

**Critère de réussite** : marcher sur une entrée de donjon lance le donjon ; on nettoie des salles
(les portes s'ouvrent), on explore des embranchements (coffres secrets), on bat un mini-boss qui fait
apparaître un coffre garanti + un portail de sortie ; le loot reste après la sortie. Logique `core/` testée.

---

## 2. Graphe de donjon — `core/dungeon.ts`

- `RoomKind = "start" | "normal" | "treasure" | "boss"`.
- `Dir = "N" | "S" | "E" | "W"`.
- `DungeonRoom { id, gx, gy, kind, depth, doors: { dir: Dir; to: number }[], cleared: boolean }`.
- `Dungeon { rooms: DungeonRoom[]; startId: number; bossId: number }`.
- `generateDungeon(biome, rng) → Dungeon` :
  - grille ; carve un **arbre** par croissance aléatoire (depuis `start`) jusqu'à `roomCount = 5 + indexTier`
    (max 9) ; chaque nouvelle salle est reliée à une salle existante adjacente (portes réciproques).
  - `depth` = distance en salles depuis `start`. `boss` = la salle de profondeur max (la plus loin).
    Les autres **feuilles** (1 seule porte, hors start) deviennent `treasure`. Le reste = `normal`.
- Helpers : `opposite(dir)`, `roomById(d, id)`.

## 3. Salle = un World — `core/dungeon.ts` + `world.ts`

- `World` gagne `doors: Door[]` et `chests: Chest[]`.
  - `Door { id; pos; dir; to; open }` (porte vers une salle voisine ; `open` quand la salle est nettoyée).
  - `Chest { id; pos; radius; opened; rank }` (coffre ; `rank` = biais de loot).
- `generateRoomWorld(player, biome, dungeon, room, rng) → World` :
  - arène plus petite (ex. 900×640), murs légers (sauf près des portes), pas de PNJ ni de sortie de biome ni d'entrées de donjon.
  - ennemis du set du biome (`enemyTypesForBiome`), nombre = `2 + depth + indexTier` (0 pour `treasure`),
    archétype boss → `boss` via `makeBoss` pour la salle `boss`.
  - **portes** placées sur les bords selon `room.doors` (N haut-centre, S bas-centre, E/O milieux) ; `open=room.cleared`.
  - **coffre** : salle `treasure` → un coffre (rank = indexTier) au centre ; salle `boss` → coffre garanti
    posé à la mort du mini-boss (rank = indexTier + 2).
- Détection dans `tickWorld` (ou dans la scène) : joueur sur une **porte ouverte** → `doorReached = to` ;
  joueur sur un **coffre** non ouvert → l'ouvrir (drop de loot). Une salle est **nettoyée** quand ses
  ennemis sont morts (et le mini-boss vaincu pour la salle boss) → ouvre ses portes + (boss) coffre + portail de sortie.

## 4. Mode donjon — `BiomeScene`

- `init({ dungeon: { biomeId } })` (ou un flag) : construit le `Dungeon`, génère la salle `start`, `this.world` = ce World.
- **Contrôleur** : `dungeon: Dungeon | null`, `roomCache: Map<number, World>`, `currentRoomId`.
  - **Transition** : joueur sur une porte ouverte → charge la salle voisine (cache ou génère), place le
    joueur **devant la porte opposée**, met à jour `currentRoomId`. L'état nettoyé persiste (cache).
  - **Nettoyage de salle** : quand la salle courante n'a plus d'ennemis (ni boss vivant) → `room.cleared = true`,
    ouvre ses portes (et celles réciproques des voisines en cache).
  - **Salle boss vaincue** → coffre garanti + **portail de sortie** ; marcher dessus → retour `worldmap`.
- Rendu : **portes** (rectangles aux bords : gris verrouillé / accent ouvert + flèche), **coffres**
  (carrés dorés, ouverts = ternes), **portail de sortie** (cercle). HUD donjon : nom + `Salle x/total` + profondeur.
- **Mort** en donjon : respawn Sanctuaire (perte 20%, existant) → quitte le donjon.

## 5. Tests (core, déterministes)

- **dungeon** : `generateDungeon` → graphe **connexe** ; exactement 1 `start`, 1 `boss` (profondeur max) ;
  ≥1 `treasure` ; portes **réciproques** (si A→B par N, B→A par S) ; `roomCount` scalé par rang.
- **room World** : `generateRoomWorld` crée les portes correspondant à `room.doors`, fermées si la salle
  n'est pas nettoyée ; salle `treasure` = 0 ennemi + 1 coffre ; salle `boss` → `world.boss != null`.
- **interaction** : ouvrir un coffre crée des drops ; marcher sur une porte ouverte fixe `doorReached`.

## 6. Definition of Done

Entrer dans un donjon depuis un biome ; explorer un graphe ramifié (combat, coffres secrets) ; portes
qui s'ouvrent au nettoyage ; mini-boss final + coffre garanti + portail de sortie ; loot conservé.
Tests `core` verts ; build OK. `idea/donjons.md` à jour.

---

## 7. Hors périmètre

Salles à énigmes/pièges scriptés, mini-cartes, donjons « infinis » (endgame = tranche G). Sauvegarde
de l'avancement d'un donjon entre sessions. Génération de salles très variées (réutilise le combat de biome).
