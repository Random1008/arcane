import { Tier, TIERS } from "./combat/weapons";

/**
 * Modificateurs de donjon (tranche L) — backlog `donjons.md` (« modificateurs/malédictions ») :
 * chaque donjon peut être généré avec une malédiction/bénédiction qui change sa saveur.
 */

export interface DungeonModDef {
  id: string;
  name: string;
  enemyHpMul?: number;
  enemyDmgMul?: number;
  enemyCountMul?: number;
  goldMul?: number;
  lootMul?: number;
  /** +1 = coffres meilleurs. */
  chestRankBonus?: number;
  /** Drain de vie constant du joueur (malédiction). */
  playerDps?: number;
  /** < 1 = joueur ralenti. */
  playerSpeedMul?: number;
}

export const DUNGEON_MODS: DungeonModDef[] = [
  // — légers (F/E) —
  { id: "maudit", name: "Maudit", enemyHpMul: 1.5 },
  { id: "gele", name: "Gelé", playerSpeedMul: 0.85 },
  // — moyens (D/C) —
  { id: "sanglant", name: "Sanglant", enemyDmgMul: 1.3, goldMul: 1.5 },
  { id: "opulent", name: "Opulent", chestRankBonus: 1, enemyHpMul: 1.2 },
  // — lourds (B/A) —
  { id: "corrompu", name: "Corrompu", playerDps: 3, enemyHpMul: 1.3, enemyDmgMul: 1.2 },
  // — rare bonus pur (tous rangs, plus rare) —
  { id: "benediction", name: "Bénédiction", lootMul: 1.5, enemyHpMul: 0.9 },
];

/** Chance qu'un donjon ait un modificateur. */
export const DUNGEON_MOD_CHANCE = 0.75;

export function getDungeonMod(id: string): DungeonModDef | null {
  return DUNGEON_MODS.find((m) => m.id === id) ?? null;
}

/** Mods accessibles selon le rang du biome (légers → lourds). */
export function modsForTier(tier: Tier): DungeonModDef[] {
  const ti = TIERS.indexOf(tier);
  const out: DungeonModDef[] = [];
  for (const m of DUNGEON_MODS) {
    if (m.id === "benediction") {
      out.push(m); // bonus pur accessible partout (pondéré rare par rollDungeonMod)
    } else if (m.id === "corrompu") {
      if (ti >= 4) out.push(m); // B/A/S
    } else if (m.id === "sanglant" || m.id === "opulent") {
      if (ti >= 2) out.push(m); // D/C/B/A/S
    } else {
      out.push(m); // maudit + gele : tous rangs
    }
  }
  return out;
}

/**
 * Tire le modificateur d'un donjon pour un biome de rang `tier`.
 * `benediction` est 3× moins probable que les autres (bonus pur). Renvoie null si pas de mod.
 */
export function rollDungeonMod(tier: Tier, rng: () => number): string | null {
  if (rng() > DUNGEON_MOD_CHANCE) return null;
  const pool = modsForTier(tier);
  const weights = pool.map((m) => (m.id === "benediction" ? 1 : 3));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i].id;
  }
  return pool[pool.length - 1].id;
}

/** Dégâts par tick du drain (`playerDps`) — même cadence que le DoT d'événement. */
export const DRAIN_INTERVAL = 0.5;
