import Phaser from "phaser";
import { MeleeState, MeleeCfg } from "../../core/combat/melee";

type Pt = { x: number; y: number };

/**
 * Dessine l'animation de l'attaque mêlée (croissant lumineux) en fonction de la phase :
 * - windup   : fin arc de télégraphe qui apparaît
 * - active   : croissant plein et brillant, léger balayage dans l'arc
 * - recovery : fondu de sortie
 * Le tout suit la position courante du joueur (x, y) et s'oriente sur la visée.
 */
export function drawMeleeSlash(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  m: MeleeState,
  cfg: MeleeCfg,
): void {
  if (m.phase === "idle") return;

  const base = Math.atan2(m.aimDir.y, m.aimDir.x);
  const half = (cfg.arcDeg * Math.PI) / 180 / 2;
  const outerR = cfg.range;
  const innerR = cfg.range * 0.45;

  if (m.phase === "windup") {
    const p = clamp01(m.phaseTime / cfg.windup);
    drawArcLine(g, x, y, outerR * (0.7 + 0.3 * p), base - half, base + half, 0x9fe8ff, 0.3 * p, 2);
    return;
  }

  let alpha: number;
  let sweep: number;
  if (m.phase === "active") {
    const p = clamp01(m.phaseTime / cfg.active);
    alpha = 0.9;
    sweep = -half * 0.4 + half * 0.8 * p; // balayage de l'arrière vers l'avant de l'arc
  } else {
    const p = clamp01(m.phaseTime / cfg.recovery);
    alpha = 0.5 * (1 - p);
    sweep = half * 0.4;
  }
  if (alpha <= 0.02) return;

  const start = base - half + sweep;
  const end = base + half + sweep;
  fillCrescent(g, x, y, innerR, outerR, start, end, 0xffffff, alpha);
  drawArcLine(g, x, y, outerR, start, end, 0xbff2ff, Math.min(1, alpha + 0.1), 3);
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

function fillCrescent(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  innerR: number,
  outerR: number,
  start: number,
  end: number,
  color: number,
  alpha: number,
): void {
  const steps = 14;
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = start + ((end - start) * i) / steps;
    pts.push({ x: x + Math.cos(a) * outerR, y: y + Math.sin(a) * outerR });
  }
  for (let i = steps; i >= 0; i--) {
    const a = start + ((end - start) * i) / steps;
    pts.push({ x: x + Math.cos(a) * innerR, y: y + Math.sin(a) * innerR });
  }
  g.fillStyle(color, alpha);
  g.fillPoints(pts, true);
}

function drawArcLine(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  start: number,
  end: number,
  color: number,
  alpha: number,
  width: number,
): void {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const a = start + ((end - start) * i) / steps;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.strokePath();
}
