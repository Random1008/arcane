import { describe, it, expect } from "vitest";
import { BIOME_TERRAIN, zoneCountFor, placeZone, zonesAt, onTerrain, terrainDps, terrainTickInterval } from "../src/core/terrain";
import { generateBiomeWorld } from "../src/core/generate";
import { getBiome } from "../src/core/biomes";
import { createPlayer, tickWorld } from "../src/core/world";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const noInput = () => ({
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

/** Monde de biome sans ennemis ni boss ni événement (isole le terrain des combats/DoT). */
function quietWorld(biomeId: string, seed: number) {
  const w = generateBiomeWorld(createPlayer(), getBiome(biomeId), lcg(seed));
  w.enemies = [];
  w.boss = null;
  w.eventId = null;
  return w;
}

describe("terrain (tranche K)", () => {
  it("la table biome→kinds couvre des biomes à thème (volcan, glace, marais)", () => {
    expect(BIOME_TERRAIN.volcano).toContain("lava");
    expect(BIOME_TERRAIN.ice_floe).toContain("ice");
    expect(BIOME_TERRAIN.toxic_marsh).toContain("poison");
    // le Sanctuaire n'est jamais dans la table
    expect(BIOME_TERRAIN.spawn).toBeUndefined();
  });

  it("placeZone renvoie null si tout est interdit, une zone sinon", () => {
    const rng = lcg(1);
    const bounds = { x: 0, y: 0, w: 500, h: 500 };
    const z = placeZone(rng, "lava", bounds, []);
    expect(z).not.toBeNull();
    expect(z!.kind).toBe("lava");
    // zone couvrant tout le niveau → aucun placement possible
    const full = placeZone(rng, "lava", { x: 0, y: 0, w: 100, h: 100 }, [{ x: -200, y: -200, w: 900, h: 900 }]);
    expect(full).toBeNull();
  });

  it("les biomes déclarés ont du terrain généré, les autres non", () => {
    const volc = generateBiomeWorld(createPlayer(), getBiome("volcano"), lcg(3));
    expect(volc.terrain.length).toBeGreaterThanOrEqual(2);
    expect(volc.terrain.length).toBeLessThanOrEqual(4);
    expect(volc.terrain.every((z) => z.kind === "lava")).toBe(true);
    const plains = generateBiomeWorld(createPlayer(), getBiome("plains"), lcg(3));
    expect(plains.terrain.length).toBe(0);
    const spawn = generateBiomeWorld(createPlayer(), getBiome("spawn"), lcg(3));
    expect(spawn.terrain.length).toBe(0);
  });

  it("le terrain généré ne recouvre ni l'entrée, ni la sortie", () => {
    const volc = generateBiomeWorld(createPlayer(), getBiome("volcano"), lcg(8));
    const entry = v(volc.level.bounds.w / 2, volc.level.bounds.h / 2);
    const exit = v(volc.level.bounds.w / 2, 50);
    expect(onTerrain(volc.terrain, "lava", entry, 20)).toBe(false);
    expect(onTerrain(volc.terrain, "lava", exit, 20)).toBe(false);
  });

  it("le joueur dans une zone lava subit des dégâts cadencés", () => {
    const w = quietWorld("volcano", 4);
    expect(w.terrain.length).toBeGreaterThan(0);
    const z = w.terrain[0];
    // place le joueur au centre de la zone
    w.player.transform.pos = v(z.x + z.w / 2, z.y + z.h / 2);
    const hp0 = w.player.health.hp;
    for (let i = 0; i < 60; i++) tickWorld(w, noInput(), DEFAULT_TUNING, 1 / 60); // 1 s
    expect(w.player.health.hp).toBeLessThan(hp0);
    expect(w.player.health.hp).toBeGreaterThan(0);
  });

  it("le joueur hors zone lava ne perd pas de PV", () => {
    const w = quietWorld("volcano", 5);
    const hp0 = w.player.health.hp;
    for (let i = 0; i < 60; i++) tickWorld(w, noInput(), DEFAULT_TUNING, 1 / 60);
    expect(w.player.health.hp).toBe(hp0);
  });

  it("zoneCountFor renvoie 2..4", () => {
    const rng = lcg(1);
    for (let i = 0; i < 20; i++) {
      const n = zoneCountFor(rng);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(4);
    }
  });

  it("dégâts/cadence par kind : lava ≥ poison", () => {
    expect(terrainDps("lava")).toBeGreaterThanOrEqual(terrainDps("poison"));
    expect(terrainDps("spikes")).toBe(terrainDps("lava"));
    expect(terrainTickInterval("lava")).toBeLessThan(terrainTickInterval("poison"));
  });

  it("zonesAt/onTerrain : détection point dans zone", () => {
    const zones = [{ id: 1, kind: "lava" as const, x: 0, y: 0, w: 100, h: 100 }];
    expect(onTerrain(zones, "lava", v(50, 50), 5)).toBe(true);
    expect(onTerrain(zones, "lava", v(150, 50), 5)).toBe(false);
    expect(onTerrain(zones, "poison", v(50, 50), 5)).toBe(false);
    expect(zonesAt(zones, null, v(50, 50), 5).length).toBe(1);
  });
});
