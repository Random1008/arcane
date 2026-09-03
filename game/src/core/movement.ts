import { Transform } from "./entity";
import { Vec2, length, normalize, scale, clampLength } from "./math/vec2";

export interface MoveCfg {
  maxSpeed: number;
  accel: number;
  friction: number;
}

/** Met à jour uniquement la vitesse (accel vers la cible / friction / clamp). */
export function updateVelocity(t: Transform, moveDir: Vec2, cfg: MoveCfg, dt: number): void {
  if (length(moveDir) > 0) {
    const dir = normalize(moveDir);
    const target = scale(dir, cfg.maxSpeed);
    const stepX = target.x - t.vel.x;
    const stepY = target.y - t.vel.y;
    t.vel.x += Math.sign(stepX) * Math.min(cfg.accel * dt, Math.abs(stepX));
    t.vel.y += Math.sign(stepY) * Math.min(cfg.accel * dt, Math.abs(stepY));
  } else {
    const sp = length(t.vel);
    if (sp > 0) {
      const dec = Math.min(sp, cfg.friction * dt);
      const nv = scale(normalize(t.vel), sp - dec);
      t.vel.x = nv.x;
      t.vel.y = nv.y;
    }
  }
  const clamped = clampLength(t.vel, cfg.maxSpeed);
  t.vel.x = clamped.x;
  t.vel.y = clamped.y;
}

/** Met à jour la vitesse puis intègre la position (sans collision). */
export function applyMovement(t: Transform, moveDir: Vec2, cfg: MoveCfg, dt: number): void {
  updateVelocity(t, moveDir, cfg, dt);
  t.pos.x += t.vel.x * dt;
  t.pos.y += t.vel.y * dt;
}

/** Comme applyMovement, mais intègre axe par axe en glissant le long des murs. */
export function applyMovementCollide(
  t: Transform,
  moveDir: Vec2,
  cfg: MoveCfg,
  dt: number,
  canOccupy: (p: Vec2) => boolean,
): void {
  updateVelocity(t, moveDir, cfg, dt);
  const nx = t.pos.x + t.vel.x * dt;
  if (canOccupy({ x: nx, y: t.pos.y })) t.pos.x = nx;
  else t.vel.x = 0;
  const ny = t.pos.y + t.vel.y * dt;
  if (canOccupy({ x: t.pos.x, y: ny })) t.pos.y = ny;
  else t.vel.y = 0;
}
