import { Entity, makeEntity } from "./entity";
import { canOccupy, clampToBounds } from "./collision";
import { applyMovementCollide } from "./movement";
import { spawnProjectile } from "./combat/projectile";
import { PatternKind, PhaseDef, BossDef, resolveBossStats } from "./bosses";
import { Tier } from "./combat/weapons";
import { StatusState, makeStatus } from "./combat/effects";
import { World, makeEnemy, hurtPlayer } from "./world";
import { Vec2, v, sub, normalize, scale, length, distance } from "./math/vec2";

export type BossState = "cooldown" | "telegraph" | "execute" | "weakness";

export interface BossTelegraph {
  kind: PatternKind;
  x: number;
  y: number;
  radius: number;
  dirX: number;
  dirY: number;
  progress: number; // 0..1
}

export interface Boss extends Entity {
  name: string;
  intro: string;
  tier: Tier;
  phases: PhaseDef[];
  phaseIndex: number;
  state: BossState;
  stateTimer: number;
  currentPattern: PatternKind | null;
  lastPattern: PatternKind | null;
  telegraph: BossTelegraph | null;
  chargeDir: Vec2;
  contactDamage: number;
  projDamage: number;
  aoeDamage: number;
  status: StatusState; // DoT d'armes (brûlure/poison/saignement) — les boss résistent aux CC
}

const COOLDOWN = 1.1;
const WEAKNESS = 1.3;
const WEAKNESS_SHORT = 0.45; // courte fenêtre de punition après un pattern (hors charge)
const MAX_SBIRES = 6;
const CHARGE_TIME = 0.45;
const CHARGE_SPEED = 380;
const MOVE_SPEED = 60;
const AOE_RADIUS = 90;
const CONTACT_IFRAMES = 0.12;
const TELEGRAPH: Record<PatternKind, number> = { volley: 0.5, ring: 0.6, charge: 0.7, summon: 0.6, aoe: 0.9 };

export function makeBoss(def: BossDef, tier: Tier, x: number, y: number): Boss {
  const s = resolveBossStats(tier);
  const base = makeEntity({ id: 5, x, y, maxHp: s.maxHp, radius: s.radius, faction: "enemy" });
  return {
    ...base,
    name: def.name,
    intro: def.intro,
    tier,
    phases: def.phases,
    phaseIndex: 0,
    state: "cooldown",
    stateTimer: 0.8,
    currentPattern: null,
    lastPattern: null,
    telegraph: null,
    chargeDir: v(0, 0),
    contactDamage: s.contactDamage,
    projDamage: s.projDamage,
    aoeDamage: s.aoeDamage,
    status: makeStatus(),
  };
}

function hitPlayer(w: World, fromX: number, fromY: number, dmg: number, kbMag: number): void {
  const p = w.player;
  const kb = scale(normalize(sub(p.transform.pos, v(fromX, fromY))), kbMag);
  hurtPlayer(w, dmg, kb, CONTACT_IFRAMES); // pipeline centralisé : esquive/blocage/invisibilité/défense
}

function startPattern(boss: Boss, w: World): void {
  const avail = boss.phases[boss.phaseIndex].patterns;
  let pick = avail[Math.floor(w.rng() * avail.length)];
  if (avail.length > 1 && pick === boss.lastPattern) pick = avail[(avail.indexOf(pick) + 1) % avail.length];
  boss.currentPattern = pick;
  boss.state = "telegraph";
  boss.stateTimer = TELEGRAPH[pick];
  const p = w.player;
  const to = sub(p.transform.pos, boss.transform.pos);
  const dir = length(to) > 0 ? normalize(to) : v(1, 0);
  if (pick === "aoe") {
    boss.telegraph = { kind: pick, x: p.transform.pos.x, y: p.transform.pos.y, radius: AOE_RADIUS, dirX: 0, dirY: 0, progress: 0 };
  } else if (pick === "charge") {
    boss.chargeDir = dir;
    boss.telegraph = { kind: pick, x: boss.transform.pos.x, y: boss.transform.pos.y, radius: 0, dirX: dir.x, dirY: dir.y, progress: 0 };
  } else {
    boss.telegraph = { kind: pick, x: boss.transform.pos.x, y: boss.transform.pos.y, radius: boss.radius + 6, dirX: dir.x, dirY: dir.y, progress: 0 };
  }
}

function executePattern(boss: Boss, w: World): void {
  const p = w.player;
  const kind = boss.currentPattern!;
  boss.lastPattern = kind;
  if (kind === "volley") {
    const base = Math.atan2(p.transform.pos.y - boss.transform.pos.y, p.transform.pos.x - boss.transform.pos.x);
    const n = 5;
    const spread = (50 * Math.PI) / 180;
    for (let i = 0; i < n; i++) {
      const a = base - spread / 2 + spread * (i / (n - 1));
      w.projectiles.push(
        spawnProjectile(w.nextId++, boss.transform.pos, v(Math.cos(a), Math.sin(a)), { speed: 260, radius: 7, damage: boss.projDamage, lifetime: 2.4, pierce: false, crit: false }, "enemy"),
      );
    }
  } else if (kind === "ring") {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      w.projectiles.push(
        spawnProjectile(w.nextId++, boss.transform.pos, v(Math.cos(a), Math.sin(a)), { speed: 220, radius: 7, damage: boss.projDamage, lifetime: 2.6, pierce: false, crit: false }, "enemy"),
      );
    }
  } else if (kind === "summon") {
    const alive = w.enemies.filter((e) => e.name === "Sbire").length;
    const toSpawn = Math.min(3, Math.max(0, MAX_SBIRES - alive)); // plafonne les sbires concurrents
    for (let i = 0; i < toSpawn; i++) {
      const ang = (i / 3) * Math.PI * 2;
      w.enemies.push(
        makeEnemy(w.nextId++, boss.transform.pos.x + Math.cos(ang) * 60, boss.transform.pos.y + Math.sin(ang) * 60, i % 2 === 0 ? "swarmer" : "chaser", boss.tier, "Sbire"),
      );
    }
  } else if (kind === "aoe") {
    const tg = boss.telegraph!;
    if (distance(p.transform.pos, v(tg.x, tg.y)) <= tg.radius + p.radius) hitPlayer(w, tg.x, tg.y, boss.aoeDamage, 160);
  } else if (kind === "charge") {
    boss.state = "execute";
    boss.stateTimer = CHARGE_TIME;
    boss.telegraph = null;
    return;
  }
  // patterns instantanés → courte fenêtre de faiblesse (punition) puis cooldown
  boss.state = "weakness";
  boss.stateTimer = WEAKNESS_SHORT;
  boss.telegraph = null;
}

export function updateBoss(boss: Boss, w: World, dt: number): void {
  const p = w.player;
  const frac = boss.health.hp / boss.health.maxHp;
  boss.phaseIndex = Math.max(0, Math.min(boss.phases.length - 1, Math.floor((1 - frac) * boss.phases.length)));
  boss.stateTimer -= dt;
  const occupy = (pt: Vec2) => canOccupy(pt, boss.radius, w.level);

  if (boss.state === "cooldown") {
    boss.telegraph = null;
    applyMovementCollide(boss.transform, normalize(sub(p.transform.pos, boss.transform.pos)), { maxSpeed: MOVE_SPEED * w.playerMods.enemySpeedMul, accel: 800, friction: 800 }, dt, occupy);
    boss.transform.pos = clampToBounds(boss.transform.pos, boss.radius, w.level.bounds);
    if (boss.stateTimer <= 0) startPattern(boss, w);
    return;
  }
  if (boss.state === "telegraph") {
    const dur = TELEGRAPH[boss.currentPattern!];
    if (boss.telegraph) boss.telegraph.progress = 1 - Math.max(0, boss.stateTimer) / dur;
    if (boss.stateTimer <= 0) executePattern(boss, w);
    return;
  }
  if (boss.state === "execute") {
    applyMovementCollide(boss.transform, boss.chargeDir, { maxSpeed: CHARGE_SPEED * w.playerMods.enemySpeedMul, accel: 4000, friction: 2000 }, dt, occupy);
    boss.transform.pos = clampToBounds(boss.transform.pos, boss.radius, w.level.bounds);
    if (distance(boss.transform.pos, p.transform.pos) <= boss.radius + p.radius) {
      hitPlayer(w, boss.transform.pos.x, boss.transform.pos.y, boss.contactDamage, 280);
    }
    if (boss.stateTimer <= 0) {
      boss.state = "weakness";
      boss.stateTimer = WEAKNESS;
    }
    return;
  }
  // weakness : immobile, vulnérable (×1.5 dégâts géré dans world)
  if (boss.stateTimer <= 0) {
    boss.state = "cooldown";
    boss.stateTimer = COOLDOWN;
  }
}
