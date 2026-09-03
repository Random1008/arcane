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
