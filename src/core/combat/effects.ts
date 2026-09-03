// Effets d'armes nommées (catalogue) : effets de statut (DoT/CC), effets à l'impact
// et passifs « tant que l'arme est en main ». Logique pure, appliquée par world.ts.

/** Effet porté par une arme nommée. Voir idea/armes.md pour le mapping arme → effets. */
export type WeaponEffect =
  // — Statuts (appliqués à la cible touchée) —
  | { kind: "burn"; dps: number; duration: number } // brûlure (ne stacke pas, se rafraîchit)
  | { kind: "poison"; dps: number; duration: number } // poison (stacke jusqu'à MAX_POISON_STACKS)
  | { kind: "bleed"; dps: number; duration: number } // saignement (ne stacke pas)
  | { kind: "slow"; duration: number } // ralentit (réutilise Enemy.slowTimer)
  | { kind: "stun"; duration: number; chance?: number } // étourdit (hitstun ; chance 0..1, défaut 1)
  // — À l'impact —
  | { kind: "lifedrain"; pct: number } // soigne le joueur de pct × dégâts
  | { kind: "backstab"; mult: number } // dégâts × mult si la cible est frappée de dos
  | { kind: "bossBonus"; mult: number } // dégâts × mult contre les boss
  | { kind: "shockwave"; radius: number; factor: number; onCrit?: boolean } // onde de choc autour de la cible
  | { kind: "critStun"; duration: number } // coup critique → étourdit TOUS les ennemis (stop temps)
  | { kind: "combo"; perHit: number; max: number } // +perHit (fraction) de dégâts par coup enchaîné (fenêtre COMBO_WINDOW)
  | { kind: "onKillAtk"; pct: number; maxPct: number } // chaque kill → +pct% ATK sur l'instance (plafonné)
  // — Tir (armes à distance) —
  | { kind: "multishot"; count: number } // n projectiles en éventail
  | { kind: "pierce" } // les projectiles transpercent
  | { kind: "homing" } // projectiles guidés vers l'ennemi le plus proche
  | { kind: "autofire" } // tir continu tant que le bouton est maintenu
  // — Passifs en main —
  | { kind: "regen"; hpPerSec: number }
  | { kind: "energize"; energyPerSec: number }
  | { kind: "aura"; damageMul?: number; speedMul?: number }
  | { kind: "selfDrain"; pctPerSec: number }; // perd pct des PV max/s tant que l'arme est en main (armes Ω, snowball risqué)

export type EffectKind = WeaponEffect["kind"];

/** Libellés FR courts (HUD, boutique). */
export const EFFECT_LABEL: Record<EffectKind, string> = {
  burn: "brûlure",
  poison: "poison",
  bleed: "saignement",
  slow: "ralentit",
  stun: "étourdit",
  lifedrain: "drain de vie",
  backstab: "attaque de dos",
  bossBonus: "anti-boss",
  shockwave: "onde de choc",
  critStun: "stop temps (crit)",
  combo: "combo",
  onKillAtk: "rage (kills)",
  multishot: "multi-tir",
  pierce: "transperce",
  homing: "guidé",
  autofire: "tir auto",
  regen: "régénération",
  energize: "focus d'énergie",
  aura: "aura",
  selfDrain: "drain de PV (toi)",
};

/** Sous-ensemble d'effets transportés par un projectile (appliqués quand il touche). */
export const PROJECTILE_CARRIED: EffectKind[] = [
  "burn", "poison", "bleed", "slow", "stun", "lifedrain", "bossBonus", "shockwave", "critStun",
];

export const MAX_POISON_STACKS = 5;
export const COMBO_WINDOW = 2.0; // s entre deux coups pour conserver le combo
const DOT_TICK = 0.5; // s entre deux ticks de dégâts sur la durée

export interface DotState {
  dps: number;
  remaining: number; // durée restante (s)
  stacks: number; // > 1 uniquement pour le poison
  tickTimer: number; // temps avant le prochain tick de dégâts
}

/** Statuts actifs sur une entité (ennemi ou boss). */
export interface StatusState {
  burn?: DotState;
  poison?: DotState;
  bleed?: DotState;
}

export const makeStatus = (): StatusState => ({});

type DotKind = "burn" | "poison" | "bleed";

/** Applique/rafraîchit un DoT. Le poison stacke (dps cumulés), les autres se rafraîchissent au plus fort. */
export function applyDot(st: StatusState, kind: DotKind, dps: number, duration: number): void {
  const cur = st[kind];
  if (!cur) {
    st[kind] = { dps, remaining: duration, stacks: 1, tickTimer: DOT_TICK };
    return;
  }
  if (kind === "poison") {
    cur.stacks = Math.min(MAX_POISON_STACKS, cur.stacks + 1);
    cur.dps = Math.max(cur.dps, dps);
  } else {
    cur.dps = Math.max(cur.dps, dps);
  }
  cur.remaining = Math.max(cur.remaining, duration);
}

/**
 * Avance les DoT de dt et renvoie les dégâts à infliger sur ce pas (entier, 0 si aucun tick).
 * Les dégâts sont délivrés par paquets de DOT_TICK pour ne pas inonder les événements.
 */
export function tickStatus(st: StatusState, dt: number): number {
  let dmg = 0;
  for (const kind of ["burn", "poison", "bleed"] as DotKind[]) {
    const d = st[kind];
    if (!d) continue;
    const step = Math.min(dt, d.remaining);
    d.remaining -= dt;
    d.tickTimer -= step;
    if (d.tickTimer <= 0) {
      dmg += Math.max(1, Math.round(d.dps * d.stacks * DOT_TICK));
      d.tickTimer += DOT_TICK;
    }
    if (d.remaining <= 0) delete st[kind];
  }
  return dmg;
}

export const hasEffect = (fx: WeaponEffect[], kind: EffectKind): boolean => fx.some((e) => e.kind === kind);

export function getEffect<K extends EffectKind>(fx: WeaponEffect[], kind: K): Extract<WeaponEffect, { kind: K }> | null {
  return (fx.find((e) => e.kind === kind) as Extract<WeaponEffect, { kind: K }> | undefined) ?? null;
}

/** Effets qu'un projectile doit transporter jusqu'à l'impact. */
export function projectileEffects(fx: WeaponEffect[]): WeaponEffect[] {
  return fx.filter((e) => PROJECTILE_CARRIED.includes(e.kind));
}
