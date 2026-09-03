import { describe, it, expect } from "vitest";
import { createWorld, createPlayer, tickWorld, InputState } from "../src/core/world";
import { CLASS_IDS, canChooseClass, CLASS_UNLOCK_LEVEL } from "../src/core/classes";
import {
  SKILL_TREES,
  ABILITIES,
  setClass,
  canUnlock,
  unlockNode,
  respec,
  rankOf,
  skillPassives,
  unlockedAbilities,
  abilityForSlot,
} from "../src/core/skills";
import { castAbility } from "../src/core/abilities";
import { applyDamage } from "../src/core/combat/damage";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const T = DEFAULT_TUNING;
const dt = 1 / 60;
const noInput = (): InputState => ({ moveDir: v(0, 0), aimPoint: v(0, 0), attack: false, dash: false, blink: false, selectSlot: -1, scroll: 0, cycleTier: false, ability: -1 });

describe("classes & arbre", () => {
  it("chaque classe a un arbre avec 3 branches, des racines et ses capacités", () => {
    for (const cid of CLASS_IDS) {
      const tree = SKILL_TREES[cid];
      expect(tree.length).toBeGreaterThan(0);
      expect(tree.some((n) => n.requires === null)).toBe(true);
      const branches = new Set(tree.map((n) => n.branch));
      expect(branches.size).toBe(3);
      expect(tree.some((n) => n.effect.kind === "ability")).toBe(true);
    }
  });

  it("les classes se débloquent au niveau 5", () => {
    expect(canChooseClass(1)).toBe(false);
    expect(canChooseClass(CLASS_UNLOCK_LEVEL - 1)).toBe(false);
    expect(canChooseClass(CLASS_UNLOCK_LEVEL)).toBe(true);
  });

  it("setClass + déblocage respectent prérequis/points/classe", () => {
    const p = createPlayer();
    expect(canUnlock(p, "gue-garde").ok).toBe(false); // pas de classe
    p.skillPoints = 10;
    setClass(p, "guerrier");
    expect(p.class).toBe("guerrier");
    expect(canUnlock(p, "gue-cuirasse").reason).toBe("locked"); // prérequis non rempli
    expect(unlockNode(p, "gue-garde")).toBe(true); // racine
    expect(rankOf(p, "gue-garde")).toBe(1);
    expect(skillPassives(p).maxHp).toBe(20);
    expect(canUnlock(p, "gue-cuirasse").ok).toBe(true); // prérequis désormais rempli
    expect(canUnlock(p, "mag-fireball").ok).toBe(false); // nœud d'une autre classe
  });

  it("respec rend les points dépensés et vide l'arbre", () => {
    const p = createPlayer();
    p.skillPoints = 10;
    setClass(p, "guerrier");
    unlockNode(p, "gue-garde");
    unlockNode(p, "gue-garde");
    const before = p.skillPoints;
    const refunded = respec(p);
    expect(refunded).toBe(2); // 2 rangs × coût 1
    expect(p.skillPoints).toBe(before + 2);
    expect(rankOf(p, "gue-garde")).toBe(0);
  });

  it("changer de classe réinitialise l'arbre (respec auto)", () => {
    const p = createPlayer();
    p.skillPoints = 10;
    setClass(p, "guerrier");
    unlockNode(p, "gue-garde");
    setClass(p, "mage");
    expect(p.class).toBe("mage");
    expect(rankOf(p, "gue-garde")).toBe(0);
  });
});

describe("capacités", () => {
  it("une capacité débloquée occupe son slot", () => {
    const p = createPlayer();
    p.skillPoints = 10;
    setClass(p, "mage");
    unlockNode(p, "mag-arcane");
    unlockNode(p, "mag-fireball");
    expect(unlockedAbilities(p).some((a) => a.ability.id === "m_fireball")).toBe(true);
    expect(abilityForSlot(p, 0)?.ability.id).toBe("m_fireball");
  });

  it("castAbility : fireball crée un projectile joueur, consomme énergie + pose cooldown", () => {
    const w = createWorld();
    const p = w.player;
    p.energy = 100;
    w.playerMods = {
      defense: 0, damageMul: 1, enemySpeedMul: 1, dodge: 0, speedMul: 1, critAdd: 0, lifesteal: 0,
      hpRegen: 0, flatResist: 0, dashCooldownMul: 1, autoBlockCooldown: 0, phase: null,
      attackSpeedMul: 1, incomingMul: 1, revive: false,
    };
    const ok = castAbility(w, ABILITIES["m_fireball"], 1, v(p.transform.pos.x + 100, p.transform.pos.y));
    expect(ok).toBe(true);
    expect(w.projectiles.some((pr) => pr.faction === "player")).toBe(true);
    expect(p.cooldowns["m_fireball"]).toBeGreaterThan(0);
    expect(p.energy).toBeLessThan(100);
  });

  it("castAbility : bloquée sans énergie ou en cooldown", () => {
    const w = createWorld();
    const p = w.player;
    p.energy = 0;
    expect(castAbility(w, ABILITIES["m_fireball"], 1, v(1, 0))).toBe(false); // pas d'énergie
    p.energy = 100;
    expect(castAbility(w, ABILITIES["m_fireball"], 1, v(1, 0))).toBe(true);
    expect(castAbility(w, ABILITIES["m_fireball"], 1, v(1, 0))).toBe(false); // cooldown
  });

  it("castAbility : bouclier pose une barrière qui encaisse avant les PV", () => {
    const w = createWorld();
    const p = w.player;
    p.energy = 100;
    castAbility(w, ABILITIES["m_bouclier"], 1, p.transform.pos);
    expect(p.health.shield).toBeGreaterThan(0);
    p.health.iframes = 0; // on ignore le flash d'invuln pour tester l'absorption
    const shield0 = p.health.shield;
    const hp0 = p.health.hp;
    applyDamage(p, 10, v(0, 0));
    expect(p.health.shield).toBe(shield0 - 10);
    expect(p.health.hp).toBe(hp0); // PV intacts tant que la barrière tient
  });

  it("castAbility : heal restaure des PV", () => {
    const w = createWorld();
    const p = w.player;
    p.energy = 100;
    p.health.hp = 50;
    castAbility(w, ABILITIES["i_heal"], 1, p.transform.pos);
    expect(p.health.hp).toBeGreaterThan(50);
  });

  it("intégration : input.ability lance la capacité débloquée via tickWorld", () => {
    const w = createWorld();
    const p = w.player;
    p.energy = 100;
    p.skillPoints = 10;
    setClass(p, "mage");
    unlockNode(p, "mag-arcane");
    unlockNode(p, "mag-fireball");
    const before = w.projectiles.length;
    tickWorld(w, { ...noInput(), ability: 0, aimPoint: v(p.transform.pos.x + 100, p.transform.pos.y) }, T, dt);
    expect(w.projectiles.length).toBeGreaterThan(before);
  });
});
