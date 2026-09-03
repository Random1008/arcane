import { ArmorInstance, ArmorSlot, ARMOR_SLOTS, OmegaSet, OMEGA_SETS, SET_LABEL } from "./armor";

/** Effets cumulés conférés par l'armure équipée (défense + effets de pièces + bonus de set Ω). */
export interface PlayerMods {
  defense: number; // réduction de dégâts (100/(100+def))
  damageMul: number; // dégâts du joueur (×)
  enemySpeedMul: number; // vitesse des ennemis (×, set Temps)
  dodge: number; // proba d'esquive (set Néant, effets d'armure)
  speedMul: number; // vitesse du joueur (×, type d'armure)
  critAdd: number; // bonus de crit additif (type d'armure)
  lifesteal: number; // fraction des dégâts infligés rendue en PV (arbre)
  hpRegen: number; // PV/s (effets d'armure)
  flatResist: number; // réduction de dégâts plate (fraction, plafonnée — effets d'armure)
  dashCooldownMul: number; // recharge du dash (× ; <1 = plus vite — Bottes temporelles)
  autoBlockCooldown: number; // bloque 1 attaque toutes les N s (0 = aucun — Bouclier éternel)
  phase: { interval: number; duration: number } | null; // invisibilité cyclique (Cape infinie)
  attackSpeedMul: number; // vitesse d'attaque (× — Gants Ω « Fureur Cosmique »)
  incomingMul: number; // multiplicateur de dégâts subis (>1 = plus fragile — glass cannon Ω)
  revive: boolean; // résurrection auto 1×/combat (Armure Ω « Immortel Absolu »)
}

export const FLAT_RESIST_CAP = 0.6; // anti-invincibilité (cumul des résistances plates)

interface SetTierBonus {
  damageMul?: number; // additif (0.15 = +15%)
  enemySpeedMul?: number; // additif négatif (-0.1 = −10%)
  dodge?: number;
  defenseBonus?: number;
  desc: string;
}

export const SET_TIERS = [2, 4, 6];

// Valeurs TOTALES au palier atteint (le plus haut palier ≤ nombre de pièces s'applique).
export const SET_BONUSES: Record<OmegaSet, Record<number, SetTierBonus>> = {
  chaos: {
    2: { damageMul: 0.15, desc: "Chaos (2) : +15% dégâts" },
    4: { damageMul: 0.3, desc: "Chaos (4) : +30% dégâts" },
    6: { damageMul: 0.6, desc: "Chaos (6) : +60% dégâts" },
  },
  temps: {
    2: { enemySpeedMul: -0.1, desc: "Temps (2) : ennemis −10% vitesse" },
    4: { enemySpeedMul: -0.25, desc: "Temps (4) : ennemis −25% vitesse" },
    6: { enemySpeedMul: -0.45, desc: "Temps (6) : ennemis −45% vitesse" },
  },
  neant: {
    2: { dodge: 0.1, desc: "Néant (2) : 10% esquive" },
    4: { dodge: 0.2, desc: "Néant (4) : 20% esquive" },
    6: { dodge: 0.35, defenseBonus: 30, desc: "Néant (6) : 35% esquive, +30 défense" },
  },
};

function setCounts(armor: Record<ArmorSlot, ArmorInstance | null>): Record<OmegaSet, number> {
  const c: Record<OmegaSet, number> = { chaos: 0, temps: 0, neant: 0 };
  for (const slot of ARMOR_SLOTS) {
    const a = armor[slot];
    if (a?.set) c[a.set]++;
  }
  return c;
}

/** Palier de set atteint (0 si aucun) selon le nombre de pièces. */
function reachedTier(count: number): number {
  let t = 0;
  for (const thr of SET_TIERS) if (count >= thr) t = thr;
  return t;
}

export function computePlayerMods(armor: Record<ArmorSlot, ArmorInstance | null>): PlayerMods {
  let defense = 0;
  let damageMul = 1;
  let enemySpeedMul = 1;
  let dodge = 0;
  let speedMul = 1;
  let critAdd = 0;
  let hpRegen = 0;
  let flatResist = 0;
  let dashCooldownMul = 1;
  let autoBlockCooldown = 0;
  let phase: PlayerMods["phase"] = null;
  let attackSpeedMul = 1;
  let incomingMul = 1;
  let revive = false;
  for (const slot of ARMOR_SLOTS) {
    const a = armor[slot];
    if (!a) continue;
    defense += a.defense;
    speedMul += a.speedMod;
    critAdd += a.critMod;
    for (const e of a.effects ?? []) {
      // effets de pièce (tiers E→S + pièces uniques S + pièces Ω uniques)
      switch (e.kind) {
        case "resist": flatResist += e.pct; break;
        case "hpRegen": hpRegen += e.hpPerSec; break;
        case "damageBonus": damageMul += e.pct; break;
        case "dodge": dodge += e.pct; break;
        case "critBonus": critAdd += e.add; break;
        case "speedBonus": speedMul += e.add; break;
        case "dashBoost": dashCooldownMul = Math.min(dashCooldownMul, e.cooldownMul); break;
        case "autoBlock": autoBlockCooldown = autoBlockCooldown === 0 ? e.cooldown : Math.min(autoBlockCooldown, e.cooldown); break;
        case "phase": if (!phase || e.duration / e.interval > phase.duration / phase.interval) phase = { interval: e.interval, duration: e.duration }; break;
        case "attackSpeed": attackSpeedMul += e.add; break;
        case "fragile": incomingMul += e.pct; break;
        case "revive": revive = true; break;
      }
    }
  }
  const counts = setCounts(armor);
  for (const set of OMEGA_SETS) {
    const thr = reachedTier(counts[set]);
    if (thr === 0) continue;
    const b = SET_BONUSES[set][thr];
    damageMul += b.damageMul ?? 0;
    enemySpeedMul += b.enemySpeedMul ?? 0;
    dodge += b.dodge ?? 0;
    defense += b.defenseBonus ?? 0;
  }
  return {
    defense,
    damageMul,
    enemySpeedMul: Math.max(0.2, enemySpeedMul),
    dodge: Math.min(0.8, dodge),
    speedMul: Math.max(0.5, speedMul),
    critAdd,
    lifesteal: 0,
    hpRegen,
    flatResist: Math.min(FLAT_RESIST_CAP, flatResist),
    dashCooldownMul: Math.max(0.2, dashCooldownMul),
    autoBlockCooldown,
    phase,
    attackSpeedMul,
    incomingMul,
    revive,
  };
}

/** Descriptions des bonus de set actuellement actifs (pour l'UI). */
export function activeSetDescriptions(armor: Record<ArmorSlot, ArmorInstance | null>): string[] {
  const counts = setCounts(armor);
  const out: string[] = [];
  for (const set of OMEGA_SETS) {
    const thr = reachedTier(counts[set]);
    if (thr > 0) out.push(SET_BONUSES[set][thr].desc);
    else if (counts[set] > 0) out.push(`${SET_LABEL[set]} : ${counts[set]}/2 pièces`);
  }
  return out;
}

/** Facteur de réduction de dégâts (1 = aucun). Plancher à 0.30 → 70% de réduction max (anti-invincibilité). */
export function damageReduction(defense: number): number {
  return Math.max(0.3, 100 / (100 + defense));
}

/**
 * Facteur appliqué aux dégâts ENTRANTS du joueur : défense (plancher 0.30) × résistance plate
 * (plafond 60%). Pire cas combiné : ~12% des dégâts bruts.
 */
export function incomingDamageFactor(mods: PlayerMods): number {
  return damageReduction(mods.defense) * (1 - mods.flatResist) * mods.incomingMul;
}
