# Tranche C2 — Boss — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Framework de boss multi-phases (patterns télégraphiés, anti-répétition, faiblesse) + 1 boss par rang dans un biome-boss ; vaincre le boss nettoie le biome.

**Architecture:** `core/bosses.ts` (défs générées + `BOSS_BIOME` + `resolveBossStats`), `core/boss.ts` (`Boss`, `makeBoss`, `updateBoss` FSM + patterns), `World.boss`, intégration combat (mêlée/projectiles joueur touchent le boss, ×1.5 en faiblesse), rendu (barre de vie + télégraphes).

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest.

> Réf. spec `docs/superpowers/specs/2026-06-08-tranche-c2-boss-design.md`. Les boss (nom/intro/phases) sont générés par le workflow `gen-bosses` puis figés dans `core/bosses.ts`.

---

## Task 1: core/bosses.ts (défs + biomes-boss + stats)

**Files:** Create `game/src/core/bosses.ts` — Test `game/tests/bosses.test.ts`

- [ ] **Implémenter** : `PatternKind`, `PhaseDef`, `BossDef {id,name,tier,biomeId,intro,phases}`, `BOSS_BIOME: Record<Tier,string>` (`F:cave,E:dark_woods,D:toxic_marsh,C:ruins,B:volcano,A:abyss,S:trone_dieu_endormi`), `BOSSES: BossDef[]` (généré, 7), `bossForBiome(id)`, `BASE_BOSS_HP=400`, `resolveBossStats(tier) → {maxHp,contactDamage,projDamage,aoeDamage,radius:28}` (scalé via `TIER_SCALING`).
- [ ] **Test** : 7 boss (1/rang) ; `bossForBiome` mappe les 7 biomes-boss ; chaque boss a 1-3 phases avec ≥1 pattern ; `resolveBossStats("S").maxHp > resolveBossStats("F").maxHp`.
- [ ] Commit `feat(core): boss defs + boss biomes + stats`.

---

## Task 2: core/boss.ts (Boss + makeBoss + updateBoss)

**Files:** Create `game/src/core/boss.ts` — Test `game/tests/boss.test.ts`

- [ ] **`Boss extends Entity`** + champs : `name, tier, phases, phaseIndex, state("cooldown"|"telegraph"|"execute"|"weakness"), stateTimer, currentPattern, lastPattern, telegraph(BossTelegraph|null), chargeDir, chargeTimer, contactDamage, projDamage, aoeDamage, aoePos`.
- [ ] **`makeBoss(def, tier, x, y)`** : `makeEntity` + stats résolues + state "cooldown", stateTimer cooldown.
- [ ] **`updateBoss(boss, w, t, dt)`** : recalcul `phaseIndex` ; FSM (cooldown→approche lente + choix pattern ≠ lastPattern ; telegraph→prépare + expose `telegraph` ; execute→effet ; charge→ruée puis weakness ; weakness→immobile). Patterns : volley (éventail 5 proj. `enemy`), ring (12 proj. 360°), charge (ruée télégraphiée + contact), summon (3 sbires `makeEnemy`), aoe (cercle télégraphié à la position du joueur, dégâts si dedans). `hitPlayer` local (dégâts + i-frame 0.12 + event, respecte godMode).
- [ ] **Tests** (RNG injecté) : phaseIndex monte quand PV chutent ; volley/ring créent des projectiles `enemy` ; summon ajoute des ennemis ; charge → state weakness ; aoe blesse si le joueur reste, pas s'il sort ; 2 patterns consécutifs diffèrent (phase ≥2 patterns).
- [ ] Commit `feat(core): boss FSM + patterns`.

---

## Task 3: world.ts + generate.ts — intégration

**Files:** Modify `game/src/core/world.ts`, `game/src/core/generate.ts` ; Update tests

- [ ] **world.ts** : `World.boss: Boss | null` (createWorld → null) ; `tickWorld` : après les ennemis, `if (w.boss) { updateBoss(...); if (isDead(w.boss)) { event ; w.boss = null; } }`. Mêlée joueur : si `w.boss` dans l'arc et pas déjà touché ce swing → dégâts (×1.5 si `state==="weakness"`), `melee.hitIds.add(boss.id)`. Projectiles `player` : touchent aussi `w.boss` (×1.5 en weakness, respect pierce).
- [ ] **generate.ts** : `const bossDef = bossForBiome(biome.id);` → si présent, `boss = makeBoss(bossDef, tier, w/2, 120)` et **pas d'ennemis réguliers** ; sinon spawn normal. Retourner `boss`.
- [ ] **Tests** : generate biome-boss → `w.boss != null`, `w.enemies` vide ; biome normal → `w.boss == null`. world : mêlée/projectile réduit les PV du boss ; boss à 0 → `w.boss = null`.
- [ ] Commit `feat(core): integrate boss into world/generate`.

---

## Task 4: rendu — sprite boss + barre de vie + télégraphes

**Files:** Modify `game/src/assets/manifest.ts`, `game/src/game/scenes/BiomeScene.ts`

- [ ] **manifest** : `{ key: "enemy_boss", shape: "circle", color: 0xb03a3a, size: 56 }`.
- [ ] **BiomeScene** : rendre le boss (sprite `enemy_boss`, teinte « vulnérable » dorée en weakness) ; **barre de vie de boss** fixée en haut (nom + phase + jauge PV) ; **télégraphes** depuis `w.boss.telegraph` (cercle rouge translucide pour `aoe`, trait directionnel pour `charge`, halo pour les tirs) ; **nettoyage** : biome-boss nettoyé quand `w.boss` passe de non-null à null (suivre `hadBoss`).
- [ ] **Build** `npm run build` → OK. Commit `feat(game): boss rendering (health bar + telegraphs)`.

---

## Task 5: Bake des boss + vérif finale

- [ ] **Bake** les 7 boss générés (`gen-bosses`) dans `BOSSES` (script `/tmp/bake-bosses.mjs`).
- [ ] `npm test` → vert ; `npm run build` → OK.
- [ ] **README** : section Monde — « biome-boss par rang : un boss multi-phases garde l'anneau ».
- [ ] Commit `feat(game): tranche C2 — boss`.

---

## Auto-revue (couverture spec)

- §2 biomes-boss → Tasks 1,3 ✔ ; §3 modèle → Tasks 1,2 ✔ ; §4 FSM/patterns → Task 2 ✔ ;
  §5 intégration/rendu → Tasks 3,4 ✔ ; §6 tests → Tasks 1-3 ✔ ; §7 DoD → Task 5 ✔.

Types cohérents : `PatternKind`, `PhaseDef`, `BossDef`, `BOSS_BIOME`, `resolveBossStats`, `Boss`,
`makeBoss`, `updateBoss`, `World.boss`, `bossForBiome` — utilisés à l'identique.
