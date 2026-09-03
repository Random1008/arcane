import { Player } from "./world";
import { addXp, xpForNext, maxHpFor } from "./progression";
import { SKILL_TREES, rankOf, unlockNode } from "./skills";

/** Outils d'administration / test (purs). Câblés par le client réseau game/net/adminClient.ts. */

export function giveGold(player: Player, n: number): void {
  player.gold += n;
}

export function giveOmganium(player: Player, n: number): void {
  player.omganium += n;
}

export function giveStatPoints(player: Player, n: number): void {
  player.statPoints += n;
}

export function giveSkillPoints(player: Player, n: number): void {
  player.skillPoints += n;
}

/** Fait gagner `n` niveaux (points crédités comme une montée normale ; la progression XP partielle est conservée). */
export function grantLevels(player: Player, n: number): void {
  let need = 0;
  for (let k = 0; k < n; k++) need += xpForNext(player.level + k);
  addXp(player, need); // pile de quoi franchir n paliers → niveau +n, reste d'XP inchangé
}

/**
 * Débloque tous les nœuds de l'arbre de la classe courante au rang max (no-op sans classe).
 * Crédite d'abord les points nécessaires puis les dépense via unlockNode : la comptabilité reste
 * cohérente (un respec ultérieur rembourse exactement ce qui a été investi, pas de points fantômes).
 */
export function unlockAllSkills(player: Player): void {
  if (!player.class) return;
  const nodes = SKILL_TREES[player.class] ?? [];
  player.skillPoints += nodes.reduce((s, n) => s + (n.maxRank - rankOf(player, n.id)) * n.cost, 0);
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const n of nodes) {
      while (rankOf(player, n.id) < n.maxRank && unlockNode(player, n.id)) progressed = true;
    }
  }
}

/** Restaure PV (max courant) et énergie. */
export function healFull(player: Player, maxEnergy: number): void {
  player.health.maxHp = maxHpFor(player);
  player.health.hp = player.health.maxHp;
  player.energy = maxEnergy;
}
