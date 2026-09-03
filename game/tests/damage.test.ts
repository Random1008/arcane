import { describe, it, expect } from "vitest";
import { applyDamage } from "../src/core/combat/damage";
import { makeEntity } from "../src/core/entity";
import { v } from "../src/core/math/vec2";

describe("damage", () => {
  it("inflige des dégâts + knockback + hitstun hors i-frames", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 100, radius: 10, faction: "enemy" });
    const hit = applyDamage(e, 15, v(180, 0));
    expect(hit).toBe(true);
    expect(e.health.hp).toBe(85);
    expect(e.transform.vel.x).toBeCloseTo(180);
    expect(e.health.hitstun).toBeGreaterThan(0);
  });
  it("ignoré pendant les i-frames", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 100, radius: 10, faction: "player" });
    e.health.iframes = 0.2;
    expect(applyDamage(e, 15, v(0, 0))).toBe(false);
    expect(e.health.hp).toBe(100);
  });
  it("ne descend pas sous 0", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 10, radius: 10, faction: "enemy" });
    applyDamage(e, 999, v(0, 0));
    expect(e.health.hp).toBe(0);
  });
});
