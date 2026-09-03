# Tranche C1 — Ennemis variés & IA — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** 5 archétypes d'ennemis data-driven + IA (approche/attaque/tir/explosion/rage) + sets d'ennemis thématiques par biome (49), en remplaçant l'unique chaser.

**Architecture:** `core/enemies.ts` (archétypes + stats résolues), `core/ai.ts` (FSM `updateEnemy`), `core/biomeEnemies.ts` (sets générés), intégrés dans `world.ts`/`generate.ts` ; projectiles de faction `enemy` touchent le joueur ; rendu par archétype + teinte de rage.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest.

> Réf. spec `docs/superpowers/specs/2026-06-08-tranche-c1-ennemis-ia-design.md`. Les sets d'ennemis (noms + archétypes par biome) sont générés par le workflow `gen-enemy-sets` puis figés dans `core/biomeEnemies.ts`.

---

## Task 1: core/enemies.ts (archétypes + stats)

**Files:** Create `game/src/core/enemies.ts` — Test `game/tests/enemies.test.ts`

- [ ] **Test** :
```ts
import { describe, it, expect } from "vitest";
import { ARCHETYPES, resolveEnemyStats } from "../src/core/enemies";

describe("enemies", () => {
  it("a les 5 archétypes (+ dummy)", () => {
    for (const k of ["dummy", "chaser", "shooter", "brute", "swarmer", "bomber"]) {
      expect(ARCHETYPES[k as keyof typeof ARCHETYPES]).toBeTruthy();
    }
  });
  it("resolveEnemyStats scale par archétype × rang", () => {
    expect(resolveEnemyStats("chaser", "S").maxHp).toBeGreaterThan(resolveEnemyStats("chaser", "F").maxHp);
    expect(resolveEnemyStats("brute", "F").maxHp).toBeGreaterThan(resolveEnemyStats("chaser", "F").maxHp);
    expect(resolveEnemyStats("swarmer", "F").maxHp).toBeLessThan(resolveEnemyStats("chaser", "F").maxHp);
  });
});
```
- [ ] **Implémenter** (cf. §2 de la spec) : `Archetype`, `ArchetypeStats`, `ARCHETYPES`, `BASE_ENEMY_HP=40`, `BASE_CONTACT_DMG=5`, `ResolvedEnemyStats`, `resolveEnemyStats(archetype, tier)`. Importe `Tier` de `./combat/weapons` et `TIER_SCALING` de `./biomes`. **Aucune dépendance à world.ts.**
- [ ] **Run → PASS** ; **Commit** `feat(core): enemy archetypes + stats`.

---

## Task 2: world.ts — Enemy générique + makeEnemy + projectiles ennemis + délégation IA

**Files:** Modify `game/src/core/world.ts` ; Update `game/tests/world.test.ts`

- [ ] **`Enemy`** : remplacer `kind: EnemyKind` par `archetype: Archetype` ; ajouter `name: string`, `speed: number`, `knockback: number`, `fireTimer: number` (garder `contactTimer`, `contactDamage`). Importer `Archetype, resolveEnemyStats` de `./enemies` et `updateEnemy` de `./ai`.
- [ ] **`makeEnemy`** :
```ts
export function makeEnemy(id: number, x: number, y: number, archetype: Archetype, tier: Tier, name: string): Enemy {
  const s = resolveEnemyStats(archetype, tier);
  const base = makeEntity({ id, x, y, maxHp: s.maxHp, radius: s.radius, faction: "enemy" });
  return { ...base, archetype, name, speed: s.speed, knockback: s.knockback, contactTimer: 0, contactDamage: s.contactDamage, fireTimer: 0 };
}
```
  (Importer `Tier` de `./combat/weapons`.)
- [ ] **`createWorld`** : remplacer dummy/chaser par `makeEnemy` :
```ts
const dummy = makeEnemy(2, 700, 250, "dummy", "F", "Mannequin");
const chaser = makeEnemy(3, 900, 550, "chaser", "F", "Rôdeur");
```
  (dummy obtient maxHp 200 via hpMult 5 × tier F — conserve les tests existants ; contactDamage 0.)
- [ ] **`tickWorld`** : remplacer toute la boucle ennemie « chaser + contact » par :
```ts
  for (const e of w.enemies) updateEnemy(e, w, t, dt);
  w.enemies = w.enemies.filter((e) => e.archetype === "dummy" || !isDead(e));
```
- [ ] **Projectiles** : la boucle projectiles gère les 2 factions :
```ts
  for (const proj of w.projectiles) {
    tickProjectile(proj, dt);
    if (proj.faction === "enemy") {
      if (!proj.hitIds.has(p.id) && distance(proj.pos, p.transform.pos) <= proj.radius + p.radius) {
        if (!w.godMode && applyDamage(p, proj.damage, scale(normalize(proj.vel), 60))) {
          w.events.push({ x: p.transform.pos.x, y: p.transform.pos.y, amount: proj.damage, targetId: p.id, crit: proj.crit });
        }
        proj.life = 0;
      }
    } else {
      for (const e of w.enemies) {
        if (proj.hitIds.has(e.id)) continue;
        if (distance(proj.pos, e.transform.pos) <= proj.radius + e.radius) {
          if (applyDamage(e, proj.damage, scale(normalize(proj.vel), 80))) {
            proj.hitIds.add(e.id);
            w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: proj.damage, targetId: e.id, crit: proj.crit });
          }
          if (!proj.pierce) { proj.life = 0; break; }
        }
      }
    }
  }
  w.projectiles = w.projectiles.filter((proj) => !isExpired(proj));
```
- [ ] **Retirer** `EnemyKind` (ou `export type EnemyKind = Archetype;`). Garder `chaserMoveDir` import ? Non — déplacé dans ai.ts ; retirer l'import `chaserMoveDir` de world.ts s'il devient inutilisé.
- [ ] **Tests world** : mettre à jour `tests/world.test.ts` — les tests existants utilisent `createWorld` (dummy index 0 / chaser index 1) et ne référencent pas `.kind`, donc ils restent valides. Ajouter :
```ts
it("un projectile ennemi touche le joueur (hors i-frames), pas les ennemis", () => {
  const w = createWorld();
  const p = w.player;
  // projectile ennemi sur le joueur
  w.projectiles.push({ id: 5000, pos: { x: p.transform.pos.x, y: p.transform.pos.y }, vel: { x: 10, y: 0 }, life: 1, damage: 9, faction: "enemy", radius: 6, pierce: false, crit: false, hitIds: new Set() });
  const hp0 = p.health.hp;
  tickWorld(w, noInput(), DEFAULT_TUNING, 1 / 60);
  expect(p.health.hp).toBeLessThan(hp0);
});
```
- [ ] **Run** `npx vitest run tests/world.test.ts` → PASS ; **Commit** `feat(core): generic Enemy + enemy projectiles`.

---

## Task 3: core/ai.ts (FSM updateEnemy)

**Files:** Create `game/src/core/ai.ts` — Test `game/tests/ai.test.ts`

- [ ] **Implémenter** `updateEnemy(e, w, t, dt)` (cf. §3 spec) : rage (<30% PV → ×1.4 vitesse, ×1.5 dégâts) ; `dummy` no-op ; `shooter` se positionne (avance > preferredRange, recule < retreatRange, sinon strafe perpendiculaire) et tire un projectile `enemy` (cadence) ; `bomber` explose au contact (dégâts AoE au joueur dans `explodeRadius` puis meurt) ; `chaser/brute/swarmer` approchent + contact (cadence `t.chaser.contactCadence`). Mouvement via `applyMovementCollide` + `clampToBounds`. Respecte `godMode` (pas de dégâts au joueur) et i-frames (via `applyDamage`).
- [ ] **Tests** `tests/ai.test.ts` (monde minimal construit à la main ou via `createWorld`) :
```ts
import { describe, it, expect } from "vitest";
import { createWorld, makeEnemy, tickWorld } from "../src/core/world";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const noInput = () => ({ moveDir: v(0,0), aimPoint: v(0,0), attack: false, dash: false, blink: false, selectSlot: -1, scroll: 0, cycleTier: false });

describe("ai", () => {
  it("le tireur crée un projectile ennemi après sa cadence", () => {
    const w = createWorld();
    w.enemies = [makeEnemy(50, w.player.transform.pos.x + 230, w.player.transform.pos.y, "shooter", "F", "Tireur")];
    for (let i = 0; i < 120; i++) tickWorld(w, noInput(), DEFAULT_TUNING, 1 / 60);
    expect(w.projectiles.some((p) => p.faction === "enemy")).toBe(true);
  });
  it("le bombeur explose au contact, blesse le joueur puis meurt", () => {
    const w = createWorld();
    const e = makeEnemy(51, w.player.transform.pos.x + 16, w.player.transform.pos.y, "bomber", "F", "Bombe");
    w.enemies = [e];
    const hp0 = w.player.health.hp;
    tickWorld(w, noInput(), DEFAULT_TUNING, 1 / 60);
    expect(w.player.health.hp).toBeLessThan(hp0);
    expect(w.enemies.length).toBe(0); // a explosé
  });
  it("le poursuiveur s'approche du joueur", () => {
    const w = createWorld();
    const e = makeEnemy(52, w.player.transform.pos.x + 300, w.player.transform.pos.y, "chaser", "F", "Rôdeur");
    w.enemies = [e];
    const d0 = e.transform.pos.x;
    for (let i = 0; i < 30; i++) tickWorld(w, noInput(), DEFAULT_TUNING, 1 / 60);
    expect(e.transform.pos.x).toBeLessThan(d0);
  });
});
```
- [ ] **Run → PASS** ; **Commit** `feat(core): enemy AI (archetype FSM + rage)`.

---

## Task 4: core/biomeEnemies.ts (sets par biome — généré)

**Files:** Create `game/src/core/biomeEnemies.ts` — Test `game/tests/biomeEnemies.test.ts`

- [ ] **Implémenter** structure + données (injectées par le workflow `gen-enemy-sets`) :
```ts
import { Archetype } from "./enemies";
export interface EnemyType { name: string; archetype: Archetype; }
export const BIOME_ENEMIES: Record<string, EnemyType[]> = { /* injecté */ };
const DEFAULT: EnemyType[] = [{ name: "Rôdeur", archetype: "chaser" }];
export function enemyTypesForBiome(id: string): EnemyType[] {
  const set = BIOME_ENEMIES[id];
  return set && set.length ? set : DEFAULT;
}
```
- [ ] **Test** (contrat de contenu, passe après injection) :
```ts
import { describe, it, expect } from "vitest";
import { enemyTypesForBiome } from "../src/core/biomeEnemies";
import { BIOMES } from "../src/core/biomes";

const VALID = ["chaser", "shooter", "brute", "swarmer", "bomber"];
describe("biomeEnemies", () => {
  it("chaque biome a ≥1 type nommé avec un archétype valide", () => {
    for (const b of BIOMES) {
      const set = enemyTypesForBiome(b.id);
      expect(set.length).toBeGreaterThanOrEqual(1);
      for (const e of set) {
        expect(e.name.length).toBeGreaterThan(0);
        expect(VALID).toContain(e.archetype);
      }
    }
  });
});
```
- [ ] **Run → PASS** (après bake) ; **Commit** `feat(core): per-biome enemy sets`.

---

## Task 5: generate.ts — spawn depuis les sets

**Files:** Modify `game/src/core/generate.ts` ; Update `game/tests/generate.test.ts`

- [ ] **Implémenter** : importer `enemyTypesForBiome` et `makeEnemy` (de world). Remplacer la boucle ennemis :
```ts
const types = enemyTypesForBiome(biome.id);
for (let i = 0; i < count; i++) {
  const pos = freeSpawn(rng, level, entry, 220, 14, placed);
  placed.push({ pos, radius: 14 });
  const tp = types[Math.floor(rng() * types.length)];
  enemies.push(makeEnemy(id++, pos.x, pos.y, tp.archetype, biome.tier, tp.name));
}
```
  (Retirer les imports/constantes devenus inutiles : `makeEntity` si plus utilisé, `BIOME_CHASER_HP`, `BASE_CONTACT_DMG`, `TIER_SCALING` si plus utilisés.)
- [ ] **Tests generate** : remplacer le test « ennemis S plus coriaces » (couvert par enemies.test) par :
```ts
import { enemyTypesForBiome } from "../src/core/biomeEnemies";
it("les ennemis générés ont des archétypes du set du biome", () => {
  const w = generateBiomeWorld(createPlayer(), getBiome("forest"), lcg(4));
  const allowed = new Set(enemyTypesForBiome("forest").map((e) => e.archetype));
  expect(w.enemies.length).toBeGreaterThan(0);
  for (const e of w.enemies) expect(allowed.has(e.archetype)).toBe(true);
});
```
  Garder les tests « count = scaling », « spawn 0 ennemi », « sortie non recouverte », « PNJ », déterminisme.
- [ ] **Run → PASS** ; **Commit** `feat(core): generate spawns biome enemy sets`.

---

## Task 6: rendu — placeholders par archétype + teinte rage

**Files:** Modify `game/src/assets/manifest.ts`, `game/src/game/render/sprites.ts`

- [ ] **manifest** : ajouter les placeholders :
```ts
{ key: "enemy_shooter", shape: "circle", color: 0xc06bff, size: 26 },
{ key: "enemy_brute", shape: "rect", color: 0x9aa0b5, size: 40 },
{ key: "enemy_swarmer", shape: "triangle", color: 0xffa64d, size: 18 },
{ key: "enemy_bomber", shape: "circle", color: 0xffe066, size: 24 },
```
  (en plus de `enemy_chaser`, `enemy_dummy`, `projectile`, `player` existants.)
- [ ] **sprites.ts** : mapper archétype → texture + teinte rage :
```ts
for (const e of w.enemies) {
  alive.add(e.id);
  const s = this.ensure(e.id, "enemy_" + e.archetype);
  s.setPosition(e.transform.pos.x, e.transform.pos.y);
  s.setTint(e.health.hp / e.health.maxHp < 0.3 ? 0xff3030 : 0xffffff);
}
```
- [ ] **Build** `npm run build` → OK ; **Commit** `feat(game): per-archetype enemy sprites + rage tint`.

---

## Task 7: Bake des sets générés + vérif finale

**Files:** Modify `game/src/core/biomeEnemies.ts` (données) ; `game/README.md`

- [ ] **Bake** : injecter les 49 sets produits par `gen-enemy-sets` dans `BIOME_ENEMIES` (script `/tmp/bake-enemies.mjs`).
- [ ] **Run** `npm test` → tout vert (enemies, ai, biomeEnemies, generate, world, + existants).
- [ ] **Build** `npm run build` → OK.
- [ ] **README** : section Monde — préciser « ennemis variés (poursuiveurs, tireurs, brutes, fileurs, bombeurs) propres à chaque biome, qui enragent à PV bas ».
- [ ] **Commit** `feat(game): tranche C1 — ennemis variés & IA`.

---

## Auto-revue (couverture spec)

- §2 archétypes/stats → Task 1 ✔
- §3 IA (rage, shooter, bomber, contact, projectiles ennemis) → Tasks 2,3 ✔
- §4 sets par biome + spawn → Tasks 4,5,7 ✔
- §5 Enemy générique + rendu → Tasks 2,6 ✔
- §6 archi → toutes ✔
- §7 tests → Tasks 1-5 ✔ ; §8 DoD → Task 7 ✔

Types cohérents : `Archetype`, `ArchetypeStats`, `resolveEnemyStats`, `Enemy{archetype,name,speed,knockback,fireTimer}`,
`makeEnemy`, `updateEnemy`, `EnemyType`, `enemyTypesForBiome` — utilisés à l'identique.
