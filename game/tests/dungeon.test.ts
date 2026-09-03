import { describe, it, expect } from "vitest";
import { generateDungeon, generateRoomWorld, opposite, roomById, Dungeon } from "../src/core/dungeon";
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

function reachableCount(d: Dungeon): number {
  const seen = new Set([d.startId]);
  const q = [d.startId];
  while (q.length) {
    const id = q.shift()!;
    for (const door of roomById(d, id).doors) {
      if (!seen.has(door.to)) {
        seen.add(door.to);
        q.push(door.to);
      }
    }
  }
  return seen.size;
}

describe("dungeon", () => {
  it("graphe connexe, 1 start, 1 boss (le plus profond), portes réciproques", () => {
    const d = generateDungeon(getBiome("plains"), lcg(5));
    expect(reachableCount(d)).toBe(d.rooms.length); // connexe
    expect(d.rooms.filter((r) => r.kind === "start").length).toBe(1);
    const bosses = d.rooms.filter((r) => r.kind === "boss");
    expect(bosses.length).toBe(1);
    expect(bosses[0].id).toBe(d.bossId);
    expect(bosses[0].depth).toBe(Math.max(...d.rooms.map((r) => r.depth)));
    for (const r of d.rooms) {
      for (const door of r.doors) {
        const other = roomById(d, door.to);
        expect(other.doors.some((x) => x.to === r.id && x.dir === opposite(door.dir))).toBe(true);
      }
    }
  });

  it("nombre de salles scalé par rang (F=5, S=9)", () => {
    expect(generateDungeon(getBiome("plains"), lcg(1)).rooms.length).toBe(5);
    expect(generateDungeon(getBiome("void_rift"), lcg(1)).rooms.length).toBe(9);
  });

  it("génère des embranchements (au moins une salle trésor sur quelques seeds)", () => {
    let found = false;
    for (let s = 1; s < 20 && !found; s++) {
      found = generateDungeon(getBiome("forest"), lcg(s)).rooms.some((r) => r.kind === "treasure");
    }
    expect(found).toBe(true);
  });

  it("salle trésor : 0 ennemi + 1 coffre, portes fermées au départ", () => {
    let dgn: Dungeon | null = null;
    let treasureId = -1;
    for (let s = 1; s < 20 && treasureId < 0; s++) {
      dgn = generateDungeon(getBiome("forest"), lcg(s));
      treasureId = dgn.rooms.find((r) => r.kind === "treasure")?.id ?? -1;
    }
    expect(treasureId).toBeGreaterThanOrEqual(0);
    const room = roomById(dgn!, treasureId);
    const w = generateRoomWorld(createPlayer(), getBiome("forest"), room, lcg(3));
    expect(w.enemies.length).toBe(0);
    expect(w.chests.length).toBe(1);
    expect(w.doors.length).toBe(room.doors.length);
    expect(w.doors.every((dr) => dr.open === false)).toBe(true);
  });

  it("salle boss : un mini-boss est présent", () => {
    const d = generateDungeon(getBiome("forest"), lcg(2));
    const w = generateRoomWorld(createPlayer(), getBiome("forest"), roomById(d, d.bossId), lcg(4));
    expect(w.boss).not.toBe(null);
  });

  it("marcher sur un coffre l'ouvre et lâche du loot", () => {
    let dgn: Dungeon | null = null;
    let tId = -1;
    for (let s = 1; s < 20 && tId < 0; s++) {
      dgn = generateDungeon(getBiome("forest"), lcg(s));
      tId = dgn.rooms.find((r) => r.kind === "treasure")?.id ?? -1;
    }
    const w = generateRoomWorld(createPlayer(), getBiome("forest"), roomById(dgn!, tId), lcg(3));
    const ch = w.chests[0];
    w.player.transform.pos = { x: ch.pos.x, y: ch.pos.y };
    tickWorld(w, noInput(), T, dt);
    expect(ch.opened).toBe(true);
    expect(w.pickups.length).toBeGreaterThan(0);
  });

  it("marcher sur une porte ouverte fixe doorReached", () => {
    const d = generateDungeon(getBiome("forest"), lcg(2));
    const w = generateRoomWorld(createPlayer(), getBiome("forest"), roomById(d, d.startId), lcg(3));
    w.godMode = true;
    w.doors[0].open = true;
    w.player.transform.pos = { x: w.doors[0].pos.x, y: w.doors[0].pos.y };
    tickWorld(w, noInput(), T, dt);
    expect(w.doorReached).toBe(w.doors[0].to);
  });
});
