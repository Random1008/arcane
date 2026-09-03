import { DEFAULT_TUNING, Tuning } from "./config/tuning";
import { Entity, makeEntity, tickIframes, tickHitstun, isStunned } from "./entity";
import { Level, canOccupy, clampToBounds } from "./collision";
import { applyMovementCollide } from "./movement";
import { createDash, startDash, tickDash, isDashing, DashState } from "./abilities/dash";
import { createBlink, doBlink, tickBlink, BlinkState } from "./abilities/blink";
import { createMelee, startMelee, tickMelee, isMeleeActive, targetsInArc, MeleeState, MeleeCfg } from "./combat/melee";
import { spawnProjectile, tickProjectile, isExpired, Projectile } from "./combat/projectile";
import { applyDamage, isDead } from "./combat/damage";
import { createHotbar, selectSlot, scrollSlot, activeWeapon, cycleTier, addWeapon, Hotbar } from "./combat/hotbar";
import { Tier, TIERS, OmegaMod } from "./combat/weapons";
import { computeStats, ResolvedWeapon } from "./combat/weapons";
import { getWeaponDefEx, weaponEffects, randomWeaponIdOfTier, randomUltimateWeaponId } from "./combat/catalog";
import { WeaponEffect, StatusState, makeStatus, applyDot, tickStatus, getEffect, hasEffect, projectileEffects, COMBO_WINDOW } from "./combat/effects";
import { rollDamage } from "./combat/crit";
import { rollRarity, isRare, rarityToWeaponTier, omganiumChance } from "./loot";
import { BALANCE } from "./balance";
import { ArmorSlot, ArmorInstance, makeEmptyArmor, makeArmor, makeUniqueArmor, makeOmegaArmor, UNIQUE_ARMORS, OMEGA_ARMORS, OMEGA_SETS, ARMOR_SLOTS, ARMOR_TYPES } from "./armor";
import { PlayerMods, computePlayerMods, incomingDamageFactor } from "./sets";
import { HubNpcAction, LockedRank } from "./hub";
import { derivePlayerMods, addXp, xpReward, bossXpReward, maxHpFor } from "./progression";
import { goldReward, bossGoldReward } from "./shop";
import { ClassId } from "./classes";
import { abilityForSlot } from "./skills";
import { Ally, Trap, castAbility, updateAllies, updateTraps, healFromLifesteal } from "./abilities";
import type { Door, Chest, PressurePlate, RoomTrap } from "./dungeon";
import type { Portal } from "./nexus";
import { Archetype, resolveEnemyStats, ENEMY_SKINS } from "./enemies";
import { updateEnemy } from "./ai";
import { Boss, updateBoss } from "./boss";
import { BiomeDef } from "./biomes";
import { TerrainZone, onTerrain, terrainDps, terrainTickInterval } from "./terrain";
import { getWorldEvent } from "./events";
import { getDungeonMod } from "./dungeonMods";
import { Vec2, v, sub, normalize, scale, distance, length } from "./math/vec2";

export interface InputState {
  moveDir: Vec2;
  aimPoint: Vec2;
  attack: boolean;
  dash: boolean;
  blink: boolean;
  selectSlot: number; // -1 ou 0..8
  scroll: number; // -1 / 0 / +1
  cycleTier: boolean; // front montant
  ability: number; // -1 ou slot de capacité 0..3 (touches R/C/V/B)
  pickup?: boolean; // front montant (touche G) : ramasser l'arme au sol la plus proche
  drop?: boolean; // front montant (touche X) : jeter l'arme active
}

export interface Player extends Entity {
  dash: DashState;
  blink: BlinkState;
  melee: MeleeState;
  hotbar: Hotbar;
  energy: number;
  rangedTimer: number; // temps depuis le dernier tir
  attackHeld: boolean; // front montant tir semi-auto
  tierHeld: boolean; // front montant cycle tier
  pity: number; // anti-malchance (drops sans rareté ≥ A)
  omganium: number; // matériau Ω (craft)
  gold: number; // monnaie (économie / boutique)
  armor: Record<ArmorSlot, ArmorInstance | null>; // équipement
  armorInv: ArmorInstance[]; // armures non équipées
  omegaUnlocked: boolean; // a déjà obtenu un objet Ω (déblocage PNJ Ω)
  // progression (tranche E)
  level: number;
  xp: number;
  statPoints: number; // points de stat à répartir
  skillPoints: number; // points de compétence (arbre)
  stats: { vitality: number; power: number; agility: number; precision: number };
  class: ClassId | null; // classe choisie (arbre de compétences)
  skills: Record<string, number>; // rang débloqué par nœud d'arbre
  cooldowns: Record<string, number>; // cooldowns de capacités (s)
  buffTimer: number; // durée restante d'un buff actif (Rage/Furtivité)
  comboStacks: number; // coups enchaînés (effet combo des armes nommées)
  comboTimer: number; // fenêtre restante avant la perte du combo
  blockTimer: number; // recharge du blocage auto (Bouclier éternel)
  phaseTimer: number; // horloge du cycle d'invisibilité (Cape infinie)
  invisTimer: number; // invisibilité active d'une capacité (Furtivité / Forme d'ombre)
  loadout: (string | null)[]; // capacité active par slot R/C/V/B (override du slot par défaut)
  reviveUsed: boolean; // résurrection (Immortel Absolu) déjà consommée ce combat
}

export interface DamageEvent {
  x: number;
  y: number;
  amount: number;
  targetId: number;
  crit: boolean;
}

export interface Enemy extends Entity {
  archetype: Archetype;
  name: string;
  skin: number; // 1..ENEMY_SKINS (variante visuelle)
  speed: number;
  knockback: number;
  contactTimer: number;
  contactDamage: number;
  fireTimer: number;
  slowTimer: number; // ralentissement (capacités slow)
  tauntTimer: number; // provocation : dégâts réduits tant que > 0
  status: StatusState; // DoT d'armes (brûlure/poison/saignement)
}

export interface WeaponPickup {
  id: number;
  pos: Vec2;
  radius: number;
  defId: string;
  tier: Tier;
  omega: boolean;
  mod?: OmegaMod; // conservé pour les armes Ω jetées/re-ramassées
  killBonus?: number; // conservé pour les armes à effet onKillAtk jetées/re-ramassées
  taken: boolean;
}

export interface MaterialPickup {
  id: number;
  pos: Vec2;
  radius: number;
  taken: boolean;
}

export interface Npc {
  id: number;
  pos: Vec2;
  radius: number;
  name: string;
  lines: string[];
  talked: boolean;
  role?: string; // PNJ de hub (Sanctuaire)
  lockedRank?: LockedRank; // verrouillé tant que ce rang n'est pas atteint
  action?: HubNpcAction; // soin / craft au dialogue
}

export interface Exit {
  id: number;
  pos: Vec2;
  radius: number;
}

export interface DungeonEntrance {
  id: number;
  pos: Vec2;
  radius: number;
}

export interface World {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: WeaponPickup[];
  materials: MaterialPickup[];
  playerMods: PlayerMods;
  npcs: Npc[];
  exits: Exit[];
  dungeonEntrances: DungeonEntrance[];
  boss: Boss | null;
  allies: Ally[];
  traps: Trap[];
  doors: Door[]; // portes de donjon (vides hors donjon)
  chests: Chest[]; // coffres de donjon
  plates: PressurePlate[]; // plaques de pression (salles puzzle, tranche L)
  roomTraps: RoomTrap[]; // pièges au sol (salles trap, tranche L)
  portals: Portal[]; // portails du Nexus (vides hors Nexus)
  level: Level;
  biome: BiomeDef | null;
  eventId: string | null; // événement de monde actif (tranche K), null sinon
  terrain: TerrainZone[]; // zones de terrain du biome (tranche K)
  modId: string | null; // modificateur de donjon actif (tranche L), null sinon
  events: DamageEvent[];
  nextId: number;
  godMode: boolean;
  rng: () => number;
  exitReached: boolean;
  doorReached: number | null; // id de la salle de donjon à charger
  dungeonReached: boolean; // joueur sur une entrée de donjon (mode biome)
  portalReached: number | null; // id du portail de Nexus atteint
}

export function createPlayer(): Player {
  const t = DEFAULT_TUNING;
  const base = makeEntity({ id: 1, x: 0, y: 0, maxHp: t.resources.maxHp, radius: 14, faction: "player" });
  return {
    ...base,
    dash: createDash(),
    blink: createBlink(),
    melee: createMelee(),
    hotbar: createHotbar(["fists"], "F"),
    energy: t.resources.maxEnergy,
    rangedTimer: 999,
    attackHeld: false,
    tierHeld: false,
    pity: 0,
    omganium: 0,
    gold: 0,
    armor: makeEmptyArmor(),
    armorInv: [],
    omegaUnlocked: false,
    level: 1,
    xp: 0,
    statPoints: 0,
    skillPoints: 0,
    stats: { vitality: 0, power: 0, agility: 0, precision: 0 },
    skills: {},
    cooldowns: {},
    buffTimer: 0,
    comboStacks: 0,
    comboTimer: 0,
    blockTimer: 0,
    phaseTimer: 0,
    invisTimer: 0,
    loadout: [null, null, null, null],
    reviveUsed: false,
    class: null,
  };
}

export function makeEnemy(
  id: number,
  x: number,
  y: number,
  archetype: Archetype,
  tier: Tier,
  name: string,
  skin: number = 1 + Math.floor(Math.random() * ENEMY_SKINS),
): Enemy {
  const s = resolveEnemyStats(archetype, tier);
  const base = makeEntity({ id, x, y, maxHp: Math.max(1, Math.round(s.maxHp * BALANCE.enemyHpMult)), radius: s.radius, faction: "enemy" });
  return {
    ...base,
    archetype,
    name,
    skin,
    speed: s.speed,
    knockback: s.knockback,
    contactTimer: 0,
    contactDamage: Math.round(s.contactDamage * BALANCE.enemyDamageMult),
    fireTimer: 0,
    slowTimer: 0,
    tauntTimer: 0,
    status: makeStatus(),
  };
}

/** Fait apparaître `count` chasers (clampé 1..10) en éventail près du joueur. Renvoie le nombre créé. */
export function spawnChasers(w: World, count: number, tier: Tier): number {
  const n = Math.max(1, Math.min(10, Math.floor(count) || 1));
  const pl = w.player;
  for (let i = 0; i < n; i++) {
    w.enemies.push(makeEnemy(w.nextId++, pl.transform.pos.x + 70 + i * 24, pl.transform.pos.y, "chaser", tier, "Invoqué"));
  }
  return n;
}

/** Élimine tous les ennemis (PV à 0, la mort/loot est traitée par tickWorld). Renvoie le nombre touché. */
export function killAllEnemies(w: World): number {
  const n = w.enemies.length;
  for (const e of w.enemies) e.health.hp = 0;
  return n;
}

/**
 * Champs de `World` aux valeurs par défaut (collections vides + drapeaux), partagés par tous les
 * générateurs de monde (createWorld / generateBiomeWorld / generateRoomWorld / Nexus). Étaler ceci
 * puis surcharger les champs spécifiques évite de dupliquer (et d'oublier) un champ à chaque ajout.
 */
export function defaultWorldState(): Pick<
  World,
  | "enemies"
  | "projectiles"
  | "pickups"
  | "materials"
  | "npcs"
  | "exits"
  | "dungeonEntrances"
  | "boss"
  | "allies"
  | "traps"
  | "doors"
  | "chests"
  | "plates"
  | "roomTraps"
  | "portals"
  | "eventId"
  | "terrain"
  | "modId"
  | "events"
  | "exitReached"
  | "doorReached"
  | "dungeonReached"
  | "portalReached"
  | "godMode"
> {
  return {
    enemies: [],
    projectiles: [],
    pickups: [],
    materials: [],
    npcs: [],
    exits: [],
    dungeonEntrances: [],
    boss: null,
    allies: [],
    traps: [],
    doors: [],
    chests: [],
    plates: [],
    roomTraps: [],
    portals: [],
    eventId: null,
    terrain: [],
    modId: null,
    events: [],
    exitReached: false,
    doorReached: null,
    dungeonReached: false,
    portalReached: null,
    godMode: false,
  };
}

export function createWorld(): World {
  const level: Level = {
    bounds: { x: 0, y: 0, w: 1200, h: 800 },
    walls: [{ x: 520, y: 340, w: 160, h: 120 }],
  };
  const player = createPlayer();
  player.transform.pos = { x: 300, y: 400 };
  const dummy = makeEnemy(2, 700, 250, "dummy", "F", "Mannequin");
  const chaser = makeEnemy(3, 900, 550, "chaser", "F", "Rôdeur");
  // 6 armes posées au sol (évitent le mur x∈[520,680] y∈[340,460] et le spawn joueur)
  const drops: Array<[string, number, number]> = [
    ["sword", 500, 200],
    ["dagger", 250, 650],
    ["axe", 850, 200],
    ["hammer", 950, 400],
    ["bow", 450, 600],
    ["staff", 800, 660],
  ];
  const pickups: WeaponPickup[] = drops.map(([defId, x, y], i) => ({
    id: 10 + i,
    pos: v(x, y),
    radius: 18,
    defId,
    tier: "F",
    omega: false,
    taken: false,
  }));
  return {
    ...defaultWorldState(),
    player,
    enemies: [dummy, chaser],
    pickups,
    playerMods: computePlayerMods(player.armor),
    level,
    biome: null,
    nextId: 100,
    rng: Math.random,
  };
}

function meleeCfgFor(rw: ResolvedWeapon, base: Tuning["melee"]): MeleeCfg {
  const s = rw.attackSpeed;
  return {
    damage: rw.atk,
    range: rw.range,
    arcDeg: rw.arcDeg,
    windup: base.windup / s,
    active: base.active / s,
    recovery: base.recovery / s,
    cadence: base.cadence / s,
    knockback: rw.knockback,
  };
}

const baseMeleeCfg = (base: Tuning["melee"]): MeleeCfg => ({
  damage: 0,
  range: 0,
  arcDeg: 0,
  windup: base.windup,
  active: base.active,
  recovery: base.recovery,
  cadence: base.cadence,
  knockback: 0,
});

function spawnOmganium(w: World, x: number, y: number): void {
  w.materials.push({ id: w.nextId++, pos: { x, y }, radius: 14, taken: false });
}

/** Crée un drop d'arme au sol (rareté tirée selon le rang + pity, met à jour le pity). */
function spawnLootDrop(w: World, x: number, y: number, biasLevel: number): void {
  const p = w.player;
  const r = rollRarity(w.rng, biasLevel, p.pity);
  p.pity = isRare(r) ? 0 : p.pity + 1;
  const { tier, omega } = rarityToWeaponTier(r);
  const defId = randomWeaponIdOfTier(tier, w.rng); // arme nommée du catalogue, au tier tiré
  w.pickups.push({ id: w.nextId++, pos: { x, y }, radius: 16, defId, tier, omega, taken: false });
}

/** Chance de drop actuelle : BALANCE.dropChance × muls événement (K) et mod de donjon (L). */
export function dropChanceFor(w: World): number {
  const ev = getWorldEvent(w.eventId ?? "");
  const mod = getDungeonMod(w.modId ?? "");
  return BALANCE.dropChance * (ev?.effects.lootMul ?? 1) * (mod?.lootMul ?? 1);
}

/** Multiplicateur d'or actuel (mod de donjon L ; les événements K n'ont pas de goldMul). */
export function goldMulFor(w: World): number {
  const mod = getDungeonMod(w.modId ?? "");
  return mod?.goldMul ?? 1;
}

/** Le joueur est-il invisible ? (Cape infinie cyclique OU capacité d'invisibilité active) */
export function isPlayerPhased(w: World): boolean {
  if (w.player.invisTimer > 0) return true;
  const ph = w.playerMods.phase;
  return ph !== null && w.player.phaseTimer % ph.interval >= ph.interval - ph.duration;
}

/**
 * Point d'entrée UNIQUE des dégâts subis par le joueur (contact, projectiles, boss) :
 * godmode → invisibilité (Cape infinie) → esquive → blocage auto (Bouclier éternel) →
 * défense + résistance plate. Renvoie true si des dégâts ont été appliqués.
 */
export function hurtPlayer(w: World, rawDmg: number, kb: Vec2, iframes = 0.12): boolean {
  const p = w.player;
  if (w.godMode) return false;
  if (isPlayerPhased(w)) return false;
  if (w.rng() < w.playerMods.dodge) return false; // esquive (set Néant + effets d'armure)
  if (w.playerMods.autoBlockCooldown > 0 && p.blockTimer <= 0) {
    p.blockTimer = w.playerMods.autoBlockCooldown; // le coup est bloqué, la recharge repart
    return false;
  }
  const reduced = Math.round(rawDmg * incomingDamageFactor(w.playerMods));
  if (applyDamage(p, reduced, kb)) {
    p.health.iframes = Math.max(p.health.iframes, iframes);
    w.events.push({ x: p.transform.pos.x, y: p.transform.pos.y, amount: reduced, targetId: p.id, crit: false });
    if (p.health.hp <= 0) reviveIfPossible(w); // coup létal → résurrection (Immortel Absolu Ω)
    return true;
  }
  return false;
}

/** Résurrection auto (Immortel Absolu Ω) : 1×/combat. Restaure 50% PV + i-frames. */
export function reviveIfPossible(w: World): boolean {
  const p = w.player;
  if (!w.playerMods.revive || p.reviveUsed || w.godMode || p.health.hp > 0) return false;
  p.reviveUsed = true;
  p.health.hp = Math.round(p.health.maxHp * 0.5);
  p.health.iframes = Math.max(p.health.iframes, 1.5);
  p.health.shield = 0;
  w.events.push({ x: p.transform.pos.x, y: p.transform.pos.y, amount: 0, targetId: p.id, crit: true });
  return true;
}

/** Onde de choc d'arme : dégâts de zone autour de la cible touchée (sans ré-appliquer d'effets). */
function shockwaveAt(w: World, center: Vec2, radius: number, dmg: number, excludeId: number): void {
  for (const e of w.enemies) {
    if (e.id === excludeId) continue;
    if (distance(center, e.transform.pos) <= radius + e.radius) {
      const kb = scale(normalize(sub(e.transform.pos, center)), 120);
      if (applyDamage(e, dmg, kb)) {
        w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: dmg, targetId: e.id, crit: false });
      }
    }
  }
  const b = w.boss;
  if (b && b.id !== excludeId && distance(center, b.transform.pos) <= radius + b.radius) {
    if (applyDamage(b, dmg, scale(normalize(sub(b.transform.pos, center)), 30))) {
      w.events.push({ x: b.transform.pos.x, y: b.transform.pos.y, amount: dmg, targetId: b.id, crit: false });
    }
  }
}

/** Multiplicateur de dégâts des effets d'arme pour cette cible (combo, attaque de dos, anti-boss). */
function effectDamageMult(w: World, fx: WeaponEffect[], target: Entity, isBoss: boolean): number {
  let mult = 1;
  const combo = getEffect(fx, "combo");
  if (combo) mult *= 1 + combo.perHit * Math.min(w.player.comboStacks, combo.max);
  const back = getEffect(fx, "backstab");
  if (back) {
    const vel = target.transform.vel;
    const vl = length(vel);
    const hitDir = normalize(sub(target.transform.pos, w.player.transform.pos));
    // de dos = la cible s'éloigne du coup (vitesse alignée avec la direction du coup)
    if (vl > 10 && (vel.x / vl) * hitDir.x + (vel.y / vl) * hitDir.y > 0.3) mult *= back.mult;
  }
  const bb = getEffect(fx, "bossBonus");
  if (bb && isBoss) mult *= bb.mult;
  return mult;
}

/** Applique les effets « à l'impact » d'une arme après un coup réussi (statuts, drain, ondes, stop temps). */
function applyHitEffects(w: World, target: Enemy | Boss, fx: WeaponEffect[], dmg: number, crit: boolean, isBoss: boolean): void {
  const p = w.player;
  for (const e of fx) {
    if (e.kind === "burn" || e.kind === "poison" || e.kind === "bleed") {
      applyDot(target.status, e.kind, e.dps, e.duration);
    } else if (e.kind === "slow" && !isBoss) {
      (target as Enemy).slowTimer = Math.max((target as Enemy).slowTimer, e.duration);
    } else if (e.kind === "stun" && !isBoss && w.rng() < (e.chance ?? 1)) {
      target.health.hitstun = Math.max(target.health.hitstun, e.duration);
    }
  }
  const drain = getEffect(fx, "lifedrain");
  if (drain) p.health.hp = Math.min(p.health.maxHp, p.health.hp + Math.round(dmg * drain.pct));
  const sw = getEffect(fx, "shockwave");
  if (sw && (!sw.onCrit || crit)) shockwaveAt(w, target.transform.pos, sw.radius, Math.max(1, Math.round(dmg * sw.factor)), target.id);
  const cs = getEffect(fx, "critStun");
  if (cs && crit) {
    for (const e of w.enemies) e.health.hitstun = Math.max(e.health.hitstun, cs.duration);
  }
}

/** Pilotage des projectiles guidés : vire vers l'ennemi vivant le plus proche. */
function steerHoming(w: World, proj: Projectile, dt: number): void {
  let target: Entity | null = null;
  let bd = 500; // portée de guidage
  for (const e of w.enemies) {
    if (e.archetype === "dummy" || proj.hitIds.has(e.id)) continue;
    const d = distance(proj.pos, e.transform.pos);
    if (d < bd) {
      bd = d;
      target = e;
    }
  }
  if (w.boss && !proj.hitIds.has(w.boss.id) && distance(proj.pos, w.boss.transform.pos) < bd) target = w.boss;
  if (!target) return;
  const speed = length(proj.vel);
  if (speed === 0) return;
  const cur = Math.atan2(proj.vel.y, proj.vel.x);
  const des = Math.atan2(target.transform.pos.y - proj.pos.y, target.transform.pos.x - proj.pos.x);
  let delta = des - cur;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const maxTurn = 6 * dt; // rad/s
  const na = cur + Math.max(-maxTurn, Math.min(maxTurn, delta));
  proj.vel = scale(v(Math.cos(na), Math.sin(na)), speed);
}

export function tickWorld(w: World, input: InputState, t: Tuning, dt: number): void {
  const p = w.player;
  w.playerMods = derivePlayerMods(p); // armure + sets + stats (+ passifs d'arbre) — à jour chaque tick

  // DONJON tranche L : modificateur — ralentissement appliqué AVANT le mouvement de ce tick
  {
    const mod = getDungeonMod(w.modId ?? "");
    if (mod?.playerSpeedMul) w.playerMods.speedMul *= mod.playerSpeedMul;
  }

  // PV max synchronisés avec la progression (stats + passifs d'arbre)
  const mh = maxHpFor(p);
  if (p.health.maxHp !== mh) {
    const d = mh - p.health.maxHp;
    p.health.maxHp = mh;
    if (d > 0) p.health.hp = Math.min(mh, p.health.hp + d);
  }
  if (p.health.hp > mh) p.health.hp = mh;

  // timers de progression (buff + cooldowns de capacités)
  p.buffTimer = Math.max(0, p.buffTimer - dt);
  for (const k in p.cooldowns) if (p.cooldowns[k] > 0) p.cooldowns[k] = Math.max(0, p.cooldowns[k] - dt);

  // effets d'armure : régénération, blocage auto (recharge), cycle d'invisibilité
  if (w.playerMods.hpRegen > 0) p.health.hp = Math.min(p.health.maxHp, p.health.hp + w.playerMods.hpRegen * dt);
  p.blockTimer = Math.max(0, p.blockTimer - dt);
  p.phaseTimer = w.playerMods.phase ? (p.phaseTimer + dt) % w.playerMods.phase.interval : 0;
  p.invisTimer = Math.max(0, p.invisTimer - dt); // invisibilité de capacité

  // sélection d'arme (clavier + molette) + cycle de tier (front montant)
  if (input.selectSlot >= 0) selectSlot(p.hotbar, input.selectSlot);
  if (input.scroll !== 0) scrollSlot(p.hotbar, input.scroll);
  if (input.cycleTier && !p.tierHeld) cycleTier(p.hotbar);
  p.tierHeld = input.cycleTier;

  // arme active résolue (null si slot vide) + effets portés (armes nommées du catalogue)
  const inst = activeWeapon(p.hotbar);
  const rw: ResolvedWeapon | null = inst ? computeStats(getWeaponDefEx(inst.defId), inst.tier, inst.omega, inst.mod) : null;
  const fx: WeaponEffect[] = inst ? weaponEffects(inst.defId) : [];
  if (rw && inst?.killBonus) rw.atk *= 1 + inst.killBonus / 100; // ATK gagnée par kills (onKillAtk)

  // passifs « en main » (aura, régénération, focus d'énergie)
  const aura = getEffect(fx, "aura");
  if (aura) {
    w.playerMods.damageMul *= 1 + (aura.damageMul ?? 0);
    w.playerMods.speedMul *= 1 + (aura.speedMul ?? 0);
  }
  const rgn = getEffect(fx, "regen");
  if (rgn) p.health.hp = Math.min(p.health.maxHp, p.health.hp + rgn.hpPerSec * dt);
  const eng = getEffect(fx, "energize");
  if (eng) p.energy = Math.min(t.resources.maxEnergy, p.energy + eng.energyPerSec * dt);
  const drain = getEffect(fx, "selfDrain"); // arme Ω « Briseur de Réalité » : se draine soi-même (jamais sous 1 PV)
  if (drain && !w.godMode) p.health.hp = Math.max(1, p.health.hp - (p.health.maxHp * drain.pctPerSec / 100) * dt);
  if (rw) rw.attackSpeed *= w.playerMods.attackSpeedMul; // vitesse d'attaque d'armure (Gants Ω)

  // fenêtre de combo (effet combo : retombe à zéro si on cesse d'enchaîner)
  p.comboTimer = Math.max(0, p.comboTimer - dt);
  if (p.comboTimer === 0) p.comboStacks = 0;

  // énergie
  p.energy = Math.min(t.resources.maxEnergy, p.energy + t.resources.energyRegen * dt);

  const playerOccupy = (pt: Vec2) => canOccupy(pt, p.radius, w.level);

  // dash : déclenché AVANT son tick pour se déplacer dès la frame d'appui (recharge × armure)
  const dashCfg = w.playerMods.dashCooldownMul !== 1 ? { ...t.dash, cooldown: t.dash.cooldown * w.playerMods.dashCooldownMul } : t.dash;
  if (input.dash) startDash(p.dash, input.moveDir, p, dashCfg);
  tickDash(p.dash, p, dashCfg, dt, playerOccupy);
  tickBlink(p.blink, dt);
  p.rangedTimer += dt;

  // mouvement (sauf en dash ; pendant le hitstun on laisse glisser le knockback sans contrôle)
  if (!isDashing(p.dash)) {
    const moveInput = isStunned(p) ? v(0, 0) : input.moveDir;
    const ev = getWorldEvent(w.eventId ?? "");
    const onIce = onTerrain(w.terrain, "ice", p.transform.pos, p.radius);
    const slip = ev?.effects.playerFrictionMul ?? (onIce ? 0.12 : 1);
    const moveCfg = {
      ...t.move,
      maxSpeed: t.move.maxSpeed * w.playerMods.speedMul, // type d'armure
      friction: t.move.friction * slip, // sol glissant (événement) / glace (terrain)
    };
    applyMovementCollide(p.transform, moveInput, moveCfg, dt, playerOccupy);
  }
  p.transform.pos = clampToBounds(p.transform.pos, p.radius, w.level.bounds);

  // vent d'événement : dérive externe constante, glisse le long des murs (jamais en dash)
  if (!isDashing(p.dash)) {
    const ev = getWorldEvent(w.eventId ?? "");
    const wind = ev?.effects.wind;
    if (wind) {
      const dx = wind.dx * wind.force * dt;
      const dy = wind.dy * wind.force * dt;
      const nx = p.transform.pos.x + dx;
      if (canOccupy({ x: nx, y: p.transform.pos.y }, p.radius, w.level)) p.transform.pos.x = nx;
      const ny = p.transform.pos.y + dy;
      if (canOccupy({ x: p.transform.pos.x, y: ny }, p.radius, w.level)) p.transform.pos.y = ny;
      p.transform.pos = clampToBounds(p.transform.pos, p.radius, w.level.bounds);
    }
  }

  // blink (pas pendant le dash)
  if (input.blink && !isDashing(p.dash)) {
    const energyRef = { value: p.energy };
    doBlink(p.blink, p, input.aimPoint, energyRef, t.blink, playerOccupy);
    p.energy = energyRef.value;
  }

  const aimDir = normalize(sub(input.aimPoint, p.transform.pos));
  const isMeleeWeapon = rw !== null && rw.category === "melee";
  const meleeCfg = isMeleeWeapon ? meleeCfgFor(rw as ResolvedWeapon, t.melee) : baseMeleeCfg(t.melee);

  // ATTAQUE MÊLÉE (auto-répétée tant que maintenu, limitée par la cadence)
  if (isMeleeWeapon && input.attack) startMelee(p.melee, aimDir, meleeCfg);
  tickMelee(p.melee, meleeCfg, dt);
  if (isMeleeWeapon && isMeleeActive(p.melee)) {
    const r = rw as ResolvedWeapon;
    const onKill = getEffect(fx, "onKillAtk");
    let comboHit = false;
    const targets = targetsInArc(p.transform.pos, p.melee.aimDir, w.enemies, meleeCfg) as Enemy[];
    for (const e of targets) {
      if (p.melee.hitIds.has(e.id)) continue;
      const roll = rollDamage(r.atk, r.critChance + w.playerMods.critAdd, r.critDamage, w.rng);
      const dmg = Math.round(roll.amount * w.playerMods.damageMul * effectDamageMult(w, fx, e, false));
      const kb = scale(normalize(sub(e.transform.pos, p.transform.pos)), r.knockback);
      if (applyDamage(e, dmg, kb)) {
        p.melee.hitIds.add(e.id);
        comboHit = true;
        w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: dmg, targetId: e.id, crit: roll.crit });
        healFromLifesteal(w, dmg);
        applyHitEffects(w, e, fx, dmg, roll.crit, false);
        if (onKill && inst && isDead(e) && e.archetype !== "dummy") {
          inst.killBonus = Math.min(onKill.maxPct, (inst.killBonus ?? 0) + onKill.pct);
        }
      }
    }
    // boss aussi (×1.5 en faiblesse)
    const b = w.boss;
    if (b && !p.melee.hitIds.has(b.id) && targetsInArc(p.transform.pos, p.melee.aimDir, [b], meleeCfg).length > 0) {
      const roll = rollDamage(r.atk, r.critChance + w.playerMods.critAdd, r.critDamage, w.rng);
      const amt = Math.round(roll.amount * w.playerMods.damageMul * (b.state === "weakness" ? 1.5 : 1) * effectDamageMult(w, fx, b, true));
      if (applyDamage(b, amt, scale(normalize(sub(b.transform.pos, p.transform.pos)), r.knockback * 0.25))) {
        p.melee.hitIds.add(b.id);
        comboHit = true;
        w.events.push({ x: b.transform.pos.x, y: b.transform.pos.y, amount: amt, targetId: b.id, crit: roll.crit });
        healFromLifesteal(w, amt);
        applyHitEffects(w, b, fx, amt, roll.crit, true);
      }
    }
    if (comboHit && hasEffect(fx, "combo")) {
      const c = getEffect(fx, "combo")!;
      p.comboStacks = Math.min(c.max, p.comboStacks + 1);
      p.comboTimer = COMBO_WINDOW;
    }
  }

  // ATTAQUE À DISTANCE (semi-auto : un tir par appui — ou continue si l'arme a « autofire »)
  const rangedEdge = input.attack && (hasEffect(fx, "autofire") || !p.attackHeld);
  if (rw !== null && rw.category === "ranged" && rangedEdge && length(aimDir) > 0) {
    const cadence = t.ranged.cadence / rw.attackSpeed;
    if (p.rangedTimer >= cadence) {
      const roll = rollDamage(rw.atk, rw.critChance + w.playerMods.critAdd, rw.critDamage, w.rng);
      const dmg = Math.round(roll.amount * w.playerMods.damageMul);
      const carried = projectileEffects(fx);
      const n = Math.max(1, getEffect(fx, "multishot")?.count ?? 1);
      const base = Math.atan2(aimDir.y, aimDir.x);
      const spread = n > 1 ? (16 * Math.PI) / 180 : 0;
      for (let i = 0; i < n; i++) {
        const a = n > 1 ? base - spread / 2 + spread * (i / (n - 1)) : base;
        const proj = spawnProjectile(
          w.nextId++,
          p.transform.pos,
          v(Math.cos(a), Math.sin(a)),
          {
            speed: rw.projectileSpeed,
            radius: rw.projectileRadius,
            damage: dmg,
            lifetime: t.ranged.lifetime,
            pierce: rw.signature === "pierce" || hasEffect(fx, "pierce"),
            crit: roll.crit,
          },
          "player",
        );
        if (hasEffect(fx, "homing")) proj.homing = true;
        if (carried.length > 0) proj.effects = carried;
        w.projectiles.push(proj);
      }
      p.rangedTimer = 0;
    }
  }
  p.attackHeld = input.attack;

  // capacité active (touches R/C/V/B → slot 0..3)
  if (input.ability >= 0) {
    const ua = abilityForSlot(p, input.ability);
    if (ua) castAbility(w, ua.ability, ua.level, input.aimPoint);
  }

  // projectiles : faction "enemy" → touche le joueur ; faction "player" → touche les ennemis (pierce)
  for (const proj of w.projectiles) {
    if (proj.homing && proj.faction === "player") steerHoming(w, proj, dt);
    tickProjectile(proj, dt);
    if (proj.faction === "enemy") {
      if (!proj.hitIds.has(p.id) && distance(proj.pos, p.transform.pos) <= proj.radius + p.radius) {
        hurtPlayer(w, proj.damage, scale(normalize(proj.vel), 60));
        proj.life = 0; // consommé même si esquivé/bloqué
      }
    } else {
      let consumed = false;
      for (const e of w.enemies) {
        if (proj.hitIds.has(e.id)) continue;
        if (distance(proj.pos, e.transform.pos) <= proj.radius + e.radius) {
          const pdmg = proj.effects ? Math.round(proj.damage * effectDamageMult(w, proj.effects, e, false)) : proj.damage;
          if (applyDamage(e, pdmg, scale(normalize(proj.vel), 80))) {
            proj.hitIds.add(e.id);
            w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: pdmg, targetId: e.id, crit: proj.crit });
            healFromLifesteal(w, pdmg);
            if (proj.effects) applyHitEffects(w, e, proj.effects, pdmg, proj.crit, false);
          }
          if (!proj.pierce) {
            proj.life = 0;
            consumed = true;
            break;
          }
        }
      }
      // boss (×1.5 en faiblesse)
      const b = w.boss;
      if (!consumed && b && !proj.hitIds.has(b.id) && distance(proj.pos, b.transform.pos) <= proj.radius + b.radius) {
        const mult = (b.state === "weakness" ? 1.5 : 1) * (proj.effects ? effectDamageMult(w, proj.effects, b, true) : 1);
        const amt = Math.round(proj.damage * mult);
        if (applyDamage(b, amt, scale(normalize(proj.vel), 40))) {
          proj.hitIds.add(b.id);
          w.events.push({ x: b.transform.pos.x, y: b.transform.pos.y, amount: amt, targetId: b.id, crit: proj.crit });
          healFromLifesteal(w, amt);
          if (proj.effects) applyHitEffects(w, b, proj.effects, amt, proj.crit, true);
        }
        if (!proj.pierce) proj.life = 0;
      }
    }
  }
  w.projectiles = w.projectiles.filter((proj) => !isExpired(proj));

  // dégâts sur la durée (brûlure / poison / saignement) — la mort éventuelle est traitée par
  // le balayage standard plus bas (XP / or / loot identiques à un kill direct)
  for (const e of w.enemies) {
    if (isDead(e)) continue;
    const dot = tickStatus(e.status, dt);
    if (dot > 0) {
      e.health.hp = Math.max(0, e.health.hp - dot);
      w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: dot, targetId: e.id, crit: false });
    }
  }

  // IA des ennemis (mouvement + attaque selon l'archétype)
  for (const e of w.enemies) updateEnemy(e, w, t, dt);
  // drops : un ennemi qui meurt peut lâcher une arme + (rarement) de l'Omganium
  // (hors mannequin et sbires de boss)
  const biomeTier = w.biome ? w.biome.tier : "F";
  const biasLevel = TIERS.indexOf(biomeTier);
  for (const e of w.enemies) {
    if (e.archetype === "dummy" || !isDead(e)) continue;
    addXp(p, Math.round(xpReward(e.archetype, biomeTier) * BALANCE.xpMult)); // XP même pour les sbires
    p.gold += Math.round(goldReward(biomeTier) * goldMulFor(w));
    if (e.name === "Sbire") continue; // sbires : pas de loot
    if (w.rng() < dropChanceFor(w)) spawnLootDrop(w, e.transform.pos.x, e.transform.pos.y, biasLevel);
    if (w.rng() < omganiumChance(biasLevel, "enemy")) spawnOmganium(w, e.transform.pos.x, e.transform.pos.y);
  }
  w.enemies = w.enemies.filter((e) => e.archetype === "dummy" || !isDead(e));

  // boss
  if (w.boss) {
    tickIframes(w.boss, dt);
    tickHitstun(w.boss, dt);
    if (!isDead(w.boss)) {
      const dot = tickStatus(w.boss.status, dt);
      if (dot > 0) {
        w.boss.health.hp = Math.max(0, w.boss.health.hp - dot);
        w.events.push({ x: w.boss.transform.pos.x, y: w.boss.transform.pos.y, amount: dot, targetId: w.boss.id, crit: false });
      }
    }
    updateBoss(w.boss, w, dt);
    if (isDead(w.boss)) {
      // drops garantis de boss (rang élevé : bonus +2) + 50% d'Omganium
      const bossBias = Math.min(6, (w.biome ? TIERS.indexOf(w.biome.tier) : 0) + 2);
      for (let i = 0; i < 3; i++) spawnLootDrop(w, w.boss.transform.pos.x + (i - 1) * 44, w.boss.transform.pos.y + 30, bossBias);
      const biomeTi = w.biome ? TIERS.indexOf(w.biome.tier) : 0;
      if (w.rng() < omganiumChance(biomeTi, "boss")) spawnOmganium(w, w.boss.transform.pos.x, w.boss.transform.pos.y - 20);
      // pièce d'armure Ω d'un set (récompense de boss → inventaire) ; type varié
      const dropSet = OMEGA_SETS[Math.floor(w.rng() * OMEGA_SETS.length)];
      const dropSlot = ARMOR_SLOTS[Math.floor(w.rng() * ARMOR_SLOTS.length)];
      const dropType = ARMOR_TYPES[Math.floor(w.rng() * ARMOR_TYPES.length)];
      p.armorInv.push(makeArmor(w.nextId++, dropSlot, dropType, w.boss.tier, dropSet));
      // boss de rang S : pièce unique S (50%) + chances d'objets Ω uniques (endgame)
      if (w.boss.tier === "S") {
        if (w.rng() < 0.5) p.armorInv.push(makeUniqueArmor(w.nextId++, UNIQUE_ARMORS[Math.floor(w.rng() * UNIQUE_ARMORS.length)]));
        if (w.rng() < 0.25) {
          // arme Ω unique au sol (intrinsèquement Ω → omega: true)
          w.pickups.push({ id: w.nextId++, pos: { x: w.boss.transform.pos.x, y: w.boss.transform.pos.y + 50 }, radius: 16, defId: randomUltimateWeaponId(w.rng), tier: "S", omega: true, taken: false });
          p.omegaUnlocked = true;
        }
        if (w.rng() < 0.2) p.armorInv.push(makeOmegaArmor(w.nextId++, OMEGA_ARMORS[Math.floor(w.rng() * OMEGA_ARMORS.length)]));
      }
      addXp(p, Math.round(bossXpReward(w.boss.tier) * BALANCE.xpMult));
      p.gold += Math.round(bossGoldReward(w.boss.tier) * goldMulFor(w));
      w.events.push({ x: w.boss.transform.pos.x, y: w.boss.transform.pos.y, amount: 0, targetId: w.boss.id, crit: false });
      w.boss = null;
      w.enemies = w.enemies.filter((e) => e.name !== "Sbire"); // les sbires partent avec le boss
    }
  }

  // alliés invoqués + pièges
  updateAllies(w, dt);
  updateTraps(w, dt);

  // DONJON tranche L : plaques de pression — le joueur marche dessus → active
  for (const pl of w.plates) {
    if (!pl.active && distance(p.transform.pos, v(pl.x, pl.y)) <= p.radius + pl.radius) pl.active = true;
  }
  // DONJON tranche L : pièges de salle (spikes/poison) — DoT cadencé via les i-frames
  for (const tr of w.roomTraps) {
    const interval = 0.4;
    if (distance(p.transform.pos, v(tr.x, tr.y)) > p.radius + tr.radius) continue;
    const dps = tr.kind === "poison" ? 5 : 10;
    const dmg = Math.max(1, Math.round(dps * interval));
    hurtPlayer(w, dmg, v(0, 0), interval);
  }
  // DONJON tranche L : modificateur — drain de vie (le ralentissement est appliqué en début de tick)
  {
    const mod = getDungeonMod(w.modId ?? "");
    if (mod?.playerDps) {
      const dmg = Math.max(1, Math.round(mod.playerDps * 0.5));
      hurtPlayer(w, dmg, v(0, 0), 0.5);
    }
  }

  // TERRAIN (tranche K) : zones dangereuses au sol — DoT cadencé via les i-frames de hurtPlayer
  const dangerKinds: TerrainZone["kind"][] = ["lava", "poison", "spikes"];
  for (const kind of dangerKinds) {
    if (!onTerrain(w.terrain, kind, p.transform.pos, p.radius)) continue;
    const interval = terrainTickInterval(kind);
    const dmg = Math.max(1, Math.round(terrainDps(kind) * interval));
    hurtPlayer(w, dmg, v(0, 0), interval);
  }
  // ÉVÉNEMENT (tranche K) : DoT ambiant (pluie acide, zone corrompue) — cadencé 0.5 s
  {
    const ev = getWorldEvent(w.eventId ?? "");
    if (ev?.effects.playerDps) {
      const dmg = Math.max(1, Math.round(ev.effects.playerDps * 0.5));
      hurtPlayer(w, dmg, v(0, 0), 0.5);
    }
  }

  // jet de l'arme active (touche X) — sauf les Poings (slot 0)
  if (input.drop) {
    const inst = activeWeapon(p.hotbar);
    if (inst && p.hotbar.activeIndex !== 0 && inst.defId !== "fists") {
      w.pickups.push({
        id: w.nextId++,
        pos: { x: p.transform.pos.x, y: p.transform.pos.y + 26 },
        radius: 16,
        defId: inst.defId,
        tier: inst.tier,
        omega: inst.omega ?? false,
        mod: inst.mod,
        killBonus: inst.killBonus,
        taken: false,
      });
      p.hotbar.slots[p.hotbar.activeIndex] = null;
      p.hotbar.activeIndex = 0; // revient aux Poings
    }
  }

  // ramassage manuel d'armes (touche G) → arme au sol la plus proche à portée, 1er slot libre
  if (input.pickup) {
    let best: WeaponPickup | null = null;
    let bd = Infinity;
    for (const pk of w.pickups) {
      if (pk.taken) continue;
      const d = distance(p.transform.pos, pk.pos);
      if (d <= p.radius + pk.radius + 18 && d < bd) {
        bd = d;
        best = pk;
      }
    }
    if (best) {
      const slot = addWeapon(p.hotbar, { defId: best.defId, tier: best.tier, omega: best.omega, mod: best.mod, killBonus: best.killBonus });
      if (slot >= 0) {
        selectSlot(p.hotbar, slot);
        best.taken = true;
        if (best.omega) p.omegaUnlocked = true;
      }
    }
  }

  // ramassage d'Omganium
  for (const m of w.materials) {
    if (m.taken) continue;
    if (distance(p.transform.pos, m.pos) <= p.radius + m.radius) {
      p.omganium += 1;
      m.taken = true;
    }
  }
  // compactage des objets ramassés (évite l'accumulation dans les tableaux)
  w.pickups = w.pickups.filter((pk) => !pk.taken);
  w.materials = w.materials.filter((m) => !m.taken);

  // sortie de zone (retour carte) — verrouillée tant qu'un boss vit (il garde la sortie)
  if (w.boss === null) {
    for (const ex of w.exits) {
      if (distance(p.transform.pos, ex.pos) <= p.radius + ex.radius) w.exitReached = true;
    }
  }

  // donjon : entrée (mode biome), portes ouvertes, coffres
  for (const dg of w.dungeonEntrances) {
    if (distance(p.transform.pos, dg.pos) <= p.radius + dg.radius) w.dungeonReached = true;
  }
  for (const door of w.doors) {
    if (door.open && distance(p.transform.pos, door.pos) <= p.radius + 24) w.doorReached = door.to;
  }
  for (const portal of w.portals) {
    if (portal.open && distance(p.transform.pos, portal.pos) <= p.radius + portal.radius) w.portalReached = portal.id;
  }
  for (const ch of w.chests) {
    if (!ch.opened && distance(p.transform.pos, ch.pos) <= p.radius + ch.radius) {
      ch.opened = true;
      const n = 2 + Math.floor(w.rng() * 2);
      for (let i = 0; i < n; i++) spawnLootDrop(w, ch.pos.x + (i - 1) * 30, ch.pos.y + 28, ch.rank);
      // Omganium gaté sur le rang RÉEL du biome (pas le rang gonflé du coffre)
      const chestBiomeTi = w.biome ? TIERS.indexOf(w.biome.tier) : 0;
      if (w.rng() < omganiumChance(chestBiomeTi, "chest")) spawnOmganium(w, ch.pos.x, ch.pos.y - 20);
      // coffre de boss du Nexus (rang 6) : butin Ω unique garanti (endgame)
      if (ch.rank >= 6) {
        w.pickups.push({ id: w.nextId++, pos: { x: ch.pos.x, y: ch.pos.y + 40 }, radius: 16, defId: randomUltimateWeaponId(w.rng), tier: "S", omega: true, taken: false });
        p.armorInv.push(makeOmegaArmor(w.nextId++, OMEGA_ARMORS[Math.floor(w.rng() * OMEGA_ARMORS.length)]));
        p.omegaUnlocked = true;
      }
    }
  }

  // résurrection (Immortel Absolu Ω) : recharge hors combat ; déclenchée au coup létal (hurtPlayer).
  // Filet de sécurité : si les PV sont à 0 sans être passés par hurtPlayer, on tente quand même.
  const inCombat = w.boss !== null || w.enemies.some((e) => e.archetype !== "dummy" && !isDead(e));
  if (!inCombat) p.reviveUsed = false;
  else if (isDead(p)) reviveIfPossible(w);

  // i-frames + hitstun
  tickIframes(p, dt);
  tickHitstun(p, dt);
  for (const e of w.enemies) {
    tickIframes(e, dt);
    tickHitstun(e, dt);
  }
}
