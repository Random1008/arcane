import { BiomeDef, TIER_SCALING } from "./biomes";
import { randomWeaponIdOfTier } from "./combat/catalog";
import { npcsForBiome } from "./npcs";
import { HUB_NPCS } from "./hub";
import { enemyTypesForBiome } from "./biomeEnemies";
import { bossForTier } from "./bosses";
import { Boss, makeBoss } from "./boss";
import { computePlayerMods } from "./sets";
import { Rect, Level, canOccupy } from "./collision";
import { Player, World, Enemy, Exit, DungeonEntrance, WeaponPickup, Npc, makeEnemy, defaultWorldState } from "./world";
import { Vec2, v, distance } from "./math/vec2";

const rectNear = (r: Rect, p: Vec2, dist: number): boolean =>
  p.x >= r.x - dist && p.x <= r.x + r.w + dist && p.y >= r.y - dist && p.y <= r.y + r.h + dist;

interface Placed {
  pos: Vec2;
  radius: number;
}

function freeSpawn(
  rng: () => number,
  level: Level,
  avoid: Vec2,
  minDist: number,
  radius: number,
  taken: Placed[] = [],
): Vec2 {
  const b = level.bounds;
  for (let i = 0; i < 60; i++) {
    const p = v(b.x + radius + rng() * (b.w - 2 * radius), b.y + radius + rng() * (b.h - 2 * radius));
    if (!canOccupy(p, radius, level)) continue;
    if (distance(p, avoid) < minDist) continue;
    if (taken.some((t) => distance(p, t.pos) < t.radius + radius + 8)) continue;
    return p;
  }
  return v(b.x + b.w - radius - 10, b.y + radius + 10); // repli
}

/**
 * Génère la zone jouable d'un biome. `finalBoss` : ce biome est le dernier non nettoyé de son anneau →
 * le **boss du rang** y apparaît (arène : pas d'ennemis réguliers), au lieu d'un biome-boss fixe.
 */
export function generateBiomeWorld(player: Player, biome: BiomeDef, rng: () => number, finalBoss = false): World {
  const bounds: Rect = { x: 0, y: 0, w: biome.size.w, h: biome.size.h };
  const entry = v(biome.size.w / 2, biome.size.h / 2);
  const exitPos = v(biome.size.w / 2, 50);

  // murs : 6..11 rectangles, en évitant l'entrée et la sortie (aucun mur au Sanctuaire = hub dégagé)
  const walls: Rect[] = [];
  if (biome.id !== "spawn") {
    const target = 6 + Math.floor(rng() * 6);
    let attempts = 0;
    while (walls.length < target && attempts < target * 12) {
      attempts++;
      const ww = 60 + Math.floor(rng() * 110);
      const wh = 60 + Math.floor(rng() * 110);
      const wx = 40 + Math.floor(rng() * Math.max(1, bounds.w - 80 - ww));
      const wy = 40 + Math.floor(rng() * Math.max(1, bounds.h - 80 - wh));
      const rect: Rect = { x: wx, y: wy, w: ww, h: wh };
      if (rectNear(rect, entry, 140)) continue;
      if (rectNear(rect, exitPos, 100)) continue;
      walls.push(rect);
    }
  }
  const level: Level = { bounds, walls };

  // joueur placé à l'entrée (PV/énergie/hotbar conservés) ; au Sanctuaire, sous la plateforme du hub
  player.transform.pos = biome.id === "spawn" ? { x: biome.size.w / 2, y: 480 } : { x: entry.x, y: entry.y };
  player.transform.vel = { x: 0, y: 0 };

  // entités déjà posées (la sortie est réservée pour que rien ne la recouvre)
  const placed: Placed[] = [{ pos: exitPos, radius: 28 }];

  // dernier biome de l'anneau → le boss du rang, pas d'ennemis réguliers ; sinon, ennemis scalés par rang
  let boss: Boss | null = null;
  const enemies: Enemy[] = [];
  let id = 100;
  if (finalBoss && biome.id !== "spawn") {
    boss = makeBoss(bossForTier(biome.tier), biome.tier, biome.size.w / 2, 140);
    placed.push({ pos: { x: boss.transform.pos.x, y: boss.transform.pos.y }, radius: boss.radius });
  } else {
    const types = enemyTypesForBiome(biome.id);
    const sc = TIER_SCALING[biome.tier];
    const count = biome.enemyCount ?? sc.count;
    for (let i = 0; i < count; i++) {
      const pos = freeSpawn(rng, level, entry, 220, 14, placed);
      placed.push({ pos, radius: 14 });
      const tp = types[Math.floor(rng() * types.length)];
      enemies.push(makeEnemy(id++, pos.x, pos.y, tp.archetype, biome.tier, tp.name));
    }
  }

  // armes au sol : 2..3, armes nommées du tier du biome (les biomes externes lâchent mieux)
  const pickups: WeaponPickup[] = [];
  const pickupCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < pickupCount; i++) {
    const defId = randomWeaponIdOfTier(biome.tier, rng);
    const pos = freeSpawn(rng, level, entry, 120, 18, placed);
    placed.push({ pos, radius: 18 });
    pickups.push({ id: 700 + i, pos, radius: 18, defId, tier: biome.tier, omega: false, taken: false });
  }

  // PNJ : hub fixe au Sanctuaire (2 rangées), sinon PNJ de biome à des positions libres
  const npcs: Npc[] = [];
  if (biome.id === "spawn") {
    HUB_NPCS.forEach((def, i) => {
      const col = i % 8;
      const row = i < 8 ? 0 : 1;
      const pos = v(120 + col * 105, row === 0 ? 190 : 330);
      placed.push({ pos, radius: 16 });
      npcs.push({
        id: 600 + i,
        pos,
        radius: 16,
        name: def.name,
        lines: def.lines,
        talked: false,
        role: def.role,
        lockedRank: def.lockedRank,
        action: def.action ?? "none",
      });
    });
  } else {
    npcsForBiome(biome.id).forEach((def, i) => {
      const pos = freeSpawn(rng, level, entry, 90, 16, placed);
      placed.push({ pos, radius: 16 });
      npcs.push({ id: 600 + i, pos, radius: 16, name: def.name, lines: def.lines, talked: false });
    });
  }

  const exits: Exit[] = [{ id: 900, pos: exitPos, radius: 28 }];
  const dungeonEntrances: DungeonEntrance[] = [];
  for (let i = 0; i < biome.dungeons; i++) {
    const pos = freeSpawn(rng, level, entry, 160, 22, placed);
    placed.push({ pos, radius: 22 });
    dungeonEntrances.push({ id: 800 + i, pos, radius: 22 });
  }

  return {
    ...defaultWorldState(),
    player,
    enemies,
    pickups,
    playerMods: computePlayerMods(player.armor),
    npcs,
    exits,
    dungeonEntrances,
    boss,
    level,
    biome,
    nextId: id + 1000,
    rng,
  };
}
