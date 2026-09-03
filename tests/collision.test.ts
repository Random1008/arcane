import { describe, it, expect } from "vitest";
import { canOccupy, clampToBounds, Level } from "../src/core/collision";
import { v } from "../src/core/math/vec2";

const level: Level = { bounds: { x: 0, y: 0, w: 1000, h: 1000 }, walls: [{ x: 400, y: 400, w: 100, h: 100 }] };

describe("collision", () => {
  it("refuse hors bounds", () => {
    expect(canOccupy(v(-5, 50), 10, level)).toBe(false);
  });
  it("refuse dans un mur", () => {
    expect(canOccupy(v(450, 450), 10, level)).toBe(false);
  });
  it("accepte une case libre", () => {
    expect(canOccupy(v(100, 100), 10, level)).toBe(true);
  });
  it("clampToBounds garde le cercle dedans", () => {
    const p = clampToBounds(v(-50, 2000), 10, level.bounds);
    expect(p.x).toBe(10);
    expect(p.y).toBe(1000 - 10);
  });
});
