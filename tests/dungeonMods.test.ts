import { describe, it, expect } from "vitest";
import { DUNGEON_MODS, getDungeonMod, rollDungeonMod, modsForTier, DUNGEON_MOD_CHANCE } from "../src/core/dungeonMods";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("dungeonMods (tranche L)", () => {
  it("ids uniques + noms", () => {
    const ids = new Set(DUNGEON_MODS.map((m) => m.id));
    expect(ids.size).toBe(DUNGEON_MODS.length);
    for (const m of DUNGEON_MODS) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(getDungeonMod(m.id)).toBe(m);
    }
  });

  it("maudit/gele dispo dès F ; corrompu réservé aux rangs B+ ; benediction partout", () => {
    const f = modsForTier("F").map((m) => m.id);
    expect(f).toContain("maudit");
    expect(f).toContain("gele");
    expect(f).toContain("benediction");
    expect(f).not.toContain("corrompu");
    const b = modsForTier("B").map((m) => m.id);
    expect(b).toContain("corrompu");
    const s = modsForTier("S").map((m) => m.id);
    expect(s).toContain("sanglant");
    expect(s).toContain("opulent");
    expect(s).toContain("corrompu");
  });

  it("rollDungeonMod renvoie null si le rng dépasse la chance", () => {
    const rng = () => DUNGEON_MOD_CHANCE + 0.01;
    expect(rollDungeonMod("S", rng)).toBeNull();
  });

  it("rollDungeonMod ne renvoie que des mods accessibles au rang", () => {
    const allowed = new Set(modsForTier("F").map((m) => m.id));
    let mods = 0;
    const rng = lcg(3);
    for (let i = 0; i < 300; i++) {
      const id = rollDungeonMod("F", rng);
      if (!id) continue;
      mods++;
      expect(allowed.has(id)).toBe(true);
    }
    expect(mods).toBeGreaterThan(0);
  });

  it("benediction (bonus pur) est moins fréquente que maudit", () => {
    const rng = lcg(7);
    let benediction = 0;
    let maudit = 0;
    for (let i = 0; i < 2000; i++) {
      const id = rollDungeonMod("F", rng);
      if (id === "benediction") benediction++;
      if (id === "maudit") maudit++;
    }
    expect(maudit).toBeGreaterThan(benediction * 2);
  });
});
