import { describe, it, expect } from "vitest";
import { createBlink, doBlink, tickBlink } from "../src/core/abilities/blink";
import { canOccupy, Level } from "../src/core/collision";
import { makeEntity } from "../src/core/entity";
import { v } from "../src/core/math/vec2";

const cfg = { range: 200, cooldown: 3, energyCost: 20 };
const open: Level = { bounds: { x: 0, y: 0, w: 1000, h: 1000 }, walls: [] };
const walled: Level = { bounds: { x: 0, y: 0, w: 1000, h: 1000 }, walls: [{ x: 120, y: 0, w: 20, h: 1000 }] };
const occ = (lvl: Level) => (p: { x: number; y: number }) => canOccupy(p, 10, lvl);

describe("blink", () => {
  it("téléporte jusqu'à la portée vers la visée", () => {
    const e = makeEntity({ id: 1, x: 100, y: 100, maxHp: 100, radius: 10, faction: "player" });
    const energy = { value: 100 };
    const b = createBlink();
    expect(doBlink(b, e, v(1000, 100), energy, cfg, occ(open))).toBe(true);
    expect(e.transform.pos.x).toBeCloseTo(300, 0);
    expect(energy.value).toBe(80);
    expect(b.cooldownLeft).toBeCloseTo(3);
  });
  it("s'arrête avant un mur", () => {
    const e = makeEntity({ id: 1, x: 100, y: 100, maxHp: 100, radius: 10, faction: "player" });
    const energy = { value: 100 };
    const b = createBlink();
    expect(doBlink(b, e, v(1000, 100), energy, cfg, occ(walled))).toBe(true);
    expect(e.transform.pos.x).toBeLessThan(120);
  });
  it("collé à un mur : ne déplace pas, ne consomme ni énergie ni cooldown", () => {
    // joueur à 1px du mur (mur en x∈[120,140]), visée dans le mur
    const e = makeEntity({ id: 1, x: 109, y: 100, maxHp: 100, radius: 10, faction: "player" });
    const energy = { value: 100 };
    const b = createBlink();
    expect(doBlink(b, e, v(1000, 100), energy, cfg, occ(walled))).toBe(false);
    expect(e.transform.pos.x).toBe(109);
    expect(energy.value).toBe(100);
    expect(b.cooldownLeft).toBe(0);
  });

  it("refuse sans énergie ou en cooldown", () => {
    const e = makeEntity({ id: 1, x: 100, y: 100, maxHp: 100, radius: 10, faction: "player" });
    const b = createBlink();
    expect(doBlink(b, e, v(200, 100), { value: 5 }, cfg, occ(open))).toBe(false);
    doBlink(b, e, v(200, 100), { value: 100 }, cfg, occ(open));
    expect(doBlink(b, e, v(200, 100), { value: 100 }, cfg, occ(open))).toBe(false);
    tickBlink(b, 3);
    expect(b.cooldownLeft).toBe(0);
  });
});
