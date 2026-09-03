import { describe, it, expect } from "vitest";
import { BIOMES, getBiome, TIER_SCALING } from "../src/core/biomes";
import { TIERS } from "../src/core/combat/weapons";

describe("biomes", () => {
  it("49 biomes, tiers valides, anneaux n+1 : 4/5/6/7/8/9/10", () => {
    expect(BIOMES.length).toBe(49);
    for (const b of BIOMES) expect(TIERS).toContain(b.tier);
    const counts = TIERS.map((t) => BIOMES.filter((b) => b.tier === t).length);
    expect(counts).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });
  it("ids de biomes uniques", () => {
    const ids = BIOMES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("getBiome renvoie le bon biome (dont le sanctuaire de départ, sans ennemis)", () => {
    expect(getBiome("plains").tier).toBe("F");
    expect(getBiome("void_rift").tier).toBe("S");
    expect(getBiome("spawn").enemyCount).toBe(0);
  });
  it("le nombre d'ennemis et les PV croissent de F à S", () => {
    expect(TIER_SCALING.F.count).toBeLessThan(TIER_SCALING.S.count);
    expect(TIER_SCALING.F.hpMult).toBeLessThan(TIER_SCALING.S.hpMult);
  });
});
