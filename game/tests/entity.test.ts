import { describe, it, expect } from "vitest";
import { makeEntity, isInvulnerable, isStunned, tickIframes, tickHitstun } from "../src/core/entity";

describe("entity", () => {
  it("makeEntity initialise pos/vel/hp/hitstun", () => {
    const e = makeEntity({ id: 1, x: 10, y: 20, maxHp: 100, radius: 12, faction: "enemy" });
    expect(e.transform.pos).toEqual({ x: 10, y: 20 });
    expect(e.transform.vel).toEqual({ x: 0, y: 0 });
    expect(e.health.hp).toBe(100);
    expect(e.health.iframes).toBe(0);
    expect(e.health.hitstun).toBe(0);
  });

  it("hitstun : actif puis décrément jusqu'à 0", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 50, radius: 10, faction: "enemy" });
    e.health.hitstun = 0.2;
    expect(isStunned(e)).toBe(true);
    tickHitstun(e, 0.1);
    expect(e.health.hitstun).toBeCloseTo(0.1);
    tickHitstun(e, 1);
    expect(e.health.hitstun).toBe(0);
    expect(isStunned(e)).toBe(false);
  });
  it("iframes : invulnérable puis décrément", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 50, radius: 10, faction: "player" });
    e.health.iframes = 0.25;
    expect(isInvulnerable(e)).toBe(true);
    tickIframes(e, 0.1);
    expect(e.health.iframes).toBeCloseTo(0.15);
    tickIframes(e, 1);
    expect(e.health.iframes).toBe(0);
    expect(isInvulnerable(e)).toBe(false);
  });
});
