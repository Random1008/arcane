import { getToken, clearToken } from "../../shared/authStore";
import { getPlayer, getFlags, unlockEverything, identifyAll } from "../session";
import { giveGold, giveOmganium, giveStatPoints, giveSkillPoints, grantLevels, unlockAllSkills, healFull } from "../../core/admin";
import { setClass, respec } from "../../core/skills";
import { setBalance, Balance } from "../../core/balance";
import { DEFAULT_TUNING } from "../../core/config/tuning";
import { addWeapon } from "../../core/combat/hotbar";
import { makeArmor, ARMOR_SLOTS, OmegaSet } from "../../core/armor";
import { Tier } from "../../core/combat/weapons";
import { ClassId } from "../../core/classes";
import { getAdminHooks } from "../debug/adminBridge";
import { AdminCommand, GameState, validateCommand } from "../../core/adminProtocol";
import { DebugFlags } from "../debug/debugPanel";

let armorId = 80000;

function setTuning(key: string, value: number): void {
  const [group, prop] = key.split(".");
  const g = (DEFAULT_TUNING as unknown as Record<string, Record<string, number>>)[group];
  if (g && typeof g[prop] === "number") g[prop] = value;
}

function applyCommand(cmd: AdminCommand): void {
  const p = getPlayer();
  switch (cmd.cat) {
    case "player":
      switch (cmd.action) {
        case "giveGold": giveGold(p, cmd.value); break;
        case "giveOmganium": giveOmganium(p, cmd.value); break;
        case "giveStatPoints": giveStatPoints(p, cmd.value); break;
        case "giveSkillPoints": giveSkillPoints(p, cmd.value); break;
        case "grantLevels": grantLevels(p, cmd.value); break;
        case "heal": healFull(p, DEFAULT_TUNING.resources.maxEnergy); break;
        case "godmodeOn": getFlags().godMode = true; break;
        case "godmodeOff": getFlags().godMode = false; break;
        case "unlockAllSkills": unlockAllSkills(p); break;
        case "respec": respec(p); break;
        case "giveWeapon": addWeapon(p.hotbar, { defId: cmd.defId, tier: cmd.tier as Tier }); break;
        case "giveArmorSet":
          for (const s of ARMOR_SLOTS) p.armorInv.push(makeArmor(armorId++, s, "heavy", "S", cmd.set as OmegaSet));
          break;
        case "setClass": setClass(p, cmd.classId as ClassId); break;
      }
      break;
    case "world":
      if (cmd.action === "unlockAll") unlockEverything();
      else identifyAll();
      break;
    case "combat": {
      const h = getAdminHooks();
      if (!h) break;
      if (cmd.action === "spawnBoss") h.spawnBoss();
      else if (cmd.action === "spawnEnemies") h.spawnEnemies(cmd.value);
      else if (cmd.action === "killAll") h.killAll();
      else if (cmd.action === "gotoNexus") h.gotoNexus();
      break;
    }
    case "tuning": setTuning(cmd.key, cmd.value); break;
    case "flag": (getFlags() as unknown as Record<string, boolean>)[cmd.key as keyof DebugFlags] = cmd.value; break;
    case "balance": setBalance({ [cmd.key]: cmd.value } as Partial<Balance>); break;
  }
}

function snapshot(): GameState {
  const p = getPlayer();
  const ctx = getAdminHooks()?.context() ?? { biome: "carte du monde", nexus: false };
  return {
    gold: p.gold,
    level: p.level,
    xp: p.xp,
    className: p.class,
    hp: p.health.hp,
    maxHp: p.health.maxHp,
    statPoints: p.statPoints,
    skillPoints: p.skillPoints,
    omganium: p.omganium,
    biome: ctx.biome,
    nexus: ctx.nexus,
    godMode: getFlags().godMode,
  };
}

let sock: WebSocket | null = null;

/** Émet un événement de jeu vers la console admin (logs/modération). Best-effort. */
export function emitGameEvent(type: string, msg: string): void {
  if (sock && sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ kind: "event", event: { type, msg } }));
}

function toast(message: string): void {
  const t = document.createElement("div");
  t.textContent = "⚠ " + message;
  t.style.cssText = "position:fixed;top:40px;left:50%;transform:translateX(-50%);z-index:10001;background:#5a1a1a;color:#ffd;border:1px solid #a44;border-radius:8px;padding:10px 16px;font:14px sans-serif;box-shadow:0 4px 20px #0008";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 6000);
}

/**
 * Connecte le jeu au serveur admin (best-effort). S'identifie via le jeton, reçoit/applique les commandes,
 * envoie un snapshot d'état 2×/s. Gère kick (déconnexion) et warn (avertissement). Retente toutes les 3 s.
 */
export function startAdminClient(): void {
  const connect = () => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    try {
      sock = new WebSocket(`${proto}://${location.host}/ws`);
    } catch {
      setTimeout(connect, 3000);
      return;
    }
    sock.onopen = () => sock!.send(JSON.stringify({ role: "game", token: getToken() }));
    sock.onmessage = (ev) => {
      let m: { kind?: string; cmd?: unknown; message?: string };
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.kind === "cmd") {
        const c = validateCommand(m.cmd);
        if (c) applyCommand(c);
      } else if (m.kind === "warn") {
        toast(m.message ?? "Avertissement d'un administrateur");
      } else if (m.kind === "kick" || m.kind === "authfail") {
        clearToken();
        location.reload(); // exclu/banni ou jeton invalide → retour à la connexion
      }
    };
    sock.onerror = () => sock?.close();
    sock.onclose = () => {
      sock = null;
      setTimeout(connect, 3000);
    };
  };
  connect();
  setInterval(() => {
    if (sock && sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ kind: "state", state: snapshot() }));
  }, 500);
}
