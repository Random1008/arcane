export type PlaceholderShape = "circle" | "rect" | "triangle";

export interface AssetSpec {
  key: string;
  file?: string;
  shape: PlaceholderShape;
  color: number;
  size: number;
}

// éclaircit/assombrit une couleur (facteur par canal) pour distinguer les skins en placeholder
function shade(c: number, f: number): number {
  const r = Math.max(0, Math.min(255, Math.round(((c >> 16) & 0xff) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((c >> 8) & 0xff) * f)));
  const b = Math.max(0, Math.min(255, Math.round((c & 0xff) * f)));
  return (r << 16) | (g << 8) | b;
}

const SKIN_FACTORS = [0.7, 0.85, 1.0, 1.15, 1.3]; // 5 nuances

// archétypes de mob qui ont 5 skins
const COMBAT: { archetype: string; shape: PlaceholderShape; color: number; size: number }[] = [
  { archetype: "chaser", shape: "triangle", color: 0xff5d5d, size: 28 },
  { archetype: "shooter", shape: "circle", color: 0xc06bff, size: 26 },
  { archetype: "brute", shape: "rect", color: 0x8a90a8, size: 40 },
  { archetype: "swarmer", shape: "triangle", color: 0xffa64d, size: 18 },
  { archetype: "bomber", shape: "circle", color: 0xffe066, size: 24 },
];

// 5 skins par archétype : enemy_<archetype>_<1..5>.png
const enemySkins: AssetSpec[] = COMBAT.flatMap((a) =>
  SKIN_FACTORS.map((f, i) => ({
    key: `enemy_${a.archetype}_${i + 1}`,
    file: `/enemy_${a.archetype}_${i + 1}.png`,
    shape: a.shape,
    color: shade(a.color, f),
    size: a.size,
  })),
);

// `file` pointe vers un PNG dans game/img/ (servi à la racine via publicDir).
// Tant qu'un fichier est absent, un placeholder géométrique est généré (aucune erreur bloquante).
export const ASSETS: AssetSpec[] = [
  { key: "player", file: "/player.png", shape: "circle", color: 0x4ad6ff, size: 28 },
  { key: "enemy_dummy", file: "/enemy_dummy.png", shape: "rect", color: 0x9aa0b5, size: 32 },
  ...enemySkins,
  { key: "enemy_boss", file: "/enemy_boss.png", shape: "circle", color: 0xb03a3a, size: 56 },
  { key: "projectile", file: "/projectile.png", shape: "circle", color: 0xffe066, size: 10 },
];
