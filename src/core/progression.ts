import { Tier, TIERS } from "./combat/weapons";
import { Archetype } from "./enemies";
import { Player } from "./world";
import { PlayerMods, computePlayerMods } from "./sets";
import { skillPassives } from "./skills";

const BUFF_DAMAGE = 1.5;
const BUFF_SPEED = 1.2;

export const BASE_HP = 100;
export const STAT_POINTS_PER_LEVEL = 3;
export const SKILL_POINTS_PER_LEVEL = 1;

export type StatKey = "vitality" | "power" | "agility" | "precision";
export const STAT_KEYS: StatKey[] = ["vitality", "power", "agility", "precision"];
export const STAT_LABEL: Record<StatKey, string> = {
  vitality: "Vitalité (+PV)",
  power: "Puissance (+dégâts)",
  agility: "Agilité (+vitesse)",
  precision: "Précision (+crit)",
};

const HP_PER_VITALITY = 12;
const DMG_PER_POWER = 0.03;
const SPEED_PER_AGILITY = 0.02;
const CRIT_PER_PRECISION = 0.012;

export function xpForNext(level: number): number {
  return Math.round(60 * Math.pow(1.18, level - 1));
}

const ARCH_XP: Record<Archetype, number> = { dummy: 0, chaser: 1, shooter: 1.2, brute: 2.5, swarmer: 0.6, bomber: 1.3 };

export function xpReward(archetype: Archetype, tier: Tier): number {
  return Math.round(6 * ARCH_XP[archetype] * (1 + TIERS.indexOf(tier) * 0.6));
}

export function bossXpReward(tier: Tier): number {
  return Math.round(50 * (1 + TIERS.indexOf(tier)));
}

export function maxHpFor(player: Player): number {
  return BASE_HP + player.stats.vitality * HP_PER_VITALITY + skillPassives(player).maxHp;
}

/** Ajoute de l'XP, gère les montées de niveau, crédite les points. Renvoie le nb de niveaux gagnés. */
export function addXp(player: Player, amount: number): number {
  if (amount <= 0) return 0;
  player.xp += amount;
  let gained = 0;
  while (player.xp >= xpForNext(player.level)) {
    player.xp -= xpForNext(player.level);
    player.level++;
    player.statPoints += STAT_POINTS_PER_LEVEL;
    player.skillPoints += SKILL_POINTS_PER_LEVEL;
    gained++;
  }
  return gained;
}

/** Dépense un point de stat. Renvoie true si appliqué. */
export function allocStat(player: Player, stat: StatKey): boolean {
  if (player.statPoints <= 0) return false;
  player.stats[stat]++;
  player.statPoints--;
  if (stat === "vitality") {
    const newMax = maxHpFor(player);
    const delta = Math.max(0, newMax - player.health.maxHp);
    player.health.maxHp = newMax;
    player.health.hp = Math.min(newMax, player.health.hp + delta); // soigne le gain de PV
  }
  return true;
}

/** Mods combinés : armure (+ sets) + stats réparties + passifs d'arbre + buff actif. */
export function derivePlayerMods(player: Player): PlayerMods {
  const m = computePlayerMods(player.armor);
  const s = player.stats;
  m.damageMul *= 1 + s.power * DMG_PER_POWER;
  m.speedMul *= 1 + s.agility * SPEED_PER_AGILITY;
  m.critAdd += s.precision * CRIT_PER_PRECISION;
  // passifs de l'arbre de classe
  const sp = skillPassives(player);
  m.damageMul *= 1 + sp.damageMul;
  m.speedMul *= 1 + sp.speedMul;
  m.critAdd += sp.critAdd;
  m.defense += sp.defense;
  m.lifesteal += sp.lifesteal;
  // buff actif (Rage / Furtivité)
  if (player.buffTimer > 0) {
    m.damageMul *= BUFF_DAMAGE;
    m.speedMul *= BUFF_SPEED;
  }
  return m;
}
