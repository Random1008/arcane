// Catalogue des armes nommées (15 par tier, F → S), issu de idea/a-implementer/arme-armure-competence.md.
// Chaque arme = une famille de base (stats) + des modificateurs + des effets (voir effects.ts).
// Les 6 armes génériques de WEAPONS (salle de départ) et les Poings restent valides à côté.

import { WeaponDef, Tier, TIERS, getWeaponDef as getBaseWeaponDef } from "./weapons";
import { WeaponEffect } from "./effects";

/** Modificateurs de stats appliqués à la base de la famille. */
export interface StatMods {
  atkMul?: number;
  speedMul?: number;
  critChanceAdd?: number;
  critDamageAdd?: number;
  rangeMul?: number;
  arcAdd?: number;
  kbMul?: number;
  projSpeedMul?: number;
  projRadiusMul?: number;
}

export type Family = "sword" | "dagger" | "axe" | "hammer" | "bow" | "staff" | "spear" | "mace" | "flail" | "katana" | "crossbow";

export interface NamedWeapon {
  id: string;
  name: string;
  family: Family;
  tier: Tier;
  mods?: StatMods;
  effects?: WeaponEffect[];
  ultimate?: boolean; // arme Ω unique (endgame) : intrinsèquement Ω, drop endgame uniquement
}

const N = (id: string, name: string, family: Family, tier: Tier, mods?: StatMods, effects?: WeaponEffect[]): NamedWeapon => ({
  id, name, family, tier, mods, effects,
});

/** Arme Ω unique (endgame) : toujours tier S + Ω, effets « cheat mais fun » avec contrepartie. */
const U = (id: string, name: string, family: Family, mods: StatMods, effects: WeaponEffect[]): NamedWeapon => ({
  id, name, family, tier: "S", mods, effects, ultimate: true,
});

export const NAMED_WEAPONS: NamedWeapon[] = [
  // ⚪ TIER F
  N("epee_rouillee", "Épée rouillée", "sword", "F", { atkMul: 0.8 }, [{ kind: "combo", perHit: 0.04, max: 3 }]),
  N("dague_usee", "Dague usée", "dagger", "F", { atkMul: 0.85, critChanceAdd: 0.05 }),
  N("arc_simple", "Arc simple", "bow", "F", { speedMul: 0.8, projSpeedMul: 1.1 }),
  N("baton_casse", "Bâton cassé", "staff", "F", { atkMul: 0.8 }),
  N("lance_fragile", "Lance fragile", "spear", "F", { atkMul: 0.85 }),
  N("hache_emoussee", "Hache émoussée", "axe", "F", { atkMul: 0.9, speedMul: 0.85 }),
  N("masse_bois", "Masse bois", "mace", "F", { atkMul: 0.85 }, [{ kind: "stun", duration: 0.3, chance: 0.25 }]),
  N("fronde", "Fronde", "bow", "F", { atkMul: 0.6, speedMul: 0.7, projSpeedMul: 0.8 }),
  N("couteau", "Couteau", "dagger", "F", { atkMul: 0.7, speedMul: 1.25 }),
  N("baton_simple", "Bâton simple", "staff", "F", { atkMul: 0.9 }),
  N("epee_courte", "Épée courte", "sword", "F", { atkMul: 0.8, speedMul: 1.2 }, [{ kind: "combo", perHit: 0.04, max: 2 }]),
  N("arc_court", "Arc court", "bow", "F", { atkMul: 0.75, speedMul: 1.25, projSpeedMul: 0.85 }),
  N("marteau_simple", "Marteau simple", "hammer", "F", { atkMul: 0.85, kbMul: 0.6 }),
  N("lance_bois", "Lance bois", "spear", "F", { atkMul: 0.9, rangeMul: 1.1 }),
  N("dague_fine", "Dague fine", "dagger", "F", { critChanceAdd: 0.08 }),

  // 🟢 TIER E
  N("epee_fer", "Épée fer", "sword", "E"),
  N("dague_aiguisee", "Dague aiguisée", "dagger", "E", { critChanceAdd: 0.1 }),
  N("arc_solide", "Arc solide", "bow", "E", { projSpeedMul: 1.2 }),
  N("baton_magique_faible", "Bâton magique faible", "staff", "E", { atkMul: 1.1 }),
  N("lance_acier", "Lance acier", "spear", "E", { atkMul: 1.05, rangeMul: 1.05 }),
  N("hache_stable", "Hache stable", "axe", "E"),
  N("masse_lourde", "Masse lourde", "mace", "E", { atkMul: 1.1 }, [{ kind: "stun", duration: 0.5, chance: 0.3 }]),
  N("arbalete_simple", "Arbalète simple", "crossbow", "E"),
  N("fleau_court", "Fléau court", "flail", "E"),
  N("sabre", "Sabre", "katana", "E", undefined, [{ kind: "combo", perHit: 0.05, max: 4 }]),
  N("arc_renforce", "Arc renforcé", "bow", "E", { critChanceAdd: 0.08 }),
  N("marteau_guerre", "Marteau guerre", "hammer", "E", { kbMul: 1.3 }),
  N("lance_lourde", "Lance lourde", "spear", "E", { atkMul: 1.15, speedMul: 0.9, rangeMul: 1.1 }),
  N("dague_rapide", "Dague rapide", "dagger", "E", { speedMul: 1.2 }),
  N("baton_focus", "Bâton focus", "staff", "E", undefined, [{ kind: "energize", energyPerSec: 2 }]),

  // 🔵 TIER D
  N("epee_enchantee_1", "Épée enchantée I", "sword", "D", { atkMul: 1.1 }, [{ kind: "burn", dps: 4, duration: 2 }]),
  N("dague_critique", "Dague critique", "dagger", "D", { critChanceAdd: 0.15 }),
  N("arc_long", "Arc long", "bow", "D", { projSpeedMul: 1.3 }),
  N("baton_elementaire_1", "Bâton élémentaire I", "staff", "D", undefined, [{ kind: "burn", dps: 4, duration: 2 }, { kind: "slow", duration: 1 }]),
  N("lance_renforcee", "Lance renforcée", "spear", "D", { atkMul: 1.2 }),
  N("hache_double", "Hache double", "axe", "D", { arcAdd: 40 }),
  N("marteau_acier", "Marteau acier", "hammer", "D", undefined, [{ kind: "stun", duration: 0.6 }]),
  N("arbalete_lourde", "Arbalète lourde", "crossbow", "D", { atkMul: 1.3, speedMul: 0.85 }),
  N("fleau_epineux", "Fléau épineux", "flail", "D", undefined, [{ kind: "bleed", dps: 4, duration: 3 }]),
  N("katana_simple", "Katana simple", "katana", "D", { critChanceAdd: 0.05 }),
  N("arc_sniper", "Arc sniper", "bow", "D", { critDamageAdd: 0.5, projSpeedMul: 1.4 }),
  N("lance_percante", "Lance perçante", "spear", "D", { rangeMul: 1.2 }),
  N("baton_feu", "Bâton feu", "staff", "D", undefined, [{ kind: "burn", dps: 6, duration: 3 }]),
  N("dague_poison", "Dague poison", "dagger", "D", undefined, [{ kind: "poison", dps: 3, duration: 4 }]),
  N("masse_choc", "Masse choc", "mace", "D", undefined, [{ kind: "shockwave", radius: 70, factor: 0.4 }]),

  // 🟡 TIER C
  N("epee_feu", "Épée feu", "sword", "C", undefined, [{ kind: "burn", dps: 8, duration: 3 }]),
  N("dague_toxique", "Dague toxique", "dagger", "C", undefined, [{ kind: "poison", dps: 4, duration: 4 }]),
  N("arc_glace", "Arc glace", "bow", "C", undefined, [{ kind: "slow", duration: 1.5 }]),
  N("baton_elementaire_2", "Bâton élémentaire II", "staff", "C", { atkMul: 1.1 }, [{ kind: "burn", dps: 6, duration: 2 }, { kind: "slow", duration: 1 }]),
  N("lance_sacree", "Lance sacrée", "spear", "C", undefined, [{ kind: "bossBonus", mult: 1.3 }]),
  N("hache_guerre", "Hache guerre", "axe", "C", { arcAdd: 30 }),
  N("marteau_volcan", "Marteau volcan", "hammer", "C", undefined, [{ kind: "shockwave", radius: 90, factor: 0.5 }, { kind: "burn", dps: 5, duration: 2 }]),
  N("arbalete_magique", "Arbalète magique", "crossbow", "C", undefined, [{ kind: "burn", dps: 6, duration: 2 }]),
  N("fleau_sombre", "Fléau sombre", "flail", "C", undefined, [{ kind: "lifedrain", pct: 0.1 }]),
  N("katana_rapide", "Katana rapide", "katana", "C", { speedMul: 1.2 }, [{ kind: "combo", perHit: 0.05, max: 5 }]),
  N("arc_multi_tir", "Arc multi-tir", "bow", "C", undefined, [{ kind: "multishot", count: 2 }]),
  N("lance_foudre", "Lance foudre", "spear", "C", undefined, [{ kind: "stun", duration: 0.4, chance: 0.35 }]),
  N("baton_glace", "Bâton glace", "staff", "C", undefined, [{ kind: "stun", duration: 0.5 }]),
  N("dague_ombre", "Dague ombre", "dagger", "C", undefined, [{ kind: "backstab", mult: 1.5 }]),
  N("masse_explosive", "Masse explosive", "mace", "C", undefined, [{ kind: "shockwave", radius: 90, factor: 0.6 }]),

  // 🟠 TIER B
  N("epee_divine", "Épée divine", "sword", "B", { atkMul: 1.15 }, [{ kind: "regen", hpPerSec: 2 }]),
  N("dague_spectrale", "Dague spectrale", "dagger", "B", { speedMul: 1.1, critChanceAdd: 0.1 }, [{ kind: "backstab", mult: 1.3 }]),
  N("arc_celeste", "Arc céleste", "bow", "B", undefined, [{ kind: "homing" }]),
  N("baton_supreme", "Bâton suprême", "staff", "B", undefined, [{ kind: "multishot", count: 2 }]),
  N("lance_foudroyante", "Lance foudroyante", "spear", "B", undefined, [{ kind: "stun", duration: 0.5, chance: 0.5 }, { kind: "shockwave", radius: 70, factor: 0.3 }]),
  N("hache_titan", "Hache titan", "axe", "B", { atkMul: 1.4, speedMul: 0.85 }),
  N("marteau_sacre", "Marteau sacré", "hammer", "B", { kbMul: 1.5 }),
  N("arbalete_explosive", "Arbalète explosive", "crossbow", "B", undefined, [{ kind: "shockwave", radius: 100, factor: 0.5 }]),
  N("fleau_infernal", "Fléau infernal", "flail", "B", undefined, [{ kind: "burn", dps: 10, duration: 3 }]),
  N("katana_legendaire_1", "Katana légendaire I", "katana", "B", { critChanceAdd: 0.1 }, [{ kind: "combo", perHit: 0.06, max: 5 }]),
  N("arc_pluie", "Arc pluie", "bow", "B", undefined, [{ kind: "multishot", count: 3 }]),
  N("lance_celeste", "Lance céleste", "spear", "B", { critChanceAdd: 0.15, critDamageAdd: 0.3 }),
  N("baton_arcane", "Bâton arcane", "staff", "B", undefined, [{ kind: "energize", energyPerSec: 3 }]),
  N("dague_critique_plus", "Dague critique+", "dagger", "B", { critChanceAdd: 0.2, critDamageAdd: 0.5 }),
  N("masse_lourde_plus", "Masse lourde+", "mace", "B", { atkMul: 1.15 }, [{ kind: "stun", duration: 1.0, chance: 0.5 }]),

  // 🔴 TIER A
  N("epee_du_roi", "Épée du roi", "sword", "A", undefined, [{ kind: "aura", damageMul: 0.15, speedMul: 0.05 }]),
  N("dague_du_neant", "Dague du néant", "dagger", "A", { critDamageAdd: 0.3 }, [{ kind: "backstab", mult: 2.0 }]),
  N("arc_des_etoiles", "Arc des étoiles", "bow", "A", { speedMul: 1.2 }, [{ kind: "multishot", count: 3 }]),
  N("baton_cosmique", "Bâton cosmique", "staff", "A", { projRadiusMul: 1.5 }, [{ kind: "shockwave", radius: 120, factor: 0.6 }]),
  N("lance_antique", "Lance antique", "spear", "A", { atkMul: 1.35 }),
  N("hache_ancienne", "Hache ancienne", "axe", "A", undefined, [{ kind: "onKillAtk", pct: 3, maxPct: 30 }]),
  N("marteau_des_dieux", "Marteau des dieux", "hammer", "A", undefined, [{ kind: "stun", duration: 1.2 }]),
  N("arbalete_divine", "Arbalète divine", "crossbow", "A", { atkMul: 1.6, speedMul: 0.8 }),
  N("fleau_ultime", "Fléau ultime", "flail", "A", undefined, [{ kind: "lifedrain", pct: 0.2 }]),
  N("katana_mythique", "Katana mythique", "katana", "A", undefined, [{ kind: "combo", perHit: 0.06, max: 8 }]),
  N("arc_lumiere", "Arc lumière", "bow", "A", { atkMul: 1.25 }),
  N("lance_dimensionnelle", "Lance dimensionnelle", "spear", "A", { rangeMul: 1.3, speedMul: 1.1 }),
  N("baton_stellaire", "Bâton stellaire", "staff", "A", undefined, [{ kind: "multishot", count: 3 }]),
  N("dague_ultime", "Dague ultime", "dagger", "A", { atkMul: 1.3, critChanceAdd: 0.15 }),
  N("masse_divine", "Masse divine", "mace", "A", undefined, [{ kind: "shockwave", radius: 130, factor: 0.7 }]),

  // ⚫ TIER S
  N("epee_du_chaos", "Épée du chaos", "sword", "S", { atkMul: 1.3 }, [{ kind: "shockwave", radius: 110, factor: 0.8, onCrit: true }]),
  N("dague_du_temps", "Dague du temps", "dagger", "S", undefined, [{ kind: "critStun", duration: 1.0 }]),
  N("arc_eternite", "Arc éternité", "bow", "S", { atkMul: 1.1 }, [{ kind: "autofire" }]),
  N("baton_absolu", "Bâton absolu", "staff", "S", undefined, [{ kind: "multishot", count: 2 }, { kind: "energize", energyPerSec: 5 }]),
  N("lance_dimension", "Lance dimension", "spear", "S", { rangeMul: 1.3 }, [{ kind: "combo", perHit: 0.08, max: 5 }]),
  N("hache_neant", "Hache néant", "axe", "S", { atkMul: 1.2 }, [{ kind: "poison", dps: 8, duration: 4 }]),
  N("marteau_cosmique", "Marteau cosmique", "hammer", "S", undefined, [{ kind: "shockwave", radius: 250, factor: 0.6 }, { kind: "stun", duration: 0.5 }]),
  N("arbalete_infinie", "Arbalète infinie", "crossbow", "S", undefined, [{ kind: "autofire" }]),
  N("fleau_apocalypse", "Fléau apocalypse", "flail", "S", undefined, [{ kind: "burn", dps: 12, duration: 4 }, { kind: "poison", dps: 6, duration: 4 }]),
  N("katana_des_dieux", "Katana des dieux", "katana", "S", { speedMul: 1.4 }, [{ kind: "combo", perHit: 0.08, max: 8 }]),
  N("arc_infini", "Arc infini", "bow", "S", { speedMul: 1.2 }, [{ kind: "autofire" }, { kind: "multishot", count: 2 }]),
  N("lance_ultime", "Lance ultime", "spear", "S", { atkMul: 1.2, rangeMul: 1.4 }),
  N("baton_universel", "Bâton universel", "staff", "S", undefined, [{ kind: "burn", dps: 8, duration: 3 }, { kind: "poison", dps: 4, duration: 3 }, { kind: "slow", duration: 1.5 }]),
  N("dague_parfaite", "Dague parfaite", "dagger", "S", { critChanceAdd: 0.65 }),
  N("masse_du_chaos", "Masse du chaos", "mace", "S", undefined, [{ kind: "shockwave", radius: 140, factor: 0.9 }, { kind: "stun", duration: 0.6, chance: 0.5 }]),

  // 🌟 ARMES Ω UNIQUES (endgame — voir idea/a-implementer/arme-armure-competence.md)
  U("omega_briseur_realite", "Briseur de Réalité Ω", "sword", { atkMul: 1.25, speedMul: 1.1 }, [
    { kind: "shockwave", radius: 140, factor: 0.9, onCrit: true }, // crit → faille qui explose
    { kind: "onKillAtk", pct: 5, maxPct: 50 }, // chaque kill → +5% ATK (max 50%)
    { kind: "selfDrain", pctPerSec: 0.5 }, // contrepartie : perd 0.5% PV/s en main
  ]),
  U("omega_paradoxe_temporel", "Paradoxe Temporel Ω", "dagger", { speedMul: 1.4, critChanceAdd: 0.4 }, [
    { kind: "critStun", duration: 1.0 }, // crit → stop le temps
    { kind: "combo", perHit: 0.08, max: 12 }, // enchaînements → puissance croissante
  ]),
  U("omega_oeil_infini", "Œil de l'Infini Ω", "bow", { atkMul: 1.2 }, [
    { kind: "multishot", count: 3 }, // 3 flèches simultanées
    { kind: "homing" }, // auto-guidées
    { kind: "autofire" }, // tir continu
  ]),
  U("omega_source_primordiale", "Source Primordiale Ω", "staff", { atkMul: 1.25, projRadiusMul: 1.4 }, [
    { kind: "multishot", count: 2 }, // 2 sorts à la fois
    { kind: "burn", dps: 12, duration: 3 },
    { kind: "poison", dps: 8, duration: 3 },
    { kind: "slow", duration: 1.5 }, // « élément aléatoire » → tous les éléments
    { kind: "energize", energyPerSec: 6 }, // aucun coût en mana (régénère l'énergie)
  ]),
  U("omega_jugement_final", "Jugement Final Ω", "hammer", { atkMul: 1.3 }, [
    { kind: "shockwave", radius: 260, factor: 0.7 }, // onde de choc géante
    { kind: "stun", duration: 0.6 }, // étourdit tout ce qui est touché
  ]),
];

/** Les 5 armes Ω uniques (drops endgame). */
export const ULTIMATE_WEAPONS: NamedWeapon[] = NAMED_WEAPONS.filter((n) => n.ultimate);

const CATALOG_BY_ID = new Map(NAMED_WEAPONS.map((n) => [n.id, n]));
const NO_EFFECTS: WeaponEffect[] = [];
const resolvedCache = new Map<string, WeaponDef>();

export function namedWeapon(id: string): NamedWeapon | null {
  return CATALOG_BY_ID.get(id) ?? null;
}

/** WeaponDef d'une arme du catalogue : base de la famille + modificateurs. */
function resolveNamed(n: NamedWeapon): WeaponDef {
  const cached = resolvedCache.get(n.id);
  if (cached) return cached;
  const base = getBaseWeaponDef(n.family);
  const m = n.mods ?? {};
  const def: WeaponDef = {
    ...base,
    id: n.id,
    name: n.name,
    atk: base.atk * (m.atkMul ?? 1),
    attackSpeed: base.attackSpeed * (m.speedMul ?? 1),
    critChance: Math.min(1, base.critChance + (m.critChanceAdd ?? 0)),
    critDamage: base.critDamage + (m.critDamageAdd ?? 0),
    range: base.range * (m.rangeMul ?? 1),
    arcDeg: base.arcDeg === 0 ? 0 : Math.min(360, base.arcDeg + (m.arcAdd ?? 0)),
    knockback: base.knockback * (m.kbMul ?? 1),
    projectileSpeed: base.projectileSpeed * (m.projSpeedMul ?? 1),
    projectileRadius: base.projectileRadius * (m.projRadiusMul ?? 1),
  };
  resolvedCache.set(n.id, def);
  return def;
}

/** Résout n'importe quel id d'arme : catalogue, famille, armes génériques ou Poings. */
export function getWeaponDefEx(id: string): WeaponDef {
  const n = CATALOG_BY_ID.get(id);
  return n ? resolveNamed(n) : getBaseWeaponDef(id);
}

/** Effets portés par une arme ([] pour les armes génériques / familles / Poings). */
export function weaponEffects(id: string): WeaponEffect[] {
  return CATALOG_BY_ID.get(id)?.effects ?? NO_EFFECTS;
}

/** Famille d'un id d'arme (les ids hors catalogue sont leur propre famille). */
export function familyOf(id: string): string {
  return CATALOG_BY_ID.get(id)?.family ?? id;
}

const byTier = new Map<Tier, NamedWeapon[]>();
/** Armes nommées d'un tier — HORS armes Ω uniques (qui ne tombent qu'en endgame dédié). */
export function weaponsOfTier(tier: Tier): NamedWeapon[] {
  let list = byTier.get(tier);
  if (!list) {
    list = NAMED_WEAPONS.filter((n) => n.tier === tier && !n.ultimate);
    byTier.set(tier, list);
  }
  return list;
}

/** Tire une arme nommée au hasard dans le tier donné (jamais une arme Ω unique). */
export function randomWeaponIdOfTier(tier: Tier, rng: () => number): string {
  const list = weaponsOfTier(tier);
  return list[Math.floor(rng() * list.length) % list.length].id;
}

/** L'id correspond-il à une arme Ω unique (endgame) ? */
export function isUltimateWeapon(id: string): boolean {
  return CATALOG_BY_ID.get(id)?.ultimate === true;
}

/** Tire une arme Ω unique au hasard (drops endgame). */
export function randomUltimateWeaponId(rng: () => number): string {
  return ULTIMATE_WEAPONS[Math.floor(rng() * ULTIMATE_WEAPONS.length) % ULTIMATE_WEAPONS.length].id;
}

export const CATALOG_TIERS = TIERS;
