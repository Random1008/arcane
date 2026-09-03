import { describe, it, expect } from "vitest";
import { giveGold, giveOmganium, giveStatPoints, giveSkillPoints, grantLevels, unlockAllSkills, healFull } from "../src/core/admin";
import { createPlayer } from "../src/core/world";
import { setClass, respec, SKILL_TREES } from "../src/core/skills";
import { maxHpFor } from "../src/core/progression";

describe("admin / outils dev", () => {
  it("giveGold / giveOmganium ajoutent", () => {
    const p = createPlayer();
    giveGold(p, 250);
    giveGold(p, 50);
    giveOmganium(p, 10);
    giveOmganium(p, 5);
    expect(p.gold).toBe(300);
    expect(p.omganium).toBe(15);
  });

  it("grantLevels fait gagner des niveaux + crédite les points", () => {
    const p = createPlayer();
    const lvl0 = p.level;
    grantLevels(p, 3);
    expect(p.level).toBe(lvl0 + 3);
    expect(p.statPoints).toBe(9); // 3 pts/niveau
    expect(p.skillPoints).toBe(3); // 1 pt/niveau
  });

  it("grantLevels conserve la progression XP partielle", () => {
    const p = createPlayer();
    p.xp = 20; // déjà entamé vers le niveau suivant
    grantLevels(p, 2);
    expect(p.level).toBe(3);
    expect(p.xp).toBe(20); // reste d'XP conservé, pas remis à 0
  });

  it("giveStatPoints / giveSkillPoints ajoutent", () => {
    const p = createPlayer();
    giveStatPoints(p, 5);
    giveSkillPoints(p, 2);
    expect(p.statPoints).toBe(5);
    expect(p.skillPoints).toBe(2);
  });

  it("unlockAllSkills : no-op sans classe ; tout au max + comptabilité cohérente avec respec", () => {
    const p = createPlayer();
    unlockAllSkills(p); // pas de classe → rien
    expect(Object.keys(p.skills).length).toBe(0);
    setClass(p, "guerrier");
    p.skillPoints = 0;
    unlockAllSkills(p);
    expect(SKILL_TREES.guerrier.every((n) => p.skills[n.id] === n.maxRank)).toBe(true);
    expect(p.skillPoints).toBe(0); // points crédités puis dépensés → solde inchangé
    const refunded = respec(p);
    expect(refunded).toBeGreaterThan(0);
    expect(p.skillPoints).toBe(refunded); // respec rembourse exactement l'investi (pas de points fantômes)
  });

  it("healFull recalcule maxHp puis restaure PV et énergie", () => {
    const p = createPlayer();
    p.stats.vitality = 5; // maxHp doit monter au-dessus de la base
    p.health.hp = 1;
    p.energy = 0;
    healFull(p, 100);
    expect(p.health.maxHp).toBe(maxHpFor(p)); // échoue si la ligne de recalcul est omise
    expect(p.health.maxHp).toBeGreaterThan(100);
    expect(p.health.hp).toBe(p.health.maxHp);
    expect(p.energy).toBe(100);
  });
});
