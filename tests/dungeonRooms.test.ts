import { describe, it, expect } from "vitest";
import { generateDungeon, generateRoomWorld, roomById, puzzleResolved, isPuzzleRoom, Dungeon } from "../src/core/dungeon";
import { getDungeonMod } from "../src/core/dungeonMods";
import { getBiome } from "../src/core/biomes";
import { createPlayer, tickWorld, InputState } from "../src/core/world";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const T = DEFAULT_TUNING;
const dt = 1 / 60;
const noInput = (): InputState => ({ moveDir: v(0, 0), aimPoint: v(0, 0), attack: false, dash: false, blink: false, selectSlot: -1, scroll: 0, cycleTier: false, ability: -1 });

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function findRoomOfKind(d: Dungeon, kind: string): number {
  const r = d.rooms.find((x) => x.kind === kind);
  return r ? r.id : -1;
}

describe("dungeon puzzle/trap + mods (tranche L)", () => {
  it("chaque donjon a une salle puzzle (normal → transformée) et un modId défini", () => {
    for (let s = 1; s <= 15; s++) {
      const d = generateDungeon(getBiome("forest"), lcg(s));
      const pid = findRoomOfKind(d, "puzzle");
      expect(pid).toBeGreaterThanOrEqual(0); // forêt = 5+ salles, assez pour une antichambre
      // pas de collision de kinds : le boss reste unique et la puzzle n'est ni start ni boss
      expect(d.rooms.filter((r) => r.kind === "boss").length).toBe(1);
      const pr = roomById(d, pid);
      expect(pr.kind).toBe("puzzle");
      expect(pr.id).not.toBe(d.startId);
      expect(pr.id).not.toBe(d.bossId);
      // modId : null ou un mod connu
      expect(d.modId === null || getDungeonMod(d.modId) !== null).toBe(true);
    }
  });

  it("donjons à ≥6 salles ont aussi une salle trap", () => {
    let found = false;
    for (let s = 1; s <= 20 && !found; s++) {
      const d = generateDungeon(getBiome("void_rift"), lcg(s)); // 9 salles
      found = findRoomOfKind(d, "trap") >= 0;
    }
    expect(found).toBe(true);
  });

  it("salle puzzle : pas d'ennemis, N plaques inactives, portes fermées", () => {
    const d = generateDungeon(getBiome("ruins"), lcg(4)); // tier C → 3 plaques max
    const pid = findRoomOfKind(d, "puzzle");
    expect(pid).toBeGreaterThanOrEqual(0);
    const room = roomById(d, pid);
    const w = generateRoomWorld(createPlayer(), getBiome("ruins"), room, lcg(3), d.modId);
    expect(w.enemies.length).toBe(0);
    expect(w.plates.length).toBeGreaterThanOrEqual(2);
    expect(w.plates.every((p) => p.active === false)).toBe(true);
    expect(w.doors.every((dr) => dr.open === false)).toBe(true);
    expect(puzzleResolved(w.plates)).toBe(false);
    expect(isPuzzleRoom(room)).toBe(true);
  });

  it("marcher sur toutes les plaques les active → puzzle résolu", () => {
    const d = generateDungeon(getBiome("ruins"), lcg(4));
    const pid = findRoomOfKind(d, "puzzle");
    const room = roomById(d, pid);
    const w = generateRoomWorld(createPlayer(), getBiome("ruins"), room, lcg(3), d.modId);
    w.godMode = true; // pas de combat parasite
    for (const pl of w.plates) {
      w.player.transform.pos = { x: pl.x, y: pl.y };
      tickWorld(w, noInput(), T, dt);
    }
    expect(w.plates.every((p) => p.active)).toBe(true);
    expect(puzzleResolved(w.plates)).toBe(true);
  });

  it("salle trap : ennemis présents + pièges au sol ; la résolution reste par combat", () => {
    let d: Dungeon | null = null;
    let tid = -1;
    for (let s = 1; s <= 25 && tid < 0; s++) {
      d = generateDungeon(getBiome("void_rift"), lcg(s));
      tid = findRoomOfKind(d, "trap");
    }
    expect(tid).toBeGreaterThanOrEqual(0);
    const room = roomById(d!, tid);
    const w = generateRoomWorld(createPlayer(), getBiome("void_rift"), room, lcg(3), d!.modId);
    expect(w.enemies.length).toBeGreaterThan(0);
    expect(w.roomTraps.length).toBeGreaterThanOrEqual(3);
  });

  it("le modificateur maudit augmente les PV des ennemis (×1.5)", () => {
    let d: Dungeon | null = null;
    for (let s = 1; s <= 30 && !d; s++) {
      const cand = generateDungeon(getBiome("forest"), lcg(s));
      if (cand.modId === "maudit") d = cand;
    }
    expect(d).not.toBeNull();
    // la salle de départ a toujours des ennemis (quelle que soit la transformation des autres salles)
    const room = roomById(d!, d!.startId);
    const withMod = generateRoomWorld(createPlayer(), getBiome("forest"), room, lcg(3), "maudit");
    const withoutMod = generateRoomWorld(createPlayer(), getBiome("forest"), room, lcg(3), null);
    expect(withMod.enemies.length).toBeGreaterThan(0);
    expect(withoutMod.enemies.length).toBeGreaterThan(0);
    expect(withMod.enemies[0].health.maxHp).toBeGreaterThan(withoutMod.enemies[0].health.maxHp);
  });

  it("le drain du mod corrompu blesse le joueur sur la durée", () => {
    const d = generateDungeon(getBiome("void_rift"), lcg(6));
    const start = roomById(d, d.startId);
    const w = generateRoomWorld(createPlayer(), getBiome("void_rift"), start, lcg(3), "corrompu");
    w.godMode = false;
    const hp0 = w.player.health.hp;
    // retire les ennemis pour mesurer uniquement le drain
    w.enemies = [];
    for (let i = 0; i < 120; i++) tickWorld(w, noInput(), T, dt); // 2 s
    expect(w.player.health.hp).toBeLessThan(hp0);
    expect(w.player.health.hp).toBeGreaterThan(0);
  });
});
