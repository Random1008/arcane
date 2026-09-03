import { describe, it, expect } from "vitest";
import {
  NAMED_WEAPONS,
  namedWeapon,
  getWeaponDefEx,
  weaponEffects,
  familyOf,
  weaponsOfTier,
  randomWeaponIdOfTier,
} from "../src/core/combat/catalog";
import { TIERS, getWeaponDef, WEAPONS, FAMILY_WEAPONS } from "../src/core/combat/weapons";

describe("catalogue d'armes nommées", () => {
  it("contient 105 armes nommées (15/tier) + 5 armes Ω uniques = 110, ids uniques", () => {
    expect(NAMED_WEAPONS.length).toBe(110); // 105 normales + 5 Ω uniques (endgame)
    expect(NAMED_WEAPONS.filter((n) => !n.ultimate).length).toBe(105);
    expect(NAMED_WEAPONS.filter((n) => n.ultimate).length).toBe(5);
    for (const t of TIERS) expect(weaponsOfTier(t).length).toBe(15); // pool de tirage : hors Ω uniques
    expect(new Set(NAMED_WEAPONS.map((n) => n.id)).size).toBe(110);
  });

  it("chaque arme référence une famille de base valide", () => {
    const families = new Set([...WEAPONS, ...FAMILY_WEAPONS].map((w) => w.id));
    for (const n of NAMED_WEAPONS) expect(families.has(n.family), `${n.id} → famille ${n.family}`).toBe(true);
  });

  it("résout les stats : base de famille + modificateurs", () => {
    const sword = getWeaponDef("sword");
    const rouillee = getWeaponDefEx("epee_rouillee"); // atkMul 0.8
    expect(rouillee.atk).toBeCloseTo(sword.atk * 0.8);
    expect(rouillee.name).toBe("Épée rouillée");
    expect(rouillee.category).toBe("melee");
    // crit additif plafonné à 1 (Dague parfaite : crit garanti)
    expect(getWeaponDefEx("dague_parfaite").critChance).toBe(1);
    // arme à distance : famille arbalète
    expect(getWeaponDefEx("arbalete_simple").category).toBe("ranged");
    expect(getWeaponDefEx("arbalete_simple").projectileSpeed).toBeGreaterThan(0);
  });

  it("toutes les armes du catalogue se résolvent avec des stats saines", () => {
    for (const n of NAMED_WEAPONS) {
      const d = getWeaponDefEx(n.id);
      expect(d.atk, n.id).toBeGreaterThan(0);
      expect(d.attackSpeed, n.id).toBeGreaterThan(0);
      expect(d.critChance, n.id).toBeGreaterThanOrEqual(0);
      expect(d.critChance, n.id).toBeLessThanOrEqual(1);
      if (d.category === "melee") expect(d.range, n.id).toBeGreaterThan(0);
      else expect(d.projectileSpeed, n.id).toBeGreaterThan(0);
    }
  });

  it("getWeaponDefEx reste compatible avec les ids historiques", () => {
    expect(getWeaponDefEx("sword").name).toBe("Épée");
    expect(getWeaponDefEx("fists").name).toBe("Poings");
    expect(() => getWeaponDefEx("inconnue")).toThrow();
  });

  it("expose les effets (et [] pour les armes génériques)", () => {
    expect(weaponEffects("epee_feu").some((e) => e.kind === "burn")).toBe(true);
    expect(weaponEffects("dague_du_temps").some((e) => e.kind === "critStun")).toBe(true);
    expect(weaponEffects("sword")).toEqual([]);
    expect(weaponEffects("fists")).toEqual([]);
  });

  it("familyOf : catalogue → famille, ids historiques → eux-mêmes", () => {
    expect(familyOf("katana_des_dieux")).toBe("katana");
    expect(familyOf("sword")).toBe("sword");
  });

  it("randomWeaponIdOfTier tire une arme du bon tier", () => {
    for (const t of TIERS) {
      const id = randomWeaponIdOfTier(t, () => 0.42);
      expect(namedWeapon(id)?.tier).toBe(t);
    }
  });
});
