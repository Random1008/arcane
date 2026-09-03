import { Rect } from "./collision";
import { Vec2 } from "./math/vec2";

/**
 * Mécaniques de terrain par biome (tranche K) — backlog `biomes.md` « mécaniques de terrain » :
 * zones au sol (lave, glace, poison, pics) qui affectent le joueur qui marche dedans.
 */

export type TerrainKind = "lava" | "ice" | "poison" | "spikes";

export interface TerrainZone {
  id: number;
  kind: TerrainKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Rect utile pour les tests de collision point-dans-zone (réutilise Rect). */
export function zoneRect(z: TerrainZone): Rect {
  return { x: z.x, y: z.y, w: z.w, h: z.h };
}

const circleHitsRect = (p: Vec2, r: number, rect: Rect): boolean => {
  const cx = Math.max(rect.x, Math.min(p.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(p.y, rect.y + rect.h));
  return (p.x - cx) ** 2 + (p.y - cy) ** 2 < r * r;
};

/** Zones de `kind` donné contenant le point (cercle rayon r). */
export function zonesAt(zones: TerrainZone[], kind: TerrainKind | null, p: Vec2, r: number): TerrainZone[] {
  return zones.filter((z) => (kind === null || z.kind === kind) && circleHitsRect(p, r, zoneRect(z)));
}

/** Le joueur (cercle) touche-t-il au moins une zone du kind ? */
export function onTerrain(zones: TerrainZone[], kind: TerrainKind, p: Vec2, r: number): boolean {
  return zonesAt(zones, kind, p, r).length > 0;
}

/**
 * Kinds de terrain par biome (id). Les biomes absents de la table n'ont pas de terrain.
 * Le Sanctuaire (`spawn`) n'est jamais dans la table → jamais de terrain.
 */
export const BIOME_TERRAIN: Record<string, TerrainKind[]> = {
  volcano: ["lava"],
  volcan_endormi: ["lava"],
  steppe_brulee: ["lava"],
  ice_floe: ["ice"],
  salines_gelees: ["ice"],
  toundra: ["ice"],
  toundra_spectrale: ["ice"],
  toxic_marsh: ["poison"],
  marais_poix: ["poison"],
  marais_luminescent: ["poison"],
  tourbiere_blafarde: ["poison"],
  catacombs: ["spikes"],
  charnier_brumeux: ["spikes"],
};

/** Nombre de zones générées pour un biome qui a du terrain (2..4). */
export function zoneCountFor(rng: () => number): number {
  return 2 + Math.floor(rng() * 3); // 2..4
}

/**
 * Place une zone rectangulaire aléatoire dans le niveau, en évitant les rects interdits
 * (entrée joueur, sortie, entrées de donjon…). Renvoie null si aucun placement libre
 * (garde : 30 essais).
 */
export function placeZone(
  rng: () => number,
  kind: TerrainKind,
  bounds: Rect,
  avoid: Rect[],
): TerrainZone | null {
  const minSide = 70;
  const maxSide = 150;
  for (let i = 0; i < 40; i++) {
    const w = minSide + rng() * (maxSide - minSide);
    const h = minSide + rng() * (maxSide - minSide);
    const x = bounds.x + 20 + rng() * Math.max(1, bounds.w - 40 - w);
    const y = bounds.y + 20 + rng() * Math.max(1, bounds.h - 40 - h);
    const margin = 60;
    const overlaps = avoid.some(
      (a) =>
        x < a.x + a.w + margin &&
        x + w > a.x - margin &&
        y < a.y + a.h + margin &&
        y + h > a.y - margin,
    );
    if (overlaps) continue;
    return { id: 0, kind, x, y, w, h };
  }
  return null;
}

/** Dégâts par seconde d'une zone (lave/spikes plus forts que poison). */
export function terrainDps(kind: TerrainKind): number {
  return kind === "lava" || kind === "spikes" ? 10 : 5;
}

/** Cadence (i-frames) entre deux ticks de dégâts d'une zone. */
export function terrainTickInterval(kind: TerrainKind): number {
  return kind === "lava" || kind === "spikes" ? 0.4 : 0.6;
}
