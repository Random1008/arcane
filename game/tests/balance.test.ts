import { describe, it, expect, afterEach } from "vitest";
import { BALANCE, setBalance, resetBalance } from "../src/core/balance";
import { itemValue, goldReward } from "../src/core/shop";
import { omganiumChance } from "../src/core/loot";
import { makeEnemy } from "../src/core/world";

describe("balance (réglages live)", () => {
  afterEach(resetBalance);

  it("valeurs par défaut = comportement d'origine", () => {
    expect(BALANCE.dropChance).toBe(0.35);
    expect(BALANCE.shopPriceMult).toBe(1);
    expect(BALANCE.omganiumMult).toBe(1);
    expect(itemValue("S")).toBe(300);
    expect(omganiumChance(6, "boss")).toBeCloseTo(0.3, 5);
  });

  it("setBalance est lu en direct par shop et loot", () => {
    const base = itemValue("S");
    setBalance({ shopPriceMult: 2 });
    expect(itemValue("S")).toBe(base * 2);
    setBalance({ omganiumMult: 0 });
    expect(omganiumChance(6, "boss")).toBe(0); // taux annulé
  });

  it("resetBalance restaure les défauts", () => {
    setBalance({ dropChance: 0.99, goldMult: 5 });
    resetBalance();
    expect(BALANCE.dropChance).toBe(0.35);
    expect(BALANCE.goldMult).toBe(1);
  });

  it("setBalance borne les valeurs (anti négatif/absurde) et ignore les clés inconnues", () => {
    setBalance({ enemyDamageMult: -5 });
    expect(BALANCE.enemyDamageMult).toBe(0); // pas de dégâts négatifs
    setBalance({ dropChance: 5 });
    expect(BALANCE.dropChance).toBe(1); // clampé à [0,1]
    setBalance({ inconnue: 42 } as never);
    expect((BALANCE as unknown as Record<string, number>).inconnue).toBeUndefined();
  });

  it("les multiplicateurs ennemis/or sont lus côté monde", () => {
    const baseHp = makeEnemy(1, 0, 0, "chaser", "F", "x").health.maxHp;
    const baseDmg = makeEnemy(1, 0, 0, "chaser", "F", "x").contactDamage;
    const baseGold = goldReward("F");
    setBalance({ enemyHpMult: 2, enemyDamageMult: 3, goldMult: 4 });
    expect(makeEnemy(2, 0, 0, "chaser", "F", "x").health.maxHp).toBe(baseHp * 2);
    expect(makeEnemy(2, 0, 0, "chaser", "F", "x").contactDamage).toBe(baseDmg * 3);
    expect(goldReward("F")).toBe(baseGold * 4);
  });
});
