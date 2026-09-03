import { describe, it, expect } from "vitest";
import { createPlayer } from "../src/core/world";
import {
  xpForNext,
  xpReward,
  bossXpReward,
  addXp,
  allocStat,
  derivePlayerMods,
  maxHpFor,
  BASE_HP,
} from "../src/core/progression";

describe("progression", () => {
  it("xpForNext est croissante", () => {
    expect(xpForNext(2)).toBeGreaterThan(xpForNext(1));
    expect(xpForNext(10)).toBeGreaterThan(xpForNext(5));
  });

  it("xpReward : boss > mob, scale par rang, dummy = 0", () => {
    expect(xpReward("chaser", "S")).toBeGreaterThan(xpReward("chaser", "F"));
    expect(xpReward("dummy", "S")).toBe(0);
    expect(bossXpReward("S")).toBeGreaterThan(xpReward("brute", "S"));
  });

  it("addXp fait monter de niveau et crédite les points", () => {
    const p = createPlayer();
    const gained = addXp(p, xpForNext(1));
    expect(gained).toBe(1);
    expect(p.level).toBe(2);
    expect(p.statPoints).toBe(3);
    expect(p.skillPoints).toBe(1);
  });

  it("addXp peut faire gagner plusieurs niveaux d'un coup", () => {
    const p = createPlayer();
    const big = xpForNext(1) + xpForNext(2) + xpForNext(3);
    const gained = addXp(p, big);
    expect(gained).toBe(3);
    expect(p.level).toBe(4);
    expect(p.statPoints).toBe(9);
  });

  it("allocStat : vitalité augmente les PV max et soigne ; refuse sans point", () => {
    const p = createPlayer();
    expect(allocStat(p, "vitality")).toBe(false); // 0 point au départ
    p.statPoints = 1;
    const before = p.health.maxHp;
    expect(allocStat(p, "vitality")).toBe(true);
    expect(p.health.maxHp).toBe(before + 12);
    expect(p.health.hp).toBe(p.health.maxHp); // soigné du gain
    expect(maxHpFor(p)).toBe(BASE_HP + 12);
  });

  it("derivePlayerMods : les stats modifient dégâts/vitesse/crit", () => {
    const p = createPlayer();
    p.stats.power = 10;
    p.stats.agility = 5;
    p.stats.precision = 4;
    const m = derivePlayerMods(p);
    expect(m.damageMul).toBeGreaterThan(1);
    expect(m.speedMul).toBeGreaterThan(1);
    expect(m.critAdd).toBeGreaterThan(0);
  });
});
