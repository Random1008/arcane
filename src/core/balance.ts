/**
 * Réglages d'équilibrage **mutables en direct**, lus par loot/shop/world.
 * Les valeurs par défaut reproduisent exactement le comportement d'origine (multiplicateurs à 1).
 */
export interface Balance {
  dropChance: number; // proba de drop d'arme à la mort d'un ennemi
  omganiumMult: number; // multiplicateur sur la proba d'Omganium
  shopPriceMult: number; // multiplicateur des prix de boutique
  enemyHpMult: number; // multiplicateur de PV des ennemis (difficulté)
  enemyDamageMult: number; // multiplicateur de dégâts des ennemis
  goldMult: number; // multiplicateur d'or gagné
  xpMult: number; // multiplicateur d'XP gagnée
}

export const BALANCE_DEFAULTS: Balance = {
  dropChance: 0.35,
  omganiumMult: 1,
  shopPriceMult: 1,
  enemyHpMult: 1,
  enemyDamageMult: 1,
  goldMult: 1,
  xpMult: 1,
};

export const BALANCE: Balance = { ...BALANCE_DEFAULTS };

export const BALANCE_KEYS = Object.keys(BALANCE_DEFAULTS) as (keyof Balance)[];

// Bornes par clé : on autorise 0 (annuler un effet) mais pas les valeurs négatives ni absurdes.
const CLAMP: Record<keyof Balance, [number, number]> = {
  dropChance: [0, 1],
  omganiumMult: [0, 1000],
  shopPriceMult: [0, 1000],
  enemyHpMult: [0, 1000],
  enemyDamageMult: [0, 1000],
  goldMult: [0, 1000],
  xpMult: [0, 1000],
};

/** Applique un patch : seules les clés connues, valeurs finies, bornées (anti dégâts négatifs/NaN). */
export function setBalance(patch: Partial<Balance>): void {
  for (const k of BALANCE_KEYS) {
    const v = patch[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      const [lo, hi] = CLAMP[k];
      BALANCE[k] = Math.min(hi, Math.max(lo, v));
    }
  }
}

export function resetBalance(): void {
  Object.assign(BALANCE, BALANCE_DEFAULTS);
}
