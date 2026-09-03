import { describe, it, expect } from "vitest";
import { chaserMoveDir } from "../src/core/ai/chaser";
import { v } from "../src/core/math/vec2";

describe("chaser", () => {
  it("renvoie une direction normalisée vers la cible", () => {
    const dir = chaserMoveDir(v(0, 0), v(0, 10));
    expect(dir.x).toBe(0);
    expect(dir.y).toBeCloseTo(1);
  });
  it("vecteur nul si superposé", () => {
    expect(chaserMoveDir(v(5, 5), v(5, 5))).toEqual({ x: 0, y: 0 });
  });
});
