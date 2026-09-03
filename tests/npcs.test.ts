import { describe, it, expect } from "vitest";
import { npcsForBiome } from "../src/core/npcs";
import { BIOMES, getBiome } from "../src/core/biomes";

describe("npcs", () => {
  it("un set de PNJ pour chacun des 20 biomes, aucun pour le sanctuaire", () => {
    for (const b of BIOMES) {
      const npcs = npcsForBiome(b.id);
      expect(npcs.length).toBeGreaterThanOrEqual(1);
      for (const n of npcs) {
        expect(n.name.length).toBeGreaterThan(0);
        expect(n.lines.length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(npcsForBiome("spawn")).toEqual([]);
  });

  it("la 1re réplique de chaque biome nomme le biome", () => {
    for (const b of BIOMES) {
      const first = npcsForBiome(b.id)[0];
      expect(first.lines.join(" ").toLowerCase()).toContain(getBiome(b.id).name.toLowerCase());
    }
  });
});
