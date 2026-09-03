import { describe, it, expect } from "vitest";
import { v, add, sub, scale, length, normalize, distance, clampLength } from "../src/core/math/vec2";

describe("vec2", () => {
  it("add/sub/scale", () => {
    expect(add(v(1, 2), v(3, 4))).toEqual({ x: 4, y: 6 });
    expect(sub(v(3, 4), v(1, 1))).toEqual({ x: 2, y: 3 });
    expect(scale(v(2, 3), 2)).toEqual({ x: 4, y: 6 });
  });
  it("length/distance", () => {
    expect(length(v(3, 4))).toBe(5);
    expect(distance(v(0, 0), v(0, 5))).toBe(5);
  });
  it("normalize d'un vecteur nul = (0,0)", () => {
    expect(normalize(v(0, 0))).toEqual({ x: 0, y: 0 });
    const n = normalize(v(0, 10));
    expect(n.x).toBe(0);
    expect(n.y).toBeCloseTo(1);
  });
  it("clampLength plafonne", () => {
    const c = clampLength(v(0, 10), 4);
    expect(length(c)).toBeCloseTo(4);
    expect(clampLength(v(0, 2), 4)).toEqual({ x: 0, y: 2 });
  });
});
