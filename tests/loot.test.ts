import { describe, it, expect } from "vitest";
import { rollRarity, isRare, rarityToWeaponTier, RARITIES, omganiumChance } from "../src/core/loot";

describe("loot", () => {
  it("rng bas → rareté commune (F) ; rng haut → rareté élevée", () => {
    expect(rollRarity(() => 0, 0, 0)).toBe("F");
    expect(RARITIES.indexOf(rollRarity(() => 0.9999, 0, 0))).toBeGreaterThan(3);
  });
  it("un biais de rang élevé décale la distribution vers le haut", () => {
    // au même rng médian, un biome de haut rang donne (en moyenne) mieux : on teste un point bas
    const lowBias = rollRarity(() => 0.5, 0, 0);
    const highBias = rollRarity(() => 0.5, 6, 0);
    expect(RARITIES.indexOf(highBias)).toBeGreaterThanOrEqual(RARITIES.indexOf(lowBias));
  });
  it("Ω est atteignable au rng max", () => {
    expect(rollRarity(() => 0.999999, 6, 20)).toBe("omega");
  });
  it("isRare : A/S/Ω rares, le reste non", () => {
    expect(isRare("A")).toBe(true);
    expect(isRare("S")).toBe(true);
    expect(isRare("omega")).toBe(true);
    expect(isRare("F")).toBe(false);
    expect(isRare("C")).toBe(false);
  });
  it("rarityToWeaponTier : Ω → S + omega", () => {
    expect(rarityToWeaponTier("omega")).toEqual({ tier: "S", omega: true });
    expect(rarityToWeaponTier("B")).toEqual({ tier: "B", omega: false });
  });

  it("omganiumChance : impossible avant le rang A, puis croissant et plus fréquent sur boss", () => {
    expect(omganiumChance(4, "boss")).toBe(0); // rang B : impossible
    expect(omganiumChance(4, "enemy")).toBe(0);
    expect(omganiumChance(5, "boss")).toBeGreaterThan(0); // rang A : possible
    expect(omganiumChance(5, "enemy")).toBeGreaterThan(0);
    expect(omganiumChance(5, "enemy")).toBeLessThan(0.05); // ennemi : très rare
    expect(omganiumChance(6, "enemy")).toBeGreaterThan(omganiumChance(5, "enemy")); // monte avec le rang
    expect(omganiumChance(6, "boss")).toBeGreaterThan(omganiumChance(6, "enemy")); // boss > ennemi
    expect(omganiumChance(6, "boss")).toBeCloseTo(0.3, 5); // S boss = 30%
    expect(omganiumChance(6, "chest")).toBeCloseTo(0.27, 5); // S coffre = 27%
    expect(omganiumChance(99, "chest")).toBe(omganiumChance(6, "chest")); // biasLevel clampé à 6 (rang S)
  });
});
