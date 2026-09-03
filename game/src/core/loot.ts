import { Tier } from "./combat/weapons";
import { BALANCE } from "./balance";

export type Rarity = "F" | "E" | "D" | "C" | "B" | "A" | "S" | "omega";

export const RARITIES: Rarity[] = ["F", "E", "D", "C", "B", "A", "S", "omega"];
const BASE_WEIGHTS = [40, 25, 15, 10, 6, 3, 1, 0.3];

/** Tirage pondéré d'une rareté. `biasLevel` (rang du biome 0..6) et `pity` décalent vers le haut. */
export function rollRarity(rng: () => number, biasLevel: number, pity: number): Rarity {
  biasLevel = Math.min(6, Math.max(0, biasLevel)); // contrat 0..6 (coffres de boss = rang+2 sinon hors plage)
  const k = 1 + biasLevel * 0.35 + pity * 0.05;
  const weights = BASE_WEIGHTS.map((w, r) => w * Math.pow(k, r));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return RARITIES[i];
  }
  return RARITIES[RARITIES.length - 1];
}

export function isRare(r: Rarity): boolean {
  return r === "A" || r === "S" || r === "omega";
}

/** Rang minimal pour drop de l'Omganium : A (index 5). Impossible avant. */
export const OMGANIUM_MIN_RANK = 5;

/**
 * Probabilité de drop d'**Omganium** (ressource Ω rare). **Impossible avant le rang A** ; au-delà,
 * croît avec la difficulté du biome (`biasLevel` = rang 0..6).
 */
export function omganiumChance(biasLevel: number, source: "enemy" | "boss" | "chest"): number {
  const ti = Math.min(6, Math.max(0, biasLevel));
  if (ti < OMGANIUM_MIN_RANK) return 0; // rien avant le rang A
  const base = source === "boss" ? 0.2 + (ti - 5) * 0.1 : source === "chest" ? 0.17 + (ti - 5) * 0.1 : 0.002 + ti * 0.003;
  return base * BALANCE.omganiumMult; // boss A20%/S30%, coffre A17%/S27%, ennemi très rare — ×réglage admin
}

/** Convertit une rareté en (tier d'arme, omega). Ω = arme S + drapeau omega. */
export function rarityToWeaponTier(r: Rarity): { tier: Tier; omega: boolean } {
  if (r === "omega") return { tier: "S", omega: true };
  return { tier: r, omega: false };
}
