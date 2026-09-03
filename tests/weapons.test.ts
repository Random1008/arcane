import { describe, it, expect } from "vitest";
import { WEAPONS, getWeaponDef, computeStats, TIER_MULT } from "../src/core/combat/weapons";

describe("weapons", () => {
  it("a 6 armes avec catégories correctes", () => {
    expect(WEAPONS.map((w) => w.id)).toEqual(["sword", "dagger", "axe", "hammer", "bow", "staff"]);
    expect(getWeaponDef("bow").category).toBe("ranged");
    expect(getWeaponDef("sword").category).toBe("melee");
  });
  it("computeStats applique le multiplicateur de tier à l'ATK", () => {
    const sword = getWeaponDef("sword"); // atk 15
    expect(computeStats(sword, "F").atk).toBeCloseTo(15 * TIER_MULT.F);
    expect(computeStats(sword, "S").atk).toBeCloseTo(15 * TIER_MULT.S);
    expect(computeStats(sword, "S").critChance).toBe(sword.critChance);
  });
  it("omega : stats supérieures + transperce", () => {
    const sword = getWeaponDef("sword");
    const base = computeStats(sword, "S", false);
    const omega = computeStats(sword, "S", true);
    expect(omega.atk).toBeGreaterThan(base.atk);
    expect(omega.critChance).toBeGreaterThan(base.critChance);
    expect(omega.signature).toBe("pierce");
  });
});

