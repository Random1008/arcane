import { describe, it, expect } from "vitest";
import { createWorld, makeEnemy, tickWorld, InputState } from "../src/core/world";
import { getBiome } from "../src/core/biomes";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const T = DEFAULT_TUNING;
const dt = 1 / 60;
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

describe("loot drops", () => {
  it("un ennemi qui meurt lâche une arme", () => {
    const w = createWorld();
    w.rng = () => 0; // drop garanti (0 < BALANCE.dropChance), rareté F
    const before = w.pickups.length;
    const e = makeEnemy(900, 200, 200, "chaser", "F", "R");
    e.health.hp = 0; // mort
    w.enemies = [e];
    tickWorld(w, noInput(), T, dt);
    expect(w.pickups.length).toBe(before + 1);
    expect(w.pickups[w.pickups.length - 1].tier).toBe("F");
  });

  it("tuer un ennemi crédite de l'XP", () => {
    const w = createWorld();
    w.rng = () => 0.99; // pas de drop
    const e = makeEnemy(960, 200, 200, "chaser", "F", "R");
    e.health.hp = 0;
    w.enemies = [e];
    tickWorld(w, noInput(), T, dt);
    expect(w.player.xp).toBeGreaterThan(0);
  });

  it("tuer un ennemi crédite de l'or", () => {
    const w = createWorld();
    w.rng = () => 0.99; // pas de drop d'objet
    const e = makeEnemy(961, 200, 200, "chaser", "F", "R");
    e.health.hp = 0;
    w.enemies = [e];
    tickWorld(w, noInput(), T, dt);
    expect(w.player.gold).toBeGreaterThan(0);
  });

  it("un sbire de boss ne lâche rien", () => {
    const w = createWorld();
    w.rng = () => 0;
    const before = w.pickups.length;
    const e = makeEnemy(901, 200, 200, "chaser", "F", "Sbire");
    e.health.hp = 0;
    w.enemies = [e];
    tickWorld(w, noInput(), T, dt);
    expect(w.pickups.length).toBe(before);
  });

  it("un ennemi peut lâcher de l'Omganium (rang A+)", () => {
    const w = createWorld();
    w.biome = getBiome("abyss"); // rang A → Omganium possible
    let c = 0;
    w.rng = () => (c++ === 0 ? 0.99 : 0); // gate arme: pas de drop ; gate Omganium: drop
    const before = w.materials.length;
    const e = makeEnemy(910, 200, 200, "chaser", "F", "R");
    e.health.hp = 0;
    w.enemies = [e];
    tickWorld(w, noInput(), T, dt);
    expect(w.materials.length).toBe(before + 1);
  });

  it("ramasser de l'Omganium incrémente le compteur", () => {
    const w = createWorld();
    const p = w.player;
    w.materials = [{ id: 500, pos: { x: p.transform.pos.x, y: p.transform.pos.y }, radius: 14, taken: false }];
    const before = p.omganium;
    tickWorld(w, noInput(), T, dt);
    expect(p.omganium).toBe(before + 1);
  });

  it("ramasser (touche G) un pickup Ω équipe une arme omega", () => {
    const w = createWorld();
    const p = w.player;
    w.pickups = [{ id: 999, pos: { x: p.transform.pos.x, y: p.transform.pos.y }, radius: 16, defId: "sword", tier: "S", omega: true, taken: false }];
    tickWorld(w, { ...noInput(), pickup: true }, T, dt);
    const eq = p.hotbar.slots.find((s) => s && s.omega);
    expect(eq?.omega).toBe(true);
    expect(p.omegaUnlocked).toBe(true); // débloque les PNJ Ω
  });

  it("ramassage manuel : rien sans la touche, équipé avec G", () => {
    const w = createWorld();
    const p = w.player;
    w.pickups = [{ id: 999, pos: { x: p.transform.pos.x, y: p.transform.pos.y }, radius: 16, defId: "axe", tier: "B", omega: false, taken: false }];
    tickWorld(w, noInput(), T, dt);
    expect(p.hotbar.slots.some((s) => s && s.defId === "axe")).toBe(false); // pas d'auto-ramassage
    tickWorld(w, { ...noInput(), pickup: true }, T, dt);
    expect(p.hotbar.slots.some((s) => s && s.defId === "axe")).toBe(true);
  });

  it("jeter (touche X) lâche l'arme active au sol en conservant tier/omega/mod", () => {
    const w = createWorld();
    const p = w.player;
    p.hotbar.slots[1] = { defId: "sword", tier: "S", omega: true, mod: "feroce" };
    p.hotbar.activeIndex = 1;
    tickWorld(w, { ...noInput(), drop: true }, T, dt);
    expect(p.hotbar.slots[1]).toBe(null);
    expect(p.hotbar.activeIndex).toBe(0); // revient aux Poings
    const dropped = w.pickups[w.pickups.length - 1];
    expect(dropped.defId).toBe("sword");
    expect(dropped.omega).toBe(true);
    expect(dropped.mod).toBe("feroce");
  });

  it("on ne jette pas les Poings (slot 0)", () => {
    const w = createWorld();
    const p = w.player;
    p.hotbar.activeIndex = 0;
    const before = w.pickups.length;
    tickWorld(w, { ...noInput(), drop: true }, T, dt);
    expect(w.pickups.length).toBe(before);
  });

  it("le pity augmente sur un drop commun et se réinitialise sur une rareté élevée", () => {
    const w = createWorld();
    w.rng = () => 0; // gate→drop, rareté F (commune) → pity++
    const e1 = makeEnemy(902, 200, 200, "chaser", "F", "R");
    e1.health.hp = 0;
    w.enemies = [e1];
    tickWorld(w, noInput(), T, dt);
    expect(w.player.pity).toBe(1);
    // 1er appel rng = gate du drop (bas → drop), appels suivants hauts → rareté max (Ω) → pity remis à 0
    let calls = 0;
    w.rng = () => (calls++ === 0 ? 0 : 0.999999);
    const e2 = makeEnemy(903, 200, 200, "chaser", "F", "R");
    e2.health.hp = 0;
    w.enemies = [e2];
    tickWorld(w, noInput(), T, dt);
    expect(w.player.pity).toBe(0);
  });
});
