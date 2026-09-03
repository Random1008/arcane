import { describe, it, expect } from "vitest";
import { makeArmor, makeEmptyArmor, ARMOR_SLOTS, OmegaSet, ArmorInstance, ArmorSlot } from "../src/core/armor";
import { computePlayerMods, damageReduction } from "../src/core/sets";
import { equipArmor, unequipArmor } from "../src/core/equip";
import { createWorld, makeEnemy, tickWorld, InputState } from "../src/core/world";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const T = DEFAULT_TUNING;
const dt = 1 / 60;
const noInput = (): InputState => ({ moveDir: v(0, 0), aimPoint: v(0, 0), attack: false, dash: false, blink: false, selectSlot: -1, scroll: 0, cycleTier: false, ability: -1 });

function armorOf(sets: OmegaSet[]): Record<ArmorSlot, ArmorInstance | null> {
  const a = makeEmptyArmor();
  ARMOR_SLOTS.forEach((slot, i) => {
    if (i < sets.length) a[slot] = makeArmor(i, slot, "heavy", "S", sets[i]);
  });
  return a;
}

describe("armure", () => {
  it("makeArmor : la défense monte avec le tier et le set", () => {
    expect(makeArmor(1, "casque", "heavy", "S").defense).toBeGreaterThan(makeArmor(2, "casque", "heavy", "F").defense);
    expect(makeArmor(1, "casque", "heavy", "S", "chaos").defense).toBeGreaterThan(makeArmor(2, "casque", "heavy", "S").defense);
  });

  it("computePlayerMods : aucun équipement → neutre", () => {
    const m = computePlayerMods(makeEmptyArmor());
    expect(m).toEqual({
      defense: 0, damageMul: 1, enemySpeedMul: 1, dodge: 0, speedMul: 1, critAdd: 0, lifesteal: 0,
      hpRegen: 0, flatResist: 0, dashCooldownMul: 1, autoBlockCooldown: 0, phase: null,
      attackSpeedMul: 1, incomingMul: 1, revive: false,
    });
  });

  it("type d'armure : légère plus rapide + crit, lourde plus lente", () => {
    const light = makeEmptyArmor();
    light.plastron = makeArmor(1, "plastron", "light", "F");
    const heavy = makeEmptyArmor();
    heavy.plastron = makeArmor(2, "plastron", "heavy", "F");
    const ml = computePlayerMods(light);
    const mh = computePlayerMods(heavy);
    expect(ml.speedMul).toBeGreaterThan(mh.speedMul);
    expect(ml.critAdd).toBeGreaterThan(mh.critAdd);
    expect(mh.defense).toBeGreaterThan(ml.defense); // lourde mieux protégée
  });

  it("la réduction de dégâts est plafonnée (≥30% des dégâts passent)", () => {
    expect(damageReduction(100000)).toBe(0.3);
  });

  it("set Chaos : +15% dégâts à 2 pièces, +60% à 6", () => {
    expect(computePlayerMods(armorOf(["chaos", "chaos"])).damageMul).toBeCloseTo(1.15);
    expect(computePlayerMods(armorOf(["chaos", "chaos", "chaos", "chaos", "chaos", "chaos"])).damageMul).toBeCloseTo(1.6);
  });

  it("set Temps ralentit, set Néant donne de l'esquive (à 2 pièces)", () => {
    expect(computePlayerMods(armorOf(["temps", "temps"])).enemySpeedMul).toBeCloseTo(0.9);
    expect(computePlayerMods(armorOf(["neant", "neant"])).dodge).toBeCloseTo(0.1);
  });

  it("equip/unequip déplace les pièces entre inventaire et slots", () => {
    const w = createWorld();
    const p = w.player;
    p.armorInv = [makeArmor(1, "casque", "heavy", "S", "chaos")];
    expect(equipArmor(p, 0)).toBe(true);
    expect(p.armor.casque).not.toBe(null);
    expect(p.armorInv.length).toBe(0);
    // équiper une 2e pièce du même slot renvoie l'ancienne à l'inventaire
    p.armorInv = [makeArmor(2, "casque", "light", "S")];
    equipArmor(p, 0);
    expect(p.armor.casque?.type).toBe("light");
    expect(p.armorInv.length).toBe(1);
    unequipArmor(p, "casque");
    expect(p.armor.casque).toBe(null);
    expect(p.armorInv.length).toBe(2);
  });

  it("la défense réduit les dégâts de contact subis", () => {
    const dmgTaken = (withArmor: boolean) => {
      const w = createWorld();
      const p = w.player;
      if (withArmor) p.armor.plastron = makeArmor(1, "plastron", "heavy", "S"); // pas de set → pas d'esquive
      const e = makeEnemy(950, p.transform.pos.x + 10, p.transform.pos.y, "chaser", "F", "R");
      w.enemies = [e];
      const hp0 = p.health.hp;
      tickWorld(w, noInput(), T, dt);
      return hp0 - p.health.hp;
    };
    expect(dmgTaken(true)).toBeGreaterThan(0);
    expect(dmgTaken(true)).toBeLessThan(dmgTaken(false));
  });

  it("damageReduction décroît avec la défense", () => {
    expect(damageReduction(0)).toBe(1);
    expect(damageReduction(100)).toBeCloseTo(0.5);
  });
});
