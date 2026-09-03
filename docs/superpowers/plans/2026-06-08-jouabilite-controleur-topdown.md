# Jouabilité & contrôleur top-down — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le socle de jouabilité d'un action-RPG top-down (Phaser 3 + TypeScript) : déplacement avec inertie, dash + i-frames, blink, mêlée, tir à distance *gaté par une arme ramassée*, ennemi poursuiveur, caméra, mode debug — avec toute la logique en `core/` testée en headless.

**Architecture:** Deux couches strictement séparées. `core/` = logique pure TypeScript (aucun import Phaser), simulée à pas de temps fixe et testée avec Vitest. `game/` = couche Phaser qui traduit l'input matériel en `InputState` et l'état du `core/` en rendu. Le `core/` possède toute la simulation (mouvement, collisions cercle/murs, combat) ; Phaser ne fait qu'afficher.

**Tech Stack:** Phaser 3, TypeScript, Vite (dev/build), Vitest (tests). Aucune dépendance d'UI debug (DOM natif).

> Référence : spec `docs/superpowers/specs/2026-06-08-jouabilite-controleur-topdown-design.md`.

---

## Structure des fichiers

```
game/
├─ index.html                       # point d'entrée Vite
├─ package.json                     # deps + scripts (dev/build/test)
├─ tsconfig.json
├─ vite.config.ts
├─ vitest.config.ts
├─ src/
│  ├─ main.ts                       # bootstrap Phaser.Game
│  ├─ core/
│  │  ├─ math/vec2.ts               # Vec2 + opérations pures
│  │  ├─ config/tuning.ts           # Tuning (types) + DEFAULT_TUNING
│  │  ├─ time/fixedStep.ts          # accumulateur pas-de-temps fixe
│  │  ├─ entity.ts                  # Entity, Transform, Health, helpers
│  │  ├─ movement.ts                # inertie accel/friction
│  │  ├─ abilities/dash.ts          # machine à états dash + i-frames
│  │  ├─ abilities/blink.ts         # téléport, clamp sur murs
│  │  ├─ combat/melee.ts            # arc de frappe + timings
│  │  ├─ combat/projectile.ts       # projectiles
│  │  ├─ combat/weapon.ts           # loadout + gating tir à distance
│  │  ├─ combat/damage.ts           # application dégâts (respect i-frames)
│  │  ├─ ai/chaser.ts               # direction de poursuite
│  │  ├─ collision.ts               # murs/bounds + canOccupy + cercle
│  │  └─ world.ts                   # InputState + tickWorld (orchestration)
│  ├─ game/
│  │  ├─ scenes/TrainingScene.ts    # salle de test (assemble tout)
│  │  ├─ input/inputMap.ts          # clavier+souris → InputState
│  │  ├─ render/sprites.ts          # création/sync des sprites depuis le core
│  │  ├─ render/floatingText.ts     # nombres de dégâts flottants
│  │  └─ debug/debugPanel.ts        # overlay DOM : réglages live + toggles
│  └─ assets/
│     ├─ manifest.ts                # nom logique → placeholder/fichier
│     ├─ placeholders.ts            # génération de textures géométriques
│     └─ README.md                  # format attendu pour les PNG utilisateur
└─ tests/                           # miroir Vitest de core/
   ├─ vec2.test.ts
   ├─ fixedStep.test.ts
   ├─ entity.test.ts
   ├─ movement.test.ts
   ├─ dash.test.ts
   ├─ blink.test.ts
   ├─ melee.test.ts
   ├─ projectile.test.ts
   ├─ weapon.test.ts
   ├─ damage.test.ts
   ├─ chaser.test.ts
   ├─ collision.test.ts
   └─ world.test.ts
```

**Convention d'angles & d'unités** : positions en pixels, temps en **secondes** (les deltas Phaser, en ms, sont convertis ÷1000 dans la scène). Vecteurs `Vec2 = {x, y}`. Y vers le bas (convention écran).

---

## Task 0: Scaffold du projet (Vite + TS + Phaser + Vitest)

**Files:**
- Create: `game/package.json`, `game/tsconfig.json`, `game/vite.config.ts`, `game/vitest.config.ts`, `game/index.html`, `game/src/main.ts`
- Test: `game/tests/smoke.test.ts`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "topdown-roguelite",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "phaser": "^3.80.1"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: `vite.config.ts`, `vitest.config.ts`, `index.html`**

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
export default defineConfig({ server: { host: true } });
```
`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { globals: true, environment: "node" } });
```
`index.html`:
```html
<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8" /><title>Top-down Roguelite</title>
    <style>html,body{margin:0;background:#10101a;overflow:hidden}</style>
  </head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>
```

- [ ] **Step 4: Minimal `src/main.ts`** (la TrainingScene viendra Task 12 ; pour l'instant une scène vide)

```ts
import Phaser from "phaser";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#10101a",
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: 960, height: 540 },
  scene: { create() { /* TrainingScene branchée plus tard */ } },
};
new Phaser.Game(config);
```

- [ ] **Step 5: Smoke test `tests/smoke.test.ts`**

```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => { it("runs", () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 6: Installer & vérifier**

Run: `cd game && npm install && npm test && npm run build`
Expected: install OK ; test PASS (1 passed) ; build OK (dist généré).

- [ ] **Step 7: Commit**

```bash
git add game
git commit -m "chore(game): scaffold Vite + TS + Phaser + Vitest"
```

---

## Task 1: Vec2 (math pure)

**Files:** Create `game/src/core/math/vec2.ts` — Test `game/tests/vec2.test.ts`

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { v, add, sub, scale, length, normalize, distance, clampLength } from "../src/core/math/vec2";

describe("vec2", () => {
  it("add/sub/scale", () => {
    expect(add(v(1, 2), v(3, 4))).toEqual({ x: 4, y: 6 });
    expect(sub(v(3, 4), v(1, 1))).toEqual({ x: 2, y: 3 });
    expect(scale(v(2, 3), 2)).toEqual({ x: 4, y: 6 });
  });
  it("length/distance", () => {
    expect(length(v(3, 4))).toBe(5);
    expect(distance(v(0, 0), v(0, 5))).toBe(5);
  });
  it("normalize d'un vecteur nul = (0,0)", () => {
    expect(normalize(v(0, 0))).toEqual({ x: 0, y: 0 });
    const n = normalize(v(0, 10)); expect(n.x).toBe(0); expect(n.y).toBeCloseTo(1);
  });
  it("clampLength plafonne", () => {
    const c = clampLength(v(0, 10), 4); expect(length(c)).toBeCloseTo(4);
    expect(clampLength(v(0, 2), 4)).toEqual({ x: 0, y: 2 });
  });
});
```

- [ ] **Step 2: Run → FAIL** (`cd game && npx vitest run tests/vec2.test.ts`) — module introuvable.

- [ ] **Step 3: Implémenter**

```ts
export interface Vec2 { x: number; y: number; }
export const v = (x = 0, y = 0): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const length = (a: Vec2): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const normalize = (a: Vec2): Vec2 => {
  const l = length(a); return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};
export const clampLength = (a: Vec2, max: number): Vec2 => {
  const l = length(a); return l <= max ? { x: a.x, y: a.y } : scale(a, max / l);
};
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/math game/tests/vec2.test.ts && git commit -m "feat(core): vec2 math"`

---

## Task 2: Tuning (config centrale)

**Files:** Create `game/src/core/config/tuning.ts` (pas de test dédié — c'est de la donnée ; couvert indirectement).

- [ ] **Step 1: Implémenter**

```ts
export interface Tuning {
  move: { maxSpeed: number; accel: number; friction: number };
  dash: { distance: number; duration: number; iframes: number; cooldown: number };
  blink: { range: number; cooldown: number; energyCost: number };
  melee: { damage: number; range: number; arcDeg: number; windup: number; active: number; recovery: number; cadence: number; knockback: number };
  ranged: { damage: number; projectileSpeed: number; lifetime: number; cadence: number };
  resources: { maxHp: number; maxEnergy: number; energyRegen: number };
  chaser: { speed: number; contactDamage: number; contactCadence: number };
}

export const DEFAULT_TUNING: Tuning = {
  move: { maxSpeed: 220, accel: 2000, friction: 1800 },
  dash: { distance: 180, duration: 0.18, iframes: 0.25, cooldown: 0.8 },
  blink: { range: 220, cooldown: 3, energyCost: 20 },
  melee: { damage: 15, range: 60, arcDeg: 90, windup: 0.06, active: 0.08, recovery: 0.12, cadence: 0.4, knockback: 180 },
  ranged: { damage: 8, projectileSpeed: 480, lifetime: 1.2, cadence: 0.25 },
  resources: { maxHp: 100, maxEnergy: 100, energyRegen: 12 },
  chaser: { speed: 120, contactDamage: 5, contactCadence: 0.6 },
};
```

- [ ] **Step 2: Vérifier compile** — `cd game && npx tsc --noEmit`
- [ ] **Step 3: Commit** — `git add game/src/core/config && git commit -m "feat(core): tuning config"`

---

## Task 3: FixedStep (pas de temps fixe)

**Files:** Create `game/src/core/time/fixedStep.ts` — Test `game/tests/fixedStep.test.ts`

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { FixedStep } from "../src/core/time/fixedStep";

describe("FixedStep (step=0.1s)", () => {
  it("accumule et rend le bon nombre de ticks", () => {
    const fs = new FixedStep(0.1);
    expect(fs.advance(0.05)).toBe(0); // pas assez
    expect(fs.advance(0.06)).toBe(1); // total 0.11 → 1 tick, reste 0.01
    expect(fs.advance(0.30)).toBe(3); // total 0.31 → 3 ticks, reste 0.01
  });
  it("plafonne pour éviter la spirale de la mort", () => {
    const fs = new FixedStep(0.1, 5);
    expect(fs.advance(100)).toBe(5);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter**

```ts
export class FixedStep {
  private acc = 0;
  constructor(public readonly step: number, private readonly maxTicks = 5) {}
  /** Ajoute le delta (s) et renvoie le nombre de ticks fixes à exécuter. */
  advance(deltaSeconds: number): number {
    this.acc += deltaSeconds;
    let ticks = 0;
    while (this.acc >= this.step && ticks < this.maxTicks) { this.acc -= this.step; ticks++; }
    if (ticks >= this.maxTicks) this.acc = 0; // anti-spirale
    return ticks;
  }
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/time game/tests/fixedStep.test.ts && git commit -m "feat(core): fixed timestep accumulator"`

---

## Task 4: Entity / Transform / Health

**Files:** Create `game/src/core/entity.ts` — Test `game/tests/entity.test.ts`

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { makeEntity, isInvulnerable, tickIframes } from "../src/core/entity";

describe("entity", () => {
  it("makeEntity initialise pos/vel/hp", () => {
    const e = makeEntity({ id: 1, x: 10, y: 20, maxHp: 100, radius: 12, faction: "enemy" });
    expect(e.transform.pos).toEqual({ x: 10, y: 20 });
    expect(e.transform.vel).toEqual({ x: 0, y: 0 });
    expect(e.health.hp).toBe(100);
    expect(e.health.iframes).toBe(0);
  });
  it("iframes : invulnérable puis décrément", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 50, radius: 10, faction: "player" });
    e.health.iframes = 0.25;
    expect(isInvulnerable(e)).toBe(true);
    tickIframes(e, 0.1); expect(e.health.iframes).toBeCloseTo(0.15);
    tickIframes(e, 1); expect(e.health.iframes).toBe(0); expect(isInvulnerable(e)).toBe(false);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter**

```ts
import { Vec2, v } from "./math/vec2";

export type Faction = "player" | "enemy" | "neutral";
export interface Transform { pos: Vec2; vel: Vec2; }
export interface Health { hp: number; maxHp: number; iframes: number; }
export interface Entity {
  id: number; transform: Transform; health: Health; radius: number; faction: Faction;
}

export function makeEntity(o: { id: number; x: number; y: number; maxHp: number; radius: number; faction: Faction; }): Entity {
  return {
    id: o.id, radius: o.radius, faction: o.faction,
    transform: { pos: v(o.x, o.y), vel: v(0, 0) },
    health: { hp: o.maxHp, maxHp: o.maxHp, iframes: 0 },
  };
}
export const isInvulnerable = (e: Entity): boolean => e.health.iframes > 0;
export function tickIframes(e: Entity, dt: number): void {
  e.health.iframes = Math.max(0, e.health.iframes - dt);
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/entity.ts game/tests/entity.test.ts && git commit -m "feat(core): entity/transform/health"`

---

## Task 5: Movement (inertie)

**Files:** Create `game/src/core/movement.ts` — Test `game/tests/movement.test.ts`

`applyMovement(t, moveDir, cfg, dt)` : accélère `vel` vers `moveDir*maxSpeed`, applique la friction si `moveDir` nul, clampe à `maxSpeed`, intègre `pos += vel*dt`.

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { applyMovement } from "../src/core/movement";
import { v } from "../src/core/math/vec2";

const cfg = { maxSpeed: 200, accel: 2000, friction: 1800 };

describe("movement", () => {
  it("accélère vers la vitesse cible sans dépasser maxSpeed", () => {
    const t = { pos: v(0, 0), vel: v(0, 0) };
    for (let i = 0; i < 60; i++) applyMovement(t, v(1, 0), cfg, 1 / 60);
    expect(t.vel.x).toBeCloseTo(200, 0); expect(t.vel.x).toBeLessThanOrEqual(200.0001);
  });
  it("friction ramène la vitesse à zéro quand input nul", () => {
    const t = { pos: v(0, 0), vel: v(200, 0) };
    for (let i = 0; i < 60; i++) applyMovement(t, v(0, 0), cfg, 1 / 60);
    expect(t.vel.x).toBeCloseTo(0, 1);
  });
  it("intègre la position", () => {
    const t = { pos: v(0, 0), vel: v(0, 0) };
    applyMovement(t, v(1, 0), cfg, 0.1);
    expect(t.pos.x).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter**

```ts
import { Transform } from "./entity";
import { Vec2, length, normalize, scale, clampLength } from "./math/vec2";

export interface MoveCfg { maxSpeed: number; accel: number; friction: number; }

export function applyMovement(t: Transform, moveDir: Vec2, cfg: MoveCfg, dt: number): void {
  const dir = normalize(moveDir);
  if (length(moveDir) > 0) {
    const target = scale(dir, cfg.maxSpeed);
    t.vel.x += (target.x - t.vel.x) === 0 ? 0 : Math.sign(target.x - t.vel.x) * Math.min(cfg.accel * dt, Math.abs(target.x - t.vel.x));
    t.vel.y += (target.y - t.vel.y) === 0 ? 0 : Math.sign(target.y - t.vel.y) * Math.min(cfg.accel * dt, Math.abs(target.y - t.vel.y));
  } else {
    const sp = length(t.vel);
    if (sp > 0) {
      const dec = Math.min(sp, cfg.friction * dt);
      const nv = scale(normalize(t.vel), sp - dec);
      t.vel.x = nv.x; t.vel.y = nv.y;
    }
  }
  const clamped = clampLength(t.vel, cfg.maxSpeed);
  t.vel.x = clamped.x; t.vel.y = clamped.y;
  t.pos.x += t.vel.x * dt; t.pos.y += t.vel.y * dt;
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/movement.ts game/tests/movement.test.ts && git commit -m "feat(core): movement with inertia"`

---

## Task 6: Dash (machine à états + i-frames)

**Files:** Create `game/src/core/abilities/dash.ts` — Test `game/tests/dash.test.ts`

États : `ready | dashing`. `startDash` échoue si pas `ready` ou cooldown > 0 ou direction nulle. Pendant `dashing` : `vel = dir * (distance/duration)`, et au démarrage on pose `health.iframes = max(courant, dash.iframes)`. Fin → cooldown.

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { createDash, startDash, tickDash } from "../src/core/abilities/dash";
import { makeEntity, isInvulnerable } from "../src/core/entity";
import { v } from "../src/core/math/vec2";

const cfg = { distance: 180, duration: 0.18, iframes: 0.25, cooldown: 0.8 };

describe("dash", () => {
  it("démarre, donne i-frames, impose la vitesse", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 100, radius: 10, faction: "player" });
    const d = createDash();
    expect(startDash(d, v(1, 0), e, cfg)).toBe(true);
    expect(d.phase).toBe("dashing");
    expect(isInvulnerable(e)).toBe(true);
    tickDash(d, e, cfg, 1 / 60);
    expect(e.transform.vel.x).toBeCloseTo(180 / 0.18, 0);
  });
  it("refuse un second dash tant que pas terminé/cooldown", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 100, radius: 10, faction: "player" });
    const d = createDash(); startDash(d, v(1, 0), e, cfg);
    expect(startDash(d, v(0, 1), e, cfg)).toBe(false);
    for (let i = 0; i < 12; i++) tickDash(d, e, cfg, 1 / 60); // ~0.2s → fin dash, en cooldown
    expect(d.phase).toBe("ready");
    expect(startDash(d, v(0, 1), e, cfg)).toBe(false); // cooldown actif
  });
  it("redevient disponible après le cooldown", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 100, radius: 10, faction: "player" });
    const d = createDash(); startDash(d, v(1, 0), e, cfg);
    for (let i = 0; i < 120; i++) tickDash(d, e, cfg, 1 / 60); // > duration + cooldown
    expect(startDash(d, v(0, 1), e, cfg)).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter**

```ts
import { Entity } from "../entity";
import { Vec2, normalize, length, scale } from "../math/vec2";

export interface DashCfg { distance: number; duration: number; iframes: number; cooldown: number; }
export type DashPhase = "ready" | "dashing";
export interface DashState { phase: DashPhase; timeLeft: number; cooldownLeft: number; dir: Vec2; }

export const createDash = (): DashState => ({ phase: "ready", timeLeft: 0, cooldownLeft: 0, dir: { x: 0, y: 0 } });

export function startDash(d: DashState, dir: Vec2, e: Entity, cfg: DashCfg): boolean {
  if (d.phase !== "ready" || d.cooldownLeft > 0 || length(dir) === 0) return false;
  d.phase = "dashing"; d.timeLeft = cfg.duration; d.dir = normalize(dir);
  e.health.iframes = Math.max(e.health.iframes, cfg.iframes);
  return true;
}

export function tickDash(d: DashState, e: Entity, cfg: DashCfg, dt: number): void {
  if (d.cooldownLeft > 0) d.cooldownLeft = Math.max(0, d.cooldownLeft - dt);
  if (d.phase === "dashing") {
    const speed = cfg.distance / cfg.duration;
    const vel = scale(d.dir, speed);
    e.transform.vel.x = vel.x; e.transform.vel.y = vel.y;
    e.transform.pos.x += vel.x * dt; e.transform.pos.y += vel.y * dt;
    d.timeLeft -= dt;
    if (d.timeLeft <= 0) { d.phase = "ready"; d.cooldownLeft = cfg.cooldown; }
  }
}
export const isDashing = (d: DashState): boolean => d.phase === "dashing";
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/abilities/dash.ts game/tests/dash.test.ts && git commit -m "feat(core): dash with i-frames"`

---

## Task 7: Collision (murs/bounds + canOccupy)

**Files:** Create `game/src/core/collision.ts` — Test `game/tests/collision.test.ts`

Le monde a une `bounds` (rect) et des `walls` (rects). `canOccupy(point, radius, level)` = le cercle tient dans les bounds et ne chevauche aucun mur. Sert au blink (clamp) et au confinement.

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { canOccupy, clampToBounds, Level } from "../src/core/collision";
import { v } from "../src/core/math/vec2";

const level: Level = { bounds: { x: 0, y: 0, w: 1000, h: 1000 }, walls: [{ x: 400, y: 400, w: 100, h: 100 }] };

describe("collision", () => {
  it("refuse hors bounds", () => { expect(canOccupy(v(-5, 50), 10, level)).toBe(false); });
  it("refuse dans un mur", () => { expect(canOccupy(v(450, 450), 10, level)).toBe(false); });
  it("accepte une case libre", () => { expect(canOccupy(v(100, 100), 10, level)).toBe(true); });
  it("clampToBounds garde le cercle dedans", () => {
    const p = clampToBounds(v(-50, 2000), 10, level.bounds);
    expect(p.x).toBe(10); expect(p.y).toBe(1000 - 10);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter**

```ts
import { Vec2 } from "./math/vec2";
export interface Rect { x: number; y: number; w: number; h: number; }
export interface Level { bounds: Rect; walls: Rect[]; }

const circleHitsRect = (p: Vec2, r: number, rect: Rect): boolean => {
  const cx = Math.max(rect.x, Math.min(p.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(p.y, rect.y + rect.h));
  return (p.x - cx) ** 2 + (p.y - cy) ** 2 < r * r;
};

export function canOccupy(p: Vec2, r: number, level: Level): boolean {
  const b = level.bounds;
  if (p.x - r < b.x || p.y - r < b.y || p.x + r > b.x + b.w || p.y + r > b.y + b.h) return false;
  for (const w of level.walls) if (circleHitsRect(p, r, w)) return false;
  return true;
}

export function clampToBounds(p: Vec2, r: number, b: Rect): Vec2 {
  return {
    x: Math.max(b.x + r, Math.min(p.x, b.x + b.w - r)),
    y: Math.max(b.y + r, Math.min(p.y, b.y + b.h - r)),
  };
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/collision.ts game/tests/collision.test.ts && git commit -m "feat(core): collision (bounds/walls/canOccupy)"`

---

## Task 8: Blink (téléport, clamp sur murs)

**Files:** Create `game/src/core/abilities/blink.ts` — Test `game/tests/blink.test.ts`

`doBlink` : direction vers `aimPoint`, distance plafonnée à `range` ; marche par petits pas et s'arrête au dernier point `canOccupy` (clamp mur) ; consomme énergie ; pose cooldown. Refuse si cooldown>0 ou énergie insuffisante.

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { createBlink, doBlink, tickBlink } from "../src/core/abilities/blink";
import { canOccupy, Level } from "../src/core/collision";
import { makeEntity } from "../src/core/entity";
import { v } from "../src/core/math/vec2";

const cfg = { range: 200, cooldown: 3, energyCost: 20 };
const open: Level = { bounds: { x: 0, y: 0, w: 1000, h: 1000 }, walls: [] };
const walled: Level = { bounds: { x: 0, y: 0, w: 1000, h: 1000 }, walls: [{ x: 120, y: 0, w: 20, h: 1000 }] };
const occ = (lvl: Level) => (p: { x: number; y: number }) => canOccupy(p, 10, lvl);

describe("blink", () => {
  it("téléporte jusqu'à la portée vers la visée", () => {
    const e = makeEntity({ id: 1, x: 100, y: 100, maxHp: 100, radius: 10, faction: "player" });
    const energy = { value: 100 }; const b = createBlink();
    expect(doBlink(b, e, v(1000, 100), energy, cfg, occ(open))).toBe(true);
    expect(e.transform.pos.x).toBeCloseTo(300, 0); // 100 + range 200
    expect(energy.value).toBe(80); expect(b.cooldownLeft).toBeCloseTo(3);
  });
  it("s'arrête avant un mur", () => {
    const e = makeEntity({ id: 1, x: 100, y: 100, maxHp: 100, radius: 10, faction: "player" });
    const energy = { value: 100 }; const b = createBlink();
    expect(doBlink(b, e, v(1000, 100), energy, cfg, occ(walled))).toBe(true);
    expect(e.transform.pos.x).toBeLessThan(120); // bloqué avant le mur à x=120
  });
  it("refuse sans énergie ou en cooldown", () => {
    const e = makeEntity({ id: 1, x: 100, y: 100, maxHp: 100, radius: 10, faction: "player" });
    const b = createBlink();
    expect(doBlink(b, e, v(200, 100), { value: 5 }, cfg, occ(open))).toBe(false);
    doBlink(b, e, v(200, 100), { value: 100 }, cfg, occ(open));
    expect(doBlink(b, e, v(200, 100), { value: 100 }, cfg, occ(open))).toBe(false); // cooldown
    tickBlink(b, 3); expect(b.cooldownLeft).toBe(0);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter**

```ts
import { Entity } from "../entity";
import { Vec2, sub, normalize, length, add, scale } from "../math/vec2";

export interface BlinkCfg { range: number; cooldown: number; energyCost: number; }
export interface BlinkState { cooldownLeft: number; }
export const createBlink = (): BlinkState => ({ cooldownLeft: 0 });
export function tickBlink(b: BlinkState, dt: number): void { b.cooldownLeft = Math.max(0, b.cooldownLeft - dt); }

export function doBlink(
  b: BlinkState, e: Entity, aimPoint: Vec2, energy: { value: number },
  cfg: BlinkCfg, canOccupy: (p: Vec2) => boolean,
): boolean {
  if (b.cooldownLeft > 0 || energy.value < cfg.energyCost) return false;
  const toAim = sub(aimPoint, e.transform.pos);
  if (length(toAim) === 0) return false;
  const dir = normalize(toAim);
  const maxDist = Math.min(cfg.range, length(toAim));
  const stepLen = 4;
  let best = { x: e.transform.pos.x, y: e.transform.pos.y };
  for (let d = stepLen; d <= maxDist; d += stepLen) {
    const candidate = add(e.transform.pos, scale(dir, d));
    if (canOccupy(candidate)) best = candidate; else break;
  }
  e.transform.pos.x = best.x; e.transform.pos.y = best.y;
  energy.value -= cfg.energyCost; b.cooldownLeft = cfg.cooldown;
  return true;
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/abilities/blink.ts game/tests/blink.test.ts && git commit -m "feat(core): blink with wall clamp"`

---

## Task 9: Damage (respect i-frames + knockback)

**Files:** Create `game/src/core/combat/damage.ts` — Test `game/tests/damage.test.ts`

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { applyDamage } from "../src/core/combat/damage";
import { makeEntity } from "../src/core/entity";
import { v } from "../src/core/math/vec2";

describe("damage", () => {
  it("inflige des dégâts + knockback hors i-frames", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 100, radius: 10, faction: "enemy" });
    const hit = applyDamage(e, 15, v(180, 0));
    expect(hit).toBe(true); expect(e.health.hp).toBe(85);
    expect(e.transform.vel.x).toBeCloseTo(180);
  });
  it("ignoré pendant les i-frames", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 100, radius: 10, faction: "player" });
    e.health.iframes = 0.2;
    expect(applyDamage(e, 15, v(0, 0))).toBe(false);
    expect(e.health.hp).toBe(100);
  });
  it("ne descend pas sous 0", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 10, radius: 10, faction: "enemy" });
    applyDamage(e, 999, v(0, 0)); expect(e.health.hp).toBe(0);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter**

```ts
import { Entity, isInvulnerable } from "../entity";
import { Vec2 } from "../math/vec2";

export function applyDamage(target: Entity, amount: number, knockback: Vec2): boolean {
  if (isInvulnerable(target)) return false;
  target.health.hp = Math.max(0, target.health.hp - amount);
  target.transform.vel.x += knockback.x; target.transform.vel.y += knockback.y;
  return true;
}
export const isDead = (e: Entity): boolean => e.health.hp <= 0;
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/combat/damage.ts game/tests/damage.test.ts && git commit -m "feat(core): damage application"`

---

## Task 10: Melee (arc + timings + une touche par swing)

**Files:** Create `game/src/core/combat/melee.ts` — Test `game/tests/melee.test.ts`

États `idle | windup | active | recovery`. `startMelee` gaté par cadence (≥ `cadence` depuis le dernier départ). `targetsInArc` renvoie les entités dans la portée ET dans le demi-angle autour de `aimDir`. `hitIds` empêche le double-coup par swing.

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { createMelee, startMelee, tickMelee, isMeleeActive, targetsInArc } from "../src/core/combat/melee";
import { makeEntity } from "../src/core/entity";
import { v } from "../src/core/math/vec2";

const cfg = { damage: 15, range: 60, arcDeg: 90, windup: 0.06, active: 0.08, recovery: 0.12, cadence: 0.4, knockback: 180 };

describe("melee", () => {
  it("séquence windup → active → recovery → idle", () => {
    const m = createMelee();
    expect(startMelee(m, v(1, 0), cfg)).toBe(true);
    expect(m.phase).toBe("windup");
    tickMelee(m, cfg, 0.07); expect(m.phase).toBe("active"); expect(isMeleeActive(m)).toBe(true);
    tickMelee(m, cfg, 0.09); expect(m.phase).toBe("recovery");
    tickMelee(m, cfg, 0.13); expect(m.phase).toBe("idle");
  });
  it("respecte la cadence", () => {
    const m = createMelee(); startMelee(m, v(1, 0), cfg);
    for (let i = 0; i < 20; i++) tickMelee(m, cfg, 0.02); // 0.4s écoulées exactement
    expect(startMelee(m, v(1, 0), cfg)).toBe(true);
  });
  it("targetsInArc : devant oui, derrière non, hors portée non", () => {
    const self = v(0, 0);
    const front = makeEntity({ id: 2, x: 40, y: 0, maxHp: 10, radius: 8, faction: "enemy" });
    const back = makeEntity({ id: 3, x: -40, y: 0, maxHp: 10, radius: 8, faction: "enemy" });
    const far = makeEntity({ id: 4, x: 200, y: 0, maxHp: 10, radius: 8, faction: "enemy" });
    const hits = targetsInArc(self, v(1, 0), [front, back, far], cfg);
    expect(hits.map((e) => e.id)).toEqual([2]);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter**

```ts
import { Entity } from "../entity";
import { Vec2, sub, length, normalize } from "../math/vec2";

export interface MeleeCfg { damage: number; range: number; arcDeg: number; windup: number; active: number; recovery: number; cadence: number; knockback: number; }
export type MeleePhase = "idle" | "windup" | "active" | "recovery";
export interface MeleeState { phase: MeleePhase; phaseTime: number; sinceStart: number; aimDir: Vec2; hitIds: Set<number>; }

export const createMelee = (): MeleeState => ({ phase: "idle", phaseTime: 0, sinceStart: 999, aimDir: { x: 1, y: 0 }, hitIds: new Set() });

export function startMelee(m: MeleeState, aimDir: Vec2, cfg: MeleeCfg): boolean {
  if (m.phase !== "idle" || m.sinceStart < cfg.cadence || length(aimDir) === 0) return false;
  m.phase = "windup"; m.phaseTime = 0; m.sinceStart = 0; m.aimDir = normalize(aimDir); m.hitIds.clear();
  return true;
}

export function tickMelee(m: MeleeState, cfg: MeleeCfg, dt: number): void {
  m.sinceStart += dt;
  if (m.phase === "idle") return;
  m.phaseTime += dt;
  if (m.phase === "windup" && m.phaseTime >= cfg.windup) { m.phase = "active"; m.phaseTime = 0; }
  else if (m.phase === "active" && m.phaseTime >= cfg.active) { m.phase = "recovery"; m.phaseTime = 0; }
  else if (m.phase === "recovery" && m.phaseTime >= cfg.recovery) { m.phase = "idle"; m.phaseTime = 0; }
}
export const isMeleeActive = (m: MeleeState): boolean => m.phase === "active";

export function targetsInArc(selfPos: Vec2, aimDir: Vec2, entities: Entity[], cfg: MeleeCfg): Entity[] {
  const dir = normalize(aimDir);
  const halfRad = (cfg.arcDeg * Math.PI) / 180 / 2;
  return entities.filter((e) => {
    const to = sub(e.transform.pos, selfPos);
    const d = length(to);
    if (d > cfg.range + e.radius || d === 0) return false;
    const n = normalize(to);
    const cosang = n.x * dir.x + n.y * dir.y;
    return cosang >= Math.cos(halfRad);
  });
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/combat/melee.ts game/tests/melee.test.ts && git commit -m "feat(core): melee arc + timings"`

---

## Task 11: Projectile + Weapon (gating tir à distance)

**Files:** Create `game/src/core/combat/projectile.ts`, `game/src/core/combat/weapon.ts` — Tests `game/tests/projectile.test.ts`, `game/tests/weapon.test.ts`

- [ ] **Step 1: Tests (échouent)**

`tests/projectile.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { spawnProjectile, tickProjectile, isExpired } from "../src/core/combat/projectile";
import { v } from "../src/core/math/vec2";

const cfg = { damage: 8, projectileSpeed: 480, lifetime: 1.2, cadence: 0.25 };
describe("projectile", () => {
  it("part vers la direction et avance", () => {
    const p = spawnProjectile(1, v(0, 0), v(1, 0), cfg, "player");
    expect(p.vel.x).toBeCloseTo(480);
    tickProjectile(p, 0.1); expect(p.pos.x).toBeCloseTo(48); expect(p.life).toBeCloseTo(1.1);
  });
  it("expire après lifetime", () => {
    const p = spawnProjectile(1, v(0, 0), v(1, 0), cfg, "player");
    tickProjectile(p, 1.3); expect(isExpired(p)).toBe(true);
  });
});
```

`tests/weapon.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createLoadout, canFireRanged, equipRanged, tickLoadout, markRangedFired } from "../src/core/combat/weapon";

const cfg = { damage: 8, projectileSpeed: 480, lifetime: 1.2, cadence: 0.25 };
describe("weapon gating", () => {
  it("pas d'arme à distance au départ → ne peut pas tirer", () => {
    const l = createLoadout();
    expect(l.hasRangedWeapon).toBe(false);
    expect(canFireRanged(l, cfg)).toBe(false);
  });
  it("après ramassage → peut tirer, puis cadence", () => {
    const l = createLoadout(); equipRanged(l);
    expect(canFireRanged(l, cfg)).toBe(true);
    markRangedFired(l); expect(canFireRanged(l, cfg)).toBe(false);
    tickLoadout(l, 0.25); expect(canFireRanged(l, cfg)).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL (les deux).**

- [ ] **Step 3: Implémenter**

`projectile.ts`:
```ts
import { Faction } from "../entity";
import { Vec2, v, normalize, scale } from "../math/vec2";

export interface RangedCfg { damage: number; projectileSpeed: number; lifetime: number; cadence: number; }
export interface Projectile { id: number; pos: Vec2; vel: Vec2; life: number; damage: number; faction: Faction; radius: number; }

export function spawnProjectile(id: number, origin: Vec2, dir: Vec2, cfg: RangedCfg, faction: Faction): Projectile {
  return { id, pos: v(origin.x, origin.y), vel: scale(normalize(dir), cfg.projectileSpeed), life: cfg.lifetime, damage: cfg.damage, faction, radius: 5 };
}
export function tickProjectile(p: Projectile, dt: number): void {
  p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt; p.life -= dt;
}
export const isExpired = (p: Projectile): boolean => p.life <= 0;
```

`weapon.ts`:
```ts
import { RangedCfg } from "./projectile";

export interface Loadout { hasRangedWeapon: boolean; sinceRanged: number; }
export const createLoadout = (): Loadout => ({ hasRangedWeapon: false, sinceRanged: 999 });
export const equipRanged = (l: Loadout): void => { l.hasRangedWeapon = true; };
export const canFireRanged = (l: Loadout, cfg: RangedCfg): boolean => l.hasRangedWeapon && l.sinceRanged >= cfg.cadence;
export const markRangedFired = (l: Loadout): void => { l.sinceRanged = 0; };
export const tickLoadout = (l: Loadout, dt: number): void => { l.sinceRanged += dt; };
```

- [ ] **Step 4: Run → PASS (les deux).**
- [ ] **Step 5: Commit** — `git add game/src/core/combat/projectile.ts game/src/core/combat/weapon.ts game/tests/projectile.test.ts game/tests/weapon.test.ts && git commit -m "feat(core): projectile + ranged weapon gating"`

---

## Task 12: AI Chaser

**Files:** Create `game/src/core/ai/chaser.ts` — Test `game/tests/chaser.test.ts`

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { chaserMoveDir } from "../src/core/ai/chaser";
import { v } from "../src/core/math/vec2";

describe("chaser", () => {
  it("renvoie une direction normalisée vers la cible", () => {
    const dir = chaserMoveDir(v(0, 0), v(0, 10));
    expect(dir.x).toBe(0); expect(dir.y).toBeCloseTo(1);
  });
  it("vecteur nul si superposé", () => {
    expect(chaserMoveDir(v(5, 5), v(5, 5))).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter**

```ts
import { Vec2, sub, normalize } from "../math/vec2";
export const chaserMoveDir = (self: Vec2, target: Vec2): Vec2 => normalize(sub(target, self));
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/ai/chaser.ts game/tests/chaser.test.ts && git commit -m "feat(core): chaser AI direction"`

---

## Task 13: World (orchestration + InputState)

**Files:** Create `game/src/core/world.ts` — Test `game/tests/world.test.ts`

`tickWorld(w, input, tuning, dt)` exécute, dans l'ordre : régénération énergie ; cooldowns (dash/blink/loadout) ; **dash** (start si `input.dash`) ; **mouvement** (si pas en dash) puis confinement bounds ; **blink** (si `input.blink`) ; **mêlée** (start si `input.melee`, tick, et si active → dégâts aux ennemis dans l'arc, knockback, une fois par swing) ; **tir** (si `input.ranged` ET `canFireRanged` → spawn projectile) ; **projectiles** (tick, collision cercle ennemis, expiration) ; **IA chaser** (move + contact damage au joueur, cadence) ; **pickups** (ramassage arme à distance) ; **i-frames** décrément ; collecte `events` (dégâts) pour le rendu.

- [ ] **Step 1: Tests d'intégration (échouent)**

```ts
import { describe, it, expect } from "vitest";
import { createWorld, tickWorld, InputState } from "../src/core/world";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const noInput = (): InputState => ({ moveDir: v(0, 0), aimPoint: v(0, 0), melee: false, ranged: false, dash: false, blink: false });

describe("world", () => {
  it("le joueur se déplace avec l'input", () => {
    const w = createWorld();
    const before = w.player.transform.pos.x;
    for (let i = 0; i < 30; i++) tickWorld(w, { ...noInput(), moveDir: v(1, 0) }, DEFAULT_TUNING, 1 / 60);
    expect(w.player.transform.pos.x).toBeGreaterThan(before);
  });
  it("mêlée tue progressivement le mannequin devant", () => {
    const w = createWorld();
    const dummy = w.enemies[0];
    dummy.transform.pos = v(w.player.transform.pos.x + 40, w.player.transform.pos.y);
    const hp0 = dummy.health.hp;
    const aim = v(w.player.transform.pos.x + 100, w.player.transform.pos.y);
    for (let s = 0; s < 5; s++) {
      tickWorld(w, { ...noInput(), aimPoint: aim, melee: true }, DEFAULT_TUNING, 1 / 60);
      for (let i = 0; i < 30; i++) tickWorld(w, { ...noInput(), aimPoint: aim }, DEFAULT_TUNING, 1 / 60);
    }
    expect(dummy.health.hp).toBeLessThan(hp0);
  });
  it("tir à distance : rien sans arme, effectif après ramassage du pickup", () => {
    const w = createWorld();
    const aim = v(w.player.transform.pos.x + 100, w.player.transform.pos.y);
    tickWorld(w, { ...noInput(), aimPoint: aim, ranged: true }, DEFAULT_TUNING, 1 / 60);
    expect(w.projectiles.length).toBe(0); // pas d'arme
    w.player.loadout.hasRangedWeapon = true;
    tickWorld(w, { ...noInput(), aimPoint: aim, ranged: true }, DEFAULT_TUNING, 1 / 60);
    expect(w.projectiles.length).toBe(1); // arme équipée → tir
  });
  it("ramasser le pickup équipe l'arme à distance", () => {
    const w = createWorld();
    expect(w.player.loadout.hasRangedWeapon).toBe(false);
    w.player.transform.pos = v(w.pickup.pos.x, w.pickup.pos.y);
    tickWorld(w, noInput(), DEFAULT_TUNING, 1 / 60);
    expect(w.player.loadout.hasRangedWeapon).toBe(true);
    expect(w.pickup.taken).toBe(true);
  });
  it("le dash rend invulnérable au contact du chaser", () => {
    const w = createWorld();
    const chaser = w.enemies[1];
    chaser.transform.pos = v(w.player.transform.pos.x + 12, w.player.transform.pos.y);
    const hp0 = w.player.health.hp;
    tickWorld(w, { ...noInput(), dash: true, moveDir: v(-1, 0) }, DEFAULT_TUNING, 1 / 60);
    expect(w.player.health.hp).toBe(hp0); // i-frames du dash
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter** (orchestration complète)

```ts
import { DEFAULT_TUNING, Tuning } from "./config/tuning";
import { Entity, makeEntity, tickIframes } from "./entity";
import { Level } from "./collision";
import { canOccupy, clampToBounds } from "./collision";
import { applyMovement } from "./movement";
import { createDash, startDash, tickDash, isDashing, DashState } from "./abilities/dash";
import { createBlink, doBlink, tickBlink, BlinkState } from "./abilities/blink";
import { createMelee, startMelee, tickMelee, isMeleeActive, targetsInArc, MeleeState } from "./combat/melee";
import { spawnProjectile, tickProjectile, isExpired, Projectile } from "./combat/projectile";
import { createLoadout, canFireRanged, equipRanged, markRangedFired, tickLoadout, Loadout } from "./combat/weapon";
import { applyDamage, isDead } from "./combat/damage";
import { chaserMoveDir } from "./ai/chaser";
import { Vec2, v, sub, normalize, scale, distance, length } from "./math/vec2";

export interface InputState { moveDir: Vec2; aimPoint: Vec2; melee: boolean; ranged: boolean; dash: boolean; blink: boolean; }

export interface Player extends Entity {
  dash: DashState; blink: BlinkState; melee: MeleeState; loadout: Loadout; energy: number;
}
export interface Pickup { id: number; pos: Vec2; radius: number; kind: "ranged_weapon"; taken: boolean; }
export interface DamageEvent { x: number; y: number; amount: number; targetId: number; }
export type EnemyKind = "dummy" | "chaser";
export interface Enemy extends Entity { kind: EnemyKind; contactTimer: number; }

export interface World {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  pickup: Pickup;
  level: Level;
  events: DamageEvent[];
  nextId: number;
  godMode: boolean;
}

export function createWorld(): World {
  const t = DEFAULT_TUNING;
  const level: Level = { bounds: { x: 0, y: 0, w: 1200, h: 800 }, walls: [{ x: 520, y: 340, w: 160, h: 120 }] };
  const base = makeEntity({ id: 1, x: 300, y: 400, maxHp: t.resources.maxHp, radius: 14, faction: "player" });
  const player: Player = { ...base, dash: createDash(), blink: createBlink(), melee: createMelee(), loadout: createLoadout(), energy: t.resources.maxEnergy };
  const dummyBase = makeEntity({ id: 2, x: 700, y: 250, maxHp: 200, radius: 16, faction: "enemy" });
  const dummy: Enemy = { ...dummyBase, kind: "dummy", contactTimer: 0 };
  const chaserBase = makeEntity({ id: 3, x: 900, y: 550, maxHp: 60, radius: 14, faction: "enemy" });
  const chaser: Enemy = { ...chaserBase, kind: "chaser", contactTimer: 0 };
  const pickup: Pickup = { id: 4, pos: v(450, 600), radius: 18, kind: "ranged_weapon", taken: false };
  return { player, enemies: [dummy, chaser], projectiles: [], pickup, level, events: [], nextId: 100, godMode: false };
}

export function tickWorld(w: World, input: InputState, t: Tuning, dt: number): void {
  const p = w.player;
  // énergie
  p.energy = Math.min(t.resources.maxEnergy, p.energy + t.resources.energyRegen * dt);
  // cooldowns
  tickDash(p.dash, p, t.dash, dt);
  tickBlink(p.blink, dt);
  tickLoadout(p.loadout, dt);
  // dash
  if (input.dash) startDash(p.dash, input.moveDir, p, t.dash);
  // mouvement (sauf en dash où tickDash impose la vitesse)
  if (!isDashing(p.dash)) applyMovement(p.transform, input.moveDir, t.move, dt);
  p.transform.pos = clampToBounds(p.transform.pos, p.radius, w.level.bounds);
  // blink
  const energyRef = { value: p.energy };
  if (input.blink) { doBlink(p.blink, p, input.aimPoint, energyRef, t.blink, (pt) => canOccupy(pt, p.radius, w.level)); p.energy = energyRef.value; }
  // mêlée
  const aimDir = normalize(sub(input.aimPoint, p.transform.pos));
  if (input.melee) startMelee(p.melee, aimDir, t.melee);
  tickMelee(p.melee, t.melee, dt);
  if (isMeleeActive(p.melee)) {
    const targets = targetsInArc(p.transform.pos, p.melee.aimDir, w.enemies, t.melee);
    for (const e of targets) {
      if (p.melee.hitIds.has(e.id)) continue;
      const kb = scale(normalize(sub(e.transform.pos, p.transform.pos)), t.melee.knockback);
      if (applyDamage(e, t.melee.damage, kb)) { p.melee.hitIds.add(e.id); w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: t.melee.damage, targetId: e.id }); }
    }
  }
  // tir à distance (gaté par arme)
  if (input.ranged && canFireRanged(p.loadout, t.ranged) && length(aimDir) > 0) {
    w.projectiles.push(spawnProjectile(w.nextId++, p.transform.pos, aimDir, t.ranged, "player"));
    markRangedFired(p.loadout);
  }
  // projectiles
  for (const proj of w.projectiles) {
    tickProjectile(proj, dt);
    for (const e of w.enemies) {
      if (distance(proj.pos, e.transform.pos) <= proj.radius + e.radius) {
        if (applyDamage(e, proj.damage, scale(normalize(proj.vel), 80))) w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: proj.damage, targetId: e.id });
        proj.life = 0; break;
      }
    }
  }
  w.projectiles = w.projectiles.filter((proj) => !isExpired(proj));
  // IA + contact
  for (const e of w.enemies) {
    e.contactTimer = Math.max(0, e.contactTimer - dt);
    if (e.kind === "chaser") {
      applyMovement(e.transform, chaserMoveDir(e.transform.pos, p.transform.pos), { maxSpeed: t.chaser.speed, accel: 1200, friction: 1200 }, dt);
      e.transform.pos = clampToBounds(e.transform.pos, e.radius, w.level.bounds);
      if (e.contactTimer === 0 && distance(e.transform.pos, p.transform.pos) <= e.radius + p.radius) {
        if (!w.godMode) {
          const kb = scale(normalize(sub(p.transform.pos, e.transform.pos)), 120);
          if (applyDamage(p, t.chaser.contactDamage, kb)) w.events.push({ x: p.transform.pos.x, y: p.transform.pos.y, amount: t.chaser.contactDamage, targetId: p.id });
        }
        e.contactTimer = t.chaser.contactCadence;
      }
    }
  }
  w.enemies = w.enemies.filter((e) => !(e.kind === "chaser" && isDead(e)));
  // pickup
  if (!w.pickup.taken && distance(p.transform.pos, w.pickup.pos) <= p.radius + w.pickup.radius) {
    equipRanged(p.loadout); w.pickup.taken = true;
  }
  // i-frames
  tickIframes(p, dt);
  for (const e of w.enemies) tickIframes(e, dt);
}
```

> Note d'implémentation : si `tsc` signale `godMode`/`energy` non utilisés ailleurs, ils le sont (godMode dans le contact, energy via energyRef). Conserver `isDead` importé (filtre chaser).

- [ ] **Step 4: Run → PASS** (`cd game && npx vitest run tests/world.test.ts`).
- [ ] **Step 5: Run TOUTE la suite** — `cd game && npm test` → tout vert.
- [ ] **Step 6: Commit** — `git add game/src/core/world.ts game/tests/world.test.ts && git commit -m "feat(core): world orchestration + tickWorld"`

---

## Task 14: Assets (manifest + placeholders)

**Files:** Create `game/src/assets/manifest.ts`, `game/src/assets/placeholders.ts`, `game/src/assets/README.md`. (Validation : visuelle/au build — pas de test unitaire.)

- [ ] **Step 1: `manifest.ts`** — registre logique avec specs de placeholder (forme/couleur/taille). `file?` optionnel pour brancher un PNG plus tard.

```ts
export type PlaceholderShape = "circle" | "rect" | "triangle";
export interface AssetSpec { key: string; file?: string; shape: PlaceholderShape; color: number; size: number; }

export const ASSETS: AssetSpec[] = [
  { key: "player",       shape: "circle",   color: 0x4ad6ff, size: 28 },
  { key: "enemy_dummy",  shape: "rect",     color: 0x9aa0b5, size: 32 },
  { key: "enemy_chaser", shape: "triangle", color: 0xff5d5d, size: 28 },
  { key: "projectile",   shape: "circle",   color: 0xffe066, size: 10 },
  { key: "ranged_pickup",shape: "rect",     color: 0x7CFF6B, size: 24 },
];
```

- [ ] **Step 2: `placeholders.ts`** — génère une texture par asset si aucun `file` (Phaser Graphics → generateTexture). Robuste : `file` présent → `this.load.image` ; sinon placeholder.

```ts
import Phaser from "phaser";
import { ASSETS, AssetSpec } from "./manifest";

function drawPlaceholder(scene: Phaser.Scene, a: AssetSpec): void {
  const g = scene.add.graphics();
  g.fillStyle(a.color, 1); g.lineStyle(2, 0x000000, 0.4);
  const s = a.size;
  if (a.shape === "circle") { g.fillCircle(s / 2, s / 2, s / 2); g.strokeCircle(s / 2, s / 2, s / 2); }
  else if (a.shape === "rect") { g.fillRect(0, 0, s, s); g.strokeRect(0, 0, s, s); }
  else { g.fillTriangle(s / 2, 0, s, s, 0, s); g.strokeTriangle(s / 2, 0, s, s, 0, s); }
  g.generateTexture(a.key, s, s); g.destroy();
}

/** À appeler dans preload() pour les PNG, et create() pour les placeholders. */
export function queueRealAssets(scene: Phaser.Scene): void {
  for (const a of ASSETS) if (a.file) scene.load.image(a.key, a.file);
}
export function buildPlaceholders(scene: Phaser.Scene): void {
  for (const a of ASSETS) {
    if (a.file && scene.textures.exists(a.key)) continue;
    if (scene.textures.exists(a.key)) continue;
    drawPlaceholder(scene, a);
  }
}
```

- [ ] **Step 3: `README.md`** — documenter format attendu.

```md
# Assets

Dépose tes PNG ici et renseigne `file` dans `manifest.ts` (ex. `file: "/src/assets/player.png"`).
Tant que `file` est absent, un placeholder géométrique est généré automatiquement — le code de jeu
ne change pas quand tu fournis le vrai sprite.

- Taille recommandée : carré, multiple de 16 px (16/24/32). `size` sert au placeholder ET d'échelle d'affichage.
- Pour des animations (frames), on ajoutera un `spritesheet` (frameWidth/Height) à `AssetSpec` lors de la
  tranche d'animation. Pour l'instant : sprites statiques.
- Clés attendues : player, enemy_dummy, enemy_chaser, projectile, ranged_pickup.
```

- [ ] **Step 4: Compile** — `cd game && npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `git add game/src/assets && git commit -m "feat(game): asset manifest + placeholders"`

---

## Task 15: Input map (clavier + souris → InputState)

**Files:** Create `game/src/game/input/inputMap.ts`. (Validé à l'exécution.)

- [ ] **Step 1: Implémenter**

```ts
import Phaser from "phaser";
import { InputState } from "../../core/world";
import { v } from "../../core/math/vec2";

export class InputMap {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private blinkDown = false; private blinkPressed = false;
  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys("W,A,S,D,Z,Q,UP,LEFT,DOWN,RIGHT,SPACE,E") as Record<string, Phaser.Input.Keyboard.Key>;
    scene.input.mouse?.disableContextMenu();
  }
  /** Appelé une fois par frame AVANT la simulation. cam pour convertir l'écran en monde. */
  sample(cam: Phaser.Cameras.Scene2D.Camera): InputState {
    const k = this.keys;
    const left = k.A.isDown || k.Q.isDown || k.LEFT.isDown;
    const right = k.D.isDown || k.RIGHT.isDown;
    const up = k.W.isDown || k.Z.isDown || k.UP.isDown;
    const down = k.S.isDown || k.DOWN.isDown;
    const moveDir = v((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
    const ptr = this.scene.input.activePointer;
    const world = cam.getWorldPoint(ptr.x, ptr.y);
    // E en edge-trigger (un blink par appui)
    const eDown = k.E.isDown; this.blinkPressed = eDown && !this.blinkDown; this.blinkDown = eDown;
    return {
      moveDir, aimPoint: v(world.x, world.y),
      melee: ptr.leftButtonDown(), ranged: ptr.rightButtonDown(),
      dash: k.SPACE.isDown, blink: this.blinkPressed,
    };
  }
}
```

- [ ] **Step 2: Compile** — `cd game && npx tsc --noEmit`.
- [ ] **Step 3: Commit** — `git add game/src/game/input && git commit -m "feat(game): input map keyboard+mouse"`

---

## Task 16: Render (sprites + floating text)

**Files:** Create `game/src/game/render/sprites.ts`, `game/src/game/render/floatingText.ts`. (Validé à l'exécution.)

- [ ] **Step 1: `floatingText.ts`**

```ts
import Phaser from "phaser";
export function spawnDamageText(scene: Phaser.Scene, x: number, y: number, amount: number): void {
  const t = scene.add.text(x, y, `${Math.round(amount)}`, { fontFamily: "monospace", fontSize: "16px", color: "#ffd24a" }).setOrigin(0.5);
  scene.tweens.add({ targets: t, y: y - 28, alpha: 0, duration: 600, onComplete: () => t.destroy() });
}
```

- [ ] **Step 2: `sprites.ts`** — pool de sprites indexé par id d'entité ; crée/synchronise/élague.

```ts
import Phaser from "phaser";
import { World } from "../../core/world";

export class SpriteLayer {
  private map = new Map<number, Phaser.GameObjects.Image>();
  private pickupImg?: Phaser.GameObjects.Image;
  constructor(private scene: Phaser.Scene) {}

  private ensure(id: number, key: string): Phaser.GameObjects.Image {
    let s = this.map.get(id);
    if (!s) { s = this.scene.add.image(0, 0, key).setDepth(5); this.map.set(id, s); }
    return s;
  }
  sync(w: World): void {
    const p = w.player; const ps = this.ensure(p.id, "player");
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
    for (const [id, s] of this.map) if (!alive.has(id)) { s.destroy(); this.map.delete(id); }
    if (!w.pickup.taken) {
      if (!this.pickupImg) this.pickupImg = this.scene.add.image(w.pickup.pos.x, w.pickup.pos.y, "ranged_pickup").setDepth(4);
    } else if (this.pickupImg) { this.pickupImg.destroy(); this.pickupImg = undefined; }
  }
}
```

- [ ] **Step 3: Compile** — `cd game && npx tsc --noEmit`.
- [ ] **Step 4: Commit** — `git add game/src/game/render && git commit -m "feat(game): sprite layer + floating damage text"`

---

## Task 17: Debug panel (overlay DOM)

**Files:** Create `game/src/game/debug/debugPanel.ts`. (Validé à l'exécution.)

Overlay DOM (toggle F1) : sliders pour les paramètres clés + cases godmode/hitbox/FPS. Édite l'objet `Tuning` en place et des flags. Pas de dépendance externe.

- [ ] **Step 1: Implémenter**

```ts
import { Tuning } from "../../core/config/tuning";

export interface DebugFlags { showHitboxes: boolean; godMode: boolean; showFps: boolean; }

export function createDebugPanel(tuning: Tuning, flags: DebugFlags): void {
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;top:8px;right:8px;width:240px;max-height:90vh;overflow:auto;background:#0d0d18ee;color:#cfd2e6;font:12px monospace;padding:10px;border:1px solid #2a2a40;border-radius:8px;z-index:9999;display:none";
  box.innerHTML = `<b>DEBUG (F1)</b><br/>`;
  const addSlider = (label: string, get: () => number, set: (n: number) => void, min: number, max: number, step: number) => {
    const row = document.createElement("div"); row.style.margin = "6px 0";
    const val = document.createElement("span");
    const r = document.createElement("input"); r.type = "range"; r.min = `${min}`; r.max = `${max}`; r.step = `${step}`; r.value = `${get()}`; r.style.width = "100%";
    const update = () => { val.textContent = ` ${label}: ${get()}`; };
    r.oninput = () => { set(parseFloat(r.value)); update(); }; update();
    row.appendChild(val); row.appendChild(r); box.appendChild(row);
  };
  const addToggle = (label: string, get: () => boolean, set: (b: boolean) => void) => {
    const row = document.createElement("label"); row.style.display = "block"; row.style.margin = "6px 0";
    const c = document.createElement("input"); c.type = "checkbox"; c.checked = get();
    c.onchange = () => set(c.checked); row.appendChild(c); row.appendChild(document.createTextNode(" " + label)); box.appendChild(row);
  };
  addSlider("vitesse", () => tuning.move.maxSpeed, (n) => (tuning.move.maxSpeed = n), 60, 500, 10);
  addSlider("accel", () => tuning.move.accel, (n) => (tuning.move.accel = n), 200, 6000, 100);
  addSlider("friction", () => tuning.move.friction, (n) => (tuning.move.friction = n), 200, 6000, 100);
  addSlider("dash dist", () => tuning.dash.distance, (n) => (tuning.dash.distance = n), 60, 400, 10);
  addSlider("dash i-frames", () => tuning.dash.iframes, (n) => (tuning.dash.iframes = n), 0, 1, 0.01);
  addSlider("dash cd", () => tuning.dash.cooldown, (n) => (tuning.dash.cooldown = n), 0, 3, 0.05);
  addSlider("blink portée", () => tuning.blink.range, (n) => (tuning.blink.range = n), 60, 400, 10);
  addSlider("mêlée dmg", () => tuning.melee.damage, (n) => (tuning.melee.damage = n), 1, 100, 1);
  addSlider("mêlée portée", () => tuning.melee.range, (n) => (tuning.melee.range = n), 20, 160, 5);
  addSlider("tir dmg", () => tuning.ranged.damage, (n) => (tuning.ranged.damage = n), 1, 100, 1);
  addSlider("tir vitesse", () => tuning.ranged.projectileSpeed, (n) => (tuning.ranged.projectileSpeed = n), 100, 1000, 20);
  addToggle("godmode", () => flags.godMode, (b) => (flags.godMode = b));
  addToggle("hitboxes", () => flags.showHitboxes, (b) => (flags.showHitboxes = b));
  addToggle("FPS", () => flags.showFps, (b) => (flags.showFps = b));
  document.body.appendChild(box);
  window.addEventListener("keydown", (e) => { if (e.key === "F1") { e.preventDefault(); box.style.display = box.style.display === "none" ? "block" : "none"; } });
}
```

- [ ] **Step 2: Compile** — `cd game && npx tsc --noEmit`.
- [ ] **Step 3: Commit** — `git add game/src/game/debug && git commit -m "feat(game): debug overlay panel"`

---

## Task 18: TrainingScene (assemblage) + branchement main.ts

**Files:** Create `game/src/game/scenes/TrainingScene.ts` ; Modify `game/src/main.ts`. (Validé à l'exécution dans le navigateur.)

La scène : crée placeholders, `createWorld`, `InputMap`, `SpriteLayer`, debug panel ; dessine murs + bounds ; caméra suit le joueur ; `update` → sample input, exécute les ticks fixes via `FixedStep`, applique `flags.godMode`→`world.godMode`, draine `world.events` en `spawnDamageText`, dessine hitboxes si activé, sync sprites, HUD HP/énergie + FPS.

- [ ] **Step 1: `TrainingScene.ts`**

```ts
import Phaser from "phaser";
import { buildPlaceholders, queueRealAssets } from "../../assets/placeholders";
import { createWorld, tickWorld, World } from "../../core/world";
import { DEFAULT_TUNING } from "../../core/config/tuning";
import { FixedStep } from "../../core/time/fixedStep";
import { InputMap } from "../input/inputMap";
import { SpriteLayer } from "../render/sprites";
import { spawnDamageText } from "../render/floatingText";
import { createDebugPanel, DebugFlags } from "../debug/debugPanel";

export class TrainingScene extends Phaser.Scene {
  private world!: World;
  private input2!: InputMap;
  private sprites!: SpriteLayer;
  private fixed = new FixedStep(1 / 60);
  private tuning = DEFAULT_TUNING;
  private flags: DebugFlags = { showHitboxes: false, godMode: false, showFps: false };
  private gfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;

  constructor() { super("training"); }
  preload() { queueRealAssets(this); }
  create() {
    buildPlaceholders(this);
    this.world = createWorld();
    this.input2 = new InputMap(this);
    this.sprites = new SpriteLayer(this);
    this.gfx = this.add.graphics().setDepth(1);
    this.hud = this.add.text(12, 12, "", { fontFamily: "monospace", fontSize: "14px", color: "#cfd2e6" }).setScrollFactor(0).setDepth(20);
    const b = this.world.level.bounds;
    this.cameras.main.setBounds(b.x, b.y, b.w, b.h);
    this.cameras.main.startFollow(this.sprites["scene"] ? (undefined as any) : (undefined as any)); // placeholder, suit via update
    createDebugPanel(this.tuning, this.flags);
  }
  update(_time: number, deltaMs: number) {
    const dt = deltaMs / 1000;
    const input = this.input2.sample(this.cameras.main);
    this.world.godMode = this.flags.godMode;
    const ticks = this.fixed.advance(dt);
    for (let i = 0; i < ticks; i++) tickWorld(this.world, input, this.tuning, this.fixed.step);
    // events → textes flottants
    for (const ev of this.world.events) spawnDamageText(this, ev.x, ev.y, ev.amount);
    this.world.events.length = 0;
    // décor (murs/bounds) + hitboxes optionnelles
    this.gfx.clear();
    const lvl = this.world.level;
    this.gfx.lineStyle(2, 0x33405e, 1).strokeRect(lvl.bounds.x, lvl.bounds.y, lvl.bounds.w, lvl.bounds.h);
    this.gfx.fillStyle(0x2a3350, 1); for (const wll of lvl.walls) this.gfx.fillRect(wll.x, wll.y, wll.w, wll.h);
    if (this.flags.showHitboxes) {
      this.gfx.lineStyle(1, 0x00ff88, 0.9);
      this.gfx.strokeCircle(this.world.player.transform.pos.x, this.world.player.transform.pos.y, this.world.player.radius);
      for (const e of this.world.enemies) this.gfx.strokeCircle(e.transform.pos.x, e.transform.pos.y, e.radius);
    }
    this.sprites.sync(this.world);
    // caméra suit le joueur (centrage manuel)
    this.cameras.main.centerOn(this.world.player.transform.pos.x, this.world.player.transform.pos.y);
    // HUD
    const p = this.world.player;
    const fps = this.flags.showFps ? `  FPS:${Math.round(this.game.loop.actualFps)}` : "";
    const wpn = p.loadout.hasRangedWeapon ? "arme distance: OUI" : "arme distance: NON (ramasse le cube vert)";
    this.hud.setText(`PV ${Math.round(p.health.hp)}/${p.health.maxHp}   Énergie ${Math.round(p.energy)}   ${wpn}${fps}`);
  }
}
```

> Note : `centerOn` chaque frame suit le joueur de façon simple et fiable (pas besoin de `startFollow` sur un sprite). Supprimer la ligne `startFollow(...)` placeholder du `create()` — la garder casserait le suivi ; le suivi se fait via `centerOn` dans `update`.

- [ ] **Step 2: Corriger `create()`** — retirer la ligne `this.cameras.main.startFollow(...)` placeholder (laisser seulement `setBounds` + `createDebugPanel`).

- [ ] **Step 3: Modifier `main.ts`** pour charger la scène

```ts
import Phaser from "phaser";
import { TrainingScene } from "./game/scenes/TrainingScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#10101a",
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: 960, height: 540 },
  scene: [TrainingScene],
};
new Phaser.Game(config);
```

- [ ] **Step 4: Build** — `cd game && npm run build` → OK (tsc + vite).
- [ ] **Step 5: Lancer le dev** — `cd game && npm run dev` ; ouvrir l'URL. Vérifier : déplacement ZQSD inertiel, dash (Espace) + flash i-frames, blink (E) bloqué par le mur, clic gauche tape le mannequin (nombres jaunes), clic droit **ne fait rien** jusqu'à ramasser le cube vert puis tire, le triangle rouge poursuit et inflige des dégâts (sauf en dash/godmode), F1 ouvre le debug.
- [ ] **Step 6: Commit** — `git add game/src/game/scenes game/src/main.ts && git commit -m "feat(game): training scene + wiring"`

---

## Task 19: Vérification finale (Definition of Done)

- [ ] **Step 1: Suite complète verte** — `cd game && npm test` → tous les tests `core/` passent.
- [ ] **Step 2: Build propre** — `cd game && npm run build` → aucune erreur TS, dist généré.
- [ ] **Step 3: Checklist DoD** (cf. spec §14) — déplacement/dash/i-frames/blink/mêlée/gating tir/pickup/chaser/caméra/debug/placeholders OK.
- [ ] **Step 4: README jeu** — créer `game/README.md` (installation `npm install`, `npm run dev`, `npm test`, contrôles, où déposer l'art).

```md
# Top-down Roguelite — Tranche 0 (jouabilité)
## Lancer
`cd game && npm install && npm run dev` puis ouvrir l'URL.
## Tests
`npm test`
## Contrôles
ZQSD/WASD déplacement · souris viser · clic gauche mêlée · clic droit tir (nécessite l'arme à distance) · Espace dash · E blink · F1 debug.
## Art
Voir `src/assets/README.md` : dépose tes PNG, renseigne `file` dans `manifest.ts`.
```

- [ ] **Step 5: Commit final** — `git add game/README.md && git commit -m "docs(game): README tranche 0 jouabilité"`

---

## Auto-revue (couverture spec)

- §2 périmètre inclus → Tasks 5–18 ✔ ; exclus respectés (pas d'XP/biomes/loot/multi) ✔
- §3 décisions techniques (Phaser/TS/Vite/Vitest, core pur, timestep fixe) → Tasks 0,3,13 ✔
- §5 modules (vec2, tuning, fixedStep, entity, movement, dash, blink, melee, projectile, weapon, damage, chaser, world) → Tasks 1–13 ✔
- §6 boucle/data flow → Task 18 (sample → ticks fixes → sync) ✔
- §7 gating tir à distance → Tasks 11,13 (tests dédiés) ✔
- §8 contrôles → Task 15 ✔
- §10 paramètres feel → Task 2 + debug Task 17 ✔
- §11 pipeline assets → Task 14 ✔
- §12 mode debug → Task 17 ✔
- §13 stratégie de test → Tasks 1–13 (tests par module) ✔
- §14 DoD → Task 19 ✔

Types cohérents : `Vec2{x,y}`, `Tuning` (move/dash/blink/melee/ranged/resources/chaser), `Entity/Transform/Health`, `InputState`, `World` — réutilisés à l'identique dans toutes les tâches.
```
