import { Tier, TIERS } from "./combat/weapons";

export interface BiomePalette {
  ground: number;
  wall: number;
  accent: number;
}

export interface BiomeDef {
  id: string;
  name: string;
  tier: Tier;
  palette: BiomePalette;
  size: { w: number; h: number };
  dungeons: number;
  enemyCount?: number; // override du nombre d'ennemis (sinon TIER_SCALING[tier].count)
}

export interface TierScaling {
  hpMult: number;
  dmgMult: number;
  count: number;
}

export const TIER_SCALING: Record<Tier, TierScaling> = {
  F: { hpMult: 1.0, dmgMult: 1.0, count: 3 },
  E: { hpMult: 1.4, dmgMult: 1.15, count: 4 },
  D: { hpMult: 1.9, dmgMult: 1.3, count: 5 },
  C: { hpMult: 2.6, dmgMult: 1.5, count: 6 },
  B: { hpMult: 3.5, dmgMult: 1.8, count: 7 },
  A: { hpMult: 4.6, dmgMult: 2.2, count: 8 },
  S: { hpMult: 6.0, dmgMult: 3.0, count: 9 },
};

// [id, nom, tier, ground, wall, accent, dungeons]
type Raw = [string, string, Tier, number, number, number, number];
const RAW: Raw[] = [
  ["plains", "Plaines", "F", 0x6aa84f, 0x4a7a34, 0xcfe8b0, 1],
  ["forest", "Forêt", "F", 0x3f6b3a, 0x294a26, 0x8fd17a, 1],
  ["cave", "Caverne", "F", 0x4a4a55, 0x2a2a33, 0x9aa0b5, 2],
  ["river", "Rivière", "F", 0x4f8fae, 0x356b86, 0xbfeaff, 1],
  ["swamp", "Marais", "E", 0x5a6b3a, 0x3a4a24, 0x9ab06a, 1],
  ["windy_hills", "Collines venteuses", "E", 0x8aa06a, 0x6a7a4a, 0xdfe8c0, 1],
  ["dark_woods", "Bois sombres", "E", 0x2e3b2e, 0x1a241a, 0x6a8a5a, 2],
  ["desert", "Désert", "D", 0xd9c179, 0xb39a55, 0xfff0c0, 2],
  ["tundra", "Toundra", "D", 0xc8d6e0, 0x9ab0c0, 0xffffff, 1],
  ["toxic_marsh", "Marécage toxique", "D", 0x6a8a3a, 0x47631f, 0xb6ff5a, 2],
  ["mountains", "Montagnes", "C", 0x8a8a95, 0x5a5a66, 0xd0d0db, 2],
  ["jungle", "Jungle", "C", 0x2f7a4a, 0x1d5230, 0x7fffb0, 2],
  ["ruins", "Ruines", "C", 0x9a8f7a, 0x6a6052, 0xd8cbb0, 3],
  ["volcano", "Volcan", "B", 0x6b2e2e, 0x3a1414, 0xff7b3a, 2],
  ["ice_floe", "Banquise", "B", 0xa9d6e8, 0x7ab0c8, 0xffffff, 2],
  ["catacombs", "Catacombes", "B", 0x4a4452, 0x2a2630, 0xb59ad0, 3],
  ["abyss", "Abysses", "A", 0x2a2440, 0x161228, 0x7a6aff, 3],
  ["sky_city", "Cité céleste", "A", 0xcdd8ff, 0x9fb0e0, 0xffffff, 2],
  ["void_rift", "Faille du Néant", "S", 0x241a33, 0x120a1a, 0xc05aff, 3],
  ["fractured", "Dimension fracturée", "S", 0x33243a, 0x1a0f22, 0xff5ad0, 3],
  ["tourbiere_blafarde", "Tourbière blafarde", "E", 0x6b7a5a, 0x39402e, 0xc9f25e, 2],
  ["ravines_rouille", "Ravines de rouille", "E", 0x9c5a3c, 0x542a1b, 0xff9b3d, 3],
  ["steppe_brulee", "Steppe brûlée", "D", 0x9c7a3e, 0x6e5326, 0xffae3a, 2],
  ["salines_gelees", "Salines gelées", "D", 0xcfd9dd, 0x8fa4ac, 0x7df0ff, 1],
  ["canyon_poussiere", "Canyon de poussière", "D", 0xb08a5e, 0x6f4f30, 0xff7a4a, 3],
  ["foret_petrifiee", "Forêt pétrifiée", "C", 0x8a7d6a, 0x564d40, 0xc9a86a, 2],
  ["gorges_oubli", "Gorges de l'Oubli", "C", 0x9c6f54, 0x5e3d2c, 0xff9a52, 2],
  ["steppe_ossements", "Steppe d'Ossements", "C", 0xb8ad8e, 0x7a6e52, 0xe8e2c0, 3],
  ["plateau_fumerolles", "Plateau des Fumerolles", "C", 0x7e8a78, 0x4c5448, 0xa8ff8a, 2],
  ["mer_cendres", "Mer de cendres", "B", 0x6b6258, 0x3a342e, 0xff9a4a, 2],
  ["charnier_brumeux", "Charnier brumeux", "B", 0x5a5246, 0x322d26, 0xa8ff6a, 3],
  ["geole_foudre", "Geôle de foudre", "B", 0x4a4e6b, 0x26283a, 0x7adfff, 2],
  ["marais_poix", "Marais de poix", "B", 0x3a3326, 0x1f1a12, 0xffc24a, 2],
  ["desolation_sel", "Désolation de sel", "B", 0xc9c2b0, 0x8a8270, 0xff5a7a, 1],
  ["desert_verre", "Désert de verre", "A", 0xd9c089, 0x6e5a36, 0x4fd6ff, 2],
  ["foret_suspendue", "Forêt suspendue", "A", 0x3d6b4a, 0x1c3324, 0xc8ff7a, 2],
  ["lac_mercure", "Lac de mercure", "A", 0xa7adb5, 0x3f444b, 0xe6f7ff, 1],
  ["cavernes_sel", "Cavernes de sel", "A", 0xe3d6e8, 0x5c4a63, 0xff8fd6, 3],
  ["volcan_endormi", "Volcan endormi", "A", 0x4a3530, 0x231614, 0xff5a1f, 3],
  ["toundra_spectrale", "Toundra spectrale", "A", 0xaebec9, 0x454f5e, 0x9cf0ff, 2],
  ["marais_luminescent", "Marais luminescent", "A", 0x2e4a44, 0x142421, 0x5affc4, 2],
  ["cimetiere_etoiles", "Cimetière des Étoiles", "S", 0x1a1430, 0x0c0a1c, 0x7fe9ff, 2],
  ["ocean_antimatiere", "Océan d'Antimatière", "S", 0x241038, 0x12081f, 0xff3df0, 3],
  ["cathedrale_echos", "Cathédrale des Échos", "S", 0x2b2336, 0x161220, 0xc9a8ff, 2],
  ["desert_verre_hurlant", "Désert de Verre Hurlant", "S", 0x3a2f2a, 0x1d1714, 0xffb347, 1],
  ["jardin_yeux_clos", "Jardin des Yeux Clos", "S", 0x1f2e22, 0x0e1610, 0x9dff5c, 2],
  ["horloge_aion", "Horloge Brisée d'Aïon", "S", 0x2c2418, 0x15110b, 0xffd84a, 3],
  ["abysse_bouches", "Abysse des Bouches Affamées", "S", 0x2a1218, 0x13080a, 0xff4d5e, 2],
  ["trone_dieu_endormi", "Trône du Dieu Endormi", "S", 0x1c1a2e, 0x0d0c18, 0x5cf0d4, 3],
];

function sizeForTier(tier: Tier): { w: number; h: number } {
  const ti = TIERS.indexOf(tier);
  return { w: 1200 + ti * 120, h: 900 + ti * 80 };
}

export const BIOMES: BiomeDef[] = RAW.map(([id, name, tier, ground, wall, accent, dungeons]) => ({
  id,
  name,
  tier,
  palette: { ground, wall, accent },
  size: sizeForTier(tier),
  dungeons,
}));

// Biome central de départ (hub sûr, sans ennemis) — commun à tous, au centre de la carte.
export const SPAWN_BIOME: BiomeDef = {
  id: "spawn",
  name: "Sanctuaire",
  tier: "F",
  palette: { ground: 0x9aa0b5, wall: 0x6a7080, accent: 0xffe9a8 },
  size: { w: 1000, h: 800 },
  dungeons: 0,
  enemyCount: 0,
};

const BY_ID: Record<string, BiomeDef> = Object.fromEntries([SPAWN_BIOME, ...BIOMES].map((b) => [b.id, b]));

export function getBiome(id: string): BiomeDef {
  const b = BY_ID[id];
  if (!b) throw new Error(`Biome inconnu: ${id}`);
  return b;
}
