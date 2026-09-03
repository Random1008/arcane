import { Vec2 } from "./math/vec2";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Level {
  bounds: Rect;
  walls: Rect[];
}

const circleHitsRect = (p: Vec2, r: number, rect: Rect): boolean => {
  const cx = Math.max(rect.x, Math.min(p.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(p.y, rect.y + rect.h));
  return (p.x - cx) ** 2 + (p.y - cy) ** 2 < r * r;
};

export function canOccupy(p: Vec2, r: number, level: Level): boolean {
  const b = level.bounds;
  if (p.x - r < b.x || p.y - r < b.y || p.x + r > b.x + b.w || p.y + r > b.y + b.h) return false;
  for (const w of level.walls) if (circleHitsRect(p, r, w)) return false;
  return true;
}

export function clampToBounds(p: Vec2, r: number, b: Rect): Vec2 {
  return {
    x: Math.max(b.x + r, Math.min(p.x, b.x + b.w - r)),
    y: Math.max(b.y + r, Math.min(p.y, b.y + b.h - r)),
  };
}
