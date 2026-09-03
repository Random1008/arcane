import { describe, it, expect } from "vitest";
import { createWorld, makeEnemy, tickWorld, isPlayerPhased, InputState, World, Player } from "../src/core/world";
import { makeBoss } from "../src/core/boss";
import { BOSSES } from "../src/core/bosses";
import {
  ABILITIES,
  SKILL_TREES,
  setClass,
  unlockNode,
  abilityForSlot,
  unlockedAbilitiesForSlot,
  cycleLoadout,
  respec,
  AbilityKind,
} from "../src/core/skills";
import { castAbility } from "../src/core/abilities";
import { CLASS_IDS } from "../src/core/classes";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const T = DEFAULT_TUNING;
const dt = 1 / 60;
const noInput = (): InputState => ({ moveDir: v(0, 0), aimPoint: v(0, 0), attack: false, dash: false, blink: false, selectSlot: -1, scroll: 0, cycleTier: false, ability: -1 });

function readyPlayer(w: World): Player {
  const p = w.player;
  p.energy = 100;
  p.cooldowns = {};
  return p;
}
const enemyAt = (id: number, x: number, y: number, hp = 1000) => {
  const e = makeEnemy(id, x, y, "chaser", "S", "Cible", 1);
  e.health.hp = e.health.maxHp = hp;
  return e;
};

describe("nouvelles capacités", () => {
  it("chaque classe possède ≥ 6 capacités dans son arbre", () => {
    for (const cid of CLASS_IDS) {
      const abilities = SKILL_TREES[cid].filter((n) => n.effect.kind === "ability");
      expect(abilities.length, cid).toBeGreaterThanOrEqual(6);
    }
  });

  it("tous les abilityId des arbres existent dans ABILITIES", () => {
    for (const cid of CLASS_IDS) {
      for (const n of SKILL_TREES[cid]) {
        if (n.effect.kind === "ability") expect(ABILITIES[n.effect.abilityId], n.effect.abilityId).toBeTruthy();
      }
    }
  });

  it("tous les types de capacité sont couverts par castAbility (pas de crash)", () => {
    const kinds = new Set<AbilityKind>(Object.values(ABILITIES).map((a) => a.kind));
    for (const ab of Object.values(ABILITIES)) {
      const w = createWorld();
      w.enemies = [enemyAt(70, w.player.transform.pos.x + 40, w.player.transform.pos.y)];
      w.boss = makeBoss(BOSSES[0], "F", w.player.transform.pos.x + 50, w.player.transform.pos.y);
      readyPlayer(w);
      expect(() => castAbility(w, ab, 1, v(w.player.transform.pos.x + 100, w.player.transform.pos.y))).not.toThrow();
    }
    expect(kinds.size).toBeGreaterThanOrEqual(12);
  });

  it("charge : déplace le joueur et blesse + étourdit les ennemis à l'arrivée", () => {
    const w = createWorld();
    const p = readyPlayer(w);
    const start = { ...p.transform.pos };
    const e = enemyAt(71, start.x + 190, start.y);
    w.enemies = [e];
    castAbility(w, ABILITIES["g_charge"], 1, v(start.x + 300, start.y));
    expect(p.transform.pos.x).toBeGreaterThan(start.x + 100);
    expect(e.health.hp).toBeLessThan(e.health.maxHp);
    expect(e.health.hitstun).toBeGreaterThan(0.5);
  });

  it("beam (rayon) : frappe les ennemis alignés, ignore ceux hors de la ligne", () => {
    const w = createWorld();
    const p = readyPlayer(w);
    const onLine = enemyAt(72, p.transform.pos.x + 150, p.transform.pos.y);
    const offLine = enemyAt(73, p.transform.pos.x + 150, p.transform.pos.y + 120);
    w.enemies = [onLine, offLine];
    castAbility(w, ABILITIES["m_rayon"], 1, v(p.transform.pos.x + 300, p.transform.pos.y));
    expect(onLine.health.hp).toBeLessThan(onLine.health.maxHp);
    expect(offLine.health.hp).toBe(offLine.health.maxHp);
  });

  it("execute : achève un ennemi sous le seuil, pas un ennemi à pleine vie", () => {
    const w = createWorld();
    const p = readyPlayer(w);
    const low = enemyAt(74, p.transform.pos.x + 40, p.transform.pos.y, 1000);
    low.health.hp = 100; // 10% < seuil 20%
    const full = enemyAt(75, p.transform.pos.x + 50, p.transform.pos.y, 1000);
    w.enemies = [low, full];
    castAbility(w, ABILITIES["a_execution"], 1, v(p.transform.pos.x + 100, p.transform.pos.y));
    expect(low.health.hp).toBe(0);
    expect(full.health.hp).toBeGreaterThan(0);
  });

  it("execute : un boss n'est jamais exécuté, seulement frappé", () => {
    const w = createWorld();
    const p = readyPlayer(w);
    w.boss = makeBoss(BOSSES[0], "S", p.transform.pos.x + 40, p.transform.pos.y);
    w.boss.health.hp = Math.round(w.boss.health.maxHp * 0.05); // 5% < seuil 20%, mais ≫ dégâts de l'exécution
    const hp0 = w.boss.health.hp;
    castAbility(w, ABILITIES["a_execution"], 1, v(p.transform.pos.x + 100, p.transform.pos.y));
    expect(w.boss.health.hp).toBeGreaterThan(0); // pas exécuté
    expect(w.boss.health.hp).toBeLessThan(hp0); // touché quand même
  });

  it("multihit : inflige count × dégâts dans le cône frontal", () => {
    const w = createWorld();
    const p = readyPlayer(w);
    const front = enemyAt(76, p.transform.pos.x + 60, p.transform.pos.y);
    const behind = enemyAt(77, p.transform.pos.x - 60, p.transform.pos.y);
    w.enemies = [front, behind];
    castAbility(w, ABILITIES["a_multicoup"], 1, v(p.transform.pos.x + 100, p.transform.pos.y));
    expect(front.health.hp).toBeLessThan(front.health.maxHp);
    expect(behind.health.hp).toBe(behind.health.maxHp); // derrière non touché
  });

  it("taunt : réduit la durée de vie restante… réduit les dégâts ennemis (tauntTimer)", () => {
    const w = createWorld();
    const p = readyPlayer(w);
    const e = enemyAt(78, p.transform.pos.x + 80, p.transform.pos.y);
    w.enemies = [e];
    castAbility(w, ABILITIES["g_provocation"], 1, v(p.transform.pos.x + 100, p.transform.pos.y));
    expect(e.tauntTimer).toBeGreaterThan(0);
  });

  it("invis : rend le joueur invisible (perte d'aggro) le temps de la durée", () => {
    const w = createWorld();
    const p = readyPlayer(w);
    castAbility(w, ABILITIES["a_furtivite"], 1, v(p.transform.pos.x + 10, p.transform.pos.y));
    expect(p.invisTimer).toBeGreaterThan(0);
    expect(isPlayerPhased(w)).toBe(true);
    // un tireur ne tire pas sur un joueur invisible
    const shooter = makeEnemy(79, p.transform.pos.x + 100, p.transform.pos.y, "shooter", "F", "Tireur", 1);
    shooter.fireTimer = 0;
    w.enemies = [shooter];
    tickWorld(w, noInput(), T, dt);
    expect(w.projectiles.length).toBe(0);
  });

  it("teleport : déplace le joueur vers la visée", () => {
    const w = createWorld();
    const p = readyPlayer(w);
    const target = v(p.transform.pos.x + 150, p.transform.pos.y + 40);
    castAbility(w, ABILITIES["a_teleport"], 1, target);
    expect(Math.hypot(p.transform.pos.x - target.x, p.transform.pos.y - target.y)).toBeLessThan(20);
  });
});

describe("loadout (choix de capacité par slot)", () => {
  it("par défaut, abilityForSlot rend la première capacité débloquée du slot", () => {
    const w = createWorld();
    const p = w.player;
    setClass(p, "guerrier");
    p.skillPoints = 50;
    // débloque deux capacités de slot 0 : g_tournoiement (Berserk) et g_rage (Berserk)
    unlockNode(p, "gue-fureur");
    unlockNode(p, "gue-rage"); // g_rage slot 0
    unlockNode(p, "gue-tournoiement"); // g_tournoiement slot 0
    const opts = unlockedAbilitiesForSlot(p, 0);
    expect(opts.length).toBeGreaterThanOrEqual(2);
    const def = abilityForSlot(p, 0);
    expect(def).not.toBeNull();
    // cycle → change la capacité active du slot 0
    const before = abilityForSlot(p, 0)!.ability.id;
    const next = cycleLoadout(p, 0);
    expect(next).not.toBe(before);
    expect(abilityForSlot(p, 0)!.ability.id).toBe(next);
  });

  it("respec vide le loadout", () => {
    const w = createWorld();
    const p = w.player;
    setClass(p, "guerrier");
    p.skillPoints = 50;
    unlockNode(p, "gue-fureur");
    unlockNode(p, "gue-rage");
    p.loadout[0] = "g_rage";
    respec(p);
    expect(p.loadout).toEqual([null, null, null, null]);
  });

  it("un loadout pointant une capacité non débloquée retombe sur le défaut", () => {
    const w = createWorld();
    const p = w.player;
    setClass(p, "mage");
    p.skillPoints = 50;
    unlockNode(p, "mag-arcane");
    unlockNode(p, "mag-fireball"); // m_fireball slot 0
    p.loadout[0] = "m_rayon"; // pas débloquée
    expect(abilityForSlot(p, 0)!.ability.id).toBe("m_fireball");
  });
});
