import { Player } from "./world";
import { ArmorInstance } from "./armor";

/** Équipe une pièce de l'inventaire dans son slot (l'ancienne pièce retourne à l'inventaire). */
export function equipArmor(player: Player, invIndex: number): boolean {
  const piece = player.armorInv[invIndex];
  if (!piece) return false;
  player.armorInv.splice(invIndex, 1);
  const prev = player.armor[piece.slot];
  player.armor[piece.slot] = piece;
  if (prev) player.armorInv.push(prev);
  return true;
}

/** Déséquipe le slot et renvoie la pièce à l'inventaire. */
export function unequipArmor(player: Player, slot: ArmorInstance["slot"]): boolean {
  const cur = player.armor[slot];
  if (!cur) return false;
  player.armor[slot] = null;
  player.armorInv.push(cur);
  return true;
}
