import { describe, it, expect } from "vitest";
import { createHotbar, selectSlot, scrollSlot, activeWeapon, cycleTier, addWeapon } from "../src/core/combat/hotbar";

describe("hotbar", () => {
  it("createHotbar : 9 slots, remplis depuis la liste fournie, actif 0", () => {
    const h = createHotbar(["sword", "bow"]);
    expect(h.slots.length).toBe(9);
    expect(h.activeIndex).toBe(0);
    expect(activeWeapon(h)?.defId).toBe("sword");
    expect(h.slots[1]?.defId).toBe("bow");
    expect(h.slots[2]).toBe(null);
  });
  it("selectSlot borne l'index", () => {
    const h = createHotbar(["sword"]);
    selectSlot(h, 3);
    expect(h.activeIndex).toBe(3);
    selectSlot(h, 99);
    expect(h.activeIndex).toBe(3);
    selectSlot(h, -5);
    expect(h.activeIndex).toBe(3);
  });
  it("scrollSlot boucle sur les 9 slots", () => {
    const h = createHotbar(["sword"]);
    scrollSlot(h, -1);
    expect(h.activeIndex).toBe(8);
    scrollSlot(h, 1);
    expect(h.activeIndex).toBe(0);
  });
  it("activeWeapon = null si slot vide", () => {
    const h = createHotbar(["sword"]);
    selectSlot(h, 5);
    expect(activeWeapon(h)).toBe(null);
  });
  it("addWeapon remplit le premier slot libre, -1 si plein", () => {
    const h = createHotbar(["fists"]); // slot 0 occupé
    expect(addWeapon(h, { defId: "sword", tier: "F" })).toBe(1);
    expect(h.slots[1]?.defId).toBe("sword");
    expect(addWeapon(h, { defId: "bow", tier: "F" })).toBe(2);
    // remplir le reste
    for (let i = 3; i < 9; i++) addWeapon(h, { defId: "axe", tier: "F" });
    expect(addWeapon(h, { defId: "staff", tier: "F" })).toBe(-1);
  });

  it("cycleTier boucle F→…→S→F sur l'arme active, no-op si vide", () => {
    const h = createHotbar(["sword"]);
    expect(activeWeapon(h)?.tier).toBe("F");
    cycleTier(h);
    expect(activeWeapon(h)?.tier).toBe("E");
    for (let i = 0; i < 6; i++) cycleTier(h); // E→D→C→B→A→S→F (boucle complète)
    expect(activeWeapon(h)?.tier).toBe("F");
    selectSlot(h, 8);
    expect(() => cycleTier(h)).not.toThrow();
  });

  it("cycleTier retire l'état Ω (pas d'arme Ω hors tier S permanente)", () => {
    const h = createHotbar(["sword"]);
    const w = activeWeapon(h)!;
    w.tier = "S";
    w.omega = true;
    w.mod = "feroce";
    cycleTier(h);
    expect(w.omega).toBe(false);
    expect(w.mod).toBe("none");
  });
});
