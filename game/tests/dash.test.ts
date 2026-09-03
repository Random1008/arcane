import { describe, it, expect } from "vitest";
import { createDash, startDash, tickDash } from "../src/core/abilities/dash";
import { makeEntity, isInvulnerable } from "../src/core/entity";
import { v } from "../src/core/math/vec2";

const cfg = { distance: 180, duration: 0.18, iframes: 0.25, cooldown: 0.8 };

describe("dash", () => {
  it("démarre, donne i-frames, impose la vitesse", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 100, radius: 10, faction: "player" });
    const d = createDash();
    expect(startDash(d, v(1, 0), e, cfg)).toBe(true);
    expect(d.phase).toBe("dashing");
    expect(isInvulnerable(e)).toBe(true);
    tickDash(d, e, cfg, 1 / 60);
    expect(e.transform.vel.x).toBeCloseTo(180 / 0.18, 0);
  });
  it("refuse un second dash tant que pas terminé/cooldown", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 100, radius: 10, faction: "player" });
    const d = createDash();
    startDash(d, v(1, 0), e, cfg);
    expect(startDash(d, v(0, 1), e, cfg)).toBe(false);
    for (let i = 0; i < 12; i++) tickDash(d, e, cfg, 1 / 60);
    expect(d.phase).toBe("ready");
    expect(startDash(d, v(0, 1), e, cfg)).toBe(false);
  });
  it("redevient disponible après le cooldown", () => {
    const e = makeEntity({ id: 1, x: 0, y: 0, maxHp: 100, radius: 10, faction: "player" });
    const d = createDash();
    startDash(d, v(1, 0), e, cfg);
    for (let i = 0; i < 120; i++) tickDash(d, e, cfg, 1 / 60);
    expect(startDash(d, v(0, 1), e, cfg)).toBe(true);
  });
});
