# Spec — Tranche K : Événements dynamiques & mécaniques de terrain

**Date** : 2026-09-03
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Tranche** : K — Événements dynamiques + mécaniques de terrain (rattrapage GDD arcane, item 1)
**Statut** : Design à implémenter (validé en session)

---

## 1. Objectif

Donner au monde de la **variété de run** : chaque entrée de biome peut être modifiée par un
**événement** (buffs/malus temporaires inspirés de `fait/event.md`) et certains biomes contiennent
des **zones de terrain dangereuses** (lave, glace, poison — backlog `biomes.md` « mécaniques de
terrain »). L'objectif est que deux visites du même biome ne se jouent pas à l'identique.

**Critère de réussite** : on entre dans un biome → un bandeau peut annoncer un événement actif
(« Vent fort », « Sol glissant »…) qui modifie réellement le gameplay (le joueur est poussé, glisse,
subit un DoT…). Les biomes à terrain (volcan, banquise, marais toxiques…) ont des zones au sol qui
infligent dégâts/glissade. Couvert par des tests `core/` déterministes.

---

## 2. Événements dynamiques (monde)

### 2.1 Tirage

- À la **génération d'un monde de biome** (`generateBiomeWorld`), on tire un événement avec une
  probabilité `EVENT_CHANCE = 0.35`, via le `rng` du monde (déterministe en test).
- Le niveau de gravité dépend du **rang du biome** (table `EVENT_TABLE[tier]`) : un biome F ne peut
  recevoir que des événements légers, un biome S peut recevoir jusqu'à « très difficile ».
  Pondérations inspirées de `event.md` : léger 35 %, constaté 25 %, dur 18 %, très difficile 12 %,
  presque impossible 7 %, impossible 3 % (les niveaux extrêmes réservés aux rangs hauts).
- Un événement ne s'applique **pas** au Sanctuaire (`spawn`, zone sûre) ni au Nexus (déjà modifié).

### 2.2 Modèle (core)

```ts
// src/core/events.ts
type EventSeverity = 1 | 2 | 3 | 4 | 5 | 6; // léger → impossible
interface WorldEventDef {
  id: string; name: string; severity: EventSeverity;
  effects: EventEffects;
}
interface EventEffects {
  wind?: { dx: number; dy: number; force: number }; // pousse le joueur (vent)
  playerFrictionMul?: number;   // <1 = glisse plus (sol glissant / verglas)
  playerDps?: number;           // DoT constant sur le joueur (poison, pluie acide)
  enemyAtkMul?: number;         // ennemis plus agressifs/forts
  enemySpeedMul?: number;
  lootMul?: number;             // chance de drop ×
  visionRadius?: number;        // rayon de visibilité (rendu scène, 0 = normal)
}
```

- `World` gagne `eventId: string | null`. La def est résolue par `getWorldEvent(id)`.
- Liste de départ (extensible) : `vent_fort` (1), `brume_legere` (1), `chance_voyageur` (1),
  `sol_glissant` (2), `pluie_acide` (2), `frenesie` (3), `brouillard_dense` (3),
  `tempete` (4), `zone_corrompue` (5). Chaque id = nom FR affiché + effets.

### 2.3 Application (tickWorld)

- `wind` : ajoute `force * dt` à la vélocité du joueur à chaque tick (clampé à `maxSpeed`), après
  le mouvement — le joueur doit lutter contre le vent.
- `playerFrictionMul` : appliqué au `cfg.friction` du mouvement joueur (sol glissant).
- `playerDps` : DoT sur le joueur via `hurtPlayer(w, dps*dt, 0)` avec cadence interne (toutes les
  0.5 s, i-frames gérés par `hurtPlayer`) — jamais létal en godmode, respecte l'esquive/bouclier.
- `enemyAtkMul` / `enemySpeedMul` : multiplient les stats **résolues** des ennemis/boss **à leur
  création** (l'événement est tiré par `generateBiomeWorld` avant le spawn → connu d'avance ;
  plus simple et plus pur que de modifier l'IA au tick).
- `lootMul` : multiplie `BALANCE.dropChance` lors des drops (`spawnLootDrop`).
- `visionRadius` : champ purement informatif pour la scène (cercle de brouillard autour du joueur).

### 2.4 Rendu (BiomeScene)

- Si `world.eventId` : le HUD de la scène affiche en permanence « ⚡ <nom de l'événement> »
  (lecture simple du bandeau : pas de timer, l'info reste visible tant que l'événement dure).
- `visionRadius` < normal → **voile sombre plein écran** (rect scrollFactor 0, depth 50) dont
  l'opacité dépend du rayon : brouillard dense (≤150) très opaque, brume légère (>150)
  semi-transparente. Lecture simple du « cercle de vision » : le monde reste visible mais
  assombri (pas de mask circulaire dans cette tranche).

---

## 3. Mécaniques de terrain (zones par biome)

### 3.1 Modèle (core)

```ts
// src/core/terrain.ts
type TerrainKind = "lava" | "ice" | "poison" | "spikes";
interface TerrainZone { id: number; kind: TerrainKind; x: number; y: number; w: number; h: number; }
```

- `World` gagne `terrain: TerrainZone[]` (init `[]` dans `defaultWorldState`).
- Table data `BIOME_TERRAIN: Record<string, TerrainKind[]>` : `volcano → ["lava"]`,
  `ice_floe / salines_gelees / toundra → ["ice"]`, `toxic_marsh / marais_poix / marais_luminescent → ["poison"]`,
  `catacombs / steppe_ossements → ["spikes"]`, `geole_foudre → []` (réservé), etc. — chaque biome
  concerné déclare ses kinds ; les autres n'ont pas de terrain.

### 3.2 Génération (generateBiomeWorld)

- Si le biome déclare des kinds : génère 2..4 zones rectangulaires (60..160 px de côté), placées par
  `freeSpawn`-like **en évitant** : entrée joueur, sortie, entrées de donjon (elles doivent rester
  franchissables). Le Sanctuaire n'a jamais de terrain.
- Les zones sont stockées dans `world.terrain`.

### 3.3 Effets (tickWorld)

- Pour chaque zone, test joueur dedans (`point-in-rect` avec rayon) :
  - `lava` / `poison` : DoT joueur (`hurtPlayer` cadencé ~0.4 s ; lava = dégâts bruts plus forts que
    poison). Le joueur subit aussi un léger knockback de sortie pour lave (optionnel, simple).
  - `ice` : pendant que le joueur est dans la zone, `frictionMul` réduit (glisse) — même mécanisme
    que l'événement sol glissant, appliqué via un multiplicateur commun.
  - `spikes` : comme lava (dégâts), sans teinte de zone au sol (réservé donjons/salles).
- Les ennemis ignorent le terrain (pas d'IA de contournement dans cette tranche — simple).

### 3.4 Rendu (BiomeScene)

- Zones dessinées sous les entités : lava = orange/rouge translucide, poison = vert translucide,
  ice = bleu pâle translucide, spikes = gris clair hachuré simple. La gfx sol existante dessine les
  rects avant les murs/entités.

---

## 4. Fichiers touchés

- **Nouveau** : `src/core/events.ts` (defs + tirage + résolution), `src/core/terrain.ts` (kinds +
  table biome + helpers rect), tests `tests/events.test.ts`, `tests/terrain.test.ts`.
- **Modifiés** : `src/core/world.ts` (champs `eventId`/`terrain`, application dans `tickWorld`),
  `src/core/generate.ts` (tirage événement + génération zones), `src/core/biomes.ts` (rien si la
  table terrain reste dans `terrain.ts`), `src/game/scenes/BiomeScene.ts` (bandeau + zones + vision).

## 5. Hors périmètre (tranche suivante)

Événements globaux multi-joueurs, contrôles inversés (nécessite input map), glitch écran,
événements en donjon (réservés aux modificateurs de la tranche L).
