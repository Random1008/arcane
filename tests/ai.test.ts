import { describe, it, expect } from "vitest";
import { createWorld, makeEnemy, tickWorld, InputState } from "../src/core/world";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const T = DEFAULT_TUNING;
const dt = 1 / 60;
const noInput = (): InputState => ({
  moveDir: v(0, 0),
  aimPoint: v(0, 0),
  attack: false,
  dash: false,
  blink: false,
  selectSlot: -1,
  scroll: 0,
  cycleTier: false,
  ability: -1,
});

describe("ai", () => {
  it("le poursuiveur s'approche du joueur", () => {
    const w = createWorld();
    w.godMode = true; // on isole le mouvement
    const e = makeEnemy(50, w.player.transform.pos.x + 200, w.player.transform.pos.y, "chaser", "F", "Rôdeur");
    w.enemies = [e];
    const x0 = e.transform.pos.x;
    for (let i = 0; i < 30; i++) tickWorld(w, noInput(), T, dt);
    expect(e.transform.pos.x).toBeLessThan(x0);
  });

  it("le tireur crée un projectile ennemi après sa cadence", () => {
    const w = createWorld();
    w.godMode = true;
    w.enemies = [makeEnemy(51, w.player.transform.pos.x - 230, w.player.transform.pos.y, "shooter", "F", "Tireur")];
    let sawEnemyProj = false;
    for (let i = 0; i < 120 && !sawEnemyProj; i++) {
      tickWorld(w, noInput(), T, dt);
      if (w.projectiles.some((p) => p.faction === "enemy")) sawEnemyProj = true;
    }
    expect(sawEnemyProj).toBe(true);
  });

  it("le bombeur explose au contact, blesse le joueur puis meurt", () => {
    const w = createWorld();
    const e = makeEnemy(52, w.player.transform.pos.x + 16, w.player.transform.pos.y, "bomber", "F", "Bombe");
    w.enemies = [e];
    const hp0 = w.player.health.hp;
    tickWorld(w, noInput(), T, dt);
    expect(w.player.health.hp).toBeLessThan(hp0);
    expect(w.enemies.length).toBe(0);
  });

  it("un ennemi mort n'inflige pas de dégât posthume et est retiré", () => {
    const w = createWorld();
    const e = makeEnemy(60, w.player.transform.pos.x + 10, w.player.transform.pos.y, "chaser", "F", "R");
    e.health.hp = 0; // déjà mort (tué par une attaque dans la même frame)
    w.enemies = [e];
    const hp0 = w.player.health.hp;
    tickWorld(w, noInput(), T, dt);
    expect(w.player.health.hp).toBe(hp0); // pas de coup posthume
    expect(w.enemies.length).toBe(0); // retiré
  });

  it("i-frame de contact : des ennemis empilés ne cumulent pas leurs dégâts en une frame", () => {
    const w = createWorld();
    w.enemies = [
      makeEnemy(61, w.player.transform.pos.x, w.player.transform.pos.y, "chaser", "F", "A"),
      makeEnemy(62, w.player.transform.pos.x, w.player.transform.pos.y, "chaser", "F", "B"),
      makeEnemy(63, w.player.transform.pos.x, w.player.transform.pos.y, "chaser", "F", "C"),
    ];
    const hp0 = w.player.health.hp;
    tickWorld(w, noInput(), T, dt);
    expect(hp0 - w.player.health.hp).toBeGreaterThan(0);
    expect(hp0 - w.player.health.hp).toBeLessThanOrEqual(8); // un seul coup, pas trois
  });

  it("rage : un ennemi à PV bas frappe plus fort", () => {
    const mk = (hpRatio: number) => {
      const w = createWorld();
      const e = makeEnemy(53, w.player.transform.pos.x + 10, w.player.transform.pos.y, "chaser", "F", "R");
      e.health.hp = Math.max(1, Math.round(e.health.maxHp * hpRatio));
      w.enemies = [e];
      const hp0 = w.player.health.hp;
      tickWorld(w, noInput(), T, dt);
      return hp0 - w.player.health.hp;
    };
    expect(mk(0.1)).toBeGreaterThan(mk(1.0)); // enragé inflige davantage
  });
});
