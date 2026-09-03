import { describe, it, expect } from "vitest";
import { createMelee, startMelee, tickMelee, isMeleeActive, targetsInArc } from "../src/core/combat/melee";
import { makeEntity } from "../src/core/entity";
import { v } from "../src/core/math/vec2";

const cfg = { damage: 15, range: 60, arcDeg: 90, windup: 0.06, active: 0.08, recovery: 0.12, cadence: 0.4, knockback: 180 };

describe("melee", () => {
  it("séquence windup → active → recovery → idle", () => {
    const m = createMelee();
    expect(startMelee(m, v(1, 0), cfg)).toBe(true);
    expect(m.phase).toBe("windup");
    tickMelee(m, cfg, 0.07);
    expect(m.phase).toBe("active");
    expect(isMeleeActive(m)).toBe(true);
    tickMelee(m, cfg, 0.09);
    expect(m.phase).toBe("recovery");
    tickMelee(m, cfg, 0.13);
    expect(m.phase).toBe("idle");
  });
  it("respecte la cadence", () => {
    const m = createMelee();
    startMelee(m, v(1, 0), cfg);
    for (let i = 0; i < 20; i++) tickMelee(m, cfg, 0.02);
    expect(startMelee(m, v(1, 0), cfg)).toBe(true);
  });
  it("targetsInArc : devant oui, derrière non, hors portée non", () => {
    const self = v(0, 0);
    const front = makeEntity({ id: 2, x: 40, y: 0, maxHp: 10, radius: 8, faction: "enemy" });
    const back = makeEntity({ id: 3, x: -40, y: 0, maxHp: 10, radius: 8, faction: "enemy" });
    const far = makeEntity({ id: 4, x: 200, y: 0, maxHp: 10, radius: 8, faction: "enemy" });
    const hits = targetsInArc(self, v(1, 0), [front, back, far], cfg);
    expect(hits.map((e) => e.id)).toEqual([2]);
  });
});
