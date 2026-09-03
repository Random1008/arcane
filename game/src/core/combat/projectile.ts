import { Faction } from "../entity";
import { WeaponEffect } from "./effects";
import { Vec2, v, normalize, scale } from "../math/vec2";

export interface ProjectileOpts {
  speed: number;
  radius: number;
  damage: number;
  lifetime: number;
  pierce: boolean;
  crit: boolean;
}

export interface Projectile {
  id: number;
  pos: Vec2;
  vel: Vec2;
  life: number;
  damage: number;
  faction: Faction;
  radius: number;
  pierce: boolean;
  crit: boolean;
  hitIds: Set<number>;
  homing?: boolean; // guidé vers l'ennemi le plus proche (effet homing)
  effects?: WeaponEffect[]; // effets d'arme appliqués à l'impact (statuts, drain, onde…)
}

export function spawnProjectile(id: number, origin: Vec2, dir: Vec2, o: ProjectileOpts, faction: Faction): Projectile {
  return {
    id,
    pos: v(origin.x, origin.y),
    vel: scale(normalize(dir), o.speed),
    life: o.lifetime,
    damage: o.damage,
    faction,
    radius: o.radius,
    pierce: o.pierce,
    crit: o.crit,
    hitIds: new Set(),
  };
}

export function tickProjectile(p: Projectile, dt: number): void {
  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;
  p.life -= dt;
}

export const isExpired = (p: Projectile): boolean => p.life <= 0;
