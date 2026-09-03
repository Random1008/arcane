import { describe, it, expect } from "vitest";
import { itemValue, sellValueOf, rareTier, generateShop, buyItem, sellWeapon, sellArmor, goldReward, bossGoldReward } from "../src/core/shop";
import { createPlayer } from "../src/core/world";
import { makeArmor } from "../src/core/armor";

describe("shop / économie", () => {
  it("itemValue croît avec le tier ; Ω plus cher ; vente < achat", () => {
    expect(itemValue("S")).toBeGreaterThan(itemValue("F"));
    expect(itemValue("S", true)).toBeGreaterThan(itemValue("S", false));
    expect(sellValueOf("S")).toBeLessThan(itemValue("S"));
  });

  it("rareTier = tier +2, plafonné à S", () => {
    expect(rareTier("F")).toBe("D");
    expect(rareTier("A")).toBe("S");
    expect(rareTier("S")).toBe("S");
  });

  it("generateShop : 6 armes fixes au tier joueur, ~6 journaliers, déterministe par jour", () => {
    const a = generateShop("C", 100);
    const b = generateShop("C", 100);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b)); // même jour → même boutique
    expect(a.fixed.length).toBe(6);
    expect(a.fixed.every((it) => it.kind === "weapon" && it.tier === "C")).toBe(true);
    expect(a.daily.length).toBe(6);
    const other = generateShop("C", 101);
    expect(JSON.stringify(other.daily)).not.toBe(JSON.stringify(a.daily)); // autre jour → reroll
    // les rares sont au tier joueur+2 (≤ S)
    for (const it of a.daily) expect(["C", rareTier("C")]).toContain(it.tier);
  });

  it("buyItem : déduit l'or + stock + ajoute à l'inventaire ; refuse sans or", () => {
    const p = createPlayer();
    const shop = generateShop("F", 1);
    const item = shop.fixed[0]; // une arme
    p.gold = 0;
    expect(buyItem(p, item)).toBe(false); // pas assez d'or
    p.gold = 1000;
    expect(buyItem(p, item)).toBe(true);
    expect(p.gold).toBe(1000 - item.price);
    expect(item.stock).toBe(0);
    expect(p.hotbar.slots.some((s) => s && s.defId === item.defId)).toBe(true);
    expect(buyItem(p, item)).toBe(false); // plus de stock
  });

  it("sellWeapon : crédite l'or et retire l'arme (jamais les Poings)", () => {
    const p = createPlayer();
    p.hotbar.slots[1] = { defId: "sword", tier: "B" };
    const g = sellWeapon(p, 1);
    expect(g).toBeGreaterThan(0);
    expect(p.gold).toBe(g);
    expect(p.hotbar.slots[1]).toBe(null);
    expect(sellWeapon(p, 0)).toBe(0); // poings non vendables
  });

  it("sellArmor : crédite l'or et retire la pièce", () => {
    const p = createPlayer();
    p.armorInv = [makeArmor(1, "casque", "heavy", "A")];
    const g = sellArmor(p, 0);
    expect(g).toBeGreaterThan(0);
    expect(p.armorInv.length).toBe(0);
  });

  it("goldReward / bossGoldReward croissent avec le rang", () => {
    expect(goldReward("S")).toBeGreaterThan(goldReward("F"));
    expect(bossGoldReward("S")).toBeGreaterThan(bossGoldReward("F"));
    expect(bossGoldReward("F")).toBeGreaterThan(goldReward("F"));
  });

  it("buyItem : barre d'inventaire pleine → échec SANS débiter l'or ni le stock", () => {
    const p = createPlayer();
    for (let i = 1; i < p.hotbar.slots.length; i++) p.hotbar.slots[i] = { defId: "sword", tier: "F" };
    const item = generateShop("F", 1).fixed[0]; // une arme
    p.gold = 1000;
    expect(buyItem(p, item)).toBe(false);
    expect(p.gold).toBe(1000); // pas de débit fantôme
    expect(item.stock).toBe(1); // stock intact
  });

  it("sellWeapon : le slot 0 est protégé même avec une arme non-Poings", () => {
    const p = createPlayer();
    p.hotbar.slots[0] = { defId: "sword", tier: "B" }; // slot 0 occupé par autre chose que des Poings
    expect(sellWeapon(p, 0)).toBe(0); // garde slot===0 indépendant du garde 'fists'
    expect(p.gold).toBe(0);
    expect(p.hotbar.slots[0]).not.toBe(null);
  });

  it("sellWeapon : vendre l'arme active replie la sélection sur les Poings (slot 0)", () => {
    const p = createPlayer();
    p.hotbar.slots[1] = { defId: "sword", tier: "B" };
    p.hotbar.activeIndex = 1;
    sellWeapon(p, 1);
    expect(p.hotbar.activeIndex).toBe(0);
  });

  it("sellArmor : une pièce de set Ω se revend plus cher qu'une armure S banale", () => {
    const p = createPlayer();
    p.armorInv = [makeArmor(1, "casque", "heavy", "S", "chaos"), makeArmor(2, "casque", "heavy", "S")];
    const omega = sellArmor(p, 0); // pièce Ω (set)
    const plain = sellArmor(p, 0); // après splice, l'index 0 est l'armure S banale
    expect(omega).toBeGreaterThan(plain);
  });
});
