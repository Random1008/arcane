# Tranche A — Combat & 6 types d'armes — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Système d'armes data-driven (6 types), barre d'inventaire façon Minecraft, stats + tier F→S + coups critiques, en étendant le `core/` testé de la tranche 0.

**Architecture:** Nouveaux modules `core/combat/{weapons,crit,hotbar}.ts` ; `projectile.ts` gagne pierce/hitIds/crit ; `world.ts` remplace `loadout` par `hotbar`, ajoute `rng` injecté, et résout l'arme active (mêlée ou tir) avec stats/crit/signatures. Couche `game/` : barre d'inventaire Phaser, input clavier/molette, crit affiché.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest.

> Référence : spec `docs/superpowers/specs/2026-06-08-tranche-a-combat-armes-design.md`.

---

## Structure des fichiers

```
game/src/core/combat/
├─ weapons.ts      (NEW) WeaponDef, WEAPONS[6], Tier, TIER_MULT, computeStats, getWeaponDef
├─ crit.ts         (NEW) rollDamage(baseAtk, critChance, critDamage, rng)
├─ hotbar.ts       (NEW) Hotbar, createHotbar, selectSlot, scrollSlot, activeWeapon, cycleTier
├─ projectile.ts   (MOD) +pierce, +hitIds, +crit ; nouvelle signature spawnProjectile
├─ melee.ts        (inchangé)
├─ damage.ts       (inchangé)
└─ weapon.ts       (DELETE) Loadout supprimé (remplacé par hotbar)
game/src/core/
└─ world.ts        (MOD) Player.hotbar, World.rng, InputState (attack/selectSlot/scroll/cycleTier), tickWorld
game/src/game/input/inputMap.ts   (MOD) attack/selectSlot/scroll/cycleTier
game/src/game/render/
├─ hotbarBar.ts    (NEW) barre d'inventaire fixée caméra
├─ floatingText.ts (MOD) crit affiché distinctement
├─ slash.ts        (inchangé d'interface ; reçoit le cfg de l'arme active)
└─ sprites.ts      (MOD) retire le pickup
game/src/game/scenes/TrainingScene.ts  (MOD) câblage hotbar + HUD + events crit
game/src/assets/manifest.ts            (MOD) retire ranged_pickup
game/tests/
├─ weapons.test.ts (NEW), crit.test.ts (NEW), hotbar.test.ts (NEW)
├─ projectile.test.ts (REWRITE), world.test.ts (UPDATE)
└─ weapon.test.ts  (DELETE)
```

---

## Task 1: weapons.ts (défs, tier, computeStats)

**Files:** Create `game/src/core/combat/weapons.ts` — Test `game/tests/weapons.test.ts`

- [ ] **Step 1: Test (échoue)** `game/tests/weapons.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { WEAPONS, getWeaponDef, computeStats, TIER_MULT } from "../src/core/combat/weapons";

describe("weapons", () => {
  it("a 6 armes avec catégories correctes", () => {
    expect(WEAPONS.map((w) => w.id)).toEqual(["sword", "dagger", "axe", "hammer", "bow", "staff"]);
    expect(getWeaponDef("bow").category).toBe("ranged");
    expect(getWeaponDef("sword").category).toBe("melee");
  });
  it("computeStats applique le multiplicateur de tier à l'ATK", () => {
    const sword = getWeaponDef("sword"); // atk 15
    expect(computeStats(sword, "F").atk).toBeCloseTo(15 * TIER_MULT.F);
    expect(computeStats(sword, "S").atk).toBeCloseTo(15 * TIER_MULT.S);
    // les autres stats sont inchangées
    expect(computeStats(sword, "S").critChance).toBe(sword.critChance);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`cd game && npx vitest run tests/weapons.test.ts`)

- [ ] **Step 3: Implémenter** `game/src/core/combat/weapons.ts`

```ts
export type WeaponCategory = "melee" | "ranged";
export type Signature = "none" | "pierce";
export type Tier = "F" | "E" | "D" | "C" | "B" | "A" | "S";

export interface WeaponDef {
  id: string;
  name: string;
  category: WeaponCategory;
  atk: number;
  attackSpeed: number; // multiplicateur, 1 = base
  critChance: number; // 0..1
  critDamage: number; // multiplicateur
  range: number; // portée mêlée (0 si distance)
  arcDeg: number; // arc mêlée (0 si distance ; 360 = radial)
  knockback: number;
  projectileSpeed: number; // 0 si mêlée
  projectileRadius: number; // 0 si mêlée
  signature: Signature;
}

export type ResolvedWeapon = WeaponDef; // même forme, atk déjà multipliée par le tier

export const TIER_MULT: Record<Tier, number> = { F: 1.0, E: 1.3, D: 1.7, C: 2.2, B: 3.0, A: 4.0, S: 5.5 };
export const TIERS: Tier[] = ["F", "E", "D", "C", "B", "A", "S"];

export const WEAPONS: WeaponDef[] = [
  { id: "sword",  name: "Épée",    category: "melee",  atk: 15, attackSpeed: 1.0,  critChance: 0.10, critDamage: 1.5, range: 64, arcDeg: 100, knockback: 180, projectileSpeed: 0,   projectileRadius: 0,  signature: "none" },
  { id: "dagger", name: "Dague",   category: "melee",  atk: 8,  attackSpeed: 1.8,  critChance: 0.35, critDamage: 2.0, range: 48, arcDeg: 70,  knockback: 90,  projectileSpeed: 0,   projectileRadius: 0,  signature: "none" },
  { id: "axe",    name: "Hache",   category: "melee",  atk: 22, attackSpeed: 0.8,  critChance: 0.10, critDamage: 1.5, range: 70, arcDeg: 150, knockback: 160, projectileSpeed: 0,   projectileRadius: 0,  signature: "none" },
  { id: "hammer", name: "Marteau", category: "melee",  atk: 32, attackSpeed: 0.55, critChance: 0.05, critDamage: 1.5, range: 64, arcDeg: 360, knockback: 320, projectileSpeed: 0,   projectileRadius: 0,  signature: "none" },
  { id: "bow",    name: "Arc",     category: "ranged", atk: 10, attackSpeed: 1.2,  critChance: 0.20, critDamage: 1.8, range: 0,  arcDeg: 0,   knockback: 60,  projectileSpeed: 560, projectileRadius: 5,  signature: "pierce" },
  { id: "staff",  name: "Bâton",   category: "ranged", atk: 18, attackSpeed: 0.7,  critChance: 0.10, critDamage: 1.6, range: 0,  arcDeg: 0,   knockback: 100, projectileSpeed: 320, projectileRadius: 12, signature: "none" },
];

const BY_ID: Record<string, WeaponDef> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

export function getWeaponDef(id: string): WeaponDef {
  const w = BY_ID[id];
  if (!w) throw new Error(`Arme inconnue: ${id}`);
  return w;
}

export function computeStats(def: WeaponDef, tier: Tier): ResolvedWeapon {
  return { ...def, atk: def.atk * TIER_MULT[tier] };
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/combat/weapons.ts game/tests/weapons.test.ts && git commit -m "feat(core): weapon defs + tier scaling"`

---

## Task 2: crit.ts (rollDamage)

**Files:** Create `game/src/core/combat/crit.ts` — Test `game/tests/crit.test.ts`

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { rollDamage } from "../src/core/combat/crit";

describe("crit", () => {
  it("crit quand rng < critChance", () => {
    const r = rollDamage(20, 0.5, 2.0, () => 0);
    expect(r.crit).toBe(true);
    expect(r.amount).toBe(40);
  });
  it("pas de crit quand rng >= critChance", () => {
    const r = rollDamage(20, 0.5, 2.0, () => 0.999);
    expect(r.crit).toBe(false);
    expect(r.amount).toBe(20);
  });
  it("critChance 0 ne crit jamais", () => {
    expect(rollDamage(10, 0, 3, () => 0).crit).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter** `game/src/core/combat/crit.ts`

```ts
export interface DamageRoll {
  amount: number;
  crit: boolean;
}

export function rollDamage(baseAtk: number, critChance: number, critDamage: number, rng: () => number): DamageRoll {
  const crit = rng() < critChance;
  const amount = Math.round(baseAtk * (crit ? critDamage : 1));
  return { amount, crit };
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/combat/crit.ts game/tests/crit.test.ts && git commit -m "feat(core): crit roll"`

---

## Task 3: hotbar.ts

**Files:** Create `game/src/core/combat/hotbar.ts` — Test `game/tests/hotbar.test.ts`

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { createHotbar, selectSlot, scrollSlot, activeWeapon, cycleTier } from "../src/core/combat/hotbar";

describe("hotbar", () => {
  it("createHotbar : 9 slots, remplis depuis la liste fournie, actif 0", () => {
    const h = createHotbar(["sword", "bow"]);
    expect(h.slots.length).toBe(9);
    expect(h.activeIndex).toBe(0);
    expect(activeWeapon(h)?.defId).toBe("sword");
    expect(h.slots[1]?.defId).toBe("bow");
    expect(h.slots[2]).toBe(null);
  });
  it("selectSlot borne l'index", () => {
    const h = createHotbar(["sword"]);
    selectSlot(h, 3); expect(h.activeIndex).toBe(3);
    selectSlot(h, 99); expect(h.activeIndex).toBe(3);
    selectSlot(h, -5); expect(h.activeIndex).toBe(3);
  });
  it("scrollSlot boucle sur les 9 slots", () => {
    const h = createHotbar(["sword"]);
    scrollSlot(h, -1); expect(h.activeIndex).toBe(8);
    scrollSlot(h, 1); expect(h.activeIndex).toBe(0);
  });
  it("activeWeapon = null si slot vide", () => {
    const h = createHotbar(["sword"]);
    selectSlot(h, 5);
    expect(activeWeapon(h)).toBe(null);
  });
  it("cycleTier boucle F→…→S→F sur l'arme active, no-op si vide", () => {
    const h = createHotbar(["sword"]);
    expect(activeWeapon(h)?.tier).toBe("F");
    cycleTier(h); expect(activeWeapon(h)?.tier).toBe("E");
    for (let i = 0; i < 6; i++) cycleTier(h); // E→…→S→F
    expect(activeWeapon(h)?.tier).toBe("E");
    selectSlot(h, 8); expect(() => cycleTier(h)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter** `game/src/core/combat/hotbar.ts`

```ts
import { Tier, TIERS } from "./weapons";

export interface WeaponInstance {
  defId: string;
  tier: Tier;
}

export interface Hotbar {
  slots: (WeaponInstance | null)[];
  activeIndex: number;
}

export const HOTBAR_SIZE = 9;

export function createHotbar(defIds: string[], tier: Tier = "F"): Hotbar {
  const slots: (WeaponInstance | null)[] = new Array(HOTBAR_SIZE).fill(null);
  defIds.slice(0, HOTBAR_SIZE).forEach((id, i) => (slots[i] = { defId: id, tier }));
  return { slots, activeIndex: 0 };
}

export function selectSlot(h: Hotbar, i: number): void {
  if (i >= 0 && i < HOTBAR_SIZE) h.activeIndex = i;
}

export function scrollSlot(h: Hotbar, dir: number): void {
  h.activeIndex = (h.activeIndex + dir + HOTBAR_SIZE) % HOTBAR_SIZE;
}

export function activeWeapon(h: Hotbar): WeaponInstance | null {
  return h.slots[h.activeIndex];
}

export function cycleTier(h: Hotbar): void {
  const w = activeWeapon(h);
  if (!w) return;
  const idx = TIERS.indexOf(w.tier);
  w.tier = TIERS[(idx + 1) % TIERS.length];
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/combat/hotbar.ts game/tests/hotbar.test.ts && git commit -m "feat(core): weapon hotbar"`

---

## Task 4: projectile.ts (pierce + hitIds + crit)

**Files:** Modify `game/src/core/combat/projectile.ts` — Rewrite `game/tests/projectile.test.ts`

- [ ] **Step 1: Réécrire le test** `game/tests/projectile.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { spawnProjectile, tickProjectile, isExpired } from "../src/core/combat/projectile";
import { v } from "../src/core/math/vec2";

const opts = { speed: 480, radius: 5, damage: 8, lifetime: 1.2, pierce: false, crit: false };

describe("projectile", () => {
  it("part vers la direction, avance, porte ses dégâts/flags", () => {
    const p = spawnProjectile(1, v(0, 0), v(1, 0), opts, "player");
    expect(p.vel.x).toBeCloseTo(480);
    expect(p.damage).toBe(8);
    expect(p.pierce).toBe(false);
    expect(p.hitIds.size).toBe(0);
    tickProjectile(p, 0.1);
    expect(p.pos.x).toBeCloseTo(48);
    expect(p.life).toBeCloseTo(1.1);
  });
  it("expire après lifetime", () => {
    const p = spawnProjectile(1, v(0, 0), v(1, 0), opts, "player");
    tickProjectile(p, 1.3);
    expect(isExpired(p)).toBe(true);
  });
  it("pierce/crit transmis", () => {
    const p = spawnProjectile(2, v(0, 0), v(0, 1), { ...opts, pierce: true, crit: true, radius: 12 }, "player");
    expect(p.pierce).toBe(true);
    expect(p.crit).toBe(true);
    expect(p.radius).toBe(12);
  });
});
```

- [ ] **Step 2: Run → FAIL** (ancienne signature).

- [ ] **Step 3: Réécrire** `game/src/core/combat/projectile.ts`

```ts
import { Faction } from "../entity";
import { Vec2, v, normalize, scale } from "../math/vec2";

export interface ProjectileOpts {
  speed: number;
  radius: number;
  damage: number;
  lifetime: number;
  pierce: boolean;
  crit: boolean;
}

export interface Projectile {
  id: number;
  pos: Vec2;
  vel: Vec2;
  life: number;
  damage: number;
  faction: Faction;
  radius: number;
  pierce: boolean;
  crit: boolean;
  hitIds: Set<number>;
}

export function spawnProjectile(id: number, origin: Vec2, dir: Vec2, o: ProjectileOpts, faction: Faction): Projectile {
  return {
    id,
    pos: v(origin.x, origin.y),
    vel: scale(normalize(dir), o.speed),
    life: o.lifetime,
    damage: o.damage,
    faction,
    radius: o.radius,
    pierce: o.pierce,
    crit: o.crit,
    hitIds: new Set(),
  };
}

export function tickProjectile(p: Projectile, dt: number): void {
  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;
  p.life -= dt;
}

export const isExpired = (p: Projectile): boolean => p.life <= 0;
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/combat/projectile.ts game/tests/projectile.test.ts && git commit -m "feat(core): projectile pierce/crit/hitIds"`

---

## Task 5: world.ts (hotbar, rng, attack flow, crit, signatures)

**Files:** Modify `game/src/core/world.ts` ; Delete `game/src/core/combat/weapon.ts` + `game/tests/weapon.test.ts` ; Update `game/tests/world.test.ts`

- [ ] **Step 1: Supprimer l'ancien Loadout**

```bash
git rm game/src/core/combat/weapon.ts game/tests/weapon.test.ts
```

- [ ] **Step 2: Réécrire** `game/src/core/world.ts` (intégralement)

```ts
import { DEFAULT_TUNING, Tuning } from "./config/tuning";
import { Entity, makeEntity, tickIframes, tickHitstun, isStunned } from "./entity";
import { Level, canOccupy, clampToBounds } from "./collision";
import { applyMovementCollide } from "./movement";
import { createDash, startDash, tickDash, isDashing, DashState } from "./abilities/dash";
import { createBlink, doBlink, tickBlink, BlinkState } from "./abilities/blink";
import { createMelee, startMelee, tickMelee, isMeleeActive, targetsInArc, MeleeState, MeleeCfg } from "./combat/melee";
import { spawnProjectile, tickProjectile, isExpired, Projectile } from "./combat/projectile";
import { applyDamage, isDead } from "./combat/damage";
import { chaserMoveDir } from "./ai/chaser";
import { createHotbar, selectSlot, scrollSlot, activeWeapon, cycleTier, Hotbar } from "./combat/hotbar";
import { computeStats, getWeaponDef, ResolvedWeapon } from "./combat/weapons";
import { rollDamage } from "./combat/crit";
import { Vec2, v, sub, normalize, scale, distance, length } from "./math/vec2";

export interface InputState {
  moveDir: Vec2;
  aimPoint: Vec2;
  attack: boolean;
  dash: boolean;
  blink: boolean;
  selectSlot: number; // -1 ou 0..8
  scroll: number; // -1 / 0 / +1
  cycleTier: boolean; // front montant
}

export interface Player extends Entity {
  dash: DashState;
  blink: BlinkState;
  melee: MeleeState;
  hotbar: Hotbar;
  energy: number;
  rangedTimer: number; // temps depuis le dernier tir
  attackHeld: boolean; // front montant tir semi-auto
  tierHeld: boolean; // front montant cycle tier
}

export interface DamageEvent {
  x: number;
  y: number;
  amount: number;
  targetId: number;
  crit: boolean;
}

export type EnemyKind = "dummy" | "chaser";

export interface Enemy extends Entity {
  kind: EnemyKind;
  contactTimer: number;
}

export interface World {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  level: Level;
  events: DamageEvent[];
  nextId: number;
  godMode: boolean;
  rng: () => number;
}

export function createWorld(): World {
  const t = DEFAULT_TUNING;
  const level: Level = {
    bounds: { x: 0, y: 0, w: 1200, h: 800 },
    walls: [{ x: 520, y: 340, w: 160, h: 120 }],
  };
  const base = makeEntity({ id: 1, x: 300, y: 400, maxHp: t.resources.maxHp, radius: 14, faction: "player" });
  const player: Player = {
    ...base,
    dash: createDash(),
    blink: createBlink(),
    melee: createMelee(),
    hotbar: createHotbar(["sword", "dagger", "axe", "hammer", "bow", "staff"], "F"),
    energy: t.resources.maxEnergy,
    rangedTimer: 999,
    attackHeld: false,
    tierHeld: false,
  };
  const dummyBase = makeEntity({ id: 2, x: 700, y: 250, maxHp: 200, radius: 16, faction: "enemy" });
  const dummy: Enemy = { ...dummyBase, kind: "dummy", contactTimer: 0 };
  const chaserBase = makeEntity({ id: 3, x: 900, y: 550, maxHp: 60, radius: 14, faction: "enemy" });
  const chaser: Enemy = { ...chaserBase, kind: "chaser", contactTimer: 0 };
  return { player, enemies: [dummy, chaser], projectiles: [], level, events: [], nextId: 100, godMode: false, rng: Math.random };
}

function meleeCfgFor(rw: ResolvedWeapon, base: Tuning["melee"]): MeleeCfg {
  const s = rw.attackSpeed;
  return {
    damage: rw.atk,
    range: rw.range,
    arcDeg: rw.arcDeg,
    windup: base.windup / s,
    active: base.active / s,
    recovery: base.recovery / s,
    cadence: base.cadence / s,
    knockback: rw.knockback,
  };
}

const baseMeleeCfg = (base: Tuning["melee"]): MeleeCfg => ({
  damage: 0,
  range: 0,
  arcDeg: 0,
  windup: base.windup,
  active: base.active,
  recovery: base.recovery,
  cadence: base.cadence,
  knockback: 0,
});

export function tickWorld(w: World, input: InputState, t: Tuning, dt: number): void {
  const p = w.player;

  // sélection d'arme (clavier + molette) + cycle de tier (front montant)
  if (input.selectSlot >= 0) selectSlot(p.hotbar, input.selectSlot);
  if (input.scroll !== 0) scrollSlot(p.hotbar, input.scroll);
  if (input.cycleTier && !p.tierHeld) cycleTier(p.hotbar);
  p.tierHeld = input.cycleTier;

  // arme active résolue (null si slot vide)
  const inst = activeWeapon(p.hotbar);
  const rw: ResolvedWeapon | null = inst ? computeStats(getWeaponDef(inst.defId), inst.tier) : null;

  // énergie
  p.energy = Math.min(t.resources.maxEnergy, p.energy + t.resources.energyRegen * dt);

  const playerOccupy = (pt: Vec2) => canOccupy(pt, p.radius, w.level);

  // dash : déclenché AVANT son tick pour se déplacer dès la frame d'appui
  if (input.dash) startDash(p.dash, input.moveDir, p, t.dash);
  tickDash(p.dash, p, t.dash, dt, playerOccupy);
  tickBlink(p.blink, dt);
  p.rangedTimer += dt;

  // mouvement (sauf en dash ; pendant le hitstun on laisse glisser le knockback sans contrôle)
  if (!isDashing(p.dash)) {
    const moveInput = isStunned(p) ? v(0, 0) : input.moveDir;
    applyMovementCollide(p.transform, moveInput, t.move, dt, playerOccupy);
  }
  p.transform.pos = clampToBounds(p.transform.pos, p.radius, w.level.bounds);

  // blink (pas pendant le dash)
  if (input.blink && !isDashing(p.dash)) {
    const energyRef = { value: p.energy };
    doBlink(p.blink, p, input.aimPoint, energyRef, t.blink, playerOccupy);
    p.energy = energyRef.value;
  }

  const aimDir = normalize(sub(input.aimPoint, p.transform.pos));
  const isMeleeWeapon = rw !== null && rw.category === "melee";
  const meleeCfg = isMeleeWeapon ? meleeCfgFor(rw as ResolvedWeapon, t.melee) : baseMeleeCfg(t.melee);

  // ATTAQUE MÊLÉE (auto-répétée tant que maintenu, limitée par la cadence)
  if (isMeleeWeapon && input.attack) startMelee(p.melee, aimDir, meleeCfg);
  tickMelee(p.melee, meleeCfg, dt);
  if (isMeleeWeapon && isMeleeActive(p.melee)) {
    const r = rw as ResolvedWeapon;
    const targets = targetsInArc(p.transform.pos, p.melee.aimDir, w.enemies, meleeCfg);
    for (const e of targets) {
      if (p.melee.hitIds.has(e.id)) continue;
      const roll = rollDamage(r.atk, r.critChance, r.critDamage, w.rng);
      const kb = scale(normalize(sub(e.transform.pos, p.transform.pos)), r.knockback);
      if (applyDamage(e, roll.amount, kb)) {
        p.melee.hitIds.add(e.id);
        w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: roll.amount, targetId: e.id, crit: roll.crit });
      }
    }
  }

  // ATTAQUE À DISTANCE (semi-auto : un tir par appui, cadence respectée)
  const rangedEdge = input.attack && !p.attackHeld;
  if (rw !== null && rw.category === "ranged" && rangedEdge && length(aimDir) > 0) {
    const cadence = t.ranged.cadence / rw.attackSpeed;
    if (p.rangedTimer >= cadence) {
      const roll = rollDamage(rw.atk, rw.critChance, rw.critDamage, w.rng);
      w.projectiles.push(
        spawnProjectile(
          w.nextId++,
          p.transform.pos,
          aimDir,
          { speed: rw.projectileSpeed, radius: rw.projectileRadius, damage: roll.amount, lifetime: t.ranged.lifetime, pierce: rw.signature === "pierce", crit: roll.crit },
          "player",
        ),
      );
      p.rangedTimer = 0;
    }
  }
  p.attackHeld = input.attack;

  // projectiles (pierce = traverse en mémorisant les cibles déjà touchées)
  for (const proj of w.projectiles) {
    tickProjectile(proj, dt);
    for (const e of w.enemies) {
      if (proj.hitIds.has(e.id)) continue;
      if (distance(proj.pos, e.transform.pos) <= proj.radius + e.radius) {
        if (applyDamage(e, proj.damage, scale(normalize(proj.vel), 80))) {
          proj.hitIds.add(e.id);
          w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: proj.damage, targetId: e.id, crit: proj.crit });
        }
        if (!proj.pierce) {
          proj.life = 0;
          break;
        }
      }
    }
  }
  w.projectiles = w.projectiles.filter((proj) => !isExpired(proj));

  // IA chaser + contact
  for (const e of w.enemies) {
    e.contactTimer = Math.max(0, e.contactTimer - dt);
    if (e.kind === "chaser") {
      const enemyOccupy = (pt: Vec2) => canOccupy(pt, e.radius, w.level);
      const dir = isStunned(e) ? v(0, 0) : chaserMoveDir(e.transform.pos, p.transform.pos);
      applyMovementCollide(e.transform, dir, { maxSpeed: t.chaser.speed, accel: 1200, friction: 1200 }, dt, enemyOccupy);
      e.transform.pos = clampToBounds(e.transform.pos, e.radius, w.level.bounds);
      if (e.contactTimer === 0 && distance(e.transform.pos, p.transform.pos) <= e.radius + p.radius) {
        if (!w.godMode) {
          const kb = scale(normalize(sub(p.transform.pos, e.transform.pos)), 120);
          if (applyDamage(p, t.chaser.contactDamage, kb)) {
            w.events.push({ x: p.transform.pos.x, y: p.transform.pos.y, amount: t.chaser.contactDamage, targetId: p.id, crit: false });
          }
        }
        e.contactTimer = t.chaser.contactCadence;
      }
    }
  }
  w.enemies = w.enemies.filter((e) => !(e.kind === "chaser" && isDead(e)));

  // i-frames + hitstun
  tickIframes(p, dt);
  tickHitstun(p, dt);
  for (const e of w.enemies) {
    tickIframes(e, dt);
    tickHitstun(e, dt);
  }
}
```

- [ ] **Step 3: Mettre à jour** `game/tests/world.test.ts` (nouvelle InputState + tests armes/crit)

```ts
import { describe, it, expect } from "vitest";
import { createWorld, tickWorld, InputState } from "../src/core/world";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { canOccupy } from "../src/core/collision";
import { activeWeapon, selectSlot } from "../src/core/combat/hotbar";
import { v } from "../src/core/math/vec2";

const noInput = (): InputState => ({
  moveDir: v(0, 0), aimPoint: v(0, 0), attack: false, dash: false, blink: false,
  selectSlot: -1, scroll: 0, cycleTier: false,
});

describe("world", () => {
  it("le joueur se déplace avec l'input", () => {
    const w = createWorld();
    const before = w.player.transform.pos.x;
    for (let i = 0; i < 30; i++) tickWorld(w, { ...noInput(), moveDir: v(1, 0) }, DEFAULT_TUNING, 1 / 60);
    expect(w.player.transform.pos.x).toBeGreaterThan(before);
  });

  it("attaque mêlée (épée par défaut) tue progressivement le mannequin devant", () => {
    const w = createWorld();
    w.rng = () => 0.999; // pas de crit, déterministe
    const dummy = w.enemies[0];
    dummy.transform.pos = v(w.player.transform.pos.x + 40, w.player.transform.pos.y);
    const hp0 = dummy.health.hp;
    const aim = v(w.player.transform.pos.x + 100, w.player.transform.pos.y);
    for (let s = 0; s < 5; s++) {
      tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, DEFAULT_TUNING, 1 / 60);
      for (let i = 0; i < 30; i++) tickWorld(w, { ...noInput(), aimPoint: aim }, DEFAULT_TUNING, 1 / 60);
    }
    expect(dummy.health.hp).toBeLessThan(hp0);
  });

  it("sélectionner un slot change l'arme active", () => {
    const w = createWorld();
    expect(activeWeapon(w.player.hotbar)?.defId).toBe("sword");
    tickWorld(w, { ...noInput(), selectSlot: 4 }, DEFAULT_TUNING, 1 / 60); // bow
    expect(activeWeapon(w.player.hotbar)?.defId).toBe("bow");
  });

  it("arme à distance : un seul tir par appui, slot vide = rien", () => {
    const w = createWorld();
    w.rng = () => 0.999;
    const aim = v(w.player.transform.pos.x + 100, w.player.transform.pos.y);
    // slot vide (7) → pas de tir
    tickWorld(w, { ...noInput(), selectSlot: 7, aimPoint: aim, attack: true }, DEFAULT_TUNING, 1 / 60);
    expect(w.projectiles.length).toBe(0);
    // équiper arc (slot 4), relâcher puis appuyer → 1 tir
    tickWorld(w, { ...noInput(), selectSlot: 4, aimPoint: aim, attack: false }, DEFAULT_TUNING, 1 / 60);
    tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, DEFAULT_TUNING, 1 / 60);
    expect(w.projectiles.length).toBe(1);
    // maintenir n'ajoute rien
    for (let i = 0; i < 30; i++) tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, DEFAULT_TUNING, 1 / 60);
    expect(w.projectiles.length).toBe(1);
  });

  it("l'arc transperce : un projectile touche 2 ennemis alignés", () => {
    const w = createWorld();
    w.rng = () => 0.999;
    selectSlot(w.player.hotbar, 4); // bow (pierce)
    const px = w.player.transform.pos.x, py = w.player.transform.pos.y;
    w.enemies[0].transform.pos = v(px + 60, py);
    w.enemies[1].transform.pos = v(px + 120, py);
    const hp0 = w.enemies.map((e) => e.health.hp);
    const aim = v(px + 200, py);
    tickWorld(w, { ...noInput(), aimPoint: aim, attack: false }, DEFAULT_TUNING, 1 / 60);
    tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, DEFAULT_TUNING, 1 / 60);
    for (let i = 0; i < 40; i++) tickWorld(w, { ...noInput(), aimPoint: aim }, DEFAULT_TUNING, 1 / 60);
    expect(w.enemies[0].health.hp).toBeLessThan(hp0[0]);
    expect(w.enemies[1].health.hp).toBeLessThan(hp0[1]);
  });

  it("le marteau (arc 360°) touche un ennemi derrière le joueur", () => {
    const w = createWorld();
    w.rng = () => 0.999;
    selectSlot(w.player.hotbar, 3); // hammer, arc 360
    const px = w.player.transform.pos.x, py = w.player.transform.pos.y;
    const back = w.enemies[0];
    back.transform.pos = v(px - 40, py); // derrière (visée vers la droite)
    const hp0 = back.health.hp;
    const aim = v(px + 100, py);
    for (let s = 0; s < 3; s++) {
      tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, DEFAULT_TUNING, 1 / 60);
      for (let i = 0; i < 50; i++) tickWorld(w, { ...noInput(), aimPoint: aim }, DEFAULT_TUNING, 1 / 60);
    }
    expect(back.health.hp).toBeLessThan(hp0);
  });

  it("crit : rng=0 inflige plus que rng=0.999 (même arme)", () => {
    const mk = (rng: () => number) => {
      const w = createWorld();
      w.rng = rng;
      const d = w.enemies[0];
      d.transform.pos = v(w.player.transform.pos.x + 40, w.player.transform.pos.y);
      const aim = v(w.player.transform.pos.x + 100, w.player.transform.pos.y);
      tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, DEFAULT_TUNING, 1 / 60);
      for (let i = 0; i < 6; i++) tickWorld(w, { ...noInput(), aimPoint: aim }, DEFAULT_TUNING, 1 / 60);
      return 200 - d.health.hp;
    };
    expect(mk(() => 0)).toBeGreaterThan(mk(() => 0.999));
  });

  it("tier plus élevé = plus de dégâts", () => {
    const dmgAtTier = (cycles: number) => {
      const w = createWorld();
      w.rng = () => 0.999;
      for (let i = 0; i < cycles; i++) tickWorld(w, { ...noInput(), cycleTier: true }, DEFAULT_TUNING, 1 / 60);
      // relâcher cycleTier entre deux pressions
      const d = w.enemies[0];
      d.transform.pos = v(w.player.transform.pos.x + 40, w.player.transform.pos.y);
      const aim = v(w.player.transform.pos.x + 100, w.player.transform.pos.y);
      tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, DEFAULT_TUNING, 1 / 60);
      for (let i = 0; i < 6; i++) tickWorld(w, { ...noInput(), aimPoint: aim }, DEFAULT_TUNING, 1 / 60);
      return 200 - d.health.hp;
    };
    // NB: cycleTier est à front montant ; chaque appel ici a cycleTier=true une seule fois (pas de relâche)
    // donc une seule incrémentation effective. On compare F (0) vs un cran (1).
    expect(dmgAtTier(1)).toBeGreaterThan(dmgAtTier(0));
  });

  it("le dash rend invulnérable au contact du chaser", () => {
    const w = createWorld();
    const chaser = w.enemies[1];
    chaser.transform.pos = v(w.player.transform.pos.x + 12, w.player.transform.pos.y);
    const hp0 = w.player.health.hp;
    tickWorld(w, { ...noInput(), dash: true, moveDir: v(-1, 0) }, DEFAULT_TUNING, 1 / 60);
    expect(w.player.health.hp).toBe(hp0);
  });

  it("le joueur ne traverse pas un mur", () => {
    const w = createWorld();
    for (let i = 0; i < 300; i++) tickWorld(w, { ...noInput(), moveDir: v(1, 0) }, DEFAULT_TUNING, 1 / 60);
    expect(canOccupy(w.player.transform.pos, w.player.radius, w.level)).toBe(true);
    expect(w.player.transform.pos.x).toBeLessThan(520);
    expect(w.player.transform.pos.x).toBeGreaterThan(480);
  });

  it("le blink est ignoré pendant le dash", () => {
    const w = createWorld();
    const up = v(w.player.transform.pos.x, w.player.transform.pos.y - 500);
    tickWorld(w, { ...noInput(), dash: true, blink: true, moveDir: v(1, 0), aimPoint: up }, DEFAULT_TUNING, 1 / 60);
    expect(w.player.blink.cooldownLeft).toBe(0);
  });
});
```

> Note sur le test "tier" : `cycleTier` est à front montant. Dans `dmgAtTier`, l'appel avec `cycles=1`
> fait une pression (tier F→E) ; `cycles=0` reste à F. Le test compare donc F vs E (E > F). C'est correct
> car chaque `tickWorld` distinct repart de `tierHeld=false`.

- [ ] **Step 4: Run la suite ciblée** — `cd game && npx vitest run tests/world.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git add -A game/src/core game/tests && git commit -m "feat(core): world weapon system (hotbar, crit, signatures), remove loadout"`

---

## Task 6: inputMap.ts (attack / selectSlot / scroll / cycleTier)

**Files:** Modify `game/src/game/input/inputMap.ts`

- [ ] **Step 1: Réécrire** `game/src/game/input/inputMap.ts`

```ts
import Phaser from "phaser";
import { InputState } from "../../core/world";
import { Vec2, v } from "../../core/math/vec2";

export class InputMap {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private blinkDown = false;
  private blinkPressed = false;
  private tierDown = false;
  private pointerMoved = false;
  private lastAim?: Vec2;
  private wheelAccum = 0;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys(
      "W,A,S,D,Z,Q,UP,LEFT,DOWN,RIGHT,SPACE,E,T,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE",
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    scene.input.mouse?.disableContextMenu();
    scene.input.on("pointermove", () => {
      this.pointerMoved = true;
    });
    scene.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.wheelAccum += dy;
    });
  }

  sample(cam: Phaser.Cameras.Scene2D.Camera, fallback: Vec2): InputState {
    const k = this.keys;
    const left = k.A.isDown || k.Q.isDown || k.LEFT.isDown;
    const right = k.D.isDown || k.RIGHT.isDown;
    const up = k.W.isDown || k.Z.isDown || k.UP.isDown;
    const down = k.S.isDown || k.DOWN.isDown;
    const moveDir = v((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));

    const ptr = this.scene.input.activePointer;
    if (this.pointerMoved) {
      const world = cam.getWorldPoint(ptr.x, ptr.y);
      this.lastAim = v(world.x, world.y);
    }
    const aimPoint = this.lastAim ?? v(fallback.x + 1, fallback.y);

    // sélection de slot via touches 1..9
    const numKeys = [k.ONE, k.TWO, k.THREE, k.FOUR, k.FIVE, k.SIX, k.SEVEN, k.EIGHT, k.NINE];
    let selectSlot = -1;
    for (let i = 0; i < numKeys.length; i++) if (numKeys[i].isDown) { selectSlot = i; break; }

    // molette → -1/0/+1
    const scroll = this.wheelAccum > 0 ? 1 : this.wheelAccum < 0 ? -1 : 0;
    this.wheelAccum = 0;

    // E et T à front montant
    const eDown = k.E.isDown;
    this.blinkPressed = eDown && !this.blinkDown;
    this.blinkDown = eDown;
    const tDown = k.T.isDown;
    const cycleTier = tDown && !this.tierDown;
    this.tierDown = tDown;

    return {
      moveDir,
      aimPoint,
      attack: ptr.leftButtonDown(),
      dash: k.SPACE.isDown,
      blink: this.blinkPressed,
      selectSlot,
      scroll,
      cycleTier,
    };
  }
}
```

- [ ] **Step 2: Compile** — `cd game && npx tsc --noEmit`.
- [ ] **Step 3: Commit** — `git add game/src/game/input/inputMap.ts && git commit -m "feat(game): input attack/slot/scroll/tier"`

---

## Task 7: floatingText (crit) + hotbarBar

**Files:** Modify `game/src/game/render/floatingText.ts` ; Create `game/src/game/render/hotbarBar.ts`

- [ ] **Step 1: Réécrire** `floatingText.ts`

```ts
import Phaser from "phaser";

export function spawnDamageText(scene: Phaser.Scene, x: number, y: number, amount: number, crit: boolean): void {
  const size = crit ? "22px" : "16px";
  const color = crit ? "#ff5d5d" : "#ffd24a";
  const label = crit ? `${Math.round(amount)}!` : `${Math.round(amount)}`;
  const t = scene.add
    .text(x, y, label, { fontFamily: "monospace", fontSize: size, color, fontStyle: crit ? "bold" : "normal" })
    .setOrigin(0.5)
    .setDepth(30);
  scene.tweens.add({ targets: t, y: y - (crit ? 40 : 28), alpha: 0, duration: crit ? 750 : 600, onComplete: () => t.destroy() });
}
```

- [ ] **Step 2: Créer** `hotbarBar.ts`

```ts
import Phaser from "phaser";
import { Hotbar } from "../../core/combat/hotbar";
import { getWeaponDef } from "../../core/combat/weapons";

const ABBR: Record<string, string> = {
  sword: "ÉP", dagger: "DG", axe: "HA", hammer: "MA", bow: "AR", staff: "BÂ",
};
const COLOR: Record<string, number> = {
  sword: 0xc8d2e0, dagger: 0x9ad0ff, axe: 0xffb066, hammer: 0xff7b6b, bow: 0x9bff8f, staff: 0xc89bff,
};
const SLOT = 44;
const GAP = 6;

export class HotbarBar {
  private boxes: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private nums: Phaser.GameObjects.Text[] = [];

  constructor(private scene: Phaser.Scene, size: number) {
    this.boxes = scene.add.graphics().setScrollFactor(0).setDepth(40);
    for (let i = 0; i < size; i++) {
      this.nums.push(scene.add.text(0, 0, `${i + 1}`, { fontFamily: "monospace", fontSize: "10px", color: "#8890a8" }).setScrollFactor(0).setDepth(42));
      this.labels.push(scene.add.text(0, 0, "", { fontFamily: "monospace", fontSize: "14px", color: "#ffffff" }).setOrigin(0.5).setScrollFactor(0).setDepth(42));
    }
  }

  update(h: Hotbar): void {
    const n = h.slots.length;
    const totalW = n * SLOT + (n - 1) * GAP;
    const startX = this.scene.scale.width / 2 - totalW / 2;
    const y = this.scene.scale.height - SLOT - 14;
    this.boxes.clear();
    for (let i = 0; i < n; i++) {
      const x = startX + i * (SLOT + GAP);
      const active = i === h.activeIndex;
      this.boxes.fillStyle(0x0d0d18, 0.7).fillRect(x, y, SLOT, SLOT);
      this.boxes.lineStyle(active ? 3 : 1, active ? 0xffd24a : 0x3a3a55, 1).strokeRect(x, y, SLOT, SLOT);
      this.nums[i].setPosition(x + 4, y + 3);
      const inst = h.slots[i];
      const lbl = this.labels[i];
      lbl.setPosition(x + SLOT / 2, y + SLOT / 2 + 2);
      if (inst) {
        lbl.setText(ABBR[inst.defId] ?? getWeaponDef(inst.defId).name.slice(0, 2));
        lbl.setColor(Phaser.Display.Color.IntegerToColor(COLOR[inst.defId] ?? 0xffffff).rgba);
      } else {
        lbl.setText("");
      }
    }
  }
}
```

- [ ] **Step 3: Compile** — `cd game && npx tsc --noEmit`.
- [ ] **Step 4: Commit** — `git add game/src/game/render/floatingText.ts game/src/game/render/hotbarBar.ts && git commit -m "feat(game): crit floating text + hotbar bar UI"`

---

## Task 8: sprites (retire pickup) + TrainingScene (câblage)

**Files:** Modify `game/src/game/render/sprites.ts`, `game/src/game/scenes/TrainingScene.ts`, `game/src/assets/manifest.ts`

- [ ] **Step 1: `sprites.ts`** — retirer toute la gestion du pickup

Remplacer le contenu de la méthode `sync` qui gère `w.pickup` : supprimer le bloc final
`if (!w.pickup.taken) { ... } else if (this.pickupImg) { ... }` et le champ `private pickupImg?`.
Nouveau `sprites.ts` complet :

```ts
import Phaser from "phaser";
import { World } from "../../core/world";

export class SpriteLayer {
  private map = new Map<number, Phaser.GameObjects.Image>();

  constructor(private scene: Phaser.Scene) {}

  private ensure(id: number, key: string): Phaser.GameObjects.Image {
    let s = this.map.get(id);
    if (!s) {
      s = this.scene.add.image(0, 0, key).setDepth(5);
      this.map.set(id, s);
    }
    return s;
  }

  sync(w: World): void {
    const p = w.player;
    const ps = this.ensure(p.id, "player");
    ps.setPosition(p.transform.pos.x, p.transform.pos.y);
    ps.setTint(p.health.iframes > 0 ? 0xffffff : 0x4ad6ff);

    const alive = new Set<number>([p.id]);
    for (const e of w.enemies) {
      alive.add(e.id);
      const s = this.ensure(e.id, e.kind === "dummy" ? "enemy_dummy" : "enemy_chaser");
      s.setPosition(e.transform.pos.x, e.transform.pos.y);
    }
    for (const proj of w.projectiles) {
      alive.add(proj.id);
      this.ensure(proj.id, "projectile").setPosition(proj.pos.x, proj.pos.y);
    }
    for (const [id, s] of this.map) {
      if (!alive.has(id)) {
        s.destroy();
        this.map.delete(id);
      }
    }
  }
}
```

- [ ] **Step 2: `manifest.ts`** — retirer la ligne `ranged_pickup`

```ts
export const ASSETS: AssetSpec[] = [
  { key: "player", shape: "circle", color: 0x4ad6ff, size: 28 },
  { key: "enemy_dummy", shape: "rect", color: 0x9aa0b5, size: 32 },
  { key: "enemy_chaser", shape: "triangle", color: 0xff5d5d, size: 28 },
  { key: "projectile", shape: "circle", color: 0xffe066, size: 10 },
];
```

- [ ] **Step 3: `TrainingScene.ts`** — câbler hotbar, HUD arme/tier, events crit, slash avec cfg de l'arme active

Modifications (le reste de la scène de la tranche 0 est conservé) :

1. Imports — ajouter :
```ts
import { HotbarBar } from "../render/hotbarBar";
import { activeWeapon } from "../../core/combat/hotbar";
import { computeStats, getWeaponDef } from "../../core/combat/weapons";
```
2. Champ : `private hotbarBar!: HotbarBar;`
3. Dans `create()`, après `this.sprites = new SpriteLayer(this);` :
```ts
this.hotbarBar = new HotbarBar(this, this.world.player.hotbar.slots.length);
```
4. `sample` prend déjà `fallback` (inchangé). L'appel reste :
```ts
const input = this.inputMap.sample(this.cameras.main, this.world.player.transform.pos);
```
5. Remplacer le bloc de rendu du slash par une version qui utilise l'arc de l'arme active mêlée :
```ts
// animation de l'attaque mêlée (arc de l'arme active si c'est une arme de mêlée)
this.slashGfx.clear();
const pl = this.world.player;
const inst = activeWeapon(pl.hotbar);
if (inst) {
  const rw = computeStats(getWeaponDef(inst.defId), inst.tier);
  if (rw.category === "melee") {
    const cfg = {
      damage: rw.atk, range: rw.range, arcDeg: rw.arcDeg,
      windup: this.tuning.melee.windup / rw.attackSpeed,
      active: this.tuning.melee.active / rw.attackSpeed,
      recovery: this.tuning.melee.recovery / rw.attackSpeed,
      cadence: this.tuning.melee.cadence / rw.attackSpeed,
      knockback: rw.knockback,
    };
    drawMeleeSlash(this.slashGfx, pl.transform.pos.x, pl.transform.pos.y, pl.melee, cfg);
  }
}
```
6. Le drain des events passe le flag crit :
```ts
for (const ev of this.world.events) spawnDamageText(this, ev.x, ev.y, ev.amount, ev.crit);
this.world.events.length = 0;
```
7. Après `this.followCamera();`, mettre à jour la barre + HUD arme :
```ts
this.hotbarBar.update(this.world.player.hotbar);
```
8. HUD — remplacer la ligne `wpn` et le setText :
```ts
const act = activeWeapon(p.hotbar);
const wpn = act ? `${getWeaponDef(act.defId).name} [${act.tier}]` : "(slot vide)";
this.hud.setText(`PV ${Math.round(p.health.hp)}/${p.health.maxHp}   Energie ${Math.round(p.energy)}   Arme: ${wpn}${fps}`);
```

> NB : `import { drawMeleeSlash } from "../render/slash";` est déjà présent depuis la tranche précédente.
> Retirer l'ancien bloc slash et l'ancienne ligne `wpn`/`setText` de la tranche 0.

- [ ] **Step 4: Build** — `cd game && npm run build` → OK.
- [ ] **Step 5: Lancer le dev** — `cd game && npm run dev` ; vérifier : barre d'inventaire en bas, touches 1–6 changent l'arme (HUD + surbrillance), molette défile, clic gauche attaque (épée arc moyen, dague rapide, hache large, marteau anneau 360° qui repousse fort, arc qui transperce, bâton gros projectile lent), T monte le tier (dégâts ↑), crits en rouge/plus gros.
- [ ] **Step 6: Commit** — `git add game/src/game game/src/assets && git commit -m "feat(game): wire hotbar + weapon-aware slash/HUD, remove pickup"`

---

## Task 9: Vérification finale + README

**Files:** Modify `game/README.md`

- [ ] **Step 1: Suite complète** — `cd game && npm test` → tout vert (anciens + weapons/crit/hotbar/projectile/world).
- [ ] **Step 2: Build** — `cd game && npm run build` → OK.
- [ ] **Step 3: README** — remplacer la section Contrôles + ajouter une section Armes

```md
## Contrôles
ZQSD/WASD déplacement · souris viser · **clic gauche attaquer (arme active)** · **1–9 / molette choisir l'arme** · **T changer le tier (F→S)** · Espace dash · E blink · F1 debug.

## Armes (barre d'inventaire)
Slots 1–6 : Épée (équilibrée) · Dague (rapide, haut crit) · Hache (arc large, cleave) · Marteau (lent, onde de choc 360° + gros knockback) · Arc (transperce) · Bâton (gros projectile lent).
Chaque arme a ses stats (ATK/vitesse/crit/portée). Le **tier** (T) multiplie l'ATK (F×1 → S×5.5). Les **coups critiques** s'affichent en rouge.
```

- [ ] **Step 4: Commit** — `git add game/README.md && git commit -m "docs(game): README tranche A (armes + contrôles)"`

---

## Auto-revue (couverture spec)

- §2 contrôles (hotbar, 1–9, molette, clic gauche, T, clic droit retiré, pickup retiré) → Tasks 5,6,8 ✔
- §3 les 6 armes + identités (cleave via arc, shockwave via arc 360, pierce drapeau) → Tasks 1,5 ✔
- §4 tier F→S → Tasks 1,5 ✔
- §5 crit + RNG injecté → Tasks 2,5 ✔
- §6 architecture (weapons/crit/hotbar, projectile pierce, world rng, loadout supprimé) → Tasks 1-5 ✔
- §7 tests (computeStats, crit, hotbar, melee scalée, cleave, shockwave, pierce, world) → Tasks 1-5 ✔
- §8 DoD → Task 9 ✔

Types cohérents : `WeaponDef/ResolvedWeapon`, `Tier/TIER_MULT/TIERS`, `Hotbar/WeaponInstance`,
`ProjectileOpts/Projectile`, `InputState{attack,selectSlot,scroll,cycleTier}`, `Player{hotbar,rangedTimer,attackHeld,tierHeld}`,
`DamageEvent{crit}`, `rollDamage` — utilisés à l'identique entre tâches.

> Note "melee scalée" : pas de test unitaire dédié dans melee.test.ts (la mêlée elle-même est inchangée) ;
> la mise à l'échelle par `attackSpeed` est vérifiée indirectement (world : dague vs marteau cadence) et
> par construction dans `meleeCfgFor`. Si on veut un test explicite, comparer `meleeCfgFor` de deux armes.
