import { Tuning } from "./config/tuning";
import { isStunned } from "./entity";
import { canOccupy, clampToBounds } from "./collision";
import { applyMovementCollide } from "./movement";
import { isDead } from "./combat/damage";
import { spawnProjectile } from "./combat/projectile";
import { ARCHETYPES } from "./enemies";
import { Enemy, World, hurtPlayer, isPlayerPhased } from "./world";
import { Vec2, v, add, sub, normalize, scale, length, distance } from "./math/vec2";

const MOVE = { accel: 1200, friction: 1200 };

/** Coup de contact : pipeline de dégâts centralisé (esquive/blocage/défense dans hurtPlayer). */
function hitPlayer(w: World, e: Enemy, dmg: number, kbMag: number): void {
  const p = w.player;
  const kb = scale(normalize(sub(p.transform.pos, e.transform.pos)), kbMag);
  hurtPlayer(w, dmg, kb);
}

/** Vecteur de poussée pour éviter que les ennemis se chevauchent parfaitement. */
function separation(e: Enemy, w: World): Vec2 {
  let sep = v(0, 0);
  for (const o of w.enemies) {
    if (o === e || o.archetype === "dummy") continue;
    const d = sub(e.transform.pos, o.transform.pos);
    const dl = length(d);
    const min = e.radius + o.radius;
    if (dl > 0 && dl < min) sep = add(sep, scale(normalize(d), (min - dl) / min));
  }
  return sep;
}

export function updateEnemy(e: Enemy, w: World, t: Tuning, dt: number): void {
  e.contactTimer = Math.max(0, e.contactTimer - dt);
  e.fireTimer = Math.max(0, e.fireTimer - dt);
  e.slowTimer = Math.max(0, e.slowTimer - dt);
  e.tauntTimer = Math.max(0, e.tauntTimer - dt);
  if (e.archetype === "dummy" || isDead(e)) return;

  const p = w.player;
  const a = ARCHETYPES[e.archetype];
  const raging = e.health.hp / e.health.maxHp < 0.3;
  const speed = e.speed * (raging ? 1.4 : 1) * w.playerMods.enemySpeedMul * (e.slowTimer > 0 ? 0.5 : 1); // set Temps + slow
  const dmg = Math.round(e.contactDamage * (raging ? 1.5 : 1) * (e.tauntTimer > 0 ? 0.8 : 1)); // provocation : −20% dégâts
  const occupy = (pt: Vec2) => canOccupy(pt, e.radius, w.level);
  const toPlayer = sub(p.transform.pos, e.transform.pos);
  const dist = length(toPlayer);
  const phased = isPlayerPhased(w); // Cape infinie : les ennemis perdent le joueur de vue

  // direction selon l'archétype
  let dir: Vec2;
  if (phased) {
    dir = v(0, 0);
  } else if (e.archetype === "shooter") {
    if (dist > a.preferredRange) {
      dir = normalize(toPlayer);
    } else if (dist < a.retreatRange) {
      const back = scale(normalize(toPlayer), -1);
      const step = e.radius + 8;
      if (occupy(add(e.transform.pos, scale(back, step)))) {
        dir = back;
      } else {
        // mur derrière → longer le mur (tangente qui éloigne le plus du joueur)
        const t1 = normalize(v(-toPlayer.y, toPlayer.x));
        const t2 = scale(t1, -1);
        const c1 = add(e.transform.pos, scale(t1, step));
        const c2 = add(e.transform.pos, scale(t2, step));
        const o1 = occupy(c1);
        const o2 = occupy(c2);
        if (o1 && (!o2 || distance(c1, p.transform.pos) >= distance(c2, p.transform.pos))) dir = t1;
        else if (o2) dir = t2;
        else dir = back;
      }
    } else {
      dir = normalize(v(-toPlayer.y, toPlayer.x)); // strafe perpendiculaire
    }
  } else {
    dir = normalize(toPlayer);
  }

  // séparation + hitstun
  if (isStunned(e)) {
    dir = v(0, 0);
  } else {
    const sep = separation(e, w);
    if (length(sep) > 0) dir = normalize(add(dir, scale(sep, 0.8)));
  }
  applyMovementCollide(e.transform, dir, { maxSpeed: speed, ...MOVE }, dt, occupy);
  e.transform.pos = clampToBounds(e.transform.pos, e.radius, w.level.bounds);

  // attaque (suspendue tant que le joueur est invisible)
  if (e.archetype === "shooter") {
    if (!phased && e.fireTimer === 0 && dist <= a.preferredRange + 60 && length(toPlayer) > 0) {
      w.projectiles.push(
        spawnProjectile(
          w.nextId++,
          e.transform.pos,
          toPlayer,
          { speed: a.projectileSpeed, radius: a.projectileRadius, damage: dmg, lifetime: 2.0, pierce: false, crit: false },
          "enemy",
        ),
      );
      e.fireTimer = a.fireCadence;
    }
    return;
  }

  if (e.archetype === "bomber") {
    // détone à mi-portée d'explosion → l'AoE (explodeRadius) a un effet réel
    if (!phased && dist <= a.explodeRadius * 0.5) {
      if (distance(e.transform.pos, p.transform.pos) <= a.explodeRadius + p.radius) hitPlayer(w, e, dmg, a.knockback);
      e.health.hp = 0;
    }
    return;
  }

  // chaser / brute / swarmer : contact mêlée
  if (e.contactTimer === 0 && dist <= e.radius + p.radius) {
    hitPlayer(w, e, dmg, a.knockback);
    e.contactTimer = t.chaser.contactCadence;
  }
}
