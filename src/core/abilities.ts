import { World } from "./world";
import { Entity } from "./entity";
import { Ability } from "./skills";
import { spawnProjectile } from "./combat/projectile";
import { applyDamage } from "./combat/damage";
import { canOccupy, clampToBounds } from "./collision";
import { Vec2, v, sub, add, scale, normalize, length, distance } from "./math/vec2";

export interface Ally {
  id: number;
  pos: Vec2;
  radius: number;
  lifetime: number;
  dmg: number;
  hitTimer: number;
}

export interface Trap {
  id: number;
  pos: Vec2;
  radius: number;
  power: number;
  life: number;
}

const ALLY_SPEED = 150;
const ALLY_CADENCE = 0.6;

export function healFromLifesteal(w: World, dmg: number): void {
  const heal = Math.round(dmg * w.playerMods.lifesteal);
  if (heal > 0) {
    const p = w.player;
    p.health.hp = Math.min(p.health.maxHp, p.health.hp + heal);
  }
}

/** Inflige des dégâts de zone à tous les ennemis (et au boss) dans le rayon. */
function hurtArea(w: World, center: Vec2, radius: number, dmg: number, kb: number): void {
  for (const e of w.enemies) {
    if (distance(center, e.transform.pos) <= radius + e.radius) {
      const dir = scale(normalize(sub(e.transform.pos, center)), kb);
      if (applyDamage(e, dmg, dir)) {
        w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: dmg, targetId: e.id, crit: false });
        healFromLifesteal(w, dmg);
      }
    }
  }
  const b = w.boss;
  if (b && distance(center, b.transform.pos) <= radius + b.radius) {
    const d = b.state === "weakness" ? Math.round(dmg * 1.5) : dmg;
    if (applyDamage(b, d, scale(normalize(sub(b.transform.pos, center)), kb * 0.25))) {
      w.events.push({ x: b.transform.pos.x, y: b.transform.pos.y, amount: d, targetId: b.id, crit: false });
      healFromLifesteal(w, d);
    }
  }
}

function slowArea(w: World, center: Vec2, radius: number, duration: number): void {
  for (const e of w.enemies) {
    if (distance(center, e.transform.pos) <= radius + e.radius) e.slowTimer = Math.max(e.slowTimer, duration);
  }
}

/** Étourdit (hitstun) tous les ennemis dans le rayon — les boss y résistent. */
function stunArea(w: World, center: Vec2, radius: number, duration: number): void {
  for (const e of w.enemies) {
    if (distance(center, e.transform.pos) <= radius + e.radius) e.health.hitstun = Math.max(e.health.hitstun, duration);
  }
}

/** Dégâts en ligne droite (rayon / faisceau) : longueur `len`, demi-largeur `halfW`, depuis `from` vers `dir`. */
function beamHit(w: World, from: Vec2, dir: Vec2, len: number, halfW: number, dmg: number): void {
  const hit = (e: Entity): boolean => {
    const rel = sub(e.transform.pos, from);
    const along = rel.x * dir.x + rel.y * dir.y;
    if (along < 0 || along > len + e.radius) return false;
    const perp = Math.abs(rel.x * -dir.y + rel.y * dir.x);
    return perp <= halfW + e.radius;
  };
  for (const e of w.enemies) {
    if (hit(e) && applyDamage(e, dmg, scale(dir, 60))) {
      w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: dmg, targetId: e.id, crit: false });
      healFromLifesteal(w, dmg);
    }
  }
  const b = w.boss;
  if (b && hit(b)) {
    const d = b.state === "weakness" ? Math.round(dmg * 1.5) : dmg;
    if (applyDamage(b, d, scale(dir, 20))) {
      w.events.push({ x: b.transform.pos.x, y: b.transform.pos.y, amount: d, targetId: b.id, crit: false });
      healFromLifesteal(w, d);
    }
  }
}

/** Lance une capacité si cooldown prêt + énergie suffisante. Renvoie true si lancée. */
export function castAbility(w: World, ab: Ability, level: number, aim: Vec2): boolean {
  const p = w.player;
  if ((p.cooldowns[ab.id] ?? 0) > 0) return false;
  if (p.energy < ab.energyCost) return false;
  p.energy -= ab.energyCost;
  p.cooldowns[ab.id] = ab.cooldown;

  const lvlScale = 1 + (level - 1) * 0.25;
  const dmg = Math.round(ab.power * lvlScale * w.playerMods.damageMul);
  const to = sub(aim, p.transform.pos);
  const aimDir = length(to) > 0 ? normalize(to) : v(1, 0);

  switch (ab.kind) {
    case "projectile": {
      const n = Math.max(1, ab.count);
      const base = Math.atan2(aimDir.y, aimDir.x);
      const spread = n > 1 ? (24 * Math.PI) / 180 : 0;
      for (let i = 0; i < n; i++) {
        const a = n > 1 ? base - spread / 2 + spread * (i / (n - 1)) : base;
        w.projectiles.push(
          spawnProjectile(w.nextId++, p.transform.pos, v(Math.cos(a), Math.sin(a)), { speed: ab.projectileSpeed, radius: ab.radius, damage: dmg, lifetime: 1.8, pierce: true, crit: false }, "player"),
        );
      }
      break;
    }
    case "aoe":
      hurtArea(w, p.transform.pos, ab.radius, dmg, ab.knockback);
      break;
    case "buff":
      p.buffTimer = Math.max(p.buffTimer, ab.duration);
      break;
    case "shield":
      // barrière qui absorbe les dégâts (≈ % des PV max, scalé par rang) + bref flash d'invuln
      p.health.shield = Math.max(p.health.shield, Math.round(p.health.maxHp * (0.25 + 0.08 * (level - 1))));
      p.health.iframes = Math.max(p.health.iframes, 0.3);
      break;
    case "heal":
      p.health.hp = Math.min(p.health.maxHp, p.health.hp + Math.round(ab.power * p.health.maxHp));
      break;
    case "dash": {
      const occupy = (pt: Vec2) => canOccupy(pt, p.radius, w.level);
      let step = ab.power;
      while (step > 0 && !occupy(add(p.transform.pos, scale(aimDir, step)))) step -= 16;
      if (step > 0) p.transform.pos = clampToBounds(add(p.transform.pos, scale(aimDir, step)), p.radius, w.level.bounds);
      p.health.iframes = Math.max(p.health.iframes, 0.25);
      break;
    }
    case "summon": {
      const n = Math.max(1, ab.count);
      const admg = Math.round((8 + level * 2) * w.playerMods.damageMul);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        w.allies.push({
          id: w.nextId++,
          pos: { x: p.transform.pos.x + Math.cos(ang) * 40, y: p.transform.pos.y + Math.sin(ang) * 40 },
          radius: 10,
          lifetime: ab.duration,
          dmg: admg,
          hitTimer: 0,
        });
      }
      break;
    }
    case "slow":
      slowArea(w, p.transform.pos, ab.radius, ab.duration);
      break;
    case "trap":
      w.traps.push({ id: w.nextId++, pos: { x: p.transform.pos.x, y: p.transform.pos.y }, radius: ab.radius, power: dmg, life: 20 });
      break;
    case "charge": {
      // bond vers la visée + dégâts et stun aux ennemis traversés/à l'arrivée
      const occupy = (pt: Vec2) => canOccupy(pt, p.radius, w.level);
      let step = ab.power;
      while (step > 0 && !occupy(add(p.transform.pos, scale(aimDir, step)))) step -= 16;
      if (step > 0) p.transform.pos = clampToBounds(add(p.transform.pos, scale(aimDir, step)), p.radius, w.level.bounds);
      p.health.iframes = Math.max(p.health.iframes, 0.25);
      hurtArea(w, p.transform.pos, ab.radius, Math.round(ab.power * 0.6 * lvlScale * w.playerMods.damageMul), ab.knockback);
      if (ab.duration > 0) stunArea(w, p.transform.pos, ab.radius, ab.duration);
      break;
    }
    case "beam":
      beam(w, p, aimDir, ab.radius, dmg);
      break;
    case "execute": {
      // dégâts de zone + exécution des ennemis sous le seuil (count = seuil ×100, ex. 20 → 20%)
      const thr = Math.min(0.6, (ab.count / 100) + (level - 1) * 0.03);
      for (const e of w.enemies) {
        if (distance(p.transform.pos, e.transform.pos) > ab.radius + e.radius) continue;
        if (e.health.hp / e.health.maxHp <= thr) {
          e.health.hp = 0;
          w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: 9999, targetId: e.id, crit: true });
        } else if (applyDamage(e, dmg, scale(normalize(sub(e.transform.pos, p.transform.pos)), ab.knockback))) {
          w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: dmg, targetId: e.id, crit: false });
          healFromLifesteal(w, dmg);
        }
      }
      const b = w.boss; // les boss ne sont jamais exécutés, seulement frappés
      if (b && distance(p.transform.pos, b.transform.pos) <= ab.radius + b.radius) {
        const d = b.state === "weakness" ? Math.round(dmg * 1.5) : dmg;
        if (applyDamage(b, d, v(0, 0))) w.events.push({ x: b.transform.pos.x, y: b.transform.pos.y, amount: d, targetId: b.id, crit: false });
      }
      break;
    }
    case "multihit": {
      // rafale frontale : `count` coups instantanés aux ennemis dans un cône devant la visée
      const total = Math.round(dmg * Math.max(1, ab.count));
      const cone = (e: Entity): boolean => {
        const rel = sub(e.transform.pos, p.transform.pos);
        const d = length(rel);
        if (d > ab.radius + e.radius || d === 0) return false;
        return (rel.x / d) * aimDir.x + (rel.y / d) * aimDir.y >= 0.3;
      };
      for (const e of w.enemies) {
        if (cone(e) && applyDamage(e, total, scale(aimDir, ab.knockback))) {
          w.events.push({ x: e.transform.pos.x, y: e.transform.pos.y, amount: total, targetId: e.id, crit: false });
          healFromLifesteal(w, total);
        }
      }
      const b = w.boss;
      if (b && cone(b)) {
        const d = b.state === "weakness" ? Math.round(total * 1.5) : total;
        if (applyDamage(b, d, scale(aimDir, ab.knockback * 0.25))) {
          w.events.push({ x: b.transform.pos.x, y: b.transform.pos.y, amount: d, targetId: b.id, crit: false });
          healFromLifesteal(w, d);
        }
      }
      break;
    }
    case "taunt": {
      // provoque : −20% dégâts ennemis (tauntTimer) + brève attraction vers le joueur
      for (const e of w.enemies) {
        if (e.archetype === "dummy") continue;
        if (distance(p.transform.pos, e.transform.pos) <= ab.radius + e.radius) {
          e.tauntTimer = Math.max(e.tauntTimer, ab.duration);
          const pull = scale(normalize(sub(p.transform.pos, e.transform.pos)), 120);
          e.transform.vel.x += pull.x;
          e.transform.vel.y += pull.y;
        }
      }
      break;
    }
    case "invis":
      // invisibilité : les ennemis perdent l'aggro (isPlayerPhased) + bonus de dégâts pendant la durée
      p.invisTimer = Math.max(p.invisTimer, ab.duration);
      p.buffTimer = Math.max(p.buffTimer, ab.duration);
      p.health.iframes = Math.max(p.health.iframes, 0.2);
      break;
    case "teleport": {
      // téléportation directe vers la visée (collision + bornes), brève invulnérabilité
      const occupy = (pt: Vec2) => canOccupy(pt, p.radius, w.level);
      let target = clampToBounds(aim, p.radius, w.level.bounds);
      if (!occupy(target)) {
        // recule vers le joueur jusqu'à une case libre
        let t = 1;
        const from = p.transform.pos;
        while (t > 0 && !occupy(add(from, scale(sub(target, from), t)))) t -= 0.1;
        if (t > 0) target = add(from, scale(sub(target, from), t));
        else target = from;
      }
      p.transform.pos = target;
      p.health.iframes = Math.max(p.health.iframes, 0.25);
      break;
    }
    case "invuln": // Ω « Mode Juggernaut » : invincible + dégâts/vitesse décuplés (buff)
      p.health.iframes = Math.max(p.health.iframes, ab.duration);
      p.buffTimer = Math.max(p.buffTimer, ab.duration);
      break;
    case "timestop": // Ω « Faille Temporelle » : fige tous les ennemis de l'écran
      for (const e of w.enemies) e.health.hitstun = Math.max(e.health.hitstun, ab.duration);
      slowArea(w, p.transform.pos, ab.radius, ab.duration);
      break;
    case "barrage": {
      // Ω « Tempête Infinie » : volée de projectiles guidés tout autour
      const n = Math.max(1, ab.count);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const proj = spawnProjectile(w.nextId++, p.transform.pos, v(Math.cos(a), Math.sin(a)), { speed: ab.projectileSpeed, radius: ab.radius, damage: dmg, lifetime: 2.2, pierce: true, crit: false }, "player");
        proj.homing = true;
        w.projectiles.push(proj);
      }
      break;
    }
  }
  return true;
}

/** Rayon continu (faisceau) : longueur `len`, demi-largeur 30. */
function beam(w: World, p: Entity, aimDir: Vec2, len: number, dmg: number): void {
  beamHit(w, p.transform.pos, aimDir, len, 30, dmg);
}

function nearestTarget(w: World, pos: Vec2): Entity | null {
  let best: Entity | null = null;
  let bd = Infinity;
  for (const e of w.enemies) {
    if (e.archetype === "dummy") continue;
    const d = distance(pos, e.transform.pos);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  if (w.boss) {
    const d = distance(pos, w.boss.transform.pos);
    if (d < bd) best = w.boss;
  }
  return best;
}

export function updateAllies(w: World, dt: number): void {
  for (const a of w.allies) {
    a.lifetime -= dt;
    a.hitTimer = Math.max(0, a.hitTimer - dt);
    const target = nearestTarget(w, a.pos);
    if (target) {
      const dir = normalize(sub(target.transform.pos, a.pos));
      a.pos = clampToBounds(add(a.pos, scale(dir, ALLY_SPEED * dt)), a.radius, w.level.bounds);
      if (a.hitTimer === 0 && distance(a.pos, target.transform.pos) <= a.radius + target.radius) {
        const amt = target === w.boss && w.boss.state === "weakness" ? Math.round(a.dmg * 1.5) : a.dmg;
        if (applyDamage(target, amt, scale(dir, 60))) {
          w.events.push({ x: target.transform.pos.x, y: target.transform.pos.y, amount: amt, targetId: target.id, crit: false });
        }
        a.hitTimer = ALLY_CADENCE;
      }
    }
  }
  w.allies = w.allies.filter((a) => a.lifetime > 0);
}

export function updateTraps(w: World, dt: number): void {
  for (const tr of w.traps) {
    tr.life -= dt;
    const b = w.boss;
    const triggered =
      w.enemies.some((e) => e.archetype !== "dummy" && distance(tr.pos, e.transform.pos) <= tr.radius + e.radius) ||
      (b !== null && distance(tr.pos, b.transform.pos) <= tr.radius + b.radius);
    if (triggered) {
      hurtArea(w, tr.pos, tr.radius, tr.power, 200);
      tr.life = 0;
    }
  }
  w.traps = w.traps.filter((tr) => tr.life > 0);
}
