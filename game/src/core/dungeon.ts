import { BiomeDef } from "./biomes";
import { TIERS } from "./combat/weapons";
import { Vec2, v } from "./math/vec2";
import { Level, Rect } from "./collision";
import { World, Player, Enemy, makeEnemy, defaultWorldState } from "./world";
import { makeBoss } from "./boss";
import { bossForTier } from "./bosses";
import { enemyTypesForBiome } from "./biomeEnemies";
import { derivePlayerMods } from "./progression";

export type Dir = "N" | "S" | "E" | "W";
export type RoomKind = "start" | "normal" | "treasure" | "boss";

export interface RoomDoor {
  dir: Dir;
  to: number;
}
export interface DungeonRoom {
  id: number;
  gx: number;
  gy: number;
  kind: RoomKind;
  depth: number;
  doors: RoomDoor[];
  cleared: boolean;
}
export interface Dungeon {
  rooms: DungeonRoom[];
  startId: number;
  bossId: number;
}

/** Porte vers une salle voisine (dans un World de salle). */
export interface Door {
  id: number;
  pos: Vec2;
  dir: Dir;
  to: number;
  open: boolean;
}
/** Coffre (loot). */
export interface Chest {
  id: number;
  pos: Vec2;
  radius: number;
  opened: boolean;
  rank: number;
}

const DIRS: { dir: Dir; dx: number; dy: number }[] = [
  { dir: "N", dx: 0, dy: -1 },
  { dir: "S", dx: 0, dy: 1 },
  { dir: "E", dx: 1, dy: 0 },
  { dir: "W", dx: -1, dy: 0 },
];

export function opposite(d: Dir): Dir {
  return d === "N" ? "S" : d === "S" ? "N" : d === "E" ? "W" : "E";
}

export function roomById(d: Dungeon, id: number): DungeonRoom {
  const r = d.rooms.find((x) => x.id === id);
  if (!r) throw new Error(`salle inconnue: ${id}`);
  return r;
}

/** Génère un graphe de donjon ramifié (arbre) par croissance aléatoire depuis l'entrée. */
export function generateDungeon(biome: BiomeDef, rng: () => number): Dungeon {
  const ti = TIERS.indexOf(biome.tier);
  const roomCount = Math.min(9, 5 + ti);
  const byCell = new Map<string, DungeonRoom>();
  let id = 0;
  const start: DungeonRoom = { id: id++, gx: 0, gy: 0, kind: "start", depth: 0, doors: [], cleared: false };
  byCell.set("0,0", start);
  const rooms: DungeonRoom[] = [start];

  let guard = 0;
  while (rooms.length < roomCount && guard++ < 500) {
    const base = rooms[Math.floor(rng() * rooms.length)];
    const order = [...DIRS].sort(() => rng() - 0.5);
    for (const { dir, dx, dy } of order) {
      const nx = base.gx + dx;
      const ny = base.gy + dy;
      const key = `${nx},${ny}`;
      if (byCell.has(key)) continue;
      const room: DungeonRoom = { id: id++, gx: nx, gy: ny, kind: "normal", depth: base.depth + 1, doors: [], cleared: false };
      byCell.set(key, room);
      rooms.push(room);
      base.doors.push({ dir, to: room.id });
      room.doors.push({ dir: opposite(dir), to: base.id });
      break;
    }
  }

  // boss = salle la plus profonde ; feuilles restantes = trésors
  let bossId = start.id;
  let maxDepth = -1;
  for (const r of rooms) {
    if (r.depth > maxDepth) {
      maxDepth = r.depth;
      bossId = r.id;
    }
  }
  for (const r of rooms) {
    if (r.id === bossId) r.kind = "boss";
    else if (r.kind !== "start" && r.doors.length === 1) r.kind = "treasure";
  }

  return { rooms, startId: start.id, bossId };
}

const ROOM_W = 900;
const ROOM_H = 640;
const DOOR_MARGIN = 30;

export function doorPos(dir: Dir): Vec2 {
  switch (dir) {
    case "N":
      return v(ROOM_W / 2, DOOR_MARGIN);
    case "S":
      return v(ROOM_W / 2, ROOM_H - DOOR_MARGIN);
    case "E":
      return v(ROOM_W - DOOR_MARGIN, ROOM_H / 2);
    case "W":
      return v(DOOR_MARGIN, ROOM_H / 2);
  }
}

/** Position d'arrivée du joueur quand il entre par une porte de direction `dir` (un peu en retrait). */
export function entryPos(dir: Dir): Vec2 {
  const p = doorPos(dir);
  const inset = 70;
  if (dir === "N") return v(p.x, p.y + inset);
  if (dir === "S") return v(p.x, p.y - inset);
  if (dir === "E") return v(p.x - inset, p.y);
  return v(p.x + inset, p.y);
}

function roomSpawn(rng: () => number, avoid: Vec2[]): Vec2 {
  for (let i = 0; i < 60; i++) {
    const x = 80 + rng() * (ROOM_W - 160);
    const y = 80 + rng() * (ROOM_H - 160);
    if (Math.hypot(x - ROOM_W / 2, y - ROOM_H / 2) < 150) continue;
    if (avoid.some((a) => Math.hypot(x - a.x, y - a.y) < 120)) continue; // pas collé aux points d'arrivée
    return v(x, y);
  }
  return v(ROOM_W / 2 + 200, ROOM_H / 2);
}

/** Construit le World d'une salle de donjon (arène + ennemis/boss + portes + coffre). */
export function generateRoomWorld(player: Player, biome: BiomeDef, room: DungeonRoom, rng: () => number): World {
  const bounds: Rect = { x: 0, y: 0, w: ROOM_W, h: ROOM_H };
  const level: Level = { bounds, walls: [] };
  const ti = TIERS.indexOf(biome.tier);

  const enemies: Enemy[] = [];
  const chests: Chest[] = [];
  let boss: World["boss"] = null;
  let id = 100;

  if (room.kind === "treasure") {
    chests.push({ id: 700, pos: v(ROOM_W / 2, ROOM_H / 2), radius: 18, opened: false, rank: ti });
  } else if (room.kind === "boss") {
    const def = bossForTier(biome.tier);
    boss = makeBoss(def, biome.tier, ROOM_W / 2, 140);
    boss.health.maxHp = Math.max(1, Math.round(boss.health.maxHp * 0.5)); // mini-boss
    boss.health.hp = boss.health.maxHp;
  } else {
    const count = room.kind === "start" ? 1 + ti : 2 + room.depth + ti;
    const types = enemyTypesForBiome(biome.id);
    const avoid: Vec2[] = room.doors.map((d) => entryPos(d.dir)); // ne pas spawner sur une arrivée
    if (room.kind === "start") avoid.push(v(ROOM_W / 2, ROOM_H - 90));
    for (let i = 0; i < count; i++) {
      const pos = roomSpawn(rng, avoid);
      const tp = types[Math.floor(rng() * types.length)];
      enemies.push(makeEnemy(id++, pos.x, pos.y, tp.archetype, biome.tier, tp.name));
    }
  }

  const doors: Door[] = room.doors.map((d, i) => ({ id: 800 + i, pos: doorPos(d.dir), dir: d.dir, to: d.to, open: room.cleared }));

  return {
    ...defaultWorldState(),
    player,
    enemies,
    playerMods: derivePlayerMods(player),
    boss,
    doors,
    chests,
    level,
    biome,
    nextId: 2000,
    rng,
  };
}
