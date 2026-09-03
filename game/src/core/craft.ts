import { Player } from "./world";
import { activeWeapon } from "./combat/hotbar";
import { OMEGA_MODS } from "./combat/weapons";

export type CraftResult = "ok" | "no-weapon" | "already-omega" | "not-s" | "no-omganium";

export const OMGANIUM_COST = 1;

/**
 * Transforme l'arme active en arme Ω si elle est de tier S (non-omega) et qu'on a assez d'Omganium.
 * Consomme l'Omganium et applique un modificateur aléatoire.
 */
export function craftOmega(player: Player, rng: () => number): CraftResult {
  const inst = activeWeapon(player.hotbar);
  if (!inst) return "no-weapon";
  if (inst.omega) return "already-omega";
  if (inst.tier !== "S") return "not-s";
  if (player.omganium < OMGANIUM_COST) return "no-omganium";
  player.omganium -= OMGANIUM_COST;
  inst.omega = true;
  inst.mod = OMEGA_MODS[Math.floor(rng() * OMEGA_MODS.length)];
  player.omegaUnlocked = true;
  return "ok";
}
