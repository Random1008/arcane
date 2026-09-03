# Spec — Tranche C1 : Ennemis variés & IA

**Date** : 2026-06-08
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Tranche** : C1 (1ʳᵉ moitié de la tranche C ; les boss = C2)
**Statut** : Design approuvé par l'utilisateur

---

## 1. Objectif

Remplacer l'unique ennemi « chaser » par un **système d'ennemis data-driven** : 5 **archétypes**
de comportement, une **IA** (approche / attaque mêlée ou distance / rage à PV bas), et des **sets
d'ennemis thématiques propres à chaque biome** (49). Tout réutilise l'existant (projectiles, mêlée,
dégâts, hitstun, collisions).

**Critère de réussite** : dans un biome, des ennemis **variés et nommés** apparaissent selon le
biome ; ils approchent, attaquent au contact ou tirent à distance, enragent à PV bas ; leur
résistance/nombre dépend du rang. Couvert par des tests `core/` déterministes.

---

## 2. Archétypes (5) + stats

`Archetype = "chaser" | "shooter" | "brute" | "swarmer" | "bomber"` (+ `"dummy"` pour la salle de test).
`ARCHETYPES: Record<Archetype, ArchetypeStats>` — stats de base multipliées ensuite par le rang.

| Archétype | hpMult | dmgMult | vitesse | rayon | comportement |
|---|---|---|---|---|---|
| chaser (Poursuiveur) | 1.0 | 1.0 | 120 | 14 | fonce, dégâts au contact |
| shooter (Tireur) | 0.7 | 0.8 | 95 | 13 | reste à portée (~260, recule sous ~170), tire des projectiles |
| brute (Brute) | 3.0 | 2.2 | 70 | 20 | lent, gros PV/dégâts, gros knockback (260) au contact |
| swarmer (Fileur) | 0.4 | 0.6 | 185 | 10 | rapide, fragile, contact |
| bomber (Bombeur) | 0.6 | 2.5 | 150 | 13 | fonce et **explose** (AoE rayon 80) au contact/à la mort |

Constantes de base : `BASE_ENEMY_HP = 40`, `BASE_CONTACT_DMG = 5`.
`resolveEnemyStats(archetype, tier)` → `maxHp = round(40 × archHp × TIER_SCALING[tier].hpMult)`,
`contactDamage = round(5 × archDmg × TIER_SCALING[tier].dmgMult)`. La vitesse vient de l'archétype
(non scalée). Le **nombre** par zone = `TIER_SCALING[tier].count` (déjà en place).

Paramètres du tireur : `preferredRange 260`, `retreatRange 170`, `fireCadence 1.3 s`,
`projectileSpeed 300`, `projectileRadius 6`. Paramètres du bombeur : `explodeRadius 80`.

---

## 3. IA (machine à états par ennemi)

Appliquée à chaque ennemi (sauf `dummy`) dans `tickWorld` via `core/ai.ts` :
- **Rage** : si `hp/maxHp < 0.3` → vitesse ×1.4 et dégâts ×1.5 (teinte rouge au rendu).
- **chaser / brute / swarmer** : approche le joueur (mouvement avec collision) ; au contact
  (distance ≤ rayons + cadence `contactCadence`), inflige `contactDamage` + knockback.
- **bomber** : approche ; quand il est dans `explodeRadius` du joueur (ou meurt), **explose** :
  inflige les dégâts au joueur s'il est dans le rayon (+ knockback) puis meurt.
- **shooter** : se positionne (avance si trop loin, recule si trop près), et **tire** un projectile
  de faction `enemy` vers le joueur selon `fireCadence`.

**Projectiles ennemis** : `tickWorld` est étendu pour que les projectiles de faction `enemy`
touchent **le joueur** (et ceux de faction `player` les ennemis, comportement actuel). Respect des
i-frames.

---

## 4. Sets d'ennemis par biome (49)

`core/biomeEnemies.ts` : `EnemyType { name, archetype }` ; `BIOME_ENEMIES: Record<biomeId, EnemyType[]>`
couvrant les 49 biomes (2-3 types nommés et thématiques par biome, ex. *Loup affamé*=swarmer en Forêt,
*Golem de pierre*=brute en Montagnes). `enemyTypesForBiome(id)` renvoie le set (ou un set par défaut
`[{name:"Rôdeur", archetype:"chaser"}]` si absent). Contenu généré par **workflow** (un agent par rang)
puis figé en données.

`generate.ts` : au lieu de chasers, fait apparaître `count` ennemis, chacun d'un **type tiré au hasard**
dans le set du biome, avec stats résolues par archétype × rang. (Le Sanctuaire garde 0 ennemi.)

---

## 5. Modèle d'entité & rendu

- `Enemy` : remplace `kind` par `archetype: Archetype`, ajoute `name: string`, `speed: number`,
  `knockback: number`, `fireTimer: number` (cadence de tir). `contactDamage`/`contactTimer` conservés.
- Helper `makeEnemy(id, x, y, archetype, tier, name)` (dans `core/enemies.ts` ou `generate.ts`).
- `createWorld` (salle de test) : garde un `dummy` (archétype `dummy`, inerte) + un `chaser`.
- Rendu : un placeholder par archétype (manifeste : `enemy_chaser`, `enemy_shooter`, `enemy_brute`,
  `enemy_swarmer`, `enemy_bomber`, `enemy_dummy`) ; `sprites.ts` mappe `archetype → texture`.
  Teinte **rouge** quand l'ennemi est en rage. (Les **noms** restent en donnée — affichage bestiaire/loot
  plus tard, pas de label par ennemi pour éviter l'encombrement.)

---

## 6. Architecture

- `core/enemies.ts` (NEW) : `Archetype`, `ArchetypeStats`, `ARCHETYPES`, `resolveEnemyStats`, `makeEnemy`.
- `core/ai.ts` (NEW) : `updateEnemy(enemy, world, tuning, dt)` (FSM par archétype : mouvement, attaque,
  rage ; tir → push projectile `enemy` ; explosion bombeur).
- `core/biomeEnemies.ts` (NEW) : `EnemyType`, `BIOME_ENEMIES` (généré), `enemyTypesForBiome`.
- `core/world.ts` (MOD) : `Enemy` (archetype/name/speed/knockback/fireTimer) ; `tickWorld` délègue à
  `updateEnemy` ; projectiles `enemy` touchent le joueur ; filtre des morts généralisé.
- `core/generate.ts` (MOD) : spawn depuis `enemyTypesForBiome` + `resolveEnemyStats`.
- `game/assets/manifest.ts` (MOD) : placeholders par archétype.
- `game/render/sprites.ts` (MOD) : archetype → texture + teinte rage.

---

## 7. Tests (core, déterministes)

- **enemies** : `resolveEnemyStats` scale PV/dégâts par archétype × rang (brute S > chaser F).
- **ai/chaser** : approche puis inflige des dégâts au contact (respect i-frames).
- **ai/shooter** : maintient sa distance et crée un projectile `enemy` après `fireCadence`.
- **ai/bomber** : explose au contact → dégâts au joueur dans le rayon, puis meurt.
- **ai/rage** : à PV < 30 %, vitesse/dégâts augmentés.
- **projectiles ennemis** : un projectile `enemy` touche le joueur (hors i-frames), pas les ennemis.
- **biomeEnemies** : chaque biome a ≥1 type avec un nom non vide et un archétype valide ; `spawn` exclu.
- **generate** : la zone fait apparaître des ennemis tirés du set du biome (archétypes ∈ set).

Vérif : `npm test` + `npm run build` ; ressenti via `npm run dev`.

---

## 8. Definition of Done

- 5 archétypes jouables avec IA (approche/attaque/tir/explosion/rage) ; projectiles ennemis touchant le joueur.
- Sets d'ennemis thématiques pour les 49 biomes ; spawn varié et scalé par rang.
- Rendu distinct par archétype + teinte de rage ; tests `core` verts ; build OK.

---

## 9. Hors périmètre (→ C2 ou plus tard)

Boss (framework + 7 boss par rang) = **C2**. Loot/drops à la mort = tranche D. IA adaptative avancée,
pathfinding (évitement d'obstacles fin), bestiaire UI, sons.
