import { describe, it, expect } from "vitest";
import { spawnProjectile, tickProjectile, isExpired } from "../src/core/combat/projectile";
import { v } from "../src/core/math/vec2";

const opts = { speed: 480, radius: 5, damage: 8, lifetime: 1.2, pierce: false, crit: false };

describe("projectile", () => {
  it("part vers la direction, avance, porte ses dégâts/flags", () => {
    const p = spawnProjectile(1, v(0, 0), v(1, 0), opts, "player");
    expect(p.vel.x).toBeCloseTo(480);
    expect(p.damage).toBe(8);
    expect(p.pierce).toBe(false);
    expect(p.hitIds.size).toBe(0);
    tickProjectile(p, 0.1);
    expect(p.pos.x).toBeCloseTo(48);
    expect(p.life).toBeCloseTo(1.1);
  });
  it("expire après lifetime", () => {
    const p = spawnProjectile(1, v(0, 0), v(1, 0), opts, "player");
    tickProjectile(p, 1.3);
    expect(isExpired(p)).toBe(true);
  });
  it("pierce/crit transmis", () => {
    const p = spawnProjectile(2, v(0, 0), v(0, 1), { ...opts, pierce: true, crit: true, radius: 12 }, "player");
    expect(p.pierce).toBe(true);
    expect(p.crit).toBe(true);
    expect(p.radius).toBe(12);
  });
});
