import { Tier } from "./combat/weapons";
import { TIER_SCALING } from "./biomes";

export type Archetype = "dummy" | "chaser" | "shooter" | "brute" | "swarmer" | "bomber";

/** Nombre de skins (variantes visuelles) par archétype de mob. */
export const ENEMY_SKINS = 5;

export interface ArchetypeStats {
  hpMult: number;
  dmgMult: number;
  speed: number;
  radius: number;
  knockback: number;
  color: number;
  // tireur
  preferredRange: number;
  retreatRange: number;
  fireCadence: number;
  projectileSpeed: number;
  projectileRadius: number;
  // bombeur
  explodeRadius: number;
}

const z = { preferredRange: 0, retreatRange: 0, fireCadence: 0, projectileSpeed: 0, projectileRadius: 0, explodeRadius: 0 };

export const ARCHETYPES: Record<Archetype, ArchetypeStats> = {
  dummy: { hpMult: 5, dmgMult: 0, speed: 0, radius: 16, knockback: 0, color: 0x9aa0b5, ...z },
  chaser: { hpMult: 1.0, dmgMult: 1.0, speed: 120, radius: 14, knockback: 120, color: 0xff5d5d, ...z },
  shooter: {
    hpMult: 0.7,
    dmgMult: 0.8,
    speed: 120,
    radius: 13,
    knockback: 60,
    color: 0xc06bff,
    preferredRange: 260,
    retreatRange: 170,
    fireCadence: 1.3,
    projectileSpeed: 300,
    projectileRadius: 6,
    explodeRadius: 0,
  },
  brute: { hpMult: 3.0, dmgMult: 2.2, speed: 70, radius: 20, knockback: 260, color: 0x9aa0b5, ...z },
  swarmer: { hpMult: 0.4, dmgMult: 0.6, speed: 185, radius: 10, knockback: 70, color: 0xffa64d, ...z },
  bomber: { hpMult: 0.6, dmgMult: 2.5, speed: 150, radius: 13, knockback: 200, color: 0xffe066, ...z, explodeRadius: 80 },
};

export const BASE_ENEMY_HP = 40;
export const BASE_CONTACT_DMG = 5;

export interface ResolvedEnemyStats {
  maxHp: number;
  contactDamage: number;
  speed: number;
  radius: number;
  knockback: number;
}

export function resolveEnemyStats(archetype: Archetype, tier: Tier): ResolvedEnemyStats {
  const a = ARCHETYPES[archetype];
  const sc = TIER_SCALING[tier];
  return {
    maxHp: Math.max(1, Math.round(BASE_ENEMY_HP * a.hpMult * sc.hpMult)),
    contactDamage: Math.round(BASE_CONTACT_DMG * a.dmgMult * sc.dmgMult),
    speed: a.speed,
    radius: a.radius,
    knockback: a.knockback,
  };
}
