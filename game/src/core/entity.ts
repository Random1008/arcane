import { Vec2, v } from "./math/vec2";

export type Faction = "player" | "enemy" | "neutral";

export interface Transform {
  pos: Vec2;
  vel: Vec2;
}

export interface Health {
  hp: number;
  maxHp: number;
  iframes: number;
  hitstun: number;
  shield: number; // barrière qui absorbe les dégâts avant les PV (capacité Bouclier)
}

export interface Entity {
  id: number;
  transform: Transform;
  health: Health;
  radius: number;
  faction: Faction;
}

export function makeEntity(o: {
  id: number;
  x: number;
  y: number;
  maxHp: number;
  radius: number;
  faction: Faction;
}): Entity {
  return {
    id: o.id,
    radius: o.radius,
    faction: o.faction,
    transform: { pos: v(o.x, o.y), vel: v(0, 0) },
    health: { hp: o.maxHp, maxHp: o.maxHp, iframes: 0, hitstun: 0, shield: 0 },
  };
}

export const isInvulnerable = (e: Entity): boolean => e.health.iframes > 0;
export const isStunned = (e: Entity): boolean => e.health.hitstun > 0;

export function tickIframes(e: Entity, dt: number): void {
  e.health.iframes = Math.max(0, e.health.iframes - dt);
}

export function tickHitstun(e: Entity, dt: number): void {
  e.health.hitstun = Math.max(0, e.health.hitstun - dt);
}
