// Visuels (abréviation + couleur) partagés entre la barre d'inventaire et les pickups au sol.
// Indexés par FAMILLE ; les armes nommées du catalogue héritent du visuel de leur famille.
import { familyOf } from "../../core/combat/catalog";

export const WEAPON_ABBR: Record<string, string> = {
  fists: "PG",
  sword: "ÉP",
  dagger: "DG",
  axe: "HA",
  hammer: "MA",
  bow: "AR",
  staff: "BÂ",
  spear: "LA",
  mace: "MS",
  flail: "FL",
  katana: "KA",
  crossbow: "AB",
};

export const WEAPON_COLOR: Record<string, number> = {
  fists: 0xddc0a0,
  sword: 0xc8d2e0,
  dagger: 0x9ad0ff,
  axe: 0xffb066,
  hammer: 0xff7b6b,
  bow: 0x9bff8f,
  staff: 0xc89bff,
  spear: 0xf0e68c,
  mace: 0xd9a066,
  flail: 0xb0879b,
  katana: 0xff9bc8,
  crossbow: 0x6bd9c8,
};

/** Abréviation d'un id d'arme (catalogue → famille). */
export function weaponAbbr(defId: string): string {
  return WEAPON_ABBR[familyOf(defId)] ?? "?";
}

/** Couleur d'un id d'arme (catalogue → famille). */
export function weaponColor(defId: string): number {
  return WEAPON_COLOR[familyOf(defId)] ?? 0xffffff;
}
