import { getBiome } from "./biomes";
import { Vec2, v } from "./math/vec2";
import { Level } from "./collision";
import { World, Player, makeEnemy, defaultWorldState } from "./world";
import { Archetype } from "./enemies";
import { makeBoss } from "./boss";
import { bossForTier } from "./bosses";
import { derivePlayerMods } from "./progression";

export type PortalKind = "combat" | "boss" | "return";

export interface Portal {
  id: number;
  pos: Vec2;
  radius: number;
  kind: PortalKind;
  danger: number; // 1..3 pour les portails de combat
  open: boolean;
}

export const NEXUS_LEVELS = 7; // 7 niveaux de difficulté
export const NEXUS_LEVEL_LABEL: Record<number, string> = {
  1: "trivial",
  2: "facile",
  3: "modéré",
  4: "difficile",
  5: "redoutable",
  6: "infernal",
  7: "quasi impossible",
};

export interface NexusScaling {
  hpMult: number;
  dmgMult: number;
  count: number;
}

/**
 * Scaling par **niveau de difficulté 1..7** (au-delà du rang S).
 * Niveau 1 = 0 monstre ; niveau 7 = quasi impossible.
 */
export function nexusScaling(level: number): NexusScaling {
  const l = Math.max(1, Math.min(NEXUS_LEVELS, level));
  return {
    hpMult: 1.5 * l * l, // 1.5 (N1) → 73.5 (N7)
    dmgMult: 1 + l * 1.1, // 2.1 (N1) → 8.7 (N7)
    count: l <= 1 ? 0 : Math.min(18, 2 + (l - 2) * 3), // N1=0, N2=2 … N7=17
  };
}

const NEXUS_TYPES: { name: string; archetype: Archetype }[] = [
  { name: "Éclat du Nexus", archetype: "chaser" },
  { name: "Sentinelle fracturée", archetype: "shooter" },
  { name: "Colosse du Vide", archetype: "brute" },
  { name: "Nuée d'anomalies", archetype: "swarmer" },
  { name: "Noyau instable", archetype: "bomber" },
];

const HUB_W = 1100;
const HUB_H = 700;
const ROOM_W = 950;
const ROOM_H = 650;
const NEXUS_BIOME = "trone_dieu_endormi"; // biome S → loot/palette d'endgame

function baseWorld(player: Player, level: Level): World {
  return {
    ...defaultWorldState(),
    player,
    playerMods: derivePlayerMods(player),
    level,
    biome: getBiome(NEXUS_BIOME),
    nextId: 3000,
    rng: Math.random,
  };
}

/** 8 portails (2 par mur) : 7 combat de niveau 1..7 + 1 portail de boss. */
function hubPortals(): Portal[] {
  const slots: Vec2[] = [
    v(HUB_W * 0.35, 40),
    v(HUB_W * 0.65, 40),
    v(HUB_W * 0.35, HUB_H - 40),
    v(HUB_W * 0.65, HUB_H - 40),
    v(40, HUB_H * 0.35),
    v(40, HUB_H * 0.65),
    v(HUB_W - 40, HUB_H * 0.35),
    v(HUB_W - 40, HUB_H * 0.65),
  ];
  return slots.map((pos, i) =>
    i < 7
      ? { id: 900 + i, pos, radius: 26, kind: "combat", danger: i + 1, open: true } // niveaux 1..7
      : { id: 900 + i, pos, radius: 26, kind: "boss", danger: NEXUS_LEVELS, open: true },
  );
}

export function generateNexusHub(player: Player, rng: () => number): World {
  const level: Level = { bounds: { x: 0, y: 0, w: HUB_W, h: HUB_H }, walls: [] };
  const w = baseWorld(player, level);
  w.rng = rng;
  w.portals = hubPortals();
  player.transform.pos = { x: HUB_W / 2, y: HUB_H / 2 };
  player.transform.vel = { x: 0, y: 0 };
  return w;
}

function roomSpawn(rng: () => number): Vec2 {
  for (let i = 0; i < 50; i++) {
    const x = 80 + rng() * (ROOM_W - 160);
    const y = 80 + rng() * (ROOM_H - 160);
    if (Math.hypot(x - ROOM_W / 2, y - ROOM_H / 2) >= 160) return v(x, y);
  }
  return v(ROOM_W / 2 + 220, ROOM_H / 2);
}

/** Salle accessible depuis un portail du hub : combat de niveau `portal.danger`, ou mini-boss (portail boss). */
export function generateNexusRoom(player: Player, portal: Portal, rng: () => number): World {
  const level: Level = { bounds: { x: 0, y: 0, w: ROOM_W, h: ROOM_H }, walls: [] };
  const w = baseWorld(player, level);
  w.rng = rng;
  player.transform.pos = { x: ROOM_W / 2, y: ROOM_H - 90 };
  player.transform.vel = { x: 0, y: 0 };

  const lvl = portal.kind === "boss" ? NEXUS_LEVELS : portal.danger;
  if (portal.kind === "boss") {
    const boss = makeBoss(bossForTier("S"), "S", ROOM_W / 2, 150);
    boss.health.maxHp = Math.round(boss.health.maxHp * (1 + lvl * 0.4));
    boss.health.hp = boss.health.maxHp;
    boss.contactDamage = Math.round(boss.contactDamage * (1 + lvl * 0.2));
    boss.projDamage = Math.round(boss.projDamage * (1 + lvl * 0.2));
    boss.aoeDamage = Math.round(boss.aoeDamage * (1 + lvl * 0.2));
    w.boss = boss;
  } else {
    const sc = nexusScaling(lvl); // niveau 1 → count 0 (salle vide, retour direct)
    let id = 100;
    for (let i = 0; i < sc.count; i++) {
      const pos = roomSpawn(rng);
      const t = NEXUS_TYPES[Math.floor(rng() * NEXUS_TYPES.length)];
      const e = makeEnemy(id++, pos.x, pos.y, t.archetype, "F", t.name);
      e.health.maxHp = Math.max(1, Math.round(e.health.maxHp * sc.hpMult));
      e.health.hp = e.health.maxHp;
      e.contactDamage = Math.round(e.contactDamage * sc.dmgMult);
      w.enemies.push(e);
    }
  }

  // portail de retour vers le hub (fermé tant que la salle n'est pas nettoyée)
  w.portals = [{ id: 999, pos: v(ROOM_W / 2, ROOM_H - 40), radius: 26, kind: "return", danger: 0, open: false }];
  return w;
}

export const NEXUS_BOSS_CHEST_RANK = 6; // rang du coffre garanti de la salle de boss

/**
 * Clôt une salle de Nexus une fois nettoyée : ouvre le portail de retour et, pour une salle de boss,
 * fait apparaître le coffre garanti. Renvoie `true` si la salle vient d'être clôturée (transition).
 * Fonction pure (testable) ; l'appelant gère le record (markNexusBest).
 */
export function clearNexusRoom(world: World, isHub: boolean, hadBoss: boolean): boolean {
  if (isHub || world.enemies.length > 0 || world.boss !== null) return false;
  const ret = world.portals.find((p) => p.kind === "return");
  if (!ret || ret.open) return false;
  ret.open = true;
  if (hadBoss) {
    const lb = world.level.bounds;
    world.chests.push({ id: 750, pos: { x: lb.w / 2, y: lb.h / 2 }, radius: 20, opened: false, rank: NEXUS_BOSS_CHEST_RANK });
  }
  return true;
}
