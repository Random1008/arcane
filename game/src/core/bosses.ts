import { Tier } from "./combat/weapons";
import { TIER_SCALING } from "./biomes";

export type PatternKind = "volley" | "ring" | "charge" | "summon" | "aoe";

export interface PhaseDef {
  patterns: PatternKind[];
}

export interface BossDef {
  id: string;
  name: string;
  tier: Tier;
  biomeId: string;
  intro: string;
  phases: PhaseDef[];
}

// 1 biome-boss par rang (gardé par le boss du rang)
export const BOSS_BIOME: Record<Tier, string> = {
  F: "cave",
  E: "dark_woods",
  D: "toxic_marsh",
  C: "ruins",
  B: "volcano",
  A: "abyss",
  S: "trone_dieu_endormi",
};

const ph = (...patterns: PatternKind[][]): PhaseDef[] => patterns.map((p) => ({ patterns: p }));

// Données générées (workflow gen-bosses) : nom + intro + composition de phases.
export const BOSSES: BossDef[] = [
  { id: "cave", biomeId: "cave", tier: "F", name: "Gloutombre, le Ver des Cavernes", intro: "La pierre se souvient de chaque os qu'elle a broyé... le tien sera le prochain.", phases: ph(["volley"], ["volley", "charge"]) },
  { id: "dark_woods", biomeId: "dark_woods", tier: "E", name: "Croc-Sylve, l'Alpha aux Cent Yeux", intro: "La meute a faim, et les arbres ne diront rien de ta disparition.", phases: ph(["volley", "summon"], ["volley", "summon", "charge"]) },
  { id: "toxic_marsh", biomeId: "toxic_marsh", tier: "D", name: "Pestileck, la Reine des Vapeurs Acides", intro: "Respire profondément, petit être... chaque souffle te dissout un peu plus.", phases: ph(["volley", "aoe"], ["volley", "aoe", "summon"], ["ring", "aoe", "charge", "summon"]) },
  { id: "ruins", biomeId: "ruins", tier: "C", name: "Khaost-Râ, le Gardien Brisé des Ruines", intro: "Mille ans de garde, et nul n'a franchi mon seuil... toi non plus.", phases: ph(["volley", "charge"], ["volley", "ring", "aoe"], ["ring", "aoe", "charge", "summon"]) },
  { id: "volcano", biomeId: "volcano", tier: "B", name: "Pyrokhar, l'Incendie Vivant", intro: "La lave fut mon berceau, elle sera ton tombeau de cendres.", phases: ph(["volley", "aoe"], ["ring", "aoe", "charge"], ["ring", "volley", "aoe", "charge", "summon"]) },
  { id: "abyss", biomeId: "abyss", tier: "A", name: "Nyxgouffre, le Dévoreur des Ténèbres", intro: "Plonge dans le noir... là où même ton ombre t'abandonne.", phases: ph(["ring", "summon"], ["ring", "volley", "aoe", "charge"], ["ring", "volley", "aoe", "charge", "summon"]) },
  { id: "trone_dieu_endormi", biomeId: "trone_dieu_endormi", tier: "S", name: "Aïon-Thanos, le Dieu Endormi qui s'Éveille", intro: "J'ai rêvé la création... et à mon réveil, je rêverai sa fin.", phases: ph(["ring", "aoe", "summon"], ["ring", "volley", "aoe", "charge"], ["ring", "volley", "aoe", "charge", "summon"]) },
];

const BY_BIOME: Record<string, BossDef> = Object.fromEntries(BOSSES.map((b) => [b.biomeId, b]));

export function bossForBiome(biomeId: string): BossDef | null {
  return BY_BIOME[biomeId] ?? null;
}

/** Définition de boss correspondant à un rang (pour les mini-boss de donjon). */
export function bossForTier(tier: Tier): BossDef {
  return BOSSES.find((b) => b.tier === tier) ?? BOSSES[0];
}

export const BASE_BOSS_HP = 400;

export interface ResolvedBossStats {
  maxHp: number;
  contactDamage: number;
  projDamage: number;
  aoeDamage: number;
  radius: number;
}

export function resolveBossStats(tier: Tier): ResolvedBossStats {
  const sc = TIER_SCALING[tier];
  return {
    maxHp: Math.round(BASE_BOSS_HP * sc.hpMult),
    contactDamage: Math.round(12 * sc.dmgMult),
    projDamage: Math.round(7 * sc.dmgMult),
    aoeDamage: Math.round(14 * sc.dmgMult),
    radius: 28,
  };
}
