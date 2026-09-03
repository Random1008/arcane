import { BIOMES, SPAWN_BIOME, getBiome } from "./biomes";
import { Tier, TIERS } from "./combat/weapons";

export interface MapNode {
  biomeId: string;
  tier: Tier;
  x: number;
  y: number;
  ringRadius: number;
}

/**
 * Un biome est débloqué si :
 * - c'est le sanctuaire de départ → toujours ouvert ;
 * - le 1er anneau (rang F) → seulement après avoir visité le Sanctuaire (passage obligatoire) ;
 * - sinon : TOUS les biomes du rang immédiatement inférieur ont été nettoyés (`cleared`).
 */
export function isBiomeUnlocked(biomeId: string, cleared: Set<string>): boolean {
  const biome = getBiome(biomeId);
  if (biome.id === SPAWN_BIOME.id) return true;
  const ti = TIERS.indexOf(biome.tier);
  if (ti <= 0) return cleared.has(SPAWN_BIOME.id); // rang F : nécessite d'être passé par le Sanctuaire
  const prev = TIERS[ti - 1];
  const prevBiomes = BIOMES.filter((b) => b.tier === prev);
  return prevBiomes.length > 0 && prevBiomes.every((b) => cleared.has(b.id));
}

/**
 * Vrai si ce biome est le **dernier non nettoyé de son anneau** : c'est là que le boss du rang
 * apparaît (chaque anneau se termine par un combat de boss, quel que soit l'ordre de visite).
 */
export function isRingFinalBiome(biomeId: string, cleared: Set<string>): boolean {
  if (biomeId === SPAWN_BIOME.id || cleared.has(biomeId)) return false;
  const biome = getBiome(biomeId);
  return BIOMES.filter((b) => b.tier === biome.tier && b.id !== biomeId).every((b) => cleared.has(b.id));
}

export function buildWorldMap(): MapNode[] {
  // biome de départ au centre exact (rayon 0)
  const nodes: MapNode[] = [{ biomeId: SPAWN_BIOME.id, tier: SPAWN_BIOME.tier, x: 0, y: 0, ringRadius: 0 }];
  for (const tier of TIERS) {
    const ids = BIOMES.filter((b) => b.tier === tier).map((b) => b.id);
    const ti = TIERS.indexOf(tier);
    const radius = 100 + ti * 86; // 1er anneau écarté du centre (évite le chevauchement avec le Sanctuaire)
    const n = Math.max(1, ids.length);
    ids.forEach((id, i) => {
      const angle = (i / n) * Math.PI * 2 + ti * 0.6;
      nodes.push({ biomeId: id, tier, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, ringRadius: radius });
    });
  }
  return nodes;
}
