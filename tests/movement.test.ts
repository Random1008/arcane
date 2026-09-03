import { describe, it, expect } from "vitest";
import { applyMovement, applyMovementCollide } from "../src/core/movement";
import { v } from "../src/core/math/vec2";

const cfg = { maxSpeed: 200, accel: 2000, friction: 1800 };

describe("movement", () => {
  it("accélère vers la vitesse cible sans dépasser maxSpeed", () => {
    const t = { pos: v(0, 0), vel: v(0, 0) };
    for (let i = 0; i < 60; i++) applyMovement(t, v(1, 0), cfg, 1 / 60);
    expect(t.vel.x).toBeCloseTo(200, 0);
    expect(t.vel.x).toBeLessThanOrEqual(200.0001);
  });
  it("friction ramène la vitesse à zéro quand input nul", () => {
    const t = { pos: v(0, 0), vel: v(200, 0) };
    for (let i = 0; i < 60; i++) applyMovement(t, v(0, 0), cfg, 1 / 60);
    expect(t.vel.x).toBeCloseTo(0, 1);
  });
  it("intègre la position", () => {
    const t = { pos: v(0, 0), vel: v(0, 0) };
    applyMovement(t, v(1, 0), cfg, 0.1);
    expect(t.pos.x).toBeGreaterThan(0);
  });

  it("applyMovementCollide : bloque l'axe qui heurte un mur", () => {
    const t = { pos: v(190, 0), vel: v(0, 0) };
    const canOccupy = (p: { x: number; y: number }) => p.x <= 200;
    for (let i = 0; i < 60; i++) applyMovementCollide(t, v(1, 0), cfg, 1 / 60, canOccupy);
    expect(t.pos.x).toBeLessThanOrEqual(200);
    expect(t.vel.x).toBe(0);
  });

  it("applyMovementCollide : glisse sur l'axe libre", () => {
    const t = { pos: v(190, 0), vel: v(0, 0) };
    const canOccupy = (p: { x: number; y: number }) => p.x <= 200;
    for (let i = 0; i < 30; i++) applyMovementCollide(t, v(1, 1), cfg, 1 / 60, canOccupy);
    expect(t.pos.x).toBeLessThanOrEqual(200);
    expect(t.pos.y).toBeGreaterThan(0);
  });
});
