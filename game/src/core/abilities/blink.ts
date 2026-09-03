import { Entity } from "../entity";
import { Vec2, sub, normalize, length, add, scale } from "../math/vec2";

export interface BlinkCfg {
  range: number;
  cooldown: number;
  energyCost: number;
}

export interface BlinkState {
  cooldownLeft: number;
}

export const createBlink = (): BlinkState => ({ cooldownLeft: 0 });

export function tickBlink(b: BlinkState, dt: number): void {
  b.cooldownLeft = Math.max(0, b.cooldownLeft - dt);
}

export function doBlink(
  b: BlinkState,
  e: Entity,
  aimPoint: Vec2,
  energy: { value: number },
  cfg: BlinkCfg,
  canOccupy: (p: Vec2) => boolean,
): boolean {
  if (b.cooldownLeft > 0 || energy.value < cfg.energyCost) return false;
  const toAim = sub(aimPoint, e.transform.pos);
  if (length(toAim) === 0) return false;
  const dir = normalize(toAim);
  const maxDist = Math.min(cfg.range, length(toAim));
  const stepLen = 4;
  let best = { x: e.transform.pos.x, y: e.transform.pos.y };
  for (let d = stepLen; d <= maxDist; d += stepLen) {
    const candidate = add(e.transform.pos, scale(dir, d));
    if (canOccupy(candidate)) best = candidate;
    else break;
  }
  // Collé à un mur : aucun déplacement utile → on ne consomme ni énergie ni cooldown.
  if (best.x === e.transform.pos.x && best.y === e.transform.pos.y) return false;
  e.transform.pos.x = best.x;
  e.transform.pos.y = best.y;
  energy.value -= cfg.energyCost;
  b.cooldownLeft = cfg.cooldown;
  return true;
}
