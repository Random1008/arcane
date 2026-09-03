import { Player } from "./world";
import { DEFAULT_TUNING } from "./config/tuning";

/**
 * Mort du joueur : perd 20 % (arrondi bas) des objets de l'inventaire (jamais les Poings,
 * slot 0), puis soigne à fond et ré-équipe les poings. Renvoie le nombre d'objets perdus.
 */
export function respawnPlayer(player: Player, rng: () => number): number {
  const slots = player.hotbar.slots;
  const totalItems = slots.filter((s) => s !== null).length; // poings compris
  const droppable: number[] = [];
  slots.forEach((s, i) => {
    if (i > 0 && s) droppable.push(i); // i>0 : on ne perd jamais les poings (slot 0)
  });

  const dropCount = Math.min(Math.floor(totalItems * 0.2), droppable.length);
  for (let k = 0; k < dropCount; k++) {
    const j = Math.floor(rng() * droppable.length);
    const slot = droppable.splice(j, 1)[0];
    slots[slot] = null;
  }

  player.hotbar.activeIndex = 0; // on respawn armé des poings
  player.health.hp = player.health.maxHp;
  player.health.iframes = 0;
  player.health.hitstun = 0;
  player.energy = DEFAULT_TUNING.resources.maxEnergy;
  return dropCount;
}
