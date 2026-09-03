import { describe, it, expect } from "vitest";
import {
  makeArmor,
  makeEmptyArmor,
  makeUniqueArmor,
  uniqueArmorDef,
  tierArmorEffects,
  UNIQUE_ARMORS,
  ARMOR_SLOTS,
  ArmorSlot,
  ArmorInstance,
} from "../src/core/armor";
import { computePlayerMods, incomingDamageFactor, damageReduction, FLAT_RESIST_CAP } from "../src/core/sets";
import { createWorld, tickWorld, hurtPlayer, isPlayerPhased, InputState } from "../src/core/world";
import { makeBoss } from "../src/core/boss";
import { BOSSES } from "../src/core/bosses";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const T = DEFAULT_TUNING;
const dt = 1 / 60;
const noInput = (over: Partial<InputState> = {}): InputState => ({
  moveDir: v(0, 0),
  aimPoint: v(0, 0),
  attack: false,
  dash: false,
  blink: false,
  selectSlot: -1,
  scroll: 0,
  cycleTier: false,
  ability: -1,
  ...over,
});

function worldWith(...pieces: ArmorInstance[]) {
  const w = createWorld();
  w.enemies = [];
  w.pickups = [];
  w.rng = () => 0.99;
  for (const a of pieces) w.player.armor[a.slot] = a;
  tickWorld(w, noInput(), T, dt); // recalcule playerMods
  return w;
}

describe("effets d'armure par tier", () => {
  it("F : défense seule · E+ : résistance · D+ : regen · B+ : dégâts", () => {
    expect(tierArmorEffects("F", "medium")).toEqual([]);
    expect(tierArmorEffects("E", "medium").some((e) => e.kind === "resist")).toBe(true);
    expect(tierArmorEffects("D", "medium").some((e) => e.kind === "hpRegen")).toBe(true);
    expect(tierArmorEffects("B", "medium").some((e) => e.kind === "damageBonus")).toBe(true);
    expect(tierArmorEffects("A", "medium").length).toBeGreaterThan(tierArmorEffects("D", "medium").length);
  });

  it("C : bonus selon le type (légère vitesse, moyenne crit, lourde résistance)", () => {
    expect(tierArmorEffects("C", "light").some((e) => e.kind === "speedBonus")).toBe(true);
    expect(tierArmorEffects("C", "medium").filter((e) => e.kind === "critBonus").length).toBe(1);
    expect(tierArmorEffects("C", "heavy").filter((e) => e.kind === "resist").length).toBe(2);
  });

  it("les pièces de set Ω ne portent pas d'effets de tier (bonus de set uniquement)", () => {
    expect(makeArmor(1, "casque", "heavy", "S", "chaos").effects).toEqual([]);
    expect(makeArmor(2, "casque", "heavy", "S").effects!.length).toBeGreaterThan(0);
  });

  it("computePlayerMods agrège résistance/regen/dégâts, résistance plafonnée", () => {
    const armor = makeEmptyArmor();
    for (const slot of ARMOR_SLOTS) armor[slot] = makeArmor(1, slot, "heavy", "S");
    const m = computePlayerMods(armor);
    expect(m.flatResist).toBeGreaterThan(0.2); // 6 pièces S lourdes
    expect(m.flatResist).toBeLessThanOrEqual(FLAT_RESIST_CAP);
    expect(m.hpRegen).toBeCloseTo(0.9 * 6);
    expect(m.damageMul).toBeCloseTo(1 + 0.04 * 6);
    // facteur entrant = défense × (1 − résistance)
    expect(incomingDamageFactor(m)).toBeCloseTo(damageReduction(m.defense) * (1 - m.flatResist), 5);
  });
});

describe("pièces uniques S", () => {
  it("7 uniques, slots valides, fabrication OK", () => {
    expect(UNIQUE_ARMORS.length).toBe(7);
    const slots = new Set<ArmorSlot>(UNIQUE_ARMORS.map((u) => u.slot));
    for (const s of slots) expect(ARMOR_SLOTS).toContain(s);
    for (const u of UNIQUE_ARMORS) {
      const a = makeUniqueArmor(1, u);
      expect(a.tier).toBe("S");
      expect(a.name).toBe(u.name);
      expect(a.unique).toBe(u.uid);
      expect(a.defense).toBeGreaterThan(0);
      expect(a.effects!.length).toBeGreaterThan(0);
    }
    expect(uniqueArmorDef("casque_absolu")?.name).toBe("Casque absolu");
  });

  it("Armure dimensionnelle : réduit fortement les dégâts subis", () => {
    const w = worldWith(makeUniqueArmor(1, uniqueArmorDef("armure_dimensionnelle")!));
    const hp0 = w.player.health.hp;
    hurtPlayer(w, 40, v(0, 0));
    const taken = hp0 - w.player.health.hp;
    expect(taken).toBeLessThan(40 * damageReduction(w.playerMods.defense)); // résistance plate en plus de la défense
  });

  it("Bouclier éternel : bloque 1 attaque, puis recharge", () => {
    const w = worldWith(makeUniqueArmor(1, uniqueArmorDef("bouclier_eternel")!));
    const hp0 = w.player.health.hp;
    expect(hurtPlayer(w, 30, v(0, 0))).toBe(false); // bloqué
    expect(w.player.health.hp).toBe(hp0);
    w.player.health.iframes = 0;
    expect(hurtPlayer(w, 30, v(0, 0))).toBe(true); // recharge en cours → touche
    expect(w.player.health.hp).toBeLessThan(hp0);
    // après la recharge (4 s), bloque de nouveau
    for (let i = 0; i < 250; i++) tickWorld(w, noInput(), T, dt);
    w.player.health.iframes = 0;
    const hp1 = w.player.health.hp;
    expect(hurtPlayer(w, 30, v(0, 0))).toBe(false);
    expect(w.player.health.hp).toBe(hp1);
  });

  it("Cape infinie : fenêtre d'invisibilité cyclique, les attaques ratent et les ennemis ne tirent plus", () => {
    const w = worldWith(makeUniqueArmor(1, uniqueArmorDef("cape_infinie")!));
    w.playerMods.dodge = 0; // isole l'invisibilité de l'esquive de la cape
    // avance jusqu'à la fenêtre d'invisibilité (fin du cycle de 8 s : invisible à partir de 6.5 s)
    let sawPhase = false;
    for (let i = 0; i < 60 * 9; i++) {
      tickWorld(w, noInput(), T, dt);
      if (isPlayerPhased(w)) {
        sawPhase = true;
        break;
      }
    }
    expect(sawPhase).toBe(true);
    w.playerMods.dodge = 0;
    expect(hurtPlayer(w, 30, v(0, 0))).toBe(false); // intouchable
  });

  it("Bottes temporelles : la recharge du dash est accélérée", () => {
    const w = worldWith(makeUniqueArmor(1, uniqueArmorDef("bottes_temporelles")!));
    expect(w.playerMods.dashCooldownMul).toBeCloseTo(0.4);
    // dash → la recharge démarre à cooldown × 0.4
    tickWorld(w, noInput({ dash: true, moveDir: v(1, 0) }), T, dt);
    let frames = 0;
    while (w.player.dash.phase !== "ready" && frames < 600) {
      tickWorld(w, noInput(), T, dt);
      frames++;
    }
    // base : 0.18s de dash + 0.8s de recharge ≈ 59 frames ; boosté : 0.18 + 0.32 ≈ 30 frames
    expect(frames).toBeLessThan(45);
  });

  it("Casque absolu et Gants cosmiques : bonus de crit cumulés", () => {
    const w = worldWith(
      makeUniqueArmor(1, uniqueArmorDef("casque_absolu")!),
      makeUniqueArmor(2, uniqueArmorDef("gants_cosmiques")!),
    );
    expect(w.playerMods.critAdd).toBeGreaterThanOrEqual(0.4); // 0.25 + 0.15 (+ critMod des types)
  });

  it("Armure chaos : régénère pendant le tick", () => {
    const w = worldWith(makeUniqueArmor(1, uniqueArmorDef("armure_chaos")!));
    w.player.health.hp = 40;
    for (let i = 0; i < 60; i++) tickWorld(w, noInput(), T, dt);
    expect(w.player.health.hp).toBeGreaterThan(41.5); // ~2 PV/s
  });

  it("un boss de rang S lâche une pièce unique (50%)", () => {
    const w = createWorld();
    w.enemies = [];
    w.rng = () => 0.3; // < 0.5 → unique garantie ; choisit aussi set/slot/type/unique
    w.boss = makeBoss(BOSSES[0], "S", 600, 300);
    w.boss.health.hp = 0;
    tickWorld(w, noInput(), T, dt);
    expect(w.player.armorInv.some((a) => a.unique)).toBe(true);
    expect(w.player.armorInv.some((a) => a.set)).toBe(true); // la pièce de set Ω tombe toujours
  });

  it("un boss de rang A ne lâche pas d'unique", () => {
    const w = createWorld();
    w.enemies = [];
    w.rng = () => 0.3;
    w.boss = makeBoss(BOSSES[0], "A", 600, 300);
    w.boss.health.hp = 0;
    tickWorld(w, noInput(), T, dt);
    expect(w.player.armorInv.some((a) => a.unique)).toBe(false);
  });
});
