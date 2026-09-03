/**
 * Protocole de la console d'administration : commandes (admin → jeu) et snapshot d'état (jeu → admin).
 * Partagé par le serveur de relais, la page admin et le client jeu. Pur et testable.
 */

export interface CmdPlayerNum {
  cat: "player";
  action: "giveGold" | "giveOmganium" | "giveStatPoints" | "giveSkillPoints" | "grantLevels";
  value: number;
}
export interface CmdPlayerVoid {
  cat: "player";
  action: "heal" | "godmodeOn" | "godmodeOff" | "unlockAllSkills" | "respec";
}
export interface CmdPlayerWeapon {
  cat: "player";
  action: "giveWeapon";
  defId: string;
  tier: string;
}
export interface CmdPlayerArmor {
  cat: "player";
  action: "giveArmorSet";
  set: string;
}
export interface CmdPlayerClass {
  cat: "player";
  action: "setClass";
  classId: string;
}
export interface CmdWorld {
  cat: "world";
  action: "unlockAll" | "identifyAll";
}
export interface CmdCombatVoid {
  cat: "combat";
  action: "spawnBoss" | "killAll" | "gotoNexus";
}
export interface CmdCombatNum {
  cat: "combat";
  action: "spawnEnemies";
  value: number;
}
export interface CmdTuning {
  cat: "tuning";
  key: string;
  value: number;
}
export interface CmdFlag {
  cat: "flag";
  key: string;
  value: boolean;
}
export interface CmdBalance {
  cat: "balance";
  key: string;
  value: number;
}

export type AdminCommand =
  | CmdPlayerNum
  | CmdPlayerVoid
  | CmdPlayerWeapon
  | CmdPlayerArmor
  | CmdPlayerClass
  | CmdWorld
  | CmdCombatVoid
  | CmdCombatNum
  | CmdTuning
  | CmdFlag
  | CmdBalance;

export interface GameState {
  gold: number;
  level: number;
  xp: number;
  className: string | null;
  hp: number;
  maxHp: number;
  statPoints: number;
  skillPoints: number;
  omganium: number;
  biome: string;
  nexus: boolean;
  godMode: boolean;
}

/** Enveloppes échangées sur le WebSocket. */
export type WsMessage =
  | { kind: "cmd"; cmd: AdminCommand }
  | { kind: "state"; state: GameState }
  | { kind: "presence"; game: boolean }; // le serveur informe l'admin qu'un jeu est connecté ou non

import { WEAPONS, TIERS } from "./combat/weapons";
import { NAMED_WEAPONS } from "./combat/catalog";
import { OMEGA_SETS } from "./armor";
import { CLASS_IDS } from "./classes";
import { BALANCE_KEYS } from "./balance";

const PLAYER_NUM = new Set(["giveGold", "giveOmganium", "giveStatPoints", "giveSkillPoints", "grantLevels"]);
const PLAYER_VOID = new Set(["heal", "godmodeOn", "godmodeOff", "unlockAllSkills", "respec"]);
const WEAPON_IDS = new Set([...WEAPONS.map((w) => w.id), ...NAMED_WEAPONS.map((n) => n.id)]);
const TIER_SET = new Set<string>(TIERS);
const SET_IDS = new Set<string>(OMEGA_SETS);
const CLASS_SET = new Set<string>(CLASS_IDS);
const BALANCE_SET = new Set<string>(BALANCE_KEYS);
const FLAG_KEYS = new Set(["godMode", "showHitboxes", "showVelocity", "showFps"]);
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === "string" && x.length > 0;

/** Valide/normalise une commande reçue. Renvoie la commande typée, ou null si invalide. */
export function validateCommand(msg: unknown): AdminCommand | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  switch (m.cat) {
    case "player":
      if (PLAYER_NUM.has(m.action as string) && isNum(m.value)) return { cat: "player", action: m.action as CmdPlayerNum["action"], value: m.value };
      if (PLAYER_VOID.has(m.action as string)) return { cat: "player", action: m.action as CmdPlayerVoid["action"] };
      if (m.action === "giveWeapon" && isStr(m.defId) && WEAPON_IDS.has(m.defId) && isStr(m.tier) && TIER_SET.has(m.tier)) return { cat: "player", action: "giveWeapon", defId: m.defId, tier: m.tier };
      if (m.action === "giveArmorSet" && isStr(m.set) && SET_IDS.has(m.set)) return { cat: "player", action: "giveArmorSet", set: m.set };
      if (m.action === "setClass" && isStr(m.classId) && CLASS_SET.has(m.classId)) return { cat: "player", action: "setClass", classId: m.classId };
      return null;
    case "world":
      return m.action === "unlockAll" || m.action === "identifyAll" ? { cat: "world", action: m.action } : null;
    case "combat":
      if (m.action === "spawnEnemies" && isNum(m.value)) return { cat: "combat", action: "spawnEnemies", value: m.value };
      if (m.action === "spawnBoss" || m.action === "killAll" || m.action === "gotoNexus") return { cat: "combat", action: m.action };
      return null;
    case "tuning":
      return isStr(m.key) && isNum(m.value) ? { cat: "tuning", key: m.key, value: m.value } : null;
    case "flag":
      return isStr(m.key) && FLAG_KEYS.has(m.key) && typeof m.value === "boolean" ? { cat: "flag", key: m.key, value: m.value } : null;
    case "balance":
      return isStr(m.key) && BALANCE_SET.has(m.key) && isNum(m.value) ? { cat: "balance", key: m.key, value: m.value } : null;
    default:
      return null;
  }
}

export interface GameEvent {
  type: string;
  msg: string;
}

/** Valide un événement de jeu (avant relais aux admins). */
export function validateEvent(msg: unknown): GameEvent | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  if (!isStr(m.type) || typeof m.msg !== "string") return null;
  return { type: m.type.slice(0, 40), msg: m.msg.slice(0, 300) };
}

/** Valide un snapshot d'état reçu d'un client jeu (avant relais aux admins). */
export function validateState(msg: unknown): GameState | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  const n = (x: unknown) => typeof x === "number" && Number.isFinite(x);
  if (!n(m.gold) || !n(m.level) || !n(m.xp) || !n(m.hp) || !n(m.maxHp) || !n(m.statPoints) || !n(m.skillPoints) || !n(m.omganium)) return null;
  if (typeof m.biome !== "string" || typeof m.nexus !== "boolean" || typeof m.godMode !== "boolean") return null;
  if (m.className !== null && typeof m.className !== "string") return null;
  return {
    gold: m.gold as number,
    level: m.level as number,
    xp: m.xp as number,
    className: m.className as string | null,
    hp: m.hp as number,
    maxHp: m.maxHp as number,
    statPoints: m.statPoints as number,
    skillPoints: m.skillPoints as number,
    omganium: m.omganium as number,
    biome: m.biome as string,
    nexus: m.nexus as boolean,
    godMode: m.godMode as boolean,
  };
}
