import { describe, it, expect } from "vitest";
import { FixedStep } from "../src/core/time/fixedStep";

describe("FixedStep (step=0.1s)", () => {
  it("accumule et rend le bon nombre de ticks", () => {
    const fs = new FixedStep(0.1);
    expect(fs.advance(0.05)).toBe(0);
    expect(fs.advance(0.06)).toBe(1);
    expect(fs.advance(0.3)).toBe(3);
  });
  it("plafonne pour éviter la spirale de la mort", () => {
    const fs = new FixedStep(0.1, 5);
    expect(fs.advance(100)).toBe(5);
  });
});
