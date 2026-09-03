import { describe, it, expect } from "vitest";
import { ARCHETYPES, resolveEnemyStats } from "../src/core/enemies";

describe("enemies", () => {
  it("a les 5 archétypes (+ dummy)", () => {
    for (const k of ["dummy", "chaser", "shooter", "brute", "swarmer", "bomber"] as const) {
      expect(ARCHETYPES[k]).toBeTruthy();
    }
  });
  it("resolveEnemyStats scale par archétype × rang", () => {
    expect(resolveEnemyStats("chaser", "S").maxHp).toBeGreaterThan(resolveEnemyStats("chaser", "F").maxHp);
    expect(resolveEnemyStats("brute", "F").maxHp).toBeGreaterThan(resolveEnemyStats("chaser", "F").maxHp);
    expect(resolveEnemyStats("swarmer", "F").maxHp).toBeLessThan(resolveEnemyStats("chaser", "F").maxHp);
    expect(resolveEnemyStats("brute", "F").contactDamage).toBeGreaterThan(resolveEnemyStats("chaser", "F").contactDamage);
  });
});
