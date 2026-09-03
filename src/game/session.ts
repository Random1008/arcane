import { Player, createPlayer } from "../core/world";
import { isBiomeUnlocked, isRingFinalBiome } from "../core/worldMap";
import { getBiome, BIOMES, SPAWN_BIOME } from "../core/biomes";
import { Tier, TIERS } from "../core/combat/weapons";
import { generateShop, dayIndex, Shop } from "../core/shop";
import { DebugFlags } from "./debug/debugPanel";

let player: Player | null = null;
let flags: DebugFlags | null = null;
let identified = new Set<string>(["spawn"]); // le sanctuaire est identifié d'office
let cleared = new Set<string>(); // biomes nettoyés (tous ennemis vaincus)
let chatMessages: string[] = []; // journal de chat (persiste entre les scènes)
let nexusBest = 0; // meilleur palier atteint dans le Nexus Infini
let shopCache: { day: number; tier: Tier; shop: Shop } | null = null;

export function getChatMessages(): string[] {
  return chatMessages;
}

export function pushChat(msg: string): void {
  chatMessages.push(msg);
  if (chatMessages.length > 50) chatMessages.shift();
}

export function isIdentified(id: string): boolean {
  return identified.has(id);
}

export function markIdentified(id: string): void {
  identified.add(id);
}

export function isCleared(id: string): boolean {
  return cleared.has(id);
}

export function markCleared(id: string): void {
  cleared.add(id);
}

/** Admin : révèle toute la carte (sans tout nettoyer). */
export function identifyAll(): void {
  for (const b of [SPAWN_BIOME, ...BIOMES]) identified.add(b.id);
}

/** Admin : nettoie + identifie TOUS les biomes (carte ouverte, rang S validé ⇒ Nexus & PNJ S/Ω débloqués). */
export function unlockEverything(): void {
  for (const b of [SPAWN_BIOME, ...BIOMES]) {
    cleared.add(b.id);
    identified.add(b.id);
  }
}

export function isUnlocked(id: string): boolean {
  return isBiomeUnlocked(id, cleared);
}

/** Vrai si ce biome est le dernier non nettoyé de son anneau (→ le boss du rang y apparaît). */
export function isRingFinal(id: string): boolean {
  return isRingFinalBiome(id, cleared);
}

/** Nexus Infini : débloqué après avoir vaincu le boss S = anneau S entièrement nettoyé. */
export function isNexusUnlocked(): boolean {
  const sBiomes = BIOMES.filter((b) => b.tier === "S");
  return sBiomes.every((b) => cleared.has(b.id));
}

export function getNexusBest(): number {
  return nexusBest;
}

/** Tier de progression du joueur = rang max de biome nettoyé (défaut F). */
export function playerShopTier(): Tier {
  let best: Tier = "F";
  let bi = 0;
  for (const id of cleared) {
    try {
      const tier = getBiome(id).tier;
      const i = TIERS.indexOf(tier);
      if (i > bi) {
        bi = i;
        best = tier;
      }
    } catch {
      // id inconnu → ignorer
    }
  }
  return best;
}

/** Boutique de Tibo du jour (mise en cache ; rerollée quand le jour ou le tier change). */
export function getShop(): Shop {
  const day = dayIndex(Date.now());
  const tier = playerShopTier();
  if (!shopCache || shopCache.day !== day || shopCache.tier !== tier) {
    shopCache = { day, tier, shop: generateShop(tier, day) };
  }
  return shopCache.shop;
}

export function markNexusBest(palier: number): void {
  if (palier > nexusBest) nexusBest = palier;
}

/** Vrai si au moins un biome du rang donné a été nettoyé (déblocage des PNJ de ce rang). */
export function hasClearedRank(tier: Tier): boolean {
  for (const id of cleared) {
    try {
      if (getBiome(id).tier === tier) return true;
    } catch {
      // id inconnu (ex. "spawn") → ignorer
    }
  }
  return false;
}

/** Joueur persistant entre les scènes (carte ↔ biome) : hotbar/PV/énergie conservés. */
export function getPlayer(): Player {
  if (!player) player = createPlayer();
  return player;
}

export function getFlags(): DebugFlags {
  if (!flags) flags = { showHitboxes: false, showVelocity: false, godMode: false, showFps: false };
  return flags;
}

export interface SaveData {
  v: number;
  player: Player;
  cleared: string[];
  identified: string[];
  nexusBest: number;
}

const SAVE_VERSION = 1;

/** Sérialise la progression du compte courant (joueur + biomes nettoyés/identifiés + record Nexus). */
export function serialize(): SaveData {
  return {
    v: SAVE_VERSION,
    player: getPlayer(),
    cleared: [...cleared],
    identified: [...identified],
    nexusBest,
  };
}

/** Recharge une sauvegarde. Renvoie false (état neuf conservé) si version inconnue ou données absentes. */
export function hydrate(data: SaveData | null | undefined): boolean {
  if (!data || data.v !== SAVE_VERSION || !data.player) return false;
  // fusion profonde des objets imbriqués sensibles (anti-NaN sur une save partielle/éditée à la main)
  const base = createPlayer();
  const dp = data.player as Partial<Player>;
  player = {
    ...base,
    ...dp,
    transform: { ...base.transform, ...(dp.transform ?? {}) },
    health: { ...base.health, ...(dp.health ?? {}) },
    stats: { ...base.stats, ...(dp.stats ?? {}) },
    hotbar: { ...base.hotbar, ...(dp.hotbar ?? {}) },
    skills: dp.skills ?? base.skills,
    cooldowns: dp.cooldowns ?? base.cooldowns,
    // l'état mêlée transitoire contient un Set (hitIds) que JSON sérialise en {} : on le reconstruit
    // (sinon m.hitIds.clear() plante à la 1re attaque après un chargement de sauvegarde)
    melee: { ...base.melee, ...(dp.melee ?? {}), hitIds: new Set<number>() },
  };
  identified = new Set(["spawn", ...(data.identified ?? [])]);
  cleared = new Set(data.cleared ?? []);
  nexusBest = typeof data.nexusBest === "number" ? data.nexusBest : 0;
  shopCache = null;
  return true;
}

export function resetSession(): void {
  player = null;
  flags = null;
  identified = new Set<string>(["spawn"]);
  cleared = new Set<string>();
  chatMessages = [];
  nexusBest = 0;
  shopCache = null;
}
