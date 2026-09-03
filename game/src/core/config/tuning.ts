export interface Tuning {
  move: { maxSpeed: number; accel: number; friction: number };
  dash: { distance: number; duration: number; iframes: number; cooldown: number };
  blink: { range: number; cooldown: number; energyCost: number };
  melee: {
    damage: number;
    range: number;
    arcDeg: number;
    windup: number;
    active: number;
    recovery: number;
    cadence: number;
    knockback: number;
  };
  ranged: { damage: number; projectileSpeed: number; lifetime: number; cadence: number };
  resources: { maxHp: number; maxEnergy: number; energyRegen: number };
  chaser: { speed: number; contactDamage: number; contactCadence: number };
}

export const DEFAULT_TUNING: Tuning = {
  move: { maxSpeed: 220, accel: 2000, friction: 1800 },
  dash: { distance: 180, duration: 0.18, iframes: 0.25, cooldown: 0.8 },
  blink: { range: 220, cooldown: 3, energyCost: 20 },
  melee: { damage: 15, range: 60, arcDeg: 90, windup: 0.06, active: 0.08, recovery: 0.12, cadence: 0.4, knockback: 180 },
  ranged: { damage: 8, projectileSpeed: 480, lifetime: 1.2, cadence: 0.25 },
  resources: { maxHp: 100, maxEnergy: 100, energyRegen: 12 },
  chaser: { speed: 120, contactDamage: 5, contactCadence: 0.6 },
};
