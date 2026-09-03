import { Tier, TIERS, TIER_MULT } from "./combat/weapons";

export type ArmorSlot = "casque" | "plastron" | "jambieres" | "bottes" | "gants" | "amulette";
export const ARMOR_SLOTS: ArmorSlot[] = ["casque", "plastron", "jambieres", "bottes", "gants", "amulette"];
export const ARMOR_SLOT_LABEL: Record<ArmorSlot, string> = {
  casque: "Casque",
  plastron: "Plastron",
  jambieres: "Jambières",
  bottes: "Bottes",
  gants: "Gants",
  amulette: "Amulette",
};

export type ArmorType = "light" | "medium" | "heavy";
export const ARMOR_TYPES: ArmorType[] = ["light", "medium", "heavy"];
export const ARMOR_TYPE_LABEL: Record<ArmorType, string> = { light: "Légère", medium: "Moyenne", heavy: "Lourde" };

export type OmegaSet = "chaos" | "temps" | "neant";
export const OMEGA_SETS: OmegaSet[] = ["chaos", "temps", "neant"];
export const SET_LABEL: Record<OmegaSet, string> = { chaos: "Chaos", temps: "Temps", neant: "Néant" };

/** Effet porté par une pièce d'armure (progression par tier, cf. idea/armures.md). */
export type ArmorEffect =
  | { kind: "resist"; pct: number } // réduction de dégâts plate (fraction, cumulée et plafonnée)
  | { kind: "hpRegen"; hpPerSec: number }
  | { kind: "damageBonus"; pct: number } // +dégâts infligés
  | { kind: "dodge"; pct: number }
  | { kind: "critBonus"; add: number }
  | { kind: "speedBonus"; add: number }
  | { kind: "dashBoost"; cooldownMul: number } // <1 = le dash recharge plus vite
  | { kind: "autoBlock"; cooldown: number } // bloque automatiquement 1 attaque toutes les N s
  | { kind: "phase"; interval: number; duration: number } // invisibilité cyclique (duration s toutes les interval s)
  | { kind: "attackSpeed"; add: number } // +vitesse d'attaque (Gants Ω)
  | { kind: "fragile"; pct: number } // +dégâts subis (glass cannon Ω)
  | { kind: "revive" }; // résurrection auto 1×/combat (Armure Ω « Immortel Absolu »)

export type ArmorEffectKind = ArmorEffect["kind"];

export const ARMOR_EFFECT_LABEL: Record<ArmorEffectKind, string> = {
  resist: "résistance",
  hpRegen: "régénération",
  damageBonus: "+dégâts",
  dodge: "esquive",
  critBonus: "+crit",
  speedBonus: "+vitesse",
  dashBoost: "dash boosté",
  autoBlock: "blocage auto",
  phase: "invisibilité",
  attackSpeed: "+vit. attaque",
  fragile: "fragilité",
  revive: "résurrection",
};

/** Description courte d'un effet (UI équipement / boutique / admin). */
export function armorEffectDesc(e: ArmorEffect): string {
  switch (e.kind) {
    case "resist": return `résist ${Math.round(e.pct * 100)}%`;
    case "hpRegen": return `+${e.hpPerSec} PV/s`;
    case "damageBonus": return `+${Math.round(e.pct * 100)}% dégâts`;
    case "dodge": return `esquive ${Math.round(e.pct * 100)}%`;
    case "critBonus": return `+${Math.round(e.add * 100)}% crit`;
    case "speedBonus": return `+${Math.round(e.add * 100)}% vitesse`;
    case "dashBoost": return `dash −${Math.round((1 - e.cooldownMul) * 100)}% recharge`;
    case "autoBlock": return `bloque 1 coup / ${e.cooldown}s`;
    case "phase": return `invisible ${e.duration}s / ${e.interval}s`;
    case "attackSpeed": return `+${Math.round(e.add * 100)}% vit. attaque`;
    case "fragile": return `+${Math.round(e.pct * 100)}% dégâts subis`;
    case "revive": return `résurrection 1×/combat`;
  }
}

export interface ArmorInstance {
  id: number;
  slot: ArmorSlot;
  type: ArmorType;
  tier: Tier;
  defense: number;
  speedMod: number; // additif à la vitesse (léger > 0, lourd < 0)
  critMod: number; // additif au crit (léger > 0)
  set?: OmegaSet; // pièce Ω appartenant à un set
  effects?: ArmorEffect[]; // effets de tier (et effets uniques) — absent sur les vieilles sauvegardes
  unique?: string; // id de pièce unique S ou Ω (nom dédié, effets dédiés)
  name?: string; // nom affiché des pièces uniques
  omega?: boolean; // pièce Ω unique (endgame) : effets « cheat », au-dessus des uniques S
}

const TYPE_DEF: Record<ArmorType, number> = { light: 5, medium: 10, heavy: 16 };
const TYPE_SPEED: Record<ArmorType, number> = { light: 0.06, medium: 0, heavy: -0.08 };
const TYPE_CRIT: Record<ArmorType, number> = { light: 0.03, medium: 0.01, heavy: 0 };

/**
 * Effets conférés par le tier d'une pièce (PAR PIÈCE — 6 pièces cumulent).
 * Progression : F rien · E résistance · D + regen léger · C + bonus de type (vitesse/crit/résist)
 * · B + dégâts/regen · A buffs multiples · S (générique) gros bonus.
 */
export function tierArmorEffects(tier: Tier, type: ArmorType): ArmorEffect[] {
  const ti = TIERS.indexOf(tier);
  const fx: ArmorEffect[] = [];
  if (ti >= 1) fx.push({ kind: "resist", pct: 0.01 + (ti - 1) * 0.005 }); // E 1% → S 3.5%
  if (ti >= 2) fx.push({ kind: "hpRegen", hpPerSec: 0.3 + (ti - 2) * 0.15 }); // D 0.3 → S 0.9
  if (ti >= 3) {
    // C : bonus selon le type de la pièce
    if (type === "light") fx.push({ kind: "speedBonus", add: 0.015 });
    else if (type === "medium") fx.push({ kind: "critBonus", add: 0.01 });
    else fx.push({ kind: "resist", pct: 0.01 });
  }
  if (ti >= 4) fx.push({ kind: "damageBonus", pct: 0.02 + (ti - 4) * 0.01 }); // B 2% → S 4%
  if (ti >= 5) fx.push({ kind: "critBonus", add: 0.01 }); // A : boost de stats supplémentaire
  return fx;
}

export function makeArmor(id: number, slot: ArmorSlot, type: ArmorType, tier: Tier, set?: OmegaSet): ArmorInstance {
  const setMul = set ? 1.5 : 1;
  return {
    id,
    slot,
    type,
    tier,
    defense: Math.round(TYPE_DEF[type] * TIER_MULT[tier] * setMul),
    speedMod: TYPE_SPEED[type],
    critMod: TYPE_CRIT[type],
    set,
    // les pièces de set Ω portent leurs bonus de set (déf ×1.5 + paliers 2/4/6), pas les effets de tier
    effects: set ? [] : tierArmorEffects(tier, type),
  };
}

// — Pièces uniques S (boss de rang S) : effets dédiés, pas de set —
export interface UniqueArmorDef {
  uid: string;
  name: string;
  slot: ArmorSlot;
  type: ArmorType;
  effects: ArmorEffect[];
  desc: string;
}

export const UNIQUE_ARMORS: UniqueArmorDef[] = [
  { uid: "casque_absolu", name: "Casque absolu", slot: "casque", type: "medium",
    effects: [{ kind: "critBonus", add: 0.25 }], desc: "vision des points faibles : +25% crit" },
  { uid: "armure_chaos", name: "Armure chaos", slot: "plastron", type: "heavy",
    effects: [{ kind: "hpRegen", hpPerSec: 2 }, { kind: "resist", pct: 0.1 }], desc: "régén 2 PV/s + résist 10%" },
  { uid: "armure_dimensionnelle", name: "Armure dimensionnelle", slot: "plastron", type: "heavy",
    effects: [{ kind: "resist", pct: 0.25 }], desc: "réduction de dégâts énorme (25%)" },
  { uid: "bottes_temporelles", name: "Bottes temporelles", slot: "bottes", type: "light",
    effects: [{ kind: "dashBoost", cooldownMul: 0.4 }, { kind: "speedBonus", add: 0.05 }], desc: "dash recharge −60% + vitesse" },
  { uid: "gants_cosmiques", name: "Gants cosmiques", slot: "gants", type: "light",
    effects: [{ kind: "critBonus", add: 0.15 }, { kind: "speedBonus", add: 0.05 }], desc: "+15% crit + vitesse" },
  { uid: "cape_infinie", name: "Cape infinie", slot: "amulette", type: "light",
    effects: [{ kind: "phase", interval: 8, duration: 1.5 }, { kind: "dodge", pct: 0.1 }], desc: "invisible 1.5s toutes les 8s + esquive" },
  { uid: "bouclier_eternel", name: "Bouclier éternel", slot: "amulette", type: "heavy",
    effects: [{ kind: "autoBlock", cooldown: 4 }, { kind: "resist", pct: 0.05 }], desc: "bloque 1 attaque / 4s + résist" },
];

export function uniqueArmorDef(uid: string): UniqueArmorDef | null {
  return UNIQUE_ARMORS.find((u) => u.uid === uid) ?? null;
}

/** Fabrique une pièce unique S : défense renforcée (×1.6), effets dédiés (pas d'effets de tier). */
export function makeUniqueArmor(id: number, def: UniqueArmorDef): ArmorInstance {
  return {
    id,
    slot: def.slot,
    type: def.type,
    tier: "S",
    defense: Math.round(TYPE_DEF[def.type] * TIER_MULT.S * 1.6),
    speedMod: TYPE_SPEED[def.type],
    critMod: TYPE_CRIT[def.type],
    effects: def.effects,
    unique: def.uid,
    name: def.name,
  };
}

// — Pièces Ω uniques (endgame : effets « cheat mais fun », cf. idea/a-implementer) —
export const OMEGA_ARMORS: UniqueArmorDef[] = [
  { uid: "immortel_absolu", name: "Immortel Absolu (Ω)", slot: "plastron", type: "heavy",
    effects: [{ kind: "resist", pct: 0.4 }, { kind: "hpRegen", hpPerSec: 6 }, { kind: "revive" }, { kind: "speedBonus", add: -0.2 }],
    desc: "régén massive, ressuscite 1×/combat, −40% dégâts subis (mais −20% vitesse)" },
  { uid: "voile_du_neant", name: "Voile du Néant (Ω)", slot: "amulette", type: "light",
    effects: [{ kind: "phase", interval: 5, duration: 2 }, { kind: "damageBonus", pct: 0.5 }, { kind: "dodge", pct: 0.1 }],
    desc: "invisible 2s toutes les 5s + 50% dégâts" },
  { uid: "flash_dimensionnel", name: "Flash Dimensionnel (Ω)", slot: "bottes", type: "light",
    effects: [{ kind: "dashBoost", cooldownMul: 0.2 }, { kind: "dodge", pct: 0.5 }, { kind: "speedBonus", add: 0.1 }],
    desc: "dash quasi infini, +50% esquive, +vitesse" },
  { uid: "fureur_cosmique", name: "Fureur Cosmique (Ω)", slot: "gants", type: "light",
    effects: [{ kind: "attackSpeed", add: 0.7 }, { kind: "critBonus", add: 0.3 }, { kind: "damageBonus", pct: 0.2 }, { kind: "fragile", pct: 0.15 }],
    desc: "+70% vitesse d'attaque, +30% crit, +dégâts (mais +15% dégâts subis)" },
  { uid: "vision_divine", name: "Vision Divine (Ω)", slot: "casque", type: "medium",
    effects: [{ kind: "critBonus", add: 0.4 }, { kind: "damageBonus", pct: 0.1 }],
    desc: "points faibles : +40% crit + dégâts" },
  { uid: "rempart_infini", name: "Rempart Infini (Ω)", slot: "amulette", type: "heavy",
    effects: [{ kind: "autoBlock", cooldown: 3 }, { kind: "resist", pct: 0.15 }, { kind: "attackSpeed", add: -0.2 }],
    desc: "bloque 1 attaque toutes les 3s + résist (mais attaque plus lente)" },
];

export function omegaArmorDef(uid: string): UniqueArmorDef | null {
  return OMEGA_ARMORS.find((u) => u.uid === uid) ?? null;
}

/** Fabrique une pièce Ω unique : défense ×2.2, effets « cheat », marquée omega. */
export function makeOmegaArmor(id: number, def: UniqueArmorDef): ArmorInstance {
  return {
    id,
    slot: def.slot,
    type: def.type,
    tier: "S",
    defense: Math.round(TYPE_DEF[def.type] * TIER_MULT.S * 2.2),
    speedMod: TYPE_SPEED[def.type],
    critMod: TYPE_CRIT[def.type],
    effects: def.effects,
    unique: def.uid,
    name: def.name,
    omega: true,
  };
}

export function makeEmptyArmor(): Record<ArmorSlot, ArmorInstance | null> {
  return { casque: null, plastron: null, jambieres: null, bottes: null, gants: null, amulette: null };
}
