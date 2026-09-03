# Spec — Tranche C2 : Boss

**Date** : 2026-06-08
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Tranche** : C2 (2ᵉ moitié de la tranche C ; s'appuie sur C1)
**Statut** : Design approuvé par l'utilisateur (design global tranche C)

---

## 1. Objectif

Un **framework de boss multi-phases** data-driven + **1 boss par rang (F→S)**, placé dans un
**biome-boss** par anneau. Le boss enchaîne des **patterns télégraphiés** (volée, anneau, charge,
invocation, zone), **change de phase** selon ses PV, **évite de répéter** le même pattern, et
expose une **fenêtre de faiblesse** (vulnérable après une charge). Barre de vie de boss +
télégraphes au rendu. Vaincre le boss = **biome nettoyé**.

**Critère de réussite** : entrer dans un biome-boss fait apparaître un boss nommé ; il attaque
selon des patterns télégraphiés, passe en phase 2/3 à PV bas (nouveaux patterns), devient
vulnérable après ses charges ; le vaincre nettoie le biome (et débloque la suite de l'anneau).
Logique `core/` testée déterministe (RNG injecté).

---

## 2. Biomes-boss (1 par rang)

Un biome existant par rang est désigné biome-boss (constante `BOSS_BIOME` : tier → biomeId) :
`F: cave`, `E: dark_woods`, `D: toxic_marsh`, `C: ruins`, `B: volcano`, `A: abyss`,
`S: trone_dieu_endormi`. Entrer dans un biome-boss : **aucun ennemi régulier**, un **boss** au centre-haut.

---

## 3. Modèle de données

`core/bosses.ts` :
- `PatternKind = "volley" | "ring" | "charge" | "summon" | "aoe"`.
- `PhaseDef { patterns: PatternKind[] }` (patterns disponibles dans la phase, du début à PV bas).
- `BossDef { id, name, tier, biomeId, intro: string, phases: PhaseDef[] }` (2-3 phases).
- `BOSSES: BossDef[]` (7, un par rang ; **généré par workflow** : nom + intro + composition de phases).
- `bossForBiome(biomeId): BossDef | null`.
- `BASE_BOSS_HP = 400` ; `resolveBossStats(tier)` → `{ maxHp: round(400 × hpMult), contactDamage, radius: 28 }`.

`core/boss.ts` (état runtime + IA) :
- `Boss { id, name, transform, health, radius, tier, phases, phaseIndex, state, stateTimer, currentPattern, lastPattern, weaknessTimer, telegraph }`.
  - `state ∈ "cooldown" | "telegraph" | "execute" | "weakness"`.
  - `telegraph: { kind, x, y, radius, dirX, dirY, progress } | null` (lu par le rendu).
- `World.boss: Boss | null`.
- `makeBoss(def, tier, x, y, rng)`.
- `updateBoss(boss, w, t, dt)` : machine à états ci-dessous.

---

## 4. IA de boss (machine à états)

- **Phase** : `phaseIndex = clamp(floor((1 - hp/maxHp) × phases.length), 0, phases.length-1)`
  (recalculée chaque tick ; passe en phase suivante quand les PV chutent).
- **cooldown** : attend `cooldownTime` (≈1.1 s) puis choisit un pattern de la phase courante,
  **différent de `lastPattern`** si possible → passe en **telegraph**.
- **telegraph** : prépare le pattern (durée par pattern), expose `telegraph` pour le rendu
  (cercle pour `aoe`, ligne de direction pour `charge`, halo pour les tirs). Puis **execute**.
- **execute** : applique l'effet du pattern, mémorise `lastPattern`. Si `charge` → enchaîne sur
  **weakness** ; sinon → **cooldown**.
- **weakness** (après charge) : le boss s'immobilise `weaknessTime` (≈1.3 s) et subit **×1.5 dégâts**
  (géré à l'application des dégâts au boss) → invite à punir ; puis **cooldown**.
- Pendant tout cela, le boss s'oriente/se déplace lentement vers le joueur en `cooldown`.

**Patterns** (dégâts scalés par rang) :
- **volley** : 5 projectiles `enemy` en éventail (~50°) vers le joueur.
- **ring** : 12 projectiles `enemy` répartis sur 360°.
- **charge** : télégraphe (~0.7 s, direction figée vers le joueur), puis ruée rapide (≈380 px/s,
  0.45 s) ; dégâts de contact ; puis fenêtre de faiblesse.
- **summon** : invoque 3 sbires (archétypes C1, scalés au rang) dans `w.enemies`.
- **aoe** : télégraphe un cercle (rayon ~90) à la position du joueur (~0.9 s), puis dégâts si le
  joueur est dans le cercle.

---

## 5. Intégration combat & rendu

- `world.ts` : les attaques **joueur** touchent aussi le boss — la mêlée (`targetsInArc`) et les
  projectiles `player` incluent `w.boss` ; les dégâts au boss sont **×1.5 en weakness**.
  `updateBoss` appelé dans `tickWorld` ; boss mort → `w.boss = null` (+ event).
- `generate.ts` : biome-boss → `w.boss = makeBoss(...)`, `enemies = []` (les sbires viennent du pattern summon).
- `BiomeScene` : rendu du boss (gros sprite `enemy_boss` teinté), **barre de vie de boss** en haut
  avec nom + phase, **télégraphes** (cercle rouge pour aoe, trait pour charge, halo en telegraph),
  teinte « vulnérable » en weakness. **Nettoyage** : un biome-boss est nettoyé quand `w.boss` devient
  null (au lieu de `enemies.length === 0`).

---

## 6. Tests (core, déterministes ; RNG injecté)

- **bosses** : `BOSSES` a 1 boss par rang (7), `bossForBiome` mappe les 7 biomes-boss ; chaque boss a
  1-3 phases avec ≥1 pattern ; `resolveBossStats` scale les PV par rang.
- **boss/phases** : `phaseIndex` augmente quand les PV chutent (full → phase 0 ; bas → dernière phase).
- **boss/patterns** : `volley`/`ring` créent des projectiles `enemy` ; `summon` ajoute des ennemis ;
  `charge` enchaîne sur `weakness` ; `aoe` blesse le joueur s'il reste dans le cercle, pas s'il sort.
- **boss/anti-répétition** : deux patterns consécutifs diffèrent (quand la phase a ≥2 patterns).
- **boss/weakness** : les dégâts au boss sont amplifiés en weakness.
- **generate** : biome-boss → `w.boss != null` et `w.enemies` vide ; biome normal → `w.boss == null`.
- **world** : la mêlée/les projectiles du joueur réduisent les PV du boss ; boss à 0 PV → `w.boss = null`.

Vérif : `npm test` + `npm run build` ; ressenti via `npm run dev`.

---

## 7. Definition of Done

- 7 boss (1/rang) dans leur biome-boss, multi-phases, patterns télégraphiés, anti-répétition, faiblesse.
- Barre de vie + télégraphes au rendu ; vaincre le boss nettoie le biome (intègre le déverrouillage d'anneau).
- Tests `core` verts (bosses/boss/generate/world + existants) ; build OK.

---

## 8. Hors périmètre

Les **5 boss Ω nommés** (Architecte/Chronos/Néant/Dragon/Entité) et leurs mécaniques d'arène
spéciales/musique = endgame (plus tard). IA de boss « adaptative » avancée au-delà de l'anti-répétition.
Drops/loot de boss = tranche D.
