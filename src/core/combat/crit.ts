export interface DamageRoll {
  amount: number;
  crit: boolean;
}

export function rollDamage(baseAtk: number, critChance: number, critDamage: number, rng: () => number): DamageRoll {
  const crit = rng() < critChance;
  const amount = Math.round(baseAtk * (crit ? critDamage : 1));
  return { amount, crit };
}
