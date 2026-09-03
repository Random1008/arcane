import { Entity } from "../entity";
import { Vec2, sub, length, normalize } from "../math/vec2";

export interface MeleeCfg {
  damage: number;
  range: number;
  arcDeg: number;
  windup: number;
  active: number;
  recovery: number;
  cadence: number;
  knockback: number;
}

export type MeleePhase = "idle" | "windup" | "active" | "recovery";

export interface MeleeState {
  phase: MeleePhase;
  phaseTime: number;
  sinceStart: number;
  aimDir: Vec2;
  hitIds: Set<number>;
}

export const createMelee = (): MeleeState => ({
  phase: "idle",
  phaseTime: 0,
  sinceStart: 999,
  aimDir: { x: 1, y: 0 },
  hitIds: new Set(),
});

export function startMelee(m: MeleeState, aimDir: Vec2, cfg: MeleeCfg): boolean {
  if (m.phase !== "idle" || m.sinceStart < cfg.cadence || length(aimDir) === 0) return false;
  m.phase = "windup";
  m.phaseTime = 0;
  m.sinceStart = 0;
  m.aimDir = normalize(aimDir);
  m.hitIds.clear();
  return true;
}

export function tickMelee(m: MeleeState, cfg: MeleeCfg, dt: number): void {
  m.sinceStart += dt;
  if (m.phase === "idle") return;
  m.phaseTime += dt;
  if (m.phase === "windup" && m.phaseTime >= cfg.windup) {
    m.phase = "active";
    m.phaseTime = 0;
  } else if (m.phase === "active" && m.phaseTime >= cfg.active) {
    m.phase = "recovery";
    m.phaseTime = 0;
  } else if (m.phase === "recovery" && m.phaseTime >= cfg.recovery) {
    m.phase = "idle";
    m.phaseTime = 0;
  }
}

export const isMeleeActive = (m: MeleeState): boolean => m.phase === "active";

export function targetsInArc(selfPos: Vec2, aimDir: Vec2, entities: Entity[], cfg: MeleeCfg): Entity[] {
  const dir = normalize(aimDir);
  const halfRad = (cfg.arcDeg * Math.PI) / 180 / 2;
  const minCos = Math.cos(halfRad);
  return entities.filter((e) => {
    const to = sub(e.transform.pos, selfPos);
    const d = length(to);
    if (d > cfg.range + e.radius || d === 0) return false;
    const n = normalize(to);
    const cosang = n.x * dir.x + n.y * dir.y;
    return cosang >= minCos;
  });
}
