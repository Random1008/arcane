import { describe, it, expect } from "vitest";
import { nexusScaling, generateNexusHub, generateNexusRoom, clearNexusRoom, NEXUS_BOSS_CHEST_RANK, Portal, NEXUS_LEVELS } from "../src/core/nexus";
import { createPlayer, tickWorld, InputState } from "../src/core/world";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const T = DEFAULT_TUNING;
const dt = 1 / 60;
const noInput = (): InputState => ({ moveDir: v(0, 0), aimPoint: v(0, 0), attack: false, dash: false, blink: false, selectSlot: -1, scroll: 0, cycleTier: false, ability: -1 });
const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
};
const combatPortal = (level: number): Portal => ({ id: 1, pos: v(0, 0), radius: 26, kind: "combat", danger: level, open: true });
const bossPortal = (): Portal => ({ id: 1, pos: v(0, 0), radius: 26, kind: "boss", danger: 7, open: true });

describe("nexus", () => {
  it("nexusScaling : niveau 1 = 0 monstre, croît jusqu'au niveau 7 (au-delà de S)", () => {
    expect(nexusScaling(1).count).toBe(0);
    expect(nexusScaling(7).count).toBeGreaterThan(nexusScaling(2).count);
    expect(nexusScaling(7).hpMult).toBeGreaterThan(nexusScaling(1).hpMult);
    expect(nexusScaling(7).hpMult).toBeGreaterThan(6.0); // au-delà du rang S
    expect(nexusScaling(7).dmgMult).toBeGreaterThan(nexusScaling(2).dmgMult);
  });

  it("le hub a 8 portails : 7 combat (niveaux 1..7) + 1 boss", () => {
    const w = generateNexusHub(createPlayer(), lcg(3));
    expect(w.portals.length).toBe(8);
    expect(w.portals.every((p) => p.open)).toBe(true);
    expect(w.portals.filter((p) => p.kind === "boss").length).toBe(1);
    const combat = w.portals.filter((p) => p.kind === "combat");
    expect(combat.length).toBe(7);
    expect(combat.map((p) => p.danger).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(w.enemies.length).toBe(0);
  });

  it("salle niveau 1 = vide (retour direct) ; niveau 7 = beaucoup d'ennemis plus coriaces", () => {
    const n1 = generateNexusRoom(createPlayer(), combatPortal(1), lcg(2));
    expect(n1.enemies.length).toBe(0);
    expect(n1.portals.find((p) => p.kind === "return")?.open).toBe(false);
    const n7 = generateNexusRoom(createPlayer(), combatPortal(7), lcg(2));
    expect(n7.enemies.length).toBeGreaterThan(0);
    const n2 = generateNexusRoom(createPlayer(), combatPortal(2), lcg(2));
    expect(n7.enemies[0].health.maxHp).toBeGreaterThan(n2.enemies[0].health.maxHp);
  });

  it("portail boss → mini-boss", () => {
    const w = generateNexusRoom(createPlayer(), bossPortal(), lcg(1));
    expect(w.boss).not.toBe(null);
  });

  it("marcher sur un portail ouvert fixe portalReached", () => {
    const w = generateNexusHub(createPlayer(), lcg(4));
    w.godMode = true;
    const portal = w.portals[0];
    w.player.transform.pos = { x: portal.pos.x, y: portal.pos.y };
    tickWorld(w, noInput(), T, dt);
    expect(w.portalReached).toBe(portal.id);
  });

  it("NEXUS_LEVELS = 7", () => {
    expect(NEXUS_LEVELS).toBe(7);
  });

  it("clearNexusRoom : salle niveau 1 (vide) → ouvre le portail de retour direct, idempotent", () => {
    const w = generateNexusRoom(createPlayer(), combatPortal(1), lcg(2));
    expect(w.enemies.length).toBe(0);
    expect(clearNexusRoom(w, false, false)).toBe(true);
    expect(w.portals.find((p) => p.kind === "return")?.open).toBe(true);
    expect(clearNexusRoom(w, false, false)).toBe(false); // déjà ouvert
  });

  it("clearNexusRoom : salle avec ennemis ne s'ouvre qu'une fois vidée (combat = pas de coffre)", () => {
    const w = generateNexusRoom(createPlayer(), combatPortal(7), lcg(2));
    expect(w.enemies.length).toBeGreaterThan(0);
    expect(clearNexusRoom(w, false, false)).toBe(false);
    w.enemies = [];
    expect(clearNexusRoom(w, false, false)).toBe(true);
    expect(w.chests.length).toBe(0);
  });

  it("clearNexusRoom : salle de boss nettoyée → coffre garanti au bon rang", () => {
    const w = generateNexusRoom(createPlayer(), bossPortal(), lcg(1));
    w.boss = null; // boss vaincu
    expect(clearNexusRoom(w, false, true)).toBe(true);
    expect(w.chests.length).toBe(1);
    expect(w.chests[0].rank).toBe(NEXUS_BOSS_CHEST_RANK);
  });

  it("clearNexusRoom : le hub n'est jamais clôturé", () => {
    const w = generateNexusHub(createPlayer(), lcg(3));
    expect(clearNexusRoom(w, true, false)).toBe(false);
  });
});
