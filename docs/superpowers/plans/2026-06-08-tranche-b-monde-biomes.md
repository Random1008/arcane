# Tranche B — Monde & biomes — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carte du monde (20 biomes F→S en anneaux), zones de biome générées procéduralement, navigation carte↔biome, scaling de difficulté par rang, joueur persistant.

**Architecture:** Nouveaux modules core `biomes.ts` / `worldMap.ts` / `generate.ts` (logique pure testée). `world.ts` gagne `createPlayer`, des champs `exits/dungeonEntrances/biome/exitReached` et un `Enemy.contactDamage`. Côté Phaser : `session.ts` (joueur persistant), `WorldMapScene` + `BiomeScene` remplacent `TrainingScene`.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest.

> Référence : spec `docs/superpowers/specs/2026-06-08-tranche-b-monde-biomes-design.md`.

---

## Structure des fichiers

```
game/src/core/
├─ biomes.ts     (NEW) BiomeDef, BIOMES[20], getBiome, TIER_SCALING
├─ worldMap.ts   (NEW) MapNode, buildWorldMap (anneaux)
├─ generate.ts   (NEW) generateBiomeWorld(player, biome, rng)
└─ world.ts      (MOD) createPlayer, Exit/DungeonEntrance, World fields, Enemy.contactDamage, exit detection
game/src/game/
├─ session.ts            (NEW) getPlayer/getFlags/resetSession (singletons persistants)
├─ scenes/WorldMapScene.ts (NEW)
├─ scenes/BiomeScene.ts    (NEW)
├─ scenes/TrainingScene.ts (DELETE)
├─ debug/debugPanel.ts     (MOD) idempotent (un seul panneau)
└─ main.ts                 (MOD) scènes [WorldMapScene, BiomeScene]
game/tests/
├─ biomes.test.ts (NEW), worldMap.test.ts (NEW), generate.test.ts (NEW)
└─ world.test.ts  (UPDATE: createPlayer + exitReached)
```

---

## Task 1: biomes.ts

**Files:** Create `game/src/core/biomes.ts` — Test `game/tests/biomes.test.ts`

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { BIOMES, getBiome, TIER_SCALING } from "../src/core/biomes";
import { TIERS } from "../src/core/combat/weapons";

describe("biomes", () => {
  it("20 biomes, tiers valides, répartition 4/3/3/3/3/2/2", () => {
    expect(BIOMES.length).toBe(20);
    for (const b of BIOMES) expect(TIERS).toContain(b.tier);
    const counts = TIERS.map((t) => BIOMES.filter((b) => b.tier === t).length);
    expect(counts).toEqual([4, 3, 3, 3, 3, 2, 2]);
  });
  it("getBiome renvoie le bon biome", () => {
    expect(getBiome("plains").tier).toBe("F");
    expect(getBiome("void_rift").tier).toBe("S");
  });
  it("le nombre d'ennemis croît de F à S", () => {
    expect(TIER_SCALING.F.count).toBeLessThan(TIER_SCALING.S.count);
    expect(TIER_SCALING.F.hpMult).toBeLessThan(TIER_SCALING.S.hpMult);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter** `game/src/core/biomes.ts`

```ts
import { Tier, TIERS } from "./combat/weapons";

export interface BiomePalette {
  ground: number;
  wall: number;
  accent: number;
}

export interface BiomeDef {
  id: string;
  name: string;
  tier: Tier;
  palette: BiomePalette;
  size: { w: number; h: number };
  dungeons: number;
}

export interface TierScaling {
  hpMult: number;
  dmgMult: number;
  count: number;
}

export const TIER_SCALING: Record<Tier, TierScaling> = {
  F: { hpMult: 1.0, dmgMult: 1.0, count: 3 },
  E: { hpMult: 1.4, dmgMult: 1.15, count: 4 },
  D: { hpMult: 1.9, dmgMult: 1.3, count: 5 },
  C: { hpMult: 2.6, dmgMult: 1.5, count: 6 },
  B: { hpMult: 3.5, dmgMult: 1.8, count: 7 },
  A: { hpMult: 4.6, dmgMult: 2.2, count: 8 },
  S: { hpMult: 6.0, dmgMult: 3.0, count: 9 },
};

// [id, nom, tier, ground, wall, accent, dungeons]
type Raw = [string, string, Tier, number, number, number, number];
const RAW: Raw[] = [
  ["plains", "Plaines", "F", 0x6aa84f, 0x4a7a34, 0xcfe8b0, 1],
  ["forest", "Forêt", "F", 0x3f6b3a, 0x294a26, 0x8fd17a, 1],
  ["cave", "Caverne", "F", 0x4a4a55, 0x2a2a33, 0x9aa0b5, 2],
  ["river", "Rivière", "F", 0x4f8fae, 0x356b86, 0xbfeaff, 1],
  ["swamp", "Marais", "E", 0x5a6b3a, 0x3a4a24, 0x9ab06a, 1],
  ["windy_hills", "Collines venteuses", "E", 0x8aa06a, 0x6a7a4a, 0xdfe8c0, 1],
  ["dark_woods", "Bois sombres", "E", 0x2e3b2e, 0x1a241a, 0x6a8a5a, 2],
  ["desert", "Désert", "D", 0xd9c179, 0xb39a55, 0xfff0c0, 2],
  ["tundra", "Toundra", "D", 0xc8d6e0, 0x9ab0c0, 0xffffff, 1],
  ["toxic_marsh", "Marécage toxique", "D", 0x6a8a3a, 0x47631f, 0xb6ff5a, 2],
  ["mountains", "Montagnes", "C", 0x8a8a95, 0x5a5a66, 0xd0d0db, 2],
  ["jungle", "Jungle", "C", 0x2f7a4a, 0x1d5230, 0x7fffb0, 2],
  ["ruins", "Ruines", "C", 0x9a8f7a, 0x6a6052, 0xd8cbb0, 3],
  ["volcano", "Volcan", "B", 0x6b2e2e, 0x3a1414, 0xff7b3a, 2],
  ["ice_floe", "Banquise", "B", 0xa9d6e8, 0x7ab0c8, 0xffffff, 2],
  ["catacombs", "Catacombes", "B", 0x4a4452, 0x2a2630, 0xb59ad0, 3],
  ["abyss", "Abysses", "A", 0x2a2440, 0x161228, 0x7a6aff, 3],
  ["sky_city", "Cité céleste", "A", 0xcdd8ff, 0x9fb0e0, 0xffffff, 2],
  ["void_rift", "Faille du Néant", "S", 0x241a33, 0x120a1a, 0xc05aff, 3],
  ["fractured", "Dimension fracturée", "S", 0x33243a, 0x1a0f22, 0xff5ad0, 3],
];

function sizeForTier(tier: Tier): { w: number; h: number } {
  const ti = TIERS.indexOf(tier);
  return { w: 1200 + ti * 120, h: 900 + ti * 80 };
}

export const BIOMES: BiomeDef[] = RAW.map(([id, name, tier, ground, wall, accent, dungeons]) => ({
  id,
  name,
  tier,
  palette: { ground, wall, accent },
  size: sizeForTier(tier),
  dungeons,
}));

const BY_ID: Record<string, BiomeDef> = Object.fromEntries(BIOMES.map((b) => [b.id, b]));

export function getBiome(id: string): BiomeDef {
  const b = BY_ID[id];
  if (!b) throw new Error(`Biome inconnu: ${id}`);
  return b;
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/biomes.ts game/tests/biomes.test.ts && git commit -m "feat(core): 20 biome defs + tier scaling"`

---

## Task 2: worldMap.ts

**Files:** Create `game/src/core/worldMap.ts` — Test `game/tests/worldMap.test.ts`

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { buildWorldMap } from "../src/core/worldMap";

describe("worldMap", () => {
  it("place 20 nœuds en anneaux, F au centre, S à l'extérieur", () => {
    const nodes = buildWorldMap();
    expect(nodes.length).toBe(20);
    const f = nodes.filter((n) => n.tier === "F");
    const s = nodes.filter((n) => n.tier === "S");
    expect(f.length).toBe(4);
    expect(f[0].ringRadius).toBeLessThan(s[0].ringRadius);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter** `game/src/core/worldMap.ts`

```ts
import { BIOMES } from "./biomes";
import { Tier, TIERS } from "./combat/weapons";

export interface MapNode {
  biomeId: string;
  tier: Tier;
  x: number;
  y: number;
  ringRadius: number;
}

export function buildWorldMap(): MapNode[] {
  const nodes: MapNode[] = [];
  for (const tier of TIERS) {
    const ids = BIOMES.filter((b) => b.tier === tier).map((b) => b.id);
    const ti = TIERS.indexOf(tier);
    const radius = 60 + ti * 95;
    const n = Math.max(1, ids.length);
    ids.forEach((id, i) => {
      const angle = (i / n) * Math.PI * 2 + ti * 0.6;
      nodes.push({ biomeId: id, tier, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, ringRadius: radius });
    });
  }
  return nodes;
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/worldMap.ts game/tests/worldMap.test.ts && git commit -m "feat(core): world map ring placement"`

---

## Task 3: world.ts (createPlayer, Exit/Dungeon, contactDamage, exit detection)

**Files:** Modify `game/src/core/world.ts` ; Update `game/tests/world.test.ts`

- [ ] **Step 1: Modifs world.ts** — appliquer ces 6 changements :

(a) Import du type biome en tête :
```ts
import { BiomeDef } from "./biomes";
```
(b) Ajouter les types Exit/DungeonEntrance + champs World, après `DamageEvent` :
```ts
export interface Exit {
  id: number;
  pos: Vec2;
  radius: number;
}
export interface DungeonEntrance {
  id: number;
  pos: Vec2;
  radius: number;
}
```
(c) `Enemy` gagne `contactDamage` :
```ts
export interface Enemy extends Entity {
  kind: EnemyKind;
  contactTimer: number;
  contactDamage: number;
}
```
(d) `World` gagne 4 champs :
```ts
export interface World {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: WeaponPickup[];
  exits: Exit[];
  dungeonEntrances: DungeonEntrance[];
  level: Level;
  biome: BiomeDef | null;
  events: DamageEvent[];
  nextId: number;
  godMode: boolean;
  rng: () => number;
  exitReached: boolean;
}
```
(e) Extraire `createPlayer()` et adapter `createWorld()` :
```ts
export function createPlayer(): Player {
  const t = DEFAULT_TUNING;
  const base = makeEntity({ id: 1, x: 0, y: 0, maxHp: t.resources.maxHp, radius: 14, faction: "player" });
  return {
    ...base,
    dash: createDash(),
    blink: createBlink(),
    melee: createMelee(),
    hotbar: createHotbar(["fists"], "F"),
    energy: t.resources.maxEnergy,
    rangedTimer: 999,
    attackHeld: false,
    tierHeld: false,
  };
}

export function createWorld(): World {
  const t = DEFAULT_TUNING;
  const level: Level = { bounds: { x: 0, y: 0, w: 1200, h: 800 }, walls: [{ x: 520, y: 340, w: 160, h: 120 }] };
  const player = createPlayer();
  player.transform.pos = { x: 300, y: 400 };
  const dummyBase = makeEntity({ id: 2, x: 700, y: 250, maxHp: 200, radius: 16, faction: "enemy" });
  const dummy: Enemy = { ...dummyBase, kind: "dummy", contactTimer: 0, contactDamage: t.chaser.contactDamage };
  const chaserBase = makeEntity({ id: 3, x: 900, y: 550, maxHp: 60, radius: 14, faction: "enemy" });
  const chaser: Enemy = { ...chaserBase, kind: "chaser", contactTimer: 0, contactDamage: t.chaser.contactDamage };
  const drops: Array<[string, number, number]> = [
    ["sword", 500, 200], ["dagger", 250, 650], ["axe", 850, 200],
    ["hammer", 950, 400], ["bow", 450, 600], ["staff", 800, 660],
  ];
  const pickups: WeaponPickup[] = drops.map(([defId, x, y], i) => ({ id: 10 + i, pos: v(x, y), radius: 18, defId, tier: "F", taken: false }));
  return {
    player, enemies: [dummy, chaser], projectiles: [], pickups,
    exits: [], dungeonEntrances: [], level, biome: null,
    events: [], nextId: 100, godMode: false, rng: Math.random, exitReached: false,
  };
}
```
(f) Dans `tickWorld`, contact ennemi : remplacer `t.chaser.contactDamage` par `e.contactDamage` :
```ts
          if (applyDamage(p, e.contactDamage, kb)) {
```
(g) Dans `tickWorld`, AVANT le bloc `// i-frames + hitstun`, ajouter la détection de sortie :
```ts
  // sortie de zone (retour carte)
  for (const ex of w.exits) {
    if (distance(p.transform.pos, ex.pos) <= p.radius + ex.radius) w.exitReached = true;
  }
```

- [ ] **Step 2: Mettre à jour `game/tests/world.test.ts`** — ajouter 2 tests (créer `createPlayer` import) ; le `noInput()` et les autres tests restent inchangés :

```ts
// ajouter à la liste d'imports existante :
import { createPlayer } from "../src/core/world";
```
puis ajouter dans le `describe("world", ...)` :
```ts
  it("createPlayer démarre avec les poings", () => {
    const p = createPlayer();
    expect(p.hotbar.slots[0]?.defId).toBe("fists");
    expect(p.health.hp).toBe(p.health.maxHp);
  });

  it("exitReached passe à true quand le joueur chevauche une sortie", () => {
    const w = createWorld();
    w.exits.push({ id: 1, pos: v(w.player.transform.pos.x, w.player.transform.pos.y), radius: 20 });
    expect(w.exitReached).toBe(false);
    tickWorld(w, noInput(), DEFAULT_TUNING, 1 / 60);
    expect(w.exitReached).toBe(true);
  });
```

- [ ] **Step 3: Run** — `cd game && npx vitest run tests/world.test.ts` → PASS (anciens + 2 nouveaux).
- [ ] **Step 4: Commit** — `git add game/src/core/world.ts game/tests/world.test.ts && git commit -m "feat(core): createPlayer, exits/dungeon fields, scaled contact damage"`

---

## Task 4: generate.ts (génération procédurale)

**Files:** Create `game/src/core/generate.ts` — Test `game/tests/generate.test.ts`

- [ ] **Step 1: Test (échoue)**

```ts
import { describe, it, expect } from "vitest";
import { generateBiomeWorld } from "../src/core/generate";
import { getBiome, TIER_SCALING } from "../src/core/biomes";
import { createPlayer } from "../src/core/world";
import { canOccupy } from "../src/core/collision";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("generate", () => {
  it("déterministe : même seed → même zone", () => {
    const a = generateBiomeWorld(createPlayer(), getBiome("plains"), lcg(42));
    const b = generateBiomeWorld(createPlayer(), getBiome("plains"), lcg(42));
    expect(JSON.stringify(a.level.walls)).toBe(JSON.stringify(b.level.walls));
    expect(a.enemies.map((e) => [e.transform.pos.x, e.transform.pos.y])).toEqual(
      b.enemies.map((e) => [e.transform.pos.x, e.transform.pos.y]),
    );
  });
  it("nombre d'ennemis = scaling du tier", () => {
    const w = generateBiomeWorld(createPlayer(), getBiome("plains"), lcg(1));
    expect(w.enemies.length).toBe(TIER_SCALING.F.count);
  });
  it("ennemis d'un biome S plus coriaces qu'un biome F", () => {
    const f = generateBiomeWorld(createPlayer(), getBiome("plains"), lcg(1));
    const s = generateBiomeWorld(createPlayer(), getBiome("void_rift"), lcg(1));
    expect(s.enemies[0].health.maxHp).toBeGreaterThan(f.enemies[0].health.maxHp);
  });
  it("≥1 sortie, marqueurs de donjon = biome.dungeons", () => {
    const biome = getBiome("ruins"); // 3 donjons
    const w = generateBiomeWorld(createPlayer(), biome, lcg(7));
    expect(w.exits.length).toBeGreaterThanOrEqual(1);
    expect(w.dungeonEntrances.length).toBe(biome.dungeons);
  });
  it("le joueur est le même objet, placé sur une case libre", () => {
    const p = createPlayer();
    const w = generateBiomeWorld(p, getBiome("plains"), lcg(3));
    expect(w.player).toBe(p);
    expect(canOccupy(w.player.transform.pos, w.player.radius, w.level)).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter** `game/src/core/generate.ts`

```ts
import { BiomeDef, TIER_SCALING } from "./biomes";
import { Rect, Level, canOccupy } from "./collision";
import { makeEntity } from "./entity";
import { Player, World, Enemy, Exit, DungeonEntrance } from "./world";
import { Vec2, v, distance } from "./math/vec2";

const BIOME_CHASER_HP = 40;
const BASE_CONTACT_DMG = 5;

const rectNear = (r: Rect, p: Vec2, dist: number): boolean =>
  p.x >= r.x - dist && p.x <= r.x + r.w + dist && p.y >= r.y - dist && p.y <= r.y + r.h + dist;

function freeSpawn(rng: () => number, level: Level, avoid: Vec2, minDist: number, radius: number): Vec2 {
  const b = level.bounds;
  for (let i = 0; i < 60; i++) {
    const p = v(b.x + radius + rng() * (b.w - 2 * radius), b.y + radius + rng() * (b.h - 2 * radius));
    if (canOccupy(p, radius, level) && distance(p, avoid) >= minDist) return p;
  }
  return v(b.x + b.w - radius - 10, b.y + radius + 10); // repli
}

export function generateBiomeWorld(player: Player, biome: BiomeDef, rng: () => number): World {
  const bounds: Rect = { x: 0, y: 0, w: biome.size.w, h: biome.size.h };
  const entry = v(biome.size.w / 2, biome.size.h / 2);
  const exitPos = v(biome.size.w / 2, 50);

  // murs : 6..11 rectangles, en évitant l'entrée et la sortie
  const walls: Rect[] = [];
  const target = 6 + Math.floor(rng() * 6);
  let attempts = 0;
  while (walls.length < target && attempts < target * 12) {
    attempts++;
    const ww = 60 + Math.floor(rng() * 110);
    const wh = 60 + Math.floor(rng() * 110);
    const wx = 40 + Math.floor(rng() * Math.max(1, bounds.w - 80 - ww));
    const wy = 40 + Math.floor(rng() * Math.max(1, bounds.h - 80 - wh));
    const rect: Rect = { x: wx, y: wy, w: ww, h: wh };
    if (rectNear(rect, entry, 140)) continue;
    if (rectNear(rect, exitPos, 100)) continue;
    walls.push(rect);
  }
  const level: Level = { bounds, walls };

  // joueur placé à l'entrée (PV/énergie/hotbar conservés)
  player.transform.pos = { x: entry.x, y: entry.y };
  player.transform.vel = { x: 0, y: 0 };

  // ennemis (chasers scalés par le tier)
  const sc = TIER_SCALING[biome.tier];
  const enemies: Enemy[] = [];
  let id = 100;
  for (let i = 0; i < sc.count; i++) {
    const pos = freeSpawn(rng, level, entry, 220, 14);
    const base = makeEntity({ id: id++, x: pos.x, y: pos.y, maxHp: Math.round(BIOME_CHASER_HP * sc.hpMult), radius: 14, faction: "enemy" });
    enemies.push({ ...base, kind: "chaser", contactTimer: 0, contactDamage: Math.round(BASE_CONTACT_DMG * sc.dmgMult) });
  }

  const exits: Exit[] = [{ id: 900, pos: exitPos, radius: 28 }];
  const dungeonEntrances: DungeonEntrance[] = [];
  for (let i = 0; i < biome.dungeons; i++) {
    dungeonEntrances.push({ id: 800 + i, pos: freeSpawn(rng, level, entry, 160, 22), radius: 22 });
  }

  return {
    player, enemies, projectiles: [], pickups: [],
    exits, dungeonEntrances, level, biome,
    events: [], nextId: id + 1000, godMode: false, rng, exitReached: false,
  };
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Run la suite core** — `cd game && npm test` → tout vert.
- [ ] **Step 6: Commit** — `git add game/src/core/generate.ts game/tests/generate.test.ts && git commit -m "feat(core): procedural biome world generation"`

---

## Task 5: session.ts (joueur persistant) + debugPanel idempotent

**Files:** Create `game/src/game/session.ts` ; Modify `game/src/game/debug/debugPanel.ts`

- [ ] **Step 1: Créer** `game/src/game/session.ts`

```ts
import { Player, createPlayer } from "../core/world";
import { DebugFlags } from "./debug/debugPanel";

let player: Player | null = null;
let flags: DebugFlags | null = null;

export function getPlayer(): Player {
  if (!player) player = createPlayer();
  return player;
}

export function getFlags(): DebugFlags {
  if (!flags) flags = { showHitboxes: false, showVelocity: false, godMode: false, showFps: false };
  return flags;
}

export function resetSession(): void {
  player = null;
  flags = null;
}
```

- [ ] **Step 2: Rendre `createDebugPanel` idempotent** — au tout début de `createDebugPanel`, avant `const box = ...`, ajouter le garde, et donner un id au box :

```ts
export function createDebugPanel(tuning: Tuning, flags: DebugFlags): void {
  if (document.getElementById("sp-debug-panel")) return;
  const box = document.createElement("div");
  box.id = "sp-debug-panel";
  // ... reste inchangé
```

- [ ] **Step 3: Compile** — `cd game && npx tsc --noEmit`.
- [ ] **Step 4: Commit** — `git add game/src/game/session.ts game/src/game/debug/debugPanel.ts && git commit -m "feat(game): persistent session + idempotent debug panel"`

---

## Task 6: BiomeScene (zone jouable)

**Files:** Create `game/src/game/scenes/BiomeScene.ts`

- [ ] **Step 1: Créer** `game/src/game/scenes/BiomeScene.ts`

```ts
import Phaser from "phaser";
import { buildPlaceholders, queueRealAssets } from "../../assets/placeholders";
import { tickWorld, World } from "../../core/world";
import { generateBiomeWorld } from "../../core/generate";
import { getBiome } from "../../core/biomes";
import { DEFAULT_TUNING } from "../../core/config/tuning";
import { FixedStep } from "../../core/time/fixedStep";
import { InputMap } from "../input/inputMap";
import { SpriteLayer } from "../render/sprites";
import { spawnDamageText } from "../render/floatingText";
import { drawMeleeSlash } from "../render/slash";
import { HotbarBar } from "../render/hotbarBar";
import { activeWeapon } from "../../core/combat/hotbar";
import { computeStats, getWeaponDef } from "../../core/combat/weapons";
import { createDebugPanel } from "../debug/debugPanel";
import { getPlayer, getFlags } from "../session";

export class BiomeScene extends Phaser.Scene {
  private biomeId = "plains";
  private world!: World;
  private inputMap!: InputMap;
  private sprites!: SpriteLayer;
  private fixed = new FixedStep(1 / 60);
  private tuning = DEFAULT_TUNING;
  private flags = getFlags();
  private gfx!: Phaser.GameObjects.Graphics;
  private slashGfx!: Phaser.GameObjects.Graphics;
  private hotbarBar!: HotbarBar;
  private hud!: Phaser.GameObjects.Text;

  constructor() {
    super("biome");
  }

  init(data: { biomeId?: string }) {
    this.biomeId = data?.biomeId ?? "plains";
  }

  preload() {
    queueRealAssets(this);
  }

  create() {
    buildPlaceholders(this);
    const biome = getBiome(this.biomeId);
    this.world = generateBiomeWorld(getPlayer(), biome, Math.random);
    this.inputMap = new InputMap(this);
    this.sprites = new SpriteLayer(this);
    this.gfx = this.add.graphics().setDepth(1);
    this.slashGfx = this.add.graphics().setDepth(6);
    this.hotbarBar = new HotbarBar(this, getPlayer().hotbar.slots.length);
    this.hud = this.add.text(12, 12, "", { fontFamily: "monospace", fontSize: "14px", color: "#eef" }).setScrollFactor(0).setDepth(20);
    this.cameras.main.setBackgroundColor(biome.palette.ground);
    this.cameras.main.setBounds(0, 0, biome.size.w, biome.size.h);
    this.cameras.main.centerOn(this.world.player.transform.pos.x, this.world.player.transform.pos.y);
    createDebugPanel(this.tuning, this.flags);
    // retour carte au clavier
    this.input.keyboard!.on("keydown-M", () => this.scene.start("worldmap"));
    this.input.keyboard!.on("keydown-ESC", () => this.scene.start("worldmap"));
  }

  update(_t: number, deltaMs: number) {
    const dt = deltaMs / 1000;
    const input = this.inputMap.sample(this.cameras.main, this.world.player.transform.pos);
    this.world.godMode = this.flags.godMode;
    const ticks = this.fixed.advance(dt);
    for (let i = 0; i < ticks; i++) tickWorld(this.world, input, this.tuning, this.fixed.step);

    if (this.world.exitReached) {
      this.scene.start("worldmap");
      return;
    }

    for (const ev of this.world.events) spawnDamageText(this, ev.x, ev.y, ev.amount, ev.crit);
    this.world.events.length = 0;

    const biome = this.world.biome!;
    const lvl = this.world.level;
    this.gfx.clear();
    // sol (grille discrète) + murs (palette)
    this.gfx.fillStyle(biome.palette.ground, 1).fillRect(lvl.bounds.x, lvl.bounds.y, lvl.bounds.w, lvl.bounds.h);
    this.gfx.lineStyle(1, 0x000000, 0.08);
    for (let gx = 0; gx <= lvl.bounds.w; gx += 64) this.gfx.lineBetween(gx, 0, gx, lvl.bounds.h);
    for (let gy = 0; gy <= lvl.bounds.h; gy += 64) this.gfx.lineBetween(0, gy, lvl.bounds.w, gy);
    this.gfx.fillStyle(biome.palette.wall, 1);
    for (const wll of lvl.walls) this.gfx.fillRect(wll.x, wll.y, wll.w, wll.h);
    // sorties (portail accent) + entrées de donjon (sombres)
    for (const ex of this.world.exits) {
      this.gfx.fillStyle(biome.palette.accent, 0.9).fillCircle(ex.pos.x, ex.pos.y, ex.radius);
      this.gfx.lineStyle(3, 0xffffff, 0.9).strokeCircle(ex.pos.x, ex.pos.y, ex.radius);
    }
    for (const dg of this.world.dungeonEntrances) {
      this.gfx.fillStyle(0x0a0a12, 0.92).fillRect(dg.pos.x - dg.radius, dg.pos.y - dg.radius, dg.radius * 2, dg.radius * 2);
      this.gfx.lineStyle(2, biome.palette.accent, 0.9).strokeRect(dg.pos.x - dg.radius, dg.pos.y - dg.radius, dg.radius * 2, dg.radius * 2);
    }
    if (this.flags.showHitboxes) {
      this.gfx.lineStyle(1, 0x00ff88, 0.9);
      const p = this.world.player;
      this.gfx.strokeCircle(p.transform.pos.x, p.transform.pos.y, p.radius);
      for (const e of this.world.enemies) this.gfx.strokeCircle(e.transform.pos.x, e.transform.pos.y, e.radius);
    }

    // slash mêlée
    this.slashGfx.clear();
    const pl = this.world.player;
    const inst = activeWeapon(pl.hotbar);
    if (inst) {
      const rw = computeStats(getWeaponDef(inst.defId), inst.tier);
      if (rw.category === "melee") {
        const s = rw.attackSpeed;
        drawMeleeSlash(this.slashGfx, pl.transform.pos.x, pl.transform.pos.y, pl.melee, {
          damage: rw.atk, range: rw.range, arcDeg: rw.arcDeg, knockback: rw.knockback,
          windup: this.tuning.melee.windup / s, active: this.tuning.melee.active / s,
          recovery: this.tuning.melee.recovery / s, cadence: this.tuning.melee.cadence / s,
        });
      }
    }

    this.sprites.sync(this.world);
    this.cameras.main.centerOn(pl.transform.pos.x, pl.transform.pos.y);
    this.hotbarBar.update(pl.hotbar);

    const act = activeWeapon(pl.hotbar);
    const wpn = act ? `${getWeaponDef(act.defId).name} [${act.tier}]` : "(slot vide)";
    const fps = this.flags.showFps ? `  FPS:${Math.round(this.game.loop.actualFps)}` : "";
    this.hud.setText(
      `${biome.name} [${biome.tier}]   PV ${Math.round(pl.health.hp)}/${pl.health.maxHp}   Arme: ${wpn}   (M = carte)${fps}`,
    );
  }
}
```

- [ ] **Step 2: Compile** — `cd game && npx tsc --noEmit` (échouera tant que WorldMapScene n'existe pas si référencée ; ici BiomeScene référence "worldmap" par chaîne, donc OK).
- [ ] **Step 3: Commit** — `git add game/src/game/scenes/BiomeScene.ts && git commit -m "feat(game): biome scene (generated zone, palette render, exit)"`

---

## Task 7: WorldMapScene + main.ts + suppression TrainingScene

**Files:** Create `game/src/game/scenes/WorldMapScene.ts` ; Modify `game/src/main.ts` ; Delete `game/src/game/scenes/TrainingScene.ts`

- [ ] **Step 1: Créer** `game/src/game/scenes/WorldMapScene.ts`

```ts
import Phaser from "phaser";
import { buildWorldMap } from "../../core/worldMap";
import { getBiome } from "../../core/biomes";

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super("worldmap");
  }

  create() {
    const nodes = buildWorldMap();
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 + 20;
    this.cameras.main.setBackgroundColor("#0b0b14");
    this.add.text(this.scale.width / 2, 28, "CARTE DU MONDE — clique un biome (F au centre → S à l'extérieur)", {
      fontFamily: "monospace", fontSize: "16px", color: "#cfd2e6",
    }).setOrigin(0.5);

    // anneaux indicatifs
    const g = this.add.graphics();
    const radii = [...new Set(nodes.map((n) => n.ringRadius))];
    g.lineStyle(1, 0x2a2a40, 1);
    for (const r of radii) g.strokeCircle(cx, cy, r);

    for (const n of nodes) {
      const b = getBiome(n.biomeId);
      const x = cx + n.x;
      const y = cy + n.y;
      const node = this.add.circle(x, y, 18, b.palette.ground).setStrokeStyle(2, 0xffffff, 0.6).setInteractive({ useHandCursor: true });
      this.add.text(x, y, b.tier, { fontFamily: "monospace", fontSize: "12px", color: "#0d0d18", fontStyle: "bold" }).setOrigin(0.5);
      this.add.text(x, y + 26, b.name, { fontFamily: "monospace", fontSize: "10px", color: "#aab0c8" }).setOrigin(0.5);
      node.on("pointerover", () => node.setStrokeStyle(3, 0xffd24a, 1));
      node.on("pointerout", () => node.setStrokeStyle(2, 0xffffff, 0.6));
      node.on("pointerdown", () => this.scene.start("biome", { biomeId: n.biomeId }));
    }
  }
}
```

- [ ] **Step 2: Remplacer** `game/src/main.ts`

```ts
import Phaser from "phaser";
import { WorldMapScene } from "./game/scenes/WorldMapScene";
import { BiomeScene } from "./game/scenes/BiomeScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#10101a",
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: 960, height: 540 },
  scene: [WorldMapScene, BiomeScene],
};

new Phaser.Game(config);
```

- [ ] **Step 3: Supprimer l'ancienne scène** — `git rm game/src/game/scenes/TrainingScene.ts`

- [ ] **Step 4: Build** — `cd game && npm run build` → OK.
- [ ] **Step 5: Lancer le dev** — `cd game && npm run dev` ; vérifier : carte du monde (anneaux F→S), clic sur un biome → zone colorée générée (sol/murs palette, ennemis, sortie accent en haut, marqueurs donjon sombres) ; combat OK ; marcher dans la sortie (ou M) → retour carte ; entrer un biome externe → ennemis plus coriaces ; les armes ramassées persistent.
- [ ] **Step 6: Commit** — `git add game/src/game/scenes/WorldMapScene.ts game/src/main.ts && git commit -m "feat(game): world map scene + wiring, remove training scene"`

---

## Task 8: Vérification finale + README

**Files:** Modify `game/README.md`

- [ ] **Step 1: Suite complète** — `cd game && npm test` → tout vert.
- [ ] **Step 2: Build** — `cd game && npm run build` → OK.
- [ ] **Step 3: README** — remplacer le titre et ajouter une section Monde

Titre :
```md
# Top-down Roguelite — Tranches 0 (jouabilité) + A (armes) + B (monde)
```
Ajouter après la section Armes :
```md
## Monde & biomes

Le jeu démarre sur la **carte du monde** : 20 biomes en anneaux (rang **F au centre** → **S à
l'extérieur** = plus difficile). Clique un biome pour entrer dans une **zone générée**
(sol/murs colorés selon le biome, ennemis dont la résistance dépend du rang, une **sortie**
(disque clair) et des **entrées de donjon** (carrés sombres, à venir)). Reviens à la carte via
la sortie ou la touche **M / Échap**. Tes armes et tes PV **persistent** d'un biome à l'autre.
```

- [ ] **Step 4: Commit** — `git add game/README.md && git commit -m "docs(game): README tranche B (monde & biomes)"`

---

## Auto-revue (couverture spec)

- §2 carte/anneaux + entrée/sortie (M/Échap) → Tasks 2,6,7 ✔
- §3 20 biomes data + palettes → Task 1 ✔
- §4 scaling par tier → Tasks 1,4 ✔
- §5 génération procédurale (murs/ennemis/sortie/donjons, déterministe) → Task 4 ✔
- §6 persistance joueur (createPlayer + session) → Tasks 3,5 ✔
- §7 architecture (biomes/worldMap/generate, world fields, scenes) → toutes ✔
- §8 tests (biomes, worldMap, generate, world exit/createPlayer) → Tasks 1-4 ✔
- §9 DoD → Task 8 ✔

Types cohérents : `BiomeDef/BiomePalette/TIER_SCALING`, `MapNode`, `Exit/DungeonEntrance`,
`Enemy.contactDamage`, `World.{exits,dungeonEntrances,biome,exitReached}`, `createPlayer`,
`generateBiomeWorld(player, biome, rng)`, `getPlayer/getFlags` — utilisés à l'identique entre tâches.
```
