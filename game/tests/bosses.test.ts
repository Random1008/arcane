import { describe, it, expect } from "vitest";
import { BOSSES, BOSS_BIOME, bossForBiome, resolveBossStats } from "../src/core/bosses";
import { TIERS } from "../src/core/combat/weapons";

describe("bosses", () => {
  it("1 boss par rang (7), biomes-boss mappés", () => {
    expect(BOSSES.length).toBe(7);
    for (const t of TIERS) {
      expect(bossForBiome(BOSS_BIOME[t])?.tier).toBe(t);
    }
  });
  it("chaque boss a 1-3 phases avec ≥1 pattern", () => {
    for (const b of BOSSES) {
      expect(b.phases.length).toBeGreaterThanOrEqual(1);
      expect(b.phases.length).toBeLessThanOrEqual(3);
      for (const ph of b.phases) expect(ph.patterns.length).toBeGreaterThanOrEqual(1);
    }
  });
  it("resolveBossStats scale les PV par rang", () => {
    expect(resolveBossStats("S").maxHp).toBeGreaterThan(resolveBossStats("F").maxHp);
  });
  it("bossForBiome renvoie null hors biome-boss", () => {
    expect(bossForBiome("plains")).toBe(null);
  });
});
