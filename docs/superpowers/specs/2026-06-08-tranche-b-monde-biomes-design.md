# Spec — Tranche B : Monde & biomes

**Date** : 2026-06-08
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Tranche** : B — Monde & biomes (s'appuie sur les tranches 0 et A)
**Statut** : Design approuvé par l'utilisateur

---

## 1. Objectif

Introduire le **monde** : une **carte** de 20 biomes classés F→S (F au centre, difficulté
croissante vers l'extérieur), des **zones de biome générées procéduralement**, et la navigation
carte ↔ biome. Les biomes sont **data-driven** (palette + ennemis + difficulté) et tous jouables
immédiatement, distingués visuellement par leurs couleurs (le pixel art se branchera dessus plus
tard). Le **joueur persiste** d'un biome à l'autre (hotbar/PV/énergie).

**Critère de réussite** : on lance `npm run dev`, on arrive sur la **carte du monde** (anneaux
F→S), on sélectionne un biome, on entre dans une **zone générée** (sol coloré, murs, ennemis
scalés selon le rang, sortie, entrées de donjon), on combat avec ses armes ramassées, on
**ressort vers la carte** ; en entrant dans un biome plus externe les ennemis sont plus coriaces.
Couvert par des tests `core/` déterministes.

---

## 2. Navigation — Carte du monde

- Écran **carte** : 20 biomes placés en **anneaux concentriques** selon leur rang
  (F au centre → S à l'extérieur). Placement calculé : `rayon = 60 + indexTier × 95`, biomes d'un
  même rang répartis également en angle.
- Sélection d'un biome (clic, ou flèches + Entrée) → entre dans sa zone (BiomeScene).
- Dans une zone : atteindre la **sortie** (portail) → retour carte. Touche **M / Échap** : retour
  carte immédiat.

---

## 3. Les 20 biomes (DATA)

`BiomeDef = { id, name, tier, palette {ground, wall, accent}, size {w,h}, dungeons (1..3) }`.

| Rang | Biomes (id) |
|---|---|
| F (4) | `plains` Plaines · `forest` Forêt · `cave` Caverne · `river` Rivière |
| E (3) | `swamp` Marais · `windy_hills` Collines venteuses · `dark_woods` Bois sombres |
| D (3) | `desert` Désert · `tundra` Toundra · `toxic_marsh` Marécage toxique |
| C (3) | `mountains` Montagnes · `jungle` Jungle · `ruins` Ruines |
| B (3) | `volcano` Volcan · `ice_floe` Banquise · `catacombs` Catacombes |
| A (2) | `abyss` Abysses · `sky_city` Cité céleste |
| S (2) | `void_rift` Faille du Néant · `fractured` Dimension fracturée |

Chaque biome a une **palette** (3 couleurs : sol / mur / accent) qui le distingue visuellement.
Les couleurs exactes sont définies dans `core/biomes.ts` (placeholders ; le pixel art les
remplacera via tuiles plus tard). `dungeons` = 1 à 3 selon le biome.

---

## 4. Difficulté par rang (scaling ennemis)

`TIER_SCALING : Record<Tier, { hpMult, dmgMult, count }>` :

| Tier | hpMult | dmgMult | count |
|---|---|---|---|
| F | 1.0 | 1.0 | 3 |
| E | 1.4 | 1.15 | 4 |
| D | 1.9 | 1.3 | 5 |
| C | 2.6 | 1.5 | 6 |
| B | 3.5 | 1.8 | 7 |
| A | 4.6 | 2.2 | 8 |
| S | 6.0 | 3.0 | 9 |

Ennemis = on **réutilise le chaser** (PV de base `BIOME_CHASER_HP = 40`, dégâts de contact de base
`5`), scalés : `hp = round(40 × hpMult)`, `contactDamage = round(5 × dmgMult)`, nombre = `count`.
Les chasers sont **teintés** par la palette du biome (côté rendu). Les vrais ennemis variés/IA
viennent en tranche C.

---

## 5. Génération procédurale d'une zone

`generateBiomeWorld(player, biome, rng) -> World` (déterministe pour un `rng` donné) :
- **Niveau** : `bounds` = `biome.size` ; **murs** = N rectangles dispersés (N tiré via `rng`),
  en évitant une zone de dégagement autour de l'entrée et des sorties.
- **Joueur** : placé à l'**entrée** (centre de la zone), position réinitialisée ; **PV/énergie/hotbar
  conservés** (même objet `Player`).
- **Ennemis** : `count` chasers (scalés, cf. §4) à des positions aléatoires éloignées du joueur,
  sur des cases libres.
- **Sorties** : ≥1 portail de sortie (`Exit`) vers la carte (placé en bord de zone).
- **Entrées de donjon** : `biome.dungeons` marqueurs (`DungeonEntrance`) — **rendus seulement**,
  sans comportement (remplis en tranche F).

---

## 6. Persistance du joueur

Refactor : séparer le **joueur persistant** du **monde par zone**.
- `createPlayer(): Player` — crée le joueur (hotbar `[fists]`, PV/énergie, capacités). Une seule fois.
- `createWorld(): World` — **conservé tel quel** (salle d'entraînement : mannequin + chaser + mur +
  pickup épée) ; utilise désormais `createPlayer()` en interne. Sert de fixture aux tests existants.
- `generateBiomeWorld(player, biome, rng): World` — nouveau chemin pour le jeu réel.
- Côté `game/` : un singleton de session (`game/session.ts`) détient le `Player` persistant,
  partagé entre `WorldMapScene` et `BiomeScene`. Les mutations (PV, hotbar) persistent par référence.

---

## 7. Architecture

Nouveaux modules `core/` :
- `core/biomes.ts` : `BiomePalette`, `BiomeDef`, `BIOMES` (20), `getBiome`, `TierScaling`, `TIER_SCALING`.
- `core/worldMap.ts` : `MapNode { biomeId, tier, x, y, ringRadius }`, `buildWorldMap()` (placement en anneaux).
- `core/generate.ts` : `Exit`, `DungeonEntrance` (réexportés de world.ts), `generateBiomeWorld(player, biome, rng)`.

`core/world.ts` modifié :
- Ajout `createPlayer()` (extraction depuis `createWorld`).
- `Enemy` gagne `contactDamage: number` ; `tickWorld` utilise `e.contactDamage` (au lieu de
  `t.chaser.contactDamage`) pour le contact.
- `World` gagne `exits: Exit[]`, `dungeonEntrances: DungeonEntrance[]`, `biome: BiomeDef | null`,
  `exitReached: boolean` ; `Exit`/`DungeonEntrance` définis ici (`{ id, pos, radius }`).
- `tickWorld` : détection de sortie — si le joueur chevauche une `Exit`, `world.exitReached = true`.
- `createWorld()` initialise ces champs (exits/dungeon vides, biome null, exitReached false).

Modules `game/` :
- `game/session.ts` : `getPlayer()` (lazy singleton), `resetSession()`.
- `game/scenes/WorldMapScene.ts` : rendu des 20 nœuds (cercles palette + nom + rang), sélection
  (clic / flèches+Entrée), → `scene.start("biome", { biomeId })`.
- `game/scenes/BiomeScene.ts` : génère la zone via `generateBiomeWorld`, exécute la boucle de jeu
  (réutilise input/render/hotbar/slash/debug/caméra des tranches 0/A), rend le **sol** (palette,
  grille discrète), **murs** (couleur mur), **ennemis teintés**, **sorties** et **marqueurs de
  donjon** ; retour carte quand `world.exitReached` ou touche M/Échap.
- `game/render/sprites.ts` : teinte des chasers selon la palette du biome (via `world.biome`).
- `main.ts` : scènes `[WorldMapScene, BiomeScene]`, démarre `WorldMapScene`.
- **`TrainingScene` supprimée** (remplacée par le flux carte ↔ biome). `createWorld()` reste pour
  les tests.

---

## 8. Tests (core, déterministes)

- **biomes** : `BIOMES.length === 20` ; tous les `tier` valides ; répartition (4/3/3/3/3/2/2) ;
  `getBiome` ok ; `TIER_SCALING.count` croît de F à S.
- **worldMap** : `buildWorldMap()` → 20 nœuds ; `ringRadius(F) < ringRadius(S)` ; 4 nœuds de rang F.
- **generate** : déterministe (même `rng` seedé → mêmes murs/positions) ; nombre d'ennemis ==
  `TIER_SCALING[tier].count` ; PV des ennemis d'un biome S > ceux d'un biome F ; ≥1 sortie ;
  `dungeonEntrances.length === biome.dungeons` ; le `Player` passé est **le même objet** (hotbar
  conservée) ; joueur placé sur une case libre (`canOccupy`).
- **world** : `exitReached` passe à true quand le joueur chevauche une sortie ; `createPlayer` →
  hotbar `[fists]` ; les tests combat/mouvement existants (via `createWorld`) restent verts.

Vérification : `npm test` + `npm run build` ; flux carte↔biome validé via `npm run dev`.

---

## 9. Definition of Done

- Carte du monde jouable (20 biomes en anneaux F→S), sélection → entrée dans un biome.
- Zone générée procéduralement (sol palette, murs, ennemis scalés, sortie, marqueurs donjon),
  jouable avec les armes ; retour carte (sortie / M-Échap).
- Difficulté croît vers l'extérieur ; joueur (hotbar/PV) persiste entre biomes.
- Tests `core/` verts (nouveaux + existants) ; build OK.

---

## 10. Hors périmètre (tranches ultérieures)

Mécaniques de terrain/dangers, vrais ennemis variés & IA (C), donjons jouables (F), loot/Ω (D),
déblocage progressif/économie de la carte, sauvegarde, polish visuel par biome (tuiles pixel art).
Le framework biome/monde fournit les fondations (BiomeDef, génération, scaling, persistance).
