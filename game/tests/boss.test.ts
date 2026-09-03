import { describe, it, expect } from "vitest";
import { createWorld, createPlayer, tickWorld, InputState } from "../src/core/world";
import { makeBoss, updateBoss } from "../src/core/boss";
import { bossForBiome } from "../src/core/bosses";
import { generateBiomeWorld } from "../src/core/generate";
import { getBiome } from "../src/core/biomes";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const dt = 1 / 60;
const def = (id: string) => bossForBiome(id)!;
const noInput = (): InputState => ({
  moveDir: v(0, 0),
  aimPoint: v(0, 0),
  attack: false,
  dash: false,
  blink: false,
  selectSlot: -1,
  scroll: 0,
  cycleTier: false,
  ability: -1,
});

describe("boss", () => {
  it("phaseIndex augmente quand les PV chutent", () => {
    const w = createWorld();
    const boss = makeBoss(def("toxic_marsh"), "D", 600, 200); // 3 phases
    w.boss = boss;
    updateBoss(boss, w, dt);
    expect(boss.phaseIndex).toBe(0); // PV pleins
    boss.health.hp = boss.health.maxHp * 0.1;
    updateBoss(boss, w, dt);
    expect(boss.phaseIndex).toBe(boss.phases.length - 1); // PV bas → dernière phase
  });

  it("volley : crée des projectiles ennemis", () => {
    const w = createWorld();
    w.rng = () => 0;
    w.boss = makeBoss(def("cave"), "F", w.player.transform.pos.x + 150, w.player.transform.pos.y);
    for (let i = 0; i < 120; i++) updateBoss(w.boss, w, dt);
    expect(w.projectiles.some((p) => p.faction === "enemy")).toBe(true);
  });

  it("summon : ajoute des sbires", () => {
    const w = createWorld();
    w.enemies = [];
    w.rng = () => 0.99; // dark_woods phase0 [volley, summon] → summon
    w.boss = makeBoss(def("dark_woods"), "E", w.player.transform.pos.x + 150, w.player.transform.pos.y);
    for (let i = 0; i < 120; i++) updateBoss(w.boss, w, dt);
    expect(w.enemies.length).toBeGreaterThan(0);
  });

  it("charge → fenêtre de faiblesse", () => {
    const w = createWorld();
    w.rng = () => 0.99; // cave phase1 [volley, charge] → charge
    const boss = makeBoss(def("cave"), "F", w.player.transform.pos.x + 150, w.player.transform.pos.y);
    boss.health.hp = boss.health.maxHp * 0.2; // phase 1
    w.boss = boss;
    let sawWeakness = false;
    for (let i = 0; i < 200 && !sawWeakness; i++) {
      updateBoss(boss, w, dt);
      if (boss.state === "weakness") sawWeakness = true;
    }
    expect(sawWeakness).toBe(true);
  });

  it("aoe : blesse un joueur immobile resté dans le cercle", () => {
    const w = createWorld();
    w.rng = () => 0.99; // toxic_marsh phase0 [volley, aoe] → aoe
    w.boss = makeBoss(def("toxic_marsh"), "D", w.player.transform.pos.x + 200, w.player.transform.pos.y);
    const hp0 = w.player.health.hp;
    for (let i = 0; i < 120; i++) updateBoss(w.boss, w, dt); // le joueur ne bouge pas
    expect(w.player.health.hp).toBeLessThan(hp0);
  });

  it("les sbires invoqués sont plafonnés", () => {
    const w = createWorld();
    w.enemies = [];
    w.rng = () => 0.99; // dark_woods → summon
    w.boss = makeBoss(def("dark_woods"), "E", w.player.transform.pos.x + 150, w.player.transform.pos.y);
    for (let i = 0; i < 3000; i++) updateBoss(w.boss, w, dt);
    expect(w.enemies.filter((e) => e.name === "Sbire").length).toBeLessThanOrEqual(6);
  });

  it("la sortie est verrouillée tant que le boss vit, ouverte après sa mort", () => {
    const w = generateBiomeWorld(createPlayer(), getBiome("cave"), Math.random, true); // dernier biome de l'anneau → boss
    w.godMode = true;
    const ex = w.exits[0];
    w.player.transform.pos = { x: ex.pos.x, y: ex.pos.y };
    tickWorld(w, noInput(), DEFAULT_TUNING, dt);
    expect(w.exitReached).toBe(false); // boss vivant → sortie verrouillée
    w.boss!.health.hp = 0;
    tickWorld(w, noInput(), DEFAULT_TUNING, dt); // le boss meurt
    w.player.transform.pos = { x: ex.pos.x, y: ex.pos.y };
    tickWorld(w, noInput(), DEFAULT_TUNING, dt);
    expect(w.exitReached).toBe(true);
  });

  it("anti-répétition : les deux patterns d'une phase sont utilisés en alternance", () => {
    const w = createWorld();
    w.enemies = [];
    w.rng = () => 0; // dark_woods phase0 [volley, summon]
    const boss = makeBoss(def("dark_woods"), "E", w.player.transform.pos.x + 150, w.player.transform.pos.y);
    w.boss = boss;
    const seen = new Set<string>();
    for (let i = 0; i < 600; i++) {
      updateBoss(boss, w, dt);
      if (boss.lastPattern) seen.add(boss.lastPattern);
    }
    expect(seen.size).toBe(2);
  });
});
