import { Tier, TIERS, OmegaMod } from "./weapons";

export interface WeaponInstance {
  defId: string;
  tier: Tier;
  omega?: boolean;
  mod?: OmegaMod;
  killBonus?: number; // % d'ATK gagné par kill (effet onKillAtk, ex. Hache ancienne)
}

export interface Hotbar {
  slots: (WeaponInstance | null)[];
  activeIndex: number;
}

export const HOTBAR_SIZE = 9;

export function createHotbar(defIds: string[], tier: Tier = "F"): Hotbar {
  const slots: (WeaponInstance | null)[] = new Array(HOTBAR_SIZE).fill(null);
  defIds.slice(0, HOTBAR_SIZE).forEach((id, i) => (slots[i] = { defId: id, tier }));
  return { slots, activeIndex: 0 };
}

export function selectSlot(h: Hotbar, i: number): void {
  if (i >= 0 && i < HOTBAR_SIZE) h.activeIndex = i;
}

export function scrollSlot(h: Hotbar, dir: number): void {
  h.activeIndex = (h.activeIndex + dir + HOTBAR_SIZE) % HOTBAR_SIZE;
}

export function activeWeapon(h: Hotbar): WeaponInstance | null {
  return h.slots[h.activeIndex];
}

/** Ajoute une arme au premier slot libre. Renvoie l'index, ou -1 si la barre est pleine. */
export function addWeapon(h: Hotbar, inst: WeaponInstance): number {
  const i = h.slots.findIndex((s) => s === null);
  if (i === -1) return -1;
  h.slots[i] = inst;
  return i;
}

export function cycleTier(h: Hotbar): void {
  const w = activeWeapon(h);
  if (!w) return;
  const idx = TIERS.indexOf(w.tier);
  w.tier = TIERS[(idx + 1) % TIERS.length];
  // reforger le tier retire l'état Ω (une arme Ω est intrinsèquement S)
  w.omega = false;
  w.mod = "none";
}
