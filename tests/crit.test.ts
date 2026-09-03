import { describe, it, expect } from "vitest";
import { rollDamage } from "../src/core/combat/crit";

describe("crit", () => {
  it("crit quand rng < critChance", () => {
    const r = rollDamage(20, 0.5, 2.0, () => 0);
    expect(r.crit).toBe(true);
    expect(r.amount).toBe(40);
  });
  it("pas de crit quand rng >= critChance", () => {
    const r = rollDamage(20, 0.5, 2.0, () => 0.999);
    expect(r.crit).toBe(false);
    expect(r.amount).toBe(20);
  });
  it("critChance 0 ne crit jamais", () => {
    expect(rollDamage(10, 0, 3, () => 0).crit).toBe(false);
  });
});
