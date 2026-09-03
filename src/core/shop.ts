import { Tier, TIERS } from "./combat/weapons";
import { weaponsOfTier, randomWeaponIdOfTier } from "./combat/catalog";
import { addWeapon } from "./combat/hotbar";
import { ArmorSlot, ArmorType, ARMOR_SLOTS, ARMOR_TYPES, makeArmor } from "./armor";
import { Player } from "./world";
import { BALANCE } from "./balance";

const TIER_VALUE: Record<Tier, number> = { F: 15, E: 30, D: 55, C: 90, B: 140, A: 210, S: 300 };

export function itemValue(tier: Tier, omega = false): number {
  return Math.round(TIER_VALUE[tier] * (omega ? 5 : 1) * BALANCE.shopPriceMult);
}

export function sellValueOf(tier: Tier, omega = false): number {
  return Math.floor(itemValue(tier, omega) * 0.4);
}

/** Tier « rare » = 2 crans au-dessus du joueur, plafonné à S. */
export function rareTier(playerTier: Tier): Tier {
  return TIERS[Math.min(TIERS.length - 1, TIERS.indexOf(playerTier) + 2)];
}

export interface ShopItem {
  id: number;
  kind: "weapon" | "armor";
  defId?: string;
  slot?: ArmorSlot;
  type?: ArmorType;
  tier: Tier;
  price: number;
  stock: number;
}

export interface Shop {
  fixed: ShopItem[];
  daily: ShopItem[];
}

/** Or gagné par kill, scalé par le rang du biome. */
export function goldReward(tier: Tier): number {
  return Math.round((3 + TIERS.indexOf(tier) * 3) * BALANCE.goldMult);
}
export function bossGoldReward(tier: Tier): number {
  return Math.round(60 * (1 + TIERS.indexOf(tier)) * BALANCE.goldMult);
}

/** Index de jour calendaire (UTC). */
export function dayIndex(nowMs: number): number {
  return Math.floor(nowMs / 86400000);
}

/** RNG déterministe seedé par le jour → boutique stable sur la journée, rerollée le lendemain. */
function dayRng(day: number): () => number {
  let s = (day * 2654435761) >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Génère la boutique du jour : rayon fixe (armes au tier joueur) + rayon journalier (20% rares). */
export function generateShop(playerTier: Tier, day: number): Shop {
  const rng = dayRng(day);
  const rare = rareTier(playerTier);

  // rayon fixe : 6 armes nommées du tier du joueur (sélection stable sur la journée)
  const tierPool = weaponsOfTier(playerTier);
  const start = Math.floor(rng() * tierPool.length);
  const fixed: ShopItem[] = Array.from({ length: 6 }, (_, i) => {
    const w = tierPool[(start + i) % tierPool.length];
    return { id: 1000 + i, kind: "weapon" as const, defId: w.id, tier: playerTier, price: itemValue(playerTier), stock: 1 };
  });

  const daily: ShopItem[] = [];
  for (let i = 0; i < 6; i++) {
    const tier = rng() < 0.2 ? rare : playerTier; // 20% « rare » (joueur + 2, max S)
    if (rng() < 0.5) {
      daily.push({ id: 2000 + i, kind: "weapon", defId: randomWeaponIdOfTier(tier, rng), tier, price: itemValue(tier), stock: 1 });
    } else {
      const slot = ARMOR_SLOTS[Math.floor(rng() * ARMOR_SLOTS.length)];
      const type = ARMOR_TYPES[Math.floor(rng() * ARMOR_TYPES.length)];
      daily.push({ id: 2000 + i, kind: "armor", slot, type, tier, price: itemValue(tier), stock: 1 });
    }
  }
  return { fixed, daily };
}

let armorCounter = 90000;

/** Achète un objet (or suffisant + stock + barre non pleine pour une arme). */
export function buyItem(player: Player, item: ShopItem): boolean {
  if (item.stock <= 0 || player.gold < item.price) return false;
  if (item.kind === "weapon") {
    const slot = addWeapon(player.hotbar, { defId: item.defId!, tier: item.tier });
    if (slot < 0) return false; // barre pleine
  } else {
    player.armorInv.push(makeArmor(armorCounter++, item.slot!, item.type!, item.tier));
  }
  player.gold -= item.price;
  item.stock -= 1;
  return true;
}

/** Vend l'arme d'un slot (sauf Poings). Renvoie l'or gagné (0 si rien). */
export function sellWeapon(player: Player, slot: number): number {
  const inst = player.hotbar.slots[slot];
  if (!inst || slot === 0 || inst.defId === "fists") return 0;
  const gold = sellValueOf(inst.tier, inst.omega);
  player.gold += gold;
  player.hotbar.slots[slot] = null;
  if (player.hotbar.activeIndex === slot) player.hotbar.activeIndex = 0; // repli sur les Poings
  return gold;
}

/** Vend une armure de l'inventaire. Renvoie l'or gagné (0 si rien). */
export function sellArmor(player: Player, invIndex: number): number {
  const a = player.armorInv[invIndex];
  if (!a) return 0;
  const gold = sellValueOf(a.tier, !!(a.set || a.omega || a.unique)); // set Ω / unique S / Ω → prix Ω
  player.gold += gold;
  player.armorInv.splice(invIndex, 1);
  return gold;
}
