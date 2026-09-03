import { Entity } from "../entity";
import { Vec2, normalize, length, scale } from "../math/vec2";

export interface DashCfg {
  distance: number;
  duration: number;
  iframes: number;
  cooldown: number;
}

export type DashPhase = "ready" | "dashing";

export interface DashState {
  phase: DashPhase;
  timeLeft: number;
  cooldownLeft: number;
  dir: Vec2;
}

export const createDash = (): DashState => ({ phase: "ready", timeLeft: 0, cooldownLeft: 0, dir: { x: 0, y: 0 } });

export function startDash(d: DashState, dir: Vec2, e: Entity, cfg: DashCfg): boolean {
  if (d.phase !== "ready" || d.cooldownLeft > 0 || length(dir) === 0) return false;
  d.phase = "dashing";
  d.timeLeft = cfg.duration;
  d.dir = normalize(dir);
  e.health.iframes = Math.max(e.health.iframes, cfg.iframes);
  return true;
}

export function tickDash(
  d: DashState,
  e: Entity,
  cfg: DashCfg,
  dt: number,
  canOccupy?: (p: Vec2) => boolean,
): void {
  if (d.cooldownLeft > 0) d.cooldownLeft = Math.max(0, d.cooldownLeft - dt);
  if (d.phase === "dashing") {
    const speed = cfg.distance / cfg.duration;
    const vel = scale(d.dir, speed);
    e.transform.vel.x = vel.x;
    e.transform.vel.y = vel.y;
    if (canOccupy) {
      const nx = e.transform.pos.x + vel.x * dt;
      if (canOccupy({ x: nx, y: e.transform.pos.y })) e.transform.pos.x = nx;
      const ny = e.transform.pos.y + vel.y * dt;
      if (canOccupy({ x: e.transform.pos.x, y: ny })) e.transform.pos.y = ny;
    } else {
      e.transform.pos.x += vel.x * dt;
      e.transform.pos.y += vel.y * dt;
    }
    d.timeLeft -= dt;
    if (d.timeLeft <= 0) {
      d.phase = "ready";
      d.cooldownLeft = cfg.cooldown;
    }
  }
}

export const isDashing = (d: DashState): boolean => d.phase === "dashing";
