import { Entity, isInvulnerable } from "../entity";
import { Vec2, length } from "../math/vec2";

/** Durée de hitstun (s) par unité de knockback : kb=120 → ~0.14s, kb=180 → ~0.22s. */
const HITSTUN_PER_KNOCKBACK = 0.0012;

export function applyDamage(target: Entity, amount: number, knockback: Vec2): boolean {
  if (isInvulnerable(target)) return false;
  let dmg = amount;
  if (target.health.shield > 0) {
    const absorbed = Math.min(target.health.shield, dmg); // la barrière encaisse d'abord
    target.health.shield -= absorbed;
    dmg -= absorbed;
  }
  target.health.hp = Math.max(0, target.health.hp - dmg);
  target.transform.vel.x += knockback.x;
  target.transform.vel.y += knockback.y;
  target.health.hitstun = Math.max(target.health.hitstun, length(knockback) * HITSTUN_PER_KNOCKBACK);
  return true;
}

export const isDead = (e: Entity): boolean => e.health.hp <= 0;
