import { describe, it, expect } from "vitest";
import { createWorld, createPlayer, tickWorld, InputState, World, spawnChasers, killAllEnemies } from "../src/core/world";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { canOccupy } from "../src/core/collision";
import { activeWeapon, addWeapon, selectSlot } from "../src/core/combat/hotbar";
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

/** Ajoute une arme à la barre et l'équipe (test). */
function equip(w: World, defId: string): void {
  const i = addWeapon(w.player.hotbar, { defId, tier: "F" });
  selectSlot(w.player.hotbar, i);
}

describe("world", () => {
  it("le joueur se déplace avec l'input", () => {
    const w = createWorld();
    const before = w.player.transform.pos.x;
    for (let i = 0; i < 30; i++) tickWorld(w, { ...noInput(), moveDir: v(1, 0) }, T, dt);
    expect(w.player.transform.pos.x).toBeGreaterThan(before);
  });

  it("on démarre aux poings (fists) et ils tuent progressivement le mannequin devant", () => {
    const w = createWorld();
    w.rng = () => 0.999;
    expect(activeWeapon(w.player.hotbar)?.defId).toBe("fists");
    const dummy = w.enemies[0];
    dummy.transform.pos = v(w.player.transform.pos.x + 40, w.player.transform.pos.y);
    const hp0 = dummy.health.hp;
    const aim = v(w.player.transform.pos.x + 100, w.player.transform.pos.y);
    for (let s = 0; s < 5; s++) {
      tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, T, dt);
      for (let i = 0; i < 30; i++) tickWorld(w, { ...noInput(), aimPoint: aim }, T, dt);
    }
    expect(dummy.health.hp).toBeLessThan(hp0);
  });

  it("ramasser (touche G) une arme au sol l'ajoute à la barre et l'équipe", () => {
    const w = createWorld();
    const pk = w.pickups[0]; // sword
    const defId = pk.defId;
    expect(activeWeapon(w.player.hotbar)?.defId).toBe("fists");
    w.player.transform.pos = v(pk.pos.x, pk.pos.y);
    tickWorld(w, noInput(), T, dt);
    expect(activeWeapon(w.player.hotbar)?.defId).toBe("fists"); // pas d'auto-ramassage
    tickWorld(w, { ...noInput(), pickup: true }, T, dt);
    expect(activeWeapon(w.player.hotbar)?.defId).toBe(defId);
  });

  it("sélectionner un slot change l'arme active", () => {
    const w = createWorld();
    addWeapon(w.player.hotbar, { defId: "bow", tier: "F" }); // slot 1
    tickWorld(w, { ...noInput(), selectSlot: 1 }, T, dt);
    expect(activeWeapon(w.player.hotbar)?.defId).toBe("bow");
  });

  it("arme à distance : un seul tir par appui, slot vide = rien", () => {
    const w = createWorld();
    w.rng = () => 0.999;
    equip(w, "bow"); // slot 1, sélectionné
    const aim = v(w.player.transform.pos.x + 100, w.player.transform.pos.y);
    // slot vide (5) → pas de tir
    tickWorld(w, { ...noInput(), selectSlot: 5, aimPoint: aim, attack: true }, T, dt);
    expect(w.projectiles.length).toBe(0);
    // revenir sur l'arc (slot 1), relâcher puis appuyer → 1 tir
    tickWorld(w, { ...noInput(), selectSlot: 1, aimPoint: aim, attack: false }, T, dt);
    tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, T, dt);
    expect(w.projectiles.length).toBe(1);
    // maintenir n'ajoute rien
    for (let i = 0; i < 30; i++) tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, T, dt);
    expect(w.projectiles.length).toBe(1);
  });

  it("l'arc transperce : un projectile touche 2 ennemis alignés", () => {
    const w = createWorld();
    w.rng = () => 0.999;
    equip(w, "bow");
    const px = w.player.transform.pos.x,
      py = w.player.transform.pos.y;
    w.enemies[0].transform.pos = v(px + 60, py);
    w.enemies[1].transform.pos = v(px + 120, py);
    const hp0 = w.enemies.map((e) => e.health.hp);
    const aim = v(px + 200, py);
    tickWorld(w, { ...noInput(), aimPoint: aim, attack: false }, T, dt);
    tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, T, dt);
    for (let i = 0; i < 40; i++) tickWorld(w, { ...noInput(), aimPoint: aim }, T, dt);
    expect(w.enemies[0].health.hp).toBeLessThan(hp0[0]);
    expect(w.enemies[1].health.hp).toBeLessThan(hp0[1]);
  });

  it("le marteau (arc 360°) touche un ennemi derrière le joueur", () => {
    const w = createWorld();
    w.rng = () => 0.999;
    equip(w, "hammer");
    const px = w.player.transform.pos.x,
      py = w.player.transform.pos.y;
    const back = w.enemies[0];
    back.transform.pos = v(px - 40, py); // derrière (visée vers la droite)
    const hp0 = back.health.hp;
    const aim = v(px + 100, py);
    for (let s = 0; s < 3; s++) {
      tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, T, dt);
      for (let i = 0; i < 50; i++) tickWorld(w, { ...noInput(), aimPoint: aim }, T, dt);
    }
    expect(back.health.hp).toBeLessThan(hp0);
  });

  it("crit : rng=0 inflige plus que rng=0.999 (même arme)", () => {
    const mk = (rng: () => number) => {
      const w = createWorld();
      w.rng = rng;
      equip(w, "sword");
      const d = w.enemies[0];
      d.transform.pos = v(w.player.transform.pos.x + 40, w.player.transform.pos.y);
      const aim = v(w.player.transform.pos.x + 100, w.player.transform.pos.y);
      tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, T, dt);
      for (let i = 0; i < 6; i++) tickWorld(w, { ...noInput(), aimPoint: aim }, T, dt);
      return 200 - d.health.hp;
    };
    expect(mk(() => 0)).toBeGreaterThan(mk(() => 0.999));
  });

  it("tier plus élevé = plus de dégâts", () => {
    const dmgAtTier = (cycles: number) => {
      const w = createWorld();
      w.rng = () => 0.999;
      equip(w, "sword");
      for (let i = 0; i < cycles; i++) tickWorld(w, { ...noInput(), cycleTier: true }, T, dt);
      const d = w.enemies[0];
      d.transform.pos = v(w.player.transform.pos.x + 40, w.player.transform.pos.y);
      const aim = v(w.player.transform.pos.x + 100, w.player.transform.pos.y);
      tickWorld(w, { ...noInput(), aimPoint: aim, attack: true }, T, dt);
      for (let i = 0; i < 6; i++) tickWorld(w, { ...noInput(), aimPoint: aim }, T, dt);
      return 200 - d.health.hp;
    };
    // cycleTier à front montant : un seul appel cycleTier:true ⇒ une incrémentation (F→E).
    expect(dmgAtTier(1)).toBeGreaterThan(dmgAtTier(0));
  });

  it("le dash rend invulnérable au contact du chaser", () => {
    const w = createWorld();
    const chaser = w.enemies[1];
    chaser.transform.pos = v(w.player.transform.pos.x + 12, w.player.transform.pos.y);
    const hp0 = w.player.health.hp;
    tickWorld(w, { ...noInput(), dash: true, moveDir: v(-1, 0) }, T, dt);
    expect(w.player.health.hp).toBe(hp0);
  });

  it("le joueur ne traverse pas un mur", () => {
    const w = createWorld();
    for (let i = 0; i < 300; i++) tickWorld(w, { ...noInput(), moveDir: v(1, 0) }, T, dt);
    expect(canOccupy(w.player.transform.pos, w.player.radius, w.level)).toBe(true);
    expect(w.player.transform.pos.x).toBeLessThan(520);
    expect(w.player.transform.pos.x).toBeGreaterThan(480);
  });

  it("un projectile ennemi touche le joueur (hors i-frames), pas les ennemis", () => {
    const w = createWorld();
    const p = w.player;
    w.projectiles.push({
      id: 5000,
      pos: { x: p.transform.pos.x, y: p.transform.pos.y },
      vel: { x: 10, y: 0 },
      life: 1,
      damage: 9,
      faction: "enemy",
      radius: 6,
      pierce: false,
      crit: false,
      hitIds: new Set(),
    });
    const hp0 = p.health.hp;
    tickWorld(w, noInput(), T, dt);
    expect(p.health.hp).toBeLessThan(hp0);
  });

  it("le blink est ignoré pendant le dash", () => {
    const w = createWorld();
    const up = v(w.player.transform.pos.x, w.player.transform.pos.y - 500);
    tickWorld(w, { ...noInput(), dash: true, blink: true, moveDir: v(1, 0), aimPoint: up }, T, dt);
    expect(w.player.blink.cooldownLeft).toBe(0);
  });

  it("createPlayer démarre avec les poings", () => {
    const p = createPlayer();
    expect(p.hotbar.slots[0]?.defId).toBe("fists");
    expect(p.health.hp).toBe(p.health.maxHp);
  });

  it("exitReached passe à true quand le joueur chevauche une sortie", () => {
    const w = createWorld();
    w.exits.push({ id: 1, pos: v(w.player.transform.pos.x, w.player.transform.pos.y), radius: 20 });
    expect(w.exitReached).toBe(false);
    tickWorld(w, noInput(), T, dt);
    expect(w.exitReached).toBe(true);
  });

  it("spawnChasers ajoute n chasers (clampé 1..10) ; killAllEnemies les met à 0", () => {
    const w = createWorld();
    const before = w.enemies.length;
    expect(spawnChasers(w, 5, "B")).toBe(5);
    expect(w.enemies.length).toBe(before + 5);
    expect(spawnChasers(w, 99, "F")).toBe(10); // clamp haut
    expect(spawnChasers(w, 0, "F")).toBe(1); // clamp bas
    const killed = killAllEnemies(w);
    expect(killed).toBe(w.enemies.length);
    expect(w.enemies.every((e) => e.health.hp === 0)).toBe(true);
  });
});
