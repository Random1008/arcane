import { describe, it, expect } from "vitest";
import { createWorld } from "../src/core/world";
import { craftOmega } from "../src/core/craft";

describe("craft Ω", () => {
  it("refuse hors arme S / sans Omganium, réussit sinon, puis already-omega", () => {
    const w = createWorld();
    const p = w.player;
    p.hotbar.slots[0] = { defId: "sword", tier: "F" };
    p.hotbar.activeIndex = 0;

    expect(craftOmega(p, () => 0)).toBe("not-s");
    p.hotbar.slots[0].tier = "S";
    expect(craftOmega(p, () => 0)).toBe("no-omganium");

    p.omganium = 1;
    expect(craftOmega(p, () => 0)).toBe("ok");
    expect(p.hotbar.slots[0].omega).toBe(true);
    expect(p.hotbar.slots[0].mod).toBe("feroce"); // rng 0 → 1er mod
    expect(p.omganium).toBe(0);
    expect(p.omegaUnlocked).toBe(true); // débloque les PNJ Ω

    expect(craftOmega(p, () => 0)).toBe("already-omega");
  });

  it("renvoie no-weapon si le slot actif est vide", () => {
    const w = createWorld();
    const p = w.player;
    p.hotbar.slots[5] = null;
    p.hotbar.activeIndex = 5;
    expect(craftOmega(p, () => 0)).toBe("no-weapon");
  });
});
